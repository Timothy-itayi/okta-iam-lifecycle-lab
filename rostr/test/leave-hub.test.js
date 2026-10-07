const test = require('node:test');
const assert = require('node:assert/strict');
const { insertShift, listLeaveEvents, findLeaveRequestByRef, findLeaveReview } = require('../src/db');
const { validateLeave, weekdaysIn, weekdaysOfWeek } = require('../src/leave');
const { shortRange, longRange, shortDay } = require('../src/views/format');
const { appWithSession, listen, close, sessionFor, postForm, PEOPLE } = require('./helpers');

const BALANCE = { annual: 2, sick: 8, personal: 2 };

function check(input, requests = [], today = '2026-10-08') {
  return validateLeave(input, { requests, balance: BALANCE, today });
}

test('a request week is Monday to Friday around the start date', () => {
  assert.deepEqual(weekdaysOfWeek('2026-10-22'), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
  assert.deepEqual(weekdaysOfWeek('2026-10-19'), ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
});

test('working days skip weekends and count both ends', () => {
  assert.deepEqual(weekdaysIn('2026-10-23', '2026-10-27'), ['2026-10-23', '2026-10-26', '2026-10-27']);
  assert.deepEqual(weekdaysIn('2026-10-24', '2026-10-25'), []);
  assert.deepEqual(weekdaysIn('2026-10-27', '2026-10-26'), []);
});

test('dates read the way the spec writes them', () => {
  assert.equal(shortRange('2026-10-20', '2026-10-22'), '20–22 Oct');
  assert.equal(shortRange('2026-10-30', '2026-11-02'), '30 Oct – 2 Nov');
  assert.equal(shortRange('2026-10-02', '2026-10-02'), '2 Oct');
  assert.equal(longRange('2026-10-19', '2026-10-21'), 'Mon 19 – Wed 21 October');
  assert.equal(longRange('2026-10-20', '2026-10-20'), 'Tuesday 20 October');
  assert.equal(shortDay('2026-10-12'), 'Mon 12 Oct');
});

test('the form says what to fix', () => {
  const empty = check({});
  assert.deepEqual(empty.errors.map((error) => error.message), [
    'Choose a leave type.',
    'Choose a start date.',
    'Choose an end date.',
    'Write a short reason.',
  ]);
  assert.match(check({ leave_type: 'sick', start_day: '2026-10-22', end_day: '2026-10-20', reason: 'x' }).errors[0].message, /on or after the start date/);
  assert.match(check({ leave_type: 'sick', start_day: '2026-10-24', end_day: '2026-10-25', reason: 'x' }).errors[0].message, /at least one weekday/);
  assert.match(check({ leave_type: 'sick', start_day: '2026-02-30', end_day: '2026-03-02', reason: 'x' }).errors[0].message, /start date/);
  assert.match(check({ leave_type: 'sick', start_day: '2026-10-20', end_day: '2026-10-20', reason: 'a'.repeat(501) }).errors[0].message, /500 characters/);
  assert.match(check({ leave_type: 'holiday', start_day: '2026-10-20', end_day: '2026-10-20', reason: 'x' }).errors[0].message, /leave type/);
});

test('an overlap with open or approved leave is an error; cancelled leave is not', () => {
  const input = { leave_type: 'sick', start_day: '2026-10-21', end_day: '2026-10-21', reason: 'Dentist' };
  const open = [{ ref: 'LV-0003', status: 'with_admin', leave_type: 'annual', start_day: '2026-10-20', end_day: '2026-10-22', days: 3 }];
  assert.match(check(input, open).errors[0].message, /LV-0003/);
  assert.equal(check(input, [{ ...open[0], status: 'cancelled' }]).errors.length, 0);
  assert.match(check(input, [{ ...open[0], status: 'approved' }]).errors[0].message, /LV-0003/);
});

test('balance and notice are warnings, not errors', () => {
  const result = check({ leave_type: 'annual', start_day: '2026-10-20', end_day: '2026-10-22', reason: 'Family wedding in Ballarat.' });
  assert.equal(result.errors.length, 0);
  assert.equal(result.value.days, 3);
  assert.deepEqual(result.notices, [
    'This is 1 day more than your annual balance. You can still send it; your approver will see this.',
    "Annual leave needs 14 days' notice. You can still send it.",
  ]);
  const later = check({ leave_type: 'annual', start_day: '2026-11-02', end_day: '2026-11-03', reason: 'Trip' });
  assert.deepEqual(later.notices, []);
  const stacked = check(
    { leave_type: 'annual', start_day: '2026-11-09', end_day: '2026-11-09', reason: 'Trip' },
    [{ ref: 'LV-0001', status: 'with_admin', leave_type: 'annual', start_day: '2026-11-02', end_day: '2026-11-03', days: 2 }],
  );
  assert.match(stacked.notices[0], /1 day more than your annual balance after the 2 already requested/);
});

test('Priya sends a request: it goes to Marcus, shows in her list, and the window appears once', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, PEOPLE.priya);
    const page = await (await fetch(`${base}/leave`, { headers: { cookie } })).text();
    assert.match(page, /<span class="balance">2<\/span> days left/);
    assert.match(page, /No leave requested yet/);
    assert.match(page, /Goes to Marcus Bell, then HR\./);

    const sent = await postForm(base, '/leave', cookie, {
      leave_type: 'annual', start_day: '2026-10-20', end_day: '2026-10-22', reason: 'Family wedding in Ballarat.',
    });
    assert.equal(sent.status, 303);
    assert.equal(sent.headers.get('location'), '/leave');

    const request = findLeaveRequestByRef(db, 'LV-0001');
    assert.equal(request.status, 'with_admin');
    assert.equal(request.days, 3);
    assert.equal(request.department, 'Operations');
    assert.deepEqual(listLeaveEvents(db, request.id).map((event) => [event.actor, event.action, event.note]), [
      [PEOPLE.priya.email, 'submitted', null],
      ['rostr', 'to_admin', 'Marcus Bell'],
      ['policy', 'policy', 'deny: insufficient_balance, short_notice_annual'],
      ['jev', 'jev_unavailable', 'no_key'],
    ]);
    const review = findLeaveReview(db, request.id);
    assert.equal(review.policy_outcome, 'deny');
    assert.deepEqual(JSON.parse(review.policy_rules), ['insufficient_balance', 'short_notice_annual']);
    assert.equal(review.jev_outcome, null);
    assert.equal(review.agree, null);

    const list = await (await fetch(`${base}/leave`, { headers: { cookie } })).text();
    assert.match(list, /<dialog class="prompt" open/);
    assert.match(list, /This is being resolved/);
    assert.match(list, /LV-0001 is with Marcus Bell/);
    assert.doesNotMatch(list, /class="toast/);
    assert.match(list, /Annual leave/);
    assert.match(list, /Tue 20 – Thu 22 Oct/);
    assert.match(list, /3 days/);
    assert.match(list, /With manager/);
    assert.match(list, /href="\/leave\/LV-0001"/);
    assert.match(list, /class="request-ref">LV-0001</);
    assert.match(list, /aria-current="step"/);
    const again = await (await fetch(`${base}/leave`, { headers: { cookie } })).text();
    assert.doesNotMatch(again, /This is being resolved/);

    const detail = await (await fetch(`${base}/leave/LV-0001`, { headers: { cookie } })).text();
    assert.match(detail, /LV-0001 · Annual leave/);
    assert.match(detail, /Tue 20 – Thu 22 October/);
    assert.match(detail, /aria-current="step"/);
    assert.match(detail, /You sent this request/);
    assert.match(detail, /Sent to Marcus Bell/);
    assert.doesNotMatch(detail, /insufficient_balance/);
    assert.doesNotMatch(detail, /no_key/);

    const admin = await sessionFor(base, PEOPLE.marcus);
    const queue = await (await fetch(`${base}/admin/leave`, { headers: { cookie: admin } })).text();
    assert.match(queue, /Priya Shah/);
    assert.match(queue, /href="\/admin\/leave\/LV-0001"/);
    assert.match(queue, /aria-label="1 waiting"/);
    assert.match(queue, /Deny/);
  } finally {
    await close(server);
    db.close();
  }
});

