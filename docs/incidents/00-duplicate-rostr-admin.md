# Duplicate Rostr Admin app

Date: 2026-10-06. Two OIDC apps were created with the same name, `Rostr Admin`. Token Preview lists clients by name, so the dropdown showed two identical entries. Assignment, redirect URIs, and the client ID lived on one of them. A preview against the other returned "User is not assigned to the client application."

## What we saw

Jonah Hale was a member of `APP-Rostr-Admins`, and that group was assigned to one Rostr Admin app. The preview still refused him. The client picker, after typing `Ro`, offered `Rostr Admin` twice. Nothing on that row showed the client ID.

## Cause

Okta does not require application names to be unique. The second Create App Integration produced another app with the same label. The kept app is the one whose client ID is `0oa18egjva6o5FpoP698`.

## Fix

Open each app and compare the client ID on the General tab with the app that has the group assignment. Deactivate the other one. After the duplicate was gone, Token Preview changed its error to "Policy evaluation failed for this request, please check the policy configurations." The default authorization server had no access policy that included this client. The policy `Rostr Admin` was added, assigned to that client only, with one active rule named Authorization Code and scopes All. The app's own sign-on policy is "Any two factors", not the SAML app's Rostr policy.

## Check

Token Preview at 17:18, grant type Authorization Code, user Jonah Hale, scope `openid`, produced an ID token. `aud` is `0oa18egjva6o5FpoP698`. `groups` contains `APP-Rostr-Users` and `APP-Rostr-Admins`. The record is in [docs/phases/02-onboarding.md](../phases/02-onboarding.md).

## Do this next time

When a picker shows two apps with the same name, read the client ID before assigning, previewing, or copying a secret. One name, one app. The client ID in `rostr/.env` has to be the app that is assigned to `APP-Rostr-Admins`.
