/**
 * 수업 콘텐츠 전수 검증 — "화면에 뜬 대로 수업이 되는가"
 *
 * 왜 만들었나 (2026-07-28 실측):
 *   LC-P1-01 을 눌러보니 사진은 **지하철에서 휴대폰 보는 남자**인데
 *   강사가 "남자가 의자에 앉아 있고 책상 위에 서류가 쌓여 있네요" 라고 말하고,
 *   정답이 A 인데 **"C가 정답입니다"** 라고 단정했다.
 *   원인은 시트의 '자유 표현(말투 예시)'을 화면이 그대로 낭독한 것 —
 *   그 예시는 다른(가상의) 사진을 보고 쓴 문장이었다.
 *   눈으로 한 판씩 돌려서 잡을 문제가 아니라 표로 뽑아야 한다. 그래서 이 스크립트다.
 *
 * 검사 항목
 *   [1] 문항   — 정답 정확히 1개 / 보기 수 / 문제문 / 오답 근거
 *   [2] 사진·음원 — 있어야 할 자리에 있나, URL 이 실제로 열리나(--net)
 *   [3] 지문   — 지문 단위 파트(P3·4·6·7)에 passage 링크·문장이 있나
 *   [4] 아이템 — lecture_items / item_questions 연결
 *   [5] 레일   — 강사별 존재, 변종 매핑, 턴 수
 *   [6] 발화·정답 모순 — **레일 문구가 특정 보기를 정답이라 단정하는데 실제 정답과 다른 경우**
 *
 * 사용
 *   node scripts/check-lesson-content.js            # DB만 검사 (빠름)
 *   node scripts/check-lesson-content.js --net      # 사진·음원 URL 접속까지 확인 (느림)
 *   node scripts/check-lesson-content.js --lecture LC-P1-01
 *
 * 종료코드: 치명(FAIL) 있으면 1
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local'), quiet: true });
const { Client } = require('pg');

const NET = process.argv.includes('--net');
const lecArg = process.argv.indexOf('--lecture');
const ONLY = lecArg > -1 ? process.argv[lecArg + 1] : null;

const FAIL = 'FAIL', WARN = 'WARN';
const issues = [];
const add = (level, lecture, what, detail) => issues.push({ level, lecture, what, detail });

/** URL 이 실제로 열리는지 (HEAD 로 가볍게) */
async function reachable(url) {
  try {
    const r = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (r.status === 405) {                     // HEAD 거부하는 서버 대비
      const g = await fetch(url, { method: 'GET', headers: { Range: 'bytes=0-64' } });
      return g.ok;
    }
    return r.ok;
  } catch {
    return false;
  }
}

