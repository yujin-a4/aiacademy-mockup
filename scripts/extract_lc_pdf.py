# -*- coding: utf-8 -*-
"""
YBM 실전토익 LC 1000 해설 PDF → 문항 JSON 추출기 (Part 2·3·4)

왜 만들었나:
  정규 커리큘럼 42강 중 24강이 문항 0개였다. 레일·아이템·화면은 다 되는데 문항만 없다.
  교재 PDF 가 소스인데, 해설 PDF 한 권에 필요한 게 전부 들어 있다 —
  화자별 스크립트 · 보기 · 정답 · 오답 유형별 근거 · 번역.

해설 PDF 의 구조 (실측)
  [Part 2]  번호 / 질문 발화(W-Br) / 응답 3개(M-Au (A)(B)(C)) / 번역 /
            해설 <문제 유형>  ← 이걸로 어느 강의인지 가른다
            (A) 유사 발음 오답. …   ← 보기별 근거 + 오답 유형
            (B) 정답. …
  [Part 3·4] 32-34 / 화자별 스크립트(근거 문장에 문항 번호가 인라인으로 박혀 있다) /
            번역 / 문항별 [질문 · 보기 4개 · 해설("정답은 (D)이다")]

⚠️ 이 PDF 는 화자 태그와 본문 사이에 BEL 같은 **제어문자**를 끼워 넣는다.
   정규식 공백류로는 안 잡혀서 처음엔 파싱 결과가 통째로 0이었다. clean() 참조.

사용
  python scripts/extract_lc_pdf.py --test 1 --out scripts/_lc_test1.json
  python scripts/extract_lc_pdf.py --test 1 --part 2
"""
import argparse
import json
import os
import re

import fitz

import _book_paths
import extract_answer_keys

# 교재는 화자를 성별+억양으로 적는다(W-Am, W-Br, M-Au, M-Cn = 실제 토익의 네 억양).
# 예전엔 앞 글자(W/M)만 남기고 억양을 버렸는데, 그러면 **3인 대화의 남자 둘이 같은 사람**이 된다.
# 전체 태그를 살려 둔다 — 목소리 배정도 이 태그를 그대로 따르면 교재와 같아진다.
#
# 그리고 **두 권의 조판이 다르다** — 이걸 하나로 받지 못해 2권 LC 가 통째로 0문항이었다.
#   1권: 'M-Au Priyanka, have you …'   성별+억양을 본문과 한 줄에
#   2권: 'M  Priyanka, have you …'     성별만. 억양은 세트 머리('32-34  M-Au / W-Am')에 몰아 둔다
# ⚠️ 뒤에 반드시 공백이 와야 한다(`(?=\s)`). 안 그러면 'What product …' 의 'W' 가 화자로 잡혀
#    질문이 'hat product …' 이 된다.
SPEAKER = re.compile(r"^([WM](?:-[A-Za-z]{2}|\d)?)(?=\s)\s+(.*)$")
# 화자만 있고 본문은 다음 줄인 머리('W-Br / M-Cn'). 2권 Part 2 의 조판이다.
SPEAKER_ONLY = re.compile(r"^[WM](?:-[A-Za-z]{2}|\d)?(?:\s*/\s*[WM](?:-[A-Za-z]{2}|\d)?)*\s*$")

# Part 2 문항 머리를 자르는 자리. **조판이 두 가지다.**
#   '11'                 번호만 (1권 전부 · 2권 앞쪽 몇 쪽)
#   '13\t W-Br / M-Au'   번호와 화자가 한 줄  (2권 대부분)
# 번호만 기대하고 잘랐더니 뒤쪽 조판에서 문항이 안 잘려, 앞 문항 블록이 12~31번을 통째로
# 삼켰다 — 2권 Part 2 가 회차마다 25문항 중 4~5개만 나왔다(실측).
_SPK = r"[WM](?:-[A-Za-z]{2})?"
P2_SPLIT = re.compile(
    r"\n(?=(?:[7-9]|1\d|2\d|3[01])[^\S\n]*"
    r"(?:" + _SPK + r"(?:[^\S\n]*/[^\S\n]*" + _SPK + r")*[^\S\n]*)?\n)")
