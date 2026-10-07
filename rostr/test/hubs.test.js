const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { openDatabase, insertUser, insertGroup } = require('../src/db');
const { createApp } = require('../src/app');

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rostr-hub-'));
}

function listen(app) {
  const server = app.listen(0);
  return {
    server,
    base: `http://127.0.0.1:${server.address().port}`,
  };
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function sessionFor(base, user) {
  const login = await fetch(`${base}/test/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(user),
  });
  assert.equal(login.status, 204);
  return login.headers.get('set-cookie').split(';')[0];
}

function appWithSession(dir) {
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  const app = createApp({
    db,
    authLogPath: path.join(dir, 'rostr-auth.jsonl'),
    sessionSecret: 'test-secret',
  });
  app.post('/test/session', express.json(), (req, res) => {
    req.session.user = req.body.user;
    if (req.body.flash) req.session.flash = req.body.flash;
    req.session.save(() => res.status(204).end());
  });
  return { app, db };
}

test('each role lands on its own hub and is refused the others', async () => {
  const { app, db } = appWithSession(tempDir());
  const { server, base } = listen(app);
  try {
    const cases = [
      { groups: 'APP-Rostr-Users', home: '/leave', title: 'My leave', blocked: ['/admin/leave', '/hr/leave'] },
      { groups: 'APP-Rostr-Users, APP-Rostr-Admins', home: '/admin/leave', title: 'Department leave', blocked: ['/leave', '/hr/leave'] },
      { groups: 'APP-Rostr-Users, APP-Rostr-HR', home: '/hr/leave', title: 'HR leave', blocked: ['/leave', '/admin/leave'] },
    ];
    for (const item of cases) {
      const cookie = await sessionFor(base, {
        user: { email: 'person@example.invalid', givenName: 'Pat', department: 'Operations', groups: item.groups },
      });
      const root = await fetch(`${base}/`, { headers: { cookie }, redirect: 'manual' });
      assert.equal(root.headers.get('location'), item.home);
      const page = await fetch(`${base}${item.home}`, { headers: { cookie } });
      assert.equal(page.status, 200);
      assert.match(await page.text(), new RegExp(item.title));
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

test('SCIM group membership grants the HR hub when the session has no groups', async () => {
  const { app, db } = appWithSession(tempDir());
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
    const cookie = await sessionFor(base, {
      user: { email: 'helen.cho@lanternfieldgoods.co.uk', givenName: 'Helen', department: 'Finance' },
    });
    const root = await fetch(`${base}/`, { headers: { cookie }, redirect: 'manual' });
    assert.equal(root.headers.get('location'), '/hr/leave');
  } finally {
    await close(server);
    db.close();
  }
});

test('an inactive Rostr user is refused every hub', async () => {
  const { app, db } = appWithSession(tempDir());
  insertUser(db, {
    id: 'samir',
    userName: 'samir.adeyemi@lanternfieldgoods.co.uk',
    email: 'samir.adeyemi@lanternfieldgoods.co.uk',
    active: 0,
  });
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, {
      user: { email: 'samir.adeyemi@lanternfieldgoods.co.uk', groups: 'APP-Rostr-Users' },
    });
    const page = await fetch(`${base}/leave`, { headers: { cookie } });
    assert.equal(page.status, 403);
  } finally {
    await close(server);
    db.close();
  }
});

test('a flash message is shown once', async () => {
  const { app, db } = appWithSession(tempDir());
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, {
      user: { email: 'priya.shah@lanternfieldgoods.co.uk', groups: 'APP-Rostr-Users' },
      flash: 'Leave request LV-0007 sent to your manager.',
    });
    const first = await fetch(`${base}/leave`, { headers: { cookie } });
    assert.match(await first.text(), /LV-0007/);
    const second = await fetch(`${base}/leave`, { headers: { cookie } });
    assert.doesNotMatch(await second.text(), /LV-0007/);
  } finally {
    await close(server);
    db.close();
  }
});

test('the stylesheet is served', async () => {
  const { app, db } = appWithSession(tempDir());
  const { server, base } = listen(app);
  try {
    const css = await fetch(`${base}/app.css`);
    assert.equal(css.status, 200);
    assert.match(await css.text(), /\.toast/);
  } finally {
    await close(server);
    db.close();
  }
});
