const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const test = require('node:test');
const hr = require('./hr-sync');

const TODAY = '2026-10-06';

function employee(overrides) {
  return {
    employeeId: 'EMP-1001',
    firstName: 'Ava',
    lastName: 'Nguyen',
    email: 'ava.nguyen@lanternfieldgoods.co.uk',
    department: 'Sales',
    title: 'Sales Manager',
    managerId: null,
    status: 'active',
    startDate: '2022-03-14',
    endDate: null,
    ...overrides,
  };
}

test('ticket must be REQ- and four digits', () => {
  assert.strictEqual(hr.parseTicket('REQ-0001'), 'REQ-0001');
  for (const bad of ['REQ-001', 'REQ-00001', 'req-0001', 'INC-0001', '', null]) {
    assert.throws(() => hr.parseTicket(bad), /REQ-####/);
  }
});

test('classify emits one event per changed employee', () => {
  const previous = [
    employee({ employeeId: 'EMP-1002', title: 'Account Executive', managerId: 'EMP-1001' }),
    employee({ employeeId: 'EMP-1003', managerId: 'EMP-1001' }),
    employee({ employeeId: 'EMP-1005', department: 'Operations', title: 'Shift Supervisor' }),
    employee({ employeeId: 'EMP-1007', department: 'Finance' }),
    employee({ employeeId: 'EMP-1010', endDate: '2026-10-07' }),
    employee({ employeeId: 'EMP-1011' }),
    employee({ employeeId: 'EMP-1099', status: 'terminated' }),
  ];
  const current = [
    employee({ employeeId: 'EMP-1002', title: 'Senior Account Executive', managerId: 'EMP-1001' }),
    employee({ employeeId: 'EMP-1003', managerId: 'EMP-1002', email: 'priya.changed@example.invalid' }),
    employee({ employeeId: 'EMP-1005', department: 'Sales', status: 'terminated' }),
    employee({ employeeId: 'EMP-1007', department: 'Sales', endDate: '2026-10-06' }),
    employee({ employeeId: 'EMP-1008', email: 'new.hire@lanternfieldgoods.co.uk' }),
    employee({ employeeId: 'EMP-1009', status: 'terminated' }),
    employee({ employeeId: 'EMP-1010', endDate: '2026-10-07' }),
    employee({ employeeId: 'EMP-1011', endDate: '2026-10-07' }),
    employee({ employeeId: 'EMP-1099', status: 'terminated' }),
  ];
  const { events, missing } = hr.classify(previous, current, TODAY);
  assert.deepStrictEqual(events.map(hr.formatEvent), [
    'mover EMP-1002 title',
    'mover EMP-1003 managerId',
    'leaver EMP-1005 status',
    'leaver EMP-1007 endDate',
    'joiner EMP-1008',
    'leaver EMP-1009 status',
  ]);
  assert.deepStrictEqual(missing, []);
});

test('an employee removed from the file is reported and not classified', () => {
  const { events, missing } = hr.classify(
    [employee({ employeeId: 'EMP-1001' })],
    [],
    TODAY,
  );
  assert.deepStrictEqual(events, []);
  assert.deepStrictEqual(missing, ['EMP-1001']);
});

test('duplicate employeeId is rejected', () => {
  assert.throws(
    () => hr.classify([employee(), employee()], [], TODAY),
    /duplicate employeeId EMP-1001/,
  );
});

test('parseArgs defaults to dry-run and refuses both modes', () => {
  assert.deepStrictEqual(hr.parseArgs(['--ticket', 'REQ-0002']), { ticket: 'REQ-0002', apply: false });
  assert.deepStrictEqual(hr.parseArgs(['--dry-run', '--ticket', 'REQ-0002']), { ticket: 'REQ-0002', apply: false });
  assert.strictEqual(hr.parseArgs(['--ticket', 'REQ-0002', '--apply']).apply, true);
  assert.throws(() => hr.parseArgs(['--ticket', 'REQ-0002', '--apply', '--dry-run']), /either/);
  assert.throws(() => hr.parseArgs(['--ticket', 'NOPE']), /REQ-####/);
});

test('apply posts every event before writing the csv, and writes nothing if a url is missing', async () => {
  const events = [
    { event: 'joiner', employeeId: 'EMP-1008', employee: employee({ employeeId: 'EMP-1008' }) },
    { event: 'leaver', employeeId: 'EMP-1005', reason: 'status', employee: employee({ employeeId: 'EMP-1005', status: 'terminated' }) },
  ];
  const calls = [];
  await assert.rejects(
    () => hr.postEvents(events, 'REQ-0002', { WORKFLOWS_JOINER_URL: 'https://example.invalid/joiner' }, async () => {
      throw new Error('fetch should not run');
    }),
    /WORKFLOWS_LEAVER_URL/,
  );
  assert.strictEqual(calls.length, 0);
  await hr.postEvents(events, 'REQ-0002', {
    WORKFLOWS_JOINER_URL: 'https://example.invalid/joiner',
    WORKFLOWS_LEAVER_URL: 'https://example.invalid/leaver',
    WORKFLOWS_CLIENT_TOKEN: 'secret-token',
  }, async (url, options) => {
    calls.push({ url, token: options.headers['x-api-client-token'], body: JSON.parse(options.body) });
    return { ok: true, status: 200 };
  });
  assert.deepStrictEqual(calls.map((call) => call.url), [
    'https://example.invalid/joiner',
    'https://example.invalid/leaver',
  ]);
  assert.strictEqual(calls[0].token, 'secret-token');
  assert.strictEqual(calls[0].body.employeeId, 'EMP-1008');
  assert.strictEqual(calls[1].body.reason, 'status');
});

test('csv appends a header once', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-sync-csv-'));
  const file = path.join(dir, 'jml.csv');
  hr.appendCsv(file, [{ time: '2026-10-06T12:00:00.000Z', ticket: 'REQ-0002', event: 'joiner', employee: 'EMP-1008', admin: 'timothy' }]);
  hr.appendCsv(file, [{ time: '2026-10-06T12:01:00.000Z', ticket: 'REQ-0002', event: 'leaver', employee: 'EMP-1005', admin: 'timothy' }]);
  assert.strictEqual(
    fs.readFileSync(file, 'utf8'),
    [
      'time,ticket,event,employee,admin',
      '2026-10-06T12:00:00.000Z,REQ-0002,joiner,EMP-1008,timothy',
      '2026-10-06T12:01:00.000Z,REQ-0002,leaver,EMP-1005,timothy',
      '',
    ].join('\n'),
  );
});

test('a dry run against a test commit lists the expected changes and does not write the csv', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hr-sync-git-'));
  const run = (args, options = {}) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', ...options });
  run(['init', '-b', 'main']);
  const commit = (message) => run(['-c', 'user.email=hr-sync@example.invalid', '-c', 'user.name=hr-sync test', 'commit', '-m', message]);
  fs.mkdirSync(path.join(dir, 'hr'));
  const previous = [
    employee({ employeeId: 'EMP-1002', title: 'Account Executive', managerId: 'EMP-1001' }),
    employee({ employeeId: 'EMP-1003', managerId: 'EMP-1001' }),
    employee({ employeeId: 'EMP-1005', department: 'Operations', title: 'Shift Supervisor' }),
    employee({ employeeId: 'EMP-1007', department: 'Finance' }),
  ];
  const current = [
    employee({ employeeId: 'EMP-1002', title: 'Senior Account Executive', managerId: 'EMP-1001' }),
    employee({ employeeId: 'EMP-1003', managerId: 'EMP-1002' }),
    employee({ employeeId: 'EMP-1005', department: 'Sales', status: 'terminated' }),
    employee({ employeeId: 'EMP-1007', department: 'Sales', endDate: '2020-01-01' }),
    employee({ employeeId: 'EMP-1008', email: 'new.hire@lanternfieldgoods.co.uk' }),
  ];
  fs.writeFileSync(path.join(dir, 'hr', 'employees.json'), `${JSON.stringify(previous, null, 2)}\n`);
  run(['add', 'hr/employees.json']);
  commit('previous roster');
  fs.writeFileSync(path.join(dir, 'hr', 'employees.json'), `${JSON.stringify(current, null, 2)}\n`);
  run(['add', 'hr/employees.json']);
  commit('test lifecycle changes');
  const output = execFileSync(process.execPath, [path.join(__dirname, 'hr-sync'), '--ticket', 'REQ-0002'], {
    cwd: dir,
    encoding: 'utf8',
  });
  assert.strictEqual(output, [
    'ticket REQ-0002',
    'mode dry-run',
    'mover EMP-1002 title',
    'mover EMP-1003 managerId',
    'leaver EMP-1005 status',
    'leaver EMP-1007 endDate',
    'joiner EMP-1008',
    '',
  ].join('\n'));
  assert.strictEqual(fs.existsSync(path.join(dir, 'logs', 'jml.csv')), false);
});
