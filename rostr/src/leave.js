const { transition, OPEN } = require('./leave-state');
const {
  nextLeaveRef,
  insertLeaveRequest,
  findLeaveRequestByRef,
  updateLeaveStatus,
  insertLeaveEvent,
  listLeaveRequestsByEmail,
  departmentAdmins,
} = require('./db');

const fs = require('fs');
const path = require('path');

const LEAVE_TYPES = ['annual', 'sick', 'personal'];
const TYPE_LABEL = { annual: 'Annual', sick: 'Sick', personal: 'Personal' };
// The HR file holds what is left. The yearly amount is the lab default every row started from.
const ENTITLEMENT = { annual: 15, sick: 8, personal: 2 };
const RULES_FILE = path.join(__dirname, '..', 'policy', 'leave-rules.json');
const REASON_MAX = 500;

function annualNoticeDays() {
  const parsed = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
  const rule = parsed.rules.find((item) => item.id === 'short_notice_annual');
  const days = Number(rule && rule.params && rule.params.minDays);
  if (!Number.isInteger(days)) throw new Error('short_notice_annual minDays must be an integer');
  return days;
}
const MAX_SPAN_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

function sydneyToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function parseDay(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) return null;
  return date;
}

function daysBetween(from, to) {
  return Math.round((parseDay(to) - parseDay(from)) / DAY_MS);
}

function weekdaysIn(start, end) {
  const from = parseDay(start);
  const to = parseDay(end);
  if (!from || !to || to < from) return [];
  const days = [];
  for (let time = from.getTime(); time <= to.getTime(); time += DAY_MS) {
    const date = new Date(time);
    const weekday = date.getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(date.toISOString().slice(0, 10));
  }
  return days;
}

function openDaysByType(requests, exceptRef) {
  const totals = { annual: 0, sick: 0, personal: 0 };
  for (const request of requests) {
    if (request.ref === exceptRef || !OPEN.has(request.status)) continue;
    if (totals[request.leave_type] != null) totals[request.leave_type] += request.days;
  }
  return totals;
}

function overlapping(requests, start, end) {
  return requests.find((request) => {
    if (!OPEN.has(request.status) && request.status !== 'approved') return false;
    return request.start_day <= end && request.end_day >= start;
  }) || null;
}

function noticesFor({ type, days, start }, { balance, openDays, today }) {
  const notices = [];
  if (!type || !days) return notices;
  const left = Number(balance[type] ?? 0) - Number(openDays[type] || 0);
  if (days > left) {
    const over = days - Math.max(left, 0);
    const already = openDays[type] ? ` after the ${openDays[type]} already requested` : '';
    notices.push(`This is ${over} ${over === 1 ? 'day' : 'days'} more than your ${type} balance${already}. You can still send it; your approver will see this.`);
  }
  const noticeDays = annualNoticeDays();
  if (type === 'annual' && start && daysBetween(today, start) < noticeDays) {
    notices.push(`Annual leave needs ${noticeDays} days' notice. You can still send it.`);
  }
  return notices;
}

function validateLeave(input, { requests, balance, today }) {
  const errors = [];
  const type = String(input.leave_type || '').trim();
  const start = String(input.start_day || '').trim();
  const end = String(input.end_day || '').trim();
  const reason = String(input.reason || '').replace(/\r\n/g, '\n').trim();
  const value = { leave_type: type, start_day: start, end_day: end, reason };

  if (!LEAVE_TYPES.includes(type)) errors.push({ field: 'leave_type', message: 'Choose a leave type.' });
  const startDate = parseDay(start);
  const endDate = parseDay(end);
  if (!startDate) errors.push({ field: 'start_day', message: 'Choose a start date.' });
  if (!endDate) errors.push({ field: 'end_day', message: 'Choose an end date.' });

  let days = 0;
  if (startDate && endDate) {
    if (endDate < startDate) {
      errors.push({ field: 'end_day', message: 'Choose an end date on or after the start date.' });
    } else if (daysBetween(start, end) > MAX_SPAN_DAYS) {
      errors.push({ field: 'end_day', message: 'Choose an end date within a year of the start date.' });
    } else {
      days = weekdaysIn(start, end).length;
      if (days === 0) errors.push({ field: 'start_day', message: 'Choose dates that include at least one weekday.' });
    }
  }

  if (!reason) errors.push({ field: 'reason', message: 'Write a short reason.' });
  else if (reason.length > REASON_MAX) errors.push({ field: 'reason', message: `Keep the reason to ${REASON_MAX} characters or fewer.` });

  if (days > 0) {
    const clash = overlapping(requests, start, end);
    if (clash) {
      errors.push({
        field: 'start_day',
        message: `You already have leave on some of these days (${clash.ref}). Cancel that request or choose other dates.`,
      });
    }
  }

  const notices = errors.length ? [] : noticesFor({ type, days, start }, { balance, openDays: openDaysByType(requests), today });
  return { errors, value: { ...value, days }, notices };
}

function displayName(row) {
  return [row.givenName, row.familyName].filter(Boolean).join(' ') || row.userName;
}

function approversFor(db, department, email) {
  const key = String(email || '').toLowerCase();
  return departmentAdmins(db, department).filter((row) => String(row.userName).toLowerCase() !== key);
}

function routeText(approvers) {
  if (!approvers.length) return 'Goes to HR.';
  return `Goes to ${approvers.map(displayName).join(' or ')}, then HR.`;
}

function createLeaveRequest(db, { email, department, value, at = new Date().toISOString() }) {
  const approvers = approversFor(db, department, email);
  return db.transaction(() => {
    const ref = nextLeaveRef(db);
    let request = { ref, email, department, ...value, status: 'submitted', created_at: at };
    request = insertLeaveRequest(db, request);
    insertLeaveEvent(db, { request_id: request.id, at, actor: email, action: 'submitted', note: null });
    request = transition(request, 'to_admin', 'rostr');
    if (approvers.length) {
      insertLeaveEvent(db, { request_id: request.id, at, actor: 'rostr', action: 'to_admin', note: approvers.map(displayName).join(', ') });
    } else {
      request = transition(request, 'to_hr', 'rostr');
      insertLeaveEvent(db, { request_id: request.id, at, actor: 'rostr', action: 'to_hr', note: `No other admin in ${department}` });
    }
    updateLeaveStatus(db, request.id, request.status);
    return { request: findLeaveRequestByRef(db, ref), approvers };
  })();
}

function cancelLeaveRequest(db, { ref, email, at = new Date().toISOString() }) {
  const request = findLeaveRequestByRef(db, ref);
  if (!request || request.email.toLowerCase() !== String(email).toLowerCase()) return null;
  const next = transition(request, 'cancel', email);
  db.transaction(() => {
    updateLeaveStatus(db, request.id, next.status);
    insertLeaveEvent(db, { request_id: request.id, at, actor: email, action: 'cancel', note: null });
  })();
  return findLeaveRequestByRef(db, ref);
}

function myRequests(db, email) {
  return listLeaveRequestsByEmail(db, email);
}

module.exports = {
  LEAVE_TYPES,
  TYPE_LABEL,
  ENTITLEMENT,
  annualNoticeDays,
  REASON_MAX,
  sydneyToday,
  parseDay,
  weekdaysIn,
  daysBetween,
  openDaysByType,
  validateLeave,
  approversFor,
  routeText,
  displayName,
  createLeaveRequest,
  cancelLeaveRequest,
  myRequests,
};
