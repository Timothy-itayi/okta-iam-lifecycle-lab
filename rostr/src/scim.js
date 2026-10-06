const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const {
  findUserById,
  findUserByUserNameAnyCase,
  countUsers,
  pageUsers,
  createProvisionedUser,
  updateProvisionedUser,
  findGroupById,
  findGroupByDisplayName,
  countGroups,
  pageGroups,
  groupMembers,
  insertGroup,
  replaceGroup,
  deleteGroup,
} = require('./db');

const SCHEMA = {
  user: 'urn:ietf:params:scim:schemas:core:2.0:User',
  enterprise: 'urn:ietf:params:scim:schemas:extension:enterprise:2.0:User',
  list: 'urn:ietf:params:scim:api:messages:2.0:ListResponse',
  patchOp: 'urn:ietf:params:scim:api:messages:2.0:PatchOp',
  error: 'urn:ietf:params:scim:api:messages:2.0:Error',
  group: 'urn:ietf:params:scim:schemas:core:2.0:Group',
  config: 'urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig',
};
const MAX_RESULTS = 100;
const DEPARTMENT_PATH = `${SCHEMA.enterprise}:department`.toLowerCase();
const STRUCTURAL = new Set(['schemas', 'id', 'meta']);
const RESOURCE_KEYS = new Set(['userName', 'name', 'emails', 'title', 'active', SCHEMA.enterprise]);

class ScimError extends Error {
  constructor(status, detail, scimType) {
    super(detail);
    this.status = status;
    this.scimType = scimType;
  }
}

function send(res, status, body) {
  res.locals.scimBody = body;
  res.status(status).type('application/scim+json').send(JSON.stringify(body));
}

function sendError(res, error) {
  const body = { schemas: [SCHEMA.error], status: String(error.status), detail: error.message };
  if (error.scimType) {
    body.scimType = error.scimType;
  }
  send(res, error.status, body);
}

function redactAuthorization(header) {
  if (!header) return 'missing';
  const parts = header.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} [redacted]` : '[redacted]';
}

function withoutPassword(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const copy = { ...body };
  if ('password' in copy) copy.password = '[redacted]';
  if (Array.isArray(copy.Operations)) {
    copy.Operations = copy.Operations.map((op) => {
      if (!op || typeof op !== 'object') return op;
      const next = { ...op };
      if (typeof next.path === 'string' && next.path.trim().toLowerCase() === 'password') {
        next.value = '[redacted]';
      } else if (next.value && typeof next.value === 'object' && 'password' in next.value) {
        next.value = { ...next.value, password: '[redacted]' };
      }
      return next;
    });
  }
  return copy;
}

function scimLogger(logPath) {
  return (req, res, next) => {
    const started = Date.now();
    res.locals.scimIgnored = new Set();
    res.on('finish', () => {
      const entry = {
        time: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        userAgent: req.get('user-agent') || null,
        contentType: req.get('content-type') || null,
        authorization: redactAuthorization(req.get('authorization')),
        status: res.statusCode,
        ms: Date.now() - started,
      };
      if (req.body !== undefined) entry.request = withoutPassword(req.body);
      if (res.locals.scimBody !== undefined) entry.response = res.locals.scimBody;
      if (res.locals.scimIgnored.size) entry.ignored = [...res.locals.scimIgnored];
      try {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`);
      } catch (error) {
        console.error(`SCIM log write failed: ${error.message}`);
      }
    });
    next();
  };
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function bearerAuth(token) {
  const expected = sha256(token);
  return (req, res, next) => {
    const match = /^Bearer\s+(\S+)\s*$/i.exec(req.get('authorization') || '');
    if (!match || !crypto.timingSafeEqual(sha256(match[1]), expected)) {
      res.set('WWW-Authenticate', 'Bearer');
      return sendError(res, new ScimError(401, 'Authorization failure'));
    }
    next();
  };
}

function parseActive(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string' && /^(true|false)$/i.test(value)) return value.toLowerCase() === 'true';
  throw new ScimError(400, 'active must be true or false', 'invalidValue');
}

function optionalText(value, name) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ScimError(400, `${name} must be a string`, 'invalidValue');
  return value;
}

function requiredUserName(value) {
  const userName = typeof value === 'string' ? value.trim() : '';
  if (!userName) throw new ScimError(400, 'userName is required', 'invalidValue');
  return userName;
}

function primaryEmail(emails) {
  if (emails === undefined || emails === null) return null;
  if (!Array.isArray(emails)) throw new ScimError(400, 'emails must be an array', 'invalidValue');
  const chosen = emails.find((email) => email && email.primary === true) || emails[0];
  return chosen ? optionalText(chosen.value, 'emails.value') : null;
}

