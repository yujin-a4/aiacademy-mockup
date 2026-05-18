# DESIGN_SYSTEM.md
# YBM AI 어학원 — 디자인 시스템 & 리디자인 지침

> **Claude Code에게**: 이 파일은 `/dashboard` 페이지 전체를 아래 디자인 시스템에 맞게 리디자인하기 위한 지침입니다.
> 기존 데이터/로직은 건드리지 말고, **스타일과 레이아웃만** 변경하세요.

---

## 1. 작업 범위

- 대상 파일: `dashboard` 페이지 및 해당 컴포넌트 전체
- 변경 대상: CSS / Tailwind 클래스 / 인라인 스타일 / 레이아웃 구조
- 유지 대상: 라우팅, 상태 관리, API 호출, 데이터 바인딩, 기존 컴포넌트 분리 구조

---

## 2. 폰트

```
Primary Font: Noto Sans KR
Weights: 300 / 400 / 500 / 600 / 700 / 900
Import: https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700;900&display=swap
```

- 모든 텍스트에 `font-family: 'Noto Sans KR', sans-serif` 적용
- 시스템 폰트(Arial, -apple-system, sans-serif 등) 완전히 제거
- 이모지는 레이블이나 아이콘 역할로 사용 중인 경우, SVG 아이콘 또는 텍스트로 교체 권장 (단, 기존 로직 변경 없이 스타일만 수정 시 유지 가능)

### 타이포그래피 스케일

| 용도 | 크기 | 굵기 | 줄간격 |
|---|---|---|---|
| 히어로 헤드라인 | 28px | 900 | 1.2 |
| 페이지 제목 | 22px | 700 | 1.3 |
| 섹션 제목 | 17px | 700 | 1.4 |
| 카드 제목 | 15px | 600 | 1.4 |
| 본문 | 14px | 400 | 1.6 |
| 보조 텍스트 | 13px | 400 | 1.5 |
| 라벨 / 뱃지 | 11px | 500 | 1.4 |

---

## 3. 컬러 팔레트

### Primary — YBM Blue (브랜드 메인)

| 변수명 | 값 | 용도 |
|---|---|---|
| `--color-primary` | `#1A3FD4` | 메인 브랜드 컬러 |
| `--color-primary-500` | `#3459E6` | 버튼, CTA |
| `--color-primary-400` | `#5578F0` | 호버 상태 |
| `--color-primary-300` | `#8AA4F6` | 보조 강조 |
| `--color-primary-100` | `#D6E0FD` | 뱃지 배경, 테두리 |
| `--color-primary-50` | `#EEF2FF` | 카드 배경 틴트 |

> ⚠️ Red 계열(`#E8194B` 등)은 **오류/경고 상태에만** 사용. 브랜드 컬러나 강조색으로 사용 금지.

### Accent — AI 기능 강조 (Cyan)

| 변수명 | 값 | 용도 |
|---|---|---|
| `--color-accent` | `#06B6D4` | AI 추천 뱃지, 진행 바 포인트 |
| `--color-accent-light` | `#CFFAFE` | AI 뱃지 배경 |

### Neutral — Slate Gray

| 변수명 | 값 | 용도 |
|---|---|---|
| `--color-gray-900` | `#111318` | 제목 텍스트 |
| `--color-gray-700` | `#374151` | 본문 텍스트 |
| `--color-gray-500` | `#6B7280` | 보조 텍스트, 플레이스홀더 |
| `--color-gray-300` | `#D1D5DB` | 테두리, 구분선 |
| `--color-gray-100` | `#F3F4F6` | 페이지 배경 |
| `--color-white` | `#FFFFFF` | 카드 배경 |

### Semantic

| 변수명 | 값 | 용도 |
|---|---|---|
| `--color-success` | `#10B981` | 완료, 정답, 연속 학습 |
| `--color-error` | `#EF4444` | 오류, 오답 (제한적 사용) |
| `--color-warning` | `#F59E0B` | 주의, 미완료 |

---

## 4. 컴포넌트 스타일

### 페이지 배경
```css
background: #F3F4F6;  /* --color-gray-100 */
```

### 카드 (기본)
```css
background: #FFFFFF;
border: 1px solid #D1D5DB;
border-radius: 14px;
padding: 20px;
```
- 그림자 대신 **테두리**로 카드 경계 표현
- 호버 시: `border-color: #8AA4F6` (primary-300)

