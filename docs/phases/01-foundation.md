# Phase 1 — Okta foundation

Previous: [Service identity](../decisions/scripts-identity.md).

## 1.1 Profile attributes

Checked 2026-10-06 in Directory › Profile Editor › User (default). The profile is the Okta user type, variable `user`. The Profile Editor view was not saved into `evidence/`.

`title`, `employeeNumber`, `department`, and `managerId` are present. All four are Base, type string. They were not added again. The `manager` attribute is also present and is not used. `managerId` holds the HR id, such as `EMP-1001`.

| HR field | Okta attribute |
| --- | --- |
| `employeeId` | `employeeNumber` |
| `firstName` | `firstName` |
| `lastName` | `lastName` |
| `email` | `email` |
| `department` | `department` |
| `title` | `title` |
| `managerId` | `managerId` |
| `status` | `employmentStatus` |
| `startDate` | `startDate` |
| `endDate` | `endDate` |

`login` is not an HR field. Task 1.2 sets it to the same value as `email`.

The last three were added as Custom string attributes. The full profile is [evidence/1.1-profile-editor-user.png](../../evidence/1.1-profile-editor-user.png). The first custom-attribute shot is [evidence/1.1-custom-attributes.png](../../evidence/1.1-custom-attributes.png).

| Display name | Variable name stored |
| --- | --- |
| Employment status | `employmentStatus` |
| Start date | `startDate` |
| End date | `endDate` |

Checked again at 2026-10-06 01:58. `endDate` now matches the HR field. Screenshot: [evidence/1.1-enddate-variable.png](../../evidence/1.1-enddate-variable.png). Every HR field has an Okta attribute. Do not use the variable name `status`.

## 1.2 Initial staff load

Imported `hr/okta-import.csv` at 2026-10-06 02:00. Okta reported 7 new users, 0 updated, 0 unchanged, 0 errors. Screenshot: [evidence/1.2-csv-import-result.png](../../evidence/1.2-csv-import-result.png).

The org widget says 9 of 10 active users at 02:03:25. Screenshot: [evidence/1.2-user-count-9-of-10.png](../../evidence/1.2-user-count-9-of-10.png). That is the two admins plus these seven. One slot remains.

At 02:00 the seven were Pending user action. By 02:15 all seven, plus both admins, are Active. People list: [evidence/1.2-people-all-active.png](../../evidence/1.2-people-all-active.png). The earlier pending list is [evidence/1.2-people-list.png](../../evidence/1.2-people-list.png).

Jonah Hale signed in to the end-user dashboard at 02:09. My Apps is empty, which is correct: no app is assigned until Phase 2. Screenshot: [evidence/1.2-jonah-hale-dashboard.png](../../evidence/1.2-jonah-hale-dashboard.png).

Login, email, and title match the HR file:

| Person | Login | Title |
| --- | --- | --- |
| Ava Nguyen | `ava.nguyen@lanternfieldgoods.co.uk` | Sales Manager |
| Jonah Hale | `jonah.hale@lanternfieldgoods.co.uk` | Account Executive |
| Priya Shah | `priya.shah@lanternfieldgoods.co.uk` | Account Executive |
| Marcus Bell | `marcus.bell@lanternfieldgoods.co.uk` | Operations Manager |
| Lena Ortiz | `lena.ortiz@lanternfieldgoods.co.uk` | Shift Supervisor |
| Helen Cho | `helen.cho@lanternfieldgoods.co.uk` | Finance Manager |
| Samir Adeyemi | `samir.adeyemi@lanternfieldgoods.co.uk` | Accounts Assistant |

The profile shots stop at title. `department`, `employeeNumber`, and `managerId` are not in the saved images. Login, email, title, and Active status are. One user slot remains.

## 1.3 Groups and group rules

Created 2026-10-06. Group list: [evidence/1.3-groups.png](../../evidence/1.3-groups.png). Rules: [evidence/1.3-group-rules.png](../../evidence/1.3-group-rules.png).

| Group | People | How it is filled |
| --- | --- | --- |
| `DEPT-Sales` | 3 | Rule Dept Sales: `user.department` equals `Sales`. Active. |
| `DEPT-Operations` | 2 | Rule Dept Operations: `user.department` equals `Operations`. Active. |
| `DEPT-Finance` | 2 | Rule Dept Finance: `user.department` equals `Finance`. Active. |
| `APP-Rostr-Users` | 7 | Rule: `isMemberOfGroupNameStartsWith("DEPT-")`, then assign `APP-Rostr-Users`. Active. |
| `APP-Rostr-Admins` | 0 | Empty until an approved access request. |
| `ADM-Helpdesk` | 0 | Empty until task 1.6. |

