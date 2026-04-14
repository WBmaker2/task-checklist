# task-checklist

학급 업무 체크리스트 웹앱입니다.

## 구조

- `index.html`: 배포 엔트리 파일 (Babel 런타임 미사용)
- `scripts/build.mjs`: JSX 사전 컴파일 스크립트(esbuild)
- `scripts/prepare-dist.mjs`: 정적 배포용 `dist/` 아티팩트 생성 스크립트
- `build/*`: 로컬 빌드 산출물(JS/CSS/아이콘, git 미추적)
- `dist/*`: Firebase Hosting 배포 아티팩트(git 미추적)
- `styles/main.css`: 원본 전역 스타일
- `src/core/*`: 상수/테마/유틸/공통 컴포넌트/백업 서비스
- `src/pages/*`: 화면 단위 컴포넌트
- `src/config/firebase-config.js`: 빌드 시 자동 생성되는 dev/prod Firebase 연결 설정
- `firebase.json`: Firebase Hosting 설정
- `.firebaserc`: Firebase 프로젝트 alias

## 개발/배포

```bash
npm install
cp .env.example .env.local
# .env.local 값을 실제 Firebase 값으로 수정
npm run test:env-file
npm run test:build-mode
npm run test:firebase-config
npm run test:preview-script
npm run test:sync
npm run build
```

- `cp .env.example .env.local`로 로컬 Firebase 설정 파일 초안을 만들 수 있습니다.
- `npm run test:env-file`는 ` .env.local ` 파일만으로 엄격 빌드와 배포용 아티팩트 생성이 가능한지 검증합니다.
- `npm run test:build-mode`는 로컬 허용 빌드와 배포용 엄격 빌드가 각각 기대한 방식으로 동작하는지 검증합니다.
- `npm run test:firebase-config`는 호스트별 Firebase 환경 선택 규칙(특히 미등록 호스트 안전 기본값)을 검증합니다.
- `npm run test:preview-script`는 `preview:hosting` 진입점과 README preview 안내가 같이 유지되는지 검증합니다.
- `npm run test:sync`는 백업 버전 증가 / 충돌 차단 / 서버 최신 비교 관련 핵심 동기화 스모크 테스트를 실행합니다.
- `npm run build`는 로컬 확인용 빌드입니다. Firebase 환경변수가 비어 있어도 빌드는 진행되며, 누락 값은 경고와 함께 빈 값으로 남습니다.
- `npm run build:strict`는 Firebase 환경변수가 모두 준비된 경우에만 통과하는 엄격 빌드입니다.
- `npm run build:hosting`은 `build:strict`를 먼저 실행한 뒤 `index.html`, `favicon.ico`, `build/*`를 `dist/`로 모아 Firebase Hosting 업로드용 아티팩트를 만듭니다.
- `npm run preview:hosting`은 `build:hosting`을 먼저 실행한 뒤 `dist/`를 기준으로 정적 서버를 띄웁니다. 기본 포트는 `4175`입니다.
- 배포 시 `index.html`은 `build/*` 산출물만 로드하며, 브라우저 Babel(`babel-standalone`)을 사용하지 않습니다.
- `npm run serve`는 항상 `npm run build`를 먼저 실행한 뒤 정적 서버를 띄웁니다.

로컬에서는 셸 `export` 대신 ` .env.local ` 파일을 두면 됩니다. 명시적으로 넘긴 셸 환경변수는 ` .env.local `보다 우선합니다.

배포 아티팩트가 필요할 때는 아래처럼 ` .env.local ` 또는 셸 환경변수를 먼저 준비한 뒤 실행합니다.

```bash
npm run build:hosting
```

호스팅용 결과물을 로컬에서 바로 확인하려면 아래 명령을 사용합니다.

```bash
npm run preview:hosting
```

## 릴리스 관리

버전 번호는 `package.json`을 기준으로 관리합니다.

```bash
npm run release:patch -- "변경 요약"
```

- 위 명령은 patch 버전을 1 올리고, 아래 파일을 함께 동기화합니다.
- `package.json`
- `package-lock.json`
- `src/App.js`의 앱 표시 버전
- `index.html`의 배포용 캐시 버스터 쿼리
- `CHANGELOG.md`의 새 버전 섹션

필요하면 `release:minor`, `release:major`, `release:sync`도 사용할 수 있습니다.
- `release:sync`: 현재 `package.json` 버전을 기준으로 표시 버전 / 캐시 버스터 / changelog만 맞춥니다.

## 백업

백업 기능은 **Firebase Authentication + Cloud Firestore**로 동작합니다.

일반 사용자는 설정 입력 없이:
- Google 로그인
- `지금 백업`
- `백업 복원`
- 로컬 JSON `내보내기 / 가져오기`
만 사용하면 됩니다.

추가 동기화 동작:
- 로컬 데이터가 변경되면 1분 후 자동 백업 시도
- 로그인 시 서버 버전이 더 최신이면 다운로드(복원) 여부 확인
- 서버 버전이 더 최신이면 일반 업로드 차단
- 필요 시 `강제 업로드`로 서버 덮어쓰기 가능 (명시적 확인 필요)
- 다른 기기 백업 감지: Firestore 실시간 리스너 + 30초 폴링으로 상태 갱신
- 로컬 JSON 가져오기는 현재 기기 데이터만 바꾸며, 이후 필요 시 클라우드에 다시 백업하면 됩니다.

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

