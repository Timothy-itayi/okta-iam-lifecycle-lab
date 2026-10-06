const path = require('path');
const { openDatabase } = require('./src/db');
const { createApp } = require('./src/app');
const { Issuer } = require('openid-client');
const { fetchIdpMetadata } = require('./src/saml-metadata');

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error('SESSION_SECRET is required. Set it in the environment. Do not commit it.');
  process.exit(1);
}

const dbPath = process.env.ROSTR_DB_PATH || path.join(__dirname, 'data', 'rostr.sqlite');
const authLogPath = process.env.ROSTR_AUTH_LOG || path.join(__dirname, '..', 'logs', 'rostr-auth.jsonl');
const port = Number(process.env.PORT || 3000);
const metadataUrl = process.env.OKTA_SAML_METADATA_URL;
const baseUrl = (process.env.ROSTR_BASE_URL || '').replace(/\/+$/, '');

async function loadSaml() {
  if (!metadataUrl) {
    console.warn('OKTA_SAML_METADATA_URL is not set. SAML routes are off.');
    return null;
  }
  if (!baseUrl) {
    throw new Error('ROSTR_BASE_URL is required when OKTA_SAML_METADATA_URL is set');
  }
  const idp = await fetchIdpMetadata(metadataUrl);
  console.log(`SAML IdP ${idp.idpIssuer}, entry point ${idp.entryPoint}`);
  return { baseUrl, ...idp };
}

async function loadOidc() {
  const issuerUrl = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  if (!issuerUrl && !clientId && !clientSecret) {
    console.warn('OIDC env is not set. OIDC routes are off.');
    return null;
  }
  if (!issuerUrl || !clientId || !clientSecret || !baseUrl) {
    throw new Error('OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, and ROSTR_BASE_URL are required together');
  }
  const discovered = await Issuer.discover(issuerUrl);
  const redirectUri = `${baseUrl}/oidc/callback`;
  const client = new discovered.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
    response_types: ['code'],
  });
  console.log(`OIDC issuer ${discovered.issuer}`);
  return { client, redirectUri };
}

Promise.all([loadSaml(), loadOidc()])
  .then(([saml, oidc]) => {
    const db = openDatabase(dbPath);
    const app = createApp({ db, authLogPath, sessionSecret, saml, oidc });
    app.listen(port, '0.0.0.0', () => {
      console.log(`Rostr listening on ${port}`);
    });
  })
  .catch((error) => {
    console.error(`Startup failed: ${error.message}`);
    process.exit(1);
  });
