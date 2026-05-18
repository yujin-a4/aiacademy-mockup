# YBM AI 어학원 — Design System

> Stitch 프로토타입 제작을 위한 디자인 레퍼런스 문서

---

## 1. Brand Concept

**키워드:** Bold × Friendly × Smart  
**톤앤매너:** YBM의 강렬한 레드+블루 에너지 위에 와옹이의 유쾌함을 얹은 "슈퍼히어로 학습" 컨셉.  
무겁지 않고, 하지만 전문성은 분명히 느껴지는 앱.

---

## 2. Color Palette

### Primary
| 이름 | HEX | 용도 |
|---|---|---|
| Dark Navy | `#0D1B4B` | 헤더, 주요 배경, 텍스트, 아이콘 아웃라인 |
| Navy Mid | `#1B3EAF` | 버튼, 활성 탭, 링크, 보조 강조 요소 |

### Accent
| 이름 | HEX | 용도 |
|---|---|---|
| Waong Lavender | `#8B8FC8` | 포인트 컬러, 와옹이 UI, 배지, 진행 바 |
| Lavender Light | `#C4C6E8` | 카드 하이라이트, 태그 배경, 소프트 강조 |

### Neutral
| 이름 | HEX | 용도 |
|---|---|---|
| Off White | `#F7F8FC` | 앱 배경 |
| Light Gray | `#EAECF4` | 카드 배경, 구분선 |
| Mid Gray | `#9499B7` | 보조 텍스트, placeholder |
| Charcoal | `#2C2F4A` | 본문 텍스트 |

### Semantic (기능 전용 — UI 포인트로 사용 금지)
| 이름 | HEX | 용도 |
|---|---|---|
| Success | `#1DB97A` | 정답, 완료 상태 |
| Warning | `#F5A623` | 주의 알림 |
| Error Red | `#E8193C` | 오답 표시, 에러 메시지, 와옹이 망토 한정 |

---

## 3. Typography

> 한국어+영어 혼용 환경 기준

### Font Family
| 역할 | 폰트 | 비고 |
|---|---|---|
| Display / Heading (KO) | **Pretendard** Bold/ExtraBold | 각진 형태가 YBM 로고와 잘 어울림 |
| Body (KO) | **Pretendard** Regular/Medium | |
| Display / Heading (EN) | **Barlow Condensed** Bold | 로고의 수직·기하학 형태와 호응 |
| Body (EN) | **Barlow** Regular | |
| Code / Score | **JetBrains Mono** | 점수, 통계 숫자 표기 |

### Type Scale (Mobile 기준)
| 레벨 | 크기 | 두께 | 용도 |
|---|---|---|---|
| H1 | 28px | ExtraBold | 페이지 타이틀 |
| H2 | 22px | Bold | 섹션 헤더 |
| H3 | 18px | Bold | 카드 타이틀 |
| Body L | 16px | Regular | 주요 본문 |
| Body M | 14px | Regular | 일반 본문 |
| Caption | 12px | Medium | 라벨, 태그 |
| Score | 36px | Bold (Mono) | 점수/통계 숫자 |

---

## 4. Spacing & Grid

- **Base unit:** 4px
- **Screen padding:** 20px (좌우)
- **Card padding:** 16px
- **Section gap:** 24px
- **컴포넌트 내부 gap:** 8px / 12px / 16px

---

## 5. Border Radius

| 레벨 | 값 | 용도 |
|---|---|---|
| Sharp | 6px | 태그, 배지, 인풋 |
| Default | 12px | 카드, 버튼 |
| Large | 20px | 바텀시트, 모달 |
| Pill | 999px | 진행률 바, 칩 |

---

## 6. Elevation (Shadow)

| 레벨 | 값 | 용도 |
|---|---|---|
| Low | `0 2px 8px rgba(13,27,75,0.08)` | 기본 카드 |
| Mid | `0 4px 16px rgba(13,27,75,0.14)` | 플로팅 버튼, 선택된 카드 |
| High | `0 8px 32px rgba(13,27,75,0.20)` | 모달, 바텀시트 |

---

## 7. Component Guidelines

### Buttons
- **Primary:** Dark Navy 배경 + 흰색 텍스트, radius 12px, height 52px
- **Secondary:** Navy Mid 배경 + 흰색 텍스트
- **Ghost:** 테두리 2px Navy Mid + Navy Mid 텍스트
- **Accent:** Lavender 배경 + Dark Navy 텍스트 (와옹이 연계 액션)
- **Disabled:** Light Gray 배경 + Mid Gray 텍스트
- 모든 버튼: Barlow Condensed Bold / Pretendard Bold, letter-spacing +0.5px