### 3) 앱 연결값 준비 (빌드 시 자동 생성)

이 저장소는 Firebase 설정 파일을 git에 커밋하지 않습니다.
빌드 시 `scripts/generate-firebase-config.mjs`가 환경변수에서 값을 읽어 `src/config/firebase-config.js`를 자동 생성합니다.

기본 동작은:
- `localhost`, `127.0.0.1` -> `dev`
- dev/prod에 등록된 Hosting 도메인 -> 해당 env
- 나머지(미등록) 호스트 -> `dev` (preview/review 배포에서 실수로 prod를 바라보지 않도록 안전 기본값)

배포된 호스트가 dev/prod Hosting 도메인으로 인식되면,
빌드에 들어 있던 `authDomain` 대신 현재 호스트명을 사용해 same-site redirect 로그인 구성을 우선합니다.

로컬에서 강제로 환경을 바꾸려면 URL에 `?firebaseEnv=dev` 또는 `?firebaseEnv=prod`를 붙이면 됩니다.

환경변수는 JSON 문자열 2개와 선택적인 호스트 목록 2개를 사용합니다. 가장 쉬운 방법은 저장소 루트에 ` .env.local `을 두는 것입니다:

```bash
cp .env.example .env.local
```

직접 셸에 넣고 싶다면 아래 형식을 사용할 수 있습니다:

```bash
export FIREBASE_CONFIG_DEV_JSON='{"apiKey":"DEV_API_KEY","authDomain":"task-checklist-dev.firebaseapp.com","projectId":"task-checklist-dev","appId":"DEV_APP_ID","storageBucket":"task-checklist-dev.firebasestorage.app","messagingSenderId":"DEV_SENDER_ID"}'
export FIREBASE_CONFIG_PROD_JSON='{"apiKey":"PROD_API_KEY","authDomain":"task-checklist-prod.firebaseapp.com","projectId":"task-checklist-prod","appId":"PROD_APP_ID","storageBucket":"task-checklist-prod.firebasestorage.app","messagingSenderId":"PROD_SENDER_ID"}'
export FIREBASE_ENV_HOSTS_DEV='task-checklist-dev.web.app,task-checklist-dev.firebaseapp.com'
export FIREBASE_ENV_HOSTS_PROD='task-checklist-prod.web.app,task-checklist-prod.firebaseapp.com'
npm run build:hosting
```

현재 ` .env.local ` 파서는 단순한 `KEY=VALUE` 형식, 선택적인 `export` 접두사, 한 줄짜리 따옴표 값만 지원합니다. JSON 문자열은 예시처럼 작은따옴표로 감싸는 방식을 권장합니다.

운영에서 커스텀 도메인을 쓰면 `FIREBASE_ENV_HOSTS_PROD`에 함께 추가합니다.

현재 준비된 Firebase 프로젝트:
- dev: `task-checklist-dev`
- prod: `task-checklist-prod`

운영 도메인은 `Authentication > Settings > Authorized domains`에 실제 서비스 도메인을 추가해야 합니다.
`signInWithRedirect()`를 Firebase Hosting 커스텀 도메인에서 쓸 경우에는 Google Cloud OAuth client의 승인된 redirect URI에도 `https://<실제도메인>/__/auth/handler`를 추가해야 합니다.
이 값은 사용자 입력 UI에 노출되지 않으며, 배포 후 일반 사용자는 Google 로그인만 하면 됩니다.

### 4) Firebase Hosting 배포용 Secrets

GitHub Actions로 Firebase Hosting에 배포할 경우 저장소 Secrets에 아래 값을 넣습니다.

- `FIREBASE_CONFIG_DEV_JSON`
- `FIREBASE_CONFIG_PROD_JSON`
- `FIREBASE_ENV_HOSTS_DEV`
- `FIREBASE_ENV_HOSTS_PROD`
- `FIREBASE_SERVICE_ACCOUNT_TASK_CHECKLIST_PROD`

`FIREBASE_SERVICE_ACCOUNT_TASK_CHECKLIST_PROD`는 Firebase Console 또는 Google Cloud에서 발급한 서비스 계정 JSON 전체를 저장합니다.

현재 CI는 `main` 브랜치 push 시 Firebase Hosting의 `task-checklist-prod` 프로젝트로 `live` 배포합니다.

### 5) 운영 URL 메모

Firebase Hosting으로 옮기면 기본 운영 URL은 GitHub Pages가 아니라 아래와 같은 Firebase Hosting 주소가 됩니다.

- `https://task-checklist-prod.web.app`
- 또는 연결한 커스텀 도메인

운영 배포를 마친 뒤에는 아래 원칙으로 안내합니다.

- 배포 완료 메시지에 실제 접속 주소를 반드시 함께 적습니다.
- 현재 기본 운영 접속 주소는 `https://task-checklist-prod.web.app/` 입니다.

기존 `https://wbmaker2.github.io/task-checklist/` 주소는 Firebase Hosting으로 직접 대체할 수 없으므로,
필요하면 별도 안내 또는 redirect 전략을 운영 측면에서 같이 준비해야 합니다.
