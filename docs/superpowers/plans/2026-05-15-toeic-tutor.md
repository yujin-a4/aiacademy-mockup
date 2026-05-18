# AI 토익 과외 프로토타입 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React + Tailwind CSS 단일 App.js로 필기 캔버스, STT, TTS, 강사 3명 선택 기능이 담긴 AI 토익 과외 태블릿 프로토타입을 만든다.

**Architecture:** Vite + React 프로젝트. 모든 컴포넌트와 로직은 `src/App.jsx` 한 파일에 인라인 함수로 정의. 상태는 React hooks로만 관리. 외부 UI 라이브러리 없음.

**Tech Stack:** Vite, React 18, Tailwind CSS v3, Web Speech API (STT), window.speechSynthesis (TTS), Canvas API, localStorage

---

## 파일 구조

```
toeic-tutor/
├── src/
│   ├── App.jsx          ← 모든 컴포넌트·로직이 담긴 메인 파일
│   └── index.css        ← Tailwind directives + 커스텀 애니메이션
├── public/
│   └── dummy-toeic.png  ← 더미 토익 RC 문제 이미지
├── index.html
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## Task 1: 프로젝트 초기 세팅

**Files:**
- Create: `toeic-tutor/` (Vite 프로젝트 루트)
- Create: `src/index.css`
- Modify: `tailwind.config.js`

- [ ] **Step 1: Vite + React 프로젝트 생성**

```bash
cd C:/Users/정연/Documents/aiacademy
npm create vite@latest toeic-tutor -- --template react
cd toeic-tutor
npm install
```

- [ ] **Step 2: Tailwind CSS 설치**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: tailwind.config.js 설정**

```js
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0d1117',
        panel: '#161b22',
        border: '#30363d',
        accent: '#22c55e',
        'accent-dim': '#16a34a',
      },
      keyframes: {
        glow: { '0%,100%': { boxShadow: '0 0 8px #22c55e66' }, '50%': { boxShadow: '0 0 20px #22c55eaa' } },
        wiggle: { '0%,100%': { transform: 'rotate(0deg)' }, '25%': { transform: 'rotate(-2deg)' }, '75%': { transform: 'rotate(2deg)' } },
        scaleUp: { '0%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        glow: 'glow 1.5s ease-in-out infinite',
        wiggle: 'wiggle 0.4s ease-in-out 3',
        scaleUp: 'scaleUp 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 4: src/index.css 설정**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { margin: 0; background: #0d1117; }

/* 캔버스가 이미지 위에 정확히 겹치도록 */
.canvas-wrapper { position: relative; }
.canvas-wrapper canvas { position: absolute; top: 0; left: 0; }

/* 채팅 스크롤바 */
.chat-scroll::-webkit-scrollbar { width: 4px; }
.chat-scroll::-webkit-scrollbar-thumb { background: #30363d; border-radius: 2px; }
```

- [ ] **Step 5: 더미 토익 이미지 생성**

`public/dummy-toeic.png` 가 없으므로, App.jsx에서 Canvas로 즉석 생성하는 방식으로 대체 (Task 3에서 처리).

- [ ] **Step 6: 개발 서버 실행 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 열어서 Vite 기본 화면이 보이면 성공.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: Vite + React + Tailwind 초기 세팅"
```

---

## Task 2: App 껍데기 — 3단 레이아웃 + 테마

**Files:**
- Modify: `src/App.jsx` (전체 재작성)

- [ ] **Step 1: App.jsx 기본 3단 레이아웃 작성**

```jsx
// src/App.jsx
import { useState, useRef, useEffect, useCallback } from 'react'
import './index.css'

// ── 상수: 강사 데이터 ──────────────────────────────────────────
const INSTRUCTORS = [
  {
    id: 'blunt',
    name: '박직설',
    title: '팩폭 전문',
    emoji: '😤',
    personality: 'blunt',
    color: 'border-red-500',
    badgeColor: 'bg-red-900 text-red-300',
    glowColor: 'shadow-red-500/30',
    ttsRate: 1.1,
    ttsPitch: 0.9,
    greetings: [
      '시작합시다. 감상적인 말은 없어요.',
      '시간 낭비 없이 바로 시작하죠.',
      '준비됐으면 문제 보세요.',
    ],
    analysisResponses: [
      '필기 확인했어요. 틀린 부분이 눈에 띄네요. 기초부터 다시 잡아야겠습니다.',
      '밑줄 친 부분 봤어요. 왜 그게 답인지 아직도 모르는 거잖아요. 설명할게요.',
      '동그라미 친 선택지, 오답이에요. 이유를 모르면 다음에도 또 틀려요.',
    ],
    voiceResponses: [
      '그렇게 생각했다면 잘못됐어요. 정확한 근거를 봐요.',
      '맞아요. 근데 왜 맞는지 설명할 수 있어요?',
      '핵심은 문장 구조예요. 감으로 풀면 안 됩니다.',
    ],
  },
  {
    id: 'kind',
    name: '이친절',
    title: '다정 멘토',
    emoji: '😊',
    personality: 'kind',
    color: 'border-green-500',
    badgeColor: 'bg-green-900 text-green-300',
    glowColor: 'shadow-green-500/30',
    ttsRate: 0.9,
    ttsPitch: 1.2,
    greetings: [
      '안녕하세요! 오늘도 같이 열심히 해봐요 😊',
      '잘 왔어요! 오늘도 최선을 다해볼게요!',
      '반가워요~ 오늘 어떤 파트가 어려웠나요?',
    ],
    analysisResponses: [
      '필기 잘 했어요! 밑줄 친 부분을 같이 살펴볼게요. 괜찮아요, 천천히 해봐요.',
      '오, 여기 동그라미 쳤군요! 좋은 감각이에요. 같이 왜 그런지 생각해봐요.',
      '잘 보고 있어요! 이 부분이 헷갈렸죠? 제가 쉽게 설명해드릴게요.',
    ],
    voiceResponses: [
      '좋은 생각이에요! 거기서 한 발짝만 더 나가볼게요.',
      '맞아요! 잘했어요 정말. 이 개념 확실히 잡은 것 같네요!',
      '괜찮아요, 헷갈리는 거 당연해요. 같이 차근차근 봐요.',
    ],
  },
  {
    id: 'neutral',
    name: '최중립',
    title: '분석형 강사',
    emoji: '🧑‍💼',
    personality: 'neutral',
    color: 'border-blue-500',
    badgeColor: 'bg-blue-900 text-blue-300',
    glowColor: 'shadow-blue-500/30',
    ttsRate: 1.0,
    ttsPitch: 1.0,
    greetings: [
      '수업을 시작하겠습니다. 문제를 확인하세요.',
      '오늘 학습 목표를 설정하고 시작합니다.',
      '준비 완료. 분석을 시작하겠습니다.',
    ],
    analysisResponses: [
      '필기 내용을 분석했습니다. 표시된 구간의 문법 구조를 검토하세요.',
      '마킹 패턴을 확인했습니다. 해당 선택지의 오답 근거를 제시하겠습니다.',
      '분석 결과: 집중 표시된 부분은 주어-동사 일치 문제입니다.',
    ],
    voiceResponses: [
      '발화 내용을 분석했습니다. 핵심 개념을 정리하겠습니다.',
      '정확한 이해입니다. 다음 단계로 진행하겠습니다.',
      '추가 설명이 필요한 부분을 식별했습니다.',
    ],
  },
]

// ── 내비게이션 아이콘 목록 ──────────────────────────────────────
const NAV_ITEMS = [
  { id: 'home',     icon: '🏠', label: '홈' },
  { id: 'question', icon: '📄', label: '문제' },
  { id: 'history',  icon: '📋', label: '기록' },
  { id: 'settings', icon: '⚙️', label: '설정' },
]

export default function App() {
  // ── 상태 ──────────────────────────────────────────────────────
  const [selectedInstructor, setSelectedInstructor] = useState(null)
  const [tutorMood, setTutorMood] = useState('idle') // idle | thinking | speaking | reacting
  const [activeNav, setActiveNav] = useState('question')
  const [chatHistory, setChatHistory] = useState([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [penColor, setPenColor] = useState('#22c55e')
  const [penSize, setPenSize] = useState(3)
  const [drawingTool, setDrawingTool] = useState('pen') // pen | eraser
  const [isDrawing, setIsDrawing] = useState(false)

  // ── refs ──────────────────────────────────────────────────────
  const canvasRef = useRef(null)
  const chatEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const lastPos = useRef({ x: 0, y: 0 })

  // TODO: Task 3 이후 로직 추가
  return (
    <div className="flex h-screen bg-surface text-white font-sans overflow-hidden">
      {/* 왼쪽 내비 */}
      <nav className="w-16 bg-panel border-r border-border flex flex-col items-center py-4 gap-2 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-lg mb-4">🎓</div>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveNav(item.id)}
            title={item.label}
            className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-lg transition-all
              ${activeNav === item.id ? 'bg-accent/20 text-accent' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
          >
            {item.icon}
          </button>
        ))}
      </nav>

      {/* 중앙 문제 패널 — Task 3에서 채움 */}
      <main className="flex-[3] bg-surface border-r border-border flex items-center justify-center">
        <p className="text-gray-500">문제 패널 (Task 3)</p>
      </main>

      {/* 오른쪽 강사 패널 — Task 4~5에서 채움 */}
      <aside className="flex-[2] bg-panel flex items-center justify-center">
        <p className="text-gray-500">강사 패널 (Task 4)</p>
      </aside>
    </div>
  )
}
```

- [ ] **Step 2: 개발 서버에서 3단 레이아웃 확인**

`npm run dev` 실행 후 브라우저에서 왼쪽 내비 / 중앙 / 오른쪽 구분이 보이면 성공.

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: 3단 레이아웃 기본 틀"
```

---

## Task 3: 중앙 문제 패널 + Canvas 필기

**Files:**
- Modify: `src/App.jsx` — QuestionPanel, CanvasOverlay, CanvasToolbar 함수 추가 + App 내부 교체

- [ ] **Step 1: 더미 토익 이미지 생성 함수 추가**

App.jsx 상단 상수 영역 아래에 추가:

```jsx
// 더미 토익 RC 문제 텍스트 (이미지 대신 styled div로 표현)
function DummyToeicQuestion() {
  return (
    <div className="bg-white text-gray-900 rounded-lg p-6 w-full h-full overflow-auto text-sm leading-relaxed font-serif select-none">
      <p className="font-bold text-base mb-3">Part 7 Questions 147-148 refer to the following e-mail.</p>
      <div className="border border-gray-300 rounded p-4 mb-4 bg-gray-50">
        <div className="grid grid-cols-2 gap-1 text-xs text-gray-600 mb-2">
          <span><strong>To:</strong> marketing@globaltech.com</span>
          <span><strong>Date:</strong> March 14</span>
          <span><strong>From:</strong> j.harrison@premiersupplies.com</span>
          <span><strong>Subject:</strong> Product Inquiry</span>
        </div>
        <hr className="border-gray-300 mb-3" />
        <p className="mb-2">Dear Marketing Team,</p>
        <p className="mb-2">
          I am writing to <span className="font-semibold">inquire</span> about your latest line of office equipment.
          Our company is currently <span className="font-semibold">expanding</span> its operations and we are
          looking for reliable suppliers who can meet our growing demands.
        </p>
        <p className="mb-2">
          We would appreciate it if you could send us a catalog along with your pricing
          information. Additionally, we are interested in knowing whether you offer
          bulk purchase discounts and what your standard delivery time frames are.
        </p>
        <p className="mb-2">
          Please feel free to contact me at your earliest convenience. We look forward
          to the possibility of establishing a <span className="font-semibold">mutually beneficial</span> business relationship.
        </p>
        <p>Sincerely,<br />James Harrison<br />Procurement Manager</p>
      </div>

      <div className="space-y-4">
        <div>
          <p className="font-bold mb-2">147. What is the purpose of the e-mail?</p>
          <div className="space-y-1 pl-4">
            {['(A) To confirm a recent order', '(B) To request product information', '(C) To complain about a delivery', '(D) To apply for a job position'].map((opt, i) => (
              <p key={i} className="hover:bg-yellow-100 rounded px-1 cursor-default">{opt}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="font-bold mb-2">148. What does Mr. Harrison ask about?</p>
          <div className="space-y-1 pl-4">
            {['(A) Company history', '(B) Staff qualifications', '(C) Volume discounts', '(D) Warranty policies'].map((opt, i) => (
              <p key={i} className="hover:bg-yellow-100 rounded px-1 cursor-default">{opt}</p>            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: CanvasToolbar 컴포넌트 추가**

```jsx
const PEN_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#000000']

function CanvasToolbar({ penColor, setPenColor, penSize, setPenSize, drawingTool, setDrawingTool, onClear }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-panel border-b border-border">
      {/* 색상 팔레트 */}
      <div className="flex gap-1">
        {PEN_COLORS.map(c => (
          <button
            key={c}
            onClick={() => { setPenColor(c); setDrawingTool('pen') }}
            className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110
              ${penColor === c && drawingTool === 'pen' ? 'border-white scale-110' : 'border-transparent'}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      {/* 굵기 */}
      <div className="flex items-center gap-1">
        {[2, 4, 7].map(s => (
          <button
            key={s}
            onClick={() => { setPenSize(s); setDrawingTool('pen') }}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors
              ${penSize === s && drawingTool === 'pen' ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:bg-white/5'}`}
          >
            <div className="rounded-full bg-current" style={{ width: s + 4, height: s + 4 }} />
          </button>
        ))}
      </div>
      <div className="w-px h-5 bg-border" />
      {/* 지우개 */}
      <button
        onClick={() => setDrawingTool(t => t === 'eraser' ? 'pen' : 'eraser')}
        title="지우개"
        className={`w-7 h-7 rounded text-base transition-colors
          ${drawingTool === 'eraser' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-400 hover:bg-white/5'}`}
      >🧹</button>
      {/* 초기화 */}
      <button
        onClick={onClear}
        title="캔버스 초기화"
        className="w-7 h-7 rounded text-base text-gray-400 hover:bg-white/5 transition-colors"
      >🗑️</button>
    </div>
  )
}
```

- [ ] **Step 3: QuestionPanel 컴포넌트 추가**

```jsx
function QuestionPanel({
  canvasRef, penColor, penSize, drawingTool, setDrawingTool,
  setPenColor, setPenSize, isDrawing, setIsDrawing, lastPos,
}) {
  // 캔버스 좌표 보정 (스크롤/리사이즈 대응)
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    }
  }

  const startDraw = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    const pos = getPos(e, canvas)
    lastPos.current = pos
    // 점 하나 찍기
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, (drawingTool === 'eraser' ? 20 : penSize) / 2, 0, Math.PI * 2)
    ctx.fillStyle = drawingTool === 'eraser' ? 'rgba(0,0,0,0)' : penColor
    if (drawingTool === 'eraser') ctx.clearRect(pos.x - 10, pos.y - 10, 20, 20)
    else ctx.fill()
  }

  const draw = (e) => {
    e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)

    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)

    if (drawingTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.lineWidth = 20
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.strokeStyle = penColor
      ctx.lineWidth = penSize
    }
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.globalCompositeOperation = 'source-over'
    lastPos.current = pos
  }

  const stopDraw = () => setIsDrawing(false)

  // 캔버스 크기를 부모에 맞게 초기화
  const wrapperRef = useRef(null)
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const wrapper = wrapperRef.current
      if (!canvas || !wrapper) return
      // 현재 그림 보존
      const tmp = canvas.toDataURL()
      canvas.width = wrapper.clientWidth
      canvas.height = wrapper.clientHeight
      const img = new Image()
      img.onload = () => canvasRef.current?.getContext('2d').drawImage(img, 0, 0)
      img.src = tmp
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="flex flex-col h-full">
      <CanvasToolbar
        penColor={penColor} setPenColor={setPenColor}
        penSize={penSize} setPenSize={setPenSize}
        drawingTool={drawingTool} setDrawingTool={setDrawingTool}
        onClear={clearCanvas}
      />
      {/* 문제 + 캔버스 겹침 영역 */}
      <div ref={wrapperRef} className="relative flex-1 overflow-hidden">
        {/* 실제 토익 문제 */}
        <div className="absolute inset-0 overflow-auto p-4">
          <DummyToeicQuestion />
        </div>
        {/* 필기 캔버스 레이어 */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10"
          style={{ cursor: drawingTool === 'eraser' ? 'cell' : 'crosshair', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: App 컴포넌트의 중앙 패널 교체**

App return 내 `<main>` 태그를:
```jsx
<main className="flex-[3] bg-surface border-r border-border flex flex-col overflow-hidden">
  <QuestionPanel
    canvasRef={canvasRef}
    penColor={penColor} setPenColor={setPenColor}
    penSize={penSize} setPenSize={setPenSize}
    drawingTool={drawingTool} setDrawingTool={setDrawingTool}
    isDrawing={isDrawing} setIsDrawing={setIsDrawing}
    lastPos={lastPos}
  />
</main>
```

- [ ] **Step 5: 브라우저에서 캔버스 필기 테스트**

문제 텍스트 위에 마우스로 드래그하면 초록색 선이 그려지고, 색상/굵기 변경, 지우개, 초기화가 동작하면 성공.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/index.css
git commit -m "feat: 토익 문제 + 캔버스 필기 레이어"
```

---

## Task 4: 강사 선택 화면

**Files:**
- Modify: `src/App.jsx` — InstructorSelector 컴포넌트 추가 + TutorPanel 추가

- [ ] **Step 1: InstructorSelector 컴포넌트 추가**

```jsx
function InstructorSelector({ onSelect }) {
  return (
    <div className="flex flex-col h-full items-center justify-center p-6 gap-6">
      <div className="text-center">
        <div className="text-4xl mb-2">🎓</div>
        <h2 className="text-lg font-bold text-white">강사를 선택하세요</h2>
        <p className="text-sm text-gray-400 mt-1">수업 스타일에 맞는 강사와 함께해요</p>
      </div>
      <div className="flex flex-col gap-3 w-full">
        {INSTRUCTORS.map(inst => (
          <button
            key={inst.id}
            onClick={() => onSelect(inst)}
            className={`flex items-center gap-4 p-4 rounded-xl border-2 bg-surface
              hover:bg-white/5 transition-all text-left group ${inst.color}`}
          >
            <div className="text-3xl">{inst.emoji}</div>
            <div className="flex-1">
              <div className="font-bold text-white">{inst.name}</div>
              <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-0.5 ${inst.badgeColor}`}>
                {inst.title}
              </div>
            </div>
            <span className="text-gray-500 group-hover:text-gray-300 transition-colors">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: TutorPanel 껍데기 추가 (강사 미선택 시 선택 화면 표시)**

```jsx
function TutorPanel({ instructor, onSelectInstructor, /* 나머지 props는 Task 5~8에서 추가 */ }) {
  if (!instructor) return <InstructorSelector onSelect={onSelectInstructor} />
  return (
    <div className="flex flex-col h-full">
      <p className="text-gray-500 m-auto">강사 패널 (Task 5에서 완성)</p>
    </div>
  )
}
```

- [ ] **Step 3: App return의 `<aside>` 교체**

```jsx
<aside className="flex-[2] bg-panel flex flex-col overflow-hidden">
  <TutorPanel
    instructor={selectedInstructor}
    onSelectInstructor={(inst) => {
      setSelectedInstructor(inst)
      setChatHistory([{
        role: 'tutor',
        text: inst.greetings[Math.floor(Math.random() * inst.greetings.length)],
        timestamp: Date.now(),
      }])
    }}
  />
</aside>
```

- [ ] **Step 4: 브라우저에서 강사 선택 확인**

오른쪽 패널에 3명의 강사 카드가 표시되고 클릭하면 `selectedInstructor` 상태가 바뀌면 성공 (콘솔로 확인).

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: 강사 선택 화면"
```

---

## Task 5: 강사 카드 + 채팅 히스토리 UI

**Files:**
- Modify: `src/App.jsx` — TutorCard, ChatHistory, TutorPanel 완성

- [ ] **Step 1: TutorCard 컴포넌트 추가**

```jsx
function TutorCard({ instructor, mood }) {
  const moodAnimation = {
    idle: '',
    thinking: 'animate-wiggle',
    speaking: 'animate-glow',
    reacting: 'animate-scaleUp',
  }
  return (
    <div className={`flex items-center gap-3 p-4 border-b border-border
      bg-gradient-to-r from-panel to-surface`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl
        border-2 shadow-lg transition-all duration-300 ${instructor.color} ${instructor.glowColor}
        ${moodAnimation[mood]}`}>
        {mood === 'thinking' ? '🤔' : mood === 'speaking' ? '🗣️' : instructor.emoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-white">{instructor.name}</div>
        <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${instructor.badgeColor}`}>
          {instructor.title}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className={`w-2 h-2 rounded-full ${mood === 'idle' ? 'bg-gray-500' : 'bg-accent animate-pulse'}`} />
        <span className="text-xs text-gray-500">
          {mood === 'idle' ? '대기' : mood === 'thinking' ? '분석 중' : mood === 'speaking' ? '설명 중' : '반응'}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ChatHistory 컴포넌트 추가**

```jsx
function ChatHistory({ history, chatEndRef }) {
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 chat-scroll">
      {history.length === 0 && (
        <p className="text-center text-gray-600 text-sm mt-8">강사를 선택하면 수업이 시작됩니다</p>
      )}
      {history.map((msg, i) => (
        <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className="text-lg shrink-0">{msg.role === 'user' ? '🙋' : '🤖'}</div>
          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed
            ${msg.role === 'user'
              ? 'bg-accent/20 text-green-100 rounded-tr-sm'
              : 'bg-white/5 text-gray-200 rounded-tl-sm border border-border'
            }`}>
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>
  )
}
```

- [ ] **Step 3: TutorPanel 완성 (강사 선택 이후 화면)**

TutorPanel 함수를 아래로 교체:
```jsx
function TutorPanel({
  instructor, onSelectInstructor, tutorMood,
  chatHistory, chatEndRef,
  // 나머지 props는 Task 6~8에서 추가
}) {
  if (!instructor) return <InstructorSelector onSelect={onSelectInstructor} />
  return (
    <div className="flex flex-col h-full">
      <TutorCard instructor={instructor} mood={tutorMood} />
      <ChatHistory history={chatHistory} chatEndRef={chatEndRef} />
      {/* VoiceBar + AnalyzeButton — Task 6~7에서 추가 */}
      <div className="p-3 border-t border-border text-center text-xs text-gray-600">
        분석·음성 기능은 Task 6~7에서 추가됩니다
      </div>
    </div>
  )
}
```

- [ ] **Step 4: App의 TutorPanel props 업데이트**

```jsx
<TutorPanel
  instructor={selectedInstructor}
  onSelectInstructor={(inst) => {
    setSelectedInstructor(inst)
    setChatHistory([{
      role: 'tutor',
      text: inst.greetings[Math.floor(Math.random() * inst.greetings.length)],
      timestamp: Date.now(),
    }])
  }}
  tutorMood={tutorMood}
  chatHistory={chatHistory}
  chatEndRef={chatEndRef}
/>
```

- [ ] **Step 5: 브라우저 확인**

강사 선택 후 프로필 카드 + 인사말 채팅 버블이 보이면 성공.

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: 강사 카드 + 채팅 히스토리 UI"
```

---

## Task 6: 분석 기능 (Canvas 캡처 + 시뮬레이션 + TTS)

**Files:**
- Modify: `src/App.jsx` — TTS 훅, 분석 핸들러, AnalyzeButton 컴포넌트, VoiceBar 하단 배치

- [ ] **Step 1: TTS 유틸리티 함수 추가 (App 바깥)**

```jsx
function speak(text, instructor, onStart, onEnd) {
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'ko-KR'
  utter.rate = instructor.ttsRate
  utter.pitch = instructor.ttsPitch
  utter.onstart = onStart
  utter.onend = onEnd
  window.speechSynthesis.speak(utter)
}
```

- [ ] **Step 2: 분석 핸들러 추가 (App 컴포넌트 내부)**

```jsx
const handleAnalyze = useCallback(() => {
  if (!selectedInstructor || isAnalyzing) return
  const canvas = canvasRef.current
  if (!canvas) return

  // 캔버스 캡처 → 콘솔 출력
  const dataURL = canvas.toDataURL('image/png')
  console.log('[분석] 캔버스 캡처 완료:', dataURL.slice(0, 80) + '...')

  setIsAnalyzing(true)
  setTutorMood('thinking')

  // AI 분석 시뮬레이션 (1.5초 지연)
  setTimeout(() => {
    const responses = selectedInstructor.analysisResponses
    const response = responses[Math.floor(Math.random() * responses.length)]

    setChatHistory(prev => [...prev, { role: 'tutor', text: response, timestamp: Date.now() }])
    setIsAnalyzing(false)

    speak(
      response,
      selectedInstructor,
      () => { setIsSpeaking(true); setTutorMood('speaking') },
      () => { setIsSpeaking(false); setTutorMood('idle') },
    )
  }, 1500)
}, [selectedInstructor, isAnalyzing])
```

- [ ] **Step 3: AnalyzeButton + 하단 액션바 컴포넌트 추가**

```jsx
function BottomActionBar({ onAnalyze, isAnalyzing, isSpeaking, isListening, onMicToggle }) {
  return (
    <div className="p-3 border-t border-border flex gap-2">
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
          ${isAnalyzing
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-accent hover:bg-accent-dim text-white shadow-lg shadow-accent/20'
          }`}
      >
        {isAnalyzing ? '🤔 분석 중...' : '🔍 필기 분석'}
      </button>
      <button
        onClick={onMicToggle}
        className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all
          ${isListening
            ? 'bg-red-500/20 border-2 border-red-500 text-red-400 animate-pulse'
            : 'bg-white/5 border border-border text-gray-400 hover:text-white'
          }`}
        title={isListening ? '마이크 끄기' : '마이크 켜기'}
      >
        {isListening ? '⏹️' : '🎙️'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: TutorPanel에 BottomActionBar 연결**

TutorPanel의 하단 placeholder를:
```jsx
<BottomActionBar
  onAnalyze={onAnalyze}
  isAnalyzing={isAnalyzing}
  isSpeaking={isSpeaking}
  isListening={isListening}
  onMicToggle={onMicToggle}
/>
```

TutorPanel props에 `onAnalyze, isAnalyzing, isSpeaking, isListening, onMicToggle` 추가.

- [ ] **Step 5: App의 TutorPanel에 새 props 전달**

```jsx
<TutorPanel
  instructor={selectedInstructor}
  onSelectInstructor={...기존...}
  tutorMood={tutorMood}
  chatHistory={chatHistory}
  chatEndRef={chatEndRef}
  onAnalyze={handleAnalyze}
  isAnalyzing={isAnalyzing}
  isSpeaking={isSpeaking}
  isListening={isListening}
  onMicToggle={() => {}} // Task 7에서 채움
/>
```

- [ ] **Step 6: 브라우저에서 분석 버튼 테스트**

1. 강사 선택
2. 캔버스에 무언가 그리기
3. "🔍 필기 분석" 버튼 클릭
4. 1.5초 후 강사 멘트가 채팅에 추가되고 TTS로 읽히면 성공
5. 콘솔에 base64 이미지 데이터 출력 확인

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat: 캔버스 분석 시뮬레이션 + TTS 연동"
```

---

## Task 7: STT (음성 인식)

**Files:**
- Modify: `src/App.jsx` — STT 핸들러 + 음성 응답 로직 추가

- [ ] **Step 1: STT 핸들러 추가 (App 컴포넌트 내부)**

```jsx
const handleMicToggle = useCallback(() => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) {
    alert('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome/Edge를 사용해주세요.')
    return
  }
  if (!selectedInstructor) {
    alert('먼저 강사를 선택해주세요.')
    return
  }

  if (isListening) {
    // 인식 중단
    recognitionRef.current?.stop()
    setIsListening(false)
    setTutorMood('idle')
    return
  }

  const recognition = new SR()
  recognition.lang = 'ko-KR'
  recognition.continuous = false
  recognition.interimResults = false
  recognitionRef.current = recognition

  recognition.onstart = () => {
    setIsListening(true)
    setTutorMood('thinking')
  }

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript
    setTranscript(text)
    // 유저 발화 채팅에 추가
    setChatHistory(prev => [...prev, { role: 'user', text, timestamp: Date.now() }])
    setTutorMood('reacting')

    // 강사 응답 생성 (0.8초 후)
    setTimeout(() => {
      const responses = selectedInstructor.voiceResponses
      const response = responses[Math.floor(Math.random() * responses.length)]
      setChatHistory(prev => [...prev, { role: 'tutor', text: response, timestamp: Date.now() }])
      speak(
        response,
        selectedInstructor,
        () => { setIsSpeaking(true); setTutorMood('speaking') },
        () => { setIsSpeaking(false); setTutorMood('idle') },
      )
    }, 800)
  }

  recognition.onerror = (e) => {
    console.error('STT 오류:', e.error)
    setIsListening(false)
    setTutorMood('idle')
  }

  recognition.onend = () => {
    setIsListening(false)
  }

  recognition.start()
}, [isListening, selectedInstructor])
```

- [ ] **Step 2: App의 TutorPanel onMicToggle 교체**

```jsx
onMicToggle={handleMicToggle}
```

- [ ] **Step 3: transcript 표시 (선택사항 — BottomActionBar 위에 작은 텍스트로)**

BottomActionBar 상단에 추가:
```jsx
{transcript && (
  <div className="px-3 pb-2 text-xs text-gray-500 truncate">
    🎤 "{transcript}"
  </div>
)}
```

TutorPanel에 `transcript` prop 추가, App에서 전달.

- [ ] **Step 4: 브라우저 테스트 (Chrome/Edge 필수)**

1. 강사 선택
2. 마이크 버튼 클릭 → 브라우저 권한 허용
3. 한국어로 말하기 (예: "이 문제 어떻게 풀어요?")
4. 유저 발화 + 강사 응답이 채팅에 추가되고 TTS 재생되면 성공

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat: STT 음성 인식 + 강사 음성 응답"
```

---

## Task 8: localStorage 저장/불러오기

**Files:**
- Modify: `src/App.jsx` — useEffect로 localStorage 연동

- [ ] **Step 1: App 초기화 시 localStorage에서 불러오기**

App 컴포넌트 상태 선언 직후에 추가:

```jsx
// 앱 시작 시 localStorage 복원
useEffect(() => {
  try {
    const savedInstructor = localStorage.getItem('toeic_selected_instructor')
    const savedHistory = localStorage.getItem('toeic_chat_history')
    if (savedInstructor) setSelectedInstructor(JSON.parse(savedInstructor))
    if (savedHistory) setChatHistory(JSON.parse(savedHistory))
  } catch (e) {
    console.warn('localStorage 복원 실패:', e)
  }
}, [])
```

- [ ] **Step 2: 변경 시 localStorage에 저장**

```jsx
// 강사 선택 시 저장
useEffect(() => {
  if (selectedInstructor) {
    localStorage.setItem('toeic_selected_instructor', JSON.stringify(selectedInstructor))
  }
}, [selectedInstructor])

// 채팅 히스토리 저장 (최대 50개)
useEffect(() => {
  const trimmed = chatHistory.slice(-50)
  localStorage.setItem('toeic_chat_history', JSON.stringify(trimmed))
}, [chatHistory])
```

- [ ] **Step 3: 캔버스 저장 — 분석 후 자동 저장**

`handleAnalyze` 함수 안 캡처 직후에:
```jsx
localStorage.setItem('toeic_canvas_data', dataURL)
```

- [ ] **Step 4: 앱 재시작 시 캔버스 복원**

canvasRef와 연결된 useEffect 추가:
```jsx
useEffect(() => {
  const saved = localStorage.getItem('toeic_canvas_data')
  if (!saved || !canvasRef.current) return
  const img = new Image()
  img.onload = () => {
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').drawImage(img, 0, 0)
  }
  img.src = saved
}, [selectedInstructor]) // 강사 선택 후 캔버스 복원
```

- [ ] **Step 5: 히스토리 초기화 버튼 (LeftNav 하단)**

LeftNav 맨 아래에 추가:
```jsx
<button
  onClick={() => {
    setChatHistory([])
    if (canvasRef.current) {
      canvasRef.current.getContext('2d').clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
    }
    localStorage.removeItem('toeic_chat_history')
    localStorage.removeItem('toeic_canvas_data')
  }}
  title="초기화"
  className="mt-auto w-10 h-10 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
>
  🔄
</button>
```

- [ ] **Step 6: 브라우저 테스트**

1. 강사 선택 + 대화 → 새로고침 → 강사와 대화 내역이 복원되면 성공
2. 캔버스에 그리고 → 분석 → 새로고침 → 캔버스가 복원되면 성공

- [ ] **Step 7: Commit**

```bash
git add src/App.jsx
git commit -m "feat: localStorage 대화·강사·캔버스 영속성"
```

---

## Task 9: 마무리 폴리시 + 반응형

**Files:**
- Modify: `src/App.jsx` — 빈 상태 처리, 강사 변경 버튼, 최종 점검

- [ ] **Step 1: 강사 변경 버튼 추가 (TutorCard 우측)**

TutorCard 컴포넌트 오른쪽에:
```jsx
<button
  onClick={onChangeInstructor}
  title="강사 변경"
  className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded hover:bg-white/5"
>
  변경
</button>
```

`onChangeInstructor` prop 추가 → App에서 `() => { setSelectedInstructor(null); setChatHistory([]) }` 전달.

- [ ] **Step 2: 캔버스 그림이 없을 때 분석 버튼 안내 메시지**

`handleAnalyze` 함수 상단에:
```jsx
const ctx = canvas.getContext('2d')
const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
const hasDrawing = pixels.some(v => v !== 0)
if (!hasDrawing) {
  setChatHistory(prev => [...prev, {
    role: 'tutor',
    text: '먼저 문제에 밑줄이나 동그라미를 쳐보세요! 필기한 내용을 분석해드릴게요.',
    timestamp: Date.now(),
  }])
  return
}
```

- [ ] **Step 3: 최종 브라우저 통합 테스트**

아래 시나리오를 순서대로 확인:
1. 앱 로드 → 강사 선택 화면 표시
2. 강사 선택 → 인사말 TTS 재생 + 채팅 추가
3. 캔버스에 밑줄/동그라미 → 색상·굵기·지우개 동작
4. 분석 버튼 → 1.5초 후 강사 멘트 + TTS
5. 마이크 버튼 → 말하기 → 유저 발화 + 강사 응답 + TTS
6. 새로고침 → 강사·채팅·캔버스 복원
7. 강사 변경 → 선택 화면 재표시

- [ ] **Step 4: 최종 Commit**

```bash
git add .
git commit -m "feat: AI 토익 과외 프로토타입 완성"
```
