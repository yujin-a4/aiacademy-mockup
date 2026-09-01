'use client'

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useWrongAnswerStore } from '@/store/wrongAnswerStore'
import { useFontSettingsStore, FONT_SIZE_CLASSES } from '@/store/fontSettingsStore'
import FontSettingsController from '@/components/FontSettingsController'
import { useMockTestStore, attemptKey } from '@/store/mockTestStore'
import { useDrawingTool, DrawingOverlay, PenFab, type Stroke } from '@/components/DrawingOverlay'

interface Option {
  option_label: string
  option_text: string
  is_correct: boolean
  correct_evidence: string | null
}

interface PassageSentence {
  seq: number
  en: string
  ko?: string | null
  speaker?: string | null
  blank_no?: number | null
}

interface Passage {
  passage_code: string
  kind: string
  title: string | null
  meta: any
  body: any
  set_code: string | null
  set_seq: number
  audio_url: string | null
  sentences: PassageSentence[]
}

interface Question {
  question_code: string
  part: number
  question_no: number
  passage_code?: string | null
  qtype?: string
  content: {
    question_text?: string | null
    blank_sentence?: string | null
    image_url?: string | null
    audio_url?: string | null
    question_number?: string | null
    photo_type?: string | null
    grammar_point?: string | null
    /* Part 5 만 해설이 번역·어휘로 갈라져 온다 (extract_rc_p5 의 split_solution) */
    translation?: string | null
    vocab?: string | null
  }
  options: Option[]
}

const LABELS = ['A', 'B', 'C', 'D']

/** 한 판 = 화면에 한 번에 뜨는 단위.
 *  Part 1·2·5 는 문항 하나가 곧 한 판이고, Part 3·4·6·7 은 **지문(세트) 하나**가 한 판이다 —
 *  세트는 음원 하나·지문 하나를 문항 셋이 나눠 쓰므로 쪼개면 같은 걸 다시 듣고 다시 읽어야 한다. */
interface Group {
  type: 'single' | 'set'
  key: string
  questions: Question[]
  passage?: Passage
}

/** 이 판에서 틀 음원과, 문제가 뜬 뒤 **몇 초 있다가** 틀지.
 *
 *  Part 1·2 는 문항 하나에 음원 하나라 사진·질문을 볼 짧은 틈(3초)만 준다.
 *  Part 3·4 는 음원 하나가 문항 셋을 덮는다 — 실전에서도 듣기 전에 문항을 먼저 훑는 게
 *  기본 전략이라 30초를 준다. 그 사이 학습자는 오른쪽 문항을 읽는다.
 */
function lcAudioOf(group: Group): { src: string; delay: number } | null {
  const q = group.questions[0]
  if (q.part === 1 || q.part === 2) {
    return q.content.audio_url ? { src: q.content.audio_url, delay: 3 } : null
  }
  if (q.part === 3 || q.part === 4) {
    return group.passage?.audio_url ? { src: group.passage.audio_url, delay: 30 } : null
  }
  return null
}

function buildGroups(list: Question[], passageMap: Record<string, Passage>): Group[] {
  const groups: Group[] = []
  let code: string | null | undefined
  let cur: Question[] = []

  const flush = () => {
    if (cur.length && code) {
      groups.push({ type: 'set', key: code, questions: cur, passage: passageMap[code] })
    }
    code = undefined
    cur = []
  }

  for (const q of list) {
    if (q.passage_code) {
      if (q.passage_code !== code) {
        flush()
        code = q.passage_code
        cur = [q]
      } else {
        cur.push(q)
      }
    } else {
      flush()
      groups.push({ type: 'single', key: `single-${q.question_no}`, questions: [q] })
    }
  }
  flush()
  return groups
}

/**
 * 보기 한 줄. **글자 칸과 소거 칸이 나뉘어 있다.**
 *   왼쪽(라벨+글자) = 답으로 고르기 / 오른쪽 칸 = 소거 토글
 * 하나의 버튼으로 두 동작을 겸하면 답을 고르려다 지우게 된다. 그래서 히트 영역을 갈랐다.
 *
 * 소거하면 글자를 감추고 줄만 남긴다(시험지에 그어 놓은 모양). 라벨은 남겨야 무엇을
 * 지웠는지 알고 되돌릴 수 있다 — 되돌리기는 같은 자리를 다시 누르면 된다.
 */
/**
 * 답안지 마킹 칸 — Part 1·2 는 **보기가 시험지에 인쇄되지 않는다.** 소리로만 나가고
 * 수험자는 (A)(B)(C)(D) 만 칠한다. 글자로 찍어 주면 듣기 시험이 읽기 시험이 된다.
 * (Part 2 는 보기가 셋이라 (A)(B)(C) 만 나온다 — 데이터가 그대로 셋이다.)
 *
 * 소거는 여기서도 쓴다. 실제로 시험지에 연필로 긋는 게 이 자리다 — 동그라미 아래 작은 칸.
 */
/**
 * 해설 — **교재(YBM 실전토익)의 해설 원문**을 그대로 보여준다. 지어내지 않는다.
 *
 * 자리는 늘 그 문항의 보기 바로 아래다(파트마다 다르지 않다).
 * 기본 상태는 맞았는지로 가른다 — 틀린 문항은 펼쳐 두고, 맞은 문항은 접는다.
 * Part 7 은 한 판에 문항이 다섯인데 250자짜리 해설을 다 펴 두면 스크롤만 길어진다.
 *
 * Part 5 만 번역·어휘가 따로 온다(교재 조판이 그렇다). **번역은 접어 둔다** —
 * 펼쳐 두면 해설을 읽기 전에 정답이 한글로 먼저 들어온다.
 */