test('a bad request comes back with the values kept and an error summary', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, PEOPLE.priya);
    const response = await postForm(base, '/leave', cookie, {
      leave_type: 'sick', start_day: '2026-10-22', end_day: '2026-10-20', reason: '<script>alert(1)</script>',
    });
    assert.equal(response.status, 400);
    const html = await response.text();
    assert.match(html, /class="error-summary"/);
    assert.match(html, /href="#field-end_day">Choose an end date on or after the start date\./);
    assert.match(html, /id="type-sick" checked/);
    assert.match(html, /value="2026-10-22"/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>alert/);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001'), undefined);
  } finally {
    await close(server);
    db.close();
  }
});

test('a manager with no other admin in the department goes straight to HR', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, PEOPLE.marcus);
    const page = await (await fetch(`${base}/leave`, { headers: { cookie } })).text();
    assert.match(page, /Goes to HR\./);
    await postForm(base, '/leave', cookie, { leave_type: 'personal', start_day: '2026-11-02', end_day: '2026-11-02', reason: 'Moving house' });
    const request = findLeaveRequestByRef(db, 'LV-0001');
    assert.equal(request.status, 'with_hr');
    const detail = await (await fetch(`${base}/leave/LV-0001`, { headers: { cookie } })).text();
    assert.match(detail, /No manager step/);
    assert.match(detail, /Sent to HR\. No other admin in Operations/);
  } finally {
    await close(server);
    db.close();
  }
});

