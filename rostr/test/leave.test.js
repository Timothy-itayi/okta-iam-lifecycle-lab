const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDatabase, insertShift } = require('../src/db');
const { transition } = require('../src/leave-state');
const { seedShifts } = require('../src/shifts');

function tempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rostr-leave-'));
  return openDatabase(path.join(dir, 'rostr.sqlite'));
}

test('leave tables exist on a new database', () => {
  const db = tempDb();
  const names = db.prepare(`
    SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name
  `).all().map((row) => row.name);
  for (const name of ['shifts', 'leave_requests', 'leave_reviews', 'leave_events', 'balance_changes']) {
    assert.ok(names.includes(name), name);
  }
  db.close();
});

test('legal leave moves follow the chain and illegal moves throw', () => {
  let request = { status: 'submitted', ref: 'LV-0001' };
  request = transition(request, 'to_admin', 'policy');
  assert.equal(request.status, 'with_admin');
  request = transition(request, 'to_hr', 'marcus.bell@lanternfieldgoods.co.uk');
  assert.equal(request.status, 'with_hr');
  request = transition(request, 'approve', 'helen.cho@lanternfieldgoods.co.uk');
  assert.equal(request.status, 'approved');
  assert.throws(() => transition(request, 'deny', 'helen.cho@lanternfieldgoods.co.uk'), /illegal move/);
});

test('an open request can be denied or cancelled, and a denied one cannot', () => {
  const denied = transition({ status: 'with_admin' }, 'deny', 'marcus.bell@lanternfieldgoods.co.uk');
  assert.equal(denied.status, 'denied');
  const cancelled = transition({ status: 'with_hr' }, 'cancel', 'priya.shah@lanternfieldgoods.co.uk');
  assert.equal(cancelled.status, 'cancelled');
  assert.throws(() => transition({ status: 'approved' }, 'cancel', 'priya.shah@lanternfieldgoods.co.uk'), /illegal move/);
  assert.throws(() => transition({ status: 'submitted' }, 'approve', 'helen.cho@lanternfieldgoods.co.uk'), /illegal move/);
});

test('seed writes ten weekday shifts for an active employee and skips a leaver', () => {
  const db = tempDb();
  const result = seedShifts(db, [
    { email: 'priya.shah@lanternfieldgoods.co.uk', status: 'active' },
    { email: 'samir.adeyemi@lanternfieldgoods.co.uk', status: 'terminated' },
  ], { from: '2026-10-12', insertShift });
  assert.equal(result.people, 1);
  assert.equal(result.days, 10);
  assert.equal(result.inserted, 10);
  const again = seedShifts(db, [
    { email: 'priya.shah@lanternfieldgoods.co.uk', status: 'active' },
  ], { from: '2026-10-12', insertShift });
  assert.equal(again.inserted, 0);
  const row = db.prepare('SELECT * FROM shifts WHERE email = ? ORDER BY day').get('priya.shah@lanternfieldgoods.co.uk');
  assert.equal(row.day, '2026-10-12');
  assert.equal(row.start, '09:00');
  assert.equal(row.end, '17:00');
  assert.equal(row.status, 'scheduled');
  db.close();
});