# 해설에서 번역 절이 시작되는 표시. 1권은 '번역', 2권은 '해석'
TRANS_MARK = re.compile(r"^(번역|해석)\b")
OPT = re.compile(r"^\((A|B|C|D)\)\s*(.*)$")
ANSWER = re.compile(r"정답은\s*\(([A-D])\)\s*이?다")

# 해설의 오답 유형 → DB wrong_answer_tags (part 2)
P2_TAG = [
    (re.compile(r"유사 발음"), "유사 발음 함정형"),
    (re.compile(r"단어 반복|동일 단어"), "단어 반복 함정형"),
    (re.compile(r"연상"), "무관 응답형"),
    (re.compile(r"관계없|관련 없"), "무관 응답형"),
    (re.compile(r"Yes/No|의문사 의문문에는"), "응답유형 불일치형"),
]

# 공백으로 볼 문자 (일반 공백·탭·NBSP·EN/EM SPACE 계열)
_WS = set(" \t") | {chr(0xA0)} | {chr(c) for c in range(0x2000, 0x200B)}


def clean(s):
    """공백 정리 + 제어문자 제거.

    이 PDF 는 화자 태그와 본문 사이에 BEL(U+0007) 같은 제어문자를 끼워 넣는다.
    'W-Am <BEL>(A) In the hallway.' 처럼 되어 보기 정규식이 안 맞았고,
    그 탓에 Part 2 파싱 결과가 통째로 0이었다. 코드포인트로 거른다.
    """
    out = []
    prev_space = False
    for ch in s:
        if ch in _WS or ord(ch) < 32:
            if not prev_space:
                out.append(" ")
            prev_space = True
        else:
            out.append(ch)
            prev_space = False
    return "".join(out).strip()


def find_pdfs(vol=1):
    """해당 권의 LC 본권·해설 PDF.

    ⚠️ 예전엔 'YBM*pdf*/*.pdf' 를 통째로 글롭했는데, 2권 폴더가 생기면서 두 권이 같이 잡혔다.
       그대로 두면 1권 해설과 2권 본권이 섞인다 — 권을 반드시 지정해서 집는다.
    교재 위치는 _book_paths 가 정한다(TOEIC_PDF_ROOT). 레포 밖에 두고 쓸 수 있게.
    """
    lc = _book_paths.book_pdfs(vol, "LC")
    if len(lc) != 2:
        raise SystemExit("%d권 LC PDF 를 2개로 못 집었다: %s" % (vol, lc))
    docs = [fitz.open(f) for f in lc]
    docs.sort(key=lambda d: d.page_count)
    return {"bon": docs[0], "hae": docs[-1]}


def part_pages(hae, test_no):
    """TEST n 의 파트별 페이지 범위 [lo, hi) — 0-based

    'TEST n' 글자로 구간을 자르려 했더니 머리말·목차에도 나와서 범위가 잘렸다
    (Part 3 가 13세트인데 8세트만 잡혔다). 파트 표제 페이지로 잡는 게 정확하다.
    """
    marks = {}
    for p in (1, 2, 3, 4):
        marks[p] = [i for i in range(hae.page_count)
                    if re.search(r"\n\s*PART " + str(p) + r"\s*\n", hae[i].get_text())]
    if test_no > len(marks[1]):
        return {}
    k = test_no - 1
    end_of_test = marks[1][k + 1] if k + 1 < len(marks[1]) else hae.page_count
    out = {}
    if k < len(marks[2]):
        out[1] = (marks[1][k], marks[2][k])
    for p in (2, 3, 4):
        if k >= len(marks[p]):
            continue
        lo = marks[p][k]
        nxt = [marks[q][k] for q in (p + 1, p + 2) if q <= 4 and k < len(marks[q])]
        out[p] = (lo, min(nxt) if nxt else end_of_test)
    return out


