# Rostr sign-in denied, then the password was the old one

Previous: [Leaver leaves Rostr active](07-leaver-downstream.md).

Date: 2026-10-08, 02:48–03:04 Sydney. Stretch, after the hub shell. Priya Shah could not open the SAML app Rostr. The widget said she was not allowed in. Two different failures were stacked, and the widget text matched neither of them.

## What we saw

The address was the SAML app, `https://trial-7464750.okta.com/app/trial-7464750_rostr_1/exk18eddmjojhjW6v698/sso/saml?fromHome=true`. That is Rostr, app instance `0oa18eddmjpNG4dNl698`. It is not the OIDC app Rostr Admin.

The browser showed "Unable to sign in. Contact support for assistance", and on an earlier attempt "User is not assigned to this application", with `priya.shah@lanternfieldgoods.co.uk` typed in. Priya is in `APP-Rostr-Users`. That group is what assigns the SAML app.

One System Log row from the same evening was the wrong actor. `app.generic.unauth_app_access_attempt` at `2026-10-07T15:37:32.850Z` is `admin@lanternfieldgoods.co.uk`, authentication step 0, target Rostr. The admin account is not assigned to this app. Typing Priya's email into a widget that still has the admin session does not make the actor Priya. The risk signals on that row (anonymising proxy, new geo) have `threatSuspected` false. They are not the deny.

## Cause

Okta stopped on the first matching rule. Priya matches **Rostr Users**, priority 2 of policy Rostr (`rst18ee9qwjUUSrHZ698`). The catch-all is enabled and denies anyone who misses both group rules. She never reached it. A catch-all deny is the sentence "You do not have permission to perform the requested action", which is what `admin@` got on 6 October when that account was assigned and in neither group.

At 02:48:10 the actor is Priya Shah, `00u18dk3t53VMvEjQ698`. The event is `policy.evaluate_sign_on`, outcome DENY. The targets are Rostr, rule `MFA required` (`0pr18dnt9ebDEo50f698`), rule **Rostr Users** (`rul18eefmdmioDSN6698`), rule `Default Rule` (`0pr18dfq406xs4BDQ698`), and Priya. The same second, Okta System records "Access has been denied because the policy requirements could not be satisfied by the users' current set of available authenticator enrollments." Outcome SUCCESS on that row means Okta stored the denial. Rostr has no log line. Helen Cho and Marcus Bell were denied the same way on 6 October. [docs/phases/02-onboarding.md](../phases/02-onboarding.md).

The Rostr Users rule allowed password plus a possession factor, with **Phishing resistant** set. Okta then lists only Okta Verify FastPass as satisfying the possession half. This org enrolled Okta Verify push with a number challenge. FastPass was not enrolled. `MFA required` and `Default Rule` are the org session rules on the same event. She was already on the dashboard, so those rules had let her in. The failing constraint was Rostr Users.

The card also says "Allow any method that can be used to meet the requirement." That line does not override Phishing resistant. With the constraint on, any method still means FastPass.

## Fix

On **Rostr Users** and **Rostr Admins**, Phishing resistant was cleared. Require user interaction was left on. The catch-all stayed enabled and Denied. After the save, both allow rules list additional factor types Okta Verify push, TOTP, and FastPass. The knowledge half of each card lists Password. The Rostr Admins rule had been possession only. It now shows a password as well. Marcus Bell and Ava Nguyen match that rule first, so leaving it on FastPass would have locked them out after the staff rule was fixed.

The next attempt still failed. At 02:59:02 the event is `user.authentication.auth_via_mfa`, outcome FAILURE, reason `INVALID_CREDENTIALS`, provider `OKTA_CREDENTIAL_PROVIDER` (`0b270e6216f3bfc34033a7892fbfcfc6`). The target is her Password authenticator enrollment `iae4m2a1mk7WyTt5w697`. The policy had moved on to checking the directory password. The password in use was one Okta had already replaced. It was reset again from the Admin Console. The earlier reset is not in this record, and the new password is not written here.

## Check

`https://rostr.lanternfieldgoods.co.uk/me` at 03:04, signed in as Priya. `userName` and `email` are `priya.shah@lanternfieldgoods.co.uk`, `department` is Operations, `groups` is `APP-Rostr-Users`, `role` is staff, `lastLogin` is `2026-10-07T16:04:21.200Z` (03:04 Sydney).

[evidence/leave/priya-me.png](../../evidence/leave/priya-me.png)

The SAML success path still redirects to `/me`. Opening `/` with that session, which is what sends staff to `/leave`, was not captured. Marcus and Helen have not signed in on this policy.

The System Log shots for both failures contain a source IP and stay out of the repo.

## Do this next time

Read the System Log actor and the event type before trusting the widget. "Unable to sign in" covers a missing assignment, a policy deny, and a bad password. `policy.evaluate_sign_on` DENY plus the enrollment sentence is a factor constraint on the rule named in the targets. `user.authentication.auth_via_mfa` with `INVALID_CREDENTIALS` on the Password enrollment is the directory password, including one that was reset earlier. A private window is required when the dashboard session belongs to someone else. The catch-all stays denied. It is not the rule a member of `APP-Rostr-Users` hits.
