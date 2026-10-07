# SAML single sign-on URL mismatch

Date: 2026-10-07, 16:59–17:12 Sydney. Drill 6.1. The Rostr SAML app `0oa18eddmjpNG4dNl698` had its single sign-on URL changed from `/saml/acs` to `/saml/acs2`. The checkbox **Use this for Recipient URL and Destination URL** was left ticked, so Okta rewrote all three. The audience stayed `https://rostr.lanternfieldgoods.co.uk/saml/metadata`.

## What we saw

Jonah Hale signed in from `https://rostr.lanternfieldgoods.co.uk/saml/login`. Okta accepted him. The browser then stopped on `https://rostr.lanternfieldgoods.co.uk/saml/acs2` with the text `Cannot POST /saml/acs2`.

[evidence/6.1-saml-acs2.png](../../evidence/6.1-saml-acs2.png)

## Where we looked

`logs/rostr-auth.jsonl` had no new line. The last SAML success for Jonah was still `2026-10-06T05:20:26.837Z`. Rostr only writes that file inside the handler for `POST /saml/acs` in `rostr/src/saml.js`. Express returned the "Cannot POST" page before that handler ran.

The Okta app, read back from the API, had `ssoAcsUrl`, `recipient`, and `destination` all set to `https://rostr.lanternfieldgoods.co.uk/saml/acs2`.

## Cause

Okta posts the SAML response to the single sign-on URL configured on the app. That URL did not match Rostr's route. The onboarding record in [docs/phases/02-onboarding.md](../phases/02-onboarding.md) still said `/saml/acs`.

## Fix

SAML Settings → Edit → Configure SAML. Single sign-on URL set back to `https://rostr.lanternfieldgoods.co.uk/saml/acs`. The same checkbox stayed ticked, so recipient and destination followed. Audience was not touched. Next, then Finish.

## Check

Jonah opened the Rostr tile and landed on `/me`. `userName` `jonah.hale@lanternfieldgoods.co.uk`, `groups` `APP-Rostr-Users`, `role` staff, `lastLogin` `2026-10-07T06:12:09.466Z`.

[evidence/6.1-jonah-me.png](../../evidence/6.1-jonah-me.png)

`logs/rostr-auth.jsonl` appended `2026-10-07T06:12:09.478Z`, `protocol` `saml`, that user, `outcome` `success`. The API then showed all three URLs back on `/saml/acs`.

The success path writes `lastLogin`. Jonah's planted stale value `2026-08-22T05:20:26.829Z` is gone. The stale-access report from Phase 5 no longer matches the database.

## Do this next time

Change the single sign-on URL only from the onboarding record, and only with a ticket. Read the auth log after a failed sign-in. No new line means the request never reached the SAML handler. Confirm `/me` and a new success line before calling it fixed.
