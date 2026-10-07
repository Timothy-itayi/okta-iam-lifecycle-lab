# Phase 2 — SaaS onboarding

Previous: [Phase 1 — Okta foundation](01-foundation.md).

## 2.1 Scaffold Rostr

Rostr is an Express app in `rostr/`. It uses `better-sqlite3` and `express-session`. The users table columns are `id`, `userName`, `givenName`, `familyName`, `email`, `department`, `title`, `active`, `lastLogin`, and `licensed`. `id` is text. `userName` is unique.

Routes: `/health` returns the text `OK`, `/me` shows the signed-in attributes or "Not signed in", `/admin/users` lists the table. A sign-in is appended to `logs/rostr-auth.jsonl` as `time`, `protocol`, `user`, and `outcome`. Nothing calls that logger until SAML is added. At this point `/admin/users` was not gated. Task 2.7 is the gate.

`docker compose up` from `rostr/` built the image and started the container. The log says `Rostr listening on 3000`: [evidence/2.1-rostr-listening.png](../../evidence/2.1-rostr-listening.png). Docker Desktop shows `rostr-1` with `3000:3000`: [evidence/2.1-rostr-docker-desktop.png](../../evidence/2.1-rostr-docker-desktop.png).

The MemoryStore warning in that log is the `express-session` default. One process is what this lab runs. It is not a failed start.

The image is Node 22. `better-sqlite3` 13 requires Node 22 or newer. Node 20 installed the module and then the process died with a segfault before it listened.

Compose mounts the repo `logs/` directory and `rostr/data/`. The database file is `rostr/data/rostr.sqlite` inside that directory. `SESSION_SECRET` comes from `rostr/.env` and is not in the image.

An earlier run of this image returned `OK` from `http://127.0.0.1:3000/health`. The two screenshots above show the container listening. They do not show that response body.

## 2.2 HTTPS address

The hostname is `rostr.lanternfieldgoods.co.uk`, not the runbook's `.com`. Tunnel `rostr` was created with id `52a3de6f-81d8-4452-93e5-a550ed263116`: [evidence/2.2-tunnel-created.png](../../evidence/2.2-tunnel-created.png). The CNAME was added: [evidence/2.2-tunnel-dns-cname.png](../../evidence/2.2-tunnel-dns-cname.png).

`~/.cloudflared/config.yml` sends that hostname to `http://localhost:3000`, then `http_status:404` for everything else. `cloudflared tunnel run rostr` registered a connection. `https://rostr.lanternfieldgoods.co.uk/health` returned `OK` with `content-type: text/plain` at 2026-10-06 14:24 +1100.

The credentials file stays outside the repo. The quick-tunnel fallback was not used. The reason is in [docs/decisions/00-domain.md](../decisions/00-domain.md).

A phone opened the public hostname at 14:27 and the page showed `Cannot GET /`: [evidence/2.2-phone-public-root.png](../../evidence/2.2-phone-public-root.png). That is Express's response for `/`. Localhost `/` returns the same text, because Rostr has no route there. `/health` is the route that returns `OK`. The phone reached the Rostr process through the public name.

## 2.3 SAML app

The Okta app is named Rostr. Okta's slug in the SSO URL is `trial-7464750_rostr_1`. The metadata URL is in `rostr/.env` as `OKTA_SAML_METADATA_URL`. It is not repeated here as a secret; the URL is public IdP metadata. The value is `https://trial-7464750.okta.com/app/exk18eddmjojhjW6v698/sso/saml/metadata`.

| Setting | Value |
| --- | --- |
| Single sign-on URL | `https://rostr.lanternfieldgoods.co.uk/saml/acs` |
| Recipient and Destination | Same as the single sign-on URL |
| Audience URI | `https://rostr.lanternfieldgoods.co.uk/saml/metadata` |
| IdP entity ID | `http://www.okta.com/exk18eddmjojhjW6v698` |
| NameID format | `urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress` |
| IdP SSO URL | `https://trial-7464750.okta.com/app/trial-7464750_rostr_1/exk18eddmjojhjW6v698/sso/saml` |
| AuthnRequests signed | false |

The entity ID and the SSO URL are what the metadata document returned. Okta's entity ID uses `http`, not `https`. That is the value to copy, not a typo to correct.

Profile attribute statements, name format Unspecified: [evidence/2.3-saml-attribute-statements.png](../../evidence/2.3-saml-attribute-statements.png).

