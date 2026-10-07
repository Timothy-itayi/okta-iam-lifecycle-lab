const express = require('express');
const { Passport } = require('passport');
const { Strategy: SamlStrategy } = require('@node-saml/passport-saml');
const { findUserByUserName, upsertSignIn } = require('./db');
const { recordSignIn } = require('./auth-log');

const ADMIN_GROUP = 'APP-Rostr-Admins';
const HR_GROUP = 'APP-Rostr-HR';

function toList(value) {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function roleFromGroups(groups) {
  const list = toList(groups);
  if (list.includes(HR_GROUP)) return 'hr';
  return list.includes(ADMIN_GROUP) ? 'admin' : 'staff';
}

function samlOptions({ baseUrl, entryPoint, idpIssuer, idpCert }) {
  return {
    callbackUrl: `${baseUrl}/saml/acs`,
    issuer: `${baseUrl}/saml/metadata`,
    entryPoint,
    idpIssuer,
    idpCert,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true,
    acceptedClockSkewMs: 30000,
    // The request-ID cache is in memory, so a restart between /saml/login and /saml/acs rejects that one sign-in.
    validateInResponseTo: 'ifPresent',
  };
}

function signInFromProfile(db, profile, now = new Date().toISOString()) {
  const userName = profile.nameID;
  if (!userName) {
    throw new Error('Assertion has no NameID');
  }
  const existing = findUserByUserName(db, userName);
  if (existing && !existing.active) {
    throw new Error('User is inactive in Rostr');
  }
  const groups = toList(profile.groups);
  const row = upsertSignIn(db, {
    userName,
    givenName: profile.firstName ?? null,
    familyName: profile.lastName ?? null,
    email: profile.email ?? userName,
    department: profile.department ?? null,
    lastLogin: now,
  });
  return {
    userName: row.userName,
    email: row.email,
    givenName: row.givenName,
    familyName: row.familyName,
    department: row.department,
    groups: groups.join(', '),
    role: roleFromGroups(groups),
    lastLogin: row.lastLogin,
  };
}

function logFailure(authLogPath, reason) {
  recordSignIn(authLogPath, { protocol: 'saml', user: 'unknown', outcome: 'failure', reason });
}

function mountSaml(app, { db, authLogPath, saml }) {
  const passport = new Passport();
  const strategy = new SamlStrategy(
    samlOptions(saml),
    (profile, done) => {
      try {
        done(null, signInFromProfile(db, profile));
      } catch (error) {
        done(null, false, { message: error.message });
      }
    },
    (profile, done) => done(null, false),
  );
  passport.use('saml', strategy);

  const authenticate = (req, res, next) => {
    passport.authenticate('saml', { session: false }, (error, user, info) => {
      if (error || !user) {
        const reason = error ? error.message : (info && info.message) || 'SAML sign-in rejected';
        logFailure(authLogPath, reason);
        return res.status(401).type('text/plain').send('Sign-in failed.');
      }
      req.session.regenerate((regenerateError) => {
        if (regenerateError) return next(regenerateError);
        req.session.user = user;
        recordSignIn(authLogPath, { protocol: 'saml', user: user.userName, outcome: 'success' });
        req.session.save((saveError) => (saveError ? next(saveError) : res.redirect('/')));
      });
    })(req, res, next);
  };

  app.get('/saml/login', (req, res, next) => {
    passport.authenticate('saml', { session: false }, (error) => {
      logFailure(authLogPath, error ? error.message : 'SAML login request failed');
      res.status(500).type('text/plain').send('Could not start sign-in.');
    })(req, res, next);
  });
  app.post('/saml/acs', express.urlencoded({ extended: false, limit: '256kb' }), authenticate);
  app.get('/saml/metadata', (req, res) => {
    res.type('application/xml').send(strategy.generateServiceProviderMetadata(null, null));
  });
}

module.exports = { mountSaml, samlOptions, signInFromProfile, roleFromGroups };
