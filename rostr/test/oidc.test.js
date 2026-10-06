const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDatabase, insertUser } = require('../src/db');
const { createApp, signIn } = require('../src/app');
const { sessionFromClaims, isRostrAdmin } = require('../src/oidc');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rostr-oidc-'));
}

const CLAIMS = {
  iss: 'https://trial-7464750.okta.com/oauth2/default',
  aud: '0oa18egjva6o5FpoP698',
  sub: '00u-jonah',
  exp: 1791271079,
  groups: ['APP-Rostr-Users', 'APP-Rostr-Admins'],
};

test('ID token claims kept for /me are iss, aud, sub, exp, and groups', () => {
  assert.deepEqual(sessionFromClaims(CLAIMS), {
    iss: CLAIMS.iss,
    aud: CLAIMS.aud,
    sub: CLAIMS.sub,
    exp: CLAIMS.exp,
    groups: 'APP-Rostr-Users, APP-Rostr-Admins',
  });
  assert.equal(isRostrAdmin(sessionFromClaims(CLAIMS)), true);
  assert.equal(isRostrAdmin({ groups: 'APP-Rostr-Users' }), false);
  assert.throws(() => sessionFromClaims({ iss: 'x' }), /sub/);
});

test('login redirects with PKCE, callback stores claims, admin page stays gated', async () => {
  const dir = tempDir();
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  insertUser(db, {
    id: 'user-1',
    userName: 'jonah.hale@lanternfieldgoods.co.uk',
    department: '<Sales>',
  });
  const authLogPath = path.join(dir, 'rostr-auth.jsonl');
  let seen;
  const client = {
    authorizationUrl(params) {
      seen = params;
      return 'https://idp.example/oauth/authorize';
    },
    callbackParams() {
      return { code: 'code', state: seen.state };
    },
    callback(redirectUri, params, checks) {
      assert.equal(redirectUri, 'https://rostr.example/oidc/callback');
      assert.equal(params.state, checks.state);
      assert.equal(typeof checks.code_verifier, 'string');
      assert.ok(checks.code_verifier.length >= 43);
      return { claims: () => CLAIMS };
    },
  };
  const app = createApp({
    db,
    authLogPath,
    sessionSecret: 'test-secret',
    oidc: { client, redirectUri: 'https://rostr.example/oidc/callback' },
  });
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const login = await fetch(`${base}/oidc/login`, { redirect: 'manual' });
    assert.equal(login.status, 302);
    assert.equal(login.headers.get('location'), 'https://idp.example/oauth/authorize');
    assert.equal(seen.scope, 'openid');
    assert.equal(seen.code_challenge_method, 'S256');
    assert.ok(seen.code_challenge);
    const cookie = login.headers.get('set-cookie').split(';')[0];

    const callback = await fetch(`${base}/oidc/callback?code=code&state=${seen.state}`, {
      headers: { cookie },
      redirect: 'manual',
    });
    assert.equal(callback.status, 302);
    assert.equal(callback.headers.get('location'), '/me');
    const signedIn = callback.headers.get('set-cookie').split(';')[0];
    const me = await fetch(`${base}/me`, { headers: { cookie: signedIn } });
    const page = await me.text();
    assert.match(page, /trial-7464750\.okta\.com\/oauth2\/default/);
    assert.match(page, /0oa18egjva6o5FpoP698/);
    assert.match(page, /APP-Rostr-Admins/);

    const users = await fetch(`${base}/admin/users`, { headers: { cookie: signedIn } });
    const body = await users.text();
    assert.equal(users.status, 200);
    assert.match(body, /&lt;Sales&gt;/);
    assert.doesNotMatch(body, /<Sales>/);

    const logged = fs.readFileSync(authLogPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(logged.at(-1).protocol, 'oidc');
    assert.equal(logged.at(-1).user, '00u-jonah');
    assert.equal(logged.at(-1).outcome, 'success');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    db.close();
  }
});

test('a callback without a login is logged and refused', async () => {
  const dir = tempDir();
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  const authLogPath = path.join(dir, 'rostr-auth.jsonl');
  const app = createApp({
    db,
    authLogPath,
    sessionSecret: 'test-secret',
    oidc: {
      redirectUri: 'https://rostr.example/oidc/callback',
      client: {
        authorizationUrl() { return 'https://idp.example/oauth/authorize'; },
        callbackParams() { return {}; },
        callback() { throw new Error('should not exchange'); },
      },
    },
  });
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const callback = await fetch(`${base}/oidc/callback`);
    assert.equal(callback.status, 401);
    const logged = JSON.parse(fs.readFileSync(authLogPath, 'utf8').trim());
    assert.equal(logged.protocol, 'oidc');
    assert.equal(logged.outcome, 'failure');
    assert.match(logged.reason, /No OIDC login/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    db.close();
  }
});

test('signIn as staff still cannot open admin users', async () => {
  const dir = tempDir();
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  const authLogPath = path.join(dir, 'rostr-auth.jsonl');
  const app = createApp({ db, authLogPath, sessionSecret: 'test-secret' });
  app.post('/test/sign-in', (req, res) => {
    signIn(req, authLogPath, {
      protocol: 'saml',
      user: 'ada@example.com',
      outcome: 'success',
      attributes: { groups: 'APP-Rostr-Users' },
    });
    req.session.save(() => res.status(204).end());
  });
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const signedIn = await fetch(`${base}/test/sign-in`, { method: 'POST' });
    const cookie = signedIn.headers.get('set-cookie').split(';')[0];
    const users = await fetch(`${base}/admin/users`, { headers: { cookie } });
    assert.equal(users.status, 403);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    db.close();
  }
});
