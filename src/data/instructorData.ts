// 강사 로스터: 박혜원 · 윤다은 · 이도윤 · 서지안 · 오정자 (온보딩 InstructorSelect id와 동일).
// ※ 윤다은/이도윤/서지안의 메시지·약점코멘트 문구는 이전 페르소나(장연지/이인호/정은순)에서
//   이관된 placeholder다 — 각 강사의 실제 페르소나 톤으로 재작성 필요 (후속).
/** 강사별 말투 사양 — **발화를 만드는 쪽**(api/rail-prompts)에 넘긴다.
 *
 *  왜 필요한가: 수업 첫 마디(`instructor_greeting`)만은 에이전트가 **그대로 낭독**한다
 *  (지시문을 주면 메타 지시까지 읽어버려서 대시보드 프롬프트가 낭독으로 고정돼 있다).
 *  그래서 생성 프롬프트에 말투가 없으면 첫 마디가 강사 색 없는 표준 존댓말로 나온다 —
 *  박혜원은 반말·단호가 페르소나인데 "…해 볼까요?" 로 시작하던 원인.
 *  ※ 대시보드 System prompt(docs/agent-system-prompt.md)의 화법과 어긋나지 않게 유지할 것. */
export const INST_TONE: Record<string, string> = {
  park_hyewon: '반말. 직설적이고 단호하다. 칭찬보다 사실이 먼저. "자 봐봐", "그렇지" 같은 짧은 추임새를 쓴다. 존댓말을 쓰지 않는다.',
  yun_daeun: '존댓말. 부드럽고 다정하게, 학생을 안심시키며 말한다. 재촉하지 않는다.',
  lee_doyun: '존댓말. 분석적이고 담백하다. 군더더기 없이 근거와 절차를 짚는다.',
  seo_jian: '존댓말. 밝고 기운을 북돋운다. 어렵지 않다고 짚어주며 이끈다.',
  oh_jungja: '존댓말. 느리고 편안하게, 쉬운 말로 천천히 설명한다.',
}
export const DEFAULT_TONE = INST_TONE.park_hyewon

export const INST_NAME: Record<string, string> = {
  park_hyewon: '박혜원',
  yun_daeun: '윤다은',
  lee_doyun: '이도윤',
  seo_jian: '서지안',
  oh_jungja: '오정자',
}

export const INST_THUMBS: Record<string, string> = {
  park_hyewon: '/image_reference/park-2.jpg',
  yun_daeun: '/image_reference/jang.png',
  lee_doyun: '/instructor/lee-2.png',
  seo_jian: '/image_reference/jung.png',
  oh_jungja: '/image_reference/ojungja.jpg',
}

/* ── 강사 포즈 컷아웃 (배경 투명 상반신) — 수업 화면에서 스캐폴딩 단계에 따라 교체 ──
   포즈 5종을 스펙으로 열어두되, 실제로 들어온 이미지만 매핑한다. 없는 포즈는 아래 폴백
   체인(instPose)으로 채우고, 강사 자체가 포즈 에셋이 없으면 썸네일로 폴백한다.
   촬영 규격: 배경 투명 PNG · 상반신 · 같은 인물/옷/조명/크기 · 얼굴이 프레임 동일 지점.
   현재 이도윤만 2장(calm=두 손 모은 차분, talk=손 펼쳐 말하는 중). 나머지는 들어오는 대로. */
export type InstPose = 'greeting' | 'explain' | 'point' | 'listen' | 'praise'

export const INST_POSES: Record<string, Partial<Record<InstPose, string>>> = {
  lee_doyun: {
    greeting: '/instructor/lee_doyun/calm.png',
    explain: '/instructor/lee_doyun/talk.png',
  },
}

/* 포즈 폴백 체인 — 요청한 포즈가 없으면 성격이 가까운 포즈로 대체.
   짚기(point)는 설명(explain)으로, 듣기·칭찬은 기본(greeting)으로 수렴한다. */
