const test = require('node:test');
const assert = require('node:assert/strict');
const { insertUser, insertGroup } = require('../src/db');
const { appWithSession, listen, close, sessionFor } = require('./helpers');

test('each role lands on its own hub, can open its own leave, and is refused the other hubs', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const cases = [
      { groups: 'APP-Rostr-Users', home: '/leave', title: 'My leave', blocked: ['/admin/leave', '/hr/leave'] },
      { groups: 'APP-Rostr-Users, APP-Rostr-Admins', home: '/admin/leave', title: 'Team requests', blocked: ['/hr/leave'] },
      { groups: 'APP-Rostr-Users, APP-Rostr-HR', home: '/hr/leave', title: 'All leave', blocked: ['/admin/leave'] },
    ];
    for (const item of cases) {
      const cookie = await sessionFor(base, { email: 'person@example.invalid', givenName: 'Pat', department: 'Operations', groups: item.groups });
      const root = await fetch(`${base}/`, { headers: { cookie }, redirect: 'manual' });
      assert.equal(root.headers.get('location'), item.home);
      const page = await fetch(`${base}${item.home}`, { headers: { cookie } });
      assert.equal(page.status, 200);
      assert.match(await page.text(), new RegExp(item.title));
      const own = await fetch(`${base}/leave`, { headers: { cookie } });
      assert.equal(own.status, 200);
      for (const path of item.blocked) {
        const denied = await fetch(`${base}${path}`, { headers: { cookie } });
        assert.equal(denied.status, 403);
      }
    }
  } finally {
    await close(server);
    db.close();
  }
});

test('the sidebar shows only the sections a role can use', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const staff = await sessionFor(base, { email: 'priya.shah@lanternfieldgoods.co.uk', groups: 'APP-Rostr-Users' });
    const staffPage = await (await fetch(`${base}/leave`, { headers: { cookie: staff } })).text();
    assert.match(staffPage, /href="\/roster"/);
    assert.doesNotMatch(staffPage, /href="\/admin\/leave"/);
    assert.doesNotMatch(staffPage, /href="\/hr\/leave"/);
    assert.match(staffPage, /chip-role">Staff</);

    const admin = await sessionFor(base, { email: 'marcus.bell@lanternfieldgoods.co.uk', groups: 'APP-Rostr-Users, APP-Rostr-Admins' });
    const adminPage = await (await fetch(`${base}/leave`, { headers: { cookie: admin } })).text();
    assert.match(adminPage, /href="\/admin\/leave"/);
    assert.match(adminPage, /chip-role">Manager</);
  } finally {
    await close(server);
    db.close();
  }
});

test('with no session the site root starts SAML, not the admin OIDC app', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const root = await fetch(`${base}/`, { redirect: 'manual' });
    assert.equal(root.headers.get('location'), '/saml/login');
  } finally {
    await close(server);
    db.close();
  }
});

test('SCIM group membership grants the HR hub when the session has no groups', async () => {
  const { app, db } = appWithSession();
  insertUser(db, {
    id: 'helen',
    userName: 'helen.cho@lanternfieldgoods.co.uk',
    email: 'helen.cho@lanternfieldgoods.co.uk',
    givenName: 'Helen',
    department: 'Finance',
    active: 1,
  });
  insertGroup(db, { displayName: 'APP-Rostr-HR', members: ['helen'] });
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, { email: 'helen.cho@lanternfieldgoods.co.uk', givenName: 'Helen', department: 'Finance' });
    const root = await fetch(`${base}/`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(root.headers.get('location'), '/hr/leave');
  } finally {
    await close(server);
    db.close();
  }
});

test('an inactive Rostr user is refused every hub', async () => {
  const { app, db } = appWithSession();
  insertUser(db, { id: 'samir', userName: 'samir.adeyemi@lanternfieldgoods.co.uk', email: 'samir.adeyemi@lanternfieldgoods.co.uk', active: 0 });
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, { email: 'samir.adeyemi@lanternfieldgoods.co.uk', groups: 'APP-Rostr-Users' });
    const page = await fetch(`${base}/leave`, { headers: { cookie } });
    assert.equal(page.status, 403);
  } finally {
    await close(server);
    db.close();
  }
});

test('a flash message is shown once', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, { email: 'priya.shah@lanternfieldgoods.co.uk', groups: 'APP-Rostr-Users' }, 'Leave request LV-0007 sent to your manager.');
    const first = await fetch(`${base}/leave`, { headers: { cookie } });
    assert.match(await first.text(), /LV-0007/);
    const second = await fetch(`${base}/leave`, { headers: { cookie } });
    assert.doesNotMatch(await second.text(), /LV-0007/);
  } finally {
    await close(server);
    db.close();
  }
});

test('the stylesheet and fonts are served', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const css = await fetch(`${base}/app.css`);
    assert.equal(css.status, 200);
    const text = await css.text();
    assert.match(text, /\.toast/);
    assert.match(text, /--rs-nav: var\(--color-purple-700\)/);
    const tokens = await fetch(`${base}/vendor/kaizen/variables.css`);
    assert.equal(tokens.status, 200);
    assert.match(await tokens.text(), /--color-purple-600:/);
    const font = await fetch(`${base}/fonts/inter-400.woff2`);
    assert.equal(font.status, 200);
  } finally {
    await close(server);
    db.close();
  }
});
