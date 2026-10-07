# OIG mapping

Previous: [Phase 5 — Governance](../phases/05-governance.md).

Okta Identity Governance is a subscription. This trial does not have it. The lab did Access Requests, access review, entitlements, and stale-access by hand. This note is how the product would do the same work, from Okta's docs on [Identity Governance](https://help.okta.com/oie/en-us/content/topics/identity-governance/iga.htm), [Access Requests](https://help.okta.com/oie/en-us/content/topics/identity-governance/access-requests/ar-overview.htm), [Access Certifications](https://help.okta.com/oie/en-us/content/topics/identity-governance/access-certification/iga-access-cert.htm), and [Entitlement Management](https://help.okta.com/en-us/Content/Topics/identity-governance/em/entitlement-policy.htm).

OIG here is Access Governance (Access Requests, Access Certifications, Entitlement Management) sitting on Lifecycle Management and Workflows. The lab already has the last two.

| Lab process | How OIG does it | What OIG adds |
| --- | --- | --- |
| Birthright: HR file → Joiner flow → group rules → `DEPT-*` and `APP-Rostr-Users` | Still LCM. Entitlement policies can assign app entitlements from profile attributes or Okta-sourced group membership, one active policy per app. | Entitlement values inside the app, not only group membership. Policy vs Custom assignment type is recorded. Preview before apply. |
| Exception access: osTicket `REQ-0001`, Internal Note as Marcus's approval, Workflows POST adds `APP-Rostr-Admins`, Wait For 1 hour, remove | Access Requests. Conditions on the resource: who can request, duration, approval sequence (questions, manager or resource owner, Workflows). Or older request types owned by an Access Requests team. Requester uses the End-User Dashboard catalog (or Slack / Teams), not a guest ticket form. | Named approver in product, not a note typed by IT. Time-bound grants with automatic revoke. Request-on-behalf. Admin-role requests. History and reports without scraping osTicket. |
| Access review: `scripts/access-review` CSVs per manager, Keep/Revoke, DELETE leftover `APP-Rostr-*` | Access Certification campaigns: scope identities and resources (groups, apps, entitlements, bundles, collections), reviewers, schedule or one-shot, auto-remediate on revoke. Security access reviews for a single user after an incident. | Reviewer UI, fallback reviewer, Governance Analyzer usage and SoD insights, Smart Review grouping, campaign evidence reports. Okta revokes instead of a local script. |
| Stale-Access: plant Rostr `lastLogin`, report reclaim, do not deactivate | Campaigns can use usage history. Analyzer surfaces last use. A security access review can target unused access. License sprawl is listed as a campaign goal. | Last-use from Okta SSO, not an app sqlite column the OIDC path never writes. Recurring schedule. Actual revoke if configured. |
| Entitlements: two groups, `APP-Rostr-Users` and `APP-Rostr-Admins`; OIDC `groups` claim | Entitlement objects and values on the app. Bundles for self-service (Access Requests only, not policy). Resource collections group apps plus entitlements. Resource owners and labels. | Fine-grained values (role, cost centre, licence SKU) without exploding groups. Source labelled Policy / Bundle / Custom. |
| OAuth review: plant `legacy-report-tool`, list grants, revoke, deactivate | Not Access Governance. Still an OAuth/API-scopes job, plus Okta Privileged Access if you certify service accounts in a campaign. | Campaigns can include service accounts only with OPA. Does not replace an integration catalog. |
| Evidence: System Log + screenshots + CSVs in this pack | OIG reports for past campaigns and past access requests. IGA System Log events. Governance APIs. | Approver identity, decision, timestamp, and remediation in one report. The lab still needs System Log for JML and MFA. |
| SoD: none. Lena can hold Users and Admins at once; that is the point of the hour grant | Separation of duties rules: forbidden entitlement combinations. Access Requests and Certifications enforce them. | Product-level conflict detection. The lab cannot show a blocked request. |

## Checkpoint: who approved whose access

For staff in `hr/employees.json`, this is the honest answer today:

| Person | Birthright (`APP-Rostr-Users` / `DEPT-*`) | Exception | Recertification (REQ-0002) |
| --- | --- | --- | --- |
| Ava Nguyen, Marcus Bell, Helen Cho | CSV import 1.2, then group rules. No named approver. | none | Keep on `no-manager.csv` (peer department heads) |
| Jonah Hale | same | none | Keep, Ava Nguyen |
| Lena Ortiz | same | `APP-Rostr-Admins`: Marcus Bell, Internal Note on ticket `357784` / `REQ-0001`. Granted 13:06, removed 14:06:20 by the flow. The approver is still Marcus. The remove has no second approver. | Keep, Marcus Bell |
| Priya Shah, Thomas Okeke | Priya: import. Thomas: Joiner flow, no ticket. | none | Keep, Marcus Bell |
| Samir Adeyemi | import, then Leaver deactivate | none | Revoke leftover `APP-Rostr-Users`, Helen Cho |

`test.joiner` is lab debris, Revoke on `unmanaged.csv`. Orphan Roster is not an Okta user.

Birthright has a source (HR + rules) and no approver. That is the gap Access Certifications closes: the manager's Keep is the approval on the record. Exception access for Lena has an approver. The System Log actor on both the add (`02:06:18Z`) and the remove (`03:06:20Z`) is the Workflows connection, not Marcus. Ticket `357784` is still Open, so the ticket record does not yet show the revoke.

## What to learn first on the job

1. Access request **conditions** (resource-centric), not request types. New orgs are pointed at conditions. Know duration, eligibility groups, approval sequence reuse, and what happens when a group rule would put revoked membership back.
2. Campaign construction: resource scope, reviewer (manager vs resource owner vs custom), auto-revoke vs report-only, fallback reviewer, recurrence. Watch the same group-rule restore that made this lab revoke only deprovisioned leftovers.
3. Entitlement assignment types: Policy vs Custom vs Bundle. Custom takes the user off policy. Importing entitlements on an existing app marks current assignments Custom.
4. Governance Analyzer vs rubber-stamp. If reviewers always Approve, the campaign is theatre.
5. SoD rules before the first privileged bundle goes to self-service.
6. Admin-role governance (separate from app groups) and whether the org actually bought OIG, OPA, or only Workflows.

Do not pretend this trial proved OIG. It proved the processes OIG is sold to replace.