def page_text(page):
    """한 쪽의 텍스트를 **읽기 순서대로**.

    ⚠️ 해설은 2단 조판이다. `page.get_text()` 를 그대로 쓰면 단을 넘나들며 읽어서 문항 순서가
       '7 · 11 · 8 · 9 · 10' 으로 뒤섞인다(2권 실측). 그러면 문항 블록을 번호로 자를 때
       10번 블록이 뒤의 12~31번을 통째로 삼켜 **Part 2 가 25문항 중 4개만** 남았다.
       블록을 왼단·오른단으로 가른 뒤 각각 세로 순으로 잇는다.

    쪽 전체 폭을 쓰는 블록(표제 등)은 가운데를 넘느냐로 한쪽에 붙는다 — 어느 쪽이든
    파싱에 쓰는 건 번호·화자·보기 줄이라 영향이 없다.
    """
    blocks = [b for b in page.get_text("blocks") if len(b) > 6 and b[6] == 0]
    if not blocks:
        return page.get_text()
    mid = (page.rect.x0 + page.rect.x1) / 2
    key = lambda b: (round(b[1], 1), b[0])
    left = sorted((b for b in blocks if (b[0] + b[2]) / 2 < mid), key=key)
    right = sorted((b for b in blocks if (b[0] + b[2]) / 2 >= mid), key=key)
    return "\n".join(b[4] for b in left + right)


def part_text(hae, pages, p):
    """파트 p 의 해설 본문 텍스트.

    ⚠️ **파트 경계는 쪽 경계와 다르다.** 한 쪽 안에 앞 파트의 마지막 문항 해설과 다음 파트의
       표제가 같이 앉는다. 쪽 단위로만 자르면 그 쪽에 있던 앞 파트 문항이 통째로 사라진다 —
       실측으로 Part 2 의 **30·31번이 회차마다 빠졌다**(TEST 1: 23/25문항).
       → 다음 파트의 첫 쪽까지 읽고, 글 안에서 다음 파트 표제를 만나면 거기서 자른다.

    Part 4 의 다음은 '다음 회차의 PART 1' 이다. 그래서 끊는 표제는 p+1 이 아니라 4→1 로 돈다.
    """
    lo, hi = pages[p]
    text = "\n".join(page_text(hae[i]) for i in range(lo, min(hi + 1, hae.page_count)))
    nxt = p + 1 if p < 4 else 1
    m = re.search(r"\n\s*PART " + str(nxt) + r"\s*\n", text)
    return text[:m.start()] if m else text


def parse_part1(text, keys=None):
    """Part 1 → [{no, photo_type, options[{label,text,why,is_correct}]}]

    Part 1 은 **질문 문장이 없다** — 사진이 질문이고, 보기 4개는 음성으로만 나온다.
    그래서 parse_part2 와 달리 질문 발화를 찾지 않고, 화자 줄 다음의 보기 4개만 모은다.
    사진 자체는 본권에 있다(scripts/extract_part1_photos.py).
    """
    out = []
    blocks = re.split(r"\n(?=[1-6][^\S\n]*\n)", text)
    for b in blocks:
        lines = [l for l in (clean(x) for x in b.splitlines()) if l]
        if not lines or not re.fullmatch(r"[1-6]", lines[0]):
            continue
        no = int(lines[0])

        opts, i = [], 1
        while i < len(lines) and len(opts) < 4:
            s = lines[i]
            m2 = SPEAKER.match(s)
            if m2:
                s = m2.group(2)
            mo = OPT.match(s)
            if mo:
                opts.append({"label": mo.group(1), "text": mo.group(2).strip()})
            elif TRANS_MARK.match(s):
                break
            i += 1
        if len(opts) != 4:
            continue

        rest = "\n".join(lines[i:])
        mt = re.search(r"해설\s*(.+)", rest)
        photo_type = mt.group(1).strip() if mt else None
        tail = rest.split("해설", 1)[-1]
        for o in opts:
            mw = re.search(r"\(" + o["label"] + r"\)\s*([^\n]*(?:\n(?!\([A-D]\)|어휘)[^\n]*)*)", tail)
            why = clean(mw.group(1)) if mw else ""
            said = why.startswith("정답")
            o["why"] = re.sub(r"^(정답[.:]|[가-힣 ]*오답[.:])\s*", "", why).strip()
            o["is_correct"] = said
        key = keys.get(no) if keys else None
        if key:
            for o in opts:
                o["is_correct"] = (o["label"] == key)
        if any(o["is_correct"] for o in opts):
            out.append({"no": no, "photo_type": photo_type, "options": opts,
                        "answer": key, "answer_src": "key" if key else "해설"})
    return out


