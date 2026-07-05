require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const TYPE_DUMP = path.join(__dirname, 'dump', '[공통] 스케폴딩 기본 설계 (유형학습).json');
const PRACTICE_DUMP = path.join(__dirname, 'dump', '[공통] 스케폴딩 기본 설계 (실전문제) 수정중.json');

// ---------- 1. step_types (S1~S7) : 안정적인 고정 데이터라 직접 명시 ----------
const STEP_TYPES = [
  ['S1', '핵심 단서 찾기', '사진, 질문 첫 단어, 빈칸 앞뒤, 문제 키워드, 지문 제목 등 가장 먼저 봐야 할 단서를 찾게 한다.'],
  ['S2', '유형·역할 판별', '사진 유형, 질문 유형, 빈칸 유형, 지문 유형 등을 분류하게 한다.'],
  ['S3', '개념 코칭', '문제 풀이에 필요한 문법·표현·구조 개념을 짧게 설명하고 판단 기준을 제공한다.'],
  ['S4', '구조·흐름 파악', '문장 구조, 대화 흐름, 지문 구조, 시간 순서를 단계적으로 파악하게 한다.'],
  ['S5', '정답 근거 연결', '사진·음원·문장·지문 속 근거와 정답 선택지를 연결하게 한다.'],
  ['S6', '오답 제거·진단', '틀린 선택지를 제거하고 오답 원인을 표준 태그로 분류한다.'],
  ['S7', '표현 정리·전략 요약', '빈출 표현, 정답 패턴, 오답 함정을 정리한다.'],
];

// ---------- 2. diagnostic_categories (7종) : 안정적인 고정 데이터라 직접 명시 ----------
const DIAGNOSTIC_CATEGORIES = [
  ['D1', '핵심요소 미확인형', '가장 먼저 봐야 할 단서(사진 속 대상, 질문 핵심어, 화자/청자 등) 자체를 놓침', ['S1', 'S6', 'S5'], '단서 포착'],
  ['D2', '구조·흐름 파악 부족형', '단서는 봤지만 전체 구조·시간순서·문단 흐름 속에서의 위치를 놓침', ['S4', 'S6', 'S5'], '구조/흐름 추적'],
  // 'S4/S1'은 "S4 또는 S1 중 태그에 맞는 쪽" 이라는 시트 원문 표기 그대로 유지 (P3 태그의 'S1/S2'와 동일한 규칙)
  ['D3', '개념·규칙 이해 부족형', '판단 기준이 되는 문법·논리 규칙 자체를 모르거나 헷갈림 — 재확인만으로는 부족, 기준 재설명 필요', ['S3', 'S4/S1', 'S6', 'S5'], '규칙 이해'],
  ['D4', '표면 일치 함정형', '발음·형태·단어가 비슷하거나 일부만 일치하는 오답에 낚임 — 의미·전체 맥락 연결 실패', ['S6', 'S5'], '의미 연결(형태에 안 낚이기)'],
  ['D5', '과잉 추론형', '지문·담화에 없는 내용을 사실처럼 확대 해석하거나 지나치게 추론함', ['S4', 'S6', 'S5'], '명시 정보와 추론의 경계 구분'],
  ['D6', '문맥근거 연결 실패형', '근거는 있으나 선택지 표현과 연결하지 못함', ['S1', 'S6', 'S5'], '의미 연결'],
  ['D7', '연계정보 누락형', '두 개 이상 근거, 표·그래픽·이중/삼중 지문 정보를 연결하지 못함', ['S1', 'S4', 'S6', 'S5'], '정보 결합'],
];

const CIRCLED_TO_CODE = {
  '①': 'D1', '②': 'D2', '③': 'D3', '④': 'D4', '⑤': 'D5', '⑥': 'D6', '⑦': 'D7',
};

