# Firebase Migration Plan

이 문서는 현재 `task-checklist` 앱의 백엔드를 `Supabase + Postgres + Google OAuth`에서 `Firebase Authentication + Cloud Firestore`로 이전하기 위한 설계안이다.

## 1. 목표

- 기존 사용자 경험 유지
  - Google 로그인
  - 수동 백업
  - 복원
  - 자동 백업
  - 다른 기기 변경 감지
  - 서버 최신본 충돌 감지
- 프론트엔드 구조 변경 최소화
- 기존 로컬 데이터(`localStorage`)와 현재 앱 동작 호환 유지
- 향후 Supabase 의존성 완전 제거

## 2. 현재 구조 요약

현재 앱은 백엔드 의존성이 대부분 `src/core/backup-service.js`에 집중되어 있다.

- 인증
  - Supabase Auth + Google OAuth
- 저장소
  - Postgres `public.user_backups`
- 권한
  - RLS로 `auth.uid() = user_id`
- 실시간 알림
  - Realtime subscription + 30초 polling fallback
- 충돌 제어
  - `version` 비교 후 mismatch 시 일반 업로드 차단

현재 저장 데이터 구조:

```json
{
  "user_id": "uid",
  "tasks": [],
  "cats": [],
  "checks": {},
  "updated_at_client": "2026-03-15T12:00:00.000Z",
  "updated_at": "server timestamp",
  "version": 3
}
```

## 3. Firebase 대상 아키텍처

이 앱에는 `Firebase Authentication + Cloud Firestore` 조합이 가장 적합하다.

### 선택 이유

- Google 로그인 공식 지원
- 사용자 단위 단일 문서 저장 구조와 잘 맞음
- `onSnapshot`으로 실시간 변경 감지 가능
- transaction으로 `version` 기반 충돌 제어 가능
- 서버 없이 정적 앱 구조를 유지할 수 있음

### 채택하지 않는 대안

- Realtime Database
  - 가능은 하지만 현재 데이터가 문서 1개 중심 구조라 Firestore가 더 자연스럽다.
- Cloud Functions 필수 도입
  - 초기 이전에는 불필요하다.
  - 클라이언트만으로 현재 기능 요구사항을 충족할 수 있다.

## 4. Firebase 데이터 모델

컬렉션:

- `userBackups`

문서 ID:

- Firebase Auth의 사용자 `uid`

문서 구조:

```json
{
  "tasks": [],
  "cats": [],
  "checks": {},
  "version": 3,
  "updatedAtClient": "2026-03-15T12:00:00.000Z",
  "updatedAt": "server timestamp"
}
```

### 필드 매핑

- Supabase `user_id` -> Firestore 문서 ID
- `tasks` -> 동일
- `cats` -> 동일
- `checks` -> 동일
- `updated_at_client` -> `updatedAtClient`
- `updated_at` -> `updatedAt`
- `version` -> 동일

## 5. 인증 설계

Firebase Authentication에서 Google provider를 사용한다.

권장 방식:

- `signInWithRedirect`

이유:

- 현재 앱은 장기적으로 Firebase Hosting으로 옮겨 same-site redirect 구성을 맞추는 것이 가장 안정적이다.
- 모바일/브라우저 정책 이슈를 줄이기 쉽다.
- 현재 Supabase OAuth redirect 방식과 UX가 가장 유사하다.

대응 함수:

- `getCurrentUser()`
- `onAuthStateChanged(callback)`
- `signInWithGoogle()`
- `signOut()`

## 6. Firestore 저장/복원 설계

### 조회

- 문서 경로: `userBackups/{uid}`
- 없으면 `{ exists: false }` 처리

### 복원

- 문서를 읽어 `tasks`, `cats`, `checks`, `version`, `updatedAtClient`, `updatedAt`를 반환

### 저장

저장은 Firestore transaction으로 처리한다.

절차:

1. 현재 문서를 transaction에서 읽는다.
2. 현재 서버 `version`을 확인한다.
3. 일반 업로드일 때:
   - 로컬 `baseVersion`과 서버 `version`이 다르면 충돌 에러
4. 강제 업로드일 때:
   - `version` 검사 없이 덮어쓴다.
5. 새 문서를 저장한다.
   - `version = serverVersion + 1` 또는 신규면 `1`
   - `updatedAt = serverTimestamp()`
   - `updatedAtClient = new Date().toISOString()`

### 충돌 규칙

현행 정책 유지:

