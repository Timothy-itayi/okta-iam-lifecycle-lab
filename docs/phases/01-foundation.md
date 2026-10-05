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