const POSE_FALLBACK: Record<InstPose, InstPose[]> = {
  greeting: ['greeting'],
  explain: ['explain', 'greeting'],
  point: ['point', 'explain', 'greeting'],
  listen: ['listen', 'greeting'],
  praise: ['praise', 'greeting'],
}

/** 강사 × 포즈 → 이미지 경로. 포즈 에셋이 아예 없는 강사면 null (호출부가 썸네일로 폴백). */
export function instPose(instructor: string, pose: InstPose): string | null {
  const poses = INST_POSES[instructor]
  if (!poses) return null
  for (const p of POSE_FALLBACK[pose]) {
    if (poses[p]) return poses[p] as string
  }
  return null
}

/* ── 강사 영상 클립 (원형 아바타 안에서 도는 무음 루프) ──
   사진 대신 영상을 넣는다. **포즈와 같은 열쇠(InstPose)를 쓴다** — 단계마다 상황을 고르는
   판단(poseForTurn)은 이미 있고, 여기서는 그 상황에 어떤 클립을 물릴지만 정한다.

   클립 넷. 위 POSE_FALLBACK 이 빈 자리를 알아서 채운다.
     gesture-a / gesture-b — 일반적인 말하는 장면 둘. **강사가 말하는 동안**이 여기다
     nod                   — 끄덕임. 강사가 말하지 않는 동안(학생이 답하거나 화면을 보는 시간).
                             말하는 그림을 그대로 두면 소리 없이 입만 움직이는 꼴이 된다
     praise                — 박수. 칭찬·마무리(S7 표현 정리)에서만 나온다

   ⚠️ 클립은 **무음**이고, 강사 목소리는 이것과 아무 상관이 없다 — 목소리는 ElevenLabs 에이전트가
      따로 내보낸다(음성 모드) 또는 lib/tts 가 재생한다. 영상이 muted 인 것과 강사가 말하는 것은
      서로 다른 소리 통로다. 영상에 소리를 넣으면 오히려 브라우저가 자동재생을 막아 그림이 멈춘다.

   촬영·인코딩 규격 (지키지 않으면 화면에서 티가 난다)
     · **무음**. 목소리는 TTS 로 따로 나간다. 소리가 있으면 브라우저가 자동재생을 막는다
     · 정사각 크롭. 원이 118px(작을 땐 56px)이라 얼굴이 프레임을 채워야 뭔지 알아본다
     · 3~5초, 시작과 끝 자세가 같아야 이음매가 안 튄다. 안 되면 부메랑(정방향+역방향)으로 잇는다
     · H.264 mp4. 카톡에서 넘어온 원본은 HEVC 라 브라우저에서 안 도는 경우가 있다
     · 한 개 1MB 안쪽. 아바타 원에 18MB 짜리를 물리면 수업 시작이 그만큼 늦어진다
   변환은 scripts/make-instructor-clips.js 가 한다. */
export const INST_CLIPS: Record<string, Partial<Record<InstPose, string>>> = {
  lee_doyun: {
    /* 둘 다 '일반적인 말하는 장면'이라 어느 쪽을 어디에 걸든 맞고 틀리고가 없다. 다만 한 클립만
       계속 돌면 같은 동작이 반복되는 게 눈에 띄므로 상황을 갈라 두 개가 번갈아 나오게 둔다. */
    greeting: '/instructor/lee_doyun/clips/gesture-a.mp4',   // 인사·기본
    explain: '/instructor/lee_doyun/clips/gesture-a.mp4',    // 설명하는 중
    point: '/instructor/lee_doyun/clips/gesture-b.mp4',      // 짚어주는 중
    listen: '/instructor/lee_doyun/clips/nod.mp4',           // 끄덕임 — 강사가 말하지 않는 동안
    praise: '/instructor/lee_doyun/clips/praise.mp4',        // 박수 — 칭찬·마무리
  },
}

/** 강사 × 포즈 → 영상 경로. 클립이 없으면 null (호출부가 사진으로 폴백한다). */
export function instClip(instructor: string, pose: InstPose): string | null {
  const clips = INST_CLIPS[instructor]
  if (!clips) return null
  for (const p of POSE_FALLBACK[pose]) {
    if (clips[p]) return clips[p] as string
  }
  return null
}

