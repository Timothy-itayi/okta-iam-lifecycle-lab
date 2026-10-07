#!/usr/bin/env node
// List every Okta user's groups and app assignments.
// Auth is the svc-jml-sync private-key app, DPoP required. See docs/decisions/scripts-identity.md.

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadEnvFile } = require('./hr-sync');

const CLIENT_ID = '0oa18eu8qpmkJBqdg698';
const KEY_ID = 'svc-jml-sync-1';
const SCOPES = 'okta.users.manage okta.groups.manage okta.logs.read';
const USER_SEARCH = [
  'ACTIVE', 'PROVISIONED', 'STAGED', 'SUSPENDED', 'RECOVERY',
  'LOCKED_OUT', 'PASSWORD_EXPIRED', 'DEPROVISIONED',
].map((status) => `status eq "${status}"`).join(' or ');

function b64url(value) {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer.toString('base64url');
}

function signJwt(header, payload, privateKey) {
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.sign('sha256', Buffer.from(unsigned), privateKey);
  return `${unsigned}.${b64url(signature)}`;
}

function publicJwk(privateKey) {
  const jwk = crypto.createPublicKey(privateKey).export({ format: 'jwk' });
  if (jwk.kty !== 'RSA') throw new Error(`DPoP expected an RSA key, got ${jwk.kty}`);
  return { kty: jwk.kty, n: jwk.n, e: jwk.e };
}

function dpopProof({ privateKey, method, url, nonce, accessToken }) {
  const payload = {
    jti: crypto.randomUUID(),
    htm: method.toUpperCase(),
    htu: url.split('?')[0],
    iat: Math.floor(Date.now() / 1000),
  };
  if (nonce) payload.nonce = nonce;
  if (accessToken) payload.ath = b64url(crypto.createHash('sha256').update(accessToken).digest());
  return signJwt({ typ: 'dpop+jwt', alg: 'RS256', jwk: publicJwk(privateKey) }, payload, privateKey);
}

function clientAssertion(privateKey, tokenUrl, clientId) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(
    { alg: 'RS256', kid: KEY_ID },
    { aud: tokenUrl, iss: clientId, sub: clientId, iat: now, exp: now + 300, jti: crypto.randomUUID() },
    privateKey,
  );
}

function groupSource(group, ruleGroupIds) {
  if (group.type === 'BUILT_IN') return 'built-in';
  if (ruleGroupIds.has(group.id)) return 'rule';
  return 'individual';
}

function appSource(scope) {
  if (scope === 'GROUP') return 'group';
  if (scope === 'USER') return 'individual';
  return 'unknown';
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function toCsv(rows) {
  const header = 'login,status,kind,name,source';
  const lines = rows.map((row) => [row.login, row.status, row.kind, row.name, row.source].map(csvCell).join(','));
  return `${[header, ...lines].join('\n')}\n`;
}

function nextLink(header) {
  if (!header) return null;
  for (const part of header.split(',')) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/);
    if (match) return match[1];
  }
  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function accessToken(org, privateKey, fetchImpl) {
  const tokenUrl = `${org}/oauth2/v1/token`;
  let nonce = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    // Okta treats the client-assertion jti as single use, so the nonce retry needs a new one.
    const assertion = clientAssertion(privateKey, tokenUrl, CLIENT_ID);
    const response = await fetchImpl(tokenUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        DPoP: dpopProof({ privateKey, method: 'POST', url: tokenUrl, nonce }),
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: SCOPES,
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: assertion,
      }),
    });
    nonce = response.headers.get('dpop-nonce') || nonce;
    if (response.ok) {
      const body = await response.json();
      return { token: body.access_token, nonce };
    }
    const detail = await response.json().catch(() => ({}));
    if (attempt === 0 && detail.error === 'use_dpop_nonce') continue;
    const description = detail.error_description ? `: ${detail.error_description}` : '';
    throw new Error(`Token request failed: HTTP ${response.status} ${detail.error || ''}${description}`.trim());
  }
  throw new Error('Token request failed');
}

