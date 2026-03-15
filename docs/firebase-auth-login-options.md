# Firebase Auth 로그인 대체안 비교

이 문서는 현재 `task-checklist` 앱의 Google 로그인 흐름에서 `signInWithPopup()`을 대체할 수 있는 구현안을 비교하고,
`GitHub Pages 유지`와 `Firebase Hosting 이전`까지 포함한 의사결정 기준을 정리한 설계 문서다.

관련 문서:

- [firebase-console-checklist.md](./firebase-console-checklist.md)
- [firebase-migration-plan.md](./firebase-migration-plan.md)

## 1. 현재 상태

현재 앱의 인증 구성은 다음과 같다.

- 호스팅: `GitHub Pages`
  - 운영 URL: `https://wbmaker2.github.io/task-checklist/`
- Firebase 프로젝트: `task-checklist-prod`
- 인증 방식: `Firebase Authentication + Google provider`
- 현재 로그인 구현: `signInWithPopup()`
- SDK 로딩 방식: Firebase compat CDN

구현 위치:

- Google 로그인 호출: `src/core/backup-service.js`
- Firebase compat SDK 로딩: `index.html`

## 2. 관찰된 문제

실제 배포 URL에서 Google 로그인 시도 시 다음 현상이 확인되었다.

- Google 계정 선택 화면까지는 진입함
- 이후 popup 복귀 단계에서 로그인 완료가 불안정함
- 브라우저 콘솔에 다음 오류가 반복됨
  - `Cross-Origin-Opener-Policy policy would block the window.closed call`
  - `@firebase/auth: Auth (12.0.0): INTERNAL ASSERTION FAILED: Pending promise was never set`

이 상황은 `Authorized domains` 누락보다는,
현재 배포 환경에서 popup helper 흐름이 안정적으로 마무리되지 않는 문제로 해석하는 것이 더 타당하다.

## 3. 설계 목표

이번 로그인 대체안 비교의 목표는 아래와 같다.

- Google 로그인 성공률을 높일 것
- 모바일/브라우저 정책 변화에 덜 흔들릴 것
- 현재 Firestore 백업 구조는 그대로 유지할 것
- 정적 사이트 운영 비용을 과도하게 늘리지 않을 것
- 운영 복잡도와 향후 유지보수 비용을 함께 고려할 것

로그인 방식이 바뀌더라도 아래 불변 조건은 유지해야 한다.

- Firebase Auth 사용자 식별자는 계속 `uid`를 사용
- Firestore 경로는 계속 `userBackups/{uid}` 사용
- 백업/복원/실시간 감지 로직의 public interface는 최대한 유지

## 4. 비교 기준

대안을 비교할 때 아래 기준을 사용한다.

- 구현 변경량
- 현재 GitHub Pages 구조와의 적합성
- 브라우저 호환성 및 로그인 안정성
- 모바일 환경 적합성
- 운영/배포 복잡도
- 장기 유지보수성

## 5. 대안 비교

### 대안 A. 현행 유지: `signInWithPopup()`

구성:

- 호스팅은 `GitHub Pages` 유지
- 인증은 Firebase compat SDK의 `signInWithPopup()` 유지

장점:

- 현재 코드 변경이 가장 적다
- 추가 인프라 변경이 없다

단점:

- 이미 실제 배포 URL에서 popup 복귀 단계가 깨지고 있다
- 브라우저 정책, popup blocker, COOP/COEP 영향에 취약하다
- Google 계정의 추가 인증 단계(패스키, 비밀번호 재확인)에서 더 불안정해질 수 있다

판단:

- 현재 문제를 해결하는 대안으로는 부적합하다

### 대안 B. `signInWithRedirect()`만 단순 교체

구성:

- 호스팅은 `GitHub Pages` 유지
- `signInWithPopup()`을 `signInWithRedirect()` + `getRedirectResult()`로 단순 치환

장점:

- popup보다 모바일 UX는 나아질 수 있다
- 코드 변경량은 비교적 작다

단점:

- Firebase 공식 문서 기준으로, 비-Firebase 호스팅 환경에서는 redirect 흐름이 third-party storage 제한 영향을 받을 수 있다
- 현재 배포 주소는 `https://wbmaker2.github.io/task-checklist/`처럼 서브패스 기반 project site라서, same-site 인증 helper 구성이 애매하다
- 단순 치환만으로는 근본 문제가 해결되지 않을 가능성이 높다

