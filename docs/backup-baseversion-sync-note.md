# Backup baseVersion sync note

- Date: 2026-03-16
- Symptom: after a successful backup, the server version increased but the local baseVersion sometimes stayed behind, so the app warned that a newer server backup existed even though the same device had just uploaded it.
- Cause: `backupUserData()` refreshed backup metadata right after the Firestore transaction and preferred the refetched version over the transaction-known `nextVersion`, so a cached read could return one version behind.
- Fix: prefer the transaction result when returning from `backupUserData()`, then store that version in `syncMeta` and cache-bust `backup-service.js` in `index.html` so clients pick up the corrected script immediately.
- Verification target: on the production app, after one local change and one manual backup, "서버 버전" and "로컬 기준 버전" should match and the self-conflict warning should not appear.
