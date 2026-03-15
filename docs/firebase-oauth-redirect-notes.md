# Firebase OAuth Redirect Notes

Date: 2026-03-16

Production app:
- `https://task-checklist-prod.web.app/`

Google OAuth client:
- `Web client (auto created by Google Service)`
- client id prefix: `1085328819177-dfn...`

Added authorized JavaScript origin:
- `https://task-checklist-prod.web.app`

Added authorized redirect URI:
- `https://task-checklist-prod.web.app/__/auth/handler`

Existing Firebase redirect URI kept:
- `https://task-checklist-prod.firebaseapp.com/__/auth/handler`

Verification result:
- `Google 로그인` now redirects to the Google account chooser without `redirect_uri_mismatch`.
- Firebase Hosting redirect handler is working on `task-checklist-prod.web.app`.