/** 이 강사가 영상 클립을 갖고 있는가 (없으면 사진 아바타 그대로) */
export const hasClips = (instructor: string) => Boolean(INST_CLIPS[instructor])

/** 이 강사의 클립 전부(중복 제거). 화면이 미리 깔아두고 크로스페이드하는 데 쓴다. */
export function instClips(instructor: string): string[] {
  return Array.from(new Set(Object.values(INST_CLIPS[instructor] ?? {})))
}

/** 이 강사가 포즈 컷아웃을 갖고 있는가 (없으면 기존 썸네일 UI 유지) */
export const hasPoses = (instructor: string) => Boolean(INST_POSES[instructor])

// 강사별 수업 튜터 ElevenLabs 에이전트. 전용 에이전트가 없는 강사는 박혜원 에이전트로 폴백.
export const TUTOR_AGENT_DEFAULT = 'agent_2501kt0w00khfrr8869g2z5vnpaz' // 박혜원
export const INST_AGENT: Record<string, string> = {
  park_hyewon: TUTOR_AGENT_DEFAULT,
  yun_daeun: 'agent_0901kxd75e70f49bbjmjge931tbq',
  lee_doyun: 'agent_0501kxz5g8fbfav9asys5ed7szjd',
}
/** 운영 강사 로스터 — 온보딩·설정에서 고를 수 있는 강사. 오정자는 제외(4명 확정, 0720). */
export const INSTRUCTOR_ROSTER: { id: string; tag: string; desc: string }[] = [
  { id: 'park_hyewon', tag: '#기초부터탄탄', desc: '기초 개념부터 차근차근 짚어주는 정통파' },
  { id: 'yun_daeun',   tag: '#핵심포인트',   desc: '볼 것만 시원하게 짚어주는 속도형' },
  { id: 'lee_doyun',   tag: '#직청직독형',   desc: '영어 어순 그대로 처리하는 속독·직청 훈련' },
  { id: 'seo_jian',    tag: '#단계별학습',   desc: 'LC는 흐름, RC는 구조를 차분히 잡아주는 스타일' },
]

/** 전용 튜터 에이전트가 있는 강사인지 (없으면 박혜원 에이전트로 폴백) */
export const hasOwnAgent = (instructor: string) => Boolean(INST_AGENT[instructor])

export const tutorAgentFor = (instructor?: string) =>
  (instructor && INST_AGENT[instructor]) || TUTOR_AGENT_DEFAULT

export const INST_WEAK_COMMENTS: Record<string, Partial<Record<string, string>>> = {
  park_hyewon: {
    P5: 'P5에서 시간 다 쓰면 뒤가 무너져. 품사 자리부터 바로 파악하는 훈련 해.',
    P6: 'P6는 앞 문장 꼭 읽어. 문맥 놓치면 다 틀려. 흐름 파악이 먼저야.',
    P7: 'P7은 문제 먼저 읽어. 지문 다 읽고 찾으면 시간 끝나. 전략이 실력이야.',
    P3: '짧은 대화는 첫 문장이 핵심이야. 첫 줄 놓치면 흐름 다 놓쳐.',
  },
  yun_daeun: {
    P5: 'P5 단문은 패턴이 있어요. 빈칸 앞뒤만 읽어도 답 나와요 😊',
    P6: 'P6는 앞 문장 연결이 핵심이에요. 천천히 읽으면 답이 보여요 ✨',
    P7: 'P7은 질문 먼저 읽고 지문에서 찾아요. 전체 다 읽으려 하지 마요 🌸',
    P3: '대화 흐름만 따라가면 돼요. 첫 문장 집중해서 들어봐요.',
  },
  lee_doyun: {
    P5: 'P5 정답률이 기준 미달. 품사 자리 판단 속도를 높여야 합니다. 반복 드릴 필요.',
    P6: 'P6 정답률 문제. 단락 간 연결 논리가 핵심. 접속사 패턴 암기 필요.',
    P7: 'P7 정답률 부족. 스캐닝 훈련이 필요합니다. 타이머 켜고 질문 선독 연습.',
    P3: '짧은 대화 집중도 저하. 첫 발화 포커싱 훈련 필요합니다.',
  },
  seo_jian: {
    P5: '어렵지 않아요 💜 빈칸 앞뒤 문맥만 보면 돼요. 할 수 있어요!',
    P6: 'P6는 지문을 한 번만 더 읽어봐요. 흐름만 잡아도 반은 맞아요 💜',
    P7: 'P7 길어 보여도 겁먹지 마요! 질문 먼저 보고 답 찾는 연습부터 해요 💪',
    P3: '대화 첫 문장 집중하면 돼요. 긴장하지 않아도 괜찮아요!',
  },
  oh_jungja: {
    P5: 'P5는 천천히 읽어봐요. 빈칸 앞 단어 보고 품사 먼저 찾으면 돼요.',
    P6: 'P6는 앞에서부터 한 문장씩 보면 돼요. 서두르지 않아도 돼요.',
    P7: 'P7 긴 지문이라 힘들죠. 질문 보고 찾아 읽는 방법 같이 해봐요.',
    P3: '대화는 첫 말이 제일 중요해요. 첫 문장 잘 들어봐요.',
  },
}

