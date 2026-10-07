const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const review = require('./access-review');

function employee(overrides) {
  return {
    employeeId: 'EMP-1001',
    firstName: 'Ava',
    lastName: 'Nguyen',
    email: 'ava.nguyen@lanternfieldgoods.co.uk',
    department: 'Sales',
    managerId: null,
    ...overrides,
  };
}

test('ticket must be REQ- and four digits', () => {
  assert.equal(review.parseTicket('REQ-0002'), 'REQ-0002');
  assert.throws(() => review.parseTicket('INC-0002'), /REQ-####/);
});

test('parseArgs splits export and apply', () => {
  assert.deepEqual(review.parseArgs(['export', '--out', 'evidence/5.3']), {
    command: 'export',
    out: 'evidence/5.3',
  });
  assert.deepEqual(review.parseArgs(['apply', '--in', 'evidence/5.3', '--ticket', 'REQ-0002']), {
    command: 'apply',
    in: 'evidence/5.3',
    ticket: 'REQ-0002',
    apply: false,
  });
  assert.equal(review.parseArgs(['apply', '--in', 'x', '--ticket', 'REQ-0002', '--apply']).apply, true);
  assert.throws(() => review.parseArgs([]), /export or apply/);
  assert.throws(() => review.parseArgs(['export']), /--out/);
  assert.throws(() => review.parseArgs(['apply', '--in', 'x']), /REQ-####/);
});

test('csv round-trips a quoted department and empty decision', () => {
  const csv = review.toCsv([{
    login: 'a@example.invalid',
    department: 'Sales, West',
    manager: 'b@example.invalid',
    groups: 'APP-Rostr-Users|DEPT-Sales',
    assignmentSource: 'group',
    lastRostrSignIn: '2026-10-06T05:20:26.829Z',
    decision: '',
  }]);
  const rows = review.parseCsv(csv);
  assert.equal(rows[0].department, 'Sales, West');
  assert.equal(rows[0].groups, 'APP-Rostr-Users|DEPT-Sales');
  assert.equal(rows[0].decision, '');
});

test('decision must be Keep or Revoke', () => {
  assert.equal(review.parseDecision('Keep', 'a@x'), 'Keep');
  assert.equal(review.parseDecision('Revoke', 'a@x'), 'Revoke');
  assert.throws(() => review.parseDecision('', 'a@x'), /no Keep\/Revoke/);
  assert.throws(() => review.parseDecision('maybe', 'a@x'), /no Keep\/Revoke/);
});

test('rows split onto one CSV per manager', () => {
  const employees = [
    employee(),
    employee({
      employeeId: 'EMP-1002',
      email: 'jonah.hale@lanternfieldgoods.co.uk',
      managerId: 'EMP-1001',
    }),
    employee({
      employeeId: 'EMP-1004',
      email: 'marcus.bell@lanternfieldgoods.co.uk',
      department: 'Operations',
    }),
    employee({
      employeeId: 'EMP-1005',
      email: 'lena.ortiz@lanternfieldgoods.co.uk',
      department: 'Operations',
      managerId: 'EMP-1004',
    }),
  ];
  const rows = review.buildRows({
    rostrUsers: [
      { userName: 'jonah.hale@lanternfieldgoods.co.uk', email: 'jonah.hale@lanternfieldgoods.co.uk', department: 'Sales' },
      { userName: 'lena.ortiz@lanternfieldgoods.co.uk', email: 'lena.ortiz@lanternfieldgoods.co.uk', department: 'Operations' },
      { userName: 'ava.nguyen@lanternfieldgoods.co.uk', email: 'ava.nguyen@lanternfieldgoods.co.uk', department: 'Sales' },
      { userName: 'orphan.roster@example.invalid', email: 'orphan.roster@example.invalid', department: '' },
    ],
    employees,
    oktaByLogin: new Map([
      ['jonah.hale@lanternfieldgoods.co.uk', { groups: ['APP-Rostr-Users', 'DEPT-Sales'], assignmentSource: 'group' }],
    ]),
    lastSignIn: new Map([
      ['jonah.hale@lanternfieldgoods.co.uk', '2026-10-06T05:20:26.829Z'],
    ]),
  });
  const packs = review.splitByManager(rows);
  assert.deepEqual([...packs.keys()].sort(), ['ava-nguyen.csv', 'marcus-bell.csv', 'no-manager.csv', 'unmanaged.csv']);
  assert.equal(packs.get('ava-nguyen.csv')[0].login, 'jonah.hale@lanternfieldgoods.co.uk');
  assert.equal(packs.get('marcus-bell.csv')[0].manager, 'marcus.bell@lanternfieldgoods.co.uk');
  assert.equal(packs.get('no-manager.csv')[0].login, 'ava.nguyen@lanternfieldgoods.co.uk');
  assert.equal(packs.get('unmanaged.csv')[0].assignmentSource, 'none');
});

test('SSO last sign-in keeps the newest event for the Rostr apps only', () => {
  const latest = review.lastSignInFromEvents([
    {
      eventType: 'user.authentication.sso',
      published: '2026-10-06T04:00:00.000Z',
      actor: { alternateId: 'Jonah.Hale@lanternfieldgoods.co.uk' },
      target: [{ id: review.ROSTR_SAML_APP_ID }],
    },
    {
      eventType: 'user.authentication.sso',
      published: '2026-10-06T05:20:26.829Z',
      actor: { alternateId: 'jonah.hale@lanternfieldgoods.co.uk' },
      target: [{ id: review.ROSTR_SAML_APP_ID }],
    },
    {
      eventType: 'user.authentication.sso',
      published: '2026-10-07T02:00:00.000Z',
      actor: { alternateId: 'lena.ortiz@lanternfieldgoods.co.uk' },
      target: [{ id: '0oa-admin-console' }],
    },
    {
      eventType: 'user.authentication.sso',
      published: '2026-10-07T02:19:00.000Z',
      actor: { alternateId: 'lena.ortiz@lanternfieldgoods.co.uk' },
      target: [{ id: review.ROSTR_OIDC_APP_ID }],
    },
  ], [review.ROSTR_SAML_APP_ID, review.ROSTR_OIDC_APP_ID]);
  assert.equal(latest.get('jonah.hale@lanternfieldgoods.co.uk'), '2026-10-06T05:20:26.829Z');
  assert.equal(latest.get('lena.ortiz@lanternfieldgoods.co.uk'), '2026-10-07T02:19:00.000Z');
});

test('assignment source prefers the app scope, then APP-Rostr groups', () => {
  assert.equal(review.inferAssignmentSource(['APP-Rostr-Users'], 'GROUP'), 'group');
  assert.equal(review.inferAssignmentSource(['Everyone'], 'USER'), 'individual');
  assert.equal(review.inferAssignmentSource(['APP-Rostr-Admins'], undefined), 'group');
  assert.equal(review.inferAssignmentSource(['Everyone'], undefined), 'none');
});

test('apply dry-run looks up groups and does not DELETE', async () => {
  const calls = [];
  const client = {
    async get(url) {
      calls.push(['GET', url]);
      if (url.startsWith('/api/v1/users?filter=')) {
        return json([{ id: '00u-samir', status: 'DEPROVISIONED' }]);
      }
      if (url.includes('/users/00u-samir/groups')) {
        return json([
          { profile: { name: 'APP-Rostr-Users' } },
          { profile: { name: 'DEPT-Finance' } },
        ]);
      }
      if (url.includes('/apps/')) return { ok: false, status: 403, json: async () => ({}), headers: emptyHeaders() };
      throw new Error(`unexpected GET ${url}`);
    },
    async del(url) {
      calls.push(['DELETE', url]);
      return { status: 204 };
    },
  };
  const logRows = await review.applyRevokes(
    client,
    [{ login: 'samir.adeyemi@lanternfieldgoods.co.uk', decision: 'Revoke' }],
    'REQ-0002',
    'tester',
    '2026-10-07T03:00:00.000Z',
    false,
  );
  assert.deepEqual(logRows, [{
    time: '2026-10-07T03:00:00.000Z',
    ticket: 'REQ-0002',
    login: 'samir.adeyemi@lanternfieldgoods.co.uk',
    group: 'APP-Rostr-Users',
    http: 'dry-run',
    admin: 'tester',
  }]);
  assert.equal(calls.some((entry) => entry[0] === 'DELETE'), false);
});

test('apply DELETE targets APP-Rostr groups only', async () => {
  const deleted = [];
  const client = {
    async get(url) {
      if (url.startsWith('/api/v1/groups?')) {
        return json([
          { id: '00g-users', profile: { name: 'APP-Rostr-Users' } },
          { id: '00g-admins', profile: { name: 'APP-Rostr-Admins' } },
          { id: '00g-fin', profile: { name: 'DEPT-Finance' } },
        ]);
      }
      if (url.startsWith('/api/v1/users?filter=')) {
        return json([{ id: '00u-samir', status: 'DEPROVISIONED' }]);
      }
      if (url.includes('/users/00u-samir/groups')) {
        return json([
          { profile: { name: 'APP-Rostr-Users' } },
          { profile: { name: 'APP-Rostr-Admins' } },
          { profile: { name: 'DEPT-Finance' } },
        ]);
      }
      if (url.includes('/apps/')) return { ok: false, status: 403, json: async () => ({}), headers: emptyHeaders() };
      throw new Error(`unexpected GET ${url}`);
    },
    async del(url) {
      deleted.push(url);
      return { status: 204 };
    },
  };
  await review.applyRevokes(
    client,
    [{ login: 'samir.adeyemi@lanternfieldgoods.co.uk', decision: 'Revoke' }],
    'REQ-0002',
    'tester',
    '2026-10-07T03:00:00.000Z',
    true,
  );
  assert.deepEqual(deleted, [
    '/api/v1/groups/00g-users/users/00u-samir',
    '/api/v1/groups/00g-admins/users/00u-samir',
  ]);
});

function tempDir() {
  fs.mkdirSync(os.tmpdir(), { recursive: true });
  return fs.mkdtempSync(path.join(os.tmpdir(), 'access-review-'));
}

test('export writes one file per manager pack', async () => {
  const dir = tempDir();
  const lines = [];
  await review.main(['export', '--out', dir], {
    cwd: dir,
    stdout: (line) => lines.push(line),
    listRostrUsers: () => [
      { email: 'jonah.hale@lanternfieldgoods.co.uk', department: 'Sales' },
      { email: 'orphan.roster@example.invalid', department: '' },
    ],
    listEmployees: () => [
      employee(),
      employee({
        employeeId: 'EMP-1002',
        email: 'jonah.hale@lanternfieldgoods.co.uk',
        managerId: 'EMP-1001',
      }),
    ],
    oktaByLogin: new Map([
      ['jonah.hale@lanternfieldgoods.co.uk', { groups: ['APP-Rostr-Users'], assignmentSource: 'group' }],
    ]),
    lastSignIn: new Map(),
    client: {},
  });
  assert.match(lines[0], /2 rows/);
  assert.equal(fs.existsSync(path.join(dir, 'ava-nguyen.csv')), true);
  assert.equal(fs.existsSync(path.join(dir, 'unmanaged.csv')), true);
  const jonah = review.parseCsv(fs.readFileSync(path.join(dir, 'ava-nguyen.csv'), 'utf8'));
  assert.equal(jonah[0].decision, '');
});

test('apply refuses a CSV with an empty Decision column', async () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'helen-cho.csv'), review.toCsv([{
    login: 'samir.adeyemi@lanternfieldgoods.co.uk',
    department: 'Finance',
    manager: 'helen.cho@lanternfieldgoods.co.uk',
    groups: 'APP-Rostr-Users',
    assignmentSource: 'group',
    lastRostrSignIn: '',
    decision: '',
  }]));
  await assert.rejects(
    review.main(['apply', '--in', dir, '--ticket', 'REQ-0002'], { cwd: dir, client: {} }),
    /no Keep\/Revoke/,
  );
});

function emptyHeaders() {
  return { get: () => null };
}

function json(body) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    headers: emptyHeaders(),
  };
}
