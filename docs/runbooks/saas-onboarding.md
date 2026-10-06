# SaaS onboarding

Use this to add an application to the Lanternfield Goods org. Fill the intake and finish the tests before calling the app onboarded. Rostr, onboarded on 2026-10-06, is the worked example. Copy the shape of the tables for the next app. Do not copy Rostr's hostnames, app ids, or group prefix into it.

The phase record is [docs/phases/02-onboarding.md](../phases/02-onboarding.md). Naming and assignment rules are in [docs/decisions/02-design.md](../decisions/02-design.md).

Sign staff tests in a private window. A staff sign-in in the admin's browser replaces the admin session.

## Intake

Stop until every row has an answer. The Rostr column is the answer for this app.

| Question | Write this down | Rostr, 2026-10-06 |
| --- | --- | --- |
| Business owner | The person who asked for the app and accepts what it stores. | No owner was named. The daily admin, `admin@lanternfieldgoods.co.uk`, built the Okta apps and still holds them. |
| Data classification | The fields the app will store, and whether any of them are customer or payment data. | Staff directory fields: name, email, department, title, last sign-in. The people are fictional. There is no customer or payment data. The client secret and the SAML signing certificate are secrets. They stay in `rostr/.env` and in Okta. |
| SSO protocol | SAML, OIDC, or both. Which side starts the sign-in. | SAML 2.0 for staff, started at `GET /saml/login`. OIDC authorization code with PKCE for `/admin`, started at `GET /oidc/login`. |
| SCIM | Supported or not. Which attributes the app expects Okta to push. | Not built. Phase 3. Sign-in writes name, email, department, and `lastLogin`. It does not write `title`, `active`, or `licensed`. |
| Licence model | How a seat is granted and how it is taken back. | The `licensed` column stays 0. A sign-in does not grant a seat. A Rostr row is not a licence. |
| Admin roles | The Okta group that is the app admin, and what that group can do inside the app. | `APP-Rostr-Admins`. The SAML session role becomes `admin`. The OIDC session may open `/admin/users`. This is not an Okta admin role. Help Desk Administrator cannot see Applications. |
| Offboarding | What has to happen to the Okta user, the app assignment, and the account inside the app. | Deactivate the Okta user. That stops new SSO. Take the user out of `APP-Rostr-Users` by the department group rule, not by hand. Rostr refuses a later sign-in only when its row has `active` 0. Nothing sets that flag until SCIM exists. |

## Groups

Create `APP-{App}-Users` and `APP-{App}-Admins` before the Okta application exists. For this lab those groups are `APP-Rostr-Users` and `APP-Rostr-Admins`.

Assign the application to `APP-{App}-Users` only. Assign a separate admin client, when the intake calls for one, to `APP-{App}-Admins` only. Leave `Everyone`, the `DEPT-` groups, `ADM-Helpdesk`, and every person unassigned. A person who is only in the admin group cannot open the staff app. Staff who also sit in the admin group still get in through the users group, and the `groups` claim is what raises their session.

The group filter is case-sensitive. `APP-Rostr` matches. `APP-rostr` matches nothing.

Okta does not require application names to be unique. Write down the app id or client id at create time. Two apps named Rostr Admin were created during this onboarding. The one that was deleted is [docs/incidents/00-duplicate-rostr-admin.md](../incidents/00-duplicate-rostr-admin.md). The kept client id is `0oa18egjva6o5FpoP698`.

## SAML application

1. Applications › Create App Integration › SAML 2.0. Name it from the intake.
2. On General, set all three of Single sign-on URL, Recipient, and Destination to the app's ACS URL. Set Audience URI to the app's entity ID. Name ID format EmailAddress. Leave Default Relay State empty.
3. Add profile attribute statements, name format Unspecified. For Rostr: `email` = `user.email`, `firstName` = `user.firstName`, `lastName` = `user.lastName`, `department` = `user.department`. The expression editor is the wrong form for these four.
4. Add a group attribute statement named `groups`, name format Unspecified, filter Starts with the app prefix. Rostr's filter is `APP-Rostr`.
5. Save. On the Sign On tab, copy the Metadata URL. Put it in the app's env as `OKTA_SAML_METADATA_URL`. Do not paste the X.509 certificate into the repository.
6. Assign `APP-{App}-Users`.

