# Phase 1 — Okta foundation

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

Password Security is [evidence/1.4-password-security.png](../../evidence/1.4-password-security.png). Lockout is 10 attempts and does not clear itself after 60 minutes. History is 4, not the runbook's 5. Minimum length 12 was not on that screen. "Expire the password after this many days: 0" expires a breached password. It is not the length rule.

At 02:58 the Email authenticator is set to **Recovery in password policy rules**. Screenshot: [evidence/1.4-email-recovery-only.png](../../evidence/1.4-email-recovery-only.png). The earlier shot, with Authentication and recovery selected, is [evidence/1.4-email-authenticator.png](../../evidence/1.4-email-authenticator.png). The account-management policy stays exempt, so an admin can still recover. Lena's sign-in after that change still offers only Okta Verify code, Okta Verify push, and password: [evidence/1.4-lena-factors-after-email-change.png](../../evidence/1.4-lena-factors-after-email-change.png).

Minimum length is 12. The Password Security screen shows history of the last 4 passwords and lockout after 10 attempts.