### 카드 (강조 / Hero 카드)
```css
background: #1A3FD4;  /* Primary Blue */
border-radius: 16px;
padding: 24px;
color: #FFFFFF;
```
- 예상 점수, 목표 진행률 등 핵심 지표에 사용

### 버튼 — Primary
```css
background: #3459E6;
color: #FFFFFF;
border: none;
border-radius: 10px;
height: 44px;
padding: 0 20px;
font-size: 15px;
font-weight: 600;
```
- 호버: `background: #5578F0`

### 버튼 — Secondary (Outline)
```css
background: transparent;
color: #1A3FD4;
border: 1.5px solid #1A3FD4;
border-radius: 10px;
height: 40px;
padding: 0 16px;
font-size: 14px;
font-weight: 500;
```

### AI 추천 뱃지
```css
background: #CFFAFE;
color: #06B6D4;
font-size: 11px;
font-weight: 600;
padding: 3px 8px;
border-radius: 4px;
letter-spacing: 0.02em;
```
- 텍스트: `AI 추천`

### 진행 바
```css
/* Track */
background: #F3F4F6;
height: 6px;
border-radius: 999px;

/* Fill — 학습 진도 */
background: #1A3FD4;

/* Fill — AI 분석 */
background: #06B6D4;
```

### 섹션 구분선
```css
border: none;
border-top: 1px solid #F3F4F6;
margin: 16px 0;
```

---

## 5. 레이아웃

### 모바일 기준
```
Max Width : 390px (모바일 앱 형태)
Gutter    : 좌우 16px 패딩
Header    : 고정, 56px 높이
Bottom Nav: 고정, 56px + safe area
Content   : 스크롤 가능 영역
```

### 스페이싱 (8px 그리드)
```
4px  — 아이콘 내부
8px  — 요소 간 최소
12px — 인라인 패딩
16px — 기본 섹션 패딩 (gutter)
20px — 카드 내부 패딩
24px — 카드 간 간격
32px — 섹션 간 간격
```

### 카드 배치 그리드
- 통계 카드(숫자 지표): `grid-template-columns: repeat(3, 1fr)` 또는 `repeat(2, 1fr)`, `gap: 10px`
- 미션/체크리스트: 단일 컬럼, 카드 안에 행 목록으로

---

## 6. 대시보드 섹션별 구체 지침

### 6-1. 상단 헤더 (Header)
- 배경: `#1A3FD4` (Primary Blue, 풀 블리드)
- 상단 패딩: safe area + 16px
- 인사 텍스트: 13px / weight 400 / opacity 0.75 / 흰색
- 이름: 22px / weight 700 / 흰색
- 스트릭 영역: 반투명 흰색 배경(`rgba(255,255,255,0.15)`), border-radius 12px, 내부 패딩 12px 16px
- 알림 아이콘: 오른쪽 상단, 흰색

### 6-2. 목표 진행 카드 (Hero Card)
- 배경: `#1A3FD4` (Primary Blue 카드)
- 진행률 숫자: 32px / weight 900 / 흰색
- 진행 바: 흰색 트랙(`rgba(255,255,255,0.2)`) + 흰색 fill
- 예상 점수 / 목표 점수: 흰색, 보조 텍스트는 opacity 0.75

### 6-3. 통계 카드 (학습 시간, 어휘 레벨 등)
- 배경: `#FFFFFF`, 테두리 `1px solid #D1D5DB`, radius 12px
- 숫자(지표): 20px / weight 700 / `#1A3FD4`
- 레이블: 11px / weight 500 / `#6B7280`

### 6-4. 커리큘럼 / 오늘의 학습 카드
- 배경: `#FFFFFF`, 테두리, radius 14px
- 상단: `AI 추천` Cyan 뱃지 + 학습 시간 텍스트 (gray-500)
- 제목: 17px / weight 700 / gray-900
- 설명: 14px / weight 400 / gray-700 / 줄간격 1.6
- CTA 버튼: Primary 버튼 (`이어서 학습하기 →`)

### 6-5. 주간 학습 현황 (캘린더 바)
- 배경 카드: `#FFFFFF`, 테두리, radius 14px
- 날짜 칸: 기본 `#F3F4F6` 배경, radius 8px
- 완료된 날: `#1A3FD4` 배경 + 흰색 텍스트
- 오늘: `#EEF2FF` 배경 + `#1A3FD4` 텍스트 + `1.5px solid #1A3FD4` 테두리
- 스트릭 성공 메시지: `#10B981` (success green), weight 600

