const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDatabase, listUsers, insertUser } = require('../src/db');
const { recordSignIn } = require('../src/auth-log');
const { createApp, signIn } = require('../src/app');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rostr-'));
}

test('users table stores the roster columns', () => {
  const db = openDatabase(path.join(tempDir(), 'rostr.sqlite'));
  insertUser(db, {
    id: 'user-1',
    userName: 'ada@example.com',
    givenName: 'Ada',
    familyName: 'Lovelace',
    email: 'ada@example.com',
    department: 'Sales',
    title: 'Account Executive',
    active: 1,
    lastLogin: '2026-10-06T03:00:00.000Z',
    licensed: 1,
  });
  const rows = listUsers(db);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].userName, 'ada@example.com');
  assert.equal(rows[0].department, 'Sales');
  assert.equal(rows[0].title, 'Account Executive');
  assert.equal(rows[0].active, 1);
  assert.equal(rows[0].licensed, 1);
  assert.equal(rows[0].lastLogin, '2026-10-06T03:00:00.000Z');
  db.close();
});

test('sign-in log is one JSON line with time, protocol, user, and outcome', () => {
  const file = path.join(tempDir(), 'rostr-auth.jsonl');
  recordSignIn(file, {
    time: '2026-10-06T04:00:00.000Z',
    protocol: 'saml',
    user: 'ada@example.com',
    outcome: 'success',
  });
  const line = fs.readFileSync(file, 'utf8').trim();
  assert.deepEqual(JSON.parse(line), {
    time: '2026-10-06T04:00:00.000Z',
    protocol: 'saml',
    user: 'ada@example.com',
    outcome: 'success',
  });
});

test('a sign-in line without protocol, user, or outcome is rejected', () => {
  const file = path.join(tempDir(), 'rostr-auth.jsonl');
  assert.throws(() => recordSignIn(file, { protocol: 'saml', user: 'ada@example.com' }));
  assert.equal(fs.existsSync(file), false);
});

test('health, me, and admin users', async () => {
  const dir = tempDir();
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  insertUser(db, {
    id: 'user-1',
    userName: 'ada@example.com',
    givenName: 'Ada',
    familyName: 'Lovelace',
    email: 'ada@example.com',
    department: '<Sales>',
    title: 'Account Executive',
    active: 1,
    lastLogin: null,
    licensed: 0,
  });
  const app = createApp({
    db,
    authLogPath: path.join(dir, 'rostr-auth.jsonl'),
    sessionSecret: 'test-secret',
  });
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal(await health.text(), 'OK');

    const me = await fetch(`${base}/me`);
    assert.match(await me.text(), /Not signed in/);

    const users = await fetch(`${base}/admin/users`);
    const body = await users.text();
    assert.match(body, /userName/);
    assert.match(body, /licensed/);
    assert.match(body, /ada@example.com/);
    assert.match(body, /&lt;Sales&gt;/);
    assert.doesNotMatch(body, /<Sales>/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    db.close();
  }
});

test('signIn writes the log and stores the attributes for /me', async () => {
  const dir = tempDir();
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  const authLogPath = path.join(dir, 'rostr-auth.jsonl');
  const app = createApp({ db, authLogPath, sessionSecret: 'test-secret' });
  app.post('/test/sign-in', (req, res) => {
    signIn(req, authLogPath, {
      protocol: 'saml',
      user: 'ada@example.com',
      outcome: 'success',
      attributes: { email: 'ada@example.com', department: 'Sales' },
    });
    req.session.save(() => res.status(204).end());
  });
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const signedIn = await fetch(`${base}/test/sign-in`, { method: 'POST' });
    const cookie = signedIn.headers.get('set-cookie');
    assert.equal(signedIn.status, 204);
    const me = await fetch(`${base}/me`, { headers: { cookie: cookie.split(';')[0] } });
    const body = await me.text();
    assert.match(body, /ada@example.com/);
    assert.match(body, /Sales/);
    const logged = JSON.parse(fs.readFileSync(authLogPath, 'utf8').trim());
    assert.equal(logged.protocol, 'saml');
    assert.equal(logged.user, 'ada@example.com');
    assert.equal(logged.outcome, 'success');
    assert.ok(logged.time);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    db.close();
  }
});
