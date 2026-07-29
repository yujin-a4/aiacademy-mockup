-- 0022: 유니크 제약에 draft_id 를 포함 — docs/rail-editor-plan.md STEP 1 (0021 후속)
--
-- ── 왜 필요한가 (0021 적용 직후 실측으로 발견) ────────────────────
-- type_rails 의 유니크 제약이 이렇게 생겼다.
--     UNIQUE (question_type_id, instructor_code, version, step_order)
-- draft_id 가 빠져 있다. 그래서 **드래프트가 정본과 같은 자리를 못 쓴다.**
--
--   실측: P1-PHOTO-SUBJECT × lee_doyun × version 2 × step_order 1 인 정본 행이 있는데,
--         같은 좌표로 draft_id='zz-test' 행을 넣으려 하면
--         → duplicate key value violates unique constraint
--
-- 드래프트는 **정본을 통째로 복사해서 시작한다**(계획서 §2). 복사본은 당연히 같은 좌표를 갖는다.
-- 이걸 못 넣으면 격리 설계 자체가 성립하지 않는다.
--
-- ── 고치는 법 ────────────────────────────────────────────────────
-- draft_id 를 유니크 키에 넣되, **NULLS NOT DISTINCT** 로 건다 (PostgreSQL 15+, 현재 17.6).
--   · 기본 동작(NULLS DISTINCT)이면 draft_id 가 null 인 행끼리는 서로 다르다고 보아
--     **정본의 중복이 허용돼 버린다** — 지금 있는 보호가 사라진다. 반드시 NOT DISTINCT 여야 한다.
--   · NOT DISTINCT 면 null 끼리도 같다고 보므로 정본 유일성이 지금과 **완전히 동일**하게 유지되고,
--     드래프트는 자기 네임스페이스 안에서만 유일하면 된다.
--
-- ── 안전성 ───────────────────────────────────────────────────────
--   · 제약을 **넓히는** 방향이라(키에 컬럼 추가) 기존 650행은 그대로 통과한다.
--   · 데이터 변경 없음. 인덱스 교체만.

begin;

-- (1) 옛 제약 제거
alter table type_rails
  drop constraint if exists type_rails_question_type_id_instructor_code_version_step_or_key;

-- (2) draft_id 를 포함한 제약. null 끼리도 같다고 봐야 정본 유일성이 유지된다.
alter table type_rails
  add constraint type_rails_slot_uniq
  unique nulls not distinct (draft_id, question_type_id, instructor_code, version, step_order);

-- (3) 0021 에서 만든 부분 인덱스는 (2) 와 겹친다 — 중복 인덱스는 쓰기만 느리게 한다
drop index if exists type_rails_live_idx;

comment on constraint type_rails_slot_uniq on type_rails is
  '한 좌표(네임스페이스·유형·강사·버전·단계)에 행은 하나. '
  'NULLS NOT DISTINCT 라 정본(draft_id is null)끼리의 중복도 막는다 — 0022 이전과 동일한 보호.';

commit;
