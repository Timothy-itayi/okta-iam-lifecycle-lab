# 02 — Break-glass account

Previous: [01 — Okta org](01-org.md).

Decision date: 2026-10-06

## Why it exists

The daily admin is `admin@lanternfieldgoods.co.uk`. If a policy or a lost factor locks that account out, this org needs a second Super Administrator that was created before any policy exists. That account is the way back in. It is not a daily login.

## Account

| Item | Value |
| --- | --- |
| Name in Directory | break glass |
| Username | `breakglass@lanternfieldgoods.co.uk` |
| Primary email | `breakglass@lanternfieldgoods.co.uk` |
| Status | Active |
| Role assigned | Super Organization Administrator |

The runbook asked for first name Break and last name Glass. Directory shows `break glass`. The username is correct, so this is not worth recreating the user.

People list, 2 of 2, both Active: [evidence/0.5-people-admin-and-breakglass.png](../../evidence/0.5-people-admin-and-breakglass.png).

The role form shows Super Administrator for the entire org: [evidence/0.5-breakglass-super-admin-role.png](../../evidence/0.5-breakglass-super-admin-role.png). Okta saved it. The org change log, seen while signed in as break-glass, says "Grant user privilege: break glass, Role Assigned, Super Organization Administrator" at 2026-10-06 01:05:38 +1100, actor Timothy itayi. That is Okta's current name for the org-wide super admin role.

Break-glass reached its own Admin Console: [evidence/0.5-breakglass-admin-console.png](../../evidence/0.5-breakglass-admin-console.png). The header shows `break glass` on `lanternfieldgoods-co-trial-7464750`. The Security › Administrators list page was not captured. The org log is the record that the role was saved.

## Password

The password is not in this repo and must not be added. It belongs in the password manager, 30 or more characters, with "user must change password" left off. The screenshots do not show the password settings.

## Authenticator

Break-glass reached the Okta Verify enrollment prompt on first sign-in: [evidence/0.5-breakglass-verify-setup.png](../../evidence/0.5-breakglass-verify-setup.png).

The same phone now holds two Okta Verify accounts for `trial-7464750.okta.com`: `admin@lanternfieldgoods.co.uk` and `breakglass@lanternfieldgoods.co.uk`. Screenshot: [evidence/0.5-okta-verify-both-admins.png](../../evidence/0.5-okta-verify-both-admins.png).

That satisfies "a second Okta Verify account" on paper. It fails the point of the account. One lost or wiped phone locks both admins out of Verify. A security key on the break-glass account, kept somewhere other than that phone, is the factor that still works when the phone is gone.

## User slot

Directory shows two people: the daily admin and break-glass. That is 2 of the 10 active-user slots. The "of 10" widget was last seen at 1 of 10 before this account existed. Seven staff plus one joiner slot are still in the budget, so five slots remain after those seven are loaded (2 admins + 7 staff = 9, one spare).

## Still open

- Confirm the password is in the password manager and that Okta will not force a change on next login.
- The left nav of the break-glass session says Free Trial Plan. See [01-org.md](01-org.md).
