export type SpeakingInputType = 'listen' | 'voice' | 'repeat' | 'read' | 'practice' | 'button'

export interface SpeakingTurn {
  id: string
  videoSrc?: string
  script: string
  inputType: SpeakingInputType
  repeatPhrase?: string
  nextTurnId?: string
  /** 음성 인식 언어. 미설정 시 'ko-KR'. 영어 답변 턴은 'en-US' */
  lang?: string
}

export interface ScriptLine {
  label: string
  text: string
  blanks?: string[]
}

export interface PhotoAnnotation {
  n: number
  x: number
  y: number
}

export const OFFICE_PHOTO = '/speaking/sp_image.png'
export const PARK_PHOTO   = '/speaking/sp_img2.png'

export const OFFICE_SCRIPT: ScriptLine[] = [
  { label: '장소',  text: 'This picture was taken in an office.',  blanks: ['office'] },
  { label: '인물1', text: 'A woman is sitting at a desk.',          blanks: ['sitting', 'desk'] },
  { label: '',      text: 'She is using a laptop.',                 blanks: ['using', 'laptop'] },
  { label: '인물2', text: 'A man is standing behind her.',          blanks: ['standing', 'behind'] },
  { label: '사물',  text: 'There are some papers on the desk.',     blanks: ['papers'] },
  { label: '전체',  text: 'Overall, the people look busy.',         blanks: ['busy'] },
]

export const PARK_SCRIPT: ScriptLine[] = [
  { label: '장소',  text: 'This picture was taken in a park.' },
  { label: '인물',  text: 'A man and a woman are running together.' },
  { label: '',      text: 'They are running for exercise.' },
  { label: '주변',  text: 'Some people are exercising in the background.' },
  { label: '전체',  text: 'Overall, the people look healthy.' },
]

export const OFFICE_ANNOTATIONS: Record<string, PhotoAnnotation[]> = {
  sp2: [{ n: 1, x: 28, y: 58 }],
  sp3: [{ n: 1, x: 28, y: 58 }, { n: 2, x: 62, y: 38 }],
  sp3_t3: [{ n: 1, x: 28, y: 58 }, { n: 2, x: 62, y: 38 }, { n: 3, x: 75, y: 82 }],
}