- 서버가 더 최신이면 일반 업로드 차단
- 사용자는 `복원` 또는 `강제 업로드` 선택

## 7. 실시간 동기화 설계

현재 앱의 요구사항은 "다른 기기에서 변경되면 감지" 수준이다.

Firebase에서는 다음으로 대응한다.

- 기본: `onSnapshot(docRef, callback)`
- fallback polling: 유지 가능하지만 1차 구현에서는 제거 가능

권장안:

- 1차 이전에서는 `onSnapshot`만 사용
- 필요 시 `30초 polling`을 보조로 유지

이유:

- Firestore 실시간 리스너가 현재 요구사항을 충분히 충족한다.
- 코드 단순화 효과가 있다.

단, 안정성을 우선하면 현재 fallback 구조를 유지하는 것이 안전하다.

권장 최종안:

- `onSnapshot` 유지
- `30초 polling`도 유지

## 8. 보안 규칙 설계

Firestore Security Rules 초안:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /userBackups/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

추가 검증이 필요하면 필드 스키마 제한을 더 둘 수 있다.
초기 이전 단계에서는 위 규칙으로도 현재 Supabase RLS와 같은 권한 모델을 구현할 수 있다.

## 9. 프론트엔드 변경 범위

핵심 변경 파일:

- `index.html`
- `src/core/backup-service.js`
- `src/config/supabase-config.js` -> 이름 변경 권장
- `README.md`
- `build/*` 산출물

### 9.1 `index.html`

변경 내용:

- Supabase SDK script 제거
- Firebase Web SDK 로드 방식 추가

권장 방향:

- 현재 앱 구조와 맞추려면 초기에는 Firebase CDN/브라우저 빌드 사용
- 장기적으로는 npm 기반 모듈 번들링으로 전환 고려

### 9.2 설정 파일

현재:

- `src/config/supabase-config.js`

변경 권장:

- `src/config/firebase-config.js`

예상 구조:

```js
window.FIREBASE_CONFIG = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  appId: "...",
};
```

필요 시:

- `storageBucket`
- `messagingSenderId`

### 9.3 `src/core/backup-service.js`

이 파일을 Supabase 전용 구현에서 Firebase 구현으로 교체한다.

유지할 public interface:

- `getConfig`
- `hasRequiredConfig`
- `ensureInitialized`
- `getCurrentUser`
- `onAuthStateChanged`
- `signInWithGoogle`
- `signOut`
- `backupUserData`
- `restoreUserData`
- `fetchBackupMeta`
- `subscribeBackupChanges`

이 인터페이스를 유지하면 `src/App.js`는 거의 수정하지 않아도 된다.

## 10. 추천 구현 전략

두 가지 방식이 있다.

### 방식 A. 파일 교체형

- `backup-service.js` 내부 구현만 Firebase로 변경
- `App.js`는 최대한 유지

장점:

- 변경 범위가 작다.
- 회귀 위험이 낮다.

단점:

- Firebase 초기화 코드가 약간 우회적으로 들어갈 수 있다.

### 방식 B. 추상화 도입형

- `backup-service.js`를 facade로 유지
- 내부에 `supabase-adapter` / `firebase-adapter` 분리

장점:

- 이전/검증/롤백이 쉽다.
- 병행 운영 가능

단점:

- 현재 앱 규모에서는 다소 과할 수 있다.

### 권장

이 앱은 규모가 작아서 `방식 A`가 가장 현실적이다.
다만 데이터 이전 기간 동안 병행 테스트가 필요하면 짧게 `방식 B`를 쓰는 것도 괜찮다.

## 11. 데이터 이전 설계

### 목표

- 기존 Supabase 백업 사용자가 Firebase로 옮겨가도 데이터 손실이 없게 하기

### 이전 단위

- `public.user_backups` 각 행 1개 -> `userBackups/{uid}` 문서 1개

### 난점

Supabase Auth user id와 Firebase Auth uid는 기본적으로 다르다.

이 점이 가장 큰 설계 포인트다.

### 선택지

#### 선택지 1. 신규 사용자로 간주

- Firebase 로그인 후 새 문서 생성
- 기존 Supabase 데이터는 별도 이전하지 않음

장점:

- 가장 단순

단점:

- 기존 클라우드 백업 데이터가 이어지지 않음

#### 선택지 2. 1회 수동 마이그레이션

- 관리자가 Supabase `user_backups`를 export
- Firebase에 import
- 단, 사용자를 식별할 연결 키가 필요

