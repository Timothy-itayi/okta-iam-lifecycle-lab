# MFA reset

Use this when a staff member has a new phone and cannot get past Okta Verify. The practised case is Jonah Hale, reset by Helen Cho on 2026-10-06.

## Symptoms

The user still knows their password, or has just set a new one, and Okta Verify on the old phone is gone. Sign-in stops on **Set up security methods** and will not continue until Okta Verify is enrolled again. Push to the old phone does not arrive.

## Identity check

Do this before resetting anything. The request has to come from the person, not from an email sent from the account being reset.

This HR file has no phone number, so there is nothing to call back. Confirm the fields that are in `hr/employees.json` and do not accept substitutes the caller just invented:

| Check | Jonah Hale |
| --- | --- |
| Employee id | `EMP-1002` |
| Email on the account | `jonah.hale@lanternfieldgoods.co.uk` |
| Department | Sales |
| Title | Account Executive |
| Manager | Ava Nguyen, `EMP-1001` |
| Start date | 2024-01-08 |

If a later HR record has a phone number, call that number back. Do not call a number the person gives you during the request.

## Steps

1. Sign in as the help desk technician. Helen Cho is that account. She can act on users in the three `DEPT-` groups.
2. Directory › People › the user.
3. Reset Authenticators. Select Okta Verify. Confirm.
4. Tell the user to sign in again in a private window and enroll Okta Verify on the new phone. Stay on the call until the enrollment finishes.

## Verify

The user reaches the Okta Dashboard. A push after enrollment shows a number challenge.

In Reports › System Log, search `user.mfa.factor.deactivate` and filter on the target user, not the actor. The reset is performed by the technician, so a search for events where the staff member is the actor does not show it. The export for Jonah Hale is [evidence/1.7-jonah-factor-reset.csv](../../evidence/1.7-jonah-factor-reset.csv).

| Time (+11) | Who | What |
| --- | --- | --- |
| 03:46 | Helen Cho | Reset Jonah Hale's Okta Verify push, signed nonce, and soft token, and removed the previous device |
| 04:01 | Jonah Hale | Sign-in stopped on enrollment |
| 04:06 | Jonah Hale | Activated Okta Verify push on the new phone |
| 04:07 | Jonah Hale | Approved the push and signed in to the Okta Dashboard |

Screenshots: [evidence/1.7-jonah-verify-required.png](../../evidence/1.7-jonah-verify-required.png), [evidence/1.7-jonah-factors-after-reenroll.png](../../evidence/1.7-jonah-factors-after-reenroll.png), [evidence/1.7-jonah-dashboard-after-reenroll.png](../../evidence/1.7-jonah-dashboard-after-reenroll.png).

## Escalate

Hand the ticket to the daily admin when any of these are true:

- The user is not in a `DEPT-` group the technician can administer.
- `user.mfa.factor.deactivate` is missing after the reset.
- The user still cannot enroll, or the new push never arrives.
- The request looks like a takeover: the caller cannot answer the HR checks, or they want every factor removed including the password. Do not enroll a new factor. The daily admin decides whether to deactivate the account. Break-glass is not the routine path for this ticket.
