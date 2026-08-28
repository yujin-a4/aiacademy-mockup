# -*- coding: utf-8 -*-
"""
YBM 실전토익 RC 1000 본권+해설 PDF → 지문/문항 JSON 추출기 (Part 6·7)

왜 만들었나:
  LC 는 extract_lc_pdf.py 로 문항을 채웠는데 RC 는 파서가 없었다. 그런데 RC 는 LC 와 달리
  **지문의 생김새 자체가 콘텐츠다** — 이메일이면 To/From/Subject 머리글이 있어야 하고,
  문자 대화면 화자·시각이 있어야 하고, 웹페이지면 주소가 있어야 한다.
  화면(ContentView 의 시험지 스킨)이 kind + meta 로 조판을 고르기 때문에,
  본문 텍스트만 부어 넣으면 전부 밋밋한 '흰 종이 박스'가 된다. 그래서 파서가
  **kind 와 머리글까지** 뽑는다.

PDF 구조 (실측)
  [본권]  Questions 176-180 refer to the following information and e-mail.   ← 종류가 여기 다 있다
          <지문 박스 1> <지문 박스 2>                                        ← 검은 테두리 사각형
          176. What is indicated ...  (A) ... (B) ... (C) ... (D) ...
  [해설]  176  세부 사항        ← 문항 유형
          번역 ...
          해설 ... (A)가 정답이다.   ← 정답은 이 문장에서만 확실하게 나온다

막혔던 지점 세 개 (다시 만들 사람을 위해)
  1) 지문 경계 — 처음엔 PDF 의 사각형 그리기 명령(테두리)으로 가르려 했다. 어떤 쪽은 테두리를
     선 4개로 그려서 사각형이 안 잡히고 그 세트의 지문이 통째로 0개가 됐다.
     → 머리말이 지문 개수를 알려주므로(‘information and e-mail’=2), **세로 간격이 가장 벌어진
       곳에서 그 수만큼** 자른다.
  2) 읽기 순서 — 지문은 폭 전체(1단), 문항은 2단이 한 쪽에 같이 앉는다. 전체를 단 우선으로
     정렬했더니 지문 본문이 오른단으로 밀려 문항 뒤로 갔다. → 문항이 시작되는 높이를 경계로 나눈다.
  3) 정답 — 문항 번호(131~200)가 회차마다 반복돼서, 해설 전체에서 번호로 찾으면 **모든 회차가
     TEST 1 의 정답**을 가져갔다. → 해설도 회차 페이지 범위로 먼저 자른다(hae_pages).

사용
  python scripts/extract_rc_pdf.py --test 1 --out scripts/_rc_test1.json
  python scripts/extract_rc_pdf.py --test 1 --part 7 --preview
"""
import argparse
import json
import os
import re

import fitz

import _book_paths

# ── 세트 머리 ────────────────────────────────────────────────────────────
HEAD = re.compile(r"Questions?\s+(\d{3})[-–](\d{3})\s+refer to the following\s+([^.]+)\.")
QNUM = re.compile(r"^(\d{3})\.?\s+(.*)$")
OPT = re.compile(r"^\(([A-D])\)\s*(.*)$")
# 파트가 끝난 **뒤**에 오는 시험지·교재 안내문. 문항 영역에 그대로 딸려 오는데, 보기 줄이 아니라서
# '접힌 줄'로 오해되어 **마지막 문항의 (D) 보기가 통째로 삼킨다**(실측: 전 10회차의 146번·200번).
#   Part 6 끝 → Part 7 Directions   /   Part 7 끝 → 'Stop! This is the end of the test'
#   본권은 영어 시험지라 **한글이 나오면 그건 교재 안내**다(‘테스트 전 체크리스트 …’).
TAIL = re.compile(r"^(Directions:|Stop!)|Directions:\s*In this part|[가-힣]")
# 정답 문장은 두 갈래다: '(A)가 정답이다' / '(B) performing이 정답이다' / '정답은 (D)이다'.
# 보기 표시와 '정답' 사이에 영어 단어가 끼는 형태가 많아서 사이를 넉넉히 허용하고,
# 해설 안에 (A)(B) 가 여러 번 나오므로 **정답이라고 말한 그 보기**만 집는다.
ANSWER = re.compile(r"\(([A-D])\)(?:[^()]{0,60}?)정답")
ANSWER2 = re.compile(r"정답은\s*\(([A-D])\)")