| Name | Value |
| --- | --- |
| `email` | `user.email` |
| `firstName` | `user.firstName` |
| `lastName` | `user.lastName` |
| `department` | `user.department` |

Group attribute statement: name `groups`, name format Unspecified, filter Starts with `APP-Rostr`.

The Sign On tab, saved, shows the service-provider URLs on the public hostname: [evidence/2.3-saml-acs.png](../../evidence/2.3-saml-acs.png). Single Sign On URL, Recipient URL, and Destination URL are all `https://rostr.lanternfieldgoods.co.uk/saml/acs`. Audience Restriction is `https://rostr.lanternfieldgoods.co.uk/saml/metadata`. Name ID format is EmailAddress. Default Relay State is empty.

An earlier edit used the host `rostr` with no domain. That host does not resolve. The saved view above replaced it.

The same tab shows the IdP values: [evidence/2.3-saml-idp-details.png](../../evidence/2.3-saml-idp-details.png). Sign on URL matches the metadata SSO location. Sign out URL is `https://trial-7464750.okta.com`. Issuer matches the entity ID, including the `http` scheme. The signing certificate stays in Okta. Rostr will read it from the metadata URL, not from a file in this repo.

## 2.4 SAML in Rostr

Rostr uses `@node-saml/passport-saml` 5.1.1 and `passport` 0.7.0. The code is in `rostr/src/saml.js` and `rostr/src/saml-metadata.js`.

At startup Rostr fetches `OKTA_SAML_METADATA_URL` and reads the entry point, the IdP issuer, and the signing certificate from it. If the URL is set and the fetch or parse fails, the process exits. It does not start without SAML. If the URL is not set, Rostr starts and the SAML routes are absent.

| Option | Value | Source |
| --- | --- | --- |
| `entryPoint` | HTTP-Redirect `SingleSignOnService` | Metadata |
| `idpCert` | `X509Certificate` under the signing `KeyDescriptor` | Metadata |
| `callbackUrl` | `ROSTR_BASE_URL` + `/saml/acs` | `rostr/.env` |
| `issuer` and audience | `ROSTR_BASE_URL` + `/saml/metadata` | Same as Okta's Audience URI |
| `wantAssertionsSigned` | true | Runbook |
| `wantAuthnResponseSigned` | true | Library default, set explicitly |
| `acceptedClockSkewMs` | 30000 | Runbook |
| `validateInResponseTo` | `ifPresent` | Rejects a response to a request Rostr did not send |

`callbackUrl` has to be absolute. The runbook's `/saml/acs` is the path. Okta compares the full URL with its Recipient and Destination fields.

The request-ID cache is in memory. If Rostr restarts between `/saml/login` and `/saml/acs`, that one sign-in is rejected and the user signs in again. A sign-in started from the Okta dashboard carries no `InResponseTo`, so `ifPresent` lets it through.

Routes:

- `GET /saml/login` redirects to Okta with a `SAMLRequest`.
- `POST /saml/acs` validates the response. On success it upserts the user, regenerates the session, logs `success`, and redirects to `/me`. Since the leave hub, stretch phase 4 on 8 October, it redirects to `/`, which opens the person's hub. `/me` still exists. [docs/leave/04-staff.md](../leave/04-staff.md).
- `GET /saml/metadata` returns the SP metadata, with `WantAssertionsSigned="true"` and the ACS location.

The upsert is keyed on `userName`, which is the NameID (email). It sets `givenName`, `familyName`, `email`, `department`, and `lastLogin`. A new row gets a random id. A sign-in never changes `id`, `active`, `title`, or `licensed`. Those belong to SCIM. If the row already exists with `active` 0, the sign-in is refused and the failure is logged.

Role is set in the session, not stored in the table. `APP-Rostr-Admins` in the `groups` attribute maps to `admin`. Anything else, including no groups, maps to `staff`. The match is case-sensitive, like the Okta filter.

A failure writes `user: "unknown"`, `outcome: "failure"`, and a `reason`. The user is unknown because nothing in an unverified response can be trusted. Success lines keep the four fields from 2.1.

Checked at 2026-10-06 15:06 +1100 through `https://rostr.lanternfieldgoods.co.uk`, after rebuilding the container. The container log names the IdP `http://www.okta.com/exk18eddmjojhjW6v698`. `/saml/login` returned 302 to the Okta SSO URL with a `SAMLRequest`. `/saml/metadata` showed the entity ID, `WantAssertionsSigned="true"`, and the ACS location. A forged unsigned POST to `/saml/acs` returned 401 and logged `"reason":"Invalid document signature"`. Twelve `node:test` tests pass.