function loadDump(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

// ---------- 3. lectures : "제목 [유형코드: XX-PN-NN]" 패턴을 정규식으로 스캔 ----------
function extractLectures() {
  const raw = fs.readFileSync(TYPE_DUMP, 'utf-8');
  const cells = JSON.parse(raw).rows.flat();
  const re = /^(.+?)\s*\[유형코드:\s*([A-Z]{2})-P(\d)-(\d+)\]$/;
  const lectures = [];
  const seen = new Set();
  for (const cell of cells) {
    if (typeof cell !== 'string') continue;
    const m = cell.match(re);
    if (!m) continue;
    const [, title, lcRc, part, num] = m;
    const code = `${lcRc}-P${part}-${num}`;
    if (seen.has(code)) continue;
    seen.add(code);
    lectures.push({ code, part: Number(part), lcRc, title: title.trim() });
  }
  return lectures;
}

// ---------- 4. wrong_answer_tags : Part별 8열 블록을 고정 오프셋으로 파싱 ----------
function extractWrongAnswerTags() {
  const dump = loadDump(PRACTICE_DUMP);
  const tags = [];
  for (let part = 1; part <= 7; part++) {
    const offset = 7 + (part - 1) * 9; // tag,meaning,subtags,diagcat,missed,steps,summary,repeat
    for (const row of dump.rows) {
      const diagRaw = row[offset + 3];
      if (typeof diagRaw !== 'string') continue;
      const circle = diagRaw.trim()[0];
      const diagCode = CIRCLED_TO_CODE[circle];
      if (!diagCode) continue; // 태그 데이터 행이 아님 (헤더/타이틀/빈 행)

      const tagName = (row[offset] || '').trim();
      if (!tagName) continue;

      const subTags = (row[offset + 2] || '')
        .split('/')
        .map((s) => s.trim())
        .filter(Boolean);

      const stepSeq = (row[offset + 5] || '')
        .split(/→|->/)
        .map((s) => s.trim())
        .filter(Boolean);

      tags.push({
        part,
        tagName,
        tagMeaning: (row[offset + 1] || '').trim(),
        subTags,
        diagCode,
        missedPoint: (row[offset + 4] || '').trim(),
        stepSeq,
        stepSummary: (row[offset + 6] || '').trim(),
        repeatExtra: (row[offset + 7] || '').trim(),
      });
    }
  }
  return tags;
}

async function main() {
  const lectures = extractLectures();
  const tags = extractWrongAnswerTags();

  console.log(`step_types: ${STEP_TYPES.length}`);
  console.log(`diagnostic_categories: ${DIAGNOSTIC_CATEGORIES.length}`);
  console.log(`lectures: ${lectures.length}`);
  console.log(`wrong_answer_tags: ${tags.length}`);

  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    await client.query('begin');

    for (const [code, name, role] of STEP_TYPES) {
      await client.query(
        `insert into step_types (code, name, role) values ($1,$2,$3)
         on conflict (code) do update set name = excluded.name, role = excluded.role`,
        [code, name, role]
      );
    }

    for (const [code, name, definition, steps, weakness] of DIAGNOSTIC_CATEGORIES) {
      await client.query(
        `insert into diagnostic_categories (code, name, definition, default_step_sequence, key_weakness)
         values ($1,$2,$3,$4,$5)
         on conflict (code) do update set name = excluded.name, definition = excluded.definition,
           default_step_sequence = excluded.default_step_sequence, key_weakness = excluded.key_weakness`,
        [code, name, definition, steps, weakness]
      );
    }

    for (const lec of lectures) {
      await client.query(
        `insert into lectures (lecture_code, part, lc_rc, title) values ($1,$2,$3,$4)
         on conflict (lecture_code) do update set title = excluded.title`,
        [lec.code, lec.part, lec.lcRc, lec.title]
      );
    }

    for (const t of tags) {
      await client.query(
        `insert into wrong_answer_tags
           (part, tag_name, tag_meaning, sub_tags, diagnostic_category_code, missed_point, default_step_sequence, step_summary, repeat_extra_step)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         on conflict (part, tag_name) do update set
           tag_meaning = excluded.tag_meaning, sub_tags = excluded.sub_tags,
           diagnostic_category_code = excluded.diagnostic_category_code, missed_point = excluded.missed_point,
           default_step_sequence = excluded.default_step_sequence, step_summary = excluded.step_summary,
           repeat_extra_step = excluded.repeat_extra_step`,
        [t.part, t.tagName, t.tagMeaning, t.subTags, t.diagCode, t.missedPoint, t.stepSeq, t.stepSummary, t.repeatExtra]
      );
    }

    await client.query('commit');
    console.log('master data import complete');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
