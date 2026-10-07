const { findUserByUserName, userGroupNames } = require('./db');
const { ADMIN_GROUP, groupList } = require('./oidc');

const HR_GROUP = 'APP-Rostr-HR';

function emailOf(user) {
  if (!user) return '';
  return String(user.email || user.userName || '').trim();
}

function groupNames(user, db) {
  const names = new Set(groupList(user && user.groups));
  const email = emailOf(user);
  if (db && email) {
    const row = findUserByUserName(db, email);
    if (row) {
      for (const name of userGroupNames(db, row.id)) names.add(name);
    }
  }
  return names;
}

function roleOf(user, db) {
  const names = groupNames(user, db);
  if (names.has(HR_GROUP)) return 'hr';
  if (names.has(ADMIN_GROUP)) return 'admin';
  return 'staff';
}

function rostrRow(user, db) {
  const email = emailOf(user);
  if (!db || !email) return null;
  return findUserByUserName(db, email) || null;
}

function requireSignedIn(req, res, next) {
  if (!req.session.user) return res.status(401).type('text/plain').send('Not signed in.');
  next();
}

function requireRole(role, db) {
  return function requireNamedRole(req, res, next) {
    if (!req.session.user) return res.status(401).type('text/plain').send('Not signed in.');
    if (roleOf(req.session.user, db) !== role) {
      return res.status(403).type('text/plain').send('Not allowed.');
    }
    next();
  };
}

module.exports = {
  HR_GROUP,
  roleOf,
  rostrRow,
  requireSignedIn,
  requireRole,
};