function oktaClient({ org, token, privateKey, nonce, fetchImpl }) {
  const state = { nonce };
  async function request(method, url) {
    const target = url.startsWith('http') ? url : `${org}${url}`;
    const verb = method.toUpperCase();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await fetchImpl(target, {
        method: verb,
        headers: {
          Accept: 'application/json',
          Authorization: `DPoP ${token}`,
          DPoP: dpopProof({
            privateKey, method: verb, url: target, nonce: state.nonce, accessToken: token,
          }),
        },
      });
      state.nonce = response.headers.get('dpop-nonce') || state.nonce;
      if (response.status === 429) {
        await sleep((Number(response.headers.get('retry-after')) || 1) * 1000);
        continue;
      }
      if (response.status === 401 && attempt < 4 && response.headers.get('dpop-nonce')) continue;
      return response;
    }
    throw new Error(`${verb} failed after retries: ${target.split('?')[0]}`);
  }
  return {
    get: (url) => request('GET', url),
    del: (url) => request('DELETE', url),
  };
}

async function getJson(client, url) {
  const response = await client.get(url);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} for ${url.split('?')[0]}`);
    error.status = response.status;
    throw error;
  }
  const body = await response.json();
  return { body, next: nextLink(response.headers.get('link')) };
}

async function getAll(client, url) {
  const rows = [];
  let page = url;
  while (page) {
    const { body, next } = await getJson(client, page);
    if (!Array.isArray(body)) throw new Error(`Expected a list from ${url.split('?')[0]}`);
    rows.push(...body);
    page = next;
  }
  return rows;
}

async function collect(client) {
  const users = await getAll(client, `/api/v1/users?search=${encodeURIComponent(USER_SEARCH)}&limit=200`);
  let rules = [];
  try {
    rules = await getAll(client, '/api/v1/groups/rules?limit=200');
  } catch (error) {
    if (error.status !== 403) throw error;
    rules = null;
  }
  const ruleGroupIds = new Set();
  for (const rule of rules || []) {
    if (rule.status !== 'ACTIVE') continue;
    for (const groupId of rule.actions?.assignUserToGroups?.groupIds || []) ruleGroupIds.add(groupId);
  }
  const rows = [];
  for (const user of users.sort((a, b) => a.profile.login.localeCompare(b.profile.login))) {
    const login = user.profile.login;
    const groups = await getAll(client, `/api/v1/users/${user.id}/groups`);
    for (const group of groups.sort((a, b) => a.profile.name.localeCompare(b.profile.name))) {
      rows.push({
        login,
        status: user.status,
        kind: 'group',
        name: group.profile.name,
        source: rules === null ? 'unknown' : groupSource(group, ruleGroupIds),
      });
    }
    const links = await getAll(client, `/api/v1/users/${user.id}/appLinks`);
    for (const link of links.sort((a, b) => String(a.label).localeCompare(String(b.label)))) {
      let source = 'unknown';
      if (link.appInstanceId) {
        try {
          const assignment = await getJson(client, `/api/v1/apps/${link.appInstanceId}/users/${user.id}`);
          source = appSource(assignment.body.scope);
        } catch (error) {
          if (error.status !== 403) throw error;
        }
      }
      rows.push({ login, status: user.status, kind: 'app', name: link.label, source });
    }
    if (!groups.length && !links.length) {
      rows.push({ login, status: user.status, kind: '', name: '', source: '' });
    }
  }
  return rows;
}

function parseArgs(argv) {
  let out = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--out') {
      out = argv[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument ${argv[index]}`);
    }
  }
  if (!out) throw new Error('Pass --out <file>');
  return { out };
}

async function main(argv, io = {}) {
  const stdout = io.stdout || ((line) => console.log(line));
  const cwd = io.cwd || process.cwd();
  const fetchImpl = io.fetchImpl || fetch;
  const args = parseArgs(argv);
  const root = path.resolve(cwd);
  loadEnvFile(path.join(root, '.env'));
  const org = (process.env.OKTA_ORG_URL || '').replace(/\/$/, '');
  if (!org) throw new Error('Missing OKTA_ORG_URL');
  const keyPath = process.env.OKTA_PRIVATE_KEY_PATH;
  if (!keyPath) throw new Error('Missing OKTA_PRIVATE_KEY_PATH');
  const privateKey = crypto.createPrivateKey(fs.readFileSync(keyPath));
  const { token, nonce } = await accessToken(org, privateKey, fetchImpl);
  const rows = await collect(oktaClient({ org, token, privateKey, nonce, fetchImpl }));
  const file = path.resolve(root, args.out);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, toCsv(rows));
  stdout(`${rows.length} rows -> ${path.relative(root, file)}`);
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

module.exports = {
  b64url,
  signJwt,
  publicJwk,
  dpopProof,
  groupSource,
  appSource,
  toCsv,
  nextLink,
  parseArgs,
  accessToken,
  oktaClient,
  main,
};
