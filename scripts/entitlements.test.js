const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const entitlements = require('./entitlements');

test('group source prefers a rule, and Everyone stays built-in', () => {
  const rules = new Set(['group-sales']);
  assert.strictEqual(entitlements.groupSource({ id: 'group-sales', type: 'OKTA_GROUP' }, rules), 'rule');
  assert.strictEqual(entitlements.groupSource({ id: 'group-help', type: 'OKTA_GROUP' }, rules), 'individual');
  assert.strictEqual(entitlements.groupSource({ id: 'everyone', type: 'BUILT_IN' }, rules), 'built-in');
});

test('app scope maps to group or individual', () => {
  assert.strictEqual(entitlements.appSource('GROUP'), 'group');
  assert.strictEqual(entitlements.appSource('USER'), 'individual');
  assert.strictEqual(entitlements.appSource(undefined), 'unknown');
});

test('a DPoP proof verifies with the public key and carries ath', () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const token = 'access-token';
  const proof = entitlements.dpopProof({
    privateKey, method: 'get', url: 'https://example.invalid/api/v1/users?limit=1', accessToken: token,
  });
  const [header, payload, signature] = proof.split('.');
  const verified = crypto.verify(
    'sha256',
    Buffer.from(`${header}.${payload}`),
    publicKey,
    Buffer.from(signature, 'base64url'),
  );
  assert.strictEqual(verified, true);
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
  assert.strictEqual(claims.htm, 'GET');
  assert.strictEqual(claims.htu, 'https://example.invalid/api/v1/users');
  assert.strictEqual(claims.ath, entitlements.b64url(crypto.createHash('sha256').update(token).digest()));
});

test('csv quotes a name that contains a comma', () => {
  const csv = entitlements.toCsv([
    { login: 'a@example.invalid', status: 'ACTIVE', kind: 'group', name: 'DEPT, Sales', source: 'rule' },
  ]);
  assert.strictEqual(csv, 'login,status,kind,name,source\na@example.invalid,ACTIVE,group,"DEPT, Sales",rule\n');
});