function objectOrEmpty(value, name) {
  if (value === undefined || value === null) return {};
  if (typeof value !== 'object' || Array.isArray(value)) throw new ScimError(400, `${name} must be an object`, 'invalidValue');
  return value;
}

function fromResource(body, ignored = new Set()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ScimError(400, 'Body must be a JSON object', 'invalidSyntax');
  }
  const name = objectOrEmpty(body.name, 'name');
  const enterprise = objectOrEmpty(body[SCHEMA.enterprise], SCHEMA.enterprise);
  for (const key of Object.keys(body)) {
    if (!RESOURCE_KEYS.has(key) && !STRUCTURAL.has(key)) ignored.add(key);
  }
  for (const key of Object.keys(name)) {
    if (key !== 'givenName' && key !== 'familyName') ignored.add(`name.${key}`);
  }
  for (const key of Object.keys(enterprise)) {
    if (key !== 'department') ignored.add(`${SCHEMA.enterprise}:${key}`);
  }
  return {
    userName: requiredUserName(body.userName),
    givenName: optionalText(name.givenName, 'name.givenName'),
    familyName: optionalText(name.familyName, 'name.familyName'),
    email: primaryEmail(body.emails),
    title: optionalText(body.title, 'title'),
    department: optionalText(enterprise.department, 'department'),
    active: body.active === undefined ? undefined : parseActive(body.active),
  };
}

function toResource(row, base) {
  const resource = {
    schemas: row.department ? [SCHEMA.user, SCHEMA.enterprise] : [SCHEMA.user],
    id: row.id,
    userName: row.userName,
    name: {},
    emails: row.email ? [{ value: row.email, type: 'work', primary: true }] : [],
    active: Boolean(row.active),
    meta: { resourceType: 'User', location: `${base}/Users/${row.id}` },
  };
  if (row.givenName) resource.name.givenName = row.givenName;
  if (row.familyName) resource.name.familyName = row.familyName;
  if (row.title) resource.title = row.title;
  if (row.department) resource[SCHEMA.enterprise] = { department: row.department };
  return resource;
}

function setAttribute(user, rawPath, value, ignored) {
  const key = rawPath.trim().toLowerCase();
  if (STRUCTURAL.has(key)) return;
  switch (key) {
    case 'active':
      user.active = parseActive(value);
      return;
    case 'username':
      user.userName = requiredUserName(value);
      return;
    case 'name': {
      const name = objectOrEmpty(value, 'name');
      for (const [sub, subValue] of Object.entries(name)) setAttribute(user, `name.${sub}`, subValue, ignored);
      return;
    }
    case 'name.givenname':
      user.givenName = optionalText(value, 'name.givenName');
      return;
    case 'name.familyname':
      user.familyName = optionalText(value, 'name.familyName');
      return;
    case 'emails':
      user.email = primaryEmail(value);
      return;
    case 'emails[type eq "work"].value':
      user.email = optionalText(value, 'emails.value');
      return;
    case 'title':
      user.title = optionalText(value, 'title');
      return;
    case SCHEMA.enterprise.toLowerCase(): {
      const enterprise = objectOrEmpty(value, SCHEMA.enterprise);
      for (const [sub, subValue] of Object.entries(enterprise)) setAttribute(user, `${SCHEMA.enterprise}:${sub}`, subValue, ignored);
      return;
    }
    case DEPARTMENT_PATH:
      user.department = optionalText(value, 'department');
      return;
    default:
      if (key.includes('[')) throw new ScimError(400, `Unsupported path ${rawPath}`, 'invalidPath');
      ignored.add(rawPath.trim());
  }
}

function removeAttribute(user, rawPath, ignored) {
  const key = rawPath.trim().toLowerCase();
  if (key === 'username' || key === 'active') {
    throw new ScimError(400, `${rawPath} cannot be removed`, 'mutability');
  }
  if (key === 'name') {
    user.givenName = null;
    user.familyName = null;
  } else if (key === SCHEMA.enterprise.toLowerCase()) {
    user.department = null;
  } else {
    setAttribute(user, rawPath, null, ignored);
  }
}