The ACS URL has to be absolute, on the public hostname. An earlier Rostr edit used the bare host `rostr`. That host does not resolve.

Rostr reads the metadata at startup. The callback URL it sends is `ROSTR_BASE_URL` + `/saml/acs`. The issuer and audience it sends are `ROSTR_BASE_URL` + `/saml/metadata`. Both must match the values saved in Okta. Assertions and the response are required to be signed. Clock skew is 30 seconds.

## OIDC application

Build this only when the intake says the admin surface is a second client. It is a different Okta application from the SAML app.

1. Applications › Create App Integration › OIDC › Web Application.
2. Choose Okta-generated client ID. A Client ID Metadata Document does not give Rostr a secret to put in env.
3. Grant type Authorization Code. Sign-in redirect URI is the app's callback. Rostr's is `https://rostr.lanternfieldgoods.co.uk/oidc/callback`. Sign-out redirect URI is the app origin with the trailing slash. That sign-out URI was not exercised.
4. Copy the client id and the client secret into env: `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`. The issuer for this org's default authorization server is `OIDC_ISSUER=https://trial-7464750.okta.com/oauth2/default`. The secret is not written into this runbook.
5. Assign `APP-{App}-Admins` only.
6. Set the app sign-on policy to a policy the users can actually satisfy. Rostr Admin uses **Any two factors**. It does not use the SAML policy named Rostr.
7. Security › API › Authorization Servers › default › Access Policies. Add a policy assigned to this client, not to All clients. Add a rule that allows the Authorization Code grant. Rostr's policy is named Rostr Admin. Its rule is Authorization Code, priority 1, scopes All, Active. A client with no access policy fails token requests with "Policy evaluation failed for this request."
8. On the same authorization server, add a `groups` claim. Include it in the ID token. Include in Always. Value type Groups. Filter Starts with the app prefix. Rostr's claim is Starts with `APP-Rostr`, and the browser token contained `groups` when the only scope requested was `openid`.

The default authorization server is shared. A claim set to Always is added to every client of that server. Rostr's claim therefore puts `APP-Rostr*` groups into any other app that uses this server. The next app needs its own claim for its own prefix, and this leak stays until the Rostr claim is narrowed.

Token Preview is not a sign-in. In a preview, `nonce`, `auth_time`, and `at_hash` are placeholders, and Okta strips the signature.

Rostr uses `openid-client` 5.7.1 because version 6 is ESM-only and the app is CommonJS. `GET /oidc/login` stores the PKCE verifier in the session before it redirects. `GET /oidc/callback` checks the ID token and redirects to `/me`. The session keeps `iss`, `aud`, `sub`, `exp`, and `groups`. `/admin/users` is 401 with no session and 403 unless `groups` contains `APP-Rostr-Admins`. After the routes change, rebuild the image from `rostr/` with `docker compose up --build -d`. The image copies source at build time. An env-only change is `docker compose up -d --force-recreate`. Do not pass `-v`. That deletes the database volume.

## App sign-in policy

Read the user's enrolled authenticators before saving a factor constraint. This org has Okta Verify push with a number challenge. FastPass is not enrolled.

Rostr's SAML policy is named Rostr, id `rst18ee9qwjUUSrHZ698`, assigned to the SAML app.

| Priority | Rule | Who | Access | Re-authentication |
| --- | --- | --- | --- | --- |
| 1 | Rostr Admins | `APP-Rostr-Admins` | Possession. Okta lists Okta Verify FastPass. Phishing resistant, user interaction required. | Every sign-in |
| 2 | Rostr Users | `APP-Rostr-Users` | Password and Okta Verify FastPass. Same two constraints. | Password every 2 hours. The other factor every 1 hour |
| 3 | Catch-all Rule | Anyone else | Denied | |

