#!/usr/bin/env node
// Pull System Log families an auditor asks for. Slim and redact. Write JSONL + a count table.
// Auth is svc-jml-sync, DPoP, okta.logs.read. See docs/decisions/scripts-identity.md.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { loadEnvFile } = require('./hr-sync');
const { accessToken, dpopProof, nextLink } = require('./entitlements');

const SINCE = '2026-10-05T00:00:00.000Z';
const FAMILIES = [
  { file: 'system-log-user-lifecycle.jsonl', prefix: 'user.lifecycle.' },
  { file: 'system-log-group-membership.jsonl', prefix: 'group.user_membership.' },
  { file: 'system-log-app-membership.jsonl', prefix: 'application.user_membership.' },
  { file: 'system-log-mfa-factor.jsonl', prefix: 'user.mfa.factor.' },
];
const SECRET_KEY = /(token|secret|password|authorization|clienttoken|apikey|privatekey|client_secret)/i;

function redact(value, key) {
  if (key && SECRET_KEY.test(key)) return '[redacted]';
  if (value == null) return value;
  if (typeof value === 'string') {
    return value
      .replace(/clientToken=[^&\s]+/gi, 'clientToken=[redacted]')
      .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/g, 'Bearer [redacted]')
      .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted-jwt]');
  }
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (typeof value === 'object') {
    const out = {};
    for (const [child, childValue] of Object.entries(value)) {
      out[child] = redact(childValue, child);
    }
    return out;
  }
  return value;
}

function slim(event) {
  return redact({
    uuid: event.uuid,
    published: event.published,
    eventType: event.eventType,
    displayMessage: event.displayMessage,
    outcome: event.outcome
      ? { result: event.outcome.result, reason: event.outcome.reason }
      : null,
    actor: event.actor
      ? {
        id: event.actor.id,
        type: event.actor.type,
        alternateId: event.actor.alternateId,
        displayName: event.actor.displayName,
      }
      : null,
    targets: (event.target || []).map((row) => ({
      id: row.id,
      type: row.type,
      alternateId: row.alternateId,
      displayName: row.displayName,
    })),
    client: event.client
      ? {
        ipAddress: event.client.ipAddress,
        userAgent: event.client.userAgent
          ? { os: event.client.userAgent.os, browser: event.client.userAgent.browser }
          : null,
      }
      : null,
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logsClient({ org, token, privateKey, nonce, fetchImpl, stdout }) {
  const state = { nonce };
  async function get(url) {
    const target = url.startsWith('http') ? url : `${org}${url}`;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await fetchImpl(target, {
        headers: {
          Accept: 'application/json',
          Authorization: `DPoP ${token}`,
          DPoP: dpopProof({
            privateKey, method: 'GET', url: target, nonce: state.nonce, accessToken: token,
          }),
        },
      });
      state.nonce = response.headers.get('dpop-nonce') || state.nonce;
      if (response.status === 429) {
        const waitSec = Number(response.headers.get('retry-after')) || 60;
        stdout(`429 from logs, waiting ${waitSec}s`);
        await sleep(waitSec * 1000);
        continue;
      }
      if (response.status === 401 && attempt < 19 && response.headers.get('dpop-nonce')) continue;
      return response;
    }
    throw new Error(`GET failed after retries: ${target.split('?')[0]}`);
  }
  return { get };
}

async function getJson(client, url) {
  const response = await client.get(url);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} for ${url.split('?')[0]}: ${body.slice(0, 300)}`);
  }
  return { body: await response.json(), next: nextLink(response.headers.get('link')) };
}

async function getAll(client, url) {
  const rows = [];
  let page = url;
  while (page) {
    const { body, next } = await getJson(client, page);
    if (!Array.isArray(body)) throw new Error(`Expected a list from ${url.split('?')[0]}`);
    rows.push(...body);
    page = next;
    if (page) await sleep(1000);
  }
  return rows;
}

function countByType(events) {
  const counts = new Map();
  for (const event of events) {
    counts.set(event.eventType, (counts.get(event.eventType) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function toCsv(rows) {
  const header = 'family,eventType,count';
  const lines = rows.map((row) => row.map((cell) => {
    const text = String(cell ?? '');
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }).join(','));
  return `${[header, ...lines].join('\n')}\n`;
}

async function main(argv, io = {}) {
  const stdout = io.stdout || ((line) => console.log(line));
  const cwd = io.cwd || process.cwd();
  const fetchImpl = io.fetchImpl || fetch;
  const outDir = path.resolve(cwd, argv[0] === '--out' ? argv[1] : 'evidence/audit-pack');
  loadEnvFile(path.join(cwd, '.env'));
  const org = (process.env.OKTA_ORG_URL || '').replace(/\/$/, '');
  if (!org) throw new Error('Missing OKTA_ORG_URL');
  const keyPath = process.env.OKTA_PRIVATE_KEY_PATH;
  if (!keyPath) throw new Error('Missing OKTA_PRIVATE_KEY_PATH');
  const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath));
  const { token, nonce } = await accessToken(org, privateKey, fetchImpl);
  const client = logsClient({ org, token, privateKey, nonce, fetchImpl, stdout });
  fs.mkdirSync(outDir, { recursive: true });
  const summaryRows = [];
  for (const family of FAMILIES) {
    const filter = `eventType sw "${family.prefix}"`;
    const events = (await getAll(
      client,
      `/api/v1/logs?filter=${encodeURIComponent(filter)}&since=${encodeURIComponent(SINCE)}&limit=1000&sortOrder=ASCENDING`,
    )).map(slim);
    const file = path.join(outDir, family.file);
    fs.writeFileSync(file, events.map((event) => JSON.stringify(event)).join('\n') + (events.length ? '\n' : ''));
    stdout(`${events.length} ${family.prefix}* -> ${path.relative(cwd, file)}`);
    for (const [eventType, count] of countByType(events)) {
      summaryRows.push([family.prefix.slice(0, -1), eventType, count]);
    }
    if (!events.length) summaryRows.push([family.prefix.slice(0, -1), '(none)', 0]);
    await sleep(2000);
  }
  const summaryPath = path.join(outDir, 'system-log-counts.csv');
  fs.writeFileSync(summaryPath, toCsv(summaryRows));
  stdout(`counts -> ${path.relative(cwd, summaryPath)}`);
  return 0;
}

if (require.main === module) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      console.error(error.message);
      process.exit(1);
    },
  );
}

module.exports = { redact, slim, toCsv, main };
