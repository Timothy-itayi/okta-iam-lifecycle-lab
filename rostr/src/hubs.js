const express = require('express');
const { page } = require('./views/layout');
const { escapeHtml } = require('./views/format');
const { groupNames, roleOf, requireRole, requireSignedIn, rostrRow } = require('./roles');
const {
  countLeaveWaiting,
  findLeaveRequestByRef,
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
  createLeaveRequest,
  cancelLeaveRequest,
  myRequests,
  weekdaysIn,
} = require('./leave');
const { reviewLeave } = require('./review');
const views = require('./views/leave');
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
      req.session.flash = { text: `Request ${request.ref} sent to ${to}`, href: `/leave/${request.ref}` };
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
      req.session.flash = { text: `Request ${request.ref} cancelled`, href: `/leave/${request.ref}` };
    } catch (error) {
      req.session.flash = { text: `Request ${request.ref} is already decided, so it cannot be cancelled.`, tone: 'bad' };
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

  app.get('/admin/leave', requireAdmin, (req, res) => {
    const me = viewer(req);
    const waiting = me.nav.waiting;
    render(req, res, me, {
      title: 'Team requests',
      context: `${me.department || 'Your department'} · leave waiting for your decision`,
      current: '/admin/leave',
      body: `<section class="panel empty"><p>${waiting ? `${waiting} ${waiting === 1 ? 'request is' : 'requests are'} waiting from ${escapeHtml(me.department || 'your department')}.` : `Nothing waiting. New requests from ${escapeHtml(me.department || 'your department')} will appear here.`}</p><p class="helper">The decision queue is the next part to be built.</p></section>`,
    });
  });

  app.get('/hr/export', requireHR, (req, res) => {
    const me = viewer(req);
    render(req, res, me, {
      title: 'Export',
      context: 'Balance changes waiting to be written back to the HR file',
      current: '/hr/export',
      body: '<section class="panel empty"><p>Nothing to export yet. Approved leave writes a balance change, and that list is built with the HR desk.</p></section>',
    });
  });

  app.get('/hr/leave', requireHR, (req, res) => {
    const me = viewer(req);
    const waiting = me.nav.waiting;
    render(req, res, me, {
      title: 'All leave',
      context: 'Approved by managers, waiting for HR',
      current: '/hr/leave',
      body: `<section class="panel empty"><p>${waiting ? `${waiting} ${waiting === 1 ? 'request is' : 'requests are'} with HR.` : 'Nothing is waiting for HR.'}</p><p class="helper">The HR queue is built after the manager queue.</p></section>`,
    });
  });
}

module.exports = { mountHubs };
