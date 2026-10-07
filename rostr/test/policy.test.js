const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDatabase, insertUser, insertLeaveRequest } = require('../src/db');
const { createHrReader } = require('../src/hr');
const { evaluate, factsFor, loadRules } = require('../src/policy');

const TODAY = '2026-10-08';

function request(overrides) {
  return {
    ref: 'LV-0099',
    email: 'priya.shah@lanternfieldgoods.co.uk',
    department: 'Operations',
    leave_type: 'annual',
    start_day: '2026-10-22',
    end_day: '2026-10-23',
    days: 2,
    reason: 'Trip',
    ...overrides,
  };
}

function facts(overrides) {
  return {
    employee: { status: 'active', leave: { annual: 2, sick: 8, personal: 2 } },
    rostr: { active: true, department: 'Operations' },
    remaining: 2,
    noticeDays: 14,
    cover: [],
    today: TODAY,
    ...overrides,
  };
}

function ids(result) {
  return result.rules.map((rule) => rule.id);
}

test('the rules file is the source the evaluator reads', () => {
  const rules = loadRules();
  assert.equal(rules.version, 1);
  assert.deepEqual(rules.rules.map((rule) => rule.id), [
    'inactive_employee',
    'insufficient_balance',
    'short_notice_annual',
    'cover_conflict',
    'long_sick',
    'within_policy',
  ]);
  const changed = structuredClone(rules);
  changed.rules.find((rule) => rule.id === 'short_notice_annual').params.minDays = 21;
  const same = request();
  const base = facts();
  assert.equal(evaluate(same, base, rules).outcome, 'approve');
  assert.equal(evaluate(same, base, changed).outcome, 'needs_review');
  assert.deepEqual(ids(evaluate(same, base, changed)), ['short_notice_annual']);
});

test('each rule can pass and can fire', () => {
  const cases = [
    {
      name: 'inside the rules',
      request: request(),
      facts: facts(),
      outcome: 'approve',
      ids: ['within_policy'],
    },
    {
      name: 'terminated in the HR file',
      request: request(),
      facts: facts({ employee: { status: 'terminated', leave: { annual: 15 } } }),
      outcome: 'deny',
      ids: ['inactive_employee'],
    },
    {
      name: 'inactive in Rostr',
      request: request(),
      facts: facts({ rostr: { active: false, department: 'Operations' } }),
      outcome: 'deny',
      ids: ['inactive_employee'],
    },
    {
      name: 'Priya asks for 3 days with 2 left',
      request: request({ end_day: '2026-10-26', days: 3 }),
      facts: facts({ remaining: 2 }),
      outcome: 'deny',
      ids: ['insufficient_balance'],
    },
    {
      name: 'Priya asks for exactly what is left',
      request: request(),
      facts: facts({ remaining: 2 }),
      outcome: 'approve',
      ids: ['within_policy'],
    },
    {
      name: 'annual leave inside 14 days',
      request: request({ start_day: '2026-10-09', end_day: '2026-10-12' }),
      facts: facts({ noticeDays: 1 }),
      outcome: 'needs_review',
      ids: ['short_notice_annual'],
    },
    {
      name: 'personal leave inside 14 days is not a notice problem',
      request: request({ leave_type: 'personal', start_day: '2026-10-09', end_day: '2026-10-09', days: 1 }),
      facts: facts({ remaining: 2, noticeDays: 1 }),
      outcome: 'approve',
      ids: ['within_policy'],
    },
    {
      name: 'Jonah is already approved on those days',
      request: request(),
      facts: facts({
        cover: [{
          email: 'jonah.hale@lanternfieldgoods.co.uk',
          status: 'approved',
          start_day: '2026-10-22',
          end_day: '2026-10-23',
        }],
      }),
      outcome: 'needs_review',
      ids: ['cover_conflict'],
    },
    {
      name: 'a request still with the manager is not cover',
      request: request(),
      facts: facts({
        cover: [{
          email: 'jonah.hale@lanternfieldgoods.co.uk',
          status: 'with_admin',
          start_day: '2026-10-22',
          end_day: '2026-10-23',
        }],
      }),
      outcome: 'approve',
      ids: ['within_policy'],
    },
    {
      name: 'sick leave over 3 days',
      request: request({ leave_type: 'sick', end_day: '2026-10-27', days: 4 }),
      facts: facts({ remaining: 8 }),
      outcome: 'needs_review',
      ids: ['long_sick'],
    },
    {
      name: 'sick leave of 3 days',
      request: request({ leave_type: 'sick', end_day: '2026-10-26', days: 3 }),
      facts: facts({ remaining: 8 }),
      outcome: 'approve',
      ids: ['within_policy'],
    },
  ];

  for (const item of cases) {
    const result = evaluate(item.request, item.facts);
    assert.equal(result.outcome, item.outcome, item.name);
    assert.deepEqual(ids(result), item.ids, item.name);
    for (const rule of result.rules) assert.equal(typeof rule.text, 'string');
  }
});