판단:

- 구현은 쉬워 보이지만 실제 성공률 관점에서는 추천하지 않는다

### 대안 C. `Google Identity Services` + `signInWithCredential()`

구성:

- 호스팅은 `GitHub Pages` 유지
- Google 로그인 UI는 Firebase popup/redirect helper 대신 `Google Identity Services`를 사용
- 받은 ID token을 Firebase Auth의 `signInWithCredential()`로 연결

장점:

- Firebase popup/redirect helper 의존성을 제거할 수 있다
- 현재처럼 정적 사이트 + 외부 호스팅 구조에서 가장 현실적인 우회책이다
- Firebase Auth와 Firestore 데이터 구조는 그대로 유지할 수 있다

단점:

- 구현량이 늘어난다
- Google Identity Services용 버튼/토큰 콜백 처리와 오류 처리 흐름을 새로 만들어야 한다
- 현재 CDN compat 구조보다 모듈화가 덜 깔끔해질 수 있다

판단:

- `호스팅은 그대로 두고 로그인만 안정화`하려는 경우 가장 현실적인 단기 1순위다

### 대안 D. `GitHub Pages` 유지 + redirect helper 우회 구성

구성 후보:

- Firebase redirect best practices의 proxy/self-host 계열 옵션 적용

장점:

- 이론상 redirect 기반 흐름을 유지할 수 있다

단점:

- reverse proxy 방식은 `GitHub Pages`에서 구현할 수 없다
- self-host helper 방식도 현재 project site 서브패스 구조와 잘 맞지 않는다
- 운영 문서화와 디버깅 비용이 커진다

판단:

- 현재 배포 구조에서는 실익이 낮다

### 대안 E. `Firebase Hosting`으로 이전 + `signInWithRedirect()`

구성:

- 호스팅을 `GitHub Pages`에서 `Firebase Hosting`으로 이전
- 앱을 same-site 도메인으로 서빙
- Firebase Auth redirect 흐름을 공식 권장 구조에 가깝게 맞춤

장점:

- 인증과 호스팅이 같은 플랫폼으로 정리되어 구조가 단순해진다
- redirect 흐름 안정성을 높일 수 있다
- 장기적으로는 가장 관리하기 쉬운 구조다
- GitHub Pages 서브패스 제약을 제거할 수 있다

단점:

- 배포 인프라 변경이 필요하다
- 기존 GitHub Actions Pages 배포 흐름을 재구성해야 한다
- 실제 운영 도메인 변경 또는 연결 작업이 필요할 수 있다

판단:

- 인프라 변경까지 허용된다면 장기 1순위다

## 6. 요약 비교표

| 대안 | 호스팅 | 로그인 방식 | 구현 난이도 | 안정성 | 인프라 변경 | 추천도 |
| --- | --- | --- | --- | --- | --- | --- |
| A | GitHub Pages | Popup | 낮음 | 낮음 | 없음 | 낮음 |
| B | GitHub Pages | Redirect 단순 치환 | 낮음 | 낮음~보통 | 없음 | 낮음 |
| C | GitHub Pages | GIS + Credential | 보통 | 보통~높음 | 없음 | 높음 |
| D | GitHub Pages | Redirect helper 우회 | 높음 | 보통 | 우회 구성 필요 | 낮음 |
| E | Firebase Hosting | Redirect | 보통~높음 | 높음 | 있음 | 높음 |

## 7. 권장안

현재 상황에서는 목표를 두 단계로 나누는 것이 가장 안전하다.

### 권장안 1. 빠른 안정화가 목표일 때

선택:

- `GitHub Pages 유지`
- `Google Identity Services + signInWithCredential()`

이유:

- 배포 인프라를 유지한 채 로그인 문제만 분리해서 해결할 수 있다
- 현재 문제의 핵심인 Firebase popup helper 의존성을 제거할 수 있다
- 사용자 데이터 모델과 백업 구조를 거의 건드리지 않는다

적합한 경우:

