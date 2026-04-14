# Project Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 누락된 소스와 빌드 스크립트를 복구해서 저장소를 다시 빌드·검증 가능한 상태로 되돌립니다.

**Architecture:** 업스트림 GitHub 저장소를 기준 진실원으로 삼아 현재 작업공간의 누락 파일을 복구하고, 현재 루트 파일은 필요한 범위만 업스트림과 정합성을 맞춥니다. 복구 후에는 스모크 테스트와 빌드 명령으로 실제 동작 여부를 확인합니다.

**Tech Stack:** Node.js, esbuild, 정적 HTML, React UMD, Firebase compat SDK

---

### Task 1: 누락 소스 및 빌드 체인 복구

**Files:**
- Create: `/tmp/task-checklist-upstream` (임시 업스트림 기준 복제본)
- Create: `scripts/build.mjs`
- Create: `scripts/generate-firebase-config.mjs`
- Create: `scripts/prepare-dist.mjs`
- Create: `scripts/release.mjs`
- Create: `scripts/test-sync.mjs`
- Create: `src/App.js`
- Create: `src/main.js`
- Create: `src/core/*`
- Create: `src/pages/*`
- Create: `styles/main.css`

- [ ] **Step 1: 현재 실패 상태를 확인**

Run: `npm run build`
Expected: FAIL with `Cannot find module .../scripts/build.mjs`

- [ ] **Step 2: 업스트림 기준 저장소 확보**

Run: `git clone https://github.com/WBmaker2/task-checklist.git /tmp/task-checklist-upstream`
Expected: `/tmp/task-checklist-upstream`에 `scripts/`, `src/`, `styles/`가 존재

- [ ] **Step 3: 업스트림 기준으로 누락 파일 복구**

원격 저장소 `https://github.com/WBmaker2/task-checklist.git`의 현재 `main` 기준에서 누락된 `scripts/`, `src/`, `styles/`를 현재 작업공간에 복구합니다.

- [ ] **Step 4: 루트 엔트리 정합성 선반영**

복구된 소스 구조와 맞도록 `package.json`, `index.html`을 먼저 동기화합니다.

- [ ] **Step 5: 복구 후 최소 검증**

Run: `npm run test:sync`
Expected: PASS with `Sync smoke tests passed`

- [ ] **Step 6: 빌드 검증**

Run: `npm run build`
Expected: PASS with `Built ... files into ./build`

### Task 2: 루트 엔트리와 문서 정합성 복구

**Files:**
- Modify: `README.md`
- Create: `CHANGELOG.md`

- [ ] **Step 1: 현재 문서 차이 확인**

Run: `diff -u README.md /tmp/task-checklist-upstream/README.md`
Expected: 운영/릴리스/검증 흐름 차이 확인

- [ ] **Step 2: 필요한 루트 파일 동기화**

현재 저장소의 문서가 복구된 소스 구조를 설명하도록 `README.md`, `CHANGELOG.md`를 업스트림 기준으로 맞춥니다.

- [ ] **Step 3: 배포 산출물 검증**

Run: `npm run build:hosting`
Expected: PASS with `Prepared Firebase Hosting assets in ./dist`

### Task 3: 최종 검증 및 남은 리스크 정리

**Files:**
- Modify: `README.md` (필요 시)

- [ ] **Step 1: 핵심 명령 전체 재실행**

Run:
- `npm run test:sync`
- `npm run build`
- `npm run build:hosting`

Expected: all PASS

- [ ] **Step 2: 남은 운영 리스크 기록**

Firebase 환경변수가 비어 있을 때의 동작, CDN 의존성, 비 git 작업공간 상태 같은 남은 리스크를 README 또는 최종 보고에 정리합니다.
