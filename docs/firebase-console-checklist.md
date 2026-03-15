# Firebase Console Checklist

이 문서는 `task-checklist` 앱을 Firebase로 이전하기 전에 Firebase 콘솔에서 먼저 준비해야 할 설정을 체크리스트 형태로 정리한 문서다.

관련 설계 문서:

- [firebase-migration-plan.md](./firebase-migration-plan.md)

## 1. 먼저 결정할 것

Firebase 콘솔 설정에 들어가기 전에 아래 2가지를 먼저 정해야 한다.

### 1. 앱을 어디에 호스팅할 것인가

선택지:

- Firebase Hosting으로 같이 이전
- 기존 호스팅 유지
  - 예: Vercel, Netlify, GitHub Pages, 자체 도메인 등

이 결정이 중요한 이유:

- Firebase Auth의 `signInWithRedirect()`는 브라우저의 third-party storage 제한 영향을 받을 수 있다.
- Firebase 공식 문서상, `signInWithRedirect()`를 프로덕션에서 안정적으로 쓰려면 호스팅 방식에 맞는 추가 설정이 필요하다.

권장:

- 가능하면 Firebase Hosting 사용
- 기존 호스팅을 유지한다면 `redirect` 대신 `popup`을 고려하거나, Firebase Auth redirect best practices를 반드시 따라야 한다.

### 2. 로그인 방식을 무엇으로 할 것인가

선택지:

- `signInWithRedirect`
- `signInWithPopup`

권장:

- 현재 앱 UX를 유지하려면 `signInWithRedirect`
- 단, 기존 호스팅을 유지할 경우에는 `signInWithPopup`이 구현과 운영이 더 단순할 수 있다.

## 2. Firebase 프로젝트 준비

### 체크리스트

- [ ] Firebase 프로젝트 생성
- [ ] 프로젝트 이름 확정
- [ ] 연결할 Google Cloud 프로젝트 확인
- [ ] Google Analytics 사용 여부 결정

메모:

- Analytics는 이 앱의 백업/인증 기능에는 필수가 아니다.
- 초기 이전만 목표라면 Analytics 없이 시작해도 된다.

## 3. Web App 등록

Firebase 콘솔에서 Web App을 등록해야 한다.

### 체크리스트

- [ ] Firebase Console > Project Overview > Web App 추가
- [ ] 앱 닉네임 설정
- [ ] Firebase config 값 확보
  - `apiKey`
  - `authDomain`
  - `projectId`
  - `appId`
  - 필요 시 `storageBucket`
  - 필요 시 `messagingSenderId`

### 구현 반영 대상

- `src/config/firebase-config.js`
- `index.html`

## 4. Authentication 설정

이 앱은 Google 로그인만 필요하다.

### 체크리스트

- [ ] Firebase Console > Authentication 활성화
- [ ] Sign-in method 탭에서 `Google` provider 활성화
- [ ] 지원 이메일 설정
- [ ] 프로젝트 공개 상태 또는 테스트 상태 확인

### Authorized domains

다음 도메인을 `Authentication > Settings > Authorized domains`에서 확인한다.

- [ ] 개발 도메인 추가
  - 예: `localhost`
  - 예: `127.0.0.1`
- [ ] 운영 도메인 추가
  - 예: `your-domain.com`
  - 예: `www.your-domain.com`
- [ ] 실제 앱이 배포되는 정확한 도메인 확인

주의:

- 커스텀 도메인으로 배포한다면 그 도메인이 반드시 authorized domains에 있어야 한다.
- Firebase Hosting 커스텀 도메인을 쓸 경우 `authDomain`도 그 도메인으로 맞출지 검토해야 한다.

## 5. Redirect 방식 추가 확인

이 항목은 `signInWithRedirect()`를 사용할 때 특히 중요하다.

### 경우 1. Firebase Hosting 사용

체크리스트:

- [ ] Firebase Hosting 설정 완료
- [ ] 커스텀 도메인 사용 시 해당 도메인 연결 완료
- [ ] 필요 시 `authDomain`을 앱 서빙 도메인으로 설정할 계획 수립
- [ ] Google provider redirect 흐름 테스트 계획 수립

### 경우 2. 기존 호스팅 유지

체크리스트:

- [ ] 현재 호스팅이 Firebase Hosting이 아님을 확인
- [ ] Firebase redirect best practices 적용 방식 결정
  - Option 2, 3, 4, 5 중 선택 필요
- [ ] 또는 `signInWithPopup()`으로 단순화할지 결정

실무 권장:

- 기존 정적 호스팅을 계속 쓰고 인증 문제를 줄이고 싶다면 `popup` 방식이 더 단순할 수 있다.

## 6. Cloud Firestore 생성

이 앱의 백업 저장소는 Firestore를 기준으로 설계한다.

### 체크리스트

- [ ] Firebase Console > Firestore Database > Create database
- [ ] Firestore 위치(region) 선택
- [ ] 보안 모드 선택
  - 초기엔 테스트 모드로 시작 가능
  - 운영 전에는 rules 적용 필수

### 위치(region) 선택 기준

- [ ] 사용자 위치와 가까운 리전인지 확인
- [ ] 장기 운영 시 변경이 어렵다는 점 이해
- [ ] 인증/호스팅과 함께 운영할 위치 전략 검토

권장:

- 운영 전에 확정
- 테스트용 프로젝트와 운영 프로젝트를 분리하면 더 안전하다.

## 7. Firestore Security Rules 준비

이 앱은 사용자 본인 문서만 읽고 쓰면 된다.