A person in both groups matches priority 1. Both allow rules are stricter than the factors people have enrolled. Helen Cho and Marcus Bell were denied for that reason. For the next app, require a factor this org has enrolled, or expect the same deny.

## Configuration record

SAML app Rostr. Metadata URL `https://trial-7464750.okta.com/app/exk18eddmjojhjW6v698/sso/saml/metadata`. App instance id from the System Log: `0oa18eddmjpNG4dNI698`.

| Setting | Value |
| --- | --- |
| Single sign-on URL | `https://rostr.lanternfieldgoods.co.uk/saml/acs` |
| Recipient and Destination | Same as the single sign-on URL |
| Audience URI | `https://rostr.lanternfieldgoods.co.uk/saml/metadata` |
| Name ID | EmailAddress (`urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress`) |
| Default Relay State | Empty |
| IdP entity ID | `http://www.okta.com/exk18eddmjojhjW6v698` |
| IdP SSO URL | `https://trial-7464750.okta.com/app/trial-7464750_rostr_1/exk18eddmjojhjW6v698/sso/saml` |
| IdP sign-out URL | `https://trial-7464750.okta.com` |
| AuthnRequests signed | false |
| Attribute statements | `email`, `firstName`, `lastName`, `department`, name format Unspecified |
| Group statement | `groups` Starts with `APP-Rostr` |
| Assignment | `APP-Rostr-Users` only |

The entity ID uses `http`. That is the metadata value. Proof: [evidence/2.3-saml-acs.png](../../evidence/2.3-saml-acs.png), [evidence/2.3-saml-idp-details.png](../../evidence/2.3-saml-idp-details.png), [evidence/2.3-saml-attribute-statements.png](../../evidence/2.3-saml-attribute-statements.png).

OIDC app Rostr Admin. Client id `0oa18egjva6o5FpoP698`. Default authorization server id `aus18dfq4mbAXRkin698`.

| Setting | Value |
| --- | --- |
| Issuer | `https://trial-7464750.okta.com/oauth2/default` |
| Sign-in redirect | `https://rostr.lanternfieldgoods.co.uk/oidc/callback` |
| Grant | Authorization code, PKCE `S256`, scope `openid` |
| Sign-on policy | Any two factors |
| Authorization-server policy | Rostr Admin, this client only. Rule Authorization Code, scopes All |
| `groups` claim | ID token, Always, Starts with `APP-Rostr` |
| Assignment | `APP-Rostr-Admins` only |

The sign-in redirect is proven by the callback that reached `/me`. Proof: [evidence/2.7-oidc-me.png](../../evidence/2.7-oidc-me.png), [evidence/2.7-token-preview-id-token.png](../../evidence/2.7-token-preview-id-token.png), [evidence/2.7-access-policy-rule.png](../../evidence/2.7-access-policy-rule.png).

## Test plan

Run these in a private window. A pass is a Rostr log line plus the page below, or an Okta denial with no Rostr log line. System Log screenshots that contain a source IP stay out of the repo.