문제:

- Firebase uid와 Supabase auth uid가 다르면 자동 매핑이 불가능

#### 선택지 3. 사용자 주도 마이그레이션

- 배포 전 안내:
  1. 기존 버전에서 `백업 복원`
  2. 동일 브라우저에서 로컬 데이터 확보
  3. Firebase 버전으로 앱 업데이트
  4. Firebase 로그인 후 `지금 백업`

장점:

- 서버 간 uid 매핑 문제를 피할 수 있다.
- 현재 앱 구조와 가장 잘 맞는다.

단점:

- 사용자에게 1회 행동이 필요하다.

### 권장 데이터 이전 방식

- 운영 현실성을 고려하면 `선택지 3`이 가장 안전하다.

보조안:

- 관리자 계정 몇 개만 직접 옮겨야 하면 별도 관리 도구/스크립트 작성

## 12. 단계별 실행 계획

### Phase 1. Firebase 프로젝트 준비

- Firebase 프로젝트 생성
- Authentication 활성화
- Google provider 활성화
- Firestore 생성
- 배포 도메인 등록
- 보안 규칙 적용

### Phase 2. 앱 연결부 준비

- Firebase config 파일 추가
- `index.html` SDK 교체
- `backup-service.js` Firebase 구현 작성

### Phase 3. 기능 연결

- 로그인
- 로그아웃
- 메타 조회
- 백업
- 복원
- 실시간 감지

### Phase 4. 회귀 테스트

- 로그인 성공
- 자동 백업
- 수동 백업
- 강제 업로드
- 충돌 감지
- 다른 탭/다른 기기 변경 감지
- 로그아웃 후 접근 차단

### Phase 5. 운영 전환

- README 갱신
- 사용자 이전 안내 배포
- Supabase 백업 종료 시점 결정

## 13. 테스트 시나리오

### 인증

- 비로그인 상태에서 백업 시 경고 출력
- Google 로그인 성공
- 로그아웃 성공
- 로그인 상태 유지 확인

### 저장/복원

- 신규 사용자 첫 백업
- 백업 후 복원
- `tasks`, `cats`, `checks` 무결성 검증

### 충돌

- 기기 A에서 백업
- 기기 B에서 이전 버전으로 일반 업로드 시 충돌 발생
- 기기 B에서 강제 업로드 성공

### 실시간

- 기기 A에서 백업
- 기기 B가 `onSnapshot` 또는 polling으로 최신 버전 감지

## 14. 리스크와 대응

### 리스크 1. UID 불일치로 기존 클라우드 백업 직접 이전이 어려움

대응:

- 사용자 주도 이전 절차 채택

### 리스크 2. Firebase SDK 로딩 방식 차이

대응:

- 1차는 CDN 기반으로 맞추고
- 안정화 후 npm 번들 방식 검토

### 리스크 3. transaction 실패/오프라인 이슈

대응:

- 충돌 제어는 온라인 전제
- 실패 메시지를 명확히 노출

### 리스크 4. 보안 규칙 오설정

대응:

- 배포 전 Firestore Rules 테스트 필수

## 15. 구현 우선순위

우선순위 1:

- Firebase Auth
- Firestore read/write
- Security Rules

우선순위 2:

- version transaction 충돌 제어
- 실시간 리스너

우선순위 3:

- README 정리
- 사용자 이전 가이드

## 16. 최종 권장안

이 앱은 Firebase로 충분히 이전 가능하다.

가장 안전한 경로는 다음이다.

1. Firebase Auth + Firestore로 `backup-service.js`를 교체
2. Firestore 문서 1개 per user 구조 유지
3. `version` 기반 충돌 제어를 Firestore transaction으로 재구현
4. 실시간은 `onSnapshot`, 안정성을 위해 30초 polling도 유지
5. 데이터 이전은 서버 간 직접 UID 매핑 대신 사용자 주도 이전 절차로 처리

## 17. 참고 문서

- Firebase Web setup: https://firebase.google.com/docs/web/setup
- Firebase alternative web setup: https://firebase.google.com/docs/web/alt-setup
- Firebase Google sign-in: https://firebase.google.com/docs/auth/web/google-signin
- Firebase auth state observer: https://firebase.google.com/docs/auth/web/manage-users
- Firestore realtime listeners: https://firebase.google.com/docs/firestore/query-data/listen
- Firestore transactions: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firestore security rules: https://firebase.google.com/docs/firestore/security/rules-conditions