# ── 지문 종류 ('refer to the following X and Y' 의 X·Y) → PassageDoc['kind']
#    화면 조판이 여기서 갈린다. 못 알아본 표기는 'text'(흰 종이)로 떨어지므로
#    새 표기가 보이면 여기 한 줄 추가하는 게 유일한 유지보수다.
KIND_MAP = [
    # 이메일 크롬(회색 판·To/From 라벨칸)은 **e-mail 에만** 붙는다.
    # 편지·메모는 실물에서도 흰 종이 박스라, 여기 섞으면 엉뚱한 지문에 메일 창이 씌워진다.
    (r"e-?mail", "email"),
    (r"text-message|text message|chat|instant message", "chat"),
    (r"web ?page|web ?site|online (?:form|review|posting)", "text"),   # 주소는 meta 로 → 화면이 브라우저 크롬
    (r"advertisement|announcement of a sale|brochure", "ad"),
    (r"article|press release|report|review\b|news", "article"),
    (r"notice|information|instructions?|policy|memo|letter|posting|announcement|label|coupon", "notice"),
    (r"schedule|itinerary|agenda|invoice|receipt|list|table|chart|form|application", "form"),
]

EMAIL_META = re.compile(r"^(To|From|Subject|Date|Sent|Attachment|Re|Cc|Bcc)\s*:\s*(.*)$", re.I)
# 'Topic:' 처럼 값이 없는 라벨 줄 (라벨 칸과 값 칸이 나뉜 조판)
LABEL_ONLY = re.compile(r"^[A-Z][A-Za-z ./&'-]{1,20}:\s*$")
INLINE_LABEL = re.compile(r"^([A-Z][A-Za-z ./&'-]{1,20}):\s+(\S.*)$")
URLISH = re.compile(r"(https?://|www\.)\S+")
# 문장 끝으로 보면 안 되는 약어 — 여기서 자르면 'Mr.' 뒤가 새 문장이 된다.
# ⚠️ 마침표까지 넣어야 한다. 이 lookbehind 는 마침표 **뒤** 위치에서 평가되므로
#    (?<!Mr) 로 쓰면 직전 두 글자가 'r.' 이라 걸리지 않는다 — 실측으로 'Mr.' / 'Ortega' 가 갈렸다.
ABBR = (r"(?<!Mr\.)(?<!Ms\.)(?<!Mrs\.)(?<!Dr\.)(?<!Inc\.)(?<!Ltd\.)(?<!Jr\.)(?<!Sr\.)"
        r"(?<!St\.)(?<!vs\.)(?<!No\.)(?<!Ave\.)(?<!a\.m\.)(?<!p\.m\.)")
SENT_SPLIT = re.compile(ABBR + r"(?<=[.!?])[\"')\]]*\s+(?=[A-Z(\"'])")

_WS = set(" \t") | {chr(0xA0)} | {chr(c) for c in range(0x2000, 0x200B)}


def clean(s):
    """공백 정리 + 제어문자 제거 (LC 파서와 같은 이유 — PDF 가 BEL 을 끼워 넣는다)"""
    out, prev = [], False
    for ch in s:
        if ch in _WS or ord(ch) < 32:
            if not prev:
                out.append(" ")
            prev = True
        else:
            out.append(ch)
            prev = False
    return "".join(out).strip()


def find_pdfs(vol=1):
    """해당 권의 RC 본권·해설.

    ⚠️ 예전엔 'YBM*pdf*/*.pdf' 로 글롭해서 **1권과 2권이 같이 잡혔다**. 그러면 페이지 수로
       고르는 아래 정렬이 엉뚱한 권을 집는다. LC 쪽이 겪은 것과 같은 함정이라 같은 식으로 막는다.
    """
    rc = _book_paths.book_pdfs(vol, "RC")
    if len(rc) != 2:
        raise SystemExit("%d권 RC PDF 를 2개로 못 집었다: %s" % (vol, rc))
    docs = [fitz.open(f) for f in rc]
    docs.sort(key=lambda d: d.page_count)      # 해설(220p) < 본권(332p)
    return {"hae": docs[0], "bon": docs[-1]}


