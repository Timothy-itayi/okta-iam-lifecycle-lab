# Phase 3 — SCIM provisioning

Previous: [Phase 2 — SaaS onboarding](02-onboarding.md).

## 3.1 SCIM contract

Read on 2026-10-06:

- Okta, [Build your SCIM API service](https://developer.okta.com/docs/guides/scim-provisioning-integration-prepare/main/).
- Okta, [Okta and SCIM Version 2.0](https://developer.okta.com/docs/api/openapi/okta-scim/guides/scim-20), last updated 2026-09-18. Every request and response below comes from this page unless an RFC section is named.
- Okta Help, [Add SCIM provisioning to app integrations](https://help.okta.com/en-us/content/topics/apps/apps_app_integration_wizard_scim.htm).
- [RFC 7643](https://www.rfc-editor.org/rfc/rfc7643), sections 4.1 (`userName`), 4.2 (Group), 4.3 (enterprise extension), 5 (`ServiceProviderConfig`).
- [RFC 7644](https://www.rfc-editor.org/rfc/rfc7644), sections 3.3, 3.4.1, 3.4.2.2, 3.4.2.4, 3.5.1, 3.5.2, 3.6, 3.12.

### What Okta requires of the server

| Requirement | Rostr |
| --- | --- |
| HTTPS. The base URL cannot contain `_`. Okta suggests `/scim/v2`. | `https://rostr.lanternfieldgoods.co.uk/scim/v2` through the tunnel |
| No anonymous access. HTTP header, Basic, or OAuth 2.0. | Bearer token, `SCIM_TOKEN` in `rostr/.env` |
| Store `userName`, `name.givenName`, `name.familyName`, `emails` | Columns `userName`, `givenName`, `familyName`, `email` |
| `id` issued by the server: unique, stable, never reassigned, case-sensitive, read-only. It cannot contain the string `bulkId`. | `id` is TEXT from `crypto.randomUUID()` |
| `active` can be set to true or false | `active` INTEGER, 1 or 0. SAML sign-in already refuses a row with 0 |

Okta's guide advises against using the email as `userName`, because emails change. This lab uses the email anyway: Okta `login` is the email, the SAML NameID is the email, and the sign-in upsert is keyed on it. The runbook's unique identifier field in 3.4 is `userName`.

### PUT or PATCH

The runbook lists "PATCH with active=false". Okta's reference says that is the behaviour for new OIN integrations. For custom integrations built in the App Integration Wizard, now called the Classic experience, Okta sends every user update as PUT, including activate and deactivate. Group renames and membership changes are PUT for those apps too.

Rostr's SAML app is a custom integration. Task 2.3 did not record whether it was built in the Classic experience or in the newer Okta Integration Wizard. I don't know which verb it will receive. Rostr will accept both on `/Users/{id}` and `/Groups/{id}`. The first deactivation in 3.6 settles it from `logs/scim.jsonl`.

Okta Help says to add SCIM to a SAML or SWA integration built in the Classic experience. For OIDC it is the other way round: SCIM is only supported on OIDC integrations built in the Okta Integration Wizard. If the General tab of Rostr has no SCIM option in 3.4, check which wizard built it before anything else.

### Rules for every response

- `Content-Type: application/scim+json`.
- An error body has `schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"]`, `status` as a string such as `"409"`, an optional `scimType`, and `detail` (RFC 7644 section 3.12).
- A list is a ListResponse: `schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"]`, `totalResults`, `startIndex`, `itemsPerPage`, `Resources`. The three numbers are integers, not strings. Okta says so explicitly.
- `startIndex` is 1-based. A value below 1 is treated as 1. `count=0` returns only `totalResults`. A response never holds more than `count` resources (RFC 7644 section 3.4.2.4).
- Order is stable. The same query returns the same order whatever `startIndex` and `count` are.
- Request bodies are parsed as JSON for both `application/json` and `application/scim+json`. Express's `express.json()` only accepts `application/json` unless it is told otherwise. Before 3.2 Rostr had no JSON body parser. Okta's examples do not show which content type Okta sends.

### Users

| # | Okta sends it when | Request | Rostr returns |
| --- | --- | --- | --- |
| U1 | Create Users is saved under To App | `GET /Users?startIndex=1&count=2` | 200 ListResponse. Okta says these parameters are constant |
| U2 | Import, or a full read | `GET /Users?startIndex=1&count=100`. If `totalResults` is over 100, again with `startIndex=101` | 200 ListResponse, stable order |
| U3 | A user is assigned to the app | `GET /Users?filter=userName eq "{userName}"&startIndex=1&count=100`, URL-encoded | 200 ListResponse with 0 or 1 resource. Okta also accepts 404 for no match. Rostr returns `totalResults: 0` |
| U4 | U3 found nobody | `POST /Users`, body below | 201 with the stored user, including `id` and `meta.resourceType: "User"`. RFC 7644 section 3.3 also requires a `Location` header and `meta.location` |
| U5 | U4 for a `userName` that exists | `POST /Users` | 409, `scimType: "uniqueness"` |
| U6 | Before an update, or to check the user still exists | `GET /Users/{id}` | 200 user. 404 Error for an unknown id |
| U7 | A mapped attribute changes in Okta | `PUT /Users/{id}` with the whole user | 200 with the updated user. 404 for an unknown id: PUT never creates (RFC 7644 section 3.5.1). 409 if the new `userName` belongs to another row |
| U8 | Unassigned from the app, or the Okta user is deactivated | OIN: `PATCH /Users/{id}`, body below. Classic: `PUT /Users/{id}` with `active: false` | 200 with `active: false`, or 204 with no body |
| U9 | Reassigned after deactivation | The same as U8 with `active: true` | 200 with `active: true`, or 204 |
| U10 | Never | `DELETE /Users/{id}` | Not built. Okta does not delete SCIM users |

U4, as Okta sends it:

```json
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "test.user@okta.local",
  "name": { "givenName": "Test", "familyName": "User" },
  "emails": [{ "primary": true, "value": "test.user@okta.local", "type": "work" }],
  "displayName": "Test User",
  "locale": "en-US",
  "externalId": "00ujl29u0le5T6Aj10h7",
  "groups": [],
  "password": "1mz050nq",
  "active": true
}
```

Okta sends `password` even with password sync off. Okta calls it a placeholder. Rostr does not store it and does not write it to `logs/scim.jsonl`. `externalId` is the Okta user id. Rostr has no column for it, and Okta does not need it back. Okta links the account on Rostr's `id`. An empty 201 body fails in Okta with "Create new user returned empty user."

U8 for an OIN integration:

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [{ "op": "replace", "value": { "active": false } }]
}
```

There is no `path`. RFC 7644 section 3.5.2.3 says that a `replace` without a path takes `value` as the attributes to replace. Rostr also accepts `"path": "active"` with `"value": false`, the other form the RFC allows.

### Groups

Group push is configured on the Push Groups tab. Okta changes membership in a pushed group only when the user is in the Okta group, is assigned to the app, and the group is pushed.

| # | Okta sends it when | Request | Rostr returns |
| --- | --- | --- | --- |
| G1 | Create Users is saved with Import Groups ticked | `GET /Groups?startIndex=1&count=100` | 200 ListResponse |
| G2 | A group is pushed | `POST /Groups` with `displayName` and `members: []` | 201 with `id`, `displayName`, `members`, `meta.resourceType: "Group"` |
| G3 | Okta has to update a group whose Rostr id it does not know | `GET /Groups?filter=displayName eq "{name}"&startIndex=1&count=100` | 200 ListResponse with 0 or 1 resource |
| G4 | Checking a pushed group still exists | `GET /Groups/{id}` | 200 with the `members` list. Okta requires members in this response. 404 for an unknown id |
| G5 | The Okta group is renamed. Okta also sends this on every membership update | OIN: `PATCH` with `replace`, no path, value `{ id, displayName }`. Classic: `PUT /Groups/{id}` with `displayName` and the full `members` | 200 with the group, or 204 |
| G6 | A member is added to or removed from the Okta group | OIN: `PATCH` with `remove` at `members[value eq "{id}"]` and `add` at `members` with `[{ value, display }]`. A full push is `replace` at `members`. Classic: `PUT` with the full `members` | 200 with the group, or 204. Okta accepts `members: null` in that body |
| G7 | Push Groups › Unlink pushed group › Delete the group in the target app | `DELETE /Groups/{id}` | 204. Afterwards `GET /Groups/{id}` is 404 and the group is not listed (RFC 7644 section 3.6) |

G6, as Okta sends it:

```json
{
  "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"],
  "Operations": [
    { "op": "remove", "path": "members[value eq \"89bb1940-b905-4575-9e7f-6f887cfb368e\"]" },
    { "op": "add", "path": "members", "value": [{ "value": "23a35c27-23d3-4c03-b4c5-6443c09e7173", "display": "test.user@okta.local" }] }
  ]
}
```

A member `value` is a Rostr user `id`, not an email (RFC 7643 section 4.2).

### ServiceProviderConfig

`GET /ServiceProviderConfig` returns 200 with `schemas: ["urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig"]`. RFC 7643 section 5 requires `patch`, `bulk`, `filter`, `changePassword`, `sort`, `etag`, and `authenticationSchemes`.

| Attribute | Rostr |
| --- | --- |
| `patch.supported` | true |
| `bulk` | `supported` false, `maxOperations` 0, `maxPayloadSize` 0 |
| `filter` | `supported` true, `maxResults` 100 |
| `changePassword`, `sort`, `etag` | `supported` false |
| `authenticationSchemes` | One entry, type `oauthbearertoken` |

Okta's reference does not show Okta calling this endpoint. The runbook asks for it. It stays behind the token like everything else. RFC 7643 says `authenticationSchemes` SHOULD be readable without a token. Okta does not need that.

### Rostr consequences

- **Jonah Hale already has a row.** SAML created `810dde51-dd11-41ac-afda-5400f831d908` at 15:11. When provisioning reaches him, U3 finds that row and Okta links to it. Okta then sends his app profile as an update. He does not get a POST, and he should not get a 409. Keep `rostr/data/rostr.sqlite` before 3.6. That row is the link test.
- **`userName` case.** RFC 7643 section 4.1.1 says `userName` is case-insensitive and unique. The SQLite `UNIQUE` on `userName` uses binary collation, which is case-sensitive. The U3 filter compares without case. U4 and U7 return 409 when the only difference is case. A check in code covers that without rebuilding the table.
- **Who writes which column.** SCIM writes `userName`, `givenName`, `familyName`, `email`, `department`, `title`, and `active`. SAML sign-in still writes `givenName`, `familyName`, `email`, `department`, and `lastLogin` from the assertion. Okta is the source for both, so they should agree. `lastLogin` and `licensed` are not SCIM attributes.
- **Where department and title arrive.** `title` is a core User attribute. `department` is `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User` › `department`. When the extension is present, its URN is listed in `schemas`. Task 3.5 maps both.
- **Groups do not change roles.** The admin role still comes from the SAML `groups` attribute and the OIDC `groups` claim. A pushed group is a row in `groups` and `group_members`. Nothing reads those tables when someone signs in.
- **Logging.** `logs/scim.jsonl` gets the method, path, status, and body for every request and response. The `Authorization` header is replaced. `password` is removed from request bodies.

### Test plan for 3.2 and 3.3

`scripts/scim-tests.sh` runs these with curl against a fresh database, then against the tunnel. Each line has to show the status and the body field named.

| Test | Call | Expect |
| --- | --- | --- |
| A1 | Any `/scim/v2` route, no `Authorization` | 401 Error, `status` `"401"` |
| A2 | Same with a wrong token | 401 |
| S1 | `GET /ServiceProviderConfig` | 200, `patch.supported` true |
| U1 | `GET /Users?startIndex=1&count=2` | 200 ListResponse. `totalResults`, `startIndex`, and `itemsPerPage` are integers |
| U2a | `GET /Users?startIndex=1&count=0` | 200, `totalResults` equals the row count, `Resources` empty |
| U2b | `GET /Users?startIndex=0&count=1` | Same first resource as `startIndex=1` |
| U3a | Filter for a `userName` that is not there | 200, `totalResults` 0 |
| U3b | Filter for an existing `userName` in different case | 200, `totalResults` 1 |
| U3c | `filter=userName co "x"` | 400, `scimType` `invalidFilter` |
| U4 | `POST /Users` with the Okta body above | 201, `id` present, `Location` header, `active` true. No `password` in the response |
| U5a | The same POST again | 409, `scimType` `uniqueness` |
| U5b | The same POST with `userName` in upper case | 409 |
| U6a | `GET /Users/{id}` | 200, same `id` |
| U6b | `GET /Users/does-not-exist` | 404 Error |
| U7a | `PUT /Users/{id}` with a new `title` | 200, new `title` |
| U7b | `PUT /Users/does-not-exist` | 404. No row created |
| U8a | `PATCH /Users/{id}`, replace without path, `active` false | 200 `active` false, or 204. A later GET shows false |
| U8b | `PUT /Users/{id}` with `active` false | 200 `active` false |
| U9 | `PATCH /Users/{id}`, path `active`, value true | 200 `active` true |
| L1 | Read `logs/scim.jsonl` | No token and no `password` value |
| G1 | `GET /Groups?startIndex=1&count=100` | 200 ListResponse |
| G2 | `POST /Groups`, `displayName` `APP-Rostr-Users`, empty members | 201 with `id` |
| G3 | Filter `displayName eq "APP-Rostr-Users"` | 200, `totalResults` 1 |
| G4 | `GET /Groups/{id}` | 200 with `members` |
| G6a | PATCH `add` the U4 user to `members` | 200 or 204. A later GET shows the member |
| G6b | PATCH `remove` with `members[value eq "{id}"]` | The member is gone |
| G6c | PATCH `replace` at `members` with one value | Exactly that member |
| G5a | PATCH `replace` without path, `{ id, displayName }` | The name changes |
| G5b | `PUT /Groups/{id}` with `displayName` and full `members` | 200, members match the body |
| G7 | `DELETE /Groups/{id}`, then GET it and list | 204, then 404, then not listed |

### Not known yet

These are settled from `logs/scim.jsonl` once Okta is connected. They are not guessed here.

- Whether Rostr's integration sends PUT or PATCH for updates, deactivation, and group membership. Task 3.6.
- The `Content-Type` on Okta's request bodies. The connector test sent no body.
- Whether a later save of Create Users, or Force Sync, provisions the seven staff already assigned through `APP-Rostr-Users`. Saving the To App page at 19:45 sent only `GET /Users?startIndex=1&count=2`. It did not create a user.

## 3.2 Users endpoint

The code is `rostr/src/scim.js`, plus the user queries in `rostr/src/db.js`. `createApp` mounts the router at `/scim/v2` before the session middleware, so SCIM calls never get a session cookie.

### Token

`SCIM_TOKEN` is in `rostr/.env`. It was generated with `openssl rand -hex 32`, so it is 64 characters. The value is not printed here, in the test output, or in the log. Startup refuses a token shorter than 32 characters. With no token set, the SCIM routes are absent. Compose requires the variable, the same way it requires the OIDC values.

The check accepts `Authorization: Bearer <token>` only. It compares SHA-256 digests with `crypto.timingSafeEqual`, so a wrong guess takes the same time whatever its length. A missing or wrong token gets 401 with a SCIM Error body and `WWW-Authenticate: Bearer`.

Okta's HTTP Header field shows `Bearer` as a fixed prefix. The value pasted there is the raw token. The successful test logged `authorization` as `Bearer [redacted]`, so Okta adds the scheme.

### Behaviour

| Route | Behaviour |
| --- | --- |
| `GET /ServiceProviderConfig` | PATCH supported. Filter supported, max 100. Bulk, sort, ETag, and change-password are not supported. One `oauthbearertoken` scheme |
| `GET /Users` | `userName eq "…"` only. Attribute and operator in any case. The value matches without regard to case. Any other filter is 400 `invalidFilter`. `startIndex` below 1 is read as 1. `count` is capped at 100. Order is by `id`, which never changes |
| `POST /Users` | 201 with `Location` and `meta.location`. 409 `uniqueness` when the `userName` exists in any case. `active` defaults to true. New rows have `lastLogin` empty and `licensed` 0 |
| `GET /Users/{id}` | 200, or a SCIM 404 |
| `PUT /Users/{id}` | Replaces `userName`, names, email, title, and department. An attribute missing from the body is cleared. `active` is kept when the body leaves it out. 404 for an unknown id: PUT never creates. 409 when the new `userName` belongs to another row |
| `PATCH /Users/{id}` | `add`, `replace`, and `remove`, op in any case. Without a path, `value` is the set of attributes. With a path: `active`, `userName`, `name`, `name.givenName`, `name.familyName`, `emails`, `emails[type eq "work"].value`, `title`, the enterprise extension, or `…enterprise:2.0:User:department`. `active` accepts true, false, or the strings `"True"` and `"False"`. Returns 200 with the user |
| Anything else under `/scim/v2` | SCIM 404, including `DELETE /Users/{id}` |

PATCH errors follow RFC 7644 section 3.5.2. A remove with no path is `noTarget`. Removing `userName` or `active` is `mutability`. A value filter other than `emails[type eq "work"]` is `invalidPath`. A bad `active` is `invalidValue`. An empty or malformed `Operations` array is `invalidSyntax`. Every operation is applied to a copy before anything is written, so a request that fails part-way changes nothing.

An attribute Rostr does not store is dropped, not refused. Its name goes into the log line as `ignored`. On the Okta create body that list is `displayName`, `locale`, `externalId`, `groups`, and `password`. Task 3.5 removes the mappings Rostr does not use, and `ignored` shows which those are.

Clearing omitted attributes on PUT is one of the two choices RFC 7644 section 3.5.1 allows. Okta's PUT is its whole view of the app profile. If Okta's mapping does not send department before 3.5 adds it, a PUT clears it, and the next SAML sign-in writes it back.

### Log

`logs/scim.jsonl` gets one line per request: `time`, `method`, `path` with the query, `userAgent`, `contentType`, `authorization` with the token replaced, `status`, `ms`, `request`, `response`, and `ignored` when it is not empty. `password` in a body or a PATCH operation is replaced with `[redacted]`. `userAgent` and `contentType` are there because 3.1 left them unknown for Okta.

### Tests

`npm test` in `rostr/` passes 32 tests. 16 are new for SCIM. They cover the token, the filter parser, paging, create and conflict, PUT and PATCH, errors, the log redaction, and a SCIM-deactivated user being refused at SAML sign-in.

`scripts/scim-tests.sh` runs the curl tests from the 3.1 plan, U and A and S and L. It reads the token from `rostr/.env`, writes the header to a mode 600 temp file, and passes it with `curl -H @file`. The token is never in a command line. Each run creates one user, `scim-test-<epoch>@example.invalid`, and leaves it inactive.

The evidence run was against a separate Rostr on port 3001 with a throwaway database, not the real roster. The real roster would have kept the test user, and 3.7's reconcile would report it. 23 checks passed and none failed: [evidence/3.2-scim-tests.txt](../../evidence/3.2-scim-tests.txt). The token is not in that file. L1 found 13 log lines for the run and no token or create password in them.

### Public check

The container was rebuilt and logs `SCIM on /scim/v2, log /logs/scim.jsonl`. Checked at 2026-10-06 19:26:51 +1100 through `https://rostr.lanternfieldgoods.co.uk/scim/v2`, with read-only calls only:

| Call | Result |
| --- | --- |
| `GET /Users`, no token | 401, `application/scim+json; charset=utf-8` |
| `GET /ServiceProviderConfig` | 200, `patch.supported` true, `meta.location` on the public host |
| `GET /Users?startIndex=1&count=2` | 200, `totalResults` 1, `jonah.hale@lanternfieldgoods.co.uk`, id `810dde51-dd11-41ac-afda-5400f831d908` |

That id is the SAML row from 2.4. It is the row Okta should link to when provisioning reaches Jonah. The three log lines show `authorization` as `missing` and `Bearer [redacted]`.

Not built in 3.2: Groups (3.3), `/Schemas`, `/ResourceTypes`, sorting, and ETags.

## 3.3 Groups endpoint

`/scim/v2/Groups` is on the same router, behind the same token and the same log. Tables `groups` and `group_members` are created next to `users`. A member `value` is a Rostr user `id`. The `display` returned with a member is that user's `userName`.

| Call | Behaviour |
| --- | --- |
| `GET /Groups` | Same paging as users. `displayName eq` only, matched without regard to case. Any other filter is 400 `invalidFilter` |
| `POST /Groups` | 201 with `id`, `displayName`, `members`, and `Location`. 409 `uniqueness` when that `displayName` already exists in any case. A member who is not a Rostr user is 400 `invalidValue`, and the group is not created |
| `GET /Groups/{id}` | 200 with the `members` list, including when it is empty. 404 for an unknown id |
| `PATCH /Groups/{id}` | `add` and `replace` on `members`. `remove` at `members[value eq "{id}"]`. Removing a user who is not a member succeeds and changes nothing. `replace` with no path and `{ id, displayName }` renames the group and leaves the members. Removing `displayName` is 400 `mutability` |
| `PUT /Groups/{id}` | Replaces `displayName` and the whole member list. This is the Classic-experience form. 404 does not create a group |
| `DELETE /Groups/{id}` | 204 with an empty body. A later GET is 404 and the filter does not list it. Members are deleted with the group |

The RFC does not require `displayName` to be unique. Okta's lookup is `displayName eq`, and two matches would make that lookup ambiguous, so Rostr refuses the second name.

`scripts/scim-tests.sh` now runs G1 through G7 after the user tests. The group name is `APP-Rostr-Users-<epoch>`, not the real `APP-Rostr-Users`, so a run against the live database cannot collide with a later Okta push of that name. The run creates the group, adds the test user, removes that user, replaces the member list, renames the group, puts the original name and member back, and deletes the group.

The evidence run was the same throwaway Rostr on port 3001, not the live roster. 38 checks passed and none failed: [evidence/3.3-scim-tests.txt](../../evidence/3.3-scim-tests.txt). The token is not in that file.

The container was rebuilt. At the public host, `GET /Groups?startIndex=1&count=100` returned `totalResults` 0. No group has been pushed.

Signing in still ignores these tables. Pushing `APP-Rostr-Admins` will not, by itself, let anyone open `/admin/users`.

## 3.4 Connect Okta

General › App Settings › Provisioning is SCIM: [evidence/3.4-provisioning-scim.png](../../evidence/3.4-provisioning-scim.png).

The connection is SCIM 2.0, base URL `https://rostr.lanternfieldgoods.co.uk/scim/v2`, unique identifier `userName`, authentication HTTP Header: [evidence/3.4-scim-connection.png](../../evidence/3.4-scim-connection.png).

| Action | Selected |
| --- | --- |
| Import New Users and Profile Updates | Yes |
| Push New Users | Yes |
| Push Profile Updates | Yes |
| Push Groups | Yes |
| Import Groups | No |

Test Connector Configuration reported "Connector configured successfully": [evidence/3.4-connector-test-passed.png](../../evidence/3.4-connector-test-passed.png). The dialog marks User Import, Import Profile Updates, Create Users, Update User Attributes, and Push Groups with a tick. Import Groups has a cross.

`logs/scim.jsonl` is the record of what Okta sent. User-Agent `Okta SCIM Client 1.0.0`. Every call was `GET /Users?startIndex=1&count=2`. There is no `Content-Type`, because there is no body. Okta did not call `/Groups`, `/ServiceProviderConfig`, `POST`, `PUT`, or `PATCH`.

| Time (UTC) | Status | What it returned |
| --- | --- | --- |
| 2026-10-06T08:41:09.475Z | 401 | Authorization failure |
| 2026-10-06T08:41:34.600Z | 200 | Jonah Hale, id `810dde51-dd11-41ac-afda-5400f831d908` |
| 2026-10-06T08:41:50.436Z | 200 | The same row |

The 401 is a first attempt with a Bearer token Rostr rejected. The 200 at 08:41:34 is the passing test, about seven seconds before the dialog screenshot at 19:41. The ticks for Create Users, Update User Attributes, and Push Groups are on that dialog. Okta did not exercise those operations. The only call that succeeded was the user list. Import Groups has a cross because that action was not selected, and because Okta sent no `/Groups` request. It is not a failed group call.

The 200 body is Jonah's existing SAML row, including `department` Sales. The test did not create a user. Create Users, Update User Attributes, and Deactivate Users on the To App page are task 3.5. They are not this screen.

## 3.5 Provisioning and mappings

To App sends Okta profile values to Rostr. The mapping list at 19:57 is the record. `userName` has no Apply column. Its value is "Configured in Sign On settings". The other rows apply on create and update.

| Okta attribute | SCIM attribute | Direction | When it is sent |
| --- | --- | --- | --- |
| Application username, from the Sign On tab | `userName` | Okta → Rostr | Create and update. The row does not show a separate Apply value |
| `user.firstName` | `name.givenName` | Okta → Rostr | Create and update |
| `user.lastName` | `name.familyName` | Okta → Rostr | Create and update |
| `user.email` | `emails`, primary, type `work` | Okta → Rostr | Create and update |
| `user.title` | `title` | Okta → Rostr | Create and update |
| `user.department` | `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department` | Okta → Rostr | Create and update |

`active` is not a mapping row. Create sends `active: true`. Deactivate Users sends `active: false`.

`department` was opened in the Profile Editor at 19:59. External name `department`. External namespace `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User`. The screen wraps `User` onto the next line. Okta's internal variable is `trial7464750_rostr_1.department`. That name is not sent.

The 19:57 list also showed `userType`, mapped from `user.userType`. That row was removed after the screenshot. Rostr does not store `userType`. The phones, addresses, `displayName`, `locale`, `employeeNumber`, `costCenter`, `organization`, `division`, and `manager` rows from the 19:45 list are not on the 19:57 list either. The mappings that remain are the six in the table.

Saving To App at 19:45 produced one more probe, `GET /Users?startIndex=1&count=2` at `2026-10-06T08:45:47.361Z`, status 200, the same Jonah Hale row. No `POST`, `PUT`, or `PATCH` follows it. Force Sync has not reached Rostr. The seven assigned staff have not been provisioned by this save.

## 3.6 Validate the lifecycle

The pairs are [evidence/03-scim/lifecycle-pairs.md](../../evidence/03-scim/lifecycle-pairs.md). Okta time in the Admin Console is +1100. `logs/scim.jsonl` is UTC. System Log screenshots are not in the repo. The event ids below were copied from them.

Before any of this, at `09:10Z`, Rostr held one user, Jonah Hale's SAML row, and no groups. The log had no `POST`, `PUT`, or `PATCH` from Okta.

### Create, update, deactivate

`test.joiner@lanternfieldgoods.co.uk` was created in the directory and landed in `APP-Rostr-Users` through the group rules. Okta user id `00u18ep2sjmnGT1wk698`. Rostr id `14128da2-800f-4f81-959d-fa08c9d1db15`.

| Action | Okta | Rostr |
| --- | --- | --- |
| Create | System Log row not captured | `09:13:57.688Z` `GET /Users?filter=userName eq "test.joiner@lanternfieldgoods.co.uk"` 200, empty. `09:13:57.937Z` `POST /Users` 201 in 30 ms |
| Title set to Account Executive | System Log row not captured | `09:16:04.758Z` `GET` by id 200, then `09:16:04.973Z` `PUT` 200 in 16 ms. The row's `title` is `Account Executive` |
| Deactivate | `Oct 06 20:18:32`, `user.lifecycle.deactivate` SUCCESS, event id `4f1c0ccf24870fe68372d5584b4dd737`. The next row is `Remove user's application` | `09:18:33.801Z` `GET` by id 200, then `09:18:33.996Z` `PUT` 200 in 10 ms with `"active": false`. The row is kept, `active` 0 |

`20:18:32` +1100 is `09:18:32Z`. The `PUT` is `09:18:33.996Z`. Deactivation in the directory and the push to Rostr are inside two seconds, and they are two Okta events. Only the app removal produces SCIM traffic.

Every write is a `PUT`. There is no `PATCH` from Okta anywhere in this phase. That answers the open question from 3.1: an App Integration Wizard app on the classic path reads the resource and writes it back whole. A server that implemented only `PATCH` would have failed the title change and the deactivation.

The create body carried `externalId` `00u18ep2sjmnGT1wk698`, `groups: []`, and a `password`. Rostr stored none of them. The log lists those three keys as ignored, and the password value is `[redacted]`. `externalId` is how the two logs are tied together. It is the Target id on the System Log row.

`department` is null on the test joiner, and none of their three bodies contains the enterprise extension. The other seven users, below, all carried it. The test joiner's Department value was not on the payload Okta sent. Not re-tested. The user is deactivated.

### The seven staff were not in the Force Sync

Force Sync from the To App tab sent nothing. The Assignments tab said, on each of the seven: "User was assigned this application before Provisioning was enabled and not provisioned in the downstream application. Click Provision User." They were assigned in phase 2, before this app had a SCIM connection. Force Sync updates accounts Okta has already provisioned. It does not create that backlog.

Provision User, clicked at `09:27:00Z`, did. One `GET` filter per person, then:

| Call | userName | title | department |
| --- | --- | --- | --- |
| POST 201 | ava.nguyen@ | Sales Manager | Sales |
| POST 201 | priya.shah@ | Account Executive | Sales |
| PUT 200 | jonah.hale@ | Account Executive | Sales |
| POST 201 | marcus.bell@ | Operations Manager | Operations |
| POST 201 | lena.ortiz@ | Shift Supervisor | Operations |
| POST 201 | helen.cho@ | Finance Manager | Finance |
| POST 201 | samir.adeyemi@ | Accounts Assistant | Finance |

Each body includes `urn:ietf:params:scim:schemas:extension:enterprise:2.0:User`. The `department` mapping from 3.5 works. Jonah was not created a second time. The filter found `810dde51-dd11-41ac-afda-5400f831d908`, the row SAML wrote in 2.4, and the `PUT` wrote title and department onto it. That link is what 3.7 has to reconcile on purpose. Here it happened as a side effect of provisioning someone who had already signed in.

### Group push

Both groups were pushed by name. The Push Groups tab shows both **Active**: [evidence/03-scim/3.6-push-groups.png](../../evidence/03-scim/3.6-push-groups.png).

| Group | System Log | SCIM | Rostr |
| --- | --- | --- | --- |
| `APP-Rostr-Users` | `20:30:04`, `application.provision.group_push.updated` SUCCESS, `gmr18eppKqmoNx85o698`. App group `AGr18eppkqj65d7qD698` | `09:30:03.997Z` filter, empty. `09:30:04.282Z` `POST` 201. `09:30:04.537Z` `GET`. `09:30:04.737Z` `PUT` 200 | `6305f001-33ef-42a8-9e17-0aef8a440ead`, 7 members: the staff above, by the ids from `09:27:01Z` |
| `APP-Rostr-Admins`, first try | `20:30:13`, `application.provision.group.add` FAILURE, `gmr18epsy08FIJnug698` | No line | No row |
| `APP-Rostr-Admins`, retry | `20:35:12`, `application.provision.group_push.updated` SUCCESS, `gmr18epw486tMqyqS698`. App group `AGr18epw4837PQuvb698` | `09:35:11.528Z` filter, empty. `09:35:11.814Z` `POST` 201. `09:35:12.044Z` `GET`. `09:35:12.233Z` `PUT` 200 | `6e95185e-5563-4d6c-9422-bf8723cf269f`, `members` `[]` |

`20:30:04` +1100 is `09:30:04Z`, and the users-group `PUT` is `09:30:04.737Z`. `20:35:12` is `09:35:12Z`, and the admins `PUT` is `09:35:12.233Z`. Groups take the same shape as users. Okta looks up by `displayName`, creates, reads the id back, and `PUT`s the whole group. No `PATCH`.

The admins group is empty because the Okta group is empty. Jonah was removed after 2.7. Okta sent `"members": []` on the `POST` and the `PUT`. Membership for the users group is the proof: seven ids, the same seven Rostr created at `09:27:01Z`.

The `20:30:13` failure is a gateway error, not a Rostr response. The outcome text is `Bad Gateway. Errors reported by remote server: Invalid JSON: Unrecognized token 'error' ... line: 1, column: 6`. A SCIM error from this server starts with `{`. That token is Cloudflare's plain-text page, `error code: 502`, and column 6 is the space after `error`. The container did not restart. A probe at `09:33:54Z` got a normal SCIM 401 from the same host. The retry used the same calls as the users group and succeeded. No code change.

Pushed groups still do not decide who can sign in. `/admin/users` reads the OIDC `groups` claim, not the SCIM `groups` table.

## 3.7 Import and reconcile

Import reads Rostr and compares each account with the Okta directory. The match key is `userName`, the unique identifier set in 3.4. The first import, at `09:39:06Z`, is not this task. The orphan row did not exist yet. Okta reported 7 scanned and 7 confirmed. Rostr had returned 8 resources. The one missing from the count is `test.joiner@lanternfieldgoods.co.uk`, `active: false`.

The orphan was inserted straight into `/data/rostr.sqlite`, not through SCIM. Id `00000000-0000-4000-8000-000000000001`, `userName` `orphan.roster@example.invalid`, title `Former contractor`, `active` 1. It is in neither group. A list at `09:45:03Z` still has 8 resources and no orphan. The list at `09:45:39Z` has 9, and the orphan is one of them, `active: true`.

Import Now then reported 8 scanned, 1 new, 7 unchanged, 0 removed, 0 groups: [evidence/03-scim/3.7-import-scanned.png](../../evidence/03-scim/3.7-import-scanned.png). Eight is the nine in the list without the inactive test joiner. The seven unchanged are the staff. Zero groups is Import Groups left off in 3.4. This import sent `GET /Users` only.

The new row landed on the **NO** filter. Okta's proposed assignment was a new Okta user, same name and email: [evidence/03-scim/3.7-import-no-match.png](../../evidence/03-scim/3.7-import-no-match.png). That proposal was not confirmed. The confirm dialog is 0 Okta users created, 0 existing users assigned, 1 Rostr user ignored: [evidence/03-scim/3.7-import-confirm-ignore.png](../../evidence/03-scim/3.7-import-confirm-ignore.png). Afterwards the row reads "User is IGNORED in Okta": [evidence/03-scim/3.7-import-ignored.png](../../evidence/03-scim/3.7-import-ignored.png).

The Rostr row is still there and still active. Ignore does not delete the app account. It tells Okta not to mint a directory user for it. Linking it to a staff member would have attached a fake account to a real person. Confirming the new user would have spent the spare joiner slot on someone who is not in `hr/employees.json`. The slot is still free. `test.joiner@` is deactivated and does not count.

An orphan matters because deactivation cannot reach an account Okta does not know about. The test joiner is the other direction: Okta deactivated the user and the `PUT` set Rostr `active` to false. This row has no Okta user, so a leaver flow would not touch it, and the person it represents could keep using Rostr if Rostr ever trusted that row for sign-in. Sign-in today still requires an Okta session, so this particular row cannot log in. The audit problem is the same one. The app's account list and the directory have diverged, and the import is the check that shows it.
