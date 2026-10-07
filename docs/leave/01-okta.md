# Leave hub — 1. Okta groups and the TypeSafe key

Date: 2026-10-08, about 01:38–02:11 Sydney. Stretch phase 1. The main lab is unchanged. No leave screens exist yet.

Decisions: [jev-01-leave-workflow.md](../decisions/jev-01-leave-workflow.md), [jev-02-decision-model.md](../decisions/jev-02-decision-model.md).

## 1.0 `APP-Rostr-HR`

The group was created on 8 October and the Rostr app was assigned to it. The Applications tab shows Rostr on that group.

[evidence/leave/app-rostr-hr-rostr-assigned.png](../../evidence/leave/app-rostr-hr-rostr-assigned.png)

The Push Groups tab is not in this set of shots. Whether Okta has pushed `APP-Rostr-HR` into Rostr is not recorded here.

## 1.1 Groups claim

The `groups` claim on the default authorization server is unchanged. The value is `groups: starts with APP-Rostr`, included in the ID token, Always. `APP-Rostr-HR` matches that filter because the name starts with `APP-Rostr`. No second claim was added.

[evidence/leave/groups-claim.png](../../evidence/leave/groups-claim.png)

## 1.2 Members, by hand

Access Requests in Okta Identity Governance are not on this trial. These memberships were assigned in the Admin Console.

| Group | Assigned on this screen |
| --- | --- |
| `APP-Rostr-Admins` | Marcus Bell, Ava Nguyen. Both Active, Managed Manually |
| `APP-Rostr-HR` | Helen Cho. Active, Managed Manually |

[evidence/leave/app-rostr-admins-members.png](../../evidence/leave/app-rostr-admins-members.png)

[evidence/leave/app-rostr-hr-helen.png](../../evidence/leave/app-rostr-hr-helen.png)

Priya, Jonah, and Lena stay in `APP-Rostr-Users` through the department rules. They were not added to the admin or HR groups on these screens.

## 1.3 TypeSafe key

`TYPESAFE_API_KEY` is set in `rostr/.env`. The value is 108 characters. It is not printed here. The name, with an empty value, is already in `rostr/.env.example`.

## Sign-in check

`/me` as Priya Shah shows `APP-Rostr-Users`. [docs/incidents/08-rostr-sign-on.md](../incidents/08-rostr-sign-on.md).

`/me` as Marcus Bell at 03:11 shows `APP-Rostr-Users, APP-Rostr-Admins`, department Operations, role admin, `lastLogin` `2026-10-07T16:11:13.471Z`. [evidence/leave/marcus-me.png](../../evidence/leave/marcus-me.png).

`/me` as Helen Cho at 03:12 shows `APP-Rostr-Users, APP-Rostr-HR`, department Finance, `lastLogin` `2026-10-07T16:12:37.768Z`. [evidence/leave/helen-me.png](../../evidence/leave/helen-me.png). The `role` line on that page says staff. `roleFromGroups` in `rostr/src/saml.js` only returns admin or staff. It was written before `APP-Rostr-HR` existed. The hub does not use that string. `roleOf` sees `APP-Rostr-HR` and sends her to `/hr/leave`.
