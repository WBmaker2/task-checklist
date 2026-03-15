# Supabase -> Firebase 전환 전략

## 목표

기존 Supabase 백업 데이터를 가능한 한 안전하게 Firebase로 이전하면서,
사용자 입장에서는 데이터 유실 없이 새 백업 체계로 넘어가게 한다.

## 현재 조건

- 기존 서버: Supabase Auth + `public.user_backups`
- 새 서버: Firebase Authentication + Firestore `userBackups/{uid}`
- 백업 데이터 구조:
  - `tasks`
  - `cats`
  - `checks`
  - `version`
  - `updated_at_client` / `updatedAtClient`
  - `updated_at` / `updatedAt`

## 핵심 제약

가장 큰 문제는 사용자 식별자다.

- Supabase 쪽 기본 키: `auth.users.id` 또는 `user_backups.user_id`
- Firebase 쪽 기본 키: `auth.uid`

둘은 기본적으로 같은 값이 아니다.
즉, DB 레코드만 단순 복사해도 어떤 Firebase 사용자에게 붙여야 하는지 자동으로 결정되지 않는다.

## 권장 전략

### 전략 A. 사용자 주도 이전

가장 안전하고 구현 비용이 낮다.
이 프로젝트 기준 권장안은 이 방식이다.

절차:

1. 기존 Supabase 앱에서 최신 백업을 로컬로 복원
2. Firebase 버전 앱에 로그인
3. Firebase에 `지금 백업`
4. 이후부터는 Firebase만 사용

장점:

- 사용자 이메일 매핑 로직이 필요 없다
- 관리자 권한 스크립트가 필요 없다
- 잘못된 계정 매핑 위험이 거의 없다

단점:

- 사용자가 직접 1회 이전 행동을 해야 한다
- 여러 기기 중 오래된 기기에서 이전하면 최신 백업이 아닐 수 있다

적합한 경우:

- 사용자 수가 많지 않다
- 앱 운영자가 직접 사용자 안내를 할 수 있다
- 기존 백업을 일괄 서버 이전할 필요가 없다

## 대안 전략

### 전략 B. 관리자 보조 이전

사용자 이메일을 기준으로 Supabase 백업을 Firebase 사용자에게 매핑한다.
자동화는 가능하지만 운영 리스크가 커진다.

필수 전제:

- Supabase 사용자 이메일을 조회할 수 있어야 한다
- Firebase에서 동일 이메일로 로그인한 사용자를 식별할 수 있어야 한다
- 이메일 기준 중복/비활성/탈퇴 계정을 처리해야 한다

절차:

1. Supabase에서 백업과 이메일 매핑을 추출
2. Firebase에서 로그인된 사용자 목록 또는 사용자 생성 정책 확보
3. 이메일 기준으로 `supabase_user_id -> firebase_uid` 매핑 테이블 생성
4. Firestore `userBackups/{firebase_uid}`에 변환 적재
5. 충돌 시 최신 `updated_at` 기준으로 우선순위 결정

장점:

- 사용자가 직접 이전하지 않아도 된다
- 운영자가 한 번에 많은 계정을 처리할 수 있다

단점:

- 잘못된 매핑이 생기면 다른 사용자 데이터로 덮어쓸 수 있다
- 관리자 권한 스크립트와 검증 절차가 필요하다
- 이메일 변경 이력이나 중복 계정이 있으면 정리가 어렵다

적합한 경우:

- 사용자 수가 많다
- 운영자가 데이터 검증 절차를 감당할 수 있다
- 사용자 개입을 최소화해야 한다

## 이 프로젝트에서의 최종 권장안

1차 전환은 전략 A로 진행한다.

이유:

- 지금 앱은 백업 데이터 구조가 단순하다
- Firebase 로그인만 준비되면 프런트엔드만으로 이전 가능하다
- `uid` 불일치 문제를 회피할 수 있다
- 운영 실수를 가장 줄일 수 있다

## 사용자 이전 운영안

운영 공지 예시 흐름:

1. 기존 버전 앱에서 로그인
2. `백업 복원`으로 서버 최신 데이터 확인
3. 새 Firebase 버전 앱 접속
4. Google 로그인
5. `지금 백업` 실행
6. 이전 완료 후 기존 Supabase 백업은 읽기 전용 기간을 거쳐 종료

## 권장 전환 단계

### 1단계. Firebase 버전 배포

- 새 앱을 배포하되 사용자 안내 문구를 함께 제공
- 첫 로그인 후 `백업 없음`이면 이전 안내를 노출

### 2단계. 이전 유예 기간 운영

- 일정 기간 Supabase 백업은 유지
- 사용자는 필요 시 기존 앱에서 최신 데이터를 먼저 확인

### 3단계. 이전 완료 확인

- 운영자가 Firebase 쪽 `userBackups` 문서 수를 확인
- 활성 사용자 대비 이전률을 체크

### 4단계. Supabase 종료

- 충분한 유예 기간 후 Supabase 백업 쓰기를 중단
- 필요 시 읽기 전용으로 짧게 유지
- 최종 아카이브 후 제거

## 관리자 보조 이전을 해야 할 때 필요한 데이터

Supabase에서 최소한 아래 정보가 필요하다.

```sql
select
  ub.user_id,
  u.email,
  ub.tasks,
  ub.cats,
  ub.checks,
  ub.updated_at_client,
  ub.updated_at,
  ub.version
from public.user_backups ub
join auth.users u
  on u.id = ub.user_id;
```

이 결과를 기준으로 Firebase 쪽 사용자 이메일과 매칭해야 한다.

## Firestore 적재 형태

적재 대상 문서 예시:

```json
{
  "tasks": [],
  "cats": [],
  "checks": {},
  "version": 1,
  "updatedAtClient": "2026-03-15T11:57:18.847Z",
  "updatedAt": "server timestamp"
}
```

문서 경로:

- `userBackups/{firebase_uid}`

## 충돌 처리 원칙

관리자 보조 이전 시 아래 원칙을 권장한다.

1. Firebase에 이미 문서가 있으면 기본적으로 덮어쓰지 않는다
2. 필요한 경우에만 `updatedAtClient` 또는 `updatedAt` 기준 최신 문서 우선
3. 충돌 계정은 자동 처리하지 말고 검토 목록으로 분리

## 실제 전환에서 꼭 남겨야 할 로그

- 이전 시각
- 대상 이메일
- Supabase 사용자 ID
- Firebase UID
- 이전 성공/실패
- 실패 사유

## 아직 남아 있는 운영 입력값

- 실제 운영 도메인
- 사용자 공지 방식
- Supabase 종료 유예 기간

## 결론

이 프로젝트는 기술적으로는 서버 일괄 이전도 가능하지만,
운영 리스크까지 고려하면 `사용자 주도 이전`이 가장 안전하다.

운영자가 원하면 다음 단계로 이어서 만들 수 있다.

1. 사용자 이전 안내 문구/배너 추가
2. Supabase 백업 export 스크립트 초안 작성
3. 이메일 매핑 기반 관리자 이전 스크립트 설계
