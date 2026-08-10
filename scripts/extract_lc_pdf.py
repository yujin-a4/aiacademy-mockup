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
import glob
import json
import os
import re

import fitz

# 교재는 화자를 성별+억양으로 적는다(W-Am, W-Br, M-Au, M-Cn = 실제 토익의 네 억양).
# 예전엔 앞 글자(W/M)만 남기고 억양을 버렸는데, 그러면 **3인 대화의 남자 둘이 같은 사람**이 된다.
# 전체 태그를 살려 둔다 — 목소리 배정도 이 태그를 그대로 따르면 교재와 같아진다.
SPEAKER = re.compile(r"^([WM]-[A-Za-z]{2})\s*(.*)$")
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
    """
    files = sorted(glob.glob(os.path.join("YBM 실전토익 %d*pdf*" % vol, "*.pdf")))
    lc = [f for f in files if "LC" in os.path.basename(f)]
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
    for p in (2, 3, 4):
        if k >= len(marks[p]):
            continue
        lo = marks[p][k]
        nxt = [marks[q][k] for q in (p + 1, p + 2) if q <= 4 and k < len(marks[q])]
        out[p] = (lo, min(nxt) if nxt else end_of_test)
    return out


def parse_part2(text):
    """Part 2 → [{no, qtype, question, options[{label,text,why,is_correct,tag}]}]"""
    out = []
    blocks = re.split(r"\n(?=(?:[7-9]|1\d|2\d|3[01])\s*\n)", text)
    for b in blocks:
        lines = [clean(l) for l in b.splitlines()]
        lines = [l for l in lines if l]
        if not lines or not re.fullmatch(r"\d{1,2}", lines[0]):
            continue
        no = int(lines[0])
        if not 7 <= no <= 31:
            continue

        q, opts, qtype = None, [], None
        i = 1
        while i < len(lines):                       # 질문 발화
            m = SPEAKER.match(lines[i])
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
            elif s.startswith("번역"):
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
            o["is_correct"] = why.startswith("정답")
            o["why"] = re.sub(r"^(정답\.|[가-힣 ]*오답\.)\s*", "", why).strip()
            o["tag"] = None
            if not o["is_correct"]:
                for pat, tag in P2_TAG:
                    if pat.search(why):
                        o["tag"] = tag
                        break
        if q and len(opts) == 3 and any(o["is_correct"] for o in opts):
            out.append({"no": no, "qtype": qtype, "question": q, "options": opts})
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
    if re.match(r"^(어휘|해설|번역|Paraphrasing)\b", line):
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
    for raw in after.splitlines()[:3]:
        l = clean(raw)
        if not l or re.match(r"^\([A-D]\)", l) or re.match(r"^(어휘|해설|번역|Paraphrasing)", l):
            break
        l = re.sub(r"TEST\s*\d+\s*\d*", "", l).strip()      # 쪽 머리('TEST 1 29')가 줄 안에 낀다
        if not l:
            continue
        q = clean(q + " " + l)
        if q.endswith("?"):
            break
    return q


def parse_part34(text, lo, hi):
    """Part 3·4 → [{range, script[{speaker,en,for_q}], questions[{no,question,options,explain}]}]"""
    text = clean_lines(text)
    sets = []
    # 세트 머리는 '32-34' 또는 '71-73 전화 메시지' 처럼 **유형 라벨이 같은 줄에** 붙는다.
    # 라벨을 무시하고 개행만 기대했더니 Part 4 가 통째로 0세트였다. 라벨도 같이 뽑는다 —
    # '전화 메시지'·'광고' 같은 값이 어느 강의에 넣을지 가르는 근거가 된다.
    # `\s*` 를 쓰면 개행까지 먹어서 라벨 자리에 다음 줄(스크립트)이 들어온다. 가로 공백만 허용한다.
    heads = list(re.finditer(r"\n(\d{2})-(\d{2})[^\S\n]*([^\n]*)\n", text))
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
        for s in script:
            # 근거 문장에 인라인으로 박힌 문항 번호를 뽑고, 본문에서는 지운다
            s["for_q"] = [int(x) for x in re.findall(r"(?<![A-Za-z0-9])(\d{2})(?=\s)", s["en"])
                          if a <= int(x) <= b]
            s["en"] = clean(re.sub(r"(?<![A-Za-z0-9])\d{2}(?=\s)", "", s["en"]))

        qs = []
        nums = "|".join(str(n) for n in range(a, b + 1))
        for qm in re.finditer(r"\n(" + nums + r")\s+([A-Z][^\n]{6,})\n", body):
            after = body[qm.end():]
            opts = []
            for om in re.finditer(r"^\((A|B|C|D)\)\s*(.+)$", after[:700], re.M):
                if len(opts) < 4:
                    opts.append({"label": om.group(1), "text": clean(om.group(2))})
            me = re.search(r"해설\s*([\s\S]{0,700}?)(?:\n어휘|\nParaphrasing|\Z)", after)
            expl = clean(me.group(1)) if me else ""
            ma = ANSWER.search(expl)
            for o in opts:
                o["is_correct"] = bool(ma and o["label"] == ma.group(1))
            if len(opts) == 4 and ma:
                qs.append({"no": int(qm.group(1)), "question": full_question(qm.group(2), after),
                           "options": opts, "explain": expl})
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
    text_of = lambda p: "\n".join(hae[i].get_text() for i in range(*pages[p]))
    print("TEST %d 해설 — %s" % (args.test,
          " · ".join("P%d p%d~p%d" % (p, a + 1, b) for p, (a, b) in sorted(pages.items()))))

    result = {"vol": args.vol, "test": args.test}
    if args.part in (None, 2) and 2 in pages:
        p2 = parse_part2(text_of(2))
        result["part2"] = p2
        print("  Part 2: %d문항" % len(p2))
        for q in p2[:3]:
            print("    %d [%s] %s" % (q["no"], q["qtype"], q["question"][:50]))
    if args.part in (None, 3) and 3 in pages:
        p3 = parse_part34(text_of(3), 32, 70)
        result["part3"] = p3
        print("  Part 3: %d세트 / %d문항" % (len(p3), sum(len(s["questions"]) for s in p3)))
        for s in p3[:2]:
            print("    %s [%s] 스크립트 %d줄 · 문항 %d" % (s["range"], s.get("label") or "-", len(s["script"]), len(s["questions"])))
    if args.part in (None, 4) and 4 in pages:
        p4 = parse_part34(text_of(4), 71, 100)
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
