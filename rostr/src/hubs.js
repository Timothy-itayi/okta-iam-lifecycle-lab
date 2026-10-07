const express = require('express');
const { page } = require('./views/layout');
const { escapeHtml } = require('./views/format');
const { groupNames, roleOf, requireRole, requireSignedIn, rostrRow } = require('./roles');
const {
  countLeaveWaiting,
  findLeaveRequestByRef,
  findLeaveReview,
  findUserByUserName,
  listAllLeave,
  listBalanceChanges,
  listLeaveByDepartment,
  listLeaveEvents,
  listShiftsByEmail,
} = require('./db');
const {
  sydneyToday,
  validateLeave,
  openDaysByType,
  approversFor,
  routeText,
  displayName,
  TYPE_LABEL,
  createLeaveRequest,
  cancelLeaveRequest,
  decideLeaveRequest,
  hrDecideLeave,
  myRequests,
  weekdaysIn,
} = require('./leave');
const { factsFor } = require('./policy');
const { longRange } = require('./views/format');
const { reviewLeave } = require('./review');
const views = require('./views/leave');
const queue = require('./views/queue');
const hrViews = require('./views/hr');
const { profileBody } = require('./views/profile');

const REF = /^LV-\d{4,}$/i;

function emailOf(user) {
  return String((user && (user.email || user.userName)) || '').trim();
}