def parse_part2(text, keys=None):
    """Part 2 → [{no, qtype, question, options[{label,text,why,is_correct,tag}]}]

    `keys` = 정답 키 표. 주면 그쪽이 정본이다(parse_part34 와 같은 이유).
    """
    out = []
    blocks = P2_SPLIT.split(text)
    for b in blocks:
        lines = [clean(l) for l in b.splitlines()]
        lines = [l for l in lines if l]
        if not lines:
            continue
        mh = re.match(r"^(\d{1,2})[^\S\n]*(.*)$", lines[0])
        if not mh:
            continue
        no = int(mh.group(1))
        if not 7 <= no <= 31:
            continue
        head_rest = mh.group(2).strip()

        q, opts, qtype = None, [], None
        i = 1
        # 번호 줄에 화자까지 붙어 있으면(2권) 발화는 **그 다음 줄**이다
        if head_rest and SPEAKER_ONLY.match(head_rest) and i < len(lines) \
                and not OPT.match(lines[i]):
            q = lines[i]
            i += 1
        while q is None and i < len(lines):          # 질문 발화
            l = lines[i]
            # 2권: 'W-Br / M-Cn' 처럼 **화자만 있는 줄**이고 발화는 다음 줄이다
            if SPEAKER_ONLY.match(l):
                nxt = lines[i + 1] if i + 1 < len(lines) else ""
                if nxt and not OPT.match(nxt):
                    q = nxt
                    i += 2
                    break
            m = SPEAKER.match(l)
            if m and m.group(2) and not OPT.match(m.group(2)):
                q = m.group(2)
                i += 1
                break
            i += 1
        while i < len(lines) and len(opts) < 3:     # 응답 3개
            s = lines[i]
            m2 = SPEAKER.match(s)
            if m2:
                s = m2.group(2)
            mo = OPT.match(s)
            if mo:
                opts.append({"label": mo.group(1), "text": mo.group(2).strip()})
            elif TRANS_MARK.match(s):
                break
            i += 1

        rest = "\n".join(lines[i:])
        mt = re.search(r"해설\s*(.+)", rest)
        if mt:
            qtype = mt.group(1).strip()
        tail = rest.split("해설", 1)[-1]
        for o in opts:
            mw = re.search(
                r"\(" + o["label"] + r"\)\s*([^\n]*(?:\n(?!\([A-D]\)|어휘)[^\n]*)*)", tail)
            why = clean(mw.group(1)) if mw else ""
            o["_said_correct"] = why.startswith("정답")
            o["is_correct"] = o["_said_correct"]
            # 1권은 '정답.', 2권은 '정답:' 으로 적는다. 둘 다 떼어 낸다
            o["why"] = re.sub(r"^(정답[.:]|[가-힣 ]*오답[.:])\s*", "", why).strip()
            o["tag"] = None
            if not o["is_correct"]:
                for pat, tag in P2_TAG:
                    if pat.search(why):
                        o["tag"] = tag
                        break
        key = keys.get(no) if keys else None
        if key:                                   # 키 표가 정본. 해설 문구가 흔들려도 문항을 살린다
            for o in opts:
                o["is_correct"] = (o["label"] == key)
        said = next((o["label"] for o in opts if o.pop("_said_correct", False)), None)
        if q and len(opts) == 3 and any(o["is_correct"] for o in opts):
            out.append({"no": no, "qtype": qtype, "question": q, "options": opts,
                        "answer": key or said,
                        "answer_src": "key" if key else "해설",
                        "answer_conflict": (said if key and said and said != key else None)})
    return out


def clean_lines(text):
    """줄 구조는 지키면서 각 줄만 clean(). Part 3·4 는 줄 단위 정규식을 쓰기 때문에
    clean() 을 통째로 걸면 개행까지 공백이 돼 버린다.
    (제어문자를 안 지우면 '32 <BEL>Why did…' 의 [A-Z] 가 안 맞아 문항이 하나도 안 잡힌다)"""
    return "\n".join(clean(l) for l in text.splitlines())


