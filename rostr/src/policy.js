const fs = require('fs');
const path = require('path');
const { findUserByUserName, listCoverRequests, listLeaveRequestsByEmail } = require('./db');
const { daysBetween, openDaysByType, weekdaysIn } = require('./leave');

const RULES_FILE = path.join(__dirname, '..', 'policy', 'leave-rules.json');
const COVER_STATUSES = new Set(['with_hr', 'approved']);

function loadRules(file = RULES_FILE) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!parsed || !Array.isArray(parsed.rules)) {
    throw new Error('leave rules must be a JSON object with a rules array');
  }
  return parsed;
}

function ruleById(rules, id) {
  const found = rules.rules.find((rule) => rule.id === id);
  if (!found) throw new Error(`leave rule ${id} is missing`);
  return found;
}

function hit(rule) {
  return { id: rule.id, outcome: rule.outcome, text: rule.text };
}

function peopleOffOn(day, cover, self) {
  const emails = new Set();
  for (const other of cover || []) {
    const email = String(other.email || '').toLowerCase();
    if (!email || email === self) continue;
    if (!COVER_STATUSES.has(other.status)) continue;
    if (other.start_day <= day && other.end_day >= day) emails.add(email);
  }
  return emails.size;
}

function evaluate(request, facts, rules = loadRules()) {
  const fired = [];
  const inactive = !facts.employee || facts.employee.status !== 'active' || !facts.rostr || !facts.rostr.active;
  if (inactive) fired.push(hit(ruleById(rules, 'inactive_employee')));

  if (Number(request.days) > Number(facts.remaining)) {
    fired.push(hit(ruleById(rules, 'insufficient_balance')));
  }

  if (request.leave_type === 'annual') {
    const notice = ruleById(rules, 'short_notice_annual');
    if (Number(facts.noticeDays) < Number(notice.params.minDays)) fired.push(hit(notice));
  }

  const cover = ruleById(rules, 'cover_conflict');
  const self = String(request.email || '').toLowerCase();
  const crowded = weekdaysIn(request.start_day, request.end_day).some((day) => {
    return peopleOffOn(day, facts.cover, self) >= Number(cover.params.maxOffPerDept);
  });
  if (crowded) fired.push(hit(cover));

  if (request.leave_type === 'sick') {
    const sick = ruleById(rules, 'long_sick');
    if (Number(request.days) > Number(sick.params.days)) fired.push(hit(sick));
  }

  let outcome = 'approve';
  if (fired.some((rule) => rule.outcome === 'deny')) outcome = 'deny';
  else if (fired.some((rule) => rule.outcome === 'needs_review')) outcome = 'needs_review';
  else fired.push(hit(ruleById(rules, 'within_policy')));

  return { outcome, rules: fired };
}

function factsFor(db, hr, request, { today }) {
  const email = String(request.email || '');
  let employee = null;
  if (hr && email) {
    try {
      employee = hr.getEmployeeByEmail(email);
    } catch (error) {
      employee = null;
    }
  }
  const row = email ? findUserByUserName(db, email) : null;
  const rostr = row ? { active: Boolean(row.active), department: row.department || null } : null;
  const own = listLeaveRequestsByEmail(db, email).filter((item) => item.ref !== request.ref);
  const openDays = openDaysByType(own);
  const balance = employee && employee.leave ? Number(employee.leave[request.leave_type] ?? 0) : 0;
  return {
    employee,
    rostr,
    remaining: balance - Number(openDays[request.leave_type] || 0),
    noticeDays: daysBetween(today, request.start_day),
    cover: listCoverRequests(db, {
      department: request.department,
      start: request.start_day,
      end: request.end_day,
      excludeEmail: email,
    }),
    today,
  };
}

module.exports = { loadRules, evaluate, factsFor, RULES_FILE, COVER_STATUSES };