def kind_of(label):
    """'information and e-mail' 의 조각 하나 → kind"""
    s = label.lower()
    for pat, kind in KIND_MAP:
        if re.search(pat, s):
            return kind
    return "text"


def split_kinds(phrase):
    """'information and e-mail' → ['notice', 'email'] (순서 = 지문 순서)"""
    parts = re.split(r",| and ", phrase)
    return [kind_of(p) for p in parts if p.strip()]


def test_ranges(bon):
    """TEST n 의 페이지 범위 — 'PART 5' 표제 페이지로 자른다(머리말·목차에도 'TEST n'이 있다)"""
    marks = [i for i in range(bon.page_count)
             if re.search(r"\n\s*PART 5\s*\n", bon[i].get_text())]
    # 앞머리(교재 소개·학습법)에도 'PART 5' 표제가 있어서 그대로 쓰면 TEST 1 이 5쪽짜리가 된다.
    # 실제 회차는 30쪽 간격이라, **다음 표제가 코앞에 있는 것은 회차 머리가 아니다.**
    marks = [m for k, m in enumerate(marks)
             if k + 1 >= len(marks) or marks[k + 1] - m >= 20]
    out = {}
    for k, lo in enumerate(marks):
        hi = marks[k + 1] if k + 1 < len(marks) else bon.page_count
        out[k + 1] = (lo, hi)
    return out


FURNITURE = re.compile(r"^(GO ON TO THE NEXT PAGE|TEST \d+(\s+\d+)?|\d{1,3}|PART \d)$")


def blocks_of(page):
    """텍스트 블록 — (rect, 텍스트). 페이지 장식(쪽번호·'GO ON TO…')은 버린다.

    읽기 순서는 **단 우선**이다. 문항이 좌/우 2단으로 앉는 페이지에서 y 만으로 정렬하면
    좌우 문항이 번갈아 섞여 보기 4개가 흩어진다(실측: 3문항 중 1문항만 살아남았다).
    """
    mid = page.rect.width / 2
    out = []
    for b in page.get_text("blocks"):
        x0, y0, x1, y1, txt = b[0], b[1], b[2], b[3], b[4]
        t = "\n".join(clean(l) for l in txt.splitlines() if clean(l))
        if not t or FURNITURE.match(t):
            continue
        # 측면 'TEST 1' 탭 같은 장식은 글자가 아니라 도형 글리프로 들어온다 — 영문/한글이 없으면 버린다
        if not re.search(r"[A-Za-z가-힣]", t):
            continue
        col = 0 if (x0 + x1) / 2 < mid else 1
        out.append((fitz.Rect(x0, y0, x1, y1), t, col))
    return out


def read_order(blocks):
    """한 페이지의 읽기 순서.

    페이지가 통째로 1단이거나 2단인 게 아니다 — **지문은 폭 전체(1단), 문항은 2단**이고
    둘이 한 페이지에 같이 앉는다. 그래서 문항이 시작되는 높이를 경계로 삼아
    위(지문)는 위→아래로, 아래(문항)는 왼단을 다 읽고 오른단으로 읽는다.
    (전체를 단 우선으로 정렬했더니 지문 본문이 오른단 취급되어 문항 뒤로 밀렸고,
     그 세트의 지문이 한 문장만 남았다 — 실측)
    """
    qs = [b[0].y0 for b in blocks if QNUM.match(b[1].splitlines()[0])]
    qy = min(qs) - 2 if qs else None
    top = [b for b in blocks if qy is None or b[0].y0 < qy]
    bot = [b for b in blocks if qy is not None and b[0].y0 >= qy]
    top.sort(key=lambda b: (round(b[0].y0), b[0].x0))
    bot.sort(key=lambda b: (b[2], round(b[0].y0), b[0].x0))
    return top + bot