### 6-6. 오늘의 미션 (체크리스트)
- 배경 카드: `#FFFFFF`, 테두리, radius 14px
- 체크 항목 완료: 텍스트에 line-through + gray-500, 체크 아이콘 `#10B981`
- 체크 항목 미완료: gray-900 텍스트, 빈 원형 체크박스 (border `1.5px solid #D1D5DB`)
- AI 추천 항목: 행 왼쪽에 Cyan 뱃지 추가
- 진행률 바: 카드 상단에 6px 바 (`#1A3FD4` fill)

### 6-7. 하단 네비게이션 (Bottom Nav)
- 배경: `#FFFFFF`, 상단 테두리 `1px solid #D1D5DB`
- 비활성 아이콘/텍스트: `#6B7280`
- 활성 아이콘/텍스트: `#1A3FD4`
- 탭 텍스트: 10px / weight 500
- 이모지 아이콘 → 가능하면 SVG 아이콘으로 교체 (`lucide-react` 또는 동등 라이브러리 사용)

---

## 7. 금지 사항

- ❌ 그라디언트 배경 (단색 또는 CSS 변수 기반 컬러만 사용)
- ❌ 과도한 박스 섀도우 (`box-shadow: 0 0 20px rgba(0,0,0,0.3)` 류)
- ❌ Inter, Roboto, Arial, system-ui 계열 폰트
- ❌ 보라/보라 그라디언트 계열 컬러
- ❌ 레드 계열을 강조/브랜드 용도로 사용
- ❌ 뱃지나 버튼에 과도한 그림자 효과

---

## 8. CSS 변수 선언 (globals.css 또는 최상위에 추가)

```css
:root {
  /* Primary */
  --color-primary: #1A3FD4;
  --color-primary-500: #3459E6;
  --color-primary-400: #5578F0;
  --color-primary-300: #8AA4F6;
  --color-primary-100: #D6E0FD;
  --color-primary-50: #EEF2FF;

  /* Accent (AI) */
  --color-accent: #06B6D4;
  --color-accent-light: #CFFAFE;

  /* Neutral */
  --color-gray-900: #111318;
  --color-gray-700: #374151;
  --color-gray-500: #6B7280;
  --color-gray-300: #D1D5DB;
  --color-gray-100: #F3F4F6;
  --color-white: #FFFFFF;

  /* Semantic */
  --color-success: #10B981;
  --color-error: #EF4444;
  --color-warning: #F59E0B;

  /* Typography */
  --font-base: 'Noto Sans KR', sans-serif;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 14px;
  --radius-2xl: 16px;
  --radius-full: 9999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
}
```

---

## 9. Tailwind 사용 시 커스텀 토큰 매핑 (tailwind.config.js)

```js
theme: {
  extend: {
    fontFamily: {
      sans: ['Noto Sans KR', 'sans-serif'],
    },
    colors: {
      primary: {
        DEFAULT: '#1A3FD4',
        400: '#5578F0',
        500: '#3459E6',
        300: '#8AA4F6',
        100: '#D6E0FD',
        50: '#EEF2FF',
      },
      accent: {
        DEFAULT: '#06B6D4',
        light: '#CFFAFE',
      },
    },
    borderRadius: {
      xl: '14px',
      '2xl': '16px',
    },
  },
}
```

---

## 10. 작업 완료 체크리스트

Claude Code는 아래 항목을 순서대로 완료하세요:

- [ ] `globals.css` (또는 최상위 CSS)에 CSS 변수 및 Noto Sans KR 폰트 임포트 추가
- [ ] `tailwind.config.js`에 커스텀 색상/폰트 토큰 추가 (Tailwind 사용 시)
- [ ] 대시보드 헤더 컴포넌트 스타일 교체 (섹션 6-1)
- [ ] Hero 진행률 카드 스타일 교체 (섹션 6-2)
- [ ] 통계 카드 3개 스타일 교체 (섹션 6-3)
- [ ] 오늘의 학습 / 커리큘럼 카드 스타일 교체 (섹션 6-4)
- [ ] 주간 캘린더 바 스타일 교체 (섹션 6-5)
- [ ] 오늘의 미션 체크리스트 스타일 교체 (섹션 6-6)
- [ ] 하단 네비게이션 스타일 교체 (섹션 6-7)
- [ ] 금지 사항 (섹션 7) 위반 여부 전체 검토
- [ ] 모바일(390px) 기준 레이아웃 최종 확인
