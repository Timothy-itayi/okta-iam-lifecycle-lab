# 01 — Okta org

Previous: [00 — Domain and email](00-domain.md).

Decision date: 2026-10-06

## Org

| Item | Value |
| --- | --- |
| Org name | `lanternfieldgoods-co-trial-7464750` |
| Org URL | https://trial-7464750.okta.com |
| Admin Console | https://trial-7464750-admin.okta.com/admin/dashboard |
| Sign-up address | `admin@lanternfieldgoods.co.uk` |
| Signed-in admin | Timothy Itayi |
| Active users | 2, as of 2026-10-06 01:04 +1100. Was 1 of 10 at 00:48. See [02-break-glass.md](02-break-glass.md). |

`it@lanternfieldgoods.co.uk` was not needed. Okta accepted `admin@`.

## Admin authenticator

Okta Verify is enrolled for `admin@lanternfieldgoods.co.uk` on a phone. The account shown in the app is `trial-7464750.okta.com`. Screenshot: [evidence/0.3-okta-verify-enrolled.png](../../evidence/0.3-okta-verify-enrolled.png).

The enrollment QR was not saved. It is an authenticator secret, not evidence.

Task 0.3 still wants a sign-out and a fresh sign-in, to prove the Okta Verify prompt appears. That test is not in these screenshots.

## What the console is asking

The Getting Started page is asking to import users and add an SSO app. That is Okta's wizard, not this lab. Do not import users from that page. Staff are loaded in task 1.2 from `hr/employees.json`. The first real app is Rostr, in Phase 2.

A SAML app named `testapp` was created anyway. That belongs to task 0.4, which is the check that Provisioning shows SCIM, followed by deleting the app. The saved shots are General Settings and the Sign On tab. The SCIM check is not in them, and the app is still Active.

Dashboard screenshot: [evidence/0.3-admin-console-dashboard.png](../../evidence/0.3-admin-console-dashboard.png).

## Plan

The console banner says "30 days left in your trial" and the Getting Started card says "Welcome to your free trial" with 30 days left. The org subdomain is `trial-7464750`. Signed in as break-glass, the left nav says Free Trial Plan: [evidence/0.5-breakglass-admin-console.png](../../evidence/0.5-breakglass-admin-console.png).

The runbook asked for an [Integrator Free Plan](https://developer.okta.com/docs/reference/org-defaults/) org. That plan does not expire. It deactivates only after 90 days with no sign-ins. A [Workforce Identity free trial](https://help.okta.com/OIE/en-us/content/topics/miscellaneous/okta-free-trial.htm) lasts 30 days and then converts to a Free Plan that drops Lifecycle Management. This lab's SCIM and joiner/mover/leaver work needs Lifecycle Management. The published trial table lists one admin email address. This org did not enforce that. Break-glass was assigned Super Organization Administrator at 2026-10-06 01:05:38 +1100. See [02-break-glass.md](02-break-glass.md).

Both plans share the limits already on screen: email templates cannot be edited, Org2Org is not permitted, and email automation cannot be sent. Those three do not by themselves mean the signup was the wrong plan. The 30-day banner does.

Confirm the plan type before task 0.4. If this is the 30-day trial, sign up again for the Integrator Free Plan and use `it@lanternfieldgoods.co.uk`. Okta requires a unique business email per org, so `admin@` cannot be reused.

## Feature check

Task 0.4 adds the feature table here: group rules, the default authorization server, Workflows, and SCIM on a test SAML app. Not checked yet.
