# Backup baseVersion sync note

- Date: 2026-03-16
- Symptom: after a successful backup, the server version increased but the local baseVersion sometimes stayed behind, so the app warned that a newer server backup existed even though the same device had just uploaded it.
- Cause: the post-backup UI path could keep using a stale version value immediately after upload.
- Fix: after backup, refresh server metadata and store the latest returned version and backup timestamp in syncMeta before clearing the dirty state.
- Verification target: on the production app, after one local change and one manual backup, "서버 버전" and "로컬 기준 버전" should match and the self-conflict warning should not appear.
