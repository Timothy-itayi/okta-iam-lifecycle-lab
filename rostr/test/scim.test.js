const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDatabase, upsertSignIn } = require('../src/db');
const { createApp } = require('../src/app');
const { parseFilter, SCHEMA } = require('../src/scim');

const TOKEN = 'test-token-0123456789abcdef0123456789abcdef';

const OKTA_CREATE = {
  schemas: [SCHEMA.user],
  userName: 'test.user@okta.local',
  name: { givenName: 'Test', familyName: 'User' },
  emails: [{ primary: true, value: 'test.user@okta.local', type: 'work' }],
  displayName: 'Test User',
  locale: 'en-US',
  externalId: '00ujl29u0le5T6Aj10h7',
  groups: [],
  password: '1mz050nq',
  active: true,
};

async function withScim(run, { scim = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rostr-scim-'));
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  const logPath = path.join(dir, 'scim.jsonl');
  const app = createApp({
    db,
    authLogPath: path.join(dir, 'rostr-auth.jsonl'),
    sessionSecret: 'test-secret',
    scim: scim ? { token: TOKEN, logPath, baseUrl: 'https://rostr.example/scim/v2' } : undefined,
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/scim/v2`;
  const call = async (method, route, body, { token = TOKEN, type = 'application/scim+json' } = {}) => {
    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (body !== undefined) headers['content-type'] = type;
    const res = await fetch(`${base}${route}`, {
      method,
      headers,
      body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
  };
  const logLines = () => fs.readFileSync(logPath, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
  try {
    await run({ call, db, logPath, logLines });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    db.close();
  }
}

test('filter accepts userName eq only, attribute and operator in any case', () => {
  assert.equal(parseFilter('userName eq "a@b.c"'), 'a@b.c');
  assert.equal(parseFilter('USERNAME EQ "a@b.c"'), 'a@b.c');
  assert.equal(parseFilter('userName eq "say \\"hi\\""'), 'say "hi"');
  assert.throws(() => parseFilter('userName co "a"'), /userName eq/);
  assert.throws(() => parseFilter('emails eq "a"'), /userName eq/);
  assert.throws(() => parseFilter('userName eq a'), /userName eq/);
});

test('missing or wrong token is 401 with a SCIM error and is logged without the token', async () => {
  await withScim(async ({ call, logLines }) => {
    const missing = await call('GET', '/Users', undefined, { token: null });
    assert.equal(missing.status, 401);
    assert.equal(missing.headers.get('content-type'), 'application/scim+json; charset=utf-8');
    assert.deepEqual(missing.body.schemas, [SCHEMA.error]);
    assert.equal(missing.body.status, '401');
    const wrong = await call('GET', '/Users', undefined, { token: 'not-the-token' });
    assert.equal(wrong.status, 401);
    const lines = logLines();
    assert.equal(lines[0].authorization, 'missing');
    assert.equal(lines[1].authorization, 'Bearer [redacted]');
    assert.doesNotMatch(JSON.stringify(lines), /not-the-token/);
  });
});

test('ServiceProviderConfig declares PATCH and the bearer scheme', async () => {
  await withScim(async ({ call }) => {
    const res = await call('GET', '/ServiceProviderConfig');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.schemas, [SCHEMA.config]);
    assert.equal(res.body.patch.supported, true);
    assert.equal(res.body.bulk.supported, false);
    assert.equal(res.body.filter.maxResults, 100);
    assert.equal(res.body.authenticationSchemes[0].type, 'oauthbearertoken');
  });
});

test('Okta create: 201 with id and Location, password never stored, returned, or logged', async () => {
  await withScim(async ({ call, db, logLines }) => {
    const created = await call('POST', '/Users', OKTA_CREATE);
    assert.equal(created.status, 201);
    assert.ok(created.body.id);
    assert.equal(created.headers.get('location'), `https://rostr.example/scim/v2/Users/${created.body.id}`);
    assert.equal(created.body.meta.location, created.headers.get('location'));
    assert.equal(created.body.meta.resourceType, 'User');
    assert.equal(created.body.active, true);
    assert.deepEqual(created.body.name, { givenName: 'Test', familyName: 'User' });
    assert.equal(created.body.emails[0].value, 'test.user@okta.local');
    assert.equal('password' in created.body, false);

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(created.body.id);
    assert.equal(row.userName, 'test.user@okta.local');
    assert.equal(row.email, 'test.user@okta.local');
    assert.equal(row.active, 1);
    assert.equal(row.licensed, 0);
    assert.equal(row.lastLogin, null);

    const logged = logLines().at(-1);
    assert.equal(logged.request.password, '[redacted]');
    assert.doesNotMatch(JSON.stringify(logLines()), /1mz050nq/);
    assert.deepEqual(logged.ignored.sort(), ['displayName', 'externalId', 'groups', 'locale', 'password']);
  });
});

