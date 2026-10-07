const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const oauth = require('./oauth-review');

test('parseArgs splits plant, review, revoke', () => {
  assert.deepEqual(oauth.parseArgs(['plant']), { command: 'plant', out: null, apply: false });
  assert.deepEqual(oauth.parseArgs(['review', '--out', 'docs/x.md']), {
    command: 'review', out: 'docs/x.md', apply: false,
  });
  assert.equal(oauth.parseArgs(['revoke', '--apply']).apply, true);
  assert.throws(() => oauth.parseArgs(['review']), /--out/);
});

test('service apps are OIDC client_credentials', () => {
  assert.equal(oauth.isServiceApp({
    signOnMode: 'OPENID_CONNECT',
    settings: { oauthClient: { application_type: 'service' } },
  }), true);
  assert.equal(oauth.isServiceApp({ signOnMode: 'SAML_2_0' }), false);
});

test('approved catalog does not include the plant', () => {
  assert.equal(oauth.APPROVED[oauth.PLANT_LABEL], undefined);
  assert.equal(oauth.approvalOf({ label: 'svc-jml-sync' }).status, 'approved');
  assert.equal(oauth.approvalOf({ label: oauth.PLANT_LABEL }).status, 'unapproved');
  assert.equal(oauth.approvalOf({ label: 'Okta Dashboard' }).status, 'okta-owned');
});

test('manage scopes on the plant are excessive', () => {
  assert.equal(oauth.excessiveScopes({ label: oauth.PLANT_LABEL }, oauth.PLANT_SCOPES), true);
  assert.equal(oauth.excessiveScopes({ label: 'svc-jml-sync' }, ['okta.users.manage']), false);
});

test('unapproved excessive plant is revoked; unknown apps are confirmed', () => {
  assert.equal(oauth.disposition({
    label: oauth.PLANT_LABEL, status: 'unapproved', excessive: true, deactivated: false,
  }), 'revoke grants and deactivate');
  assert.equal(oauth.disposition({
    label: oauth.PLANT_LABEL, status: 'unapproved', excessive: false, deactivated: true,
  }), 'grants revoked, deactivated');
  assert.equal(oauth.disposition({ status: 'approved' }), 'keep');
  assert.equal(oauth.disposition({ status: 'unreviewed' }), 'confirm with owner');
});

test('review markdown names the planted app', async () => {
  fs.mkdirSync(os.tmpdir(), { recursive: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oauth-review-'));
  const out = path.join(dir, 'oauth-review.md');
  const lines = [];
  await oauth.main(['review', '--out', out], {
    cwd: dir,
    now: new Date('2026-10-07T03:00:00.000Z'),
    stdout: (line) => lines.push(line),
    connect: async () => ({ org: 'https://example.invalid', client: {} }),
    rows: [{
      label: oauth.PLANT_LABEL,
      id: '0oa-plant',
      type: 'service',
      owner: '(none)',
      purpose: 'unrecorded',
      scopes: oauth.PLANT_SCOPES.join(' '),
      lastUsed: '',
      status: 'unapproved',
      excessive: true,
      deactivated: false,
      disposition: 'revoke grants and deactivate',
    }],
  });
  const text = fs.readFileSync(out, 'utf8');
  assert.match(text, /legacy-report-tool/);
  assert.match(text, /revoke grants and deactivate/);
  assert.match(lines[0], /1 apps/);
});