function applyPatch(row, body, ignored = new Set()) {
  if (!body || !Array.isArray(body.Operations) || body.Operations.length === 0) {
    throw new ScimError(400, 'PATCH needs a non-empty Operations array', 'invalidSyntax');
  }
  const user = {
    userName: row.userName,
    givenName: row.givenName,
    familyName: row.familyName,
    email: row.email,
    title: row.title,
    department: row.department,
    active: Boolean(row.active),
  };
  for (const operation of body.Operations) {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
      throw new ScimError(400, 'Each operation must be an object', 'invalidSyntax');
    }
    const op = typeof operation.op === 'string' ? operation.op.toLowerCase() : '';
    const opPath = typeof operation.path === 'string' && operation.path.trim() ? operation.path : null;
    if (op === 'add' || op === 'replace') {
      if (opPath) {
        setAttribute(user, opPath, operation.value, ignored);
      } else {
        const value = objectOrEmpty(operation.value, 'value');
        for (const [attribute, attributeValue] of Object.entries(value)) setAttribute(user, attribute, attributeValue, ignored);
      }
    } else if (op === 'remove') {
      if (!opPath) throw new ScimError(400, 'remove needs a path', 'noTarget');
      removeAttribute(user, opPath, ignored);
    } else {
      throw new ScimError(400, `Unsupported op ${operation.op}`, 'invalidSyntax');
    }
  }
  return user;
}

function parseEqFilter(filter, attribute) {
  const match = typeof filter === 'string' ? /^\s*(\S+)\s+(\S+)\s+"((?:[^"\\]|\\.)*)"\s*$/.exec(filter) : null;
  if (!match || match[1].toLowerCase() !== attribute.toLowerCase() || match[2].toLowerCase() !== 'eq') {
    throw new ScimError(400, `Only ${attribute} eq "value" is supported`, 'invalidFilter');
  }
  return match[3].replace(/\\(.)/g, '$1');
}

function parseFilter(filter) {
  return parseEqFilter(filter, 'userName');
}

function requiredDisplayName(value) {
  const displayName = typeof value === 'string' ? value.trim() : '';
  if (!displayName) throw new ScimError(400, 'displayName is required', 'invalidValue');
  return displayName;
}

function memberIds(value) {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  const ids = [];
  for (const item of list) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || typeof item.value !== 'string' || !item.value.trim()) {
      throw new ScimError(400, 'A member needs a value that is a Rostr user id', 'invalidValue');
    }
    ids.push(item.value.trim());
  }
  return [...new Set(ids)];
}

function assertMembersExist(db, ids) {
  for (const id of ids) {
    if (!findUserById(db, id)) throw new ScimError(400, `Member ${id} is not a Rostr user`, 'invalidValue');
  }
}

function assertUniqueGroup(db, displayName, id) {
  const existing = findGroupByDisplayName(db, displayName);
  if (existing && existing.id !== id) {
    throw new ScimError(409, `Group ${displayName} already exists`, 'uniqueness');
  }
}

function memberValueFilter(rawPath) {
  const match = /^members\[value\s+eq\s+"((?:[^"\\]|\\.)*)"\]$/i.exec(rawPath.trim());
  return match ? match[1].replace(/\\(.)/g, '$1') : null;
}

function toGroup(row, members, base) {
  return {
    schemas: [SCHEMA.group],
    id: row.id,
    displayName: row.displayName,
    members: members.map((member) => ({ value: member.value, display: member.display })),
    meta: { resourceType: 'Group', location: `${base}/Groups/${row.id}` },
  };
}

function groupResource(db, row, base) {
  return toGroup(row, groupMembers(db, row.id), base);
}

function fromGroup(body, ignored = new Set()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ScimError(400, 'Body must be a JSON object', 'invalidSyntax');
  }
  for (const key of Object.keys(body)) {
    if (key !== 'displayName' && key !== 'members' && !STRUCTURAL.has(key)) ignored.add(key);
  }
  return {
    displayName: requiredDisplayName(body.displayName),
    members: memberIds(body.members),
  };
}

function applyGroupPatch(state, body, ignored = new Set()) {
  if (!body || !Array.isArray(body.Operations) || body.Operations.length === 0) {
    throw new ScimError(400, 'PATCH needs a non-empty Operations array', 'invalidSyntax');
  }
  const next = { displayName: state.displayName, members: [...state.members] };
  for (const operation of body.Operations) {
    if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
      throw new ScimError(400, 'Each operation must be an object', 'invalidSyntax');
    }
    const op = typeof operation.op === 'string' ? operation.op.toLowerCase() : '';
    const opPath = typeof operation.path === 'string' && operation.path.trim() ? operation.path : null;
    if (op === 'add' || op === 'replace') {
      if (opPath) applyGroupPath(next, op, opPath, operation.value, ignored);
      else applyGroupValue(next, op, objectOrEmpty(operation.value, 'value'), ignored);
    } else if (op === 'remove') {
      if (!opPath) throw new ScimError(400, 'remove needs a path', 'noTarget');
      removeGroupPath(next, opPath);
    } else {
      throw new ScimError(400, `Unsupported op ${operation.op}`, 'invalidSyntax');
    }
  }
  return next;
}

