const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const CREATE_USERS = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    userName TEXT NOT NULL UNIQUE,
    givenName TEXT,
    familyName TEXT,
    email TEXT,
    department TEXT,
    title TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    lastLogin TEXT,
    licensed INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    displayName TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS group_members (
    groupId TEXT NOT NULL,
    userId TEXT NOT NULL,
    PRIMARY KEY (groupId, userId)
  );
`;

const CREATE_LEAVE = `
  CREATE TABLE IF NOT EXISTS shifts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    day TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled'
  );
  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    department TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    start_day TEXT NOT NULL,
    end_day TEXT NOT NULL,
    days INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leave_reviews (
    request_id INTEGER PRIMARY KEY,
    policy_outcome TEXT NOT NULL,
    policy_rules TEXT NOT NULL,
    jev_outcome TEXT,
    jev_rule TEXT,
    jev_confidence REAL,
    jev_probabilities TEXT,
    jev_reason_fit TEXT,
    jev_urgency REAL,
    agree INTEGER,
    model TEXT,
    reviewed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS leave_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    at TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    note TEXT
  );
  CREATE TABLE IF NOT EXISTS balance_changes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref TEXT NOT NULL,
    email TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    days INTEGER NOT NULL,
    exported INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS jev_flags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL,
    at TEXT NOT NULL,
    actor TEXT NOT NULL,
    suggested TEXT NOT NULL,
    note TEXT
  );
`;

function openDatabase(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.exec(CREATE_USERS);
  db.exec(CREATE_LEAVE);
  return db;
}

function listUsers(db) {
  return db.prepare(`
    SELECT id, userName, givenName, familyName, email, department, title, active, lastLogin, licensed
    FROM users
    ORDER BY userName
  `).all();
}

function insertUser(db, user) {
  db.prepare(`
    INSERT INTO users (
      id, userName, givenName, familyName, email, department, title, active, lastLogin, licensed
    ) VALUES (
      @id, @userName, @givenName, @familyName, @email, @department, @title, @active, @lastLogin, @licensed
    )
  `).run({
    id: user.id,
    userName: user.userName,
    givenName: user.givenName ?? null,
    familyName: user.familyName ?? null,
    email: user.email ?? null,
    department: user.department ?? null,
    title: user.title ?? null,
    active: user.active ?? 1,
    lastLogin: user.lastLogin ?? null,
    licensed: user.licensed ?? 0,
  });
}

function findUserByUserName(db, userName) {
  return db.prepare('SELECT * FROM users WHERE userName = ?').get(userName);
}

// A new row gets a random id. SCIM will own ids and the active flag; sign-in never changes either.
function upsertSignIn(db, user) {
  db.prepare(`
    INSERT INTO users (id, userName, givenName, familyName, email, department, lastLogin)
    VALUES (@id, @userName, @givenName, @familyName, @email, @department, @lastLogin)
    ON CONFLICT(userName) DO UPDATE SET
      givenName = excluded.givenName,
      familyName = excluded.familyName,
      email = excluded.email,
      department = excluded.department,
      lastLogin = excluded.lastLogin
  `).run({ id: crypto.randomUUID(), ...user });
  return findUserByUserName(db, user.userName);
}

function findUserById(db, id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function findUserByUserNameAnyCase(db, userName) {
  return db.prepare('SELECT * FROM users WHERE userName = ? COLLATE NOCASE').get(userName);
}

function countUsers(db) {
  return db.prepare('SELECT COUNT(*) AS total FROM users').get().total;
}

function pageUsers(db, offset, limit) {
  return db.prepare('SELECT * FROM users ORDER BY id LIMIT ? OFFSET ?').all(limit, offset);
}

function createProvisionedUser(db, user) {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO users (id, userName, givenName, familyName, email, department, title, active)
    VALUES (@id, @userName, @givenName, @familyName, @email, @department, @title, @active)
  `).run({ ...user, id, active: user.active ? 1 : 0 });
  return findUserById(db, id);
}

