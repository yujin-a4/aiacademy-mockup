# AI 토익 과외 서비스 프로토타입 — 설계 문서

## 개요
React + Tailwind CSS 단일 파일(App.js) AI 토익 과외 프로토타입. 태블릿 가로모드 최적화.

## 확정된 선택사항
- **레이아웃**: 3단 분할 (왼쪽 내비 w-16 | 중앙 문제 flex-3 | 오른쪽 강사 flex-2)
- **강사 스타일**: 프로필 카드형 (이름/성향/색상 포함)
- **테마**: 다크 그린 (GitHub 스타일, `#0d1117` 배경 + 그린 액센트)
- **강사 수**: 3명 선택형

## 컴포넌트 구조

```
App
├── LeftNav
├── QuestionPanel
│   ├── CanvasOverlay (투명 캔버스, 터치 지원)
│   └── CanvasToolbar (펜색상/굵기/지우개/초기화)
└── TutorPanel
    ├── InstructorSelector (수업 시작 전 선택)
    ├── TutorCard (강사 프로필 + 애니메이션)
    ├── ChatHistory
    ├── AnalyzeButton
    └── VoiceBar (마이크 + STT 결과)
```

## 강사 3명

| ID | 이름 | 성향 | TTS rate | TTS pitch | 색상 |
|---|---|---|---|---|---|
| blunt | 박직설 | 팩폭 | 1.1 | 0.9 | 레드 |
| kind | 이친절 | 다정 | 0.9 | 1.2 | 그린 |
| neutral | 최중립 | 중립 | 1.0 | 1.0 | 블루 |

## 핵심 상태

```js
selectedInstructor, tutorMood, isDrawing, penColor, penSize,
drawingTool, isListening, isSpeaking, transcript,
chatHistory, isAnalyzing, activeNav
```

## 기능 설계

### 캔버스
- mouse/touch 이벤트로 필기
- "분석" 클릭 → canvas.toDataURL → 콘솔 → 1.5초 시뮬레이션 → 강사 멘트 + TTS

### STT
- Web Speech API, lang: ko-KR
- 마이크 버튼 토글, 인식 완료 시 강사 응답 생성

### TTS
- window.speechSynthesis
- 강사별 rate/pitch 차별화
- onstart/onend로 tutorMood 연동

### 애니메이션
- tutorMood: idle | thinking | speaking | reacting
- CSS 클래스 토글 방식

## 저장소
- localStorage: toeic_chat_history, toeic_selected_instructor, toeic_canvas_data
