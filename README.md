# task-checklist

학급 업무 체크리스트 웹앱입니다.

## 구조

- `index.html`: 배포 엔트리 파일 (Babel 런타임 미사용)
- `scripts/build.mjs`: JSX 사전 컴파일 스크립트(esbuild)
- `build/*`: 배포 산출물(JS/CSS/아이콘)
- `styles/main.css`: 원본 전역 스타일
- `src/core/*`: 상수/테마/유틸/공통 컴포넌트/백업 서비스
- `src/pages/*`: 화면 단위 컴포넌트
- `src/config/supabase-config.js`: Supabase 연결 설정

## 개발/배포

```bash
npm install
npm run build
```

- `npm run build` 실행 시 `src/*.js`(JSX 포함)를 `build/src/*.js`로 사전 컴파일합니다.
- 배포 시 `index.html`은 `build/*` 산출물만 로드하며, 브라우저 Babel(`babel-standalone`)을 사용하지 않습니다.

## 백업

백업 기능은 **Supabase + Google OAuth**로 동작합니다.

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
- 다른 기기 백업 감지: Realtime + 30초 폴링으로 상태 갱신

## 관리자 1회 설정

### 1) Supabase 프로젝트 준비

1. Supabase 프로젝트 생성
2. Auth > Providers > Google 활성화
3. Auth > URL Configuration에서 사이트 URL/리다이렉트 URL 등록

### 2) 백업 테이블 생성

SQL Editor에서 아래 실행:

```sql
create table if not exists public.user_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tasks jsonb not null default '[]'::jsonb,
  cats jsonb not null default '[]'::jsonb,
  checks jsonb not null default '{}'::jsonb,
  updated_at_client timestamptz,
  updated_at timestamptz not null default now(),
  version int not null default 1
);

alter table public.user_backups enable row level security;

create policy "Users can read own backup"
on public.user_backups for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own backup"
on public.user_backups for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own backup"
on public.user_backups for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

`version` 컬럼은 동기화 충돌 방지용으로 사용됩니다. (백업 시 자동 증가)

실시간 동기화 반응 속도를 높이려면 Supabase Dashboard > Database > Replication에서 `user_backups` 테이블을 포함해 주세요.
미설정이어도 앱은 30초 폴링으로 최신 상태를 확인합니다.

### 3) 앱 연결값 입력 (코드 1회)

`src/config/supabase-config.js`에 프로젝트 URL/anon key를 입력합니다.

```js
window.SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY",
  redirectTo: window.location.origin + window.location.pathname,
};
```

이 값은 사용자 입력 UI에 노출되지 않으며, 배포 후 일반 사용자는 Google 로그인만 하면 됩니다.