async function main() {
  const c = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const where = ONLY ? 'where l.lecture_code = $1' : '';
    const args = ONLY ? [ONLY] : [];

    /* ── 강의 · 문항 · 보기 ── */
    const { rows: qs } = await c.query(`
      select l.lecture_code, l.part, q.question_code, q.passage_id, q.display_order,
             coalesce(q.content->>'stage','lesson') phase,
             q.content->>'question_text' qtext,
             q.content->>'image_url'     image_url,
             q.content->>'audio_url'     audio_url,
             q.content->>'key_elements'  key_elements,
             (select json_agg(json_build_object('label',o.option_label,'correct',o.is_correct,
                       'text',o.option_text,'audio',o.audio_url,'why',
                       coalesce(o.correct_evidence,o.option_explanation)) order by o.display_order)
                from question_options o where o.question_id = q.id) opts
        from questions q join lectures l on l.id = q.lecture_id
        ${where}
       order by l.lecture_code, q.question_code`, args);

    const byLecture = new Map();
    for (const q of qs) {
      if (!byLecture.has(q.lecture_code)) byLecture.set(q.lecture_code, []);
      byLecture.get(q.lecture_code).push(q);
    }

    /* ── 지문 ── */
    const { rows: psgs } = await c.query(`
      select p.id, p.passage_code, p.kind,
             count(s.id) sents, count(s.audio_url) sent_audio
        from passages p left join passage_sentences s on s.passage_id = p.id
       group by 1,2,3`);
    const psgById = new Map(psgs.map((p) => [String(p.id), p]));

    /* ── 아이템 ── */
    const { rows: items } = await c.query(`
      select l.lecture_code, li.phase, count(distinct li.id) items, count(iq.question_id) linked
        from lecture_items li
        join lectures l on l.id = li.lecture_id
        left join item_questions iq on iq.item_id = li.id
       ${where} group by 1,2`, args);
    const itemsOf = new Map(items.map((r) => [`${r.lecture_code}|${r.phase}`, r]));

    /* ── 레일 ── */
    const { rows: rails } = await c.query(`
      select lecture_code, instructor_code, phase, count(*) steps,
             count(variant_id) with_variant,
             string_agg(coalesce(student_prompt,''), ' ¶ ') tutor_text
        from v_lecture_program ${where} group by 1,2,3`, args);
    const railsOf = new Map();
    for (const r of rails) {
      const k = `${r.lecture_code}|${r.phase}`;
      if (!railsOf.has(k)) railsOf.set(k, []);
      railsOf.get(k).push(r);
    }

    /* ── 검사 ── */
    const urls = new Set();
    for (const [code, list] of byLecture) {
      const part = list[0].part;
      const needsPassage = [3, 4, 6, 7].includes(part);

      for (const q of list) {
        const opts = q.opts || [];
        const correct = opts.filter((o) => o.correct);

        // [1] 문항
        if (correct.length !== 1) add(FAIL, code, q.question_code, `정답이 ${correct.length}개 (정확히 1개여야 함)`);
        if (opts.length < 3) add(FAIL, code, q.question_code, `보기가 ${opts.length}개뿐`);
        if (!q.qtext) add(WARN, code, q.question_code, '문제문(question_text)이 비었다');
        /* 오답 근거는 **파트마다 교재가 주는 정도가 다르다.**
           P1·P2 는 해설이 보기별로 오답 이유를 준다 → 없으면 채워야 한다.
           P3·P4·P6·P7 은 교재가 문항 단위 해설만 준다(정답 근거 하나) → 오답별로는 원래 없다.
           그걸 일괄로 경고하면 고칠 수 없는 경고가 쌓여 진짜 문제가 안 보인다. */
        if ([1, 2].includes(part)) {
          const noWhy = opts.filter((o) => !o.correct && !o.why).length;
          if (noWhy) add(WARN, code, q.question_code, `오답 ${noWhy}개에 근거(오답이유)가 없다 — 튜터가 교정할 재료가 없다`);
        } else if (!opts.some((o) => o.correct && o.why)) {
          add(WARN, code, q.question_code, '정답 근거가 없다 — 튜터가 왜 정답인지 말할 재료가 없다');
        }

        // [2] 사진 · 음원
        if (part === 1) {
          if (!q.image_url) add(FAIL, code, q.question_code, '사진(image_url)이 없다 — Part1은 사진이 문제다');
          else if (NET) urls.add(`${code}|${q.question_code}|사진|${q.image_url}`);
          if (!q.key_elements) add(WARN, code, q.question_code, '사진 묘사(key_elements)가 없다 — 튜터가 사진을 못 본다');
        }
        if ([1, 2].includes(part)) {
          const noAudio = opts.filter((o) => !o.audio).length;
          if (noAudio === opts.length) add(WARN, code, q.question_code, '보기 음원이 하나도 없다 — 브라우저 TTS로 읽는다');
          else if (noAudio) add(WARN, code, q.question_code, `보기 ${noAudio}개에 음원이 없다 (일부만 성우)`);
          if (NET) for (const o of opts) if (o.audio) urls.add(`${code}|${q.question_code}|보기${o.label}|${o.audio}`);
        }

        // [3] 지문
        if (needsPassage) {
          if (!q.passage_id) add(FAIL, code, q.question_code, `P${part}인데 지문 링크(passage_id)가 없다 — build-passages.js 를 돌릴 것`);
          else {
            const p = psgById.get(String(q.passage_id));
            if (!p) add(FAIL, code, q.question_code, '지문 링크가 깨졌다');
            else if (Number(p.sents) === 0) add(FAIL, code, q.question_code, `지문 ${p.passage_code}에 문장이 없다`);
            else if ([2, 3, 4].includes(part) && Number(p.sent_audio) === 0) {
              add(WARN, code, q.question_code, `지문 ${p.passage_code} 문장 음원이 하나도 없다 — 듣기인데 브라우저 TTS로 읽는다`);
            }
          }
        }
      }

      // [4] 아이템
      for (const phase of new Set(list.map((q) => q.phase))) {
        const it = itemsOf.get(`${code}|${phase}`);
        const n = list.filter((q) => q.phase === phase).length;
        if (!it) add(FAIL, code, `${phase} 아이템`, '아이템이 없다 — build-lecture-items.js 를 돌릴 것');
        else if (Number(it.linked) !== n) add(FAIL, code, `${phase} 아이템`, `문항 ${n}개 중 ${it.linked}개만 아이템에 연결됨`);
      }

      // [5] 레일 · [6] 발화-정답 모순
      const rl = railsOf.get(`${code}|lesson`) ?? [];
      if (!rl.length) add(FAIL, code, '레일', '이 강의에 레일이 없다 — 화면이 코드 생성 레일로 폴백한다');
      for (const r of rl) {
        if (Number(r.with_variant) === 0) {
          add(WARN, code, `레일/${r.instructor_code}`, '변종이 하나도 안 붙었다 (D9 — 시트에 상호작용 열 없음)');
        }
        /* 레일 문구가 특정 보기를 정답이라 단정하는가.
           단계 하나(¶ 구분) 안에서 "정답"을 말하면서 보기 라벨이 딱 하나만 나오면 단정으로 본다.

           **검사 대상이 바뀌었다(0024).** 원래는 강사 발화 칸(tutor_directive)을 봤는데,
           그 칸은 아무도 안 읽는 죽은 칸이라 컬럼째로 지웠다 — 강사 발화는 DB에 없고
           문항 사실을 보고 LLM 이 매번 만든다. 그래서 이제 **학생 문구(student_prompt)** 를 본다.
           그 칸은 LLM 에 말투 참고로 들어갈 수 있어 같은 오염이 생길 수 있다. */
        const text = r.tutor_text || '';
        const claimed = new Set();
        for (const chunk of text.split('¶')) {
          if (!/정답(?:입니다|이에요|이예요|이다|이야)/.test(chunk)) continue;
          const labels = new Set(
            Array.from(chunk.matchAll(/(?:선택지\s*)?\b([A-D])\b(?:\s*(?:는|은|가|이|도))?/g)).map((m) => m[1]),
          );
          if (labels.size === 1) claimed.add(Array.from(labels)[0]);
        }
        // 레일은 **아이템마다 다시 돈다.** 그래서 문구에 특정 보기를 박아두면
        // 정답이 그 보기가 아닌 아이템에서 그대로 틀린 말이 된다.
        // → 이 강의의 수업 문항 **전부**가 그 보기여야만 통과.
        const lessonQs = list.filter((q) => q.phase === 'lesson');
        for (const lab of claimed) {
          const mismatched = lessonQs.filter(
            (q) => !(q.opts || []).some((o) => o.correct && o.label === lab));
          if (mismatched.length) {
            add(FAIL, code, `레일/${r.instructor_code}`,
              `레일 문구가 "${lab}가 정답"이라고 단정한다. 실제 정답이 다른 문항 ${mismatched.length}개: `
              + mismatched.map((q) => {
                const c = (q.opts || []).find((o) => o.correct);
                return `${q.question_code.slice(-4)}→${c ? c.label : '?'}`;
              }).join(', '));
          }
        }
        // 사진 묘사를 문구에 박아둔 경우 (다른 사진에 그대로 나간다)
        if (/책상 위에|서류가|의자에 앉아/.test(text) && part === 1) {
          add(WARN, code, `레일/${r.instructor_code}`,
            '레일 문구에 특정 사진 묘사가 박혀 있다 — 다른 사진에서 그대로 낭독되면 어긋난다');
        }
      }
    }

    /* ── URL 접속 확인 ── */
    if (NET && urls.size) {
      console.log(`URL ${urls.size}건 접속 확인 중…`);
      const list = Array.from(urls);
      for (let i = 0; i < list.length; i += 8) {
        await Promise.all(list.slice(i, i + 8).map(async (row) => {
          const [code, qcode, what, url] = row.split('|');
          if (!(await reachable(url))) add(FAIL, code, qcode, `${what} URL 이 안 열린다: ${url.slice(0, 70)}`);
        }));
      }
    }

    /* ── 커리큘럼 채움 현황 ──
       "정규 커리큘럼에서 뭐가 막혀 있나"를 볼 자리가 없었다. 위 검사는 문항이 **있는** 강의만
       보기 때문에 빈 강의는 아예 안 나온다. 그래서 42강 전체를 따로 센다. */
    const { rows: cur } = await c.query(`
      select l.part, l.lecture_code, l.title,
             (select count(*) from questions q where q.lecture_id = l.id) qn,
             (select count(*) from lecture_items li where li.lecture_id = l.id) items,
             (select count(*) from lecture_steps ls
               where ls.lecture_id = l.id and ls.instructor_code = 'lee_doyun') rail
        from lectures l where l.seq is not null order by l.seq`);

    const filled = cur.filter((r) => Number(r.qn) > 0);
    console.log(`
커리큘럼 ${cur.length}강 — 문항 있는 강의 ${filled.length} / ${cur.length}`);
    const parts = Array.from(new Set(cur.map((r) => r.part))).sort();
    for (const part of parts) {
      const rows = cur.filter((r) => r.part === part);
      const done = rows.filter((r) => Number(r.qn) > 0);
      const empty = rows.filter((r) => Number(r.qn) === 0);
      const bar = '■'.repeat(done.length) + '·'.repeat(empty.length);
      console.log(`  P${part}  ${bar.padEnd(16)} ${String(done.length).padStart(2)}/${rows.length}`
        + (empty.length ? `   빈 강의: ${empty.map((r) => r.lecture_code).join(', ')}` : ''));
    }
    const noRail = cur.filter((r) => Number(r.rail) === 0);
    const noItem = cur.filter((r) => Number(r.qn) > 0 && Number(r.items) === 0);
    console.log(`  레일 없는 강의 ${noRail.length}개${noRail.length ? ': ' + noRail.map((r) => r.lecture_code).join(', ') : ' (전부 있음)'}`);
    if (noItem.length) console.log(`  ⚠ 문항은 있는데 아이템이 없는 강의: ${noItem.map((r) => r.lecture_code).join(', ')}`);

    /* ── 리포트 ── */
    const fails = issues.filter((i) => i.level === FAIL);
    const warns = issues.filter((i) => i.level === WARN);
    console.log(`\n강의 ${byLecture.size}개 · 문항 ${qs.length}개 검사${NET ? ' (URL 확인 포함)' : ''}`);
    console.log(`  치명 ${fails.length}건 · 경고 ${warns.length}건\n`);

    for (const level of [FAIL, WARN]) {
      const rows = issues.filter((i) => i.level === level);
      if (!rows.length) continue;
      console.log(level === FAIL ? '── 치명 ──' : '── 경고 ──');
      let last = '';
      for (const r of rows) {
        if (r.lecture !== last) { console.log(`  ${r.lecture}`); last = r.lecture; }
        console.log(`    ${r.what.padEnd(18)} ${r.detail}`);
      }
      console.log('');
    }
    if (!issues.length) console.log('이상 없음');
    process.exitCode = fails.length ? 1 : 0;
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