### Cards
- 배경: White 또는 Off White
- 테두리: 1px Light Gray (선택 시 2px Lavender)
- radius: 12px, shadow: Low
- 학습 카드 상단 4px 컬러 바: Dark Navy (일반) / Lavender (AI 피드백)

### Tags / Badges
- 레벨 태그 (TOEIC 점수대, 난이도): Dark Navy 배경 + 흰색
- 상태 배지 (완료, 진행중): Success Green 또는 Lavender Light 배경 + Dark Navy 텍스트
- radius: 6px

### Progress Bar
- Track: Light Gray
- Fill: Lavender (학습 진행) / Navy Mid (레벨) / Lavender Light (와옹이 성장도)
- height: 6px, radius: Pill

### Bottom Navigation
- 배경: White + 상단 1px Light Gray 보더
- 활성 아이콘: Dark Navy
- 활성 표시 도트/언더라인: Lavender
- 비활성: Mid Gray

---

## 8. Waong (와옹이) Character Usage

와옹이는 단순 마스코트가 아닌 **AI 튜터 아바타**로 활용.

### 사용 맥락
| 상황 | 표현 |
|---|---|
| 기본 / 대기 | 기본 포즈 (선글라스 착용) |
| 학습 시작 | 망토 펄럭이는 동작 (모션) |
| 정답 | 엄지척 포즈 |
| 오답 / 피드백 | 선글라스 살짝 내린 포즈 |
| 로딩 | 선글라스 번쩍이는 루프 모션 |

### 배치 규칙
- 홈 화면: 상단 웰컴 배너에 우측 배치 (최소 80×80px)
- AI 피드백 말풍선: 와옹이 아이콘 + 텍스트 버블 형태
- 온보딩: 풀 캐릭터 활용, Dark Navy 배경에 Lavender 계열 그라데이션

### 금지 사항
- 캐릭터를 흐리게 처리하거나 투명도 50% 이하로 쓰지 않음
- 레드 또는 블루 배경 위에 그대로 올리지 않음 (아웃라인이 묻힘)
- 텍스트 위에 오버레이하지 않음

---

## 9. Iconography

- 스타일: **Rounded, 2px stroke, filled 혼용**
- 크기: 24px (기본), 20px (소), 32px (강조)
- 색상: Dark Navy (기본), YBM Blue / Red (활성/강조)
- 추천 라이브러리: Phosphor Icons 또는 Lucide

---

## 10. Illustration & Visual Style

- 배경 패턴: YBM 로고의 수직 스트라이프 모티프 활용 → 반투명 10~15% 수준으로 배경에 깔기
- 학습 레벨 비주얼: 기하학적 방패/별 형태 (YBM 로고 형태에서 파생)
- 그라데이션 방향: 좌하단 → 우상단 (로고의 사선 방향과 호응)
- 주요 그라데이션:
  - Dark Gradient (헤더, 온보딩): `#0D1B4B → #1B3EAF`
  - Lavender Gradient (AI 피드백, 와옹이 배너): `#8B8FC8 → #C4C6E8`
  - 앱 배경: `#F7F8FC` 단색 유지 (그라데이션 남용 금지)

---

## 11. Motion Principles

- **Duration:** 200ms (마이크로), 350ms (화면 전환), 600ms (온보딩)
- **Easing:** `cubic-bezier(0.22, 1, 0.36, 1)` — 빠르게 치고 부드럽게 끝
- **전환 패턴:** 슬라이드업 (바텀시트), 페이드+스케일업 (카드 진입), 슬라이드 좌우 (학습 카드 넘기기)
- 와옹이 등장: 바운스 인 (`cubic-bezier(0.34, 1.56, 0.64, 1)`)

---

## 12. Screen-specific Notes (Stitch 제작 참고)

| 화면 | 주요 포인트 |
|---|---|
| 스플래시 | Dark Navy 배경, YBM 로고 + 와옹이, Lavender 액센트 |
| 온보딩 | Dark Gradient 배경, 와옹이 대형 배치, 흰색 타이포 |
| 홈 | Off White 배경, 상단 Dark Navy 헤더, 오늘의 학습 카드 (Lavender 포인트), 와옹이 웰컴 배너 |
| 학습 (문제풀이) | 흰색 집중 환경, 진행 바 상단, 정답(Success Green)/오답(Error Red) 피드백 |
| 결과/리포트 | 큰 점수 숫자 (Mono), Navy Mid 차트, 와옹이 리액션 |
| 마이페이지 | 카드형 구성, Lavender 포인트, 뱃지 컬렉션 |

---

*Last updated: 2026-05*  
*Stitch 작업 시 이 문서를 Custom Instructions 또는 첫 프롬프트에 붙여넣으세요.*
