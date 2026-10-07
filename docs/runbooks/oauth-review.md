# OAuth integration review

Use this to list every app integration, read the Okta API scopes granted to each OIDC client, and dispose of anything that was never approved. The worked example is `legacy-report-tool`, planted on 2026-10-07 and then revoked.

The catalog below is the approval record. An app that is not on it is unapproved until someone writes it down.

## What needs to exist first

`svc-jml-sync` can read users, groups, and logs. It cannot read Applications until both of these are true:

1. Okta API Scopes on `svc-jml-sync`: grant **`okta.apps.manage`** and **`okta.appGrants.manage`**. Requesting a scope that is not granted is omitted from the token, not rejected. `/api/v1/apps` then 403s. `/api/v1/apps/{id}/grants` is a second resource; `okta.apps.manage` does not cover it.
2. Admin roles: assign **Application Administrator** so `/api/v1/apps` works. The grants API still 403s with that role. Okta's current RBAC requires **Super Administrator** on the caller for `GET/POST /apps/{id}/grants`. Assign it for this review, then remove it. Do not leave Super Admin on an automation app.

Do not put an SSWS token in Git. Do not use the daily admin's session for the review script.

## Approved catalog

| Label | Owner | Purpose | Kind |
| --- | --- | --- | --- |
| `svc-jml-sync` | IAM | `hr-sync` joiner, mover, leaver | service |
| `Rostr` | Operations | staff roster SAML | SAML |
| `Rostr Admin` | Operations | roster admin OIDC | OIDC web |
| Labels starting `Okta ` | Okta | platform | keep |

Anything else is unreviewed. The planted label `legacy-report-tool` is not on this table on purpose.

## Review

```
node scripts/oauth-review plant
node scripts/oauth-review review --out evidence/5.5/oauth-review.md
node scripts/oauth-review revoke
node scripts/oauth-review revoke --apply
node scripts/oauth-review review --out evidence/5.5/oauth-review.md
```

`plant` creates an OIDC service app named `legacy-report-tool` and grants `okta.users.manage`, `okta.groups.manage`, `okta.apps.manage`, and `okta.logs.read`. A report tool does not need four manage scopes. Do not add it to this catalog before the review finds it.

`review` lists `/api/v1/apps`, then `/api/v1/apps/{id}/grants` for OAuth clients, and last `app.oauth2` System Log events in 30 days.

`revoke` deletes those grants and `POST /api/v1/apps/{id}/lifecycle/deactivate`. Dry-run is the default.

Disposition:

| Approval | Action |
| --- | --- |
| approved or Okta-owned | keep |
| `legacy-report-tool` with a `.manage` scope | revoke grants, deactivate |
| anything else | confirm with owner. Do not deactivate the Dashboard because it was missing from a homemade list. |

## After a revoke

The app stays in the org as Inactive. Deleting it is optional and is not required to close the finding. Record the id, the scopes that were granted, and the deactivate HTTP status.
