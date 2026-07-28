-- 0013: 어휘 고정 (STEP 2) — docs/db-restructure-plan.md §7 STEP 2
--
-- 문제: 레일의 두 축이 전부 자유 텍스트다.
--   step_code   151종 (S코드가 2개 이상 섞인 행 187, S코드가 아예 없는 행 56)
--   interaction  20종 (같은 뜻인데 표기가 갈림: '필수 수행 / 쉐도잉' vs '필수 수행(쉐도잉)')
-- 그래서 "S6를 쓰는 레일 전부" 같은 조회가 불가능하고, 변종 dedup도 안 된다.
--
-- 방침 — **현행 동작을 한 글자도 바꾸지 않는다.**
--   지금 화면 동작은 src/data/typeLearning/fromSteps.ts:166~182 의 정규식이 결정한다.
--   그 정규식이 내리는 판정을 그대로 표(alias)로 옮긴다. 따라서 이 마이그레이션만으로는
--   화면이 달라지지 않는다. 런타임을 표로 갈아끼우는 건 STEP 5.
--   판정이 애매한 자리(원문에 '또는'이 있거나 여러 개가 섞인 자리)는 needs_review = true 로
--   표시해 두고, 사람이 정하면 그 행만 고치면 되게 한다.
--
-- ※ step_types 를 scaffolding_steps 로 개명하지 않는다.
--    src/lib/tutorDb.ts 의 loadStepTypes() 가 이 이름을 참조한다 → 개명은 STEP 5에서 코드와 함께.

begin;

-- =========================================================
-- (A) S0 — 데이터에는 42행 있는데 마스터에 없었다
-- =========================================================
-- 0006_part1_add_listen_step.sql 이 "듣기 + 자력선택" 단계로 S0을 도입했지만
-- step_types 에는 넣지 않았다. FK를 걸려면 마스터에 있어야 한다.
insert into step_types (code, name, role) values
  ('S0', '듣기·자력 선택',
   '음원을 들려주고 학습자가 스스로 답을 고르게 한다. 이 단계에서는 정답을 알려주지 않는다.')
on conflict (code) do nothing;

-- =========================================================
-- (B) 강사 마스터
-- =========================================================
-- 지금은 자유 텍스트라 정합이 안 맞는다:
--   lecture_steps        → common / lee_doyun / yun_daeun
--   user_profiles        → park_hyewon (3명)  ← 레일이 없어 common 으로 폴백 중
--   src/data/instructorData.ts → park_hyewon / yun_daeun / lee_doyun / seo_jian / oh_jungja
create table if not exists instructors (
  code       text primary key,
  name       text not null,
  has_rail   boolean not null default false,  -- 전용 레일이 있나 (없으면 common 폴백)
  note       text
);

insert into instructors (code, name, has_rail, note) values
  ('common',      '(공통 기본 설계)', true,  '유형학습_G 이관분. 전용 레일 없는 강사의 폴백'),
  ('lee_doyun',   '이도윤',           true,  '턴 상세(음원·스크립트·상호작용)가 채워진 유일한 레일'),
  ('yun_daeun',   '윤다은',           true,  '4열 구성(단계/규칙/DB참조/자유표현)'),
  ('park_hyewon', '박혜원',           false, 'user_profiles에 선택자 있음. 전용 레일 미이관 → common 폴백'),
  ('seo_jian',    '서지안',           false, 'UI 로스터에만 존재. 레일 미이관'),
  ('oh_jungja',   '오정자',           false, 'UI 로스터에만 존재. 레일 미이관')
on conflict (code) do update
  set name = excluded.name, has_rail = excluded.has_rail, note = excluded.note;

-- =========================================================
-- (C) 상호작용 마스터 — 화면 동작을 결정하는 축
-- =========================================================
-- ui_kind 는 src/data/typeLearning/fromSteps.ts 의 Kind 와 1:1이다. 바꾸지 말 것.
create table if not exists interactions (
  code        text primary key,
  label       text not null,        -- 시트에 쓸 정식 표기 (단 하나)
  ui_kind     text not null,        -- fromSteps.ts Kind
  description text
);

insert into interactions (code, label, ui_kind, description) values
  ('next',        'AI 진행',               'next',       'AI가 말하고 학생은 다음 버튼만 누른다'),
  ('choice',      '선택 응답',             'choice',     '보기 중에서 고르게 한다'),
  ('pick_answer', '필수 응답',             'pickAnswer', '정답을 반드시 고르게 한다'),
  ('subjective',  '주관식 응답',           'subjective', '학생이 직접 입력/발화한다'),
  ('mark',        '필수 수행 / 필기 인식', 'mark',       '화면에서 단서를 짚거나 표시하게 한다'),
  ('shadow',      '필수 수행 / 쉐도잉',    'shadow',     '따라 말하게 한다'),
  ('match',       '필수 수행 / 매칭',      'match',      '근거와 보기를 연결하게 한다'),
  ('solve_all',   '전체 풀이',             'solveAll',   '문항 전체를 한 번에 풀게 한다')
