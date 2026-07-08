-- 0007: user_profiles 테이블 생성 + RLS 정책
-- 온보딩 완료 시 저장되는 유저 프로필. auth.users.id 를 PK로 사용.

create table if not exists user_profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  user_name           text,
  range_axis          text,
  rhythm              text,
  difficulty          text,
  motivation          text,
  target_score        integer,
  exam_date           text,
  selected_instructor text,
  updated_at          timestamptz not null default now()
);

-- RLS 활성화
alter table user_profiles enable row level security;

-- 본인 행만 읽기/쓰기 허용
create policy "users can read own profile"
  on user_profiles for select
  using (auth.uid() = id);

create policy "users can insert own profile"
  on user_profiles for insert
  with check (auth.uid() = id);

create policy "users can update own profile"
  on user_profiles for update
  using (auth.uid() = id);