function ExplainBox({ q, right, sizeClass, fontStyleClass }: {
  q: Question
  right: boolean
  sizeClass: string
  fontStyleClass: string
}) {
  const [open, setOpen] = useState(!right)
  const [showKo, setShowKo] = useState(false)
  const text = q.options.find(o => o.is_correct)?.correct_evidence?.trim()
  const tr = q.content.translation?.trim()
  const vo = q.content.vocab?.trim()
  if (!text && !tr) return null

  return (
    <div className="border border-[#E5E7EB] bg-[#FAFAFA] font-sans">
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F3F4F6] transition-colors"
      >
        <span className={`text-[11px] font-black ${right ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          {right ? '정답' : '오답'}
        </span>
        <span className="text-[11px] font-bold text-[#6B7280]">해설</span>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
          className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {text && (
            <p className={`${fontStyleClass} ${sizeClass} text-[#374151] leading-relaxed whitespace-pre-line`}>
              {text}
            </p>
          )}
          {(tr || vo) && (
            <div className="pt-2 border-t border-[#E5E7EB]">
              <button
                onClick={() => setShowKo(v => !v)}
                aria-expanded={showKo}
                className="text-[11px] font-bold text-[#2563EB] hover:underline"
              >
                {showKo ? '번역 · 어휘 접기' : '번역 · 어휘 보기'}
              </button>
              {showKo && (
                <div className="mt-1.5 space-y-1.5">
                  {tr && (
                    <p className="text-[13px] text-[#374151] leading-relaxed">
                      <span className="text-[10px] font-black text-[#9CA3AF] mr-1.5">번역</span>{tr}
                    </p>
                  )}
                  {vo && (
                    <p className="text-[12px] text-[#6B7280] leading-relaxed">
                      <span className="text-[10px] font-black text-[#9CA3AF] mr-1.5">어휘</span>{vo}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnswerSheetRow({
  options, qNo, selected, struckOf, disabled, reveal, correctLabel, onSelect, onStrike,
}: {
  options: Option[]
  qNo: number
  selected?: string
  struckOf: (label: string) => boolean
  disabled?: boolean
  /** 채점 뒤 — 보기 글자를 연다. 시험 중에는 소리로만 나가던 것들이다 */
  reveal?: boolean
  correctLabel?: string
  onSelect: (qNo: number, label: string) => void
  onStrike: (qNo: number, label: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5 font-sans">
      {options.map(o => {
        const struck = struckOf(o.option_label)
        const chosen = selected === o.option_label
        const correct = reveal && correctLabel === o.option_label
        const wrongPick = reveal && chosen && !correct
        return (
          <div
            key={o.option_label}
            className={`flex items-center gap-3 border px-3 py-2 transition-all ${
              correct ? 'border-[#86EFAC] bg-[#F0FDF4]'
                : wrongPick ? 'border-[#FCA5A5] bg-[#FEF2F2]'
                  : struck ? 'border-[#E5E7EB] bg-[#F9FAFB]'
                    : chosen ? 'border-[#2563EB] bg-[#EFF6FF]'
                      : 'border-[#E5E7EB] bg-white'
            }`}
          >
            <button
              type="button"
              disabled={disabled || struck}
              onClick={() => onSelect(qNo, o.option_label)}
              aria-label={`보기 ${o.option_label} 선택`}
              aria-pressed={chosen}
              className={`relative w-9 h-9 shrink-0 rounded-full border-2 text-[13px] font-black
                          flex items-center justify-center transition-all ${
                correct ? 'border-[#22C55E] text-[#16A34A]'
                  : wrongPick ? 'border-[#EF4444] text-[#EF4444]'
                    : struck ? 'border-[#D1D5DB] text-[#D1D5DB] cursor-default'
                      : chosen ? 'border-[#2563EB] bg-[#2563EB] text-white'
                        : 'border-[#CBD5E1] text-[#475569] hover:border-[#93C5FD] hover:bg-[#F8FAFF] active:scale-95'
              }`}
            >
              {o.option_label}
              {struck && <span className="absolute left-1 right-1 h-0.5 bg-[#D1D5DB]" />}
            </button>

            {/* 시험 중에는 비어 있는 줄이다 — 보기는 소리로만 나간다.
                채점하면 바로 이 자리에 글자가 들어온다(줄 위치가 안 흔들리게 세로로 세운 이유다). */}
            <span className="flex-1 min-w-0">
              {reveal
                ? <span className="text-[14px] text-[#1C1B33] leading-snug">{o.option_text}</span>
                : <span className="block h-px bg-[#F3F4F6]" />}
            </span>

            {reveal ? (
              correct ? <span className="shrink-0 text-[10px] font-black text-[#16A34A]">정답</span>
                : wrongPick ? <span className="shrink-0 text-[10px] font-black text-[#EF4444]">내 답</span>
                  : null
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onStrike(qNo, o.option_label)}
                title={struck ? '되돌리기' : '이 보기 소거'}
                aria-pressed={struck}
                className={`w-7 h-7 shrink-0 flex items-center justify-center transition-colors ${
                  struck
                    ? 'text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE]'
                    : 'text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2]'
                }`}
              >
                {struck ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                )}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function OptionRow({
  option, qNo, selected, struck, compact, reveal, isCorrect, sizeClass, fontStyleClass,
  disabled, onSelect, onStrike,
}: {
  option: Option
  qNo: number
  selected: boolean
  struck: boolean
  compact?: boolean
  /** 채점 뒤 복습 — 정답을 초록으로, 내가 고른 오답을 빨강으로 연다. 소거 칸은 감춘다 */
  reveal?: boolean
  isCorrect?: boolean
  /* 보기 글자 크기 — 지문·문제와 같은 '글자 크기' 설정을 따른다(FONT_SIZE_CLASSES.body).
     예전엔 12·13px 로 박혀 있어서 크게 키워도 보기만 작게 남았다 */
  sizeClass: string
  fontStyleClass: string
  disabled?: boolean
  onSelect: (qNo: number, label: string) => void
  onStrike: (qNo: number, label: string) => void
}) {
  const bubble = compact ? 'w-6 h-6 text-[10px]' : 'w-7 h-7 text-[11px]'
  const pad = compact ? 'px-3 py-2.5' : 'px-4 py-3'
  const wrongPick = reveal && selected && !isCorrect
  const rightOne = reveal && isCorrect

  return (
    <div
      className={`flex items-stretch rounded-sm border overflow-hidden transition-all ${
        rightOne
          ? 'bg-[#F0FDF4] border-[#86EFAC]'
          : wrongPick
            ? 'bg-[#FEF2F2] border-[#FCA5A5]'
            : reveal
              ? 'bg-white border-[#E5E7EB]'
              : struck
                ? 'bg-[#F9FAFB] border-[#E5E7EB]'
                : selected
                  ? 'bg-[#EFF6FF] border-[#2563EB] shadow-sm shadow-[#2563EB]/10'
                  : 'bg-white border-[#E5E7EB] hover:border-[#C7D2FE]'
      }`}
    >
      <button
        type="button"
        disabled={disabled || struck}
        onClick={() => onSelect(qNo, option.option_label)}
        className={`flex items-center gap-3 flex-1 min-w-0 text-left font-medium ${pad} ${
          struck ? 'cursor-default' : ''
        } ${selected && !struck ? 'text-[#2563EB] font-bold' : 'text-[#374151]'}`}
      >
        <span
          className={`${bubble} rounded-full flex items-center justify-center font-black shrink-0 ${
            rightOne
              ? 'bg-[#16A34A] text-white'
              : wrongPick
                ? 'bg-[#EF4444] text-white'
                : struck && !reveal
                  ? 'bg-[#E5E7EB] text-[#9CA3AF]'
                  : selected && !reveal
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280]'
          }`}
        >
          {option.option_label}
        </span>
        {/* 그어 지운 보기 — **글자는 남긴다.** 흐리게 깔고 줄만 긋는다.
            시험지에서 연필로 그은 보기도 읽히기는 한다. 통째로 감추면 무엇을 지웠는지
            안 보여서, 마지막에 둘 중 하나로 좁혀 놓고도 되짚을 수가 없다. */}
        <span aria-label={struck && !reveal ? '소거한 보기' : undefined}
          className={`${fontStyleClass} ${sizeClass} min-w-0 ${
            struck && !reveal ? 'opacity-40 line-through decoration-[#6B7280] decoration-[1.5px]' : ''
          }`}>
          {option.option_text}
        </span>
        {rightOne && <span className="ml-auto shrink-0 text-[10px] font-black text-[#16A34A]">정답</span>}
        {wrongPick && <span className="ml-auto shrink-0 text-[10px] font-black text-[#EF4444]">내 답</span>}
      </button>

      {/* 소거 칸 — 채점이 끝나면 그을 일이 없다 */}
      {!reveal && (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onStrike(qNo, option.option_label)}
        title={struck ? '되돌리기' : '이 보기 소거'}
        aria-pressed={struck}
        className={`w-9 shrink-0 border-l flex items-center justify-center transition-colors ${
          struck
            ? 'border-[#E5E7EB] text-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE]'
            : 'border-[#E5E7EB] text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2]'
        }`}
      >
        {struck ? (
          // 되돌리기
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        ) : (
          // 긋기
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        )}
      </button>
      )}
    </div>
  )
}

function TestSolverInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const addWrongAnswer = useWrongAnswerStore(s => s.addWrongAnswer)
  const { fontSize, fontType } = useFontSettingsStore()

  const vol = Number(searchParams.get('vol') || '1')
  const test = Number(searchParams.get('test') || '1')
  const area = (searchParams.get('area') || 'LC').toUpperCase() as 'LC' | 'RC'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [questions, setQuestions] = useState<Question[]>([])
  const [passages, setPassages] = useState<Passage[]>([])
  
  // Selected answers: { [question_no]: label }
  const [answers, setAnswers] = useState<Record<number, string>>({})
  
  // Current active part tab
  const parts = area === 'LC' ? [1, 2, 3, 4] : [5, 6, 7]
  const [activePart, setActivePart] = useState<number>(parts[0])

  /* 지금 보고 있는 판(파트 안 순번). 실전은 한 판씩 넘기며 푼다 —
     100문항을 한 두루마리에 늘어놓으면 지금 몇 번을 푸는지가 사라진다 */
  const [groupIdx, setGroupIdx] = useState(0)

  /* 소거한 보기 — `${문항번호}-${보기라벨}`. 시험지에 연필로 긋는 그 동작이다.
     소거는 **답과 별개의 표시**라 답안지에는 영향을 주지 않는다(제출 채점에도 안 쓴다) */
  const [eliminated, setEliminated] = useState<Record<string, boolean>>({})

  /* 지문·문제 2단의 왼쪽 폭(%). 지문 길이가 세트마다 크게 달라서 고정 폭은 늘 누군가에게 좁다 */
  const [splitPct, setSplitPct] = useState(52)
  const splitRef = useRef<HTMLDivElement | null>(null)

  /* ── 필기 ──
     시험지에 연필로 긋는 그 동작. tapThrough 를 켜서 **연필을 든 채로 답을 고를 수 있게** 한다 —
     끌면 선이 그어지고, 툭 누르면 그 클릭이 아래 보기로 넘어간다.
     (이게 없으면 문항마다 '필기 켬 → 답 고르려 끔 → 고름 → 다시 켬' 을 반복해야 한다) */
  const draw = useDrawingTool({ tapThrough: true })
  /* 잉크는 **판마다 따로** 보관한다. 캔버스는 하나라서, 안 갈아 끼우면 앞 문항에 그은 표시가
     다음 문항 위에 그대로 남는다. 필기 모드(켜짐/꺼짐) 자체는 판이 바뀌어도 유지된다. */
  const inkRef = useRef<Record<string, Stroke[]>>({})
  const inkKeyRef = useRef<string | null>(null)
  const drawAreaRef = useRef<HTMLDivElement | null>(null)

  /* LC 음원 — 실전은 재생 버튼이 없다. 문제가 뜨면 알아서 흐르고, 지나가면 끝이다.
       countdown : 곧 재생된다(남은 초를 보여준다)
       playing   : 재생 중
       done      : 이 판의 음원은 이미 지나갔다 — 앞 판으로 되돌아가도 다시 틀지 않는다
       blocked   : 브라우저가 자동재생을 막았다(새로고침으로 바로 들어온 경우). 버튼으로 살린다 */
  const [audioPhase, setAudioPhase] = useState<'idle' | 'countdown' | 'playing' | 'done' | 'blocked'>('idle')
  const [countdown, setCountdown] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /* 이미 튼 판. 되돌아갔을 때 다시 재생되면 실전이 아니게 된다 */
  const playedRef = useRef<Set<string>>(new Set())
  /* 대기 카운트다운. '지금 재생'으로 건너뛸 수 있어야 해서 ref 로 들고 있는다 */
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  // Timer state
  const timeLimit = area === 'LC' ? 45 * 60 : 75 * 60 // 45m or 75m in seconds
  const [timeLeft, setTimeLeft] = useState(timeLimit)
  const [isTimerRunning, setIsTimerRunning] = useState(true)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Settings dropdown open
  const [showSettings, setShowSettings] = useState(false)
  /* 뒤로 가기는 곧 **시험 중단**이다 — 답이 저장되긴 하지만 시간은 계속 줄어든 채다. 한 번 묻는다 */
  const [askExit, setAskExit] = useState(false)
  /* 제출은 되돌릴 수 없다 — 100문항이 한 번에 채점되고 그걸로 끝이다. 누르기 전에 묻는다 */
  const [askSubmit, setAskSubmit] = useState(false)
  /* ── 복습 모드 ──
     채점하고 나면 점수·오답 목록이 먼저 뜬다. 거기서 '문항별로 다시 보기'를 누르면
     **풀던 화면 그대로** 돌아오되 정답과 해설이 열린다 — 지문·사진·음원이 다 살아 있는 자리에서
     복습해야 왜 틀렸는지가 보인다(목록의 한 줄짜리 문제 문장으로는 알 수 없다). */
  const [reviewing, setReviewing] = useState(false)
  /* 복습을 보다가 '이 회차를 다시 풀겠다' — 채점 결과가 지워지므로 한 번 묻는다 */
  const [askRestart, setAskRestart] = useState(false)

  /* ── 이어하기 ──
     풀다 만 기록이 있으면 **묻지 않고** 그 자리로 떨어뜨린다. 나갈 때 저장된다고 이미 알려줬으니
     돌아왔을 때 한 번 더 묻는 건 같은 말을 두 번 하는 것이고, 이어하려고 들어온 사람에게
     버튼을 하나 더 누르게 하는 일이다. */
  const key = attemptKey(vol, test, area)
  const saved = useMockTestStore(st => st.attempts[key])
  const saveProgress = useMockTestStore(st => st.saveProgress)
  const finishAttempt = useMockTestStore(st => st.finish)
  const resetAttempt = useMockTestStore(st => st.reset)
  /* 저장분을 살피는 동안에는 타이머도 음원도 멈춰 있다 — 아직 시험이 시작되지 않았다 */
  const [resume, setResume] = useState<'checking' | 'go'>('checking')

  // Results State
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [scoreResult, setScoreResult] = useState<{
    correctCount: number
    totalCount: number
    estimatedScore: number
    wrongQuestions: {
      qNo: number
      questionText: string
      chosen: string
      correct: string
      explain: string
      qtype?: string
    }[]
  } | null>(null)

  // Fetch Questions
  useEffect(() => {
    async function loadTest() {
      try {
        setLoading(true)
        const res = await fetch(`/api/mock-test?vol=${vol}&test=${test}&area=${area}`)
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || '시험 데이터를 불러오는 데 실패했습니다.')
        }
        const data = await res.json()
        setQuestions(data.questions || [])
        setPassages(data.passages || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadTest()
  }, [vol, test, area])

  /* 문항을 다 받은 뒤 한 번만 — 풀다 만 기록이 있으면 그 자리로 되돌리고 바로 시작한다.
     채점까지 끝낸 회차(status === 'done')는 복원하지 않는다. 다시 들어왔다는 건 다시 푼다는 뜻이다. */
  useEffect(() => {
    if (loading || resume !== 'checking') return
    if (saved?.status === 'done') {
      /* 이미 채점한 회차다 — 답을 되살려 **복습 화면으로 바로 연다.**
         다시 채점하지 않는다(오답노트에 같은 오답이 또 쌓인다). 점수만 다시 계산해 화면에 쓴다. */
      const given = saved.answers ?? {}
      setAnswers(given)
      setEliminated(saved.eliminated ?? {})
      setIsTimerRunning(false)
      setScoreResult(gradeAll(given))
      setIsSubmitted(true)
      setReviewing(true)
      setResume('go')
      return
    }
    if (saved?.status === 'progress') {
      setAnswers(saved.answers ?? {})
      setEliminated(saved.eliminated ?? {})
      setTimeLeft(saved.timeLeft ?? timeLimit)
      setActivePart(saved.activePart ?? parts[0])
      setGroupIdx(saved.groupIdx ?? 0)
      /* 이미 들은 음원은 다시 틀지 않는다 — 이어했다고 안 들은 척하면 실전이 아니다.
         그 판으로 떨어지면 '재생 완료'로 뜬다. */
      playedRef.current = new Set(saved.played ?? [])
    }
    setResume('go')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // Timer Countdown
  useEffect(() => {
    // 이어할지 묻는 동안 시간이 흐르면 안 된다 — 아직 시험을 시작하지 않았다
    if (!isTimerRunning || isSubmitted || resume !== 'go') return
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit() // Auto submit
          return 0
        }
        return prev - 1
      })
      setElapsedTime(prev => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
    /* ⚠️ resume 을 빠뜨리면 'checking' → 'go' 로 바뀌어도 이 이펙트가 다시 돌지 않아
       타이머가 영영 시작되지 않는다(조건만 넣고 의존성을 빠뜨려 실제로 그랬다). */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTimerRunning, isSubmitted, resume])

  // 지문을 passage_code 로 빠르게 찾기
  const passageMap = useMemo(() => {
    const map: Record<string, Passage> = {}
    passages.forEach(p => { map[p.passage_code] = p })
    return map
  }, [passages])

  /* 파트마다 판 목록을 만들어 둔다. 지금 보는 파트만 만들면 답안지에서 다른 파트의
     문항을 눌렀을 때 그게 몇 번째 판인지 알 수가 없다. */
  const groupsByPart = useMemo(() => {
    const by: Record<number, Group[]> = {}
    for (const p of (area === 'LC' ? [1, 2, 3, 4] : [5, 6, 7])) {
      by[p] = buildGroups(questions.filter(q => q.part === p), passageMap)
    }
    return by
  }, [questions, passageMap, area])

  const groups = useMemo(() => groupsByPart[activePart] ?? [], [groupsByPart, activePart])
  const group: Group | undefined = groups[groupIdx]

  /* 문항 번호 → 그 문항이 몇 번 파트의 몇 번째 판에 있나. 답안지에서 바로 그 판으로 넘어간다 */
  const locate = useMemo(() => {
    const m: Record<number, { part: number; idx: number }> = {}
    Object.entries(groupsByPart).forEach(([part, gs]) => {
      gs.forEach((g, idx) => g.questions.forEach(q => { m[q.question_no] = { part: Number(part), idx } }))
    })
    return m
  }, [groupsByPart])

  /* 파트를 바꾸면 첫 판부터. 답안지로 특정 판에 바로 갈 때는 goToQuestion 이 둘을 같이 세팅한다 */
  const goToQuestion = (qNo: number) => {
    const at = locate[qNo]
    if (!at) return
    setActivePart(at.part)
    setGroupIdx(at.idx)
  }

  const goToPart = (p: number) => { setActivePart(p); setGroupIdx(0) }

  /* 이전/다음은 **파트 경계를 넘는다.**
     실제 시험지는 1번부터 200번까지 이어져 있어서, Part 1 의 마지막 판(6번)에서 다음을 누르면
     Part 2 의 7번이 나와야 한다. 파트 안에서만 움직이면 파트 끝마다 버튼이 죽어서
     위쪽 파트 탭을 손으로 눌러야 넘어간다 — 시험을 보다 말고 길을 찾게 된다.
     맨 앞(첫 파트 첫 판)과 맨 뒤(마지막 파트 마지막 판)에서만 막힌다. */
  const step = (dir: 1 | -1) => {
    const next = groupIdx + dir
    if (next >= 0 && next < groups.length) { setGroupIdx(next); return }
    const pi = parts.indexOf(activePart) + dir
    if (pi < 0 || pi >= parts.length) return
    const p = parts[pi]
    setActivePart(p)
    // 앞으로 가면 그 파트의 첫 판, 뒤로 가면 마지막 판
    setGroupIdx(dir > 0 ? 0 : Math.max(0, (groupsByPart[p]?.length ?? 1) - 1))
  }
  const atFirst = groupIdx === 0 && parts.indexOf(activePart) === 0
  const atLast = groupIdx >= groups.length - 1 && parts.indexOf(activePart) === parts.length - 1

  // Handle Bubble Select
  const handleAnswerSelect = (qNo: number, optionLabel: string) => {
    if (isSubmitted) return
    // 소거해 둔 보기는 고를 수 없다 — 지운 걸 답으로 찍는 건 실수지 선택이 아니다
    if (eliminated[`${qNo}-${optionLabel}`]) return
    setAnswers(prev => ({ ...prev, [qNo]: optionLabel }))
  }

  /* 보기 소거 토글. 고르기와 자리를 나눈다 — **글자를 누르면 답, 오른쪽 칸을 누르면 소거**.
     지금 답으로 찍어 둔 보기를 소거하면 그 표기는 지운다(둘 다 켜 두면 무엇을 고른 건지 모른다) */
  const toggleEliminate = (qNo: number, optionLabel: string) => {
    if (isSubmitted) return
    const key = `${qNo}-${optionLabel}`
    const next = !eliminated[key]
    setEliminated(prev => ({ ...prev, [key]: next }))
    if (next) {
      setAnswers(prev => (prev[qNo] === optionLabel ? { ...prev, [qNo]: '' } : prev))
    }
  }

  /* 답을 고치거나 판을 넘길 때마다 저장한다. 초 단위로 저장하면 localStorage 를 1초마다 쓰게 되니
     타이머 틱에는 걸지 않고, **그 순간의 남은 시간**을 같이 적어 둔다. */
  useEffect(() => {
    if (resume !== 'go' || isSubmitted || loading) return
    if (Object.keys(answers).length === 0 && Object.keys(eliminated).length === 0) return
    saveProgress(key, {
      answers, eliminated, timeLeft, activePart, groupIdx,
      played: Array.from(playedRef.current),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, eliminated, activePart, groupIdx, resume, isSubmitted, loading])

  /* 판이 바뀔 때 지금 잉크를 그 판 이름으로 넣어 두고, 새 판의 잉크를 꺼내 온다 */
  useEffect(() => {
    const k = group?.key ?? null
    if (inkKeyRef.current && inkKeyRef.current !== k) {
      inkRef.current[inkKeyRef.current] = draw.exportStrokes()
    }
    if (k && inkKeyRef.current !== k) {
      draw.loadStrokes(inkRef.current[k] ?? [])
    }
    inkKeyRef.current = k
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.key])

  /* 아직 표기하지 않은 문항. 제출 확인창이 이 수를 보여주고, 첫 문항으로 데려간다 */
  const unanswered = useMemo(
    () => questions.filter(q => !answers[q.question_no]).map(q => q.question_no),
    [questions, answers],
  )

  const audioInfo = group ? lcAudioOf(group) : null

  /* 판이 바뀌면 대기 시간을 세고, 다 세면 튼다. 판을 떠나면 세던 것도 소리도 멈춘다 */
  useEffect(() => {
    /* 이어할지 묻는 동안에는 틀지 않는다 — 아직 시험이 시작되지 않았고,
       이어하기를 고르면 '이미 들은 판'이 복원되면서 이 판은 안 틀어야 할 수도 있다. */
    if (!group || !audioInfo || isSubmitted || resume !== 'go') {
      setAudioPhase('idle')
      return
    }
    if (playedRef.current.has(group.key)) {
      setAudioPhase('done')
      return
    }

    setAudioPhase('countdown')
    setCountdown(audioInfo.delay)

    let left = audioInfo.delay
    const key = group.key
    const tick: ReturnType<typeof setInterval> = setInterval(() => {
      left -= 1
      setCountdown(left)
      if (left > 0) return
      startAudio(key)
    }, 1000)
    tickRef.current = tick

    return () => {
      clearInterval(tick)
      tickRef.current = null
      audioRef.current?.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.key, audioInfo?.src, isSubmitted, resume])

  /* 실제로 트는 자리 — 대기가 끝났을 때와 '지금 재생'을 눌렀을 때가 같은 동작이다 */
  const startAudio = (groupKey: string) => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
    playedRef.current.add(groupKey)
    const el = audioRef.current
    if (!el) return
    el.currentTime = 0
    el.play()
      .then(() => setAudioPhase('playing'))
      // 새로고침으로 이 화면에 바로 들어오면 브라우저가 소리를 막는다(사용자 조작이 없어서).
      // 실패를 삼키면 학습자는 영문도 모르고 문제만 본다 — 버튼을 내준다.
      .catch(() => setAudioPhase('blocked'))
  }

  /* 막힌 자동재생을 사용자 조작으로 살린다 */
  const playBlocked = () => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = 0
    el.play().then(() => setAudioPhase('playing')).catch(() => setAudioPhase('blocked'))
  }

  /* 분할선 끌기. 화면 밖으로 나가도 따라오게 window 에 건다 */
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    const move = (ev: MouseEvent) => {
      const box = splitRef.current?.getBoundingClientRect()
      if (!box || box.width === 0) return
      const pct = ((ev.clientX - box.left) / box.width) * 100
      setSplitPct(Math.min(75, Math.max(25, pct)))
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  // Format time (MM:SS)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // Submit & score
  /** 채점만 한다(부수효과 없음). 제출할 때와 끝낸 회차를 다시 열 때가 같은 답을 내야 한다. */
  const gradeAll = (given: Record<number, string>) => {
    let correctCount = 0
    const totalCount = questions.length
    const wrongQuestions: {
      qNo: number; questionText: string; chosen: string; correct: string; explain: string; qtype?: string
    }[] = []
    for (const q of questions) {
      const chosen = given[q.question_no] || ''
      const correctOpt = q.options.find(o => o.is_correct)
      const correctLabel = correctOpt?.option_label || 'A'
      if (chosen === correctLabel) { correctCount++; continue }
      wrongQuestions.push({
        qNo: q.question_no,
        questionText: q.part === 5
          ? (q.content.blank_sentence || '')
          : (q.content.question_text || `문제 ${q.question_no}`),
        chosen: chosen || '미표기',
        correct: correctLabel,
        explain: correctOpt?.correct_evidence || '별도의 해설이 없습니다.',
        qtype: q.qtype,
      })
    }
    // 100문항 → 5~495점 근사
    const estimatedScore = Math.min(495, Math.max(5, Math.round(correctCount * 4.95 + 5)))
    return { correctCount, totalCount, estimatedScore, wrongQuestions }
  }

  const handleSubmit = () => {
    if (isSubmitted) return
    setIsTimerRunning(false)

    /* 점수는 gradeAll 하나에서만 나온다 — 여기서 또 세면 두 셈이 어긋날 수 있다.
       이 함수가 따로 하는 일은 **오답노트 등록**뿐이다(제출할 때 한 번). */
    const result = gradeAll(answers)

    for (const q of questions) {
      const chosen = answers[q.question_no] || ''
      const correctOpt = q.options.find(o => o.is_correct)
      const correctLabel = correctOpt?.option_label || 'A'
      if (chosen === correctLabel) continue

      /* 지문이 있으면 오답노트에서 문맥을 볼 수 있게 같이 넘긴다 —
         문제 문장 한 줄만으로는 나중에 무슨 문제였는지 알 수 없다. */
      let passageTitle = ''
      const pass = q.passage_code ? passageMap[q.passage_code] : undefined
      if (pass) {
        passageTitle = pass.title || `${area} Part ${q.part} 지문`
        if (pass.sentences?.length) {
          passageTitle += '\n' + pass.sentences.map(s => (
            s.blank_no != null
              ? s.en.replace(`___(${s.blank_no})___`, `[ ${s.blank_no} ]`)
              : (s.speaker ? `[${s.speaker}] ` : '') + s.en
          )).join('\n')
        }
      }

      addWrongAnswer({
        partId: `p${q.part}`,
        partLabel: `Part ${q.part}`,
        questionText: q.part === 5
          ? (q.content.blank_sentence || '')
          : (q.content.question_text || `문제 ${q.question_no}`),
        choices: q.options.map(o => o.option_text),
        chosenAnswer: chosen ? LABELS.indexOf(chosen) : -1,
        correctAnswer: LABELS.indexOf(correctLabel),
        category: q.qtype || '미분류',
        explanation: correctOpt?.correct_evidence || '별도의 해설이 없습니다.',
        passageTitle: passageTitle || undefined,
      })
    }

    setScoreResult(result)
    /* 회차 목록이 'LC 완료 · RC 미응시' 같은 상태를 보여줄 수 있게 결과를 남긴다 */
    finishAttempt(key, { correct: result.correctCount, total: result.totalCount, score: result.estimatedScore })
    setIsSubmitted(true)
  }

  /* 한 판 안에 문항이 여럿인 세트(Part 3·4·6·7)에서만 그 문항 자리로 굴린다.
     판을 옮기고 나서 호출해야 해서 goToQuestion 뒤에 한 박자 늦춘다. */
  const scrollToQuestion = (qNo: number) => {
    document.getElementById(`q-box-${qNo}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-4 text-[#6B7280] font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]"></div>
        <p className="font-semibold">실전 모의고사 문제를 로딩 중입니다...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-4 text-[#6B7280] font-sans px-6 text-center">
        <div className="w-16 h-16 rounded-sm bg-red-50 flex items-center justify-center text-red-500 mx-auto">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <p className="text-[#1C1B33] font-bold text-[18px]">오류 발생</p>
        <p className="text-[14px] text-red-600 max-w-md">{error}</p>
        <Link href="/my-learning" className="mt-2 bg-[#2563EB] text-white px-6 py-2.5 rounded-sm font-semibold text-[14px]">
          대시보드로 가기
        </Link>
      </div>
    )
  }

  /* 채점이 끝나고 문항별로 훑어보는 중인가 — 정답·해설·스크립트가 열린다 */
  const review = isSubmitted && reviewing
  /* 문항번호 → 맞았나. 복습 화면이 색과 접힘을 이걸로 정한다 */
  const correctOf = (q: Question) => q.options.find(o => o.is_correct)?.option_label
  const isRight = (q: Question) => !!answers[q.question_no] && answers[q.question_no] === correctOf(q)

  /* 음원 상태 막대 — 실전에는 재생 버튼이 없다. 대신 **언제 나오는지**를 알려준다.
     지금 판이 LC 음원을 가질 때만 그린다(RC·Part 6·7 은 null). */
  const audioBar = audioInfo && (review ? (
    /* 복습은 시험이 아니다 — 몇 번이든 듣고 되감을 수 있어야 한다. 평범한 재생기를 준다 */
    <div className="w-full font-sans">
      <audio src={audioInfo.src} controls preload="none" className="h-9 w-full max-w-sm" />
    </div>
  ) : (
    <div className="w-full font-sans">
      <audio
        ref={audioRef}
        src={audioInfo.src}
        preload="auto"
        onEnded={() => setAudioPhase('done')}
        className="hidden"
      />
      {audioPhase === 'countdown' ? (
        <div className="flex items-center gap-3 rounded-sm border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {/* 남은 초를 숫자로. 막대는 뺐다 — 30초를 눈금으로 재는 것보다 숫자가 바로 읽힌다 */}
          <span className="text-[22px] font-black text-[#B45309] tabular-nums leading-none w-8 text-center shrink-0">
            {countdown}
          </span>
          <span className="text-[12px] font-bold text-[#B45309] leading-tight min-w-0">
            초 후 음원이 재생됩니다
            {audioInfo.delay >= 30 && (
              <span className="block text-[11px] font-medium text-[#B45309]/70 mt-0.5">
                그 전에 문제를 먼저 읽어두세요
              </span>
            )}
          </span>
          {/* 다 읽었으면 기다릴 이유가 없다 — 30초는 문제를 훑으라고 준 시간이지 벌이 아니다.
              3초짜리(Part 1·2)에는 안 단다. 누를 새도 없이 지나간다. */}
          {audioInfo.delay >= 10 && group && (
            <button
              onClick={() => startAudio(group.key)}
              className="ml-auto shrink-0 flex items-center gap-1.5 rounded-sm border border-[#D97706] bg-white px-3 py-1.5 text-[12px] font-bold text-[#B45309] hover:bg-[#FEF3C7] transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              지금 재생
            </button>
          )}
        </div>
      ) : audioPhase === 'playing' ? (
        <div className="flex items-center gap-2 rounded-sm border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-2.5">
          <span className="flex items-end gap-0.5 h-3.5" aria-hidden>
            <span className="w-1 bg-[#2563EB] rounded-sm animate-pulse h-2" />
            <span className="w-1 bg-[#2563EB] rounded-sm animate-pulse h-3.5" />
            <span className="w-1 bg-[#2563EB] rounded-sm animate-pulse h-2.5" />
          </span>
          <span className="text-[12px] font-bold text-[#1D4ED8]">음원 재생 중…</span>
        </div>
      ) : audioPhase === 'blocked' ? (
        <button
          onClick={playBlocked}
          className="flex items-center gap-2 w-full rounded-sm border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-left hover:bg-[#FEE2E2] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#DC2626" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          <span className="text-[12px] font-bold text-[#B91C1C]">
            눌러서 음원 재생 — 브라우저가 자동재생을 막았습니다
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-sm border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-[12px] font-semibold text-[#9CA3AF]">음원 재생 완료 (실전은 다시 듣지 않습니다)</span>
        </div>
      )}
    </div>
  ))

  // Typography Settings styling class
  const fontStyleClass = fontType === 'serif' ? 'font-serif' : 'font-sans'
  const sizeClasses = FONT_SIZE_CLASSES[fontSize] || FONT_SIZE_CLASSES.normal

  return (
    <div className={`min-h-screen bg-[#F8FAFF] flex flex-col ${isSubmitted ? 'pb-24' : 'h-screen'}`}>
      
      {/* Top Header */}
      <header className="px-6 pt-safe-3.5 pb-3.5 bg-white border-b border-[#DBEAFE] flex items-center justify-between shrink-0 z-20 font-sans shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (isSubmitted ? router.push('/my-learning?tab=mock') : setAskExit(true))}
            aria-label="나가기"
            className="p-1.5 -ml-1 text-[#6B7280] hover:text-[#1C1B33]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-[#1C1B33] text-[15px] font-bold">
              Vol.{vol} TEST {test} ({area})
            </h1>
            <p className="text-[#9CA3AF] text-[10px] mt-0.5">실전 모의고사</p>
          </div>
        </div>

        {/* Timer & Controls */}
        <div className="flex items-center gap-4">
          {review && scoreResult && (
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-[12px] font-bold text-[#1C1B33]">
                {scoreResult.correctCount}/{scoreResult.totalCount}
                <span className="text-[#2563EB] ml-1.5">{scoreResult.estimatedScore}점</span>
              </span>
              <button
                onClick={() => setReviewing(false)}
                className="border border-[#DBEAFE] bg-white text-[#374151] px-3 py-1.5 rounded-sm font-bold text-[12px] hover:bg-[#F8FAFF] transition-colors"
              >
                결과 요약
              </button>
              <button
                onClick={() => setAskRestart(true)}
                className="border border-[#E5E7EB] bg-white text-[#6B7280] px-3 py-1.5 rounded-sm font-bold text-[12px] hover:border-[#FCA5A5] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
              >
                처음부터 다시 풀기
              </button>
            </div>
          )}

          {!isSubmitted && (
            /* 남은 시간. 파트별 연습(PracticeStage)의 시계는 **올라가는** 경과 시간이라
               페이스에 따라 색만 바뀌지만, 여기는 45분·75분 제한이 실제로 걸린 카운트다운이라
               늘 빨갛다. 색 규칙과 글자 크기는 그래서 다르고, 나머지(모양·아이콘·숫자 폭)는
               두 화면이 같은 것으로 보이게 맞춰 둔다. */
            <div className="flex items-center gap-1.5 bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-1.5 rounded-sm shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 shrink-0 text-[#DC2626]">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
              <span className="text-[#DC2626] font-bold text-[13px] tabular-nums">
                {formatTime(timeLeft)}
              </span>
            </div>
          )}

          {/* 글자 크기 — 파트별 연습·오답노트·타입 레슨과 **같은 버튼**이다(같은 패널을 연다).
              톱니바퀴였던 것을 '가'로 바꿨다: 톱니바퀴는 '환경설정 전반'으로 읽히는데
              실제 내용은 글자 크기·서체뿐이라 오히려 덜 정확했다. */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowSettings(!showSettings)}
              aria-label="글자 크기"
              aria-expanded={showSettings}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-bold transition-colors ${
                showSettings ? 'bg-[#2563EB] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0]'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 shrink-0">
                <path d="M4 20V7a3 3 0 0 1 3-3h1" /><path d="M13 20v-9a2 2 0 0 1 2-2h1" /><path d="M2 12h8" /><path d="M12 16h7" />
              </svg>
              가
            </button>
            {showSettings && (
              <>
                {/* 바깥을 누르면 접힌다 — 열어둔 패널이 문제를 가린 채 남으면 다시 버튼을
                    찾아 눌러야 한다. 화면 전체를 덮는 투명 판이 그 클릭을 받는다. */}
                <button
                  aria-label="보기 설정 닫기"
                  onClick={() => setShowSettings(false)}
                  className="fixed inset-0 z-40 cursor-default"
                />
                <div className="absolute right-0 mt-2 w-64 shadow-xl z-50">
                  <FontSettingsController />
                </div>
              </>
            )}
          </div>

          {!isSubmitted && (
            <button
              onClick={() => setAskSubmit(true)}
              className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-1.5 rounded-sm font-bold text-[13px] transition-colors"
            >
              제출하기
            </button>
          )}
        </div>
      </header>

      {!isSubmitted || reviewing ? (
        /* ================= 문제 화면 (풀이 · 복습 공용) ================= */
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left panel: Part selector and Questions list */}
          <div ref={drawAreaRef} className="flex-1 flex flex-col bg-white overflow-hidden">
            
            {/* Part Select Tabs */}
            <div className="flex border-b border-[#E5E7EB] shrink-0 bg-white">
              {parts.map(p => (
                <button
                  key={p}
                  onClick={() => goToPart(p)}
                  className={`flex-1 py-3 text-[13px] font-bold border-b-2 -mb-px transition-all ${
                    activePart === p
                      ? 'text-[#2563EB] border-[#2563EB]'
                      : 'text-[#9CA3AF] border-transparent hover:text-[#6B7280]'
                  }`}
                >
                  Part {p}
                </button>
              ))}
            </div>


            {/* ── 한 판 ── */}
            {!group ? (
              <div className="flex-1 flex items-center justify-center text-[#9CA3AF] text-[13px] font-sans">
                이 파트에 문제가 없습니다.
              </div>
            ) : group.type === 'set' && group.passage && (area === 'RC' || review) ? (
              /* 지문이 **읽는 글**인 판(Part 6·7) — 왼쪽 지문 / 오른쪽 문제.
                 시험 중에는 LC(Part 3·4)가 여기 오지 않는다. 그쪽 '지문'은 음원 스크립트라서
                 띄우는 순간 듣기 시험이 아니게 된다 — 실제 시험지에도 없는 종이다.
                 **복습에서는 연다** — 채점이 끝났으면 스크립트를 봐야 왜 놓쳤는지 안다.
                 두 칸이 **각자 스크롤**한다. 한 통으로 굴리면 지문을 보려고 올리는 순간 문제가 사라진다. */
              <div
                ref={splitRef}
                style={{ '--split': `${splitPct}%` } as React.CSSProperties}
                className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden"
              >
                {/* 지문 */}
                <div className="w-full md:w-[var(--split)] shrink-0 md:shrink flex flex-col bg-[#FAFBFF] border-b md:border-b-0 md:border-r border-[#DBEAFE] max-h-[45vh] md:max-h-none overflow-hidden">
                  <div className="px-5 pt-4 pb-2 shrink-0 font-sans space-y-2">
                    <span className="inline-block text-[10px] font-bold bg-[#EFF6FF] text-[#2563EB] px-2.5 py-1 rounded-sm uppercase tracking-wider">
                      지문 ({group.questions[0].question_no}~{group.questions[group.questions.length - 1].question_no}번)
                    </span>
                    {audioBar}
                  </div>

                  <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-2">
                    {group.passage.title && (
                      <h3 className="font-bold text-[14px] text-[#1C1B33] font-sans">{group.passage.title}</h3>
                    )}
                    {group.passage.meta?.length > 0 && (
                      <div className="text-[12px] text-[#4B5563] border border-[#E5E7EB] rounded-sm divide-y divide-[#E5E7EB] font-sans bg-white">
                        {group.passage.meta.map((m: { k: string; v: string }, i: number) => (
                          <div key={i} className="flex gap-2 px-3 py-1.5">
                            <span className="font-bold text-[#9CA3AF] shrink-0 w-16">{m.k}</span>
                            <span className="min-w-0">{m.v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={`${fontStyleClass} ${sizeClasses.body} text-[#374151] space-y-2`}>
                      {group.passage.sentences.map(sent => {
                        if (sent.blank_no != null) {
                          const around = sent.en.split(`___(${sent.blank_no})___`)
                          return (
                            <p key={sent.seq} className="leading-relaxed">
                              {around[0]}
                              <span className="inline-block border-b-2 border-black w-14 text-center font-bold font-sans text-[#2563EB] text-[13px]">
                                ({sent.blank_no})
                              </span>
                              {around[1]}
                            </p>
                          )
                        }
                        return (
                          <p key={sent.seq} className="leading-relaxed">
                            {sent.speaker && (
                              <strong className="text-[#1C1B33] font-sans font-bold">{sent.speaker}: </strong>
                            )}
                            {sent.en}
                          </p>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* 분할선 — 끌어서 폭 조절 */}
                <div
                  onMouseDown={startDrag}
                  onDoubleClick={() => setSplitPct(52)}
                  title="끌어서 폭 조절 (두 번 누르면 기본값)"
                  className="hidden md:flex w-1.5 shrink-0 cursor-col-resize bg-[#EFF2F7] hover:bg-[#C7D2FE] transition-colors items-center justify-center group"
                >
                  <span className="w-0.5 h-8 rounded bg-[#CBD5E1] group-hover:bg-[#2563EB]" />
                </div>

                {/* 문제 */}
                <div className="flex-1 min-w-0 overflow-y-auto px-5 py-4 space-y-6">
                  {group.questions.map(q => (
                    <div key={q.question_no} id={`q-box-${q.question_no}`} className="space-y-3 pb-5 border-b border-dashed border-gray-100 last:border-b-0 last:pb-0">
                      <div className="font-sans">
                        <span className="text-[11px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded">
                          {q.question_no}번
                        </span>
                      </div>

                      <p className={`${fontStyleClass} ${sizeClasses.desc} text-[#1C1B33] font-semibold leading-relaxed`}>
                        {/* Part 6 은 시험지에 문제 문장이 없다 — 지문의 번호 붙은 빈칸이 곧 문제다 */}
                        {q.content.question_text || (q.part === 6 ? `빈칸 (${q.content.question_number ?? ''})` : 'Select the best option.')}
                      </p>

                      <div className="grid grid-cols-1 gap-1.5 font-sans">
                        {q.options.map(opt => (
                          <OptionRow
                            key={opt.option_label}
                            option={opt}
                            qNo={q.question_no}
                            compact
                            reveal={review}
                            isCorrect={opt.is_correct}
                            sizeClass={sizeClasses.body}
                            selected={answers[q.question_no] === opt.option_label}
                            struck={!!eliminated[`${q.question_no}-${opt.option_label}`]}
                            fontStyleClass={fontStyleClass}
                            disabled={isSubmitted}
                            onSelect={handleAnswerSelect}
                            onStrike={toggleEliminate}
                          />
                        ))}
                      </div>

                      {review && (
                        <ExplainBox q={q} right={isRight(q)} sizeClass={sizeClasses.desc} fontStyleClass={fontStyleClass} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* 나머지 — LC 전체(Part 1~4)와 Part 5.
                 음원 막대는 판에 하나다(세트면 문항 셋이 그 하나를 같이 듣는다). */
              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="max-w-2xl mx-auto space-y-5">
                  {/* Part 1 사진 — 판에 문항이 하나뿐이라 위에 한 번 */}
                  {group.questions[0].part === 1 && group.questions[0].content.image_url && (
                    <div className="relative border border-[#E5E7EB] rounded-sm overflow-hidden shadow-inner">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={group.questions[0].content.image_url}
                        alt={`${group.questions[0].question_no}번 사진`}
                        className="w-full h-auto object-cover"
                      />
                    </div>
                  )}

                  {audioBar}

                  {group.questions.map(q => {
                    /* Part 1·2 는 시험지에 아무것도 인쇄되지 않는다 — 마킹 칸만 */
                    const sheetOnly = q.part === 1 || q.part === 2
                    return (
                      <div key={q.question_no} id={`q-box-${q.question_no}`} className="space-y-3">
                        <div className="font-sans">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-sm bg-[#EFF6FF] text-[#2563EB]">
                            Part {q.part} · {q.question_no}번
                          </span>
                        </div>

                        {/* 교재 조판 그대로.
                              Part 1 은 **사진만** 있고 글자가 한 줄도 없다 — 번호와 사진이 전부다.
                              Part 2 는 반대로 사진이 없고 'Mark your answer on your answer sheet.' 한 줄만 찍힌다. */}
                        {q.part !== 1 && (
                          <div className={`${fontStyleClass} text-[#1C1B33] leading-relaxed`}>
                            <p className={sizeClasses.body}>
                              {sheetOnly
                                ? 'Mark your answer on your answer sheet.'
                                : q.part === 5
                                  ? (q.content.blank_sentence || '')
                                  : (q.content.question_text || 'Select the best option.')}
                            </p>
                          </div>
                        )}

                        {sheetOnly ? (
                          <AnswerSheetRow
                            options={q.options}
                            qNo={q.question_no}
                            selected={answers[q.question_no]}
                            struckOf={(label) => !!eliminated[`${q.question_no}-${label}`]}
                            disabled={isSubmitted}
                            reveal={review}
                            correctLabel={correctOf(q)}
                            onSelect={handleAnswerSelect}
                            onStrike={toggleEliminate}
                          />
                        ) : (
                          <div className="grid grid-cols-1 gap-2 font-sans">
                            {q.options.map(opt => (
                              <OptionRow
                                key={opt.option_label}
                                option={opt}
                                qNo={q.question_no}
                                reveal={review}
                                isCorrect={opt.is_correct}
                                sizeClass={sizeClasses.body}
                                selected={answers[q.question_no] === opt.option_label}
                                struck={!!eliminated[`${q.question_no}-${opt.option_label}`]}
                                fontStyleClass={fontStyleClass}
                                disabled={isSubmitted}
                                onSelect={handleAnswerSelect}
                                onStrike={toggleEliminate}
                              />
                            ))}
                          </div>
                        )}

                        {review && (
                          <ExplainBox q={q} right={isRight(q)} sizeClass={sizeClasses.desc} fontStyleClass={fontStyleClass} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* 판 이동 — 보기 바로 아래. 위쪽 머리글에 두면 답을 고른 손이 화면을 가로질러
                올라가야 한다. 다음 문제로 넘어가는 동작은 보기 옆에 있어야 편하다. */}
            <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-t border-[#E5E7EB] shrink-0 bg-white font-sans">
              <button
                onClick={() => step(-1)}
                disabled={atFirst}
                className="flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-sm border border-[#E5E7EB] text-[#4B5563] hover:border-[#C7D2FE] disabled:opacity-35 disabled:hover:border-[#E5E7EB]"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                이전
              </button>

              <div className="text-center leading-tight">
                <p className="text-[12px] font-bold text-[#1C1B33]">
                  {group
                    ? group.questions.length > 1
                      ? `${group.questions[0].question_no}~${group.questions[group.questions.length - 1].question_no}번`
                      : `${group.questions[0].question_no}번`
                    : '—'}
                </p>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                  Part {activePart} · {groups.length ? groupIdx + 1 : 0} / {groups.length}
                </p>
              </div>

              <button
                onClick={() => step(1)}
                disabled={atLast}
                className="flex items-center gap-1 text-[12px] font-bold px-3 py-1.5 rounded-sm border border-[#E5E7EB] text-[#4B5563] hover:border-[#C7D2FE] disabled:opacity-35 disabled:hover:border-[#E5E7EB]"
              >
                다음
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>

          {/* ── 답안 현황 ──
              OMR 이 아니다 — OMR 은 시험장에서 기계가 읽는 그 마킹 카드고, 이건 화면 안에서
              **지금 무엇을 표기했는지 훑고 그 문항으로 건너뛰는** 자리다. 이름이 기능을 말하게 둔다. */}
          <div className="w-[260px] bg-[#F8FAFF] border-l border-[#DBEAFE] flex flex-col h-full shrink-0 font-sans">
            <div className="p-4 border-b border-[#DBEAFE] bg-white text-center shrink-0">
              <h2 className="text-[#1C1B33] text-[13px] font-black">답안 현황</h2>
              <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-[#9CA3AF] font-medium">
                <span className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 inline-block ${review ? 'bg-[#86EFAC]' : 'bg-blue-500'}`}></span>
                  {review ? '맞음' : '표기함'}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-2.5 h-2.5 inline-block ${review ? 'bg-[#FCA5A5]' : 'bg-gray-200'}`}></span>
                  {review ? '틀림' : '미표기'}
                </span>
              </div>
            </div>

            {/* Bubble list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Group bubbles by part */}
              {parts.map(partNum => {
                const partQs = questions.filter(q => q.part === partNum)
                if (partQs.length === 0) return null
                return (
                  <div key={partNum} className="space-y-1.5">
                    <p className="text-[10px] font-bold text-[#9CA3AF] uppercase">Part {partNum}</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {partQs.map(q => {
                        const chosen = answers[q.question_no]
                        const at = locate[q.question_no]
                        const isCurrent = at && at.part === activePart && at.idx === groupIdx
                        return (
                          <button
                            key={q.question_no}
                            onClick={() => {
                              goToQuestion(q.question_no)
                              // 판이 그려진 다음에 굴린다 (세트 안에서 그 문항 자리로)
                              setTimeout(() => scrollToQuestion(q.question_no), 10)
                            }}
                            className={`h-7 flex flex-col items-center justify-center text-[10px] font-semibold transition-all ${
                              review
                                /* 채점 뒤에는 표기 여부가 아니라 **맞았나**가 기준이다 —
                                   틀린 번호만 훑어 건너뛰는 것이 복습의 동선이다 */
                                ? (isRight(q)
                                    ? 'bg-[#F0FDF4] text-[#16A34A] border border-[#86EFAC]'
                                    : 'bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]')
                                : chosen
                                  ? 'bg-[#2563EB] text-white border border-[#2563EB]'
                                  : 'bg-white hover:border-[#2563EB] border border-gray-200 text-[#4B5563]'
                            } ${isCurrent ? 'ring-2 ring-[#2563EB] ring-offset-1' : ''}`}
                          >
                            <span className="leading-none text-[8px] opacity-75">{q.question_no}</span>
                            <span className="leading-none font-bold mt-0.5">{chosen || '-'}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ================= RESULT SCREEN ================= */
        <div className="flex-1 overflow-y-auto px-6 py-8 font-sans max-w-3xl mx-auto w-full space-y-6">
          
          {/* Score Header Card */}
          <div className="bg-white border border-[#DBEAFE] rounded-sm p-6 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-sm bg-[#EFF6FF] flex items-center justify-center text-[#2563EB] mx-auto">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/><path d="M22 12A10 10 0 0 1 12 22"/><path d="M2 12A10 10 0 0 1 12 2"/>
              </svg>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-[#9CA3AF] text-[12px] font-semibold">모의고사 풀이 결과</h2>
              <p className="text-[#1C1B33] font-black text-[28px] leading-tight">
                예상 점수: <span className="text-[#2563EB]">{scoreResult?.estimatedScore}점</span>
              </p>
              <p className="text-[13px] text-[#6B7280]">
                맞춘 개수: {scoreResult?.correctCount} / {scoreResult?.totalCount} 문제 
                (정답률 {Math.round(((scoreResult?.correctCount || 0) / (scoreResult?.totalCount || 1)) * 100)}%)
              </p>
            </div>

            <div className="pt-2 flex justify-center gap-3 flex-wrap">
              {/* 문항별 복습 — 지문·사진·음원이 다 있는 그 화면으로 돌아간다 */}
              <button
                onClick={() => { setReviewing(true); setGroupIdx(0); setActivePart(parts[0]) }}
                className="bg-[#1C1B33] hover:bg-[#33324D] text-white px-6 py-2.5 rounded-sm font-bold text-[13px] transition-colors shadow-sm"
              >
                문항별로 다시 보기
              </button>
              <Link 
                href="/my-learning?tab=wrong" 
                className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-sm font-bold text-[13px] transition-colors shadow-sm"
              >
                틀린 문제 AI 오답노트에서 보기
              </Link>
              <button 
                onClick={() => {
                  setIsSubmitted(false)
                  setAnswers({})
                  setEliminated({})        // 그어 둔 보기도 같이 지운다 — 다시 푸는데 남아 있으면 답이 새어 나간다
                  playedRef.current.clear() // 음원도 처음부터 — 안 그러면 전부 '재생 완료'로 뜬다
                  setGroupIdx(0)
                  setActivePart(parts[0])
                  setTimeLeft(timeLimit)
                  setIsTimerRunning(true)
                  setElapsedTime(0)
                }}
                className="bg-white border border-[#DBEAFE] hover:bg-[#EFF6FF] text-[#374151] px-6 py-2.5 rounded-sm font-semibold text-[13px] transition-colors"
              >
                다시 풀기
              </button>
            </div>
          </div>

          {/* Correct/Incorrect List */}
          <div className="bg-white border border-[#DBEAFE] rounded-sm shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DBEAFE] bg-gray-50 flex items-center justify-between">
              <h3 className="text-[#1C1B33] font-bold text-[14px]">오답 분석 리스트 ({scoreResult?.wrongQuestions.length}개)</h3>
              <span className="text-[11px] text-[#9CA3AF]">오답은 AI 오답노트에 자동 등록되었습니다.</span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {scoreResult?.wrongQuestions.length === 0 ? (
                <div className="py-12 text-center text-[#9CA3AF] text-[13px]">
                  와우! 틀린 문제가 하나도 없습니다! 완벽합니다. 👍
                </div>
              ) : (
                scoreResult?.wrongQuestions.map(wq => (
                  <div key={wq.qNo} className="p-4 hover:bg-[#FAFBFF] transition-all space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded">
                        {wq.qNo}번 틀림
                      </span>
                      {wq.qtype && (
                        <span className="text-[#9CA3AF] font-medium bg-gray-100 px-2 py-0.5 rounded">
                          유형: {wq.qtype}
                        </span>
                      )}
                    </div>
                    <p className={`text-[13px] text-[#1C1B33] font-medium line-clamp-2 ${fontStyleClass}`}>
                      {wq.questionText}
                    </p>
                    <div className="flex gap-4 text-[11px]">
                      <span className="text-gray-500">내 선택: <strong className="text-red-500 font-bold">{wq.chosen}</strong></span>
                      <span className="text-gray-500">정답: <strong className="text-green-600 font-bold">{wq.correct}</strong></span>
                    </div>
                    <div className="text-[11px] bg-red-50/50 p-2.5 rounded-sm border border-red-100 text-[#4B5563] leading-relaxed">
                      <strong className="text-red-500 font-bold block mb-0.5">정답 근거 & 해설:</strong>
                      {wq.explain}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── 필기 ──
          답안지(오른쪽)와 머리글은 빼고 **문제 영역에만** 덮는다 — 답안지 위에 그으면
          번호를 눌러 이동할 수가 없다. 채점 뒤에는 그릴 일이 없어 붙이지 않는다. */}
      {!isSubmitted && resume === 'go' && (
        <>
          <DrawingOverlay {...draw} bounds={drawAreaRef} hidePalette />
          <PenFab {...draw} bottomClass="bottom-20" />
        </>
      )}

      {/* ── 처음부터 다시 풀기 (복습 중) ── */}
      {askRestart && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6 font-sans">
          <div role="dialog" aria-modal="true"
            className="w-full max-w-sm bg-white rounded-sm border border-[#E5E7EB] shadow-xl p-5 space-y-4">
            <div className="space-y-1.5">
              <h2 className="text-[16px] font-black text-[#1C1B33]">처음부터 다시 풀까요?</h2>
              <p className="text-[13px] text-[#6B7280] leading-relaxed">
                표기한 답과 채점 결과가 지워집니다. 되돌릴 수 없습니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAskRestart(false)}
                className="flex-1 py-2.5 rounded-sm border border-[#DBEAFE] bg-white text-[#374151] font-bold text-[13px] hover:bg-[#F8FAFF] transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => {
                  resetAttempt(key)
                  setAnswers({})
                  setEliminated({})
                  playedRef.current.clear()
                  setScoreResult(null)
                  setIsSubmitted(false)
                  setReviewing(false)
                  setGroupIdx(0)
                  setActivePart(parts[0])
                  setTimeLeft(timeLimit)
                  setIsTimerRunning(true)
                  setElapsedTime(0)
                  setAskRestart(false)
                }}
                className="flex-1 py-2.5 rounded-sm bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-[13px] transition-colors"
              >
                지우고 다시
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 제출 확인 ──
          실전은 **한 번에 채점**된다 — 문항별로 맞았는지 알려주며 가는 방식이 아니라,
          100문항을 다 풀고 한꺼번에 결과를 받는다. 되돌릴 수 없으니 누르기 전에 묻고,
          안 푼 문항이 남았으면 그 수를 말해준다.
          시간이 0이 되면 이 창 없이 그대로 제출된다 — 그때는 물어볼 일이 아니다. */}
      {askSubmit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6 font-sans">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
            className="w-full max-w-sm bg-white rounded-sm border border-[#E5E7EB] shadow-xl p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <h2 id="submit-title" className="text-[16px] font-black text-[#1C1B33]">제출하고 채점할까요?</h2>
              {unanswered.length > 0 && (
                <p className="text-[13px] text-[#B45309] leading-relaxed">
                  아직 풀지 않은 문항이 <b>{unanswered.length}개</b> 있습니다.
                  제출하면 풀이하지 않은 문항은 모두 오답처리됩니다.
                </p>
              )}
              <p className="text-[13px] text-[#6B7280] leading-relaxed">제출 후에는 답을 고칠 수 없습니다.</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setAskSubmit(false)}
                className="flex-1 py-2.5 rounded-sm border border-[#DBEAFE] bg-white text-[#374151] font-bold text-[13px] hover:bg-[#F8FAFF] transition-colors"
              >
                계속 풀기
              </button>
              <button
                onClick={() => { setAskSubmit(false); handleSubmit() }}
                className="flex-1 py-2.5 rounded-sm bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[13px] transition-colors"
              >
                제출
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 종료 확인 ──
          뒤로 가기 한 번에 시험이 끝나면 안 된다 — 시간 재고 푸는 중인데 손이 미끄러질 수 있다.
          다만 **돌이킬 수 없는 일은 아니다.** 표기한 답은 저장되고 다시 들어오면 이어할 수 있다.
          그래서 겁주는 문구도 빨간 버튼도 쓰지 않는다.
          (채점을 마친 뒤에는 묻지 않는다 — 그때는 결과를 이미 본 상태다) */}
      {askExit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-6 font-sans">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-title"
            className="w-full max-w-sm bg-white rounded-sm border border-[#E5E7EB] shadow-xl p-5 space-y-4"
          >
            <div className="space-y-1.5">
              <h2 id="exit-title" className="text-[16px] font-black text-[#1C1B33]">정말 그만하시겠어요?</h2>
              <p className="text-[13px] text-[#6B7280] leading-relaxed">
                지금까지 푼 문제 기록은 저장됩니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setAskExit(false)}
                className="flex-1 py-2.5 rounded-sm border border-[#DBEAFE] bg-white text-[#374151] font-bold text-[13px] hover:bg-[#F8FAFF] transition-colors"
              >
                계속 풀기
              </button>
              <button
                onClick={() => {
                  audioRef.current?.pause()
                  /* 여기서 한 번 더 저장한다 — 마지막으로 답한 뒤 흘러간 시간까지 남겨야
                     이어했을 때 시계가 실제로 남은 만큼에서 시작한다 */
                  saveProgress(key, {
                    answers, eliminated, timeLeft, activePart, groupIdx,
                    played: Array.from(playedRef.current),
                  })
                  router.push('/my-learning?tab=mock')
                }}
                className="flex-1 py-2.5 rounded-sm bg-[#1C1B33] hover:bg-[#33324D] text-white font-bold text-[13px] transition-colors"
              >
                그만두기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TestSolver() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center gap-4 text-[#6B7280] font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2563EB]"></div>
        <p className="font-semibold">화면을 불러오고 있습니다...</p>
      </div>
    }>
      <TestSolverInner />
    </Suspense>
  )
}