on conflict (code) do update
  set label = excluded.label, ui_kind = excluded.ui_kind, description = excluded.description;

-- =========================================================
-- (D) 상호작용 별칭 — 시트 원문 20종 → 코드
-- =========================================================
-- fromSteps.ts 가 지금 내리는 판정을 그대로 옮긴 것이다(회귀 없음).
-- 그 규칙: ① '또는' 앞부분만 본다  ② 표 순서대로 첫 매칭
--          (매칭·근거연결 → 쉐도잉 → 필기인식 → 주관식 → 선택응답 → 필수응답 → 전체풀이 → AI진행 → 필수수행)
create table if not exists interaction_aliases (
  raw              text primary key,   -- 시트 원문 그대로
  interaction_code text references interactions(code),
  needs_review     boolean not null default false,
  note             text
);

insert into interaction_aliases (raw, interaction_code, needs_review, note) values
  -- 표기가 명확한 것
  ('AI 진행',                                'next',        false, null),
  ('선택 응답',                              'choice',      false, null),
  ('필수 응답',                              'pick_answer', false, null),
  ('주관식 응답',                            'subjective',  false, null),
  ('필수 수행 / 필기 인식',                  'mark',        false, null),
  ('필수 수행(필기 인식)',                   'mark',        false, '표기 흔들림 — 시트에서 "/ 필기 인식"으로 통일할 것'),
  ('필수 수행 / 쉐도잉',                     'shadow',      false, null),
  ('필수 수행(쉐도잉)',                      'shadow',      false, '표기 흔들림 — 시트에서 "/ 쉐도잉"으로 통일할 것'),
  ('필수 수행 / 매칭',                       'match',       false, null),
  -- '또는'이 들어간 자리 — 현행은 앞것을 취한다. 무엇을 보고 갈라야 하는지가 정의된 적이 없다
  ('선택 응답 또는 AI 진행',                 'choice',      true,  '49행. 분기 조건 미정의 → 현행대로 앞것(선택 응답)'),
  ('필수 수행 / 필기 인식 또는 주관식 응답', 'mark',        true,  '8행. 현행대로 앞것'),
  ('필수 수행 / 필기 인식 또는 선택 응답',   'mark',        true,  '6행. 현행대로 앞것'),
  ('필수 응답 / 주관식 입력 또는 음성 응답', 'subjective',  true,  '4행. 현행 정규식이 "주관식"을 먼저 잡는다'),
  ('필수 수행(필기 인식) 또는 주관식 응답',  'mark',        true,  '2행. 현행대로 앞것'),
  ('선택 응답 또는 필수 매칭',               'choice',      true,  '1행. 현행대로 앞것'),
  -- 두 개가 한 칸에 섞인 자리
  ('AI 진행 + 필수 수행 / 필기 인식',        'mark',        true,  '15행. 현행 정규식이 "필기 인식"을 먼저 잡아 AI 진행이 유실된다'),
  -- 하위 지정이 없거나 실행 불가한 자리
  ('필수 수행',                              'mark',        true,  '4행. 무엇을 수행하는지 미지정 → 현행은 mark로 떨어진다'),
  ('필수 수행 / 선택지 표시',                'choice',      true,  '1행. 현행 정규식이 "선택지 표시"를 choice로 잡는다'),
  ('조건부 AI 진행',                         'next',        true,  '2행. 조건이 데이터에 없다 → 무조건 진행으로 동작 중')
on conflict (raw) do update
  set interaction_code = excluded.interaction_code,
      needs_review = excluded.needs_review, note = excluded.note;

-- =========================================================
-- (E) 단계 별칭 — S코드가 없는 step_code 원문 → S코드
-- =========================================================
-- S코드가 문자열에 들어 있는 909행은 규칙으로 뽑는다(첫 S코드 = 대표 단계).
-- 아래는 S코드가 아예 없는 10종(56행)이다.
--   · step_code 정의와 문자 그대로 대조되는 것만 매핑한다(근거를 note에 남긴다)
--   · 대조 근거가 없으면 null + needs_review — **추측하지 않는다**
create table if not exists step_code_aliases (
  raw          text primary key,
  step_code    text references step_types(code),
  needs_review boolean not null default false,
  note         text
);

