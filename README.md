# Okta IAM Lifecycle Lab

A learning lab for Lanternfield Goods, a fictional retailer. The HR source is a JSON file in Git. Okta holds the users, groups, and policies. Rostr is the mock rostering app in `rostr/`. SAML and OIDC sign-in are in place. Okta provisions users and groups into Rostr over SCIM.

The work is day-to-day Okta administration, SaaS onboarding, joiner-mover-leaver automation, and the audit evidence those produce. It is aimed at hands-on Okta practice. About 52 hours over three weeks.

This is a learning lab, not production Okta experience. Every claim points at a file in this repository.

Code is written with AI assistance (Cursor) and reviewed by me. Okta configuration, testing, and the write-ups are done in the org and recorded here.

The domain is `lanternfieldgoods.co.uk`. The org is a 30-day Workforce Identity free trial (`trial-7464750`), not the Integrator Free Plan the design assumed. The 10-user and 5-flow budgets in the design note still apply. Lifecycle Management on this trial ends when the 30 days end.

## Where the project is

Phase 0, Phase 1, and Phase 3 are done. Staff are in Okta, department groups fill from rules, Okta Verify is required, and a help desk admin can reset a lost phone without changing apps or policies. Rostr answers `/health` from the container on port 3000. Jonah Hale has signed in over SAML and over OIDC. `/admin/users` requires `APP-Rostr-Admins`. Okta provisions the Rostr app over SCIM. The seven staff are in Rostr with title and department. `APP-Rostr-Users` is pushed with those seven members, and `APP-Rostr-Admins` is pushed empty. A test joiner was created, retitled, and deactivated. An account inserted straight into Rostr was imported, matched nothing, and was ignored. It is still in the Rostr database. `svc-jml-sync` can take a client-credentials token with the three API scopes, and that token can read the System Log. `scripts/hr-sync` classifies a joiner, mover, or leaver from the HR file and dry-runs unless `--apply` is passed. The three Workflows are not built.

| Phase | Focus | Time box | Status | Where to read it |
| --- | --- | --- | --- | --- |
| 0 | Prep, domain, org, and design | 5 h | Done | [docs/decisions](docs/decisions) |
| 1 | Okta foundation | 6 h | Done | [docs/phases/01-foundation.md](docs/phases/01-foundation.md) |
| 2 | SaaS onboarding: SAML and OIDC | 8 h | In progress | [docs/phases/02-onboarding.md](docs/phases/02-onboarding.md) |
| 3 | SCIM provisioning | 8 h | Done | [docs/phases/03-scim.md](docs/phases/03-scim.md) |
| 4 | Joiner, mover, and leaver | 7 h | In progress | [docs/decisions/scripts-identity.md](docs/decisions/scripts-identity.md) |
| 5 | Governance and audit evidence | 7.5 h | Not started | |
| 6 | Failure drills | 6 h | Not started | |
| 7 | Write-up and teardown | 4 h | Not started | Milestone M3 |

## Map of what exists

![Diagram of the lab as built](docs/built-so-far.png)

Solid nodes are files that exist. Dashed nodes are TBC. `hr/employees.json` is the source of truth. `hr/okta-import.csv` was generated from it and loaded once. [docs/decisions/02-break-glass.md](docs/decisions/02-break-glass.md) is on the map. [docs/decisions/01-org.md](docs/decisions/01-org.md) is the org. [docs/decisions/02-design.md](docs/decisions/02-design.md) is the access model.

The Rostr shell is in [rostr](rostr). `scripts/scim-tests.sh` is the SCIM test script. The five Workflows, and the phase notes for phases 4 to 7, are still TBC. That chain is the later design. It does not run. `hr-sync` is a script, not one of the five flows. The first incident record is the duplicate Rostr Admin app.

## What is in place

- Domain and catch-all mail: [docs/decisions/00-domain.md](docs/decisions/00-domain.md).
- Org, daily admin, and break-glass: [docs/decisions/01-org.md](docs/decisions/01-org.md), [docs/decisions/02-break-glass.md](docs/decisions/02-break-glass.md).
- User budget, five flows, and naming: [docs/decisions/02-design.md](docs/decisions/02-design.md).
- Seven staff, group rules, session policies, help desk role, MFA reset, and the Entra-to-Okta names: [docs/phases/01-foundation.md](docs/phases/01-foundation.md).
- Lost-phone reset: [docs/runbooks/mfa-reset.md](docs/runbooks/mfa-reset.md).
- SaaS onboarding: [docs/runbooks/saas-onboarding.md](docs/runbooks/saas-onboarding.md).

## Repository

| Path | Holds | Now |
| --- | --- | --- |
| [docs/decisions](docs/decisions) | Numbered decisions | Domain, org, break-glass, design, service identity |
| [docs/phases](docs/phases) | One note per phase | [01-foundation.md](docs/phases/01-foundation.md), [02-onboarding.md](docs/phases/02-onboarding.md), [03-scim.md](docs/phases/03-scim.md) |
| [docs/runbooks](docs/runbooks) | Repeatable admin steps | [mfa-reset.md](docs/runbooks/mfa-reset.md), [saas-onboarding.md](docs/runbooks/saas-onboarding.md) |
| [docs/incidents](docs/incidents) | Failure records | [00-duplicate-rostr-admin.md](docs/incidents/00-duplicate-rostr-admin.md). Phase 6 drills are not started |
| [docs/worklog](docs/worklog) | Session log | [week-1.md](docs/worklog/week-1.md) |
| [evidence](evidence) | Screenshots and log extracts | Tasks 0.2 through 2.7, 3.2 through 3.7, and 4.1 |
| [hr](hr) | HR source of truth | [employees.json](hr/employees.json). [okta-import.csv](hr/okta-import.csv) was the one-time load |
| [rostr](rostr) | Mock SaaS app | SAML and OIDC sign-in. SCIM Users and Groups. Okta pushes users and the two `APP-Rostr` groups |
| [scripts](scripts) | Test scripts, `hr-sync`, and later review exports | [scim-tests.sh](scripts/scim-tests.sh), [hr-sync](scripts/hr-sync) |
| [.env.example](.env.example) | Placeholder names only | No secrets |
