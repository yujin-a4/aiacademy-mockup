# 실전 모의고사 적재 (YBM 실전토익 LC/RC 1000)

산타토익식 문제풀이 세션을 위해 교재 4권에서 **4000문항**을 뽑아 DB에 넣는 파이프라인.
2026-08-28 기준 **추출·검증은 20회분 전량 완료**, **적재는 1회차(Vol1 TEST 01) 파일럿까지** 완료.

## 1. 원본이 어디 있나

레포 밖이다. 환경변수로 가리킨다.

```bash
TOEIC_PDF_ROOT=/c/Users/YBM/Documents/YBMMessenger          # 교재 PDF 8개 (본권·해설 × LC/RC × 1·2권)
TOEIC_LC_AUDIO_ROOT=~/Downloads/YBM\ TOEIC\ LC\ 1000        # 기본값이라 안 줘도 된다
```

`scripts/_book_paths.py` 가 이 한 곳에서 경로를 정한다. 추출기 5개가 각자 레포 루트를 가정하고
글롭하던 것을 여기로 모았다 — 2권은 폴더가 한 겹 더 중첩돼 있어 두 깊이를 다 훑는다.

**음원은 이미 문항 단위로 쪼개져 있다.** 강제정렬도 ffmpeg 분할도 필요 없고 파일명만 읽으면 된다.

```
Test 01_Part 1_01.mp3      → 1번          (Part 1·2 는 문항당 파일 하나)
Test 01_Part 3_32-34.mp3   → 32·33·34번   (Part 3·4 는 세트당 파일 하나)
```

이 단위가 앱의 "한 판" 단위(`PER_QUESTION = {1,2,5}`, P3·P4 는 세트)와 정확히 일치한다.

## 2. 돌리는 법

```bash
export TOEIC_PDF_ROOT=/c/Users/YBM/Documents/YBMMessenger

# 추출 (20회분: vol 1·2 각각)
python scripts/extract_rc_p5.py --vol 1              # Part 5 는 회차 전체가 한 파일로 나온다
python scripts/extract_mock_all.py --vol 1           # Part 1~4 · 6·7

# 완결성 감사 — 결손·중복·정답불일치가 0이어야 한다
python scripts/audit_mock_extract.py --vol 1 --all

# 회차 하나 적재
python scripts/map_mock_audio.py --vol 1 --test 1 \
  --copy public/mock/lc1-t01 --emit scripts/dump/audio_lc1_t01.json
python scripts/extract_part1_photos.py --out public/mock/lc1-t01 \
  YBM_LC1_T01_Q001 ... YBM_LC1_T01_Q006          # Part 1 사진 6장
node scripts/load-mock-test.js --vol 1 --test 1        # dry run
node scripts/load-mock-test.js --vol 1 --test 1 --go
node scripts/verify-mock-test.js                       # DB 되읽기 검증
```

## 3. 왜 이렇게 만들었나 (다시 만들 사람을 위해)

### 정답은 해설이 아니라 **정답 키 표**에서 온다
`extract_answer_keys.py` 가 해설 앞머리의 5칸 격자를 좌표로 읽는다. 40개 회차 4000문항 결손 0.
해설의 '정답은 (D)이다' 문장은 **틀리는 경우가 있다** — 2권 RC T06 136번을 직접 열어 대조한 결과
해설 본문은 "(B) not only가 정답"인데 파서는 (C)를 집고 있었다(2단 조판에서 옆 칸 해설을 물어옴).
표기가 흔들려 못 읽는 문항은 통째로 버려지기까지 했다. **키 표가 정본이다.**

### 모의고사는 "몇 개 뽑혔나"가 아니라 "1번부터 100번까지 다 있나"로 본다
기존 추출기는 강의에 넣을 문항을 **골라 담는** 용도였다. 몇 개 빠져도 됐다. 모의고사는 하나만 비어도
회차가 성립하지 않는다. `audit_mock_extract.py` 가 번호 집합을 직접 비교한다 — 눈으로 세면 놓친다
(실측: 44-46 세트가 `[46,44,46]` 이라 45번이 없는데 합계는 멀쩡해 보였다).

### 회차마다 반복되던 구조적 결손 (전부 수정됨)

