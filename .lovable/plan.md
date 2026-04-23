
Remove Google sign-in from `LoginPage.tsx`:
- Delete `lovable` import and `ForgotPasswordPage` stays.
- Remove `googleLoading` state and `handleGoogleSignIn` function.
- Remove the OR divider and "Continue with Google" button block (the entire `!adminMode && (<>...</>)` section containing the Google button).
- Keep everything else intact: email/password login, forgot password link, admin mode toggle, sign-up link.

No backend changes needed. Google provider can remain configured in Cloud but will simply be unused.
