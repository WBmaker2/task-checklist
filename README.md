# task-checklist

학급 업무 체크리스트 웹앱입니다.

## 구조

- `index.html`: 배포 엔트리 파일 (Babel 런타임 미사용)
- `scripts/build.mjs`: JSX 사전 컴파일 스크립트(esbuild)
- `build/*`: 배포 산출물(JS/CSS/아이콘)
- `styles/main.css`: 원본 전역 스타일
- `src/core/*`: 상수/테마/유틸/공통 컴포넌트/백업 서비스
- `src/pages/*`: 화면 단위 컴포넌트
- `src/config/firebase-config.js`: dev/prod Firebase 연결 설정

## 개발/배포

```bash
npm install
npm run build
```

- `npm run build` 실행 시 `src/*.js`(JSX 포함)를 `build/src/*.js`로 사전 컴파일합니다.
- 배포 시 `index.html`은 `build/*` 산출물만 로드하며, 브라우저 Babel(`babel-standalone`)을 사용하지 않습니다.

## 백업

백업 기능은 **Firebase Authentication + Cloud Firestore**로 동작합니다.

일반 사용자는 설정 입력 없이:
- Google 로그인
- `지금 백업`
- `백업 복원`
만 사용하면 됩니다.

추가 동기화 동작:
- 로컬 데이터가 변경되면 1분 후 자동 백업 시도
- 로그인 시 서버 버전이 더 최신이면 다운로드(복원) 여부 확인
- 서버 버전이 더 최신이면 일반 업로드 차단
- 필요 시 `강제 업로드`로 서버 덮어쓰기 가능 (명시적 확인 필요)
- 다른 기기 백업 감지: Firestore 실시간 리스너 + 30초 폴링으로 상태 갱신

## 관리자 1회 설정

### 1) Firebase 프로젝트 준비

1. Firebase 프로젝트 생성
2. Authentication > Sign-in method에서 Google 활성화
3. Authentication > Settings > Authorized domains에 운영/개발 도메인 등록
4. Firestore Database 생성

### 2) Firestore Rules 적용

Firestore Rules에 아래를 적용합니다:

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

백업 문서는 `userBackups/{uid}` 경로에 저장됩니다.
문서에는 `tasks`, `cats`, `checks`, `version`, `updatedAtClient`, `updatedAt` 필드가 들어갑니다.

`version` 필드는 동기화 충돌 방지용으로 사용됩니다. (백업 시 자동 증가)

### 3) 앱 연결값 입력 (코드 1회)

`src/config/firebase-config.js`에 Firebase Web App 설정값을 입력합니다.
이 저장소는 기본적으로:
- `localhost`, `127.0.0.1` -> `dev`
- 그 외 호스트 -> `prod`
로 자동 선택합니다.

로컬에서 강제로 환경을 바꾸려면 URL에 `?firebaseEnv=dev` 또는 `?firebaseEnv=prod`를 붙이면 됩니다.

```js
window.FIREBASE_CONFIGS = {
  dev: {
    apiKey: "DEV_API_KEY",
    authDomain: "DEV_PROJECT.firebaseapp.com",
    projectId: "DEV_PROJECT_ID",
    appId: "DEV_APP_ID",
    storageBucket: "DEV_PROJECT.firebasestorage.app",
    messagingSenderId: "DEV_MESSAGING_SENDER_ID",
  },
  prod: {
    apiKey: "PROD_API_KEY",
    authDomain: "PROD_PROJECT.firebaseapp.com",
    projectId: "PROD_PROJECT_ID",
    appId: "PROD_APP_ID",
    storageBucket: "PROD_PROJECT.firebasestorage.app",
    messagingSenderId: "PROD_MESSAGING_SENDER_ID",
  },
};
```

현재 준비된 Firebase 프로젝트:
- dev: `task-checklist-dev`
- prod: `task-checklist-prod`

운영 도메인은 `Authentication > Settings > Authorized domains`에 실제 서비스 도메인을 추가해야 합니다.
이 값은 사용자 입력 UI에 노출되지 않으며, 배포 후 일반 사용자는 Google 로그인만 하면 됩니다.
