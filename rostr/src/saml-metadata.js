const { DOMParser } = require('@xmldom/xmldom');

const MD = 'urn:oasis:names:tc:SAML:2.0:metadata';
const DS = 'http://www.w3.org/2000/09/xmldsig#';
const REDIRECT = 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect';

function parseIdpMetadata(xml) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const entity = doc.getElementsByTagNameNS(MD, 'EntityDescriptor')[0];
  if (!entity) {
    throw new Error('IdP metadata has no EntityDescriptor');
  }
  const idp = entity.getElementsByTagNameNS(MD, 'IDPSSODescriptor')[0];
  if (!idp) {
    throw new Error('IdP metadata has no IDPSSODescriptor');
  }

  const sso = Array.from(idp.getElementsByTagNameNS(MD, 'SingleSignOnService'))
    .find((node) => node.getAttribute('Binding') === REDIRECT);
  if (!sso || !sso.getAttribute('Location')) {
    throw new Error('IdP metadata has no HTTP-Redirect SingleSignOnService');
  }

  const certs = Array.from(idp.getElementsByTagNameNS(MD, 'KeyDescriptor'))
    .filter((node) => !node.getAttribute('use') || node.getAttribute('use') === 'signing')
    .flatMap((node) => Array.from(node.getElementsByTagNameNS(DS, 'X509Certificate')))
    .map((node) => node.textContent.replace(/\s+/g, ''))
    .filter(Boolean);
  if (certs.length === 0) {
    throw new Error('IdP metadata has no signing certificate');
  }

  return {
    idpIssuer: entity.getAttribute('entityID'),
    entryPoint: sso.getAttribute('Location'),
    idpCert: certs,
  };
}

async function fetchIdpMetadata(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    throw new Error(`IdP metadata fetch returned HTTP ${response.status}`);
  }
  return parseIdpMetadata(await response.text());
}

module.exports = { parseIdpMetadata, fetchIdpMetadata };
