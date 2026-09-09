/**
 * 설문을 '순서(①/②)' 기준에서 '강사 이름' 기준으로 바꾼다.
 *   A 구역 = 이도윤,  B 구역 = 윤다은  (듣는 순서와 무관하게 고정)
 * '첫/두 번째로 들은 강의의 강사' 두 문항은 그대로 둔다 — 순서 효과를 나중에 확인할 열쇠.
 */
const { google, getAuthClient } = require('C:/Users/YBM/.google-scripts/auth.cjs')
const ID = '1YiugsTHqywZh59nukC-RqeDKrYekXGbDcbzPETld3XU'
const FIRST = '이도윤'   // A 구역
const SECOND = '윤다은'  // B 구역

const DESC = `강의를 들어보신 소감을 여쭙습니다. 정답이 있는 설문이 아니고, 좋게 답해주실 필요도 전혀 없습니다. 오히려 불편하셨던 점을 그대로 적어주시는 것이 저희에게 제일 도움이 됩니다. 이름은 받지 않습니다.

강사가 다른 두 강의를 이어서 들으시고, 강의마다 문제를 하나씩 풉니다. 0번은 강의를 듣기 전에 답해주세요.

⚠️ A는 ${FIRST} 강사, B는 ${SECOND} 강사 칸입니다. **듣는 순서와 상관없이** 그 강사의 강의가 끝난 직후에 해당 칸을 채워주세요. (${SECOND} 강사를 먼저 들으셨다면 B를 먼저 채우시면 됩니다.) C와 D는 두 강의를 모두 들으신 뒤에 답하시면 됩니다.

⚠️ 맨 마지막에 제출을 누르기 전까지는 아무것도 저장되지 않습니다. 강의를 보시는 동안 이 창을 닫지 마세요.`

const reqs = []
const setItem = (index, item, updateMask) => reqs.push({ updateItem: { item, location: { index }, updateMask } })

// 폼 안내문
reqs.push({ updateFormInfo: { info: { description: DESC }, updateMask: 'description' } })

// 구역 머리말
setItem(4, { itemId: '7eccf1cd', title: `A. ${FIRST} 강사의 강의를 들으신 직후`,
  description: `${FIRST} 강사의 강의가 끝난 직후에 이 구역을 채워주세요. 먼저 들으셨든 나중에 들으셨든 상관없습니다.` }, 'title,description')
setItem(10, { itemId: '6094e850', title: `B. ${SECOND} 강사의 강의를 들으신 직후`,
  description: `${SECOND} 강사의 강의를 기준으로 답해주세요.` }, 'title,description')
setItem(16, { itemId: '78f9209a', title: 'C. 두 강의를 비교하면',
  description: '여기부터는 두 강사의 강의를 비교하여 답해주세요.' }, 'title,description')

// A-*/B-* 제목에 강사 이름을 박는다 — 응답 시트 머리글만 보고도 누구 것인지 알 수 있게
const AB = [
  ['3cc5977f', 5, 'A-1', FIRST, '강의 내용 중에 이미 알고 계셨던 것은 어느 정도였나요?'],
  ['1f99e298', 6, 'A-2', FIRST, '강사가 답에 다다르기까지 시간이 오래 걸린다고 느끼셨나요?'],
  ['5e66d1b6', 7, 'A-3', FIRST, '답을 바로 알려주지 않고 단계적으로 물어보는 방식이 어떠셨나요?'],
  ['52ae2b5f', 8, 'A-4', FIRST, '넘기고 싶었던 부분이 있었다면 어디였나요?'],
  ['433c531c', 9, 'A-5', FIRST, '강사가 어색하다고 느끼신 순간이 있었다면 어디였나요?'],
  ['7888d544', 11, 'B-1', SECOND, '강의 내용 중에 이미 알고 계셨던 것은 어느 정도였나요?'],
  ['1f54432f', 12, 'B-2', SECOND, '강사가 답에 다다르기까지 시간이 오래 걸린다고 느끼셨나요?'],
  ['07ebb259', 13, 'B-3', SECOND, '답을 바로 알려주지 않고 단계적으로 물어보는 방식이 어떠셨나요?'],
  ['5c69dca6', 14, 'B-4', SECOND, '넘기고 싶었던 부분이 있었다면 어디였나요?'],
  ['4166cc15', 15, 'B-5', SECOND, '강사가 어색하다고 느끼신 순간이 있었다면 어디였나요?'],
]
for (const [itemId, index, tag, who, body] of AB) setItem(index, { itemId, title: `${tag}. (${who}) ${body}` }, 'title')