function applyGroupValue(state, op, value, ignored) {
  for (const [attribute, attributeValue] of Object.entries(value)) {
    applyGroupPath(state, op, attribute, attributeValue, ignored);
  }
}

function applyGroupPath(state, op, rawPath, value, ignored) {
  const key = rawPath.trim().toLowerCase();
  if (STRUCTURAL.has(key)) return;
  if (key === 'displayname') {
    state.displayName = requiredDisplayName(value);
    return;
  }
  if (key === 'members') {
    const ids = memberIds(value);
    state.members = op === 'add' ? [...new Set([...state.members, ...ids])] : ids;
    return;
  }
  if (key.includes('[')) throw new ScimError(400, `Unsupported path ${rawPath}`, 'invalidPath');
  ignored.add(rawPath.trim());
}

function removeGroupPath(state, rawPath) {
  const key = rawPath.trim().toLowerCase();
  if (key === 'displayname') throw new ScimError(400, 'displayName cannot be removed', 'mutability');
  if (key === 'members') {
    state.members = [];
    return;
  }
  const memberId = memberValueFilter(rawPath);
  if (memberId !== null) {
    state.members = state.members.filter((id) => id !== memberId);
    return;
  }
  if (key.includes('[')) throw new ScimError(400, `Unsupported path ${rawPath}`, 'invalidPath');
  throw new ScimError(400, `Cannot remove ${rawPath}`, 'noTarget');
}

function saveNewGroup(db, input) {
  assertUniqueGroup(db, input.displayName, null);
  assertMembersExist(db, input.members);
  return insertGroup(db, input);
}

function saveExistingGroup(db, id, input) {
  assertUniqueGroup(db, input.displayName, id);
  assertMembersExist(db, input.members);
  return replaceGroup(db, id, input);
}