test('a second create for the same userName, in any case, is 409 uniqueness', async () => {
  await withScim(async ({ call }) => {
    assert.equal((await call('POST', '/Users', OKTA_CREATE)).status, 201);
    const again = await call('POST', '/Users', OKTA_CREATE);
    assert.equal(again.status, 409);
    assert.equal(again.body.scimType, 'uniqueness');
    assert.equal(again.body.status, '409');
    const upper = await call('POST', '/Users', { ...OKTA_CREATE, userName: OKTA_CREATE.userName.toUpperCase() });
    assert.equal(upper.status, 409);
  });
});

test('create without userName is 400, bad JSON is 400 invalidSyntax', async () => {
  await withScim(async ({ call }) => {
    const noName = await call('POST', '/Users', { schemas: [SCHEMA.user] });
    assert.equal(noName.status, 400);
    assert.equal(noName.body.scimType, 'invalidValue');
    const badJson = await call('POST', '/Users', '{"userName":');
    assert.equal(badJson.status, 400);
    assert.equal(badJson.body.scimType, 'invalidSyntax');
  });
});

test('plain application/json bodies are accepted too', async () => {
  await withScim(async ({ call }) => {
    const created = await call('POST', '/Users', OKTA_CREATE, { type: 'application/json' });
    assert.equal(created.status, 201);
  });
});

test('userName filter finds a SAML-created row in any case, so Okta links instead of creating', async () => {
  await withScim(async ({ call, db }) => {
    const samlRow = upsertSignIn(db, {
      userName: 'jonah.hale@lanternfieldgoods.co.uk',
      givenName: 'Jonah',
      familyName: 'Hale',
      email: 'jonah.hale@lanternfieldgoods.co.uk',
      department: 'Sales',
      lastLogin: '2026-10-06T05:20:26.829Z',
    });
    const filter = encodeURIComponent('userName eq "Jonah.Hale@lanternfieldgoods.co.uk"');
    const found = await call('GET', `/Users?filter=${filter}&startIndex=1&count=100`);
    assert.equal(found.status, 200);
    assert.deepEqual(found.body.schemas, [SCHEMA.list]);
    assert.equal(found.body.totalResults, 1);
    assert.equal(found.body.itemsPerPage, 1);
    assert.equal(found.body.Resources[0].id, samlRow.id);
    assert.equal(found.body.Resources[0][SCHEMA.enterprise].department, 'Sales');
    assert.ok(found.body.Resources[0].schemas.includes(SCHEMA.enterprise));

    const none = await call('GET', `/Users?filter=${encodeURIComponent('userName eq "nobody@example.invalid"')}`);
    assert.equal(none.body.totalResults, 0);
    assert.deepEqual(none.body.Resources, []);

    const bad = await call('GET', `/Users?filter=${encodeURIComponent('userName co "jonah"')}`);
    assert.equal(bad.status, 400);
    assert.equal(bad.body.scimType, 'invalidFilter');
  });
});