function updateProvisionedUser(db, id, user) {
  db.prepare(`
    UPDATE users SET
      userName = @userName,
      givenName = @givenName,
      familyName = @familyName,
      email = @email,
      department = @department,
      title = @title,
      active = @active
    WHERE id = @id
  `).run({ ...user, id, active: user.active ? 1 : 0 });
  return findUserById(db, id);
}

function findGroupById(db, id) {
  return db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
}

function findGroupByDisplayName(db, displayName) {
  return db.prepare('SELECT * FROM groups WHERE displayName = ? COLLATE NOCASE').get(displayName);
}

function countGroups(db) {
  return db.prepare('SELECT COUNT(*) AS total FROM groups').get().total;
}

function pageGroups(db, offset, limit) {
  return db.prepare('SELECT * FROM groups ORDER BY id LIMIT ? OFFSET ?').all(limit, offset);
}

function userGroupNames(db, userId) {
  return db.prepare(`
    SELECT groups.displayName AS name
    FROM group_members
    JOIN groups ON groups.id = group_members.groupId
    WHERE group_members.userId = ?
    ORDER BY groups.displayName
  `).all(userId).map((row) => row.name);
}

function groupMembers(db, groupId) {
  return db.prepare(`
    SELECT users.id AS value, users.userName AS display
    FROM group_members
    JOIN users ON users.id = group_members.userId
    WHERE group_members.groupId = ?
    ORDER BY users.id
  `).all(groupId);
}

function insertGroup(db, { displayName, members }) {
  const id = crypto.randomUUID();
  const insert = db.prepare('INSERT INTO groups (id, displayName) VALUES (?, ?)');
  const add = db.prepare('INSERT INTO group_members (groupId, userId) VALUES (?, ?)');
  db.transaction(() => {
    insert.run(id, displayName);
    for (const userId of members) add.run(id, userId);
  })();
  return findGroupById(db, id);
}

function replaceGroup(db, id, { displayName, members }) {
  const update = db.prepare('UPDATE groups SET displayName = ? WHERE id = ?');
  const clear = db.prepare('DELETE FROM group_members WHERE groupId = ?');
  const add = db.prepare('INSERT INTO group_members (groupId, userId) VALUES (?, ?)');
  db.transaction(() => {
    update.run(displayName, id);
    clear.run(id);
    for (const userId of members) add.run(id, userId);
  })();
  return findGroupById(db, id);
}

function findShift(db, email, day) {
  return db.prepare('SELECT * FROM shifts WHERE email = ? AND day = ?').get(email, day);
}

function insertShift(db, shift) {
  const existing = findShift(db, shift.email, shift.day);
  if (existing) return existing;
  const info = db.prepare(`
    INSERT INTO shifts (email, day, start, end, status)
    VALUES (@email, @day, @start, @end, @status)
  `).run({
    email: shift.email,
    day: shift.day,
    start: shift.start,
    end: shift.end,
    status: shift.status || 'scheduled',
  });
  return findShift(db, shift.email, shift.day) || { id: info.lastInsertRowid };
}

function listShiftsByEmail(db, email) {
  return db.prepare('SELECT * FROM shifts WHERE email = ? COLLATE NOCASE ORDER BY day, start').all(email);
}

function listShiftsInRange(db, { start, end }) {
  return db.prepare('SELECT * FROM shifts WHERE day >= ? AND day <= ? ORDER BY day, email').all(start, end);
}

function listLeaveInRange(db, { department, start, end }) {
  if (!department || !start || !end) return [];
  return db.prepare(`
    SELECT * FROM leave_requests
    WHERE department = @department COLLATE NOCASE
      AND status IN ('submitted', 'with_admin', 'with_hr', 'approved')
      AND start_day <= @end AND end_day >= @start
    ORDER BY start_day, id
  `).all({ department, start, end });
}

function insertJevFlag(db, flag) {
  db.prepare(`
    INSERT INTO jev_flags (request_id, at, actor, suggested, note)
    VALUES (@request_id, @at, @actor, @suggested, @note)
  `).run({ note: null, ...flag });
}

function latestJevFlag(db, requestId) {
  return db.prepare('SELECT * FROM jev_flags WHERE request_id = ? ORDER BY id DESC LIMIT 1').get(requestId);
}

