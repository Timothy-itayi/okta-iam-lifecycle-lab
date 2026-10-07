const { page } = require('./views/layout');
const { roleOf, requireRole } = require('./roles');

function mountHubs(app, db) {
  const requireStaff = requireRole('staff', db);
  const requireAdmin = requireRole('admin', db);
  const requireHR = requireRole('hr', db);

  app.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/oidc/login');
    const role = roleOf(req.session.user, db);
    if (role === 'hr') return res.redirect('/hr/leave');
    if (role === 'admin') return res.redirect('/admin/leave');
    return res.redirect('/leave');
  });

  app.get('/logout', (req, res, next) => {
    req.session.destroy((error) => (error ? next(error) : res.redirect('/')));
  });

  app.get('/leave', requireStaff, (req, res) => {
    res.type('html').send(page({
      title: 'My leave',
      user: req.session.user,
      role: 'staff',
      flash: res.locals.flash,
      body: '<p>Your requests will be listed here.</p>',
    }));
  });

  app.get('/admin/leave', requireAdmin, (req, res) => {
    res.type('html').send(page({
      title: 'Department leave',
      user: req.session.user,
      role: 'admin',
      flash: res.locals.flash,
      body: '<p>Requests for your department will be listed here.</p>',
    }));
  });

  app.get('/hr/leave', requireHR, (req, res) => {
    res.type('html').send(page({
      title: 'HR leave',
      user: req.session.user,
      role: 'hr',
      flash: res.locals.flash,
      body: '<p>Requests waiting for HR will be listed here.</p>',
    }));
  });
}

module.exports = { mountHubs };