test('paging: integers, 1-based, count 0, startIndex below 1, stable order, cap at 100', async () => {
  await withScim(async ({ call }) => {
    for (let i = 0; i < 3; i += 1) {
      await call('POST', '/Users', { ...OKTA_CREATE, userName: `user${i}@example.invalid` });
    }
    const first = await call('GET', '/Users?startIndex=1&count=2');
    assert.equal(first.body.totalResults, 3);
    assert.equal(first.body.startIndex, 1);
    assert.equal(first.body.itemsPerPage, 2);
    assert.equal(first.body.Resources.length, 2);
    const second = await call('GET', '/Users?startIndex=3&count=2');
    assert.equal(second.body.itemsPerPage, 1);
    const ids = [...first.body.Resources, ...second.body.Resources].map((user) => user.id);
    assert.equal(new Set(ids).size, 3);

    const zero = await call('GET', '/Users?startIndex=1&count=0');
    assert.equal(zero.body.totalResults, 3);
    assert.deepEqual(zero.body.Resources, []);

    const below = await call('GET', '/Users?startIndex=0&count=1');
    assert.equal(below.body.startIndex, 1);
    assert.equal(below.body.Resources[0].id, first.body.Resources[0].id);

    const big = await call('GET', '/Users?count=1000');
    assert.equal(big.body.itemsPerPage, 3);
  });
});

test('GET and PUT by id: 404 for unknown, PUT replaces and never creates', async () => {
  await withScim(async ({ call, db }) => {
    const created = (await call('POST', '/Users', { ...OKTA_CREATE, title: 'Clerk' })).body;
    assert.equal((await call('GET', `/Users/${created.id}`)).body.id, created.id);

    const missing = await call('GET', '/Users/does-not-exist');
    assert.equal(missing.status, 404);
    assert.deepEqual(missing.body.schemas, [SCHEMA.error]);

    const put = await call('PUT', `/Users/${created.id}`, {
      ...created,
      title: 'Account Executive',
      [SCHEMA.enterprise]: { department: 'Sales' },
    });
    assert.equal(put.status, 200);
    assert.equal(put.body.title, 'Account Executive');
    assert.equal(put.body[SCHEMA.enterprise].department, 'Sales');

    const cleared = await call('PUT', `/Users/${created.id}`, { schemas: [SCHEMA.user], userName: created.userName });
    assert.equal(cleared.body.title, undefined);
    assert.equal(cleared.body.active, true);

    const ghost = await call('PUT', '/Users/does-not-exist', { ...OKTA_CREATE, userName: 'ghost@example.invalid' });
    assert.equal(ghost.status, 404);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE userName = 'ghost@example.invalid'").get().n, 0);
  });
});

