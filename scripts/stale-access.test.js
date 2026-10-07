const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const stale = require('./stale-access');

const NOW = new Date('2026-10-07T02:46:00.000Z');
const TODAY = '2026-10-07';

function employee(overrides) {
  return {
    employeeId: 'EMP-1001',
    email: 'ava.nguyen@lanternfieldgoods.co.uk',
    status: 'active',
    endDate: null,
    ...overrides,
  };
}

test('parseArgs wants plant or --out', () => {
  assert.deepEqual(stale.parseArgs(['plant']), { command: 'plant' });
  assert.deepEqual(stale.parseArgs(['--out', 'evidence/05-governance/stale-access.md']), {
    command: 'report',
    out: 'evidence/05-governance/stale-access.md',
  });
  assert.throws(() => stale.parseArgs([]), /--out/);
});

test('lastLogin older than 30 days is stale; empty is not stale', () => {
  assert.equal(stale.isStale('2026-08-22T05:20:26.829Z', NOW), true);
  assert.equal(stale.isStale('2026-10-06T05:20:26.829Z', NOW), false);
  assert.equal(stale.isStale('', NOW), false);
});

test('terminated or ended staff are not HR active', () => {
  assert.equal(stale.isHrActive(employee(), TODAY), true);
  assert.equal(stale.isHrActive(employee({ status: 'terminated' }), TODAY), false);
  assert.equal(stale.isHrActive(employee({ endDate: '2026-10-07' }), TODAY), false);
  assert.equal(stale.isHrActive(null, TODAY), false);
});

test('licensed stale or licensed orphan is reclaim', () => {
  assert.equal(stale.recommendation({
    stale: true, licensed: true, hrActive: true, never: false, active: true,
  }), 'reclaim');
  assert.equal(stale.recommendation({
    stale: false, licensed: true, hrActive: false, never: true, active: true,
  }), 'reclaim');
  assert.equal(stale.recommendation({
    stale: false, licensed: false, hrActive: true, never: true, active: true,
  }), 'confirm with manager');
  assert.equal(stale.recommendation({
    stale: false, licensed: false, hrActive: true, never: false, active: true,
  }), 'keep');
});

test('findings include Jonah as the stale licensed seat', () => {
  const report = stale.findingsFrom(
    [
      { email: 'jonah.hale@lanternfieldgoods.co.uk', lastLogin: '2026-08-22T05:20:26.829Z', licensed: 1, active: 1 },
      { email: 'ava.nguyen@lanternfieldgoods.co.uk', lastLogin: '', licensed: 0, active: 1 },
      { email: 'orphan.roster@example.invalid', lastLogin: '', licensed: 1, active: 1 },
      { email: 'samir.adeyemi@lanternfieldgoods.co.uk', lastLogin: '', licensed: 0, active: 0 },
    ],
    [
      employee({ email: 'ava.nguyen@lanternfieldgoods.co.uk' }),
      employee({ employeeId: 'EMP-1002', email: 'jonah.hale@lanternfieldgoods.co.uk' }),
      employee({
        employeeId: 'EMP-1007',
        email: 'samir.adeyemi@lanternfieldgoods.co.uk',
        status: 'terminated',
        endDate: '2026-10-07',
      }),
    ],
    NOW,
    TODAY,
  );
  assert.equal(report.stale.length, 1);
  assert.equal(report.stale[0].user, 'jonah.hale@lanternfieldgoods.co.uk');
  assert.equal(report.stale[0].recommendation, 'reclaim');
  assert.equal(report.licensedCount, 2);
  assert.equal(report.hrActiveCount, 2);
  assert.equal(report.unusedLicences.length, 2);
});

test('plant backdates a recent lastLogin once', () => {
  const updates = [];
  const db = {
    prepare(sql) {
      return {
        get() {
          return { userName: stale.PLANT_LOGIN, lastLogin: '2026-10-06T05:20:26.829Z', licensed: 0 };
        },
        run(...args) { updates.push([sql, ...args]); },
      };
    },
  };
  const result = stale.plant(db, NOW);
  assert.equal(stale.isStale(result.newLastLogin, NOW), true);
  assert.match(updates[0][0], /lastLogin/);
});

test('report writes the findings file', async () => {
  fs.mkdirSync(os.tmpdir(), { recursive: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'stale-access-'));
  const out = path.join(dir, 'stale-access.md');
  const lines = [];
  await stale.main(['--out', out], {
    cwd: dir,
    now: NOW,
    stdout: (line) => lines.push(line),
    listRostrUsers: () => [
      { email: 'jonah.hale@lanternfieldgoods.co.uk', lastLogin: '2026-08-22T05:20:26.829Z', licensed: 1, active: 1 },
    ],
    listEmployees: () => [employee({ email: 'jonah.hale@lanternfieldgoods.co.uk' })],
    plantMeta: {
      originalLastLogin: '2026-10-06T05:20:26.829Z',
      newLastLogin: '2026-08-22T05:20:26.829Z',
    },
  });
  const text = fs.readFileSync(out, 'utf8');
  assert.match(text, /reclaim/);
  assert.match(text, /jonah\.hale@/);
  assert.match(lines[0], /1 stale/);
});