export const INST_MESSAGES: Record<string, { dashboard: string[]; status: string[] }> = {
  park_hyewon: {
    dashboard: [
      '오늘 Part 5 딱 10문제만 해. 그거면 충분해. 작은 게 쌓이는 거야.',
      '지금 바로 켜. 고민하는 시간에 이미 한 문제 풀 수 있어.',
      '어제보다 1%만 나으면 돼. 오늘 그 1% 채우러 가자.',
      '목표 점수까지 77점 남았어. 지금 시작하면 이번 달 안에 닿아.',
      '틀린 문제가 곧 보물이야. 오늘 오답 한 개라도 제대로 파고들어 봐.',
    ],
    status: [
      'LC 83%로 안정적인데 RC가 54%야. 이 격차가 문제야. 다음 주는 RC 집중 주간으로 잡아.',
      '오답 패턴 보니까 전치사 실수가 반복됐어. 알고 틀리는 거야. 꼼꼼함을 훈련해야 해.',
      'Part 5에서 시간을 너무 쓰고 있어. 이 페이스면 Part 7은 항상 시간 부족이야. 10분 컷 훈련 먼저.',
      '이번 주 풀이량은 좋아. 근데 정확도가 제자리야. 숫자보다 오답 분석이 먼저야.',
      '7일 중 5일 접속. 2일 공백이 있었어. 다음 주엔 7일 채워봐. 습관이 실력을 만들어.',
    ],
  },
  yun_daeun: {
    dashboard: [
      '오늘 못 풀어도 괜찮아요 😊 한번 읽기만 해도 오늘은 성공이에요.',
      '시작이 반이에요. 앱 켠 것만으로도 이미 훌륭해요 🌸',
      '천천히 가도 괜찮아요. 포기만 안 하면 반드시 올라가요.',
      '오늘 5분도 충분해요. 그 5분이 쌓여서 점수가 된답니다.',
      '오늘 학습 후 뿌듯함을 미리 상상해봐요 ✨ 바로 시작해요!',
    ],
    status: [
      'LC 83%까지 올라왔어요! 꾸준함이 결과로 나오고 있어요 😊 다음 주는 RC 속도를 조금 높여봐요.',
      '이번 주 학습 리듬 정말 안정적이었어요 🌸 RC 수동태 부분이 살짝 흔들렸으니 다음 주에 같이 봐요.',
      '틀린 문제들 보니까 비슷한 유형이 반복돼요. 오답 노트로 정리해두면 다음 주 훨씬 나아질 거예요.',
      '이번 주 풀이량 대단했어요! 다음 주는 양보다 정확도에 집중해봐요. 하나씩 확실히 잡아가요 ✨',
      '7일 동안 꾸준히 해준 것 봤어요 💜 이 페이스 그대로 유지하면 목표 점수 금방이에요!',
    ],
  },
  lee_doyun: {
    dashboard: [
      '데이터 보니까 분사구문이 약점이야. 딱 이거 하나만 잡자. 빠르게.',
      '3일 연속 학습하면 기억 정착률 47% 올라가. 오늘 빠지면 리셋이야.',
      'Part 5 정답률 61%. 70%까지 딱 9% 남았어. 오늘 집중하면 닿아.',
      '학습 효율 최상위권은 복습 비중이 60%야. 오늘 복습 먼저.',
      '시제 오답 패턴이 반복돼. since/for 차이 오늘 완전히 정리하자.',
    ],
    status: [
      'LC 83%, RC 54%. RC 정답률이 목표치 대비 16%p 부족합니다. 다음 주 RC 집중 주간 전환 필요.',
      '오답 분석 결과 전치사 오류 38%, 시제 오류 27%. 우선순위: 전치사 패턴 암기부터입니다.',
      'Part 6 정답률 3주째 정체 중입니다. 접속사 연결 논리 훈련 없이는 돌파가 어렵습니다.',
      '학습 연속일 5/7. 연속 구간 정답률이 공백 이후보다 18% 높습니다. 공백을 없애세요.',
      '이번 주 분석 완료. 빠른 돌파구: Part 5 품사 자리 반사 판단 훈련. 이것만 잡으면 10점 즉각 상승 예측.',
    ],
  },
  seo_jian: {
    dashboard: [
      '틀려도 괜찮아요 💜 오늘 한 단어만 기억해도 충분해요. 응원해요!',
      '오늘도 화면 켜준 것만으로 대단해요! 같이 한 문제씩 가봐요 💪',
      '조급해하지 마요. 당신은 분명히 할 수 있어요. 오늘도 믿어요.',
      '작은 성공이 큰 자신감이 돼요. 오늘 한 파트만 완주해봐요!',
      '지금 이 순간이 나중에 감사하게 될 선택이에요. 오늘도 함께해요 ☺️',
    ],
    status: [
      'LC 83%, 정말 대단해요 💜 혼자 만들어낸 결과예요. RC도 조금씩 올리면 목표 점수 반드시 닿아요!',
      '이번 주 RC가 조금 힘들었죠? 괜찮아요. 어려운 걸 포기 안 하고 끝낸 것만으로 충분해요 ✨',
      '이번 주 오답 패턴 보니까 고칠 수 있는 실수들이에요. 같이 하나씩 잡아나가요 💜',
      '7일 동안 빠지지 않고 한 거 봤어요. 흔들리는 날도 있었을 텐데 정말 잘했어요!',
      '이번 주 학습량 정말 열심히 했어요. 다음 주도 이 페이스면 반드시 결과가 나와요 😊',
    ],
  },
  oh_jungja: {
    dashboard: [
      '오늘도 왔네요. 자, 화장실 먼저 다녀오고 시작해요.',
      '서두르지 말아요. 천천히 한 문제씩 하면 돼요.',
      '어제 틀린 거 오늘 다시 보면 돼요. 그게 공부예요.',
      '오늘 30분만 해봐요. 딱 30분만. 그것만 해도 충분해요.',
      '앉아있는 게 공부예요. 오늘도 잘 왔어요.',
    ],
    status: [
      '이번 주 잘 했어요. 꾸준히 앉아 있었잖아요. 그게 제일 중요해요. 수고했어요.',
      'LC는 잘 들리고 있어요. RC 독해가 좀 힘들었죠? 다음 주엔 짧은 지문부터 천천히 같이 읽어봐요.',
      '이번 주 전치사 문제에서 실수가 좀 있었어요. 다음 주는 by랑 until 딱 그 두 개만 봐요. 괜찮아요.',
      '일주일 동안 빠지지 않고 한 거 대단해요. 다음 주도 부담 갖지 말고 이번 주처럼만 해요.',
      '틀린 게 많았어도 괜찮아요. 매번 틀리던 문제를 이제 조금씩 맞히고 있거든요. 선생님이 봤어요.',
    ],
  },
}