def script_ends(line):
    """이 줄부터는 스크립트가 아니다.

    Part 4 는 **한국어 번역이 '번역' 표시 없이** 영어 스크립트 바로 뒤에 붙는다.
    그래서 '번역' 으로만 잘랐더니 어휘 섹션('어휘 portable 휴대가 쉬운 …' — 영문이 섞여 있다)과
    문항·보기까지 담화에 딸려 들어갔고, 화면에서 **문제 음원이 질문 텍스트까지 읽어버렸다.**
    """
    if re.match(r"^(어휘|해설|번역|해석|Paraphrasing)\b", line):
        return True
    if re.match(r"^\([A-D]\)", line):            # 보기
        return True
    # '77 What kind of equipment …' = 문항 시작.
    # ⚠️ 숫자로 시작하는 줄을 다 끊으면 안 된다 — 해설은 **근거 문장 앞에도 문항 번호를 박는다**
    #    ('89 It’s great to see everyone …'). 그렇게 끊었더니 스크립트가 통째로 0자인 세트가
    #    회차마다 한둘씩 나왔다(실측 6세트). 문항은 의문사로 시작하므로 그걸로 가른다.
    if re.match(r"^\d{2}\s+(What|Where|Why|Who|When|How|Which|Whose|According|Look|Select)\b", line):
        return True
    hangul = sum(1 for ch in line if "가" <= ch <= "힣")
    return hangul >= 4 and hangul / max(len(line), 1) > 0.3   # 한국어 번역 줄


def full_question(head, after):
    """문항 질문이 두 줄로 접힌 경우를 이어 붙인다.

    ⚠️ 이걸 안 하면 화면에 **잘린 질문**이 뜬다 — 실측으로 DB 에
    'What does the speaker emphasize about the' 처럼 반 토막이 들어가 있었다.
    질문은 물음표로 끝나므로, 물음표가 나올 때까지만 다음 줄을 붙인다(보기·해설을 만나면 멈춘다).
    """
    q = clean(head)
    if q.endswith("?"):
        return q
    seen = 0
    for raw in after.splitlines():
        l = clean(raw)
        # ⚠️ 빈 줄에서 멈추면 안 된다. 2권은 접힌 질문 사이에 빈 줄이 들어간다 —
        #    '72 What problem does the speaker mention about' / (빈 줄) / 'some managers?'
        #    빈 줄에서 끊었더니 물음표 없는 반 토막이 되어 그 문항이 통째로 버려졌다(실측).
        if not l:
            continue
        if re.match(r"^\([A-D]\)", l) or re.match(r"^(어휘|해설|번역|해석|Paraphrasing)", l):
            break
        seen += 1
        if seen > 3:
            break
        l = re.sub(r"TEST\s*\d+\s*\d*", "", l).strip()      # 쪽 머리('TEST 1 29')가 줄 안에 낀다
        if not l:
            continue
        q = clean(q + " " + l)
        if q.endswith("?"):
            break
    return q