function listFlaggedRequestIds(db, department) {
  if (!department) return [];
  return db.prepare(`
    SELECT DISTINCT jev_flags.request_id AS id
    FROM jev_flags
    JOIN leave_requests ON leave_requests.id = jev_flags.request_id
    WHERE leave_requests.department = ? COLLATE NOCASE
  `).all(department).map((row) => row.id);
}

function nextLeaveRef(db) {
  const row = db.prepare('SELECT COALESCE(MAX(id), 0) + 1 AS next FROM leave_requests').get();
  return `LV-${String(row.next).padStart(4, '0')}`;
}

function insertLeaveRequest(db, request) {
  const info = db.prepare(`
    INSERT INTO leave_requests (ref, email, department, leave_type, start_day, end_day, days, reason, status, created_at)
    VALUES (@ref, @email, @department, @leave_type, @start_day, @end_day, @days, @reason, @status, @created_at)
  `).run(request);
  return db.prepare('SELECT * FROM leave_requests WHERE id = ?').get(info.lastInsertRowid);
}

function findLeaveRequestByRef(db, ref) {
  return db.prepare('SELECT * FROM leave_requests WHERE ref = ?').get(String(ref || '').toUpperCase());
}

function updateLeaveStatus(db, id, status) {
  db.prepare('UPDATE leave_requests SET status = ? WHERE id = ?').run(status, id);
}

function listCoverRequests(db, { department, start, end, excludeEmail }) {
  if (!department || !start || !end) return [];
  return db.prepare(`
    SELECT * FROM leave_requests
    WHERE department = @department COLLATE NOCASE
      AND status IN ('with_hr', 'approved')
      AND email <> @excludeEmail COLLATE NOCASE
      AND start_day <= @end
      AND end_day >= @start
    ORDER BY start_day, id
  `).all({ department, start, end, excludeEmail: excludeEmail || '' });
}

function listLeaveByDepartment(db, department) {
  if (!department) return [];
  return db.prepare(`
    SELECT leave_requests.*,
      leave_reviews.policy_outcome,
      leave_reviews.policy_rules,
      leave_reviews.jev_outcome,
      leave_reviews.jev_rule,
      leave_reviews.jev_confidence,
      leave_reviews.jev_reason_fit,
      leave_reviews.jev_urgency,
      leave_reviews.agree
    FROM leave_requests
    LEFT JOIN leave_reviews ON leave_reviews.request_id = leave_requests.id
    WHERE leave_requests.department = ? COLLATE NOCASE
    ORDER BY leave_requests.created_at, leave_requests.id
  `).all(department);
}

function listAllLeave(db) {
  return db.prepare(`
    SELECT leave_requests.*,
      leave_reviews.policy_outcome,
      leave_reviews.policy_rules,
      leave_reviews.jev_outcome,
      leave_reviews.jev_rule,
      leave_reviews.jev_confidence,
      leave_reviews.jev_reason_fit,
      leave_reviews.jev_urgency,
      leave_reviews.agree,
      (SELECT actor FROM leave_events WHERE request_id = leave_requests.id AND action = 'to_hr' ORDER BY id DESC LIMIT 1) AS manager_actor,
      (SELECT at FROM leave_events WHERE request_id = leave_requests.id AND action = 'to_hr' ORDER BY id DESC LIMIT 1) AS manager_at,
      (SELECT note FROM leave_events WHERE request_id = leave_requests.id AND action = 'to_hr' ORDER BY id DESC LIMIT 1) AS manager_note
    FROM leave_requests
    LEFT JOIN leave_reviews ON leave_reviews.request_id = leave_requests.id
    ORDER BY leave_requests.created_at, leave_requests.id
  `).all();
}

function insertBalanceChange(db, change) {
  db.prepare(`
    INSERT INTO balance_changes (ref, email, leave_type, days, exported)
    VALUES (@ref, @email, @leave_type, @days, 0)
  `).run(change);
}

function listBalanceChanges(db) {
  return db.prepare('SELECT * FROM balance_changes WHERE exported = 0 ORDER BY id').all();
}