export const SPEAKING_TURNS: Record<string, SpeakingTurn> = {
  sp0_intro: {
    id: 'sp0_intro',
    videoSrc: '/speaking/sp0_intro.mp4',
    script: 'Part 2는 사진 보고 30초 동안 말하는 문제야.\n\n근데 초보자들이 여기서 멈춰. 왜? 뭐부터 말해야할지 모르거든.\n\n순서 딱 잡아줄게. 사진 묘사는 이 순서만 따르면 돼.',
    inputType: 'button',
  },
  sp1_t1: {
    id: 'sp1_t1',
    videoSrc: '/speaking/sp1_t1.mp4',
    script: '첫째, 장소 먼저 말해.\n\n사진 봐봐. 장소가 office, restaurant, street 중 어디인 것 같아?',
    inputType: 'voice',
    lang: 'en-US',
    nextTurnId: 'sp1_t2',
  },
  sp1_t2: {
    id: 'sp1_t2',
    videoSrc: '/speaking/sp1_t2.mp4',
    script: '그렇지. 그러면 "이 사진은 사무실에서 찍힌 것 같다."를 영어로 말해보자.\nI think this picture was taken in an office. 따라해봐.',
    inputType: 'repeat',
    lang: 'en-US',
    repeatPhrase: 'I think this picture was taken in an office.',
    nextTurnId: 'sp1_t3',
  },
  sp1_t3: {
    id: 'sp1_t3',
    videoSrc: '/speaking/sp1_t3.mp4',
    script: '좋아. 잘했어. This picture was taken in 장소.\n\n이 문장은 Part 2에서 거의 공식처럼 쓰면 돼.',
    inputType: 'button',
  },
  sp2_t1: {
    id: 'sp2_t1',
    videoSrc: '/speaking/sp2_t4.mp4',
    script: '둘째, 가장 잘 보이는 사람 하나만 잡아. 왼쪽에 있는 여자가 뭐하고 있어? 책상에 앉아있지?\n"여자가 책상에 앉아 있다"를 영어로 말해봐. A woman is 뒤에 뭐라고 말하면 될까?',
    inputType: 'voice',
    lang: 'en-US',
    nextTurnId: 'sp2_t2',
  },
  sp2_t2: {
    id: 'sp2_t2',
    videoSrc: '/speaking/sp2_t5.mp4',
    script: '그렇지 잘했어. 그럼 여자는 앉아서 뭐하고 있어? 노트북 laptop을 쓰고 있지?\nShe is ~ 뒤에 뭐라고 하면 되지?',
    inputType: 'voice',
    lang: 'en-US',
    nextTurnId: 'sp2_t3',
  },
  sp2_t3: {
    id: 'sp2_t3',
    videoSrc: '/speaking/sp2_t6.mp4',
    script: '그렇지. 여기서도 사물 앞에 관사 a 넣어주자.\nShe is using a laptop. 따라해봐.',
    inputType: 'repeat',
    lang: 'en-US',
    repeatPhrase: 'She is using a laptop.',
    nextTurnId: 'sp2_t4',
  },
  sp2_t4: {
    id: 'sp2_t4',
    videoSrc: '/speaking/sp2_t7.mp4',
    script: '잘했어. 여기서 중요한 건 뭘까? 주어? 동사?',
    inputType: 'voice',
    nextTurnId: 'sp2_t5',
  },
  sp2_t5: {
    id: 'sp2_t5',
    videoSrc: '/speaking/sp2_t8.mp4',
    script: '맞아. 사진 묘사는 대부분 be동사 + -ing 를 쓰면 돼.\n지금 사진 속에서 보이는 동작을 말해주는 게 핵심이야.',
    inputType: 'button',
  },
  sp3_t1: {
    id: 'sp3_t1',
    videoSrc: '/speaking/sp3_t9.mp4',
    script: '셋째, 옆에 있는 다른 인물 하나 더 잡아봐. 남자는 뭐하고 있어? 여자 뒤에 서있지?\nA man is ~ 뒤에 뭐라고 말하면 될까?',
    inputType: 'voice',
    lang: 'en-US',
    nextTurnId: 'sp3_t2',
  },
  sp3_t2: {
    id: 'sp3_t2',
    videoSrc: '/speaking/sp3_t10.mp4',
    script: "'~뒤에'는 전치사 behind를 쓰면 돼. 자, 따라해봐.\nA man is standing behind her.",
    inputType: 'repeat',
    lang: 'en-US',
    repeatPhrase: 'A man is standing behind her.',
    nextTurnId: 'sp3_t3',
  },
  sp3_t3: {
    id: 'sp3_t3',
    videoSrc: '/speaking/sp3_t11.mp4',
    script: '마지막으로 가까이 있는 사물 아무거나 잡아서 말하면 끝나.\n책상 위에 종이가 있다를 말해볼까? There are some ~',
    inputType: 'voice',
    lang: 'en-US',
    nextTurnId: 'sp3_t4',
  },
  sp3_t4: {
    id: 'sp3_t4',
    videoSrc: '/speaking/sp3_t12.mp4',
    script: '잘했어. 시간 남으면 마지막에 전체 분위기 한 줄만 붙여주면 돼.\nOverall, the people look busy. 따라해봐.',
    inputType: 'repeat',
    lang: 'en-US',
    repeatPhrase: 'Overall, the people look busy.',
    nextTurnId: 'sp3_t5',
  },
  sp3_t5: {
    id: 'sp3_t5',
    videoSrc: '/speaking/sp3_t13.mp4',
    script: '실전에서는 이 틀만 유지해도 훨씬 안정적으로 말할 수 있어.',
    inputType: 'button',
  },
  sp4_t1: {
    id: 'sp4_t1',
    videoSrc: '/speaking/sp4_t1.mp4',
    script: '이제 사진 보면서 아래 구조 파악하면서 스크립트를 쭉 읽어봐.',
    inputType: 'read',
    lang: 'en-US',
    nextTurnId: 'sp4_t2',
  },
  sp4_t2: {
    id: 'sp4_t2',
    videoSrc: '/speaking/sp4_t2.mp4',
    script: '잘했어. 이 구조 눈에 익혀둬.\n장소 → 인물1 → 인물2 → 사물 → 전체 분위기.',
    inputType: 'button',
  },
  sp5_t1: {
    id: 'sp5_t1',
    videoSrc: '/speaking/sp5_t1.mp4',
    script: '이번에는 실전처럼 해보자. 빈칸을 채워보면서 말해봐.\n앞에서 배운대로 말하거나 새로운 표현 사용해서 말해봐.',
    inputType: 'practice',
    lang: 'en-US',
    nextTurnId: 'sp5_t2',
  },
  sp5_t2: {
    id: 'sp5_t2',
    videoSrc: '/speaking/sp5_t2.mp4',
    script: '좋아. 전체 흐름은 굉장히 자연스러웠어.\n\n"She is working with her laptop."도 의미는 전달돼. 근데 사진 묘사에서는 "using a laptop"을 훨씬 더 많이 써.\n\n"She is using a laptop." 다시 한번 말해볼래?',
    inputType: 'repeat',
    lang: 'en-US',
    repeatPhrase: 'She is using a laptop.',
    nextTurnId: 'sp5_t3',
  },
  sp5_t3: {
    id: 'sp5_t3',
    videoSrc: '/speaking/sp5_t3.mp4',
    script: '좋아. 실전 문제로 넘어가보자.',
    inputType: 'button',
  },
  sp6_t1: {
    id: 'sp6_t1',
    videoSrc: '/speaking/sp6_t1.mp4',
    script: '장소, 주요 인물, 주변 설명, 전체 분위기 순서 기억하면서 처음부터 끝까지 말해보자.',
    inputType: 'practice',
    lang: 'en-US',
    nextTurnId: 'sp6_t2',
  },
  sp6_t2: {
    id: 'sp6_t2',
    videoSrc: '/speaking/sp6_t2.mp4',
    script: '좋아. 전체 흐름은 되게 안정적이야.\n\n"Some people are exercising at the back."라고 했는데 "at the back"보다 "in the background"를 훨씬 더 자연스럽게 많이 써.\n\n"Some people are exercising in the background." 이렇게 말하면 더 자연스럽고 점수 받기 좋아.',
    inputType: 'repeat',
    lang: 'en-US',
    repeatPhrase: 'Some people are exercising in the background.',
    nextTurnId: 'sp6_t3',
  },
  sp6_t3: {
    id: 'sp6_t3',
    videoSrc: '/speaking/sp6_t3.mp4',
    script: '이런 위치 표현들만 자연스럽게 익숙해져도 답변 전체가 훨씬 안정적으로 들려.',
    inputType: 'button',
  },
  sp7_t1: {
    id: 'sp7_t1',
    videoSrc: '/speaking/sp7_t1.mp4',
    script: '좋아. 오늘은 이것만 기억하면 돼.\n\n사진 묘사는 어려운 표현 싸움이 아니라 보이는 걸 안정적으로 말하는 시험이야.\n\n장소 → 사람 행동 → 주변 사물/배경 → 전체 분위기.\n\n실전에서는 완벽한 문장보다 멈추지 않고 자연스럽게 이어가는 게 더 중요해.',
    inputType: 'button',
  },
}