| Test | Do this | Pass | Rostr result |
| --- | --- | --- | --- |
| SP-initiated SAML | As a member of `APP-Rostr-Users` only, open `https://rostr.lanternfieldgoods.co.uk/saml/login`. | `/me` shows the email, department, `groups` of `APP-Rostr-Users`, role staff. The log is `protocol: saml`, that email, `outcome: success`. | Passed. Jonah Hale at 15:11, log `2026-10-06T04:11:23.173Z`, and again at 16:20, log `2026-10-06T05:20:26.837Z`. The 16:20 shot is the landing page. It does not show the factor prompt. |
| IdP-initiated SAML | From the Okta dashboard, open the Rostr chiclet. | `/me` as above. The log has no `InResponseTo` failure. | Not run. The SP accepts a response that has no `InResponseTo`. Task 2.5, the annotated assertion, is also not done. |
| Policy allow | Same user as the SP-initiated test, after the app sign-in policy exists. | Okta completes sign-in and Rostr logs success. | Jonah at 16:20 reached `/me` after the policy existed. The prompt itself was not captured. |
| Policy deny, neither group | One account that is in neither app group. Assign that account as an Individual for the test, sign in, then remove the Individual row. | Okta shows "You do not have permission to perform the requested action." Rostr has no log line. The earlier page, before assignment, is "User is not assigned to this application." | Passed for `admin@` at 16:00. The System Log at 15:59:44 is `app.generic.unauth_app_access_attempt`. That event does not name the Catch-all Rule. The Individual row was removed after the test. |
| Policy deny, factor | A user in `APP-Rostr-Users` whose enrolled factors cannot meet the rule. | System Log `policy.evaluate_sign_on` DENY, or `application.policy.sign_on.deny_access`. On that second event, outcome SUCCESS means Okta recorded the denial. Rostr has no log line. | Helen Cho at 16:18:31. Marcus Bell at 16:26:33. Both have Okta Verify push. The rule asks for FastPass. |
| OIDC claim check | Put the tester in `APP-Rostr-Admins`. Open `https://rostr.lanternfieldgoods.co.uk/oidc/login`. | `/me` shows `iss`, `aud` equal to the client id, `sub`, `exp`, and `groups` containing `APP-Rostr-Admins`. The log is `protocol: oidc`, the `sub`, `outcome: success`. `/admin/users` then renders. | Passed. `/me` at 17:36, `/admin/users` at 17:37. `sub` `00u18dk3t4h0G1k9I698`. `aud` `0oa18egjva6o5FpoP698`. Log `2026-10-06T06:35:49.607Z`. `exp` `1791272149` is one hour later. The users-table `lastLogin` stayed `2026-10-06T05:20:26.829Z`. |
| Admin gate | Call `/admin/users` with no session, then with a staff session that lacks `APP-Rostr-Admins`. | 401, then 403. | Not run in a browser. The unit tests cover both. |

A callback with no PKCE verifier in the session logs `protocol: oidc`, user `unknown`, reason `No OIDC login in this session`, and the browser gets "Sign-in failed." One such line is at `2026-10-06T06:35:13.392Z`, thirty-six seconds before Jonah's success. Start again from `/oidc/login` in the same browser. Do not bookmark the callback.

## Rollback

Do this to take the integration down. Do not delete the `APP-` groups. Department rules and later access requests still use them.

1. On the SAML app, unassign `APP-Rostr-Users`. On the OIDC app, unassign `APP-Rostr-Admins`.
2. Remove any Individual assignment left from the neither-group test.
3. Remove the person who was added to `APP-Rostr-Admins` only for the OIDC test.
4. Deactivate each application. Leave it in the catalog. Deleting it discards the client id and the metadata URL, and the SP configuration in env stops matching anything you can turn back on.
5. Confirm a staff user no longer gets a new success line in `logs/rostr-auth.jsonl`.
6. Clear `OKTA_SAML_METADATA_URL` and the `OIDC_*` values only if the app is staying down. Recreate the container without `-v`.

Deactivate is reversible. Delete is the step that makes the metadata URL and the client id useless.

## Handover

| Item | Rostr now |
| --- | --- |
| Business owner | None named. Do not hand the Okta application to the help desk. Helen Cho cannot open Applications. |
| Okta configuration | Daily admin, `admin@lanternfieldgoods.co.uk`. |
| Break-glass | Not an owner. That account stays signed out except for recovery. |
| What the owner gets | This runbook, the configuration tables above, and the duplicate-app incident. |
| What stays out of the handover | Client secret, SAML certificate, session secret, source IPs. |

Handover is finished when a named business owner has accepted the intake answers and the daily admin is still the only person who can change the Okta app. That acceptance has not happened for Rostr.

## Close the Rostr test

Jonah Hale is out of `APP-Rostr-Admins`. The group is empty until an access request adds someone for one hour. The Individual assignment of `admin@` on the SAML app is removed. The app is assigned to `APP-Rostr-Users` only.

IdP-initiated SAML has not been signed in. A second app does not inherit that gap.