function integer(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function assertUnique(db, userName, id) {
  const existing = findUserByUserNameAnyCase(db, userName);
  if (existing && existing.id !== id) {
    throw new ScimError(409, `User ${userName} already exists`, 'uniqueness');
  }
}

function serviceProviderConfig(base) {
  return {
    schemas: [SCHEMA.config],
    patch: { supported: true },
    bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
    filter: { supported: true, maxResults: MAX_RESULTS },
    changePassword: { supported: false },
    sort: { supported: false },
    etag: { supported: false },
    authenticationSchemes: [{
      type: 'oauthbearertoken',
      name: 'OAuth Bearer Token',
      description: 'Authorization: Bearer with the token from SCIM_TOKEN',
    }],
    meta: { resourceType: 'ServiceProviderConfig', location: `${base}/ServiceProviderConfig` },
  };
}

function createScimRouter({ db, token, logPath, baseUrl }) {
  if (!token) {
    throw new Error('SCIM needs a token');
  }
  const router = express.Router();
  const base = (req) => baseUrl || `${req.protocol}://${req.get('host')}${req.baseUrl}`;

  router.use(scimLogger(logPath));
  router.use(bearerAuth(token));
  router.use(express.json({ type: ['application/json', 'application/scim+json'], limit: '256kb' }));

  router.get('/ServiceProviderConfig', (req, res) => {
    send(res, 200, serviceProviderConfig(base(req)));
  });

  router.get('/Users', (req, res) => {
    const startIndex = Math.max(integer(req.query.startIndex, 1), 1);
    const count = Math.min(Math.max(integer(req.query.count, MAX_RESULTS), 0), MAX_RESULTS);
    let total;
    let rows;
    if (req.query.filter !== undefined) {
      const match = findUserByUserNameAnyCase(db, parseFilter(req.query.filter));
      const matches = match ? [match] : [];
      total = matches.length;
      rows = matches.slice(startIndex - 1, startIndex - 1 + count);
    } else {
      total = countUsers(db);
      rows = count === 0 ? [] : pageUsers(db, startIndex - 1, count);
    }
    send(res, 200, {
      schemas: [SCHEMA.list],
      totalResults: total,
      startIndex,
      itemsPerPage: rows.length,
      Resources: rows.map((row) => toResource(row, base(req))),
    });
  });

  router.post('/Users', (req, res) => {
    const input = fromResource(req.body, res.locals.scimIgnored);
    assertUnique(db, input.userName, null);
    const row = createProvisionedUser(db, { ...input, active: input.active ?? true });
    const resource = toResource(row, base(req));
    res.location(resource.meta.location);
    send(res, 201, resource);
  });

  router.get('/Users/:id', (req, res) => {
    const row = findUserById(db, req.params.id);
    if (!row) throw new ScimError(404, `User ${req.params.id} not found`);
    send(res, 200, toResource(row, base(req)));
  });

  router.put('/Users/:id', (req, res) => {
    const existing = findUserById(db, req.params.id);
    if (!existing) throw new ScimError(404, `User ${req.params.id} not found`);
    const input = fromResource(req.body, res.locals.scimIgnored);
    assertUnique(db, input.userName, existing.id);
    const row = updateProvisionedUser(db, existing.id, { ...input, active: input.active ?? Boolean(existing.active) });
    send(res, 200, toResource(row, base(req)));
  });

  router.patch('/Users/:id', (req, res) => {
    const existing = findUserById(db, req.params.id);
    if (!existing) throw new ScimError(404, `User ${req.params.id} not found`);
    const user = applyPatch(existing, req.body, res.locals.scimIgnored);
    assertUnique(db, user.userName, existing.id);
    const row = updateProvisionedUser(db, existing.id, user);
    send(res, 200, toResource(row, base(req)));
  });

  router.get('/Groups', (req, res) => {
    const startIndex = Math.max(integer(req.query.startIndex, 1), 1);
    const count = Math.min(Math.max(integer(req.query.count, MAX_RESULTS), 0), MAX_RESULTS);
    let total;
    let rows;
    if (req.query.filter !== undefined) {
      const match = findGroupByDisplayName(db, parseEqFilter(req.query.filter, 'displayName'));
      const matches = match ? [match] : [];
      total = matches.length;
      rows = matches.slice(startIndex - 1, startIndex - 1 + count);
    } else {
      total = countGroups(db);
      rows = count === 0 ? [] : pageGroups(db, startIndex - 1, count);
    }
    send(res, 200, {
      schemas: [SCHEMA.list],
      totalResults: total,
      startIndex,
      itemsPerPage: rows.length,
      Resources: rows.map((row) => groupResource(db, row, base(req))),
    });
  });

  router.post('/Groups', (req, res) => {
    const row = saveNewGroup(db, fromGroup(req.body, res.locals.scimIgnored));
    const resource = groupResource(db, row, base(req));
    res.location(resource.meta.location);
    send(res, 201, resource);
  });

  router.get('/Groups/:id', (req, res) => {
    const row = findGroupById(db, req.params.id);
    if (!row) throw new ScimError(404, `Group ${req.params.id} not found`);
    send(res, 200, groupResource(db, row, base(req)));
  });

  router.put('/Groups/:id', (req, res) => {
    if (!findGroupById(db, req.params.id)) throw new ScimError(404, `Group ${req.params.id} not found`);
    const row = saveExistingGroup(db, req.params.id, fromGroup(req.body, res.locals.scimIgnored));
    send(res, 200, groupResource(db, row, base(req)));
  });

  router.patch('/Groups/:id', (req, res) => {
    const existing = findGroupById(db, req.params.id);
    if (!existing) throw new ScimError(404, `Group ${req.params.id} not found`);
    const state = {
      displayName: existing.displayName,
      members: groupMembers(db, existing.id).map((member) => member.value),
    };
    const row = saveExistingGroup(db, existing.id, applyGroupPatch(state, req.body, res.locals.scimIgnored));
    send(res, 200, groupResource(db, row, base(req)));
  });

  router.delete('/Groups/:id', (req, res) => {
    if (!deleteGroup(db, req.params.id)) throw new ScimError(404, `Group ${req.params.id} not found`);
    res.status(204).end();
  });

  router.use((req, res) => {
    sendError(res, new ScimError(404, `No SCIM resource at ${req.method} ${req.path}`));
  });

  router.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ScimError) return sendError(res, error);
    if (error.type === 'entity.parse.failed') return sendError(res, new ScimError(400, 'Body is not valid JSON', 'invalidSyntax'));
    if (error.type === 'entity.too.large') return sendError(res, new ScimError(413, 'Body is too large'));
    console.error(`SCIM error: ${error.stack || error.message}`);
    sendError(res, new ScimError(500, 'Internal error'));
  });

  return router;
}

module.exports = { createScimRouter, parseFilter, parseEqFilter, applyPatch, fromResource, toResource, redactAuthorization, withoutPassword, SCHEMA };