def split_by_gaps(blocks, n):
    """지문 블록들을 세로 간격이 가장 큰 곳에서 n 덩어리로 자른다.

    지문 경계는 검은 테두리 박스지만, PDF 가 그 테두리를 선 4개로 그리는 페이지가 있어
    사각형으로 잡으면 어떤 세트는 지문이 통째로 0개가 된다(실측). 대신 **머리말이 알려준
    지문 개수**(‘information and e-mail’ = 2개)만큼, 가장 벌어진 곳에서 자른다.
    """
    if n <= 1 or len(blocks) <= 1:
        return [blocks]
    gaps = []
    for i in range(1, len(blocks)):
        gaps.append((blocks[i][0].y0 - blocks[i - 1][0].y1, i))
    cuts = sorted(i for _, i in sorted(gaps, reverse=True)[: n - 1])
    out, prev = [], 0
    for c in cuts + [len(blocks)]:
        out.append(blocks[prev:c])
        prev = c
    return [g for g in out if g]


def to_sentences(text):
    """지문 본문 → 문장 배열. 화면이 문장 단위로 하이라이트·재생하므로 여기서 쪼갠다.

    양식·목록·표 같은 자료는 마침표가 거의 없어 통째로 한 문장이 된다(실측: 22줄 → 1문장).
    그러면 강사가 "이 줄을 보세요"로 짚을 수가 없다 — 그런 지문은 **줄을 문장으로** 본다.
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    flat = re.sub(r"\s*\n\s*", " ", text).strip()
    sents = [s.strip() for s in SENT_SPLIT.split(flat) if s.strip()]
    if len(sents) <= 1 and len(lines) >= 3:
        return lines
    return sents


# 줄이 여기서 끝났다면 값이 다음 줄로 이어진 것이다 (기능어로 끝난 줄 = 접힌 줄)
DANGLING = re.compile(r"\b(in|of|and|or|the|an?|to|for|with|on|at|by|from|as|is|are)$", re.I)


def with_wrapped(v, lines, i, in_head, limit=3):
    """라벨 값이 두세 줄로 접힌 경우를 이어 붙인다 → (값, 마지막으로 먹은 줄 인덱스)

    값 칸은 라벨 칸보다 폭이 좁아서 잘 접힌다(실측: 'Speaker:' 값이 세 줄).
    이어 붙이지 않으면 나머지 줄이 본문 첫 문장에 섞여 '…Restaurants This Webinar is …' 가 된다.
    좌표로 값 칸을 알면 정확하지만, 여기선 텍스트만 있으므로 접힌 줄의 흔적으로 판단한다.
    """
    if not in_head:
        return v, i
    for _ in range(limit):
        if i + 1 >= len(lines):
            break
        nxt = lines[i + 1].strip()
        if not nxt or EMAIL_META.match(nxt) or LABEL_ONLY.match(nxt):
            break
        wrapped = (
            not nxt[:1].isupper()                      # 소문자·숫자로 시작 = 앞 줄에서 이어짐
            or bool(DANGLING.search(v.rstrip(" ,")))   # 기능어로 끝남 = 뒤로 이어짐
            or v.count("(") > v.count(")")             # 괄호가 안 닫혔다
        )
        if not wrapped or v.rstrip().endswith((".", "!", "?")):
            break
        v = f"{v} {nxt}".strip()
        i += 1
    return v, i


def parse_passage(text, kind):
    """지문 한 덩어리 → {kind, title, meta, sentences, chat}"""
    lines = [l for l in text.splitlines() if l.strip()]
    meta, body, chat = [], [], []
    title = None

    # 문자 대화 — 'Yi-Seul Kwak [1:16 P.M.] 본문' 또는 이름/시각이 한 줄, 본문이 다음 줄
    chat_re = re.compile(r"^(.{2,28}?)\s*\[(\d{1,2}:\d{2}\s*[AP]\.?M\.?)\]\s*(.*)$", re.I)
    # 이름과 시각이 **다른 칸**인 조판(온라인 채팅)은 이름 줄 / '[10:00 a.m.]' 줄로 갈라져 온다.
    # 합쳐 주지 않으면 첫 줄이 화자 줄로 안 잡혀 대화가 통째로 흰 종이 지문이 된다(실측 172-175).
    time_only = re.compile(r"^\[(\d{1,2}:\d{2}\s*[AP]\.?M\.?)\]", re.I)
    joined, k = [], 0
    while k < len(lines):
        if k + 1 < len(lines) and len(lines[k].strip()) <= 28 and time_only.match(lines[k + 1].strip()):
            joined.append(f"{lines[k].strip()} {lines[k + 1].strip()}")
            k += 2
        else:
            joined.append(lines[k])
            k += 1
    lines = joined

    i = 0
    while i < len(lines):
        m = chat_re.match(lines[i])
        if not m:
            break
        speaker, time, rest = m.group(1).strip(), m.group(2).strip(), m.group(3).strip()
        i += 1
        while i < len(lines) and not chat_re.match(lines[i]):
            rest = (rest + " " + lines[i]).strip()
            i += 1
        chat.append({"speaker": speaker, "time": time, "text": rest})
    if chat:
        return {"kind": "chat", "title": None, "meta": [], "sentences": [], "chat": chat}

    i = 0
    while i < len(lines):
        l = lines[i]
        # 머리 블록인가 — 아직 문장(마침표로 끝나는 줄)이 하나도 안 나왔으면 머리다.
        # 제목 아래 부제("UPCOMING WEBINAR")가 먼저 오는 조판이 흔해서 '본문 전'만으로는 부족했다.
        in_head = not any(b.rstrip().endswith((".", "!", "?")) for b in body)
        m = EMAIL_META.match(l)
        if m:
            v = m.group(2).strip()
            # 값이 다음 줄로 넘어간 조판. 다음 줄이 또 라벨이면 아래 '라벨만 모아둔 상자' 경우라 손대지 않는다
            if (not v and in_head and i + 1 < len(lines)
                    and not EMAIL_META.match(lines[i + 1]) and not LABEL_ONLY.match(lines[i + 1])):
                v = lines[i + 1].strip()
                i += 1
            # 값 칸이 라벨 칸보다 **위**에 놓인 조판 — 읽기 순서상 값이 라벨보다 먼저 온다.
            # (실측: 'All Staff' 다음 줄이 'To:' 였다. 안 되돌리면 본문 첫 문장이 'All Staff Hello everyone…')
            elif not v and in_head and body and len(body[-1]) <= 60 and not body[-1].rstrip().endswith("."):
                v = body.pop().strip()
            v, i = with_wrapped(v, lines, i, in_head)
            meta.append({"k": m.group(1).strip().title(), "v": v})
            i += 1
            continue
        # 라벨 칸 — 'Topic:' / 'Speaker:' 처럼 **줄 하나가 통째로 라벨**이고 값은 다음 줄이다.
        # 실물 공지·양식은 이렇게 두 칸으로 조판돼 있다. 본문에 섞으면 라벨 줄이 문장이 돼 버린다.
        # 본문이 시작되기 전(머리 블록)에만 본다 — 뒤에서 하면 'Note: …' 같은 문장까지 떼어낸다.
        if in_head and LABEL_ONLY.match(l) and i + 1 < len(lines) and not LABEL_ONLY.match(lines[i + 1]):
            v, i = with_wrapped(lines[i + 1].strip(), lines, i + 1, in_head)
            meta.append({"k": l.rstrip(": ").strip(), "v": v})
            i += 1
            continue
        if URLISH.match(l) and in_head:
            meta.append({"k": "URL", "v": l.strip()})
            i += 1
            continue
        # 라벨과 값이 한 줄인 머리 항목 — 'No: 013394' / 'Customer Service Line: 1-800-…'
        # 값이 길면 라벨이 아니라 문장이다('Approved by: … I agree that …') → 본문에 둔다
        mi = INLINE_LABEL.match(l) if in_head else None
        if mi and len(mi.group(2)) <= 40 and not mi.group(2).endswith("."):
            meta.append({"k": mi.group(1).strip(), "v": mi.group(2).strip()})
            i += 1
            continue
        # 제목 — 맨 앞의 짧은 줄(마침표 없음). 시험지에서 가운데 굵게 찍히는 그 줄이다
        if title is None and not body and not meta and len(l) <= 60 and not l.endswith("."):
            title = l.strip()
            i += 1
            continue
        # 제목 아래 부제(대문자 한 줄). 본문에 두면 첫 문장에 들러붙는다 — 'UPCOMING WEBINAR This Webinar is …'
        if title and not body and not meta and l.isupper() and len(l) <= 60:
            title = f"{title} — {l.strip()}"
            i += 1
            continue
        body.append(l)
        i += 1

    # 이메일 머리글은 라벨 칸과 값 칸이 **다른 상자**라, 텍스트로는 'To:' 만 오고 값은 뒤로 밀린다.
    # (실측: meta 가 전부 빈 값이고 본문이 'All Staff / Sherry Cohen / CEO visit …' 로 시작했다)
    # 값이 통째로 비어 있으면 본문 앞줄을 라벨 개수만큼 떼어 짝지어 준다.
    if meta and all(not m["v"] for m in meta) and len(body) >= len(meta):
        for m in meta:
            m["v"] = body.pop(0)

    # 머리말(‘refer to the following …’)이 종류를 말해줬으면 그걸 믿는다.
    # 'To: All staff' 로 시작하는 공지·메모까지 메일 창을 씌우면 실물과 달라진다.
    if kind == "text" and meta and any(m["k"].lower() in ("to", "from", "subject") for m in meta):
        kind = "email"
    return {
        "kind": kind,
        "title": title,
        "meta": meta,
        "sentences": to_sentences("\n".join(body)),
        "chat": [],
    }


def parse_questions(text):
    """문항 영역 → [{no, q, options[{label,text}]}]"""
    out = []
    cur = None
    for raw in text.splitlines():
        l = clean(raw)
        if not l:
            continue
        # 안내문이 시작되면 이 세트의 문항은 거기서 끝이다 — 뒤는 전부 시험지 furniture.
        # 안내문이 **보기와 같은 줄**에 붙어 오기도 하므로(‘Unit 105 Stop! This is …’)
        # 통째로 버리지 않고 앞부분(진짜 보기)만 살린 뒤 끊는다 — 버리면 보기가 3개가 되어
        # 문항이 통째로 사라진다.
        t = TAIL.search(l)
        if t and t.start() == 0:
            break
        last = False
        if t:
            l, last = l[:t.start()].strip(), True
            if not l:
                break
        mq = QNUM.match(l)
        mo = OPT.match(l)
        # Part 6 는 '143.	(A) will be halting' 처럼 번호와 첫 보기가 한 줄에 붙는다.
        # 그대로 두면 질문 자리에 보기가 들어가고 보기는 3개가 되어 문항이 통째로 버려진다.
        if mq and OPT.match(mq.group(2)):
            if cur:
                out.append(cur)
            cur = {"no": int(mq.group(1)), "q": "", "options": []}
            m2 = OPT.match(mq.group(2))
            cur["options"].append({"label": m2.group(1), "text": m2.group(2).strip()})
        elif mq and not mo:
            if cur:
                out.append(cur)
            cur = {"no": int(mq.group(1)), "q": mq.group(2).strip(), "options": []}
        elif mo and cur:
            cur["options"].append({"label": mo.group(1), "text": mo.group(2).strip()})
        elif cur:
            # 접힌 줄 — 보기 뒤면 그 보기에, 아니면 질문에 이어 붙인다
            if cur["options"]:
                cur["options"][-1]["text"] = (cur["options"][-1]["text"] + " " + l).strip()
            else:
                cur["q"] = (cur["q"] + " " + l).strip()
        if last:
            break
    if cur:
        out.append(cur)
    return [q for q in out if len(q["options"]) == 4]


def parse_bon(bon, lo, hi, want_part):
    """본권 페이지 구간 → 세트 배열.

    한 세트는 [머리말 → 지문 1..N → 문항] 순서다. 문항의 시작은 '155.' 같은 세 자리 번호이고,
    그 앞은 전부 지문이다. 세트가 두 쪽에 걸치면(지문 한 쪽, 문항 다음 쪽) 다음 머리말이
    나올 때까지 계속 담는다.
    """
    sets, cur = [], None
    for p in range(lo, hi):
        page = bon[p]
        for rect, text, col in read_order(blocks_of(page)):
            head = HEAD.search(text.replace("\n", " "))
            if head:
                if cur:
                    sets.append(cur)
                a, b = int(head.group(1)), int(head.group(2))
                cur = {
                    "from": a, "to": b, "page": p + 1,
                    "part": 6 if a <= 146 else 7,
                    "phrase": clean(head.group(3)),
                    "kinds": split_kinds(head.group(3)),
                    "_psg": [], "_q": [],
                }
                # 머리말 블록에 지문 첫 줄이 붙어 있는 경우 — 머리말만 떼고 나머지는 지문으로
                rest = text.replace("\n", " ")[head.end():].strip()
                if rest:
                    cur["_psg"].append((rect, rest, col))
                continue
            if not cur:
                continue
            first = text.splitlines()[0]
            if QNUM.match(first) or cur["_q"]:
                cur["_q"].append(text)          # 한 번 문항이 시작되면 그 뒤는 전부 문항
            else:
                cur["_psg"].append((rect, text, col))
    if cur:
        sets.append(cur)

    out = []
    for s in sets:
        if want_part and s["part"] != want_part:
            continue
        groups = split_by_gaps(s["_psg"], len(s["kinds"]))
        kinds = s["kinds"]
        passages = []
        for i, g in enumerate(groups):
            chunk = "\n".join(t for _, t, _ in g)
            passages.append(parse_passage(chunk, kinds[i] if i < len(kinds) else "text"))
        questions = parse_questions("\n".join(s["_q"]))
        repair_numbers(questions, s["from"], s["to"])
        out.append({
            "range": [s["from"], s["to"]],
            "part": s["part"],
            "page": s["page"],
            "phrase": s["phrase"],
            "passages": passages,
            "questions": questions,
        })
    return out


def repair_numbers(questions, a, b):
    """세트 범위를 벗어난 문항 번호를 자리로 되살린다.

    조판이 번호를 깨뜨리는 쪽이 있다 — 실측: 2권 RC TEST 9 의 **178번이 '900'** 으로 읽혔다.
    그러면 그 문항이 범위 밖이라 통째로 버려져 회차가 69문항이 된다(모의고사로는 못 쓴다).

    머리말이 세트 범위를 알려 주고(176-180) 문항은 그 안에서 순서대로 나오므로,
    **개수가 맞고 어긋난 번호가 빈 자리 개수와 같을 때만** 자리로 채운다.
    개수가 안 맞으면 손대지 않는다 — 잘못 채우느니 결손으로 남겨 감사기에 걸리는 편이 낫다.
    """
    want = list(range(a, b + 1))
    if len(questions) != len(want):
        return
    good = {q["no"] for q in questions if a <= q["no"] <= b}
    holes = [n for n in want if n not in good]
    bad = [q for q in questions if not a <= q["no"] <= b]
    if len(bad) != len(holes):
        return
    for q, n in zip(bad, holes):
        q["no_raw"] = q["no"]
        q["no"] = n


def hae_pages(hae, test_no):
    """해설 PDF 에서 그 회차의 페이지들.

    ⚠️ 이게 없으면 **모든 회차가 TEST 1 의 정답을 가져간다.** 문항 번호(131~200)가 회차마다
    똑같이 반복되기 때문에, 문서 전체에서 번호로 찾으면 항상 첫 회차가 걸린다(실측).
    해설은 쪽마다 머리에 'TEST n' 이 찍혀 있어서 그걸로 가른다.
    """
    first = {}
    for i in range(hae.page_count):
        for m in re.finditer(r"TEST\s*(\d+)", hae[i].get_text()):
            n = int(m.group(1))
            first.setdefault(n, i)
    if test_no not in first:
        return []
    lo = first[test_no]
    later = [p for n, p in first.items() if n > test_no and p > lo]
    hi = min(later) if later else hae.page_count
    return list(range(lo, hi))


ANSWER_KEY = re.compile(r"^(\d{3})\s+\(([A-D])\)$", re.M)


def answer_key(text):
    """해설 첫 쪽의 정답표 — '131 (B)' 가 한 줄씩. 이게 정답의 1차 근거다.

    ⚠️ 해설 문장에서 캐내는 방식만 쓰면 회차마다 3~6개가 빈다(실측).
       줄바꿈이 '정\\n답' 을 갈라놓거나, '(D) preferences(선호(도))가 정답이다' 처럼
       보기 표시 뒤에 괄호가 또 나와서 정규식이 끊긴다. 정답표는 그런 사고가 없다.
    """
    return {int(m.group(1)): m.group(2) for m in ANSWER_KEY.finditer(text)}


def parse_hae(hae, nums, test_no):
    """해설에서 문항별 {정답, 유형, 해설}. 정답은 정답표, 없으면 '(A)가 정답이다' 문장."""
    info = {}
    pages = hae_pages(hae, test_no) or list(range(hae.page_count))
    text = "\n".join(hae[i].get_text() for i in pages)
    text = "\n".join(clean(l) for l in text.splitlines())
    key = answer_key(text)
    # '156  Not / True' 처럼 번호 + 유형 라벨이 한 줄.
    # 정답표 줄('146 (B)')도 같은 모양이라 여기 걸린다 — 유형으로 오해하지 않게 걸러낸다.
    heads = [m for m in re.finditer(r"\n(\d{3})\s{1,4}([^\n]{0,24})\n", text)
             if not re.fullmatch(r"\([A-D]\)", clean(m.group(2)))]
    for idx, m in enumerate(heads):
        no = int(m.group(1))
        if no not in nums:
            continue
        body = text[m.end(): heads[idx + 1].start() if idx + 1 < len(heads) else len(text)]
        ma = ANSWER2.search(body) or ANSWER.search(body)
        mh = re.search(r"해설\s*(.+?)(?:\n어휘|\nParaphrasing|$)", body, re.S)
        # 정답표와 해설이 어긋나면 파서가 남의 문항을 보고 있다는 뜻이다 — 조용히 넘기지 않는다
        if no in key and ma and ma.group(1) != key[no]:
            print(f"  ⚠ {no}: 정답표 ({key[no]}) ≠ 해설 ({ma.group(1)}) — 정답표를 따른다")
        info[no] = {
            "qtype": clean(m.group(2)) or None,
            "answer": key.get(no) or (ma.group(1) if ma else None),
            "answer_src": "key" if no in key else ("해설" if ma else None),
            "explain": clean(mh.group(1))[:600] if mh else None,
        }
    # 해설 머리('156  Not / True')를 못 찾은 문항 — 유형·해설은 없어도 정답은 정답표에서 온다
    for no in nums:
        if no not in info and no in key:
            info[no] = {"qtype": None, "answer": key[no], "answer_src": "key", "explain": None}
    return info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", type=int, default=1, choices=(1, 2))
    ap.add_argument("--test", type=int, default=1)
    ap.add_argument("--part", type=int, choices=[6, 7])
    ap.add_argument("--out")
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()

    pdfs = find_pdfs(a.vol)
    rng = test_ranges(pdfs["bon"]).get(a.test)
    if not rng:
        raise SystemExit(f"TEST {a.test} 를 못 찾았다")
    sets = parse_bon(pdfs["bon"], rng[0], rng[1], a.part)
    nums = {q["no"] for s in sets for q in s["questions"]}
    hae = parse_hae(pdfs["hae"], nums, a.test)
    for s in sets:
        for q in s["questions"]:
            q.update(hae.get(q["no"], {}))
            for o in q["options"]:
                o["correct"] = (o["label"] == q.get("answer"))

    total_q = sum(len(s["questions"]) for s in sets)
    graded = sum(1 for s in sets for q in s["questions"] if q.get("answer"))
    print(f"TEST {a.test}: 세트 {len(sets)} · 문항 {total_q} · 정답 매칭 {graded}")
    for s in sets:
        kinds = "+".join(p["kind"] for p in s["passages"])
        sent = sum(len(p["sentences"]) or len(p["chat"]) for p in s["passages"])
        print(f"  {s['range'][0]}-{s['range'][1]} p{s['page']:3d} [{s['phrase'][:38]:38s}] "
              f"{kinds:22s} 지문{len(s['passages'])} 문장{sent:3d} 문항{len(s['questions'])}")

    if a.preview and sets:
        print("\n--- 첫 세트 미리보기 ---")
        print(json.dumps(sets[0], ensure_ascii=False, indent=2)[:2600])

    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            json.dump(sets, f, ensure_ascii=False, indent=2)
        print(f"\n→ {a.out}")


if __name__ == "__main__":
    main()