// ①/② 선택지 → 강사 이름
const choice = (itemId, index, questionId, title, extra) => setItem(index, {
  itemId, title,
  questionItem: { question: { questionId, required: true, choiceQuestion: { type: 'RADIO', options: [{ value: FIRST }, { value: SECOND }, ...extra] } } },
}, 'title,questionItem.question.choiceQuestion')
choice('39ba7955', 17, '6d1c5a6c', 'C-1. 두 강의 중, 답을 바로 알려주지 않고 질문을 더 많이 던진 쪽은 어느 강사였나요?', [{ value: '차이를 못 느꼈다' }])
choice('3194bca7', 18, '702246a1', 'C-2. 어느 쪽이 더 답답하다고 생각되셨나요?', [{ value: '비슷했다' }, { value: '답답하지 않았다' }, { isOther: true }])
choice('09777402', 19, '51af28a2', 'C-3. 두 강사의 말투와 진행 스타일 중 어느 쪽이 본인에게 더 맞으셨나요?', [{ value: '둘 다 괜찮았다' }, { value: '둘 다 안 맞았다' }])

// 그리드 행 ①/② → 강사 이름 (questionId 를 그대로 넘겨 응답 시트 열이 어긋나지 않게 한다)
const grid = (itemId, index, title, qa, qb, columns) => setItem(index, {
  itemId, title,
  questionGroupItem: {
    questions: [
      { questionId: qa, required: true, rowQuestion: { title: FIRST } },
      { questionId: qb, required: true, rowQuestion: { title: SECOND } },
    ],
    grid: { columns: { type: 'RADIO', options: columns.map((value) => ({ value })) } },
  },
}, 'title,questionGroupItem')
grid('54cd91c4', 21, 'C-5. 강사의 목소리가 듣기 거슬리셨나요?', '2ce184e1', '26f75c83',
  ['1 전혀 거슬리지 않았다', '2 별로 거슬리지 않았다', '3 보통이다', '4 조금 거슬렸다', '5 많이 거슬렸다'])
grid('504b0781', 30, 'D-6. 강사의 질문은 학생이 스스로 생각해야 답할 수 있는 것이었나요, 아는지만 확인하는 것이었나요?', '0788d2db', '07c8e605',
  ['거의 다 확인하는 질문이었다', '확인하는 쪽에 가까웠다', '반반이었다', '생각해야 하는 쪽에 가까웠다', '거의 다 생각해야 하는 질문이었다'])

// D-2 / D-3
setItem(26, { itemId: '469dc0e2', title: `D-2. (${FIRST}) 강의에서, 학생이 혼자서는 못 했을 일을 해내게 만들어준 대목이 있었나요?` }, 'title')
setItem(27, { itemId: '436ddd80', title: `D-3. (${SECOND}) 강의에서, 학생이 혼자서는 못 했을 일을 해내게 만들어준 대목이 있었나요?` }, 'title')

;(async () => {
  const forms = google.forms({ version: 'v1', auth: await getAuthClient() })
  await forms.forms.batchUpdate({ formId: ID, requestBody: { requests: reqs, includeFormInResponse: false } })
  console.log(`✅ ${reqs.length}건 반영`)
  const { data: f } = await forms.forms.get({ formId: ID })
  console.log('\n=== 바뀐 문항 ===')
  for (const it of f.items) {
    const opts = it.questionItem?.question?.choiceQuestion?.options?.map((o) => o.value ?? '(기타)').join(' / ')
    const rows = it.questionGroupItem?.questions?.map((q) => `${q.rowQuestion.title}[${q.questionId}]`).join(' / ')
    if (/^[ABCD][.\-]/.test(it.title ?? '')) console.log(`  ${it.title}${opts ? '\n      → ' + opts : ''}${rows ? '\n      → ' + rows : ''}`)
  }
})().catch((e) => { console.error('실패:', JSON.stringify(e.errors ?? e.message, null, 1)); process.exit(1) })
