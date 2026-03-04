# task-checklist

학급 업무 체크리스트 웹앱입니다.

## 구조

- `index.html`: 엔트리 파일
- `styles/main.css`: 전역 스타일
- `src/core/*`: 상수/테마/유틸/공통 컴포넌트/백업 서비스
- `src/pages/*`: 화면 단위 컴포넌트
- `src/config/supabase-config.js`: Supabase 연결 설정

## 백업

백업 기능은 **Supabase + Google OAuth**로 동작합니다.

일반 사용자는 설정 입력 없이:
- Google 로그인
- `지금 백업`
- `백업 복원`
만 사용하면 됩니다.

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