def parse_part34(text, lo, hi, keys=None):
    """Part 3·4 → [{range, script[{speaker,en,for_q}], questions[{no,question,options,explain}]}]

    `keys` = 정답 키 표({문항번호: 'A'}). **주면 그쪽이 정본이다.**
    해설의 '정답은 (D)이다' 문장은 회차마다 표기가 흔들려 못 읽는 문항이 나오고(그러면 그 문항이
    통째로 버려졌다), 읽어도 틀리는 경우가 있다(실측 TEST 1: 47·65·66·69번이 키 표와 달랐다).
    """
    text = clean_lines(text)
    sets = []
    # 세트 머리는 '32-34' 또는 '71-73 전화 메시지' 처럼 **유형 라벨이 같은 줄에** 붙는다.
    # 라벨을 무시하고 개행만 기대했더니 Part 4 가 통째로 0세트였다. 라벨도 같이 뽑는다 —
    # '전화 메시지'·'광고' 같은 값이 어느 강의에 넣을지 가르는 근거가 된다.
    # `\s*` 를 쓰면 개행까지 먹어서 라벨 자리에 다음 줄(스크립트)이 들어온다. 가로 공백만 허용한다.
    # ⚠️ 끝 번호가 세 자리인 세트가 있다 — **'98-100'**. `\d{2}` 로 받으면 이 세트만 통째로
    #    빠진다(실측: 회차마다 Part 4 마지막 3문항 결손). 2~3자리를 받는다.
    heads = list(re.finditer(r"\n(\d{2})-(\d{2,3})[^\S\n]*([^\n]*)\n", text))
    for idx, m in enumerate(heads):
        a, b = int(m.group(1)), int(m.group(2))
        if not lo <= a <= hi:
            continue
        # '95-9' 처럼 끝 번호가 깨져 들어오는 쪽이 있다(TEST 3 실측). 그대로 두면 아래에서
        # 문항 번호 목록이 빈 정규식이 되어 빈 문자열을 int() 하다 죽는다 — 세트째 건너뛴다.
        if b < a:
            continue
        start = m.end()
        end = heads[idx + 1].start() if idx + 1 < len(heads) else len(text)
        body = text[start:end]

        script, cur = [], None
        for raw in body.splitlines():
            l = clean(raw)
            if not l:
                continue
            ms = SPEAKER.match(l)
            if ms:
                if cur:
                    script.append(cur)
                cur = {"speaker": ms.group(1), "en": ms.group(2).strip()}
                continue
            if script_ends(l):
                break
            if cur and re.search(r"[A-Za-z]", l):
                cur["en"] += " " + l
        if cur:
            script.append(cur)

        # Part 4(담화)는 화자가 **세트 머리에만** 있고 본문엔 태그가 없다 —
        # '71-73  전화 메시지  M-Cn' 다음 줄부터 바로 영어 담화가 이어진다(2권 조판).
        # 태그를 못 찾았다고 세트를 버리면 Part 4 가 통째로 0세트가 된다(실측).
        if not script:
            head_spk = re.search(r"([WM]-[A-Za-z]{2})", m.group(3) or "")
            mono = []
            for raw in body.splitlines():
                l = clean(raw)
                if not l:
                    continue
                if script_ends(l):
                    break
                if re.search(r"[A-Za-z]", l):
                    mono.append(l)
            if mono:
                script = [{"speaker": head_spk.group(1) if head_spk else "M",
                           "en": clean(" ".join(mono))}]
        for s in script:
            # 근거 문장에 인라인으로 박힌 문항 번호를 뽑고, 본문에서는 지운다.
            #
            # ⚠️ 지울 때 **반드시 이 세트의 번호(a~b)인지 봐야 한다.** 예전에는 두 자리 숫자를
            #    조건 없이 지워서, 담화 본문의 진짜 숫자('at 10 o'clock')까지 날릴 수 있었다.
            # ⚠️ 그리고 세 자리(100)와 숫자 뒤 구두점('71,')을 놓쳤다 — 그 둘이 스크립트에
            #    그대로 남아 학습자에게 '…administration. 71, I'm calling' 으로 보였다(실측).
            marks = [int(x) for x in re.findall(r"(?<![A-Za-z0-9])(\d{2,3})(?![A-Za-z0-9])", s["en"])
                     if a <= int(x) <= b]
            s["for_q"] = marks
            if marks:
                nums = "|".join(str(n) for n in sorted(set(marks), reverse=True))
                # 번호와 바로 뒤에 붙은 구두점까지 함께 지운다
                s["en"] = clean(re.sub(
                    r"(?<![A-Za-z0-9])(?:" + nums + r")[,.]?(?![A-Za-z0-9])", "", s["en"]))

        # 문항 번호 → 문항. **리스트가 아니라 dict 다.**
        # 해설은 근거 문장 앞에도 문항 번호를 박기 때문에(위 for_q 참조) 같은 번호가 두 번 잡힌다.
        # 리스트에 그대로 담았더니 '44-46' 세트가 [46, 44, 46] 이 되어 45번이 사라졌다(실측).
        # 번호로 덮되, **보기 4개가 다 붙은 쪽을 이긴 것으로 친다** — 인라인 오검출은 보기가 없다.
        qs = {}
        nums = "|".join(str(n) for n in range(a, b + 1))
        for qm in re.finditer(r"\n(" + nums + r")\s+([A-Z][^\n]{6,})\n", body):
            after = body[qm.end():]
            opts = []
            for om in re.finditer(r"^\((A|B|C|D)\)\s*(.+)$", after[:700], re.M):
                if len(opts) < 4:
                    opts.append({"label": om.group(1), "text": clean(om.group(2))})
            me = re.search(r"해설\s*([\s\S]{0,700}?)(?:\n어휘|\nParaphrasing|\Z)", after)
            expl = clean(me.group(1)) if me else ""
            no = int(qm.group(1))
            question = full_question(qm.group(2), after)

            # 질문은 물음표로 끝난다. 스크립트 근거 문장에 박힌 번호는 그렇지 않아 여기서 걸러진다.
            if not question.endswith("?") or len(opts) != 4:
                continue

            ma = ANSWER.search(expl)                       # 해설이 말하는 정답(참고용)
            key = keys.get(no) if keys else None           # 정답 키 표 = 정본
            ans = key or (ma.group(1) if ma else None)
            for o in opts:
                o["is_correct"] = (o["label"] == ans)
            if no not in qs or len(qs[no]["options"]) < 4:
                qs[no] = {"no": no, "question": question, "options": opts, "explain": expl,
                          "answer": ans,
                          "answer_src": "key" if key else ("해설" if ma else None),
                          # 해설과 키 표가 갈리면 남겨 둔다. 뒤에서 사람이 볼 수 있게
                          "answer_conflict": (ma.group(1) if ma and key and ma.group(1) != key else None)}
        qs = [qs[n] for n in sorted(qs)]
        if script and qs:
            sets.append({"range": "%d-%d" % (a, b), "label": clean(m.group(3)) or None,
                         "script": script, "questions": qs})
    return sets


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", type=int, default=1, choices=(1, 2))
    ap.add_argument("--test", type=int, default=1)
    ap.add_argument("--part", type=int)
    ap.add_argument("--out")
    args = ap.parse_args()

    hae = find_pdfs(args.vol)["hae"]
    pages = part_pages(hae, args.test)
    if not pages:
        print("TEST %d 를 찾지 못했습니다" % args.test)
        return
    text_of = lambda p: part_text(hae, pages, p)
    print("TEST %d 해설 — %s" % (args.test,
          " · ".join("P%d p%d~p%d" % (p, a + 1, b) for p, (a, b) in sorted(pages.items()))))

    # 정답 키 표 = 정본. 해설의 '정답은 (D)이다' 는 참고용으로만 쓴다(§parse_part34 주석).
    keys = extract_answer_keys.answer_keys("LC", str(args.vol)).get(args.test, {})

    result = {"vol": args.vol, "test": args.test}
    if args.part in (None, 2) and 2 in pages:
        p2 = parse_part2(text_of(2), keys)
        result["part2"] = p2
        print("  Part 2: %d문항" % len(p2))
        for q in p2[:3]:
            print("    %d [%s] %s" % (q["no"], q["qtype"], q["question"][:50]))
    if args.part in (None, 3) and 3 in pages:
        p3 = parse_part34(text_of(3), 32, 70, keys)
        result["part3"] = p3
        print("  Part 3: %d세트 / %d문항" % (len(p3), sum(len(s["questions"]) for s in p3)))
        for s in p3[:2]:
            print("    %s [%s] 스크립트 %d줄 · 문항 %d" % (s["range"], s.get("label") or "-", len(s["script"]), len(s["questions"])))
    if args.part in (None, 4) and 4 in pages:
        p4 = parse_part34(text_of(4), 71, 100, keys)
        result["part4"] = p4
        print("  Part 4: %d세트 / %d문항" % (len(p4), sum(len(s["questions"]) for s in p4)))
        for s in p4[:4]:
            print("    %s [%s] 스크립트 %d줄 · 문항 %d" % (s["range"], s.get("label") or "-", len(s["script"]), len(s["questions"])))

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=1)
        print("\n→ %s" % args.out)


if __name__ == "__main__":
    main()