The counts match the HR file: Sales 3, Operations 2, Finance 2, and all 7 staff in `APP-Rostr-Users`. The two admins are in neither, which is correct. They have no department. `Everyone` shows 9, the two admins plus the seven staff. Member names inside each `DEPT-` group were not captured. The counts and the active rules are the record.

## 1.4 Authenticators

Lena Ortiz signed in at 2026-10-06 02:50 and got an Okta Verify number challenge. The browser showed 75. The phone asked her to pick 97, 88, or 75. Screenshots: [evidence/1.4-lena-number-challenge.png](../../evidence/1.4-lena-number-challenge.png), [evidence/1.4-lena-verify-prompt.png](../../evidence/1.4-lena-verify-prompt.png).

The factor list for that sign-in was Okta Verify code, Okta Verify push, and password. SMS and voice were not offered. Screenshot: [evidence/1.4-lena-factor-options.png](../../evidence/1.4-lena-factor-options.png).

Password Security is [evidence/1.4-password-security.png](../../evidence/1.4-password-security.png). Lockout is 10 attempts and does not clear itself after 60 minutes. History on that screen is the last 4 passwords. Minimum length is 12. "Expire the password after this many days: 0" expires a breached password. It is not the length rule.

At 02:58 the Email authenticator is set to **Recovery in password policy rules**. Screenshot: [evidence/1.4-email-recovery-only.png](../../evidence/1.4-email-recovery-only.png). The earlier shot, with Authentication and recovery selected, is [evidence/1.4-email-authenticator.png](../../evidence/1.4-email-authenticator.png). The account-management policy stays exempt, so an admin can still recover. Lena's sign-in after that change still offers only Okta Verify code, Okta Verify push, and password: [evidence/1.4-lena-factors-after-email-change.png](../../evidence/1.4-lena-factors-after-email-change.png).

Minimum length is 12. The Password Security screen shows history of the last 4 passwords and lockout after 10 attempts.

## 1.5 Global session policy

Both policies are Active. Admins is priority 1. Staff is priority 2. Default Policy is priority 3. Screenshots: [evidence/1.5-admins-session-policy.png](../../evidence/1.5-admins-session-policy.png), [evidence/1.5-staff-session-policy.png](../../evidence/1.5-staff-session-policy.png).

| Policy | Assigned to | Rule |
| --- | --- | --- |
| Admins | `ADM-Helpdesk`, `APP-Rostr-Admins` | MFA required. Active. |
| Staff | `DEPT-Sales`, `DEPT-Operations`, `DEPT-Finance` | MFA required. Active. |

The daily admin and break-glass are not in those groups, so they still match the Default Policy. `APP-Rostr-Admins` is on the Admins policy, so a future Rostr admin gets the shorter admin session.

Marcus Bell, in `DEPT-Operations`, signed in with username, password, then an Okta Verify push. The browser showed 41. Screenshots: [evidence/1.5-marcus-username.png](../../evidence/1.5-marcus-username.png), [evidence/1.5-marcus-password.png](../../evidence/1.5-marcus-password.png), [evidence/1.5-marcus-factors.png](../../evidence/1.5-marcus-factors.png), [evidence/1.5-marcus-number-challenge.png](../../evidence/1.5-marcus-number-challenge.png). The admin sign-in also required MFA.

### Why these numbers

A Lanternfield shift is about 8 to 10 hours. Staff get a 12-hour session so one shift, plus handover, does not force a new sign-in in the middle of the floor. The idle timeout is 2 hours: long enough for a break away from the terminal, short enough that a terminal left after close does not stay open overnight. MFA is still required at the start of that session. A long session does not mean password only.

Admins get a 2-hour session and a 30-minute idle timeout. An admin session can change users, groups, and policies, so a stolen or unattended console should die quickly. Thirty minutes is stepping away from the desk, not a lunch break. MFA is required because a password alone is not enough for that console.

Admins sits above Staff. The help desk technician will be in a `DEPT-` group and in `ADM-Helpdesk`. Priority sends that person through the shorter admin session, not the 12-hour staff session.

## 1.6 Help desk admin

