const { generators } = require('openid-client');
const { recordSignIn } = require('./auth-log');

const ADMIN_GROUP = 'APP-Rostr-Admins';

function groupList(value) {
  if (value == null || value === '') return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list.map((item) => String(item).trim()).filter(Boolean);
}

function isRostrAdmin(user) {
  return groupList(user && user.groups).includes(ADMIN_GROUP);
}

function sessionFromClaims(claims) {
  if (!claims || !claims.sub) {
    throw new Error('ID token has no sub');
  }
  const audience = Array.isArray(claims.aud) ? claims.aud.join(', ') : claims.aud;
  return {
    iss: claims.iss,
    aud: audience,
    sub: claims.sub,
    exp: claims.exp,
    groups: groupList(claims.groups).join(', '),
  };
}

function logFailure(authLogPath, reason) {
  const text = String(reason || 'OIDC sign-in rejected').slice(0, 300);
  recordSignIn(authLogPath, { protocol: 'oidc', user: 'unknown', outcome: 'failure', reason: text });
}

function mountOidc(app, { client, redirectUri, authLogPath }) {
  app.get('/oidc/login', (req, res, next) => {
    const codeVerifier = generators.codeVerifier();
    const state = generators.state();
    req.session.oidc = { codeVerifier, state };
    const url = client.authorizationUrl({
      scope: 'openid',
      redirect_uri: redirectUri,
      code_challenge: generators.codeChallenge(codeVerifier),
      code_challenge_method: 'S256',
      state,
    });
    req.session.save((error) => (error ? next(error) : res.redirect(url)));
  });

  app.get('/oidc/callback', async (req, res, next) => {
    const pending = req.session.oidc;
    try {
      if (!pending) {
        throw new Error('No OIDC login in this session');
      }
      const tokenSet = await client.callback(redirectUri, client.callbackParams(req), {
        code_verifier: pending.codeVerifier,
        state: pending.state,
      });
      const sessionUser = sessionFromClaims(tokenSet.claims());
      req.session.regenerate((error) => {
        if (error) return next(error);
        req.session.user = sessionUser;
        recordSignIn(authLogPath, { protocol: 'oidc', user: sessionUser.sub, outcome: 'success' });
        req.session.save((saveError) => (saveError ? next(saveError) : res.redirect('/me')));
      });
    } catch (error) {
      logFailure(authLogPath, error.message);
      res.status(401).type('text/plain').send('Sign-in failed.');
    }
  });
}

module.exports = { mountOidc, sessionFromClaims, isRostrAdmin, groupList, ADMIN_GROUP };
