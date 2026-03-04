# task-checklist

학급 업무 체크리스트 웹앱입니다.

## 구조

- `index.html`: 엔트리 파일
- `styles/main.css`: 전역 스타일
- `src/core/*`: 상수/테마/유틸/공통 컴포넌트/백업 서비스
- `src/pages/*`: 화면 단위 컴포넌트
- `src/config/firebase-config.js`: Firebase 설정

## 백업(신규)

권장 백엔드 서비스는 **Firebase**입니다.

이 앱은 다음 조합으로 백업을 지원합니다.
- 인증: Google 로그인(Firebase Auth)
- 저장: Firestore

### 1) Firebase 프로젝트 준비

1. Firebase 콘솔에서 프로젝트 생성
2. Authentication > Sign-in method에서 `Google` 활성화
3. Firestore Database 생성
4. 프로젝트 설정 > 웹 앱 추가 후 `firebaseConfig` 값 확보

### 2) 앱 연결

아래 둘 중 하나로 설정할 수 있습니다.

- 앱 내 `백업` 탭에서 설정값 입력 후 `설정 저장`
- 또는 `src/config/firebase-config.js`에 직접 값 입력

필수 값:
- `apiKey`
- `authDomain`
- `projectId`
- `appId`

### 3) Firestore 보안 규칙 예시

아래 규칙은 사용자 본인 문서만 읽기/쓰기 허용합니다.

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /checklistBackups/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 사용 방법

- 하단 `백업` 메뉴로 이동
- Google 로그인
- `지금 백업` 클릭
- 필요할 때 `백업 복원` 클릭