Helen Cho is the technician. She is a Help Desk Administrator, scoped to `DEPT-Sales`, `DEPT-Operations`, and `DEPT-Finance`, not the whole org. Administrators list: [evidence/1.6-administrators.png](../../evidence/1.6-administrators.png). Timothy Itayi and break-glass remain Super Administrators. Scope: [evidence/1.6-help-desk-scoped-to-dept-groups.png](../../evidence/1.6-help-desk-scoped-to-dept-groups.png). Assignment: [evidence/1.6-helen-help-desk-assignment.png](../../evidence/1.6-helen-help-desk-assignment.png).

Signed in as Helen, Jonah Hale's profile shows **Reset or Remove password**: [evidence/1.6-helen-jonah-profile.png](../../evidence/1.6-helen-jonah-profile.png). Her admin nav shows Dashboard, Directory, and Settings. Applications and Security are not in that nav.

Jonah's reset mail arrived at 03:34. The template names Timothy Itayi. The System Log actor for `user.account.reset_password` at that time is Helen Cho. See [docs/runbooks/mfa-reset.md](../runbooks/mfa-reset.md). Mail screenshot: [evidence/1.6-jonah-reset-email.png](../../evidence/1.6-jonah-reset-email.png). The reset dialog sent the email and signed him out: [evidence/1.6-reset-password-dialog.png](../../evidence/1.6-reset-password-dialog.png). Helen's view then shows one-time password mode: [evidence/1.6-helen-jonah-password-reset-state.png](../../evidence/1.6-helen-jonah-password-reset-state.png).

Jonah set a new password. The page required 12 characters, a lower and upper case letter, a number, no part of the username, and not one of the last 4 passwords: [evidence/1.6-jonah-new-password.png](../../evidence/1.6-jonah-new-password.png). He then got Okta Verify number 72: [evidence/1.6-jonah-number-72.png](../../evidence/1.6-jonah-number-72.png). The mail to `jonah.hale@lanternfieldgoods.co.uk` arrived, so the catch-all delivered a staff address.

## 1.7 MFA reset

Scenario: Jonah Hale has a new phone and cannot pass Okta Verify. Helen Cho reset the factor at 03:46. Jonah was stopped on enrollment at 04:01, activated Okta Verify push again at 04:06, and signed in to the Dashboard at 04:07. The runbook is [docs/runbooks/mfa-reset.md](../runbooks/mfa-reset.md). The System Log rows are [evidence/1.7-jonah-factor-reset.csv](../../evidence/1.7-jonah-factor-reset.csv).

The log UI did not show the reset while the search treated Jonah as the actor. The event is `user.mfa.factor.deactivate`, and the actor is Helen. A target-user export contains it. The enrollment QR and the device PIN are not stored.

## 1.8 Entra to Okta

| Entra | Okta |
| --- | --- |
| Dynamic group | Group rule |
| Conditional Access | Authentication policies and global session policies |
| Helpdesk Administrator | Help Desk Administrator |
| Microsoft Graph | Okta Management API |
| Enterprise app | App integration |
| Sign-in logs | System Log |

These are the objects already in this org.

A group rule is the Okta object that fills a group from a profile value. Dept Sales, Dept Operations, and Dept Finance assign `DEPT-Sales`, `DEPT-Operations`, and `DEPT-Finance` when `user.department` equals that name. `APP-Rostr-Users` is filled from membership of any `DEPT-` group. See section 1.3.

Conditional Access is one policy in Entra. Okta splits it. Global session policies Admins and Staff set the session length and the idle timeout. The factor challenge is an authentication policy. Jonah Hale's sign-in hit both: global session policy rule "MFA required", then Okta Verify. See section 1.5.

Help Desk Administrator is the Okta role Helen Cho holds. It is constrained to the three `DEPT-` groups, so she can reset a password and an authenticator for those users and cannot open Applications or Security. See section 1.6.

The Okta Management API is the HTTP API under `/api/v1`. Helen's authenticator reset is `user.mfa.factor.deactivate` against `/api/v1/users/{userId}/authenticatorEnrollments/{enrollmentId}`. See section 1.7.

An app integration is the Okta application object. This phase did not assign one to staff. Jonah's Dashboard is empty. Rostr is Phase 2.

System Log is the Okta record of sign-ins and of admin actions. Helen's factor reset is in it, and it is not a sign-in. The event type is `user.mfa.factor.deactivate`. See section 1.7.