test('a terminated employee cannot request leave', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, PEOPLE.thomas);
    const page = await fetch(`${base}/leave`, { headers: { cookie } });
    assert.equal(page.status, 403);
    assert.match(await page.text(), /HR record is not active/);
    const sent = await postForm(base, '/leave', cookie, { leave_type: 'sick', start_day: '2026-10-20', end_day: '2026-10-20', reason: 'x' });
    assert.equal(sent.status, 403);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001'), undefined);
  } finally {
    await close(server);
    db.close();
  }
});

test('an OIDC session with no email is told why, not shown an empty hub', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, { sub: '00u-test', groups: ['APP-Rostr-Admins'] });
    const page = await fetch(`${base}/leave`, { headers: { cookie } });
    assert.equal(page.status, 403);
    assert.match(await page.text(), /did not include your email/);
  } finally {
    await close(server);
    db.close();
  }
});

test('only the owner sees or cancels a request, and only while it is open', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const priya = await sessionFor(base, PEOPLE.priya);
    await postForm(base, '/leave', priya, { leave_type: 'sick', start_day: '2026-10-20', end_day: '2026-10-20', reason: 'Flu' });

    const jonah = await sessionFor(base, PEOPLE.jonah);
    assert.equal((await fetch(`${base}/leave/LV-0001`, { headers: { cookie: jonah } })).status, 404);
    assert.equal((await postForm(base, '/leave/LV-0001/cancel', jonah, {})).status, 404);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001').status, 'with_admin');

    const confirm = await (await fetch(`${base}/leave/LV-0001?confirm=cancel`, { headers: { cookie: priya } })).text();
    assert.match(confirm, /Cancel LV-0001\?/);
    const cancelled = await postForm(base, '/leave/LV-0001/cancel', priya, {});
    assert.equal(cancelled.status, 303);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001').status, 'cancelled');
    const list = await (await fetch(`${base}/leave`, { headers: { cookie: priya } })).text();
    assert.match(list, /Request LV-0001 cancelled/);
    assert.match(list, /Past requests/);

    await postForm(base, '/leave/LV-0001/cancel', priya, {});
    const after = await (await fetch(`${base}/leave`, { headers: { cookie: priya } })).text();
    assert.match(after, /already decided, so it cannot be cancelled/);
    const detail = await (await fetch(`${base}/leave/LV-0001`, { headers: { cookie: priya } })).text();
    assert.doesNotMatch(detail, /\?confirm=cancel/);
    assert.match(detail, /You cancelled this request/);

    const again = await postForm(base, '/leave', priya, { leave_type: 'sick', start_day: '2026-10-20', end_day: '2026-10-20', reason: 'Flu again' });
    assert.equal(again.status, 303);
    assert.equal(findLeaveRequestByRef(db, 'LV-0002').status, 'with_admin');
  } finally {
    await close(server);
    db.close();
  }
});