초기 적용 규칙 예시:

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

### 체크리스트

- [ ] Firestore Rules 초안 작성
- [ ] `userBackups/{uid}` 패턴 기준으로 권한 검토
- [ ] 로그인 안 한 사용자는 차단되는지 확인
- [ ] 다른 사용자의 문서는 차단되는지 확인

운영 전 필수:

- [ ] 테스트 모드 rules를 그대로 두지 않기

## 8. Firestore 데이터 구조 확인

문서 경로:

- `userBackups/{uid}`

문서 필드:

- `tasks`
- `cats`
- `checks`
- `version`
- `updatedAtClient`
- `updatedAt`

### 체크리스트

- [ ] 컬렉션명 `userBackups`로 확정
- [ ] 문서 ID를 Firebase Auth `uid`로 확정
- [ ] `version` 필드 사용 유지 결정
- [ ] `updatedAt`는 Firestore server timestamp로 저장하기로 결정

## 9. Firebase SDK 사용 방식 결정

현재 앱은 UMD/CDN 방식으로 라이브러리를 불러온다.

### 선택지

- 현재 구조 유지: Firebase 브라우저 모듈 또는 compat/CDN 기반
- 구조 개선: npm 기반 SDK 번들링

### 체크리스트

- [ ] 1차 이전에서 어떤 SDK 로딩 방식을 쓸지 결정
- [ ] 기존 `index.html` 구조와 호환되는지 확인
- [ ] 장기적으로 npm 번들 방식으로 갈지 판단

권장:

- 1차 이전: 현재 구조에 맞춰 빠르게 붙이기
- 2차 개선: npm 기반 정리

## 10. 운영 도메인/OAuth 관련 확인

Google 로그인은 도메인 설정이 맞지 않으면 자주 실패한다.

### 체크리스트

- [ ] 실제 운영 URL 확정
- [ ] `continue_uri`에 쓰일 도메인 확인
- [ ] Firebase Auth authorized domains 반영
- [ ] 커스텀 `authDomain`을 쓸 경우 관련 redirect URL 검토
- [ ] 배포 환경이 여러 개면 각각 어떻게 처리할지 결정
  - 개발
  - 스테이징
  - 운영

## 11. 프로젝트 운영 구조 결정

권장 운영 방식:

- 개발용 Firebase 프로젝트
- 운영용 Firebase 프로젝트

### 체크리스트

- [ ] 개발/운영 프로젝트 분리 여부 결정
- [ ] 분리한다면 각 프로젝트별 config 관리 방식 결정
- [ ] 개발용 도메인과 운영용 도메인 구분

이유:

- Firestore rules 테스트와 실데이터 보호를 분리할 수 있다.

## 12. 기존 Supabase 데이터 이전 준비

Firebase 콘솔 설정만으로 해결되지는 않지만, 운영 전 미리 계획해야 한다.

### 체크리스트

- [ ] 기존 Supabase 백업 데이터를 계속 유지할지 결정
- [ ] 사용자 주도 이전 방식을 쓸지 결정
- [ ] Firebase 전환 공지 문구 필요 여부 확인
- [ ] 전환 기간 동안 Supabase를 병행 운영할지 결정

권장:

- 직접 UID 매핑 없이 사용자 주도 이전 방식

## 13. 배포 전 최종 콘솔 점검

배포 직전 최종 확인용 체크리스트:

- [ ] Web App 등록 완료
- [ ] Firebase config 확보 완료
- [ ] Authentication 활성화 완료
- [ ] Google provider 활성화 완료
- [ ] Authorized domains 등록 완료
- [ ] Firestore 생성 완료
- [ ] Firestore Rules 적용 완료
- [ ] 리전 설정 확인 완료
- [ ] 호스팅 방식에 맞는 redirect/popup 전략 확정
- [ ] 개발 프로젝트에서 로그인 테스트 가능 상태

## 14. 이 앱 기준 권장 설정

현재 `task-checklist` 기준으로는 아래 조합이 가장 현실적이다.

### 권장안 A

- Authentication: Google
- Database: Cloud Firestore
- 문서 경로: `userBackups/{uid}`
- 충돌 제어: Firestore transaction
- 실시간 감지: `onSnapshot`
- 보조 감지: 30초 polling 유지
- 로그인 방식: `signInWithRedirect`
- 호스팅: 가능하면 Firebase Hosting

### 권장안 B

- Authentication: Google
- Database: Cloud Firestore
- 로그인 방식: `signInWithPopup`
- 호스팅: 기존 호스팅 유지

권장안 B가 더 나은 경우:

- Firebase Hosting으로 옮길 계획이 아직 없음
- OAuth redirect 도메인 설정을 단순화하고 싶음

## 15. 구현 시작 전 제가 필요로 하는 결정

실제 구현을 시작하기 전에 아래 3가지만 확정되면 된다.

1. 호스팅 유지 vs Firebase Hosting 이전
2. `redirect` vs `popup`
3. 개발/운영 Firebase 프로젝트 분리 여부

이 3개가 정해지면 구현은 바로 들어갈 수 있다.

## 참고 문서

- Firebase Web setup: https://firebase.google.com/docs/web/setup
- Firebase Google sign-in: https://firebase.google.com/docs/auth/web/google-signin
- Firebase redirect best practices: https://firebase.google.com/docs/auth/web/redirect-best-practices
- Firestore quickstart: https://firebase.google.com/docs/firestore/quickstart
- Firestore security rules conditions: https://firebase.google.com/docs/firestore/security/rules-conditions
