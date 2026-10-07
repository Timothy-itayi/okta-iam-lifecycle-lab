# OAuth integration review

Generated 2026-10-07T03:09:39.617Z. Catalog is the approved list in docs/runbooks/oauth-review.md.
legacy-report-tool is not on that list. That is the planted finding.

| label | id | type | owner | purpose | scopes | last used | approval | disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| legacy-report-tool | 0oa18g5mzseAfusVa698 | service | (none) | unrecorded | okta.apps.manage okta.groups.manage okta.logs.read okta.users.manage | (none in 30d) | unapproved | revoke grants and deactivate |
| Okta Admin Console | 0oa18dfk5s1tt6FAT698 | oauth | Okta | platform | okta.admin.manage okta.admin.read | (none in 30d) | okta-owned | keep |
| Okta Browser Plugin | 0oa18dfk5vebSi2mo698 | oauth | Okta | platform | okta.enduser.dashboard.manage okta.enduser.dashboard.read okta.internal.enduser.manage okta.internal.enduser.read okta.personal.authenticator.manage okta.personal.authenticator.read okta.personal.manage okta.personal.read okta.users.read.self | (none in 30d) | okta-owned | keep |
| Okta Dashboard | 0oa18dfk5sxHPGx1l698 | oauth | Okta | platform | okta.enduser.dashboard.manage okta.enduser.dashboard.read okta.internal.enduser.manage okta.internal.enduser.read okta.internal.navigation.enduser.read okta.myAccount.sessions.manage okta.personal.authenticator.manage okta.personal.authenticator.read okta.personal.manage okta.personal.read okta.users.manage.self okta.users.read.self | (none in 30d) | okta-owned | keep |
| Okta Workflows | 0oa18dfuuse9QjR64698 | oauth | Okta | platform | okta.apps.read okta.internal.navigation.enduser.read okta.internal.supportContact.read okta.manifests.read okta.roles.read | (none in 30d) | okta-owned | keep |
| Okta Workflows OAuth | 0oa18dfuuvu80Pzh0698 | oauth | Okta | platform | okta.apps.manage okta.apps.read okta.clients.manage okta.clients.read okta.clients.register okta.eventHooks.manage okta.eventHooks.read okta.groups.manage okta.groups.read okta.logs.read okta.schemas.manage okta.schemas.read okta.users.manage okta.users.manage.self okta.users.read okta.users.read.self | (none in 30d) | okta-owned | keep |
| Rostr | 0oa18eddmjpNG4dNl698 | saml_2_0 | Operations | staff roster SAML | (none) | (none in 30d) | approved | keep |
| Rostr Admin | 0oa18egjva6o5FpoP698 | oauth | Operations | roster admin OIDC | (none) | (none in 30d) | approved | keep |
| svc-jml-sync | 0oa18eu8qpmkJBqdg698 | service | IAM | hr-sync joiner/mover/leaver | okta.appGrants.manage okta.appGrants.read okta.apps.manage okta.groups.manage okta.logs.read okta.users.manage | (none in 30d) | approved | keep |

Planted app `legacy-report-tool` id `0oa18g5mzseAfusVa698`: revoke grants and deactivate.