### Assignment

At 14:54 the Assignments tab lists no people: [evidence/2.4-assignments-no-people.png](../../evidence/2.4-assignments-no-people.png). The Assign menu offers people or groups: [evidence/2.4-assign-menu.png](../../evidence/2.4-assign-menu.png). The group dialog shows `APP-Rostr-Users` as Assigned and leaves `APP-Rostr-Admins`, the three `DEPT-` groups, `ADM-Helpdesk`, and `Everyone` unassigned: [evidence/2.4-assigned-app-rostr-users.png](../../evidence/2.4-assigned-app-rostr-users.png).

That matches the group description: `APP-Rostr-Users` is how the app is granted, and the department rule fills that group. A person who is only in `APP-Rostr-Admins` cannot open Rostr. Staff who later get that group are already in `APP-Rostr-Users`, so they can still sign in, and the `groups` claim is what turns the session role into `admin`. That second case has not been signed in yet.

### Jonah Hale

At 15:07 Okta showed "User is not assigned to this application": [evidence/2.4-okta-user-not-assigned.png](../../evidence/2.4-okta-user-not-assigned.png). The page does not name the account. Rostr's log has no line for it, so Okta stopped the sign-in before `/saml/acs`. The daily admin and break-glass are not in `APP-Rostr-Users`, so either of them gets this page.

At 15:11 Jonah Hale reached `/me`: [evidence/2.4-jonah-me.png](../../evidence/2.4-jonah-me.png).

| Field | Value |
| --- | --- |
| userName | `jonah.hale@lanternfieldgoods.co.uk` |
| email | `jonah.hale@lanternfieldgoods.co.uk` |
| givenName | Jonah |
| familyName | Hale |
| department | Sales |
| groups | `APP-Rostr-Users` |
| role | staff |
| lastLogin | `2026-10-06T04:11:23.165Z` |

The log line at `2026-10-06T04:11:23.173Z` is `protocol: saml`, `user: jonah.hale@lanternfieldgoods.co.uk`, `outcome: success`. The SQLite row has the same email, names, department, and `lastLogin`. `title` is empty, `active` is 1, `licensed` is 0, and `id` is a random value Rostr generated. The `groups` claim did not include `APP-Rostr-Admins`, so the role is staff.

Task 2.5, the annotated SAML assertion, is not done.

## 2.6 App sign-in policy

Policy `Rostr`, id `rst18ee9qwjUUSrHZ698`, created 2026-10-06 15:27 +1100. Description: "Make Rostr demand stronger proof for admins than for staff." Rules: [evidence/2.6-rostr-sign-on-policy.png](../../evidence/2.6-rostr-sign-on-policy.png). The Application tab count is 1, and the add-apps dialog shows Rostr as Added: [evidence/2.6-policy-rostr-added.png](../../evidence/2.6-policy-rostr-added.png).

| Priority | Rule | Who | Access | Re-authentication |
| --- | --- | --- | --- | --- |
| 1 | Rostr Admins | `APP-Rostr-Admins` | Allowed with a possession factor. The factor Okta lists is Okta Verify FastPass. Constraints: phishing resistant, require user interaction. | Every sign-in to the app |
| 2 | Rostr Users | `APP-Rostr-Users` | Allowed with password and another factor. The other factor Okta lists is Okta Verify FastPass. Same two constraints. | Password every 2 hours. The other factor every 1 hour |
| 3 | Catch-all Rule | Any request | Denied | |

All three rules are Enabled. A person in both groups matches priority 1.

The runbook asked for Okta Verify as a possession factor for admins, and password plus any factor for staff. Both saved rules add phishing resistance, so Okta is satisfying them with FastPass. Push with a number challenge is what this org has actually enrolled. FastPass has not been enrolled. Jonah Hale's sign-in at 15:11 was before this policy existed.

The seven staff are on the app through the group. At 16:00 `admin@lanternfieldgoods.co.uk` (Timothy itayi) was also assigned as an Individual: [evidence/2.6-admin-individual-assignment.png](../../evidence/2.6-admin-individual-assignment.png). That account is in neither `APP-Rostr-Admins` nor `APP-Rostr-Users`, so it misses rules 1 and 2.