test('a deny wins when a review rule fired as well', () => {
  const result = evaluate(
    request({ end_day: '2026-10-26', days: 3 }),
    facts({
      remaining: 2,
      noticeDays: 1,
      cover: [{
        email: 'jonah.hale@lanternfieldgoods.co.uk',
        status: 'with_hr',
        start_day: '2026-10-22',
        end_day: '2026-10-22',
      }],
    }),
  );
  assert.equal(result.outcome, 'deny');
  assert.deepEqual(ids(result), ['insufficient_balance', 'short_notice_annual', 'cover_conflict']);
});

test('raising the cover limit in the rules lets one colleague be off', () => {
  const rules = loadRules();
  const changed = structuredClone(rules);
  changed.rules.find((rule) => rule.id === 'cover_conflict').params.maxOffPerDept = 2;
  const body = facts({
    cover: [{
      email: 'jonah.hale@lanternfieldgoods.co.uk',
      status: 'approved',
      start_day: '2026-10-22',
      end_day: '2026-10-23',
    }],
  });
  assert.equal(evaluate(request(), body, changed).outcome, 'approve');
});

test('facts come from the HR file, the Rostr user, and department leave', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rostr-policy-'));
  const hrFile = path.join(dir, 'employees.json');
  fs.writeFileSync(hrFile, JSON.stringify([
    { employeeId: 'EMP-1003', email: 'priya.shah@lanternfieldgoods.co.uk', department: 'Operations', status: 'active', leave: { annual: 2, sick: 8, personal: 2 } },
    { employeeId: 'EMP-1002', email: 'jonah.hale@lanternfieldgoods.co.uk', department: 'Operations', status: 'active', leave: { annual: 15, sick: 8, personal: 2 } },
  ]));
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  insertUser(db, { id: 'priya', userName: 'priya.shah@lanternfieldgoods.co.uk', email: 'priya.shah@lanternfieldgoods.co.uk', department: 'Operations', active: 1 });
  insertLeaveRequest(db, {
    ref: 'LV-0001',
    email: 'jonah.hale@lanternfieldgoods.co.uk',
    department: 'Operations',
    leave_type: 'annual',
    start_day: '2026-10-22',
    end_day: '2026-10-23',
    days: 2,
    reason: 'Cover',
    status: 'approved',
    created_at: '2026-10-01T00:00:00.000Z',
  });
  insertLeaveRequest(db, {
    ref: 'LV-0002',
    email: 'lena.ortiz@lanternfieldgoods.co.uk',
    department: 'Operations',
    leave_type: 'annual',
    start_day: '2026-10-22',
    end_day: '2026-10-23',
    days: 2,
    reason: 'Waiting',
    status: 'with_admin',
    created_at: '2026-10-02T00:00:00.000Z',
  });
  try {
    const asked = request({ ref: 'LV-0003', end_day: '2026-10-26', days: 3 });
    const built = factsFor(db, createHrReader(hrFile), asked, { today: TODAY });
    assert.equal(built.employee.status, 'active');
    assert.equal(built.rostr.active, true);
    assert.equal(built.remaining, 2);
    assert.equal(built.noticeDays, 14);
    assert.deepEqual(built.cover.map((row) => row.ref), ['LV-0001']);
    const result = evaluate(asked, built);
    assert.equal(result.outcome, 'deny');
    assert.deepEqual(ids(result), ['insufficient_balance', 'cover_conflict']);
  } finally {
    db.close();
  }
});
