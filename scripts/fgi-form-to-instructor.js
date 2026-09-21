/**
 * 설문을 '순서(①/②) 기준' 에서 '강사 이름 기준' 으로 바꾼다.
 *
 *   A 구역 = 이도윤,  B 구역 = 윤다은  — 듣는 순서와 무관하게 고정한다.
 *   듣는 순서는 지금처럼 사람마다 뒤집어 배정하되, **설문 문구만** 강사로 고정하는 것이다.
 *   '첫/두 번째로 들은 강의의 강사' 두 문항은 그대로 둔다 — 순서 효과를 나중에 확인할 열쇠.
 *
 * ⚠️ 이미 받아 둔 응답은 건드리지 않는다. 그 응답들은 A 구역에 '먼저 들은 강의'가 들어 있어서
 *    새 이름표와 어긋나는데, 지우지 않고 `fgi-survey-sheet-view.js --now` 가 '바꾼 시각'을
 *    경계로 갈라 읽는다. **이 스크립트를 돌린 직후 그 스크립트도 같이 돌릴 것.**
 *
 * ⚠️ 구글 폼 Update 는 **항목의 종류를 같이 넘겨야 한다.** 제목만 바꾸고 싶어도
 *    pageBreakItem / questionItem 을 빼면 "다른 종류로 바꾸려 한다"며 배치 전체를 거부한다.
 *    그래서 이 파일은 현재 폼을 먼저 읽어 **원본 항목을 복사한 뒤 필요한 칸만 고쳐** 되돌려보낸다.
 *
 * 쓰는 법
 *   node scripts/fgi-form-to-instructor.js --dry   # 무엇이 바뀔지 보여주기만
 *   node scripts/fgi-form-to-instructor.js         # 실제로 바꾼다
 *
 * 여러 번 돌려도 결과는 같다(멱등).
 */
const { google, getAuthClient } = require('C:/Users/YBM/.google-scripts/auth.cjs')

const ID = process.env.FGI_FORM_ID || '1YiugsTHqywZh59nukC-RqeDKrYekXGbDcbzPETld3XU'
const DRY = process.argv.includes('--dry')
const FIRST = '이도윤'    // A 구역
const SECOND = '윤다은'   // B 구역

const DESC = `강의를 들어보신 소감을 여쭙습니다. 정답이 있는 설문이 아니고, 좋게 답해주실 필요도 전혀 없습니다. 오히려 불편하셨던 점을 그대로 적어주시는 것이 저희에게 제일 도움이 됩니다. 이름은 받지 않습니다.

강사가 다른 두 강의를 이어서 들으시고, 강의마다 문제를 하나씩 풉니다. 0번은 강의를 듣기 전에 답해주세요.

A는 ${FIRST} 강사, B는 ${SECOND} 강사 칸입니다. 듣는 순서와 상관없이, 그 강사의 강의가 끝난 직후에 해당 칸을 채워주세요. (${SECOND} 강사를 먼저 들으셨다면 B를 먼저 채우시면 됩니다.) C와 D는 두 강의를 모두 들으신 뒤에 답하시면 됩니다.

⚠️ 맨 마지막에 제출을 누르기 전까지는 아무것도 저장되지 않습니다. 강의를 보시는 동안 이 창을 닫지 마세요.`