Signing in as that account produced "You do not have permission to perform the requested action": [evidence/2.6-catch-all-admin-denied.png](../../evidence/2.6-catch-all-admin-denied.png). The earlier page, at 15:07, said "User is not assigned to this application." Rostr has no log line for it, so Okta stopped the sign-in before `/saml/acs`.

The System Log row for Timothy itayi at 15:59:44 is a failure, target Rostr. The event type is `app.generic.unauth_app_access_attempt`, displayed as "User attempted unauthorized access to app." It does not name the Rostr policy or the Catch-all Rule. That event type is the one Okta writes when it treats the user as not allowed to open the app. The screenshot of the log contains a source IP, so the image stays out of the repo.

One account is the whole neither-group test. The Individual row for `admin@` was removed after it. The access model is group assignment. The SAML app stays assigned to `APP-Rostr-Users` only.

### Step 6

Jonah Hale signed in again at 16:20 and reached `/me`: [evidence/2.6-jonah-me.png](../../evidence/2.6-jonah-me.png). `groups` is `APP-Rostr-Users`, `role` is staff, `department` is Sales, and `lastLogin` is `2026-10-06T05:20:26.829Z`. The Rostr log at `2026-10-06T05:20:26.837Z` is `protocol: saml`, that user, `outcome: success`. The SQLite row has the same `lastLogin`. This is after the policy existed. The shot is the landing page. It does not show the password prompt or Okta Verify.

Helen Cho at 16:18:31 has a System Log failure, `policy.evaluate_sign_on`, outcome DENY, target Rostr. The rules named on that row are `MFA required`, `Rostr Users`, and `Default Rule`. Helen is Finance staff and in `APP-Rostr-Users`. She is not in `APP-Rostr-Admins`. Rostr has no log line for her, so the deny happened before `/saml/acs`. The same minute has a second row for her whose text is the denial below. The log screenshots contain a source IP and stay out of the repo.

Marcus Bell at 16:26:33 was denied the same way. The actor is Okta System. The event is `application.policy.sign_on.deny_access`, and the outcome column says SUCCESS, which means Okta recorded the denial. The text is "Access has been denied because the policy requirements could not be satisfied by the users' current set of available authenticator enrollments." The targets are Rostr and Marcus Bell. He is Operations staff and in `APP-Rostr-Users`. His enrolled Okta Verify is push with a number challenge. The staff rule asks for a phishing-resistant factor, which this org's list satisfies with FastPass. Rostr has no log line for him either.

During this test `APP-Rostr-Admins` was empty, so the Rostr Admins rule matched nobody. Jonah is the staff sign-in that reached `/me`. Helen and Marcus are staff the policy refused because their enrolled factors did not satisfy it. `admin@` was refused before Rostr. Jonah was added to `APP-Rostr-Admins` later, for task 2.7.

On 8 October the same deny hit Priya Shah. Phishing resistant was cleared on Rostr Users and on Rostr Admins. Both cards then listed Okta Verify push, TOTP, and FastPass as additional factor types. Her next failure was the directory password, which had been reset earlier. The record is [docs/incidents/08-rostr-sign-on.md](../incidents/08-rostr-sign-on.md). The table above is the policy as saved on 6 October.

## 2.7 OIDC app

A second app, `Rostr Admin`, is the OIDC client for `/admin`. It is not the SAML app. Client ID `0oa18egjva6o5FpoP698` is in `rostr/.env` as `OIDC_CLIENT_ID`. The issuer there is `https://trial-7464750.okta.com/oauth2/default`. The client secret is in that same file and is not copied here. Two apps were created with this name. The one that was deleted is recorded in [docs/incidents/00-duplicate-rostr-admin.md](../incidents/00-duplicate-rostr-admin.md).

The kept app is assigned to `APP-Rostr-Admins`: [evidence/2.7-group-assigned-rostr-admin.png](../../evidence/2.7-group-assigned-rostr-admin.png). For the test, Jonah Hale was in that group manually: [evidence/2.7-jonah-in-app-rostr-admins.png](../../evidence/2.7-jonah-in-app-rostr-admins.png). On the app he appeared as type Group: [evidence/2.7-rostr-admin-assignment-group.png](../../evidence/2.7-rostr-admin-assignment-group.png). He was removed after the browser sign-in. The group is empty again. While he was in it, the SAML policy's Rostr Admins rule also applied to him.

The app's sign-on policy is "Any two factors": [evidence/2.7-rostr-admin-any-two-factors.png](../../evidence/2.7-rostr-admin-any-two-factors.png). It is not the SAML policy named Rostr.

