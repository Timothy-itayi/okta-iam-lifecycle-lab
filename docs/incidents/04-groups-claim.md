# Missing groups claim

Previous: [OIDC redirect URI mismatch](03-oidc-redirect.md).

Date: 2026-10-07, 17:20–17:34 Sydney. Drill 6.3. The `groups` claim on the default authorization server was changed from Starts with `APP-Rostr` to Starts with `APP-Rostrx`. It stayed included in the ID token. Jonah Hale was added to `APP-Rostr-Admins` for the drill. His Rostr Admin assignment was the group, not a People row.

## What we saw

Jonah signed in through `/oidc/login` and reached `/me`. `sub` was `00u18dk3t4h0G1k9I698`. `aud` was `0oa18egjva6o5FpoP698`. The `groups` line was empty, so the role did not show as admin. `/admin/users` returned not allowed.

[evidence/6.3-me-groups-empty.png](../../evidence/6.3-me-groups-empty.png)

The claim list at that time said `groups: starts with APP-Rostrx`.

[evidence/6.3-groups-claim-wrong.png](../../evidence/6.3-groups-claim-wrong.png)

## Where we looked

Directory → Groups → `APP-Rostr-Admins` listed Jonah Hale, Active, managed manually.

[evidence/6.3-jonah-in-group.png](../../evidence/6.3-jonah-in-group.png)

The API listed the same membership. The ID token on `/me` did not. `logs/rostr-auth.jsonl` recorded the sign-in as success at `2026-10-07T06:31:17.124Z`. Okta issued a token. The claim filter dropped every group whose name did not start with `APP-Rostrx`. Neither `APP-Rostr-Users` nor `APP-Rostr-Admins` matched.

A refresh of the same private window would not have fixed it. That session already held the empty claim.

## Cause

Rostr decides admin from the `groups` claim, not from a live lookup of the group. The filter and the group names disagreed. Sign-in still succeeds because the claim is optional from Okta's point of view.

## Fix

Claims → `groups`. Filter set back to Starts with `APP-Rostr`. Token type left as ID, include left as Always. A new private window, then `/oidc/login` as Jonah.

## Check

`/me` showed `groups` `APP-Rostr-Users, APP-Rostr-Admins`. Auth log `2026-10-07T06:34:02.105Z`, `protocol` `oidc`, Jonah's `sub`, `outcome` `success`.

[evidence/6.3-me-groups-restored.png](../../evidence/6.3-me-groups-restored.png)

Jonah stays in `APP-Rostr-Admins` until this record is written. Remove him after that. The group is supposed to be empty except during an approved access request.

## Do this next time

A blank `groups` line with a successful sign-in is a claim filter problem, not a failed login and not a missing group membership. Check the group page and the token. They answer different questions.
