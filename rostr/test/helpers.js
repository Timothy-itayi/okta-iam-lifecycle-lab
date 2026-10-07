const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const { openDatabase, insertUser, insertGroup } = require('../src/db');
const { createHrReader } = require('../src/hr');
const { createApp } = require('../src/app');

const EMPLOYEES = [
  { employeeId: 'EMP-1003', firstName: 'Priya', lastName: 'Shah', email: 'priya.shah@lanternfieldgoods.co.uk', department: 'Operations', title: 'Operations Analyst', status: 'active', leave: { annual: 2, sick: 8, personal: 2 } },
  { employeeId: 'EMP-1004', firstName: 'Marcus', lastName: 'Bell', email: 'marcus.bell@lanternfieldgoods.co.uk', department: 'Operations', title: 'Operations Manager', status: 'active', leave: { annual: 15, sick: 8, personal: 2 } },
  { employeeId: 'EMP-1002', firstName: 'Jonah', lastName: 'Hale', email: 'jonah.hale@lanternfieldgoods.co.uk', department: 'Operations', status: 'active', leave: { annual: 15, sick: 8, personal: 2 } },
  { employeeId: 'EMP-1006', firstName: 'Helen', lastName: 'Cho', email: 'helen.cho@lanternfieldgoods.co.uk', department: 'Finance', title: 'Finance Manager', status: 'active', leave: { annual: 15, sick: 8, personal: 2 } },
  { employeeId: 'EMP-1008', firstName: 'Thomas', lastName: 'Okeke', email: 'thomas.okeke@lanternfieldgoods.co.uk', department: 'Operations', status: 'terminated', leave: { annual: 15, sick: 8, personal: 2 } },
  { employeeId: 'EMP-9001', firstName: 'Pat', lastName: 'Example', email: 'person@example.invalid', department: 'Operations', status: 'active', leave: { annual: 15, sick: 8, personal: 2 } },
];

const PEOPLE = {
  priya: { email: 'priya.shah@lanternfieldgoods.co.uk', givenName: 'Priya', familyName: 'Shah', department: 'Operations', groups: 'APP-Rostr-Users' },
  marcus: { email: 'marcus.bell@lanternfieldgoods.co.uk', givenName: 'Marcus', familyName: 'Bell', department: 'Operations', groups: 'APP-Rostr-Users, APP-Rostr-Admins' },
  jonah: { email: 'jonah.hale@lanternfieldgoods.co.uk', givenName: 'Jonah', familyName: 'Hale', department: 'Operations', groups: 'APP-Rostr-Users' },
  helen: { email: 'helen.cho@lanternfieldgoods.co.uk', givenName: 'Helen', familyName: 'Cho', department: 'Finance', groups: 'APP-Rostr-Users, APP-Rostr-HR' },
  thomas: { email: 'thomas.okeke@lanternfieldgoods.co.uk', givenName: 'Thomas', familyName: 'Okeke', department: 'Operations', groups: 'APP-Rostr-Users' },
};

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rostr-hub-'));
}

function seedDirectory(db) {
  insertUser(db, { id: 'marcus', userName: PEOPLE.marcus.email, email: PEOPLE.marcus.email, givenName: 'Marcus', familyName: 'Bell', department: 'Operations', active: 1 });
  insertUser(db, { id: 'priya', userName: PEOPLE.priya.email, email: PEOPLE.priya.email, givenName: 'Priya', familyName: 'Shah', department: 'Operations', active: 1 });
  insertGroup(db, { displayName: 'APP-Rostr-Admins', members: ['marcus'] });
}

function appWithSession({ today = '2026-10-08', seed = true, jev = null } = {}) {
  const dir = tempDir();
  const hrFile = path.join(dir, 'employees.json');
  fs.writeFileSync(hrFile, JSON.stringify(EMPLOYEES));
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  if (seed) seedDirectory(db);
  const app = createApp({
    db,
    authLogPath: path.join(dir, 'rostr-auth.jsonl'),
    sessionSecret: 'test-secret',
    hr: createHrReader(hrFile),
    today: () => today,
    jev,
  });
  app.post('/test/session', express.json(), (req, res) => {
    req.session.user = req.body.user;
    if (req.body.flash) req.session.flash = req.body.flash;
    req.session.save(() => res.status(204).end());
  });
  return { app, db, dir };
}

function listen(app) {
  const server = app.listen(0);
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

async function close(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function sessionFor(base, user, flash) {
  const login = await fetch(`${base}/test/session`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user, flash }),
  });
  assert.equal(login.status, 204);
  return login.headers.get('set-cookie').split(';')[0];
}

function postForm(base, path, cookie, fields) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
    redirect: 'manual',
  });
}

module.exports = { EMPLOYEES, PEOPLE, tempDir, appWithSession, listen, close, sessionFor, postForm };
