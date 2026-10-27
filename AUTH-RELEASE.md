# Auth release – 27 October 2026

User explicitly authorized production rollout. Production migration `20261027083400_auth_controlled_access_release` applied; counts unchanged (44 people, 41 links, 20 units, 5 Auth users). Anonymous request reads and administrative recovery execution denied. Previous redemption function retained under supabase/rollback.

Production invitation endpoint updated to tested seven-day email/phone implementation. Safe smoke checks passed: invalid inspect and activation tokens rejected, unauthenticated creation denied. Admin recovery endpoint accepts the production origin and requires authentication. Frontend admin recovery enabled; verified phone mapping, access requests, and passkeys remain disabled. Existing legacy phone and email password paths remain available.

227 JavaScript tests and 15 combined SQL checks passed on final source. Staging evidence includes 19 integration results; invitation/recovery executed via deployed HTTP endpoints. Public access requests used an injected test ingress and are not cleared for production. Physical devices, SMTP delivery, full browser walkthrough, automatic reconciliation and complete restore drill remain unverified. This release is limited to invitations, password forms and administrative recovery.

Cache identifiers updated consistently to 5.8.1, including test module identities. Existing application design preserved. Do not claim this is a completed rollout of every planned authentication feature.

Rollback: disable frontend administrative recovery and server invitation/recovery flags as applicable, restore prior frontend commit and prior invitation Edge source as coordinated; preserve users and associations. The saved redemption SQL restores only that function, not the entire database.
