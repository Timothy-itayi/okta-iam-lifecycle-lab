const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { openDatabase, insertBalanceChange } = require('../rostr/src/db');
const apply = require('./leave-apply');

const HR = `[
  {
    "employeeId": "EMP-1003",
    "email": "priya.shah@lanternfieldgoods.co.uk",
    "leave": { "annual": 2, "sick": 8, "personal": 2 }
  },
  {
    "employeeId": "EMP-1004",
    "email": "marcus.bell@lanternfieldgoods.co.uk",
    "leave": { "annual": 15, "sick": 8, "personal": 2 }
  }
]
`;

function fixture(changes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'leave-apply-'));
  const hr = path.join(dir, 'employees.json');
  const input = path.join(dir, 'changes.json');
  const dbPath = path.join(dir, 'rostr.sqlite');
  fs.writeFileSync(hr, HR);
  fs.writeFileSync(input, JSON.stringify(changes));
  const db = openDatabase(dbPath);
  for (const change of changes) insertBalanceChange(db, change);
  db.close();
  return { dir, hr, input, dbPath };
}

test('ticket must be REQ- and four digits', () => {
  assert.equal(apply.parseTicket('REQ-0010'), 'REQ-0010');
  assert.throws(() => apply.parseTicket('REQ-010'), /REQ-####/);
});

test('dry-run prints the new balance and does not write the file', () => {
  const { dir, hr, input, dbPath } = fixture([{
    ref: 'LV-0002', email: 'priya.shah@lanternfieldgoods.co.uk', leave_type: 'annual', days: 2,
  }]);
  const result = apply.main(['--ticket', 'REQ-0010', '--in', input, '--hr', hr, '--db', dbPath], { root: dir });
  assert.match(result.text, /dry-run/);
  assert.match(result.text, /LV-0002 EMP-1003 annual 2 -> 0/);
  assert.equal(fs.readFileSync(hr, 'utf8'), HR);
  const db = openDatabase(dbPath);
  assert.equal(db.prepare('SELECT exported FROM balance_changes').get().exported, 0);
  db.close();
});

test('apply subtracts the days once and leaves the rest of the file alone', () => {
  const { dir, hr, input, dbPath } = fixture([{
    ref: 'LV-0002', email: 'priya.shah@lanternfieldgoods.co.uk', leave_type: 'annual', days: 2,
  }]);
  const result = apply.main(['--ticket', 'REQ-0010', '--in', input, '--hr', hr, '--db', dbPath, '--apply'], { root: dir });
  assert.match(result.text, /^apply/m);
  const written = fs.readFileSync(hr, 'utf8');
  assert.match(written, /"annual": 0/);
  assert.match(written, /"annual": 15/);
  assert.equal(written.replace('"annual": 0', '"annual": 2'), HR);
  const db = openDatabase(dbPath);
  assert.equal(db.prepare('SELECT exported FROM balance_changes').get().exported, 1);
  db.close();
  assert.throws(
    () => apply.main(['--ticket', 'REQ-0010', '--in', input, '--hr', hr, '--db', dbPath, '--apply'], { root: dir }),
    /not an unexported balance change/,
  );
  assert.match(fs.readFileSync(hr, 'utf8'), /"annual": 0/);
});