insert into step_code_aliases (raw, step_code, needs_review, note) values
  ('전체 음원 재생 + 학생 풀이',      'S0', false, 'S0 정의("음원을 들려주고 스스로 고르게, 정답 비공개")와 일치'),
  ('선택지 전체 청취 + 학생 답 선택', 'S0', false, 'S0 정의와 일치'),
  ('질문 1차 청취',                   'S0', false, 'S0 = 첫 청취'),
  ('발화 1차 청취',                   'S0', false, 'S0 = 첫 청취'),
  ('정답·스크립트 공개 + 흐름 확인',  'S5', false, 'S5 정의("근거와 정답 선택지를 연결하게 한다")와 일치'),
  ('사전읽기 및 흐름 예측',           'S4', false, 'S4 정의("문장 구조·대화 흐름·지문 구조를 파악하게 한다")와 일치'),
  -- 여기서부터는 S1~S7 어디에도 대응 정의가 없다. 사람이 정해야 한다.
  ('쉐도잉',                          null, true,  '14행. S1~S7에 "따라 말하기"에 해당하는 단계가 없다'),
  ('질문 쉐도잉',                     null, true,  '3행. 위와 같음'),
  ('발화 쉐도잉',                     null, true,  '1행. 위와 같음'),
  ('미확정 빈칸 회수',                null, true,  '2행. 어느 단계로 볼지 대조 근거 없음')
on conflict (raw) do update
  set step_code = excluded.step_code,
      needs_review = excluded.needs_review, note = excluded.note;

-- =========================================================
-- (F) 변종 사전 — 단계 × 상호작용
-- =========================================================
-- "단계가 최소 단위"는 유지된다. 변종은 *같은 단계를 화면에서 다르게 시키는 방법*이다.
-- 실측(이도윤 364턴): 단계 8 × 상호작용 8 = 칸 64개 중 실제로 채워진 건 25칸.
--
-- ⚠️ 이 테이블은 아직 런타임이 읽지 않는다. scripts/build-step-variants.js 가 채우고,
--    화면을 갈아끼우는 건 STEP 5(type_rails 도입)에서 한다. 지금은 순수 추가라 아무것도 안 깨진다.
create table if not exists step_variants (
  id               bigserial primary key,
  code             text not null unique,                      -- 'S6-choice'
  step_code        text not null references step_types(code),
  interaction_code text not null references interactions(code),
  name             text not null,                             -- 'S6 오답 제거·진단 · 선택 응답'
  -- 아래 3개는 "나중에 값만 바꾸면 되게" 지금 뚫어두는 칸이다 (계획서 §5)
  scope            text not null default 'item'
                     check (scope in ('item','type','lecture')),  -- 반복 범위. 지금은 전부 item(= 다 반복)
  fade_policy      text,                                      -- null = Fading 없음
  min_level        smallint,                                  -- null = 레벨 무관
  student_prompt   text,                                      -- 변종 공통 기본 문구 (없으면 null)
  tutor_directive  text,                                      -- 변종 공통 강사 지시문
  uses             integer not null default 0,                -- 실측 사용 횟수 (재생성 시 갱신)
  note             text,
  unique (step_code, interaction_code)
);

comment on table step_variants is
  '스캐폴딩 변종 사전 = 단계(S) × 상호작용. 실행 단위. 옛 이름 rail_steps("부품").';
comment on column step_variants.scope is
  '반복 범위: item=매 바퀴(기본) / type=같은 유형 첫 아이템만 / lecture=강의 첫 아이템만. 변경은 UPDATE 한 줄.';

-- RLS — 0012 방침과 동일: 읽기만 공개, 쓰기는 postgres 역할(관리 스크립트)만
alter table instructors          enable row level security;
alter table interactions         enable row level security;
alter table interaction_aliases  enable row level security;
alter table step_code_aliases    enable row level security;
alter table step_variants        enable row level security;

drop policy if exists "read for all" on instructors;
create policy "read for all" on instructors for select using (true);
drop policy if exists "read for all" on interactions;
create policy "read for all" on interactions for select using (true);
drop policy if exists "read for all" on interaction_aliases;
create policy "read for all" on interaction_aliases for select using (true);
drop policy if exists "read for all" on step_code_aliases;
create policy "read for all" on step_code_aliases for select using (true);
drop policy if exists "read for all" on step_variants;
create policy "read for all" on step_variants for select using (true);

revoke insert, update, delete, truncate on
  instructors, interactions, interaction_aliases, step_code_aliases, step_variants
  from anon, authenticated;
grant select on
  instructors, interactions, interaction_aliases, step_code_aliases, step_variants
  to anon, authenticated;

commit;