On 2026-10-06 the catch-all rule inside "Any two factors" had **Phishing resistant** set. That constraint was removed so the Okta Workflows app could be opened with password and Okta Verify push. **Require user interaction** stayed on, set to any interaction. The catch-all rule cannot be limited to a group, so Rostr Admin, which uses this same policy, no longer demands FastPass either. The SAML policy named Rostr was not changed that day. It was changed on 8 October. [docs/incidents/08-rostr-sign-on.md](../incidents/08-rostr-sign-on.md).

The default authorization server had no access policy for this client. Policy `Rostr Admin` is assigned to the Rostr Admin client. Its rule is named Authorization Code, priority 1, scopes All, Active: [evidence/2.7-access-policy-create.png](../../evidence/2.7-access-policy-create.png), [evidence/2.7-access-policy-rule.png](../../evidence/2.7-access-policy-rule.png). The description field contains the word `policy`.

The `groups` claim on that server is included in the ID token. The filter is Starts with `APP-Rostr`. Token Preview at 17:18 used grant type Authorization Code, user Jonah Hale, and scope `openid`: [evidence/2.7-token-preview-id-token.png](../../evidence/2.7-token-preview-id-token.png).

| Claim | Value |
| --- | --- |
| `iss` | `https://trial-7464750.okta.com/oauth2/default` |
| `aud` | `0oa18egjva6o5FpoP698` |
| `sub` | Jonah Hale's Okta user id |
| `amr` | `pwd` |
| `groups` | `APP-Rostr-Users`, `APP-Rostr-Admins` |

`nonce`, `auth_time`, and `at_hash` in that preview are placeholders. Okta removed the signature from the preview. This is not a browser sign-in.

`openid-client` 5.7.1 does the authorization-code exchange with PKCE. Version 6 is ESM-only, and Rostr is CommonJS. `GET /oidc/login` stores the code verifier in the session and redirects to the default authorization server. `GET /oidc/callback` checks the ID token and redirects to `/me`. The session keeps `iss`, `aud`, `sub`, `exp`, and `groups`. It does not write the users table, because this token has no email or name. `/admin/users` returns 401 with no session and 403 unless `groups` contains `APP-Rostr-Admins`.

### Browser sign-in

Jonah Hale completed that round trip. `/me` at 17:36 shows the ID token claims: [evidence/2.7-oidc-me.png](../../evidence/2.7-oidc-me.png).

| Claim | Value |
| --- | --- |
| `iss` | `https://trial-7464750.okta.com/oauth2/default` |
| `aud` | `0oa18egjva6o5FpoP698` |
| `sub` | `00u18dk3t4h0G1k9I698` |
| `exp` | `1791272149` (`2026-10-06T07:35:49Z`, one hour after the callback) |
| `groups` | `APP-Rostr-Users`, `APP-Rostr-Admins` |

The Rostr log at `2026-10-06T06:35:49.607Z` is `protocol: oidc`, that `sub`, `outcome: success`. Thirty-six seconds earlier, at `2026-10-06T06:35:13.392Z`, the same log has `protocol: oidc`, user `unknown`, `outcome: failure`, reason `No OIDC login in this session`. That is a callback with no verifier stored. The next line is the success.

`/admin/users` at 17:37 rendered the table: [evidence/2.7-oidc-admin-users.png](../../evidence/2.7-oidc-admin-users.png). The only row is Jonah Hale from the SAML sign-in. `lastLogin` is still `2026-10-06T05:20:26.829Z`. The OIDC sign-in did not change it. The page rendered because the session groups include `APP-Rostr-Admins`.

Jonah Hale was removed from `APP-Rostr-Admins` after this sign-in. The group is empty until an access request adds someone. A browser that still has the 17:36 session keeps `APP-Rostr-Admins` in that cookie until the window is closed. The next `/oidc/login` as Jonah has no assignment.

## 2.8 SaaS onboarding runbook

The repeatable procedure is [docs/runbooks/saas-onboarding.md](../runbooks/saas-onboarding.md). It has the intake, the SAML and OIDC configuration tables from this note, the test plan, rollback, and handover.

The runbook marks IdP-initiated SAML as not run. The two test assignments are closed: Jonah Hale is out of `APP-Rostr-Admins`, and the Individual assignment of `admin@` on the SAML app is removed. No business owner has accepted the app. The daily admin still holds the Okta configuration.