test('Marcus opens the waiting request, and a deny without a note does not decide it', async () => {
  const { app, db } = appWithSession();
  const { server, base } = listen(app);
  try {
    const priya = await sessionFor(base, PEOPLE.priya);
    await postForm(base, '/leave', priya, {
      leave_type: 'annual', start_day: '2026-10-20', end_day: '2026-10-22', reason: 'Family wedding in Ballarat.',
    });
    assert.equal((await fetch(`${base}/admin/leave/LV-0001`, { headers: { cookie: priya } })).status, 403);
    assert.equal((await postForm(base, '/admin/leave/LV-0001/flag', priya, { suggested: 'deny' })).status, 403);

    insertShift(db, { email: PEOPLE.jonah.email, day: '2026-10-19', start: '09:00', end: '17:00' });
    const marcus = await sessionFor(base, PEOPLE.marcus);
    const page = await (await fetch(`${base}/admin/leave/LV-0001`, { headers: { cookie: marcus } })).text();
    assert.match(page, /Priya Shah · Annual leave/);
    assert.match(page, /Family wedding in Ballarat/);
    assert.match(page, /Jev couldn't review this request/);
    assert.match(page, /Policy check/);
    assert.match(page, /aria-current="page">Team requests/);
    assert.match(page, /Team that week/);
    assert.match(page, /Priya Shah, Tuesday, requested leave/);
    assert.match(page, /Jonah Hale, Monday, rostered/);
    assert.doesNotMatch(page, /Thomas Okeke/);
    assert.match(page, /Flag Jev's suggestion/);
    assert.match(page, /Priya Shah sent this request/);
    assert.match(page, /Policy check ran/);

    const flagged = await postForm(base, '/admin/leave/LV-0001/flag', marcus, {});
    assert.equal(flagged.status, 400);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001').status, 'with_admin');
    const saved = await postForm(base, '/admin/leave/LV-0001/flag', marcus, { suggested: 'deny', note: 'The reason is a wedding, not a cover problem.' });
    assert.equal(saved.status, 303);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001').status, 'with_admin');
    const after = await (await fetch(`${base}/admin/leave/LV-0001`, { headers: { cookie: marcus } })).text();
    assert.match(after, /Flagged. You said Jev should have suggested Deny/);
    assert.match(after, /still waiting/);
    const staff = await (await fetch(`${base}/leave/LV-0001`, { headers: { cookie: priya } })).text();
    assert.doesNotMatch(staff, /Flagged/);

    const denied = await postForm(base, '/admin/leave/LV-0001', marcus, { action: 'deny' });
    assert.equal(denied.status, 400);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001').status, 'with_admin');

    const approved = await postForm(base, '/admin/leave/LV-0001', marcus, { action: 'approve' });
    assert.equal(approved.status, 303);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001').status, 'with_hr');
    const detail = await (await fetch(`${base}/leave/LV-0001`, { headers: { cookie: priya } })).text();
    assert.match(detail, /Your manager approved it/);
    assert.match(detail, /aria-current="step"/);
  } finally {
    await close(server);
    db.close();
  }
});

test('Helen decides the request Marcus sent and records a balance change', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const { app, db, dir } = appWithSession();
  const { server, base } = listen(app);
  try {
    const priya = await sessionFor(base, PEOPLE.priya);
    await postForm(base, '/leave', priya, {
      leave_type: 'annual', start_day: '2026-10-20', end_day: '2026-10-22', reason: 'Family wedding in Ballarat.',
    });
    const marcus = await sessionFor(base, PEOPLE.marcus);
    await postForm(base, '/admin/leave/LV-0001', marcus, { action: 'approve' });
    assert.equal((await fetch(`${base}/hr/leave`, { headers: { cookie: marcus } })).status, 403);

    const helen = await sessionFor(base, PEOPLE.helen);
    const own = await postForm(base, '/leave', helen, {
      leave_type: 'personal', start_day: '2026-10-26', end_day: '2026-10-26', reason: 'School concert.',
    });
    assert.equal(own.status, 303);
    const queue = await (await fetch(`${base}/hr/leave`, { headers: { cookie: helen } })).text();
    assert.match(queue, /Priya Shah/);
    assert.match(queue, /href="\/hr\/leave\/LV-0001"/);
    assert.match(queue, /Marcus Bell/);
    assert.match(queue, /Export changes/);
    assert.match(queue, /aria-label="2 waiting"/);
    assert.match(queue, /Waiting <span class="tab-count">\(2\)<\/span>/);
    assert.match(queue, /20–22 Oct/);

    const page = await (await fetch(`${base}/hr/leave/LV-0001`, { headers: { cookie: helen } })).text();
    assert.match(page, /Approved by Marcus Bell/);
    assert.match(page, /Team that week/);
    assert.match(page, /Flag Jev's suggestion/);
    assert.match(page, /Approve and update balance/);
    assert.match(page, /aria-current="page">All leave/);

    const declined = await postForm(base, '/hr/leave/LV-0001', helen, { action: 'deny' });
    assert.equal(declined.status, 400);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001').status, 'with_hr');

    const approved = await postForm(base, '/hr/leave/LV-0001', helen, { action: 'approve' });
    assert.equal(approved.status, 303);
    assert.equal(findLeaveRequestByRef(db, 'LV-0001').status, 'approved');
    assert.deepEqual(
      db.prepare('SELECT ref, email, leave_type, days, exported FROM balance_changes').all(),
      [{ ref: 'LV-0001', email: PEOPLE.priya.email, leave_type: 'annual', days: 3, exported: 0 }],
    );
    const hrFile = JSON.parse(fs.readFileSync(path.join(dir, 'employees.json'), 'utf8'));
    assert.equal(hrFile.find((person) => person.email === PEOPLE.priya.email).leave.annual, 2);

    const exportPage = await (await fetch(`${base}/hr/export`, { headers: { cookie: helen } })).text();
    assert.match(exportPage, /leave-apply/);
    const download = await fetch(`${base}/hr/export.json`, { headers: { cookie: helen } });
    assert.match(download.headers.get('content-disposition') || '', /balance-changes\.json/);
    assert.deepEqual(await download.json(), [{
      ref: 'LV-0001', email: PEOPLE.priya.email, leave_type: 'annual', days: 3,
    }]);
    assert.equal((await (await fetch(`${base}/hr/export.json`, { headers: { cookie: helen } })).json()).length, 1);

    const detail = await (await fetch(`${base}/leave/LV-0001`, { headers: { cookie: priya } })).text();
    assert.match(detail, /HR approved it/);

    assert.equal(findLeaveRequestByRef(db, 'LV-0002').status, 'with_hr');
    const ownPage = await (await fetch(`${base}/hr/leave/LV-0002`, { headers: { cookie: helen } })).text();
    assert.match(ownPage, /can&#39;t approve your own leave|can't approve your own leave/);
    assert.doesNotMatch(ownPage, /Approve and update balance/);
    assert.doesNotMatch(ownPage, /Flag Jev's suggestion/);
  } finally {
    await close(server);
    db.close();
  }
});

test('My roster lists the person\'s own shifts', async () => {
  const { app, db } = appWithSession();
  insertShift(db, { email: PEOPLE.priya.email, day: '2026-10-12', start: '09:00', end: '17:00' });
  insertShift(db, { email: PEOPLE.jonah.email, day: '2026-10-12', start: '10:00', end: '18:00' });
  const { server, base } = listen(app);
  try {
    const cookie = await sessionFor(base, PEOPLE.priya);
    const html = await (await fetch(`${base}/roster`, { headers: { cookie } })).text();
    assert.match(html, /Mon 12 Oct/);
    assert.match(html, /09:00–17:00/);
    assert.doesNotMatch(html, /10:00–18:00/);
  } finally {
    await close(server);
    db.close();
  }
});