- 지금 운영 URL을 유지해야 한다
- 인증 실패를 빠르게 줄이는 것이 우선이다
- 배포 구조 변경은 다음 단계로 미루고 싶다

### 권장안 2. 구조 정리를 같이 하고 싶을 때

선택:

- `Firebase Hosting`으로 이전
- `signInWithRedirect()` 사용

이유:

- 인증 helper와 호스팅 도메인을 같은 플랫폼 안에 둘 수 있다
- 향후 Firebase Auth 관련 브라우저 호환성 이슈 대응이 더 단순해진다
- Pages 전용 예외 처리를 줄일 수 있다

적합한 경우:

- 로그인 안정성을 장기적으로 확보하고 싶다
- 호스팅 이전도 이번에 같이 진행할 수 있다
- 배포 방식 변경을 감당할 수 있다

## 8. Firebase Hosting 이전안 상세

### 8.1 목표 구조

권장 목표 구조:

- 개발: `task-checklist-dev.web.app` 또는 dev 전용 Hosting 사이트
- 운영: `task-checklist-prod.web.app` 또는 커스텀 도메인
- Firebase Auth `authDomain`은 실제 서비스 도메인과 일치 또는 same-site 원칙에 맞게 정리

### 8.2 기대 효과

- 현재 `GitHub Pages`의 서브패스 배포 제약 제거
- 로그인 redirect 흐름을 Firebase 문서 권장 구조에 더 가깝게 구성 가능
- Pages Actions와 Firebase 설정이 분산되는 문제 완화

### 8.3 필요한 작업

1. Firebase Hosting 활성화
2. `firebase.json`과 배포 스크립트 추가
3. GitHub Actions 배포 대상을 `Pages`에서 `Firebase Hosting`으로 전환
4. 운영 도메인 연결 여부 결정
5. `FIREBASE_CONFIG_*`와 Hosting 배포용 인증 비밀값 구성
6. 로그인 흐름을 `redirect` 기준으로 정리
7. 배포 후 실제 모바일/데스크톱 브라우저 검증

### 8.4 영향 받는 파일

예상 변경 파일:

- `src/core/backup-service.js`
- `index.html`
- `package.json`
- `.github/workflows/*`
- 신규 `firebase.json`
- 신규 `.firebaserc` 또는 CI 기반 Hosting target 설정
- README 및 운영 문서

### 8.5 리스크

- 배포 인프라가 바뀌므로, 인증 문제 외에도 배포 실패 가능성이 추가된다
- 현재 GitHub Pages URL을 바로 대체할 경우 캐시/북마크/운영 안내 수정이 필요하다
- Firebase Hosting 전환 직후에는 인증보다 배포 설정에서 시간을 더 쓸 수 있다

## 9. 단계별 실행안

### 시나리오 1. 로그인 문제를 먼저 푼다

1. `GitHub Pages` 유지
2. `Google Identity Services + signInWithCredential()` 구현
3. 로그인 안정화 확인
4. 필요 시 나중에 Hosting 이전 검토

이 시나리오는 가장 빠른 복구 경로다.

### 시나리오 2. 이번에 호스팅까지 정리한다

1. Firebase Hosting 구성
2. staging 또는 dev 도메인에서 redirect 로그인 검증
3. 운영 배포 전환
4. GitHub Pages는 보조 또는 종료

이 시나리오는 변경량은 크지만 최종 구조는 더 깔끔하다.

## 10. 최종 판단

현재 앱이 반드시 `GitHub Pages`에 남아야 한다면,
가장 현실적인 구현안은 `Google Identity Services + signInWithCredential()`이다.

반대로 `로그인 안정성 + 운영 구조 단순화`를 같이 달성하고 싶다면,
가장 좋은 장기안은 `Firebase Hosting + signInWithRedirect()`다.

즉, 결론은 다음과 같다.

- 빠른 수정 우선: `GitHub Pages 유지 + GIS`
- 장기 구조 우선: `Firebase Hosting 이전 + Redirect`

## 11. 참고 문서

- Firebase Google sign-in:
  - https://firebase.google.com/docs/auth/web/google-signin
- Firebase redirect best practices:
  - https://firebase.google.com/docs/auth/web/redirect-best-practices
- Firebase API keys:
  - https://firebase.google.com/docs/projects/api-keys