| 증상 | 원인 |
|---|---|
| Part 2 의 30·31번이 매 회차 유실 | **파트 경계 ≠ 쪽 경계.** 한 쪽에 앞 파트 끝과 다음 파트 표제가 같이 앉는다 |
| Part 4 마지막 3문항이 매 회차 유실 | 세트 머리 `98-100` 의 끝 번호가 **세 자리** |
| 세트 안 문항 하나씩 유실 | 해설이 근거 문장 앞에도 번호를 박아 같은 번호가 두 번 잡힘 → dict + 물음표 검사로 거른다 |
| 정답 못 읽으면 문항째 폐기 | 키 표를 넘겨 살린다 |
| **2권 LC 가 25문항 중 4개** | 2단 조판인데 `get_text()` 가 단을 넘나들며 읽어 순서가 7·11·8·9·10 으로 섞임 → `page_text()` 가 왼단·오른단을 갈라 잇는다 |
| 2권 LC Part 3·4 가 0세트 | 화자 표기가 `M-Au` → `M`, `번역` → `해석`, 번호와 화자가 한 줄, Part 4 는 본문에 화자 태그가 아예 없다(담화) |
| 접힌 질문이 반 토막 | 2권은 질문 두 줄 사이에 **빈 줄**이 들어간다. 빈 줄에서 멈추면 안 된다 |
| 스크립트에 `71,` `100` 이 남음 | 두 자리·공백만 보던 것을 **세트 번호 범위** 기준으로 바꿨다. 예전 방식은 본문의 진짜 숫자(`at 10 o'clock`)까지 지울 수 있었다 |

Vol 1 은 수정할 때마다 회귀 검사를 같이 돌려 0 결손을 유지했다.

### 음원 파일명 오타 2건은 원본을 안 고치고 매퍼에서 읽어 준다
`map_mock_audio.py` 의 `FIXUPS`. Vol2 T04 `Part 2_01`(→7번), Vol2 T08 `Part 4_84-85`(→83-85).
둘 다 앞뒤 파일 사이 자리가 하나로 정해져 다른 해석이 없다.

## 4. 스키마 (`0028_mock_tests.sql`)

- `mock_tests` — 회차 하나(LC 100문항 또는 RC 100문항)
- `questions.mock_test_id` / `question_no` 추가, **`lecture_id` 를 nullable 로** 풀었다
  - 모의고사 문항은 어느 강의에도 안 속한다. 가짜 강의 행을 만들면 강의 목록·레일·아이템이
    그 가짜를 실제 강의로 센다(화면 4곳이 `lectures` 를 센다)
  - `questions_owner_chk` 로 강의 **또는** 회차 중 한쪽에는 반드시 붙게 했다
- `passages.audio_url` — Part 3·4 는 지문 하나가 곧 음원 하나다(문장 구간은 `passage_sentences.audio_url`)

**크론과 겹치지 않는다.** 문항 코드가 `YBM-LC1-T01-Q007` 로 시작해 시트 코드(`LC-P1-01-Q001`)와
네임스페이스가 다르고, `gcp/sync-questions-fn` 은 upsert만 하고 삭제를 하지 않는다.

### 마이그레이션 적용 주의
`.env.local` 에 `SUPABASE_DB_URL` 이 **없어서** `run-migration.js` 가 못 돈다.
- DDL: Supabase 대시보드 SQL 편집기에 파일 내용을 붙여넣어 실행했다.
  그래서 이 파일에는 `begin;`/`commit;` 이 없다 — 편집기가 자체 트랜잭션을 걸어 충돌한다.
- DML: `load-mock-test.js` 가 `SUPABASE_SERVICE_ROLE_KEY` 로 PostgREST 에 넣는다(DB URL 있으면 그쪽 우선).
  REST 는 표를 넘나드는 트랜잭션이 없어 **전부 upsert 로 짜서 다시 돌리면 같은 상태**가 되게 했다.

## 5. 지금 상태

- **추출·감사**: vol 1·2 × LC/RC × 10회차 = 4000문항, 결손·중복 0
- **적재**: `YBM-LC1-T01`(100) · `YBM-RC1-T01`(100) 만. 되읽기 검증 통과
- **음원**: `public/mock/lc1-t01/` 54개(45MB) + 사진 6장. **gitignore** — 저작물이고 용량이 크다
- 기존 강의 문항 345개 그대로

## 6. 남은 일

1. **화면** — 파트별 끊어 풀기 / 약점 유형 우선 출제. `/my-learning/part/[partId]` 가 이미
   `questions` 를 파트별로 읽어 한 판씩 돌리므로 `mock_test_id` 필터를 얹는 쪽이 가깝다
2. **나머지 19회차 적재** — 위 두 줄 반복. 파서는 이미 20회분을 통과했다
3. **음원 호스팅** — 20회차 전량은 898MB. git/`public/` 은 안 된다(레포가 1.15GB가 된다).
   Supabase Storage 가 맞는 자리지만 현재 버킷 0개이고 플랜 확인이 필요하다.
   Pro(100GB 포함)면 추가 비용 0원. Free 는 1GB 한도의 88%를 먹는다
4. **64kbps 모노 재인코딩(선택)** — 원본은 128kbps 스테레오. 898MB → ~450MB.
   실익은 비용보다 **모바일 로딩 속도**. ffmpeg 는 설치돼 있다(9.0.1).
   손실 재압축이라 적용 전에 한두 파일 들어볼 것
