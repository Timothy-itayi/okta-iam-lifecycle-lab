const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDatabase, insertUser, findUserByUserName } = require('../src/db');
const { createApp } = require('../src/app');
const { parseIdpMetadata } = require('../src/saml-metadata');
const { signInFromProfile, roleFromGroups, samlOptions } = require('../src/saml');

const METADATA = `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor entityID="http://www.okta.com/exampleapp" xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata">
  <md:IDPSSODescriptor WantAuthnRequestsSigned="false" protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:X509Data><ds:X509Certificate>QUJD
REVG</ds:X509Certificate></ds:X509Data></ds:KeyInfo>
    </md:KeyDescriptor>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="https://idp.example.com/post"/>
    <md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.example.com/redirect"/>
  </md:IDPSSODescriptor>
</md:EntityDescriptor>`;

const SAML = {
  baseUrl: 'https://rostr.example.com',
  entryPoint: 'https://idp.example.com/redirect',
  idpIssuer: 'http://www.okta.com/exampleapp',
  idpCert: ['QUJDREVG'],
};

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rostr-saml-'));
}

test('metadata gives the redirect entry point, issuer, and signing cert', () => {
  assert.deepEqual(parseIdpMetadata(METADATA), {
    idpIssuer: 'http://www.okta.com/exampleapp',
    entryPoint: 'https://idp.example.com/redirect',
    idpCert: ['QUJDREVG'],
  });
});

test('metadata without a signing cert is rejected', () => {
  const noCert = METADATA.replace(/<md:KeyDescriptor[\s\S]*<\/md:KeyDescriptor>/, '');
  assert.throws(() => parseIdpMetadata(noCert), /signing certificate/);
});

test('SAML options: audience URI as issuer, signed assertions, 30 second skew', () => {
  const options = samlOptions(SAML);
  assert.equal(options.callbackUrl, 'https://rostr.example.com/saml/acs');
  assert.equal(options.issuer, 'https://rostr.example.com/saml/metadata');
  assert.equal(options.wantAssertionsSigned, true);
  assert.equal(options.acceptedClockSkewMs, 30000);
});

test('APP-Rostr-Admins maps to admin, anything else to staff', () => {
  assert.equal(roleFromGroups(['APP-Rostr-Users', 'APP-Rostr-Admins']), 'admin');
  assert.equal(roleFromGroups('APP-Rostr-Admins'), 'admin');
  assert.equal(roleFromGroups('APP-Rostr-Users'), 'staff');
  assert.equal(roleFromGroups(undefined), 'staff');
  assert.equal(roleFromGroups(['app-rostr-admins']), 'staff');
});

test('sign-in upserts by userName, sets lastLogin, keeps the id', () => {
  const db = openDatabase(path.join(tempDir(), 'rostr.sqlite'));
  const profile = {
    nameID: 'ava.nguyen@lanternfieldgoods.co.uk',
    email: 'ava.nguyen@lanternfieldgoods.co.uk',
    firstName: 'Ava',
    lastName: 'Nguyen',
    department: 'Sales',
    groups: 'APP-Rostr-Users',
  };
  const first = signInFromProfile(db, profile, '2026-10-06T04:00:00.000Z');
  assert.equal(first.role, 'staff');
  const id = findUserByUserName(db, profile.nameID).id;

  const second = signInFromProfile(db, { ...profile, department: 'Operations', groups: ['APP-Rostr-Users', 'APP-Rostr-Admins'] }, '2026-10-06T05:00:00.000Z');
  const row = findUserByUserName(db, profile.nameID);
  assert.equal(second.role, 'admin');
  assert.equal(row.id, id);
  assert.equal(row.department, 'Operations');
  assert.equal(row.lastLogin, '2026-10-06T05:00:00.000Z');
  assert.equal(row.active, 1);
  db.close();
});

test('an inactive Rostr user is refused', () => {
  const db = openDatabase(path.join(tempDir(), 'rostr.sqlite'));
  insertUser(db, { id: 'u-1', userName: 'jonah.hale@lanternfieldgoods.co.uk', active: 0 });
  assert.throws(
    () => signInFromProfile(db, { nameID: 'jonah.hale@lanternfieldgoods.co.uk' }),
    /inactive/,
  );
  assert.equal(findUserByUserName(db, 'jonah.hale@lanternfieldgoods.co.uk').lastLogin, null);
  db.close();
});

test('login redirects to Okta, metadata advertises the ACS, bad response is logged with a reason', async () => {
  const dir = tempDir();
  const db = openDatabase(path.join(dir, 'rostr.sqlite'));
  const authLogPath = path.join(dir, 'rostr-auth.jsonl');
  const app = createApp({ db, authLogPath, sessionSecret: 'test-secret', saml: SAML });
  const server = app.listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;

    const login = await fetch(`${base}/saml/login`, { redirect: 'manual' });
    assert.equal(login.status, 302);
    const location = new URL(login.headers.get('location'));
    assert.equal(`${location.origin}${location.pathname}`, 'https://idp.example.com/redirect');
    assert.ok(location.searchParams.get('SAMLRequest'));

    const metadata = await (await fetch(`${base}/saml/metadata`)).text();
    assert.match(metadata, /entityID="https:\/\/rostr\.example\.com\/saml\/metadata"/);
    assert.match(metadata, /WantAssertionsSigned="true"/);
    assert.match(metadata, /Location="https:\/\/rostr\.example\.com\/saml\/acs"/);

    const acs = await fetch(`${base}/saml/acs`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ SAMLResponse: Buffer.from('<not-saml/>').toString('base64') }),
      redirect: 'manual',
    });
    assert.equal(acs.status, 401);
    const logged = JSON.parse(fs.readFileSync(authLogPath, 'utf8').trim());
    assert.equal(logged.protocol, 'saml');
    assert.equal(logged.user, 'unknown');
    assert.equal(logged.outcome, 'failure');
    assert.ok(logged.reason);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    db.close();
  }
});
