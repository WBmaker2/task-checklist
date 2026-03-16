# Previous Thread Context Summary

이 문서는 이전 `task-checklist` 작업 스레드의 회의록/의사결정 요약을, 현재 저장소에서 참고할 수 있도록 옮겨 둔 기록이다.

- Source thread project path: `/Volumes/DATA/Dev/Codex/task-checklist`
- Recorded in current repo for handoff/reference

## 프로젝트 개요

- 프로젝트명: `task-checklist`
- 이전 작업 경로: `/Volumes/DATA/Dev/Codex/task-checklist`
- 앱 성격: 학급 업무 체크리스트 웹앱
- 사용자는 수정이 있을 때마다 앱 표시 버전도 함께 올리길 원함
- 커밋/푸시 전에는 반드시 `바로 커밋하고 git push까지 이어서 마무리할까요?`라고 확인하고, 사용자가 `네` 또는 `응`이라고 답하면 바로 진행

## 주요 기능 변경 이력

### 1. 주별 화면 구조 개편

- 주별 화면에서 월요일 위에 `이 주의 업무` 섹션 추가
- 기존 `주별 업무`가 월~금에 반복 표시되지 않도록 분리
- 대시보드/월별/통계 화면도 같은 기준으로 정리
- 이 변경은 프론트 표현 변경이며, 백엔드 저장 포맷은 유지됨

### 2. Firebase 이전

- 기존 Supabase 백엔드를 Firebase로 이전
- 구조:
  - Firebase Authentication + Google 로그인
  - Cloud Firestore
  - 컬렉션: `userBackups/{uid}`
- dev/prod 분리 구성
- 운영 방향:
  - 초기엔 GitHub Pages 유지 + Firebase 백엔드
  - 이후 장기 안정화를 위해 Firebase Hosting으로 전환

### 3. GitHub Secret Scanning 대응

- Firebase Web API key가 저장소에 커밋되어 GitHub secret scanning alert 발생
- 판단:
  - Firebase Web API key는 전통적 서버 비밀은 아니지만, 저장소 추적 파일에 남기는 건 정리 필요
- 조치:
  - Firebase config를 배포 시 생성 방식으로 전환
  - GitHub Secrets 사용
  - GitHub Pages source를 GitHub Actions로 전환했던 이력이 있음
  - 이후 Firebase Hosting으로 이동
  - 기존 secret scanning alert는 수동 close

### 4. 로그인 문제 대응

- GitHub Pages + `signInWithPopup()` 조합에서 Google 로그인 불안정
- 비교 검토 후 장기 구조를 `Firebase Hosting + signInWithRedirect()`로 결정
- Firebase Hosting 배포 설정 및 OAuth redirect URI 정리
- 실제 운영 URL:
  - `https://task-checklist-prod.web.app/`

## 핵심 의사결정

### A. 백엔드

- Supabase 유지 대신 Firebase로 이전하기로 결정
- 이유:
  - 현재 앱 구조가 단순하고 `backup-service` 중심이라 마이그레이션 난이도가 중간 수준
  - Firebase Auth + Firestore가 현재 요구사항과 잘 맞음

### B. 호스팅

- 최종적으로 Firebase Hosting 채택
- 이유:
  - redirect 로그인 흐름을 안정화하려면 same-site auth helper 구성이 유리
  - GitHub Pages보다 Firebase Hosting이 로그인 구조상 더 적합

### C. 로그인 방식

- `signInWithPopup()` 포기
- `signInWithRedirect()` 채택
- 이유:
  - popup 흐름에서 브라우저/Google 인증 단계 충돌
  - Firebase Hosting 기반 redirect가 장기적으로 더 안정적

### D. 배포 전략

- GitHub 저장소는 유지
- 배포는 GitHub Actions -> Firebase Hosting
- 운영 URL은 Firebase Hosting 주소 사용

## 운영 설정 관련 결정

- Firebase 프로젝트:
  - dev / prod 분리
- Firestore region:
  - `asia-northeast3 (Seoul)`
- Firebase Auth 승인 도메인 정리
- OAuth authorized redirect URI 추가
- Firebase Hosting service account secret 구성
- GitHub Actions Node deprecation 경고도 정리

## 가장 중요한 최근 버그와 해결

### 증상

- 수동 백업 성공 후:
  - `서버 버전`은 증가
  - `로컬 기준 버전`은 이전 값에 머묾
- 그 결과, 방금 같은 기기에서 업로드했는데도 `서버 최신 감지`가 잘못 뜸

### 처음 의심했던 원인

- `syncMeta` 저장 경로가 여러 군데라 state 경합 가능성 의심
- `App.js`의 backup success path를 정리하는 수정도 진행

### 최종 원인

- 진짜 원인은 `src/core/backup-service.js`
- `backupUserData()`가 Firestore transaction 안에서 계산한 `nextVersion`을 알고 있었지만,
  transaction 직후 `fetchBackupMeta()`를 다시 호출한 뒤
  그 재조회 결과의 `latest.version`을 `nextVersion`보다 우선해서 반환하고 있었음
- 이때 stale cached read가 오면 항상 한 버전 뒤처진 값이 반환될 수 있었음

### 최종 해결

- `backupUserData()`가 transaction에서 계산한 `nextVersion`을 그대로 반환하도록 수정
- `updatedAtClient`도 transaction 시점 값을 우선 사용하도록 정리
- `index.html`에서 `backup-service.js`에도 cache-busting query 추가
- 이후 실배포 검증에서 정상 확인

### 최종 검증 결과

- 운영 URL에서 확인
- 백업 전:
  - 서버 버전 8
  - 로컬 기준 버전 8
- 백업 후:
  - 서버 버전 9
  - 로컬 기준 버전 9
- `서버 최신 감지` 재발 없음
- `localStorage.cc_sync_meta_v1.baseVersion === 9` 확인

## 관련 문서

- `docs/firebase-migration-plan.md`
- `docs/firebase-console-checklist.md`
- `docs/firebase-auth-login-options.md`
- `docs/supabase-to-firebase-cutover-strategy.md`
- `docs/supabase-to-firebase-user-migration.md`
- `docs/firebase-oauth-redirect-notes.md`
- `docs/backup-baseversion-sync-note.md`

## 최근 버전 흐름

- Firebase 이전, 로그인 구조 변경, 배포 전환, backup baseVersion 버그 수정이 이어졌음
- 최근 안정 확인 버전:
  - `v2.0.13`
- 이후 `CHANGELOG.md` 생성 및 다음 버전 관리 작업을 하려던 상태

## 현재 이어서 확인할 것

1. 현재 이동된 폴더 기준으로 저장소 상태 점검
2. `CHANGELOG.md` 존재 여부 확인
3. 앱 표시 버전 / package version / cache-busting 버전 일치 여부 점검
4. Firebase Hosting 기준 현재 빌드/배포 구조 유지 여부 확인
5. backup sync 동작이 현재 폴더 기준 코드에서도 동일하게 보존되는지 확인