function mountHubs(app, { db, hr, signInPath = '/saml/login', today = () => sydneyToday(), jev = null }) {
  const requireAdmin = requireRole('admin', db);
  const requireHR = requireRole('hr', db);
  const form = express.urlencoded({ extended: false, limit: '10kb' });

  function viewer(req) {
    const user = req.session.user;
    const role = roleOf(user, db);
    const email = emailOf(user);
    const row = rostrRow(user, db);
    const department = (row && row.department) || user.department || null;
    let jobTitle = null;
    if (hr && email) {
      try {
        const employee = hr.getEmployeeByEmail(email);
        if (employee && employee.title) jobTitle = employee.title;
      } catch (error) {
        jobTitle = null;
      }
    }
    let waiting = 0;
    if (role === 'admin') waiting = countLeaveWaiting(db, 'with_admin', { department, excludeEmail: email });
    if (role === 'hr') waiting = countLeaveWaiting(db, 'with_hr', { excludeEmail: email });
    const groups = [...groupNames(user, db)].sort();
    return { user: { ...user, department }, role, email, department, jobTitle, groups, nav: { waiting } };
  }

  function render(req, res, me, options, status = 200) {
    res.status(status).type('html').send(page({
      user: me.user,
      role: me.role,
      jobTitle: me.jobTitle,
      groups: me.groups,
      nav: me.nav,
      flash: res.locals.flash,
      ...options,
    }));
  }

  // The leave screens need the HR row behind the signed-in email. Returns null after sending the reason it is missing.
  function employeeOr403(req, res, me, title, current) {
    let problem = null;
    let employee = null;
    if (!me.email) {
      problem = 'This sign-in did not include your email, so Rostr cannot find your HR record. Sign out and sign in through Rostr from the Okta dashboard.';
    } else if (!hr) {
      problem = 'HR records are not available right now. Try again later or contact HR.';
    } else {
      try {
        employee = hr.getEmployeeByEmail(me.email);
      } catch (error) {
        problem = 'HR records could not be read. Try again later or contact HR.';
      }
      if (!problem && !employee) problem = `There is no HR record for ${me.email}. Contact HR.`;
      else if (!problem && employee.status !== 'active') problem = 'Your HR record is not active, so you cannot request leave.';
    }
    if (problem) {
      render(req, res, me, { title, current, banner: problem, body: '' }, 403);
      return null;
    }
    return employee;
  }

  function formState(me, employee, requests) {
    const balance = employee.leave || { annual: 0, sick: 0, personal: 0 };
    return {
      balance,
      openDays: openDaysByType(requests),
      route: routeText(approversFor(db, me.department, me.email)),
      today: today(),
    };
  }

  function requestAction() {
    return '<a class="btn primary" href="/leave/new" data-sheet-open>Request leave</a>';
  }

  app.get('/me', (req, res) => {
    if (!req.session.user) {
      return res.status(401).type('html').send(page({
        title: 'Profile',
        context: 'Not signed in.',
        body: `<p><a class="btn primary" href="${escapeHtml(signInPath)}">Sign in</a></p>`,
      }));
    }
    const me = viewer(req);
    render(req, res, me, {
      title: 'Profile',
      current: '/me',
      action: '<a class="btn primary" href="/leave">My leave</a>',
      body: profileBody(me.user),
    });
  });

  app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect(signInPath);
    const role = roleOf(req.session.user, db);
    if (role === 'hr') return res.redirect('/hr/leave');
    if (role === 'admin') return res.redirect('/admin/leave');
    return res.redirect('/leave');
  });

  app.get('/logout', (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.type('html').send(page({
        title: 'Signed out of Rostr',
        context: 'Okta may still be signed in, so signing in again can be instant.',
        body: `<section class="panel empty"><p>You have signed out of Rostr.</p><a class="btn primary" href="${escapeHtml(signInPath)}">Sign in again</a></section>`,
      }));
    });
  });

  app.get('/leave', requireSignedIn, (req, res) => {
    const me = viewer(req);
    const employee = employeeOr403(req, res, me, 'My leave', '/leave');
    if (!employee) return;
    const requests = myRequests(db, me.email);
    const state = formState(me, employee, requests);
    render(req, res, me, {
      title: 'My leave',
      action: requestAction(),
      current: '/leave',
      body: views.myLeaveBody({ balance: state.balance, requests, form: views.requestForm(state) }),
    });
  });

  app.get('/leave/new', requireSignedIn, (req, res) => {
    const me = viewer(req);
    const employee = employeeOr403(req, res, me, 'Request leave', '/leave');
    if (!employee) return;
    const state = formState(me, employee, myRequests(db, me.email));
    render(req, res, me, {
      title: 'Request leave',
      current: '/leave',
      body: views.newLeaveBody({ form: views.requestForm({ ...state, standalone: true }) }),
    });
  });

  app.post('/leave', requireSignedIn, form, async (req, res, next) => {
    try {
      const me = viewer(req);
      const employee = employeeOr403(req, res, me, 'Request leave', '/leave');
      if (!employee) return;
      const requests = myRequests(db, me.email);
      const state = formState(me, employee, requests);
      const result = validateLeave(req.body || {}, { requests, balance: state.balance, today: state.today });
      if (result.errors.length) {
        return render(req, res, me, {
          title: 'Request leave',
          current: '/leave',
          body: views.newLeaveBody({ form: views.requestForm({ ...state, value: result.value, errors: result.errors, standalone: true }) }),
        }, 400);
      }
      const department = me.department || employee.department;
      const { request, approvers } = createLeaveRequest(db, { email: me.email, department, value: result.value });
      await reviewLeave(db, hr, request, { today: state.today, client: jev });
      const to = approvers.length ? approvers.map(displayName).join(' or ') : 'HR';
      req.session.flash = {
        title: 'This is being resolved',
        text: `${request.ref} is with ${to}.`,
        href: `/leave/${request.ref}`,
      };
      req.session.save(() => res.redirect(303, '/leave'));
    } catch (error) {
      next(error);
    }
  });

  function ownRequest(req, res, me) {
    const ref = String(req.params.ref || '');
    const request = REF.test(ref) ? findLeaveRequestByRef(db, ref) : null;
    if (!request || request.email.toLowerCase() !== me.email.toLowerCase()) {
      render(req, res, me, { title: 'Request not found', current: '/leave', body: '<section class="panel empty"><p>There is no request with that number in your leave.</p><a class="btn secondary" href="/leave">Back to my leave</a></section>' }, 404);
      return null;
    }
    return request;
  }

  app.get('/leave/:ref', requireSignedIn, (req, res) => {
    const me = viewer(req);
    const request = ownRequest(req, res, me);
    if (!request) return;
    const header = views.detailHeader(request);
    const open = ['submitted', 'with_admin', 'with_hr'].includes(request.status);
    render(req, res, me, {
      ...header,
      current: '/leave',
      action: open && req.query.confirm !== 'cancel'
        ? `<a class="btn destructive" href="/leave/${escapeHtml(request.ref)}?confirm=cancel">Cancel request</a>`
        : '',
      body: views.detailBody({ request, events: listLeaveEvents(db, request.id), confirm: req.query.confirm === 'cancel' }),
    });
  });

  app.post('/leave/:ref/cancel', requireSignedIn, (req, res) => {
    const me = viewer(req);
    const request = ownRequest(req, res, me);
    if (!request) return;
    try {
      cancelLeaveRequest(db, { ref: request.ref, email: me.email });
      req.session.flash = {
        title: 'Request cancelled',
        text: `Request ${request.ref} cancelled`,
        href: `/leave/${request.ref}`,
      };
    } catch (error) {
      req.session.flash = {
        title: 'Already decided',
        text: `Request ${request.ref} is already decided, so it cannot be cancelled.`,
      };
    }
    req.session.save(() => res.redirect(303, '/leave'));
  });

  app.get('/roster', requireSignedIn, (req, res) => {
    const me = viewer(req);
    const shifts = me.email ? listShiftsByEmail(db, me.email) : [];
    const leaveDays = new Set();
    for (const request of me.email ? myRequests(db, me.email) : []) {
      if (request.status === 'approved') for (const day of weekdaysIn(request.start_day, request.end_day)) leaveDays.add(day);
    }
    render(req, res, me, {
      title: 'My roster',
      current: '/roster',
      body: views.rosterBody({ shifts, leaveDays }),
    });
  });

  function personNameFor(email) {
    const user = email ? findUserByUserName(db, email) : null;
    return user ? displayName(user) : email;
  }

  app.get('/admin/leave', requireAdmin, (req, res) => {
    const me = viewer(req);
    const rows = listLeaveByDepartment(db, me.department);
    const waiting = rows.filter((row) => row.status === 'with_admin');
    const decided = rows.filter((row) => row.status !== 'with_admin' && row.status !== 'submitted');
    const view = req.query.view === 'decided' ? 'decided' : 'waiting';
    const names = {};
    for (const row of rows) names[row.email] = personNameFor(row.email);
    render(req, res, me, {
      title: 'Team requests',
      context: `${me.department || 'Your department'} · leave waiting for your decision`,
      current: '/admin/leave',
      body: queue.queueBody({ waiting, decided, view, names }),
    });
  });

  function teamRequest(req, res, me) {
    const ref = String(req.params.ref || '');
    const request = REF.test(ref) ? findLeaveRequestByRef(db, ref) : null;
    const same = request && String(request.department || '').toLowerCase() === String(me.department || '').toLowerCase();
    if (!request || !same) {
      render(req, res, me, { title: 'Request not found', current: '/admin/leave', body: '<section class="panel empty"><p>That request is not in your department.</p><a class="btn secondary" href="/admin/leave">Back to team requests</a></section>' }, 404);
      return null;
    }
    return request;
  }

  function decisionPage(req, res, me, request, error, status) {
    const review = findLeaveReview(db, request.id);
    const facts = factsFor(db, hr, request, { today: today() });
    const own = request.email.toLowerCase() === me.email.toLowerCase();
    render(req, res, me, {
      title: `${personNameFor(request.email)} · ${TYPE_LABEL[request.leave_type] || request.leave_type} leave`,
      context: `${longRange(request.start_day, request.end_day)} · ${request.ref}`,
      current: '/admin/leave',
      body: queue.decisionBody({ request, review, facts, own, error }),
    }, status);
  }

  app.get('/admin/leave/:ref', requireAdmin, (req, res) => {
    const me = viewer(req);
    const request = teamRequest(req, res, me);
    if (!request) return;
    decisionPage(req, res, me, request);
  });

  app.post('/admin/leave/:ref', requireAdmin, form, (req, res) => {
    const me = viewer(req);
    const request = teamRequest(req, res, me);
    if (!request) return;
    const action = String((req.body && req.body.action) || '');
    try {
      decideLeaveRequest(db, { ref: request.ref, actor: me.email, action, note: req.body && req.body.note });
      const name = personNameFor(request.email);
      req.session.flash = action === 'approve'
        ? { title: 'Sent to HR', text: `Approved. ${request.ref} is with HR.` }
        : { title: 'Request denied', text: `Denied. ${name} will see it on the request.` };
      req.session.save(() => res.redirect(303, '/admin/leave?view=decided'));
    } catch (error) {
      if (error.message === 'note required') return decisionPage(req, res, me, request, 'Write a note to deny this request.', 400);
      req.session.flash = { title: 'Already decided', text: `${request.ref} is no longer waiting for you.` };
      req.session.save(() => res.redirect(303, '/admin/leave'));
    }
  });

  const HR_VIEWS = new Set(['waiting', 'approved', 'declined', 'all']);

  app.get('/hr/export.json', requireHR, (req, res) => {
    const changes = listBalanceChanges(db).map((row) => ({
      ref: row.ref,
      email: row.email,
      leave_type: row.leave_type,
      days: row.days,
    }));
    res.set('Content-Disposition', 'attachment; filename="balance-changes.json"');
    res.json(changes);
  });

  app.get('/hr/export', requireHR, (req, res) => {
    const me = viewer(req);
    const changes = listBalanceChanges(db);
    const names = {};
    for (const row of changes) names[row.email] = personNameFor(row.email);
    render(req, res, me, {
      title: 'Export',
      context: 'Balance changes waiting to be written back to the HR file',
      current: '/hr/export',
      body: hrViews.exportBody(changes, names),
    });
  });

  app.get('/hr/leave', requireHR, (req, res) => {
    const me = viewer(req);
    const rows = listAllLeave(db);
    const view = HR_VIEWS.has(req.query.view) ? req.query.view : 'waiting';
    const dept = String(req.query.dept || '');
    const names = {};
    for (const row of rows) {
      names[row.email] = personNameFor(row.email);
      if (row.manager_actor && row.manager_actor !== 'rostr') names[row.manager_actor] = personNameFor(row.manager_actor);
    }
    render(req, res, me, {
      title: 'All leave',
      context: 'Approved by managers, waiting for HR',
      current: '/hr/leave',
      action: '<a class="btn secondary" href="/hr/export">Export changes</a>',
      body: hrViews.hrQueueBody({ rows, view, dept, names }),
    });
  });

  function hrRequest(req, res, me) {
    const ref = String(req.params.ref || '');
    const request = REF.test(ref) ? findLeaveRequestByRef(db, ref) : null;
    if (!request) {
      render(req, res, me, { title: 'Request not found', current: '/hr/leave', body: '<section class="panel empty"><p>There is no request with that number.</p><a class="btn secondary" href="/hr/leave">Back to all leave</a></section>' }, 404);
      return null;
    }
    return request;
  }

  function hrPage(req, res, me, request, error, status) {
    const review = findLeaveReview(db, request.id);
    const events = listLeaveEvents(db, request.id);
    const facts = factsFor(db, hr, request, { today: today() });
    const names = {};
    for (const event of events) {
      if (event.actor && event.actor !== 'rostr' && event.actor !== 'policy' && event.actor !== 'jev') {
        names[event.actor] = personNameFor(event.actor);
      }
    }
    names[request.email] = personNameFor(request.email);
    render(req, res, me, {
      title: `${names[request.email]} · ${TYPE_LABEL[request.leave_type] || request.leave_type} leave`,
      context: `${longRange(request.start_day, request.end_day)} · ${request.ref}`,
      current: '/hr/leave',
      body: hrViews.hrDecisionBody({
        request,
        review,
        facts,
        events,
        names,
        own: request.email.toLowerCase() === me.email.toLowerCase(),
        error,
      }),
    }, status);
  }

  app.get('/hr/leave/:ref', requireHR, (req, res) => {
    const me = viewer(req);
    const request = hrRequest(req, res, me);
    if (!request) return;
    hrPage(req, res, me, request);
  });

  app.post('/hr/leave/:ref', requireHR, form, (req, res) => {
    const me = viewer(req);
    const request = hrRequest(req, res, me);
    if (!request) return;
    const action = String((req.body && req.body.action) || '');
    try {
      hrDecideLeave(db, { ref: request.ref, actor: me.email, action, note: req.body && req.body.note });
      const name = personNameFor(request.email);
      req.session.flash = action === 'approve'
        ? { title: 'Balance change recorded', text: `Approved. ${request.ref} is approved. Export the balance change when you are ready.` }
        : { title: 'Request declined', text: `Declined. ${name} will see it on the request.` };
      req.session.save(() => res.redirect(303, action === 'approve' ? '/hr/leave?view=approved' : '/hr/leave?view=declined'));
    } catch (error) {
      if (error.message === 'note required') return hrPage(req, res, me, request, 'Write a note to decline this request.', 400);
      if (error.message === 'own request') return hrPage(req, res, me, request);
      req.session.flash = { title: 'Already decided', text: `${request.ref} is no longer waiting for HR.` };
      req.session.save(() => res.redirect(303, '/hr/leave'));
    }
  });
}

module.exports = { mountHubs };