test('PUT or PATCH to a userName another user holds is 409', async () => {
  await withScim(async ({ call }) => {
    const a = (await call('POST', '/Users', { ...OKTA_CREATE, userName: 'a@example.invalid' })).body;
    await call('POST', '/Users', { ...OKTA_CREATE, userName: 'b@example.invalid' });
    const put = await call('PUT', `/Users/${a.id}`, { ...a, userName: 'B@example.invalid' });
    assert.equal(put.status, 409);
    const patch = await call('PATCH', `/Users/${a.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [{ op: 'replace', path: 'userName', value: 'b@example.invalid' }],
    });
    assert.equal(patch.status, 409);
  });
});

test('deactivate and reactivate by Okta PATCH, by path, and by PUT', async () => {
  await withScim(async ({ call, db }) => {
    const created = (await call('POST', '/Users', OKTA_CREATE)).body;
    const off = await call('PATCH', `/Users/${created.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [{ op: 'replace', value: { active: false } }],
    });
    assert.equal(off.status, 200);
    assert.equal(off.body.active, false);
    assert.equal(db.prepare('SELECT active FROM users WHERE id = ?').get(created.id).active, 0);

    const on = await call('PATCH', `/Users/${created.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [{ op: 'Replace', path: 'active', value: 'True' }],
    });
    assert.equal(on.body.active, true);

    const put = await call('PUT', `/Users/${created.id}`, { ...created, active: false });
    assert.equal(put.body.active, false);
    assert.equal(put.body.name.givenName, 'Test');
  });
});

test('PATCH sets names and department, removes title, ignores unknown attributes, rejects bad ops', async () => {
  await withScim(async ({ call, logLines }) => {
    const created = (await call('POST', '/Users', { ...OKTA_CREATE, title: 'Clerk' })).body;
    const patched = await call('PATCH', `/Users/${created.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [
        { op: 'replace', value: { name: { givenName: 'Tess', middleName: '' }, displayName: 'Tess User' } },
        { op: 'add', path: `${SCHEMA.enterprise}:department`, value: 'Finance' },
        { op: 'remove', path: 'title' },
      ],
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.name.givenName, 'Tess');
    assert.equal(patched.body.name.familyName, 'User');
    assert.equal(patched.body[SCHEMA.enterprise].department, 'Finance');
    assert.equal(patched.body.title, undefined);
    assert.deepEqual(logLines().at(-1).ignored.sort(), ['displayName', 'name.middleName']);

    const route = `/Users/${created.id}`;
    const noOps = await call('PATCH', route, { schemas: [SCHEMA.patchOp], Operations: [] });
    assert.equal(noOps.status, 400);
    const nullOp = await call('PATCH', route, { schemas: [SCHEMA.patchOp], Operations: [null] });
    assert.equal(nullOp.status, 400);
    const removeNoPath = await call('PATCH', route, { schemas: [SCHEMA.patchOp], Operations: [{ op: 'remove' }] });
    assert.equal(removeNoPath.body.scimType, 'noTarget');
    const removeUserName = await call('PATCH', route, { schemas: [SCHEMA.patchOp], Operations: [{ op: 'remove', path: 'userName' }] });
    assert.equal(removeUserName.body.scimType, 'mutability');
    const badActive = await call('PATCH', route, { schemas: [SCHEMA.patchOp], Operations: [{ op: 'replace', path: 'active', value: 'nope' }] });
    assert.equal(badActive.body.scimType, 'invalidValue');
    const filterPath = await call('PATCH', route, { schemas: [SCHEMA.patchOp], Operations: [{ op: 'replace', path: 'emails[type eq "home"].value', value: 'x' }] });
    assert.equal(filterPath.body.scimType, 'invalidPath');
    assert.equal((await call('GET', route)).body.name.givenName, 'Tess');

    const missing = await call('PATCH', '/Users/does-not-exist', { schemas: [SCHEMA.patchOp], Operations: [{ op: 'replace', value: { active: false } }] });
    assert.equal(missing.status, 404);
  });
});

test('a SCIM-deactivated user is refused at SAML sign-in', async () => {
  const { signInFromProfile } = require('../src/saml');
  await withScim(async ({ call, db }) => {
    const userName = 'jonah.hale@lanternfieldgoods.co.uk';
    const created = (await call('POST', '/Users', { ...OKTA_CREATE, userName })).body;
    await call('PATCH', `/Users/${created.id}`, { schemas: [SCHEMA.patchOp], Operations: [{ op: 'replace', value: { active: false } }] });
    assert.throws(() => signInFromProfile(db, { nameID: userName, groups: 'APP-Rostr-Users' }), /inactive/);
    assert.equal(db.prepare('SELECT lastLogin FROM users WHERE id = ?').get(created.id).lastLogin, null);
  });
});

test('unknown SCIM route and DELETE /Users are SCIM 404s', async () => {
  await withScim(async ({ call }) => {
    const res = await call('GET', '/Widgets');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body.schemas, [SCHEMA.error]);
    const del = await call('DELETE', '/Users/anything');
    assert.equal(del.status, 404);
    assert.deepEqual(del.body.schemas, [SCHEMA.error]);
  });
});