function listLeaveRequestsByEmail(db, email) {
  return db.prepare(`
    SELECT * FROM leave_requests WHERE email = ? COLLATE NOCASE ORDER BY created_at DESC, id DESC
  `).all(email);
}

function countLeaveWaiting(db, status, { department, excludeEmail } = {}) {
  const clauses = ['status = @status'];
  if (department) clauses.push('department = @department COLLATE NOCASE');
  if (excludeEmail) clauses.push('email <> @excludeEmail COLLATE NOCASE');
  return db.prepare(`SELECT COUNT(*) AS total FROM leave_requests WHERE ${clauses.join(' AND ')}`)
    .get({ status, department: department || null, excludeEmail: excludeEmail || null }).total;
}

function insertLeaveReview(db, review) {
  db.prepare(`
    INSERT INTO leave_reviews (
      request_id, policy_outcome, policy_rules, jev_outcome, jev_rule, jev_confidence,
      jev_probabilities, jev_reason_fit, jev_urgency, agree, model, reviewed_at
    ) VALUES (
      @request_id, @policy_outcome, @policy_rules, @jev_outcome, @jev_rule, @jev_confidence,
      @jev_probabilities, @jev_reason_fit, @jev_urgency, @agree, @model, @reviewed_at
    )
  `).run({
    jev_outcome: null,
    jev_rule: null,
    jev_confidence: null,
    jev_probabilities: null,
    jev_reason_fit: null,
    jev_urgency: null,
    agree: null,
    model: null,
    ...review,
  });
}

function findLeaveReview(db, requestId) {
  return db.prepare('SELECT * FROM leave_reviews WHERE request_id = ?').get(requestId);
}

function insertLeaveEvent(db, event) {
  db.prepare(`
    INSERT INTO leave_events (request_id, at, actor, action, note)
    VALUES (@request_id, @at, @actor, @action, @note)
  `).run({ note: null, ...event });
}

function listLeaveEvents(db, requestId) {
  return db.prepare('SELECT * FROM leave_events WHERE request_id = ? ORDER BY at, id').all(requestId);
}

function departmentAdmins(db, department) {
  if (!department) return [];
  return db.prepare(`
    SELECT users.* FROM users
    JOIN group_members ON group_members.userId = users.id
    JOIN groups ON groups.id = group_members.groupId
    WHERE groups.displayName = 'APP-Rostr-Admins' COLLATE NOCASE
      AND users.active = 1
      AND users.department = ? COLLATE NOCASE
    ORDER BY users.familyName, users.givenName
  `).all(department);
}

function deleteGroup(db, id) {
  if (!findGroupById(db, id)) return false;
  const clear = db.prepare('DELETE FROM group_members WHERE groupId = ?');
  const remove = db.prepare('DELETE FROM groups WHERE id = ?');
  db.transaction(() => {
    clear.run(id);
    remove.run(id);
  })();
  return true;
}

module.exports = {
  openDatabase,
  listUsers,
  insertUser,
  findUserByUserName,
  upsertSignIn,
  findUserById,
  findUserByUserNameAnyCase,
  countUsers,
  pageUsers,
  createProvisionedUser,
  updateProvisionedUser,
  findGroupById,
  findGroupByDisplayName,
  countGroups,
  pageGroups,
  groupMembers,
  userGroupNames,
  insertGroup,
  replaceGroup,
  deleteGroup,
  findShift,
  insertShift,
  listShiftsByEmail,
  listShiftsInRange,
  listLeaveInRange,
  insertJevFlag,
  latestJevFlag,
  listFlaggedRequestIds,
  nextLeaveRef,
  insertLeaveRequest,
  findLeaveRequestByRef,
  updateLeaveStatus,
  listCoverRequests,
  listLeaveByDepartment,
  listAllLeave,
  insertBalanceChange,
  listBalanceChanges,
  listLeaveRequestsByEmail,
  countLeaveWaiting,
  insertLeaveReview,
  findLeaveReview,
  insertLeaveEvent,
  listLeaveEvents,
  departmentAdmins,
};