/** itemId → 어떻게 고칠 것인가. 원본 항목을 받아 고친 사본을 돌려준다 */
const EDITS = {
  // 구역 머리말
  '7eccf1cd': (it) => ({ ...it, title: `A. ${FIRST} 강사의 강의를 들으신 직후`,
    description: `${FIRST} 강사의 강의가 끝난 직후에 이 구역을 채워주세요. 먼저 들으셨든 나중에 들으셨든 상관없습니다.` }),
  '6094e850': (it) => ({ ...it, title: `B. ${SECOND} 강사의 강의를 들으신 직후`,
    description: `${SECOND} 강사의 강의를 기준으로 답해주세요. 이 구역도 순서와 상관없습니다.` }),
  '78f9209a': (it) => ({ ...it, title: 'C. 두 강의를 비교하면',
    description: '여기부터는 두 강사의 강의를 비교하여 답해주세요.' }),

  // A-*/B-* 제목에 강사 이름을 박는다 — 응답 시트 머리글만 보고도 누구 것인지 알 수 있게
  ...Object.fromEntries([
    ['3cc5977f', 'A-1', FIRST], ['1f99e298', 'A-2', FIRST], ['5e66d1b6', 'A-3', FIRST],
    ['52ae2b5f', 'A-4', FIRST], ['433c531c', 'A-5', FIRST],
    ['7888d544', 'B-1', SECOND], ['1f54432f', 'B-2', SECOND], ['07ebb259', 'B-3', SECOND],
    ['5c69dca6', 'B-4', SECOND], ['4166cc15', 'B-5', SECOND],
  ].map(([id, tag, who]) => [id, (it) => ({
    ...it, title: `${tag}. (${who}) ${it.title.replace(/^[AB]-\d\.\s*(\([^)]*\)\s*)?/, '')}`,
  })])),

  // ①/② 선택지 → 강사 이름. 나머지 선택지(기타·비슷했다 등)는 원본 그대로 둔다
  ...Object.fromEntries(['39ba7955', '3194bca7', '09777402'].map((id) => [id, (it) => ({
    ...it,
    title: it.title.replace('어느 쪽이었나요?', '어느 강사였나요?'),
    questionItem: {
      ...it.questionItem,
      question: {
        ...it.questionItem.question,
        choiceQuestion: {
          ...it.questionItem.question.choiceQuestion,
          options: it.questionItem.question.choiceQuestion.options.map((o) =>
            /^①/.test(o.value ?? '') ? { value: FIRST } : /^②/.test(o.value ?? '') ? { value: SECOND } : o),
        },
      },
    },
  })])),

  // 표(그리드) 행 ①/② → 강사 이름. questionId 를 그대로 두어야 응답 시트 열이 안 어긋난다
  ...Object.fromEntries(['54cd91c4', '504b0781'].map((id) => [id, (it) => ({
    ...it,
    questionGroupItem: {
      ...it.questionGroupItem,
      questions: it.questionGroupItem.questions.map((q) => ({
        ...q,
        rowQuestion: { title: /①|먼저/.test(q.rowQuestion.title) ? FIRST : SECOND },
      })),
    },
  })])),

  // D-2 / D-3
  '469dc0e2': (it) => ({ ...it, title: `D-2. (${FIRST}) 강의에서, 학생이 혼자서는 못 했을 일을 해내게 만들어준 대목이 있었나요?` }),
  '436ddd80': (it) => ({ ...it, title: `D-3. (${SECOND}) 강의에서, 학생이 혼자서는 못 했을 일을 해내게 만들어준 대목이 있었나요?` }),
}

/** 무엇이 바뀌었는지에 따라 마스크를 정한다 — 안 바뀐 칸까지 덮어써서 사고 나는 걸 막는다 */
function maskFor(before, after) {
  const m = []
  if (before.title !== after.title) m.push('title')
  if ((before.description ?? '') !== (after.description ?? '')) m.push('description')
  if (JSON.stringify(before.questionItem) !== JSON.stringify(after.questionItem)) m.push('questionItem')
  if (JSON.stringify(before.questionGroupItem) !== JSON.stringify(after.questionGroupItem)) m.push('questionGroupItem')
  return m.join(',')
}

async function main() {
  const forms = google.forms({ version: 'v1', auth: await getAuthClient() })
  const { data: form } = await forms.forms.get({ formId: ID })

  const requests = []
  if (form.info.description !== DESC) {
    requests.push({ updateFormInfo: { info: { description: DESC }, updateMask: 'description' } })
    console.log('  · 폼 안내문')
  }

  form.items.forEach((item, index) => {
    const edit = EDITS[item.itemId]
    if (!edit) return
    const after = edit(item)
    const updateMask = maskFor(item, after)
    if (!updateMask) return
    requests.push({ updateItem: { item: after, location: { index }, updateMask } })
    console.log(`  · [${updateMask}] ${item.title ?? '(제목없음)'}\n        → ${after.title ?? ''}`)
  })

  if (!requests.length) { console.log('\n바꿀 것이 없다 — 이미 강사 기준이다.\n'); return }
  if (DRY) { console.log(`\n${requests.length}건. 보여주기만 했다 — 실제로 바꾸려면 --dry 를 빼고 돌릴 것.\n`); return }

  await forms.forms.batchUpdate({ formId: ID, requestBody: { requests } })
  console.log(`\n✅ ${requests.length}건 반영`)

  const { data: f2 } = await forms.forms.get({ formId: ID })
  console.log('\n=== 확인 ===')
  for (const it of f2.items) {
    const opts = it.questionItem?.question?.choiceQuestion?.options?.map((o) => o.value ?? '(기타)').join(' / ')
    const rows = it.questionGroupItem?.questions?.map((q) => q.rowQuestion.title).join(' / ')
    if (/^[ABCD][.\-]/.test(it.title ?? '')) {
      console.log(`  ${it.title}`)
      if (opts) console.log(`      선택지 → ${opts}`)
      if (rows) console.log(`      표의 행 → ${rows}`)
    }
  }
  console.log('\n⚠️ 이어서 `node scripts/fgi-survey-sheet-view.js --now` 를 돌릴 것 — 기존 응답을 갈라 읽는 경계가 된다.\n')
}

main().catch((e) => {
  console.error('\n실패:', JSON.stringify(e.errors ?? e.message, null, 1))
  process.exit(1)
})