test('group push: create, filter, membership patch, rename, put, and delete', async () => {
  await withScim(async ({ call, db }) => {
    const user = (await call('POST', '/Users', { ...OKTA_CREATE, userName: 'member@example.invalid' })).body;
    const other = (await call('POST', '/Users', { ...OKTA_CREATE, userName: 'other@example.invalid' })).body;
    const empty = await call('GET', '/Groups?startIndex=1&count=100');
    assert.equal(empty.status, 200);
    assert.equal(empty.body.totalResults, 0);

    const created = await call('POST', '/Groups', { schemas: [SCHEMA.group], displayName: 'APP-Rostr-Users', members: [] });
    assert.equal(created.status, 201);
    assert.equal(created.headers.get('location'), `https://rostr.example/scim/v2/Groups/${created.body.id}`);
    assert.deepEqual(created.body.members, []);
    assert.equal(created.body.meta.resourceType, 'Group');
    const duplicate = await call('POST', '/Groups', { schemas: [SCHEMA.group], displayName: 'app-rostr-users', members: [] });
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.scimType, 'uniqueness');

    const filter = encodeURIComponent('displayName eq "app-rostr-users"');
    const found = await call('GET', `/Groups?filter=${filter}&startIndex=1&count=100`);
    assert.equal(found.body.totalResults, 1);
    assert.equal(found.body.Resources[0].id, created.body.id);
    const badFilter = await call('GET', `/Groups?filter=${encodeURIComponent('displayName co "APP"')}`);
    assert.equal(badFilter.body.scimType, 'invalidFilter');

    const added = await call('PATCH', `/Groups/${created.body.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [{ op: 'add', path: 'members', value: [{ value: user.id, display: user.userName }] }],
    });
    assert.equal(added.status, 200);
    assert.deepEqual(added.body.members, [{ value: user.id, display: user.userName }]);

    const removed = await call('PATCH', `/Groups/${created.body.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [{ op: 'remove', path: `members[value eq "${user.id}"]` }],
    });
    assert.deepEqual(removed.body.members, []);
    const absent = await call('PATCH', `/Groups/${created.body.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [{ op: 'remove', path: 'members[value eq "not-a-member"]' }],
    });
    assert.equal(absent.status, 200);

    const replaced = await call('PATCH', `/Groups/${created.body.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [{ op: 'replace', path: 'members', value: [{ value: other.id, display: other.userName }] }],
    });
    assert.deepEqual(replaced.body.members.map((member) => member.value), [other.id]);

    const renamed = await call('PATCH', `/Groups/${created.body.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [{ op: 'replace', value: { id: created.body.id, displayName: 'APP-Rostr-Admins' } }],
    });
    assert.equal(renamed.body.displayName, 'APP-Rostr-Admins');
    assert.deepEqual(renamed.body.members.map((member) => member.value), [other.id]);

    const put = await call('PUT', `/Groups/${created.body.id}`, {
      schemas: [SCHEMA.group],
      displayName: 'APP-Rostr-Users',
      members: [{ value: user.id, display: user.userName }, { value: other.id }],
    });
    assert.equal(put.status, 200);
    assert.deepEqual(put.body.members.map((member) => member.value), [other.id, user.id].sort());

    const unknownMember = await call('PATCH', `/Groups/${created.body.id}`, {
      schemas: [SCHEMA.patchOp],
      Operations: [{ op: 'add', path: 'members', value: [{ value: 'missing-user' }] }],
    });
    assert.equal(unknownMember.status, 400);
    assert.equal(unknownMember.body.scimType, 'invalidValue');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE userId = ?').get('missing-user').n, 0);

    const gone = await call('DELETE', `/Groups/${created.body.id}`);
    assert.equal(gone.status, 204);
    assert.equal(gone.body, null);
    assert.equal((await call('GET', `/Groups/${created.body.id}`)).status, 404);
    assert.equal((await call('GET', `/Groups?filter=${filter}`)).body.totalResults, 0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM group_members').get().n, 0);
  });
});

test('without a SCIM token configured, /scim/v2 is not mounted', async () => {
  await withScim(async ({ call }) => {
    await assert.rejects(call('GET', '/Users'), SyntaxError);
  }, { scim: false });
});
