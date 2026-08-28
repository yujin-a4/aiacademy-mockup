# -*- coding: utf-8 -*-
"""실전 모의고사 추출 결손 감사기.

왜 필요한가
  기존 추출기들은 **강의에 넣을 문항을 골라 담는** 용도로 만들어졌다. 몇 개 빠져도 다른
  문항으로 대신하면 그만이었다. 모의고사는 다르다 — 100문항 중 4개가 비면 그 회차는
  시험이 아니다. 그래서 "얼마나 뽑혔나"가 아니라 **"1번부터 100번까지 다 있나"** 를 본다.

  눈으로 세면 놓친다(실측: Part 3 에서 44·46번이 중복으로 들어오고 45번이 빠져 있었는데
  세트 수·문항 수 합계는 멀쩡해 보였다). 번호 집합을 직접 비교한다.

무엇을 보나
  - 결손    : 있어야 할 번호가 없다
  - 중복    : 같은 번호가 두 번 들어왔다 (다른 문항을 덮어쓴 것이다)
  - 보기수  : P2 는 3개, 나머지는 4개
  - 정답    : 정답 키 표(extract_answer_keys)와 대조. 키 표가 정본이다
  - 스크립트: LC P3·P4 는 지문이 곧 음원이라 비어 있으면 못 쓴다

사용
  TOEIC_PDF_ROOT=... python scripts/audit_mock_extract.py --vol 1 --test 1
  TOEIC_PDF_ROOT=... python scripts/audit_mock_extract.py --vol 1 --all
"""
import argparse
import io
import json
import os
import sys

import extract_answer_keys as ak

HERE = os.path.dirname(os.path.abspath(__file__))
DUMP = os.path.join(HERE, "dump")

# 파트별로 있어야 할 문항 번호와 보기 수
SPEC = {
    1: (range(1, 7), 4),
    2: (range(7, 32), 3),
    3: (range(32, 71), 4),
    4: (range(71, 101), 4),
    5: (range(101, 131), 4),
    6: (range(131, 147), 4),
    7: (range(147, 201), 4),
}


def lc_questions(path):
    """LC 덤프 → {번호: 문항}. 세트 구조를 평평하게 편다."""
    d = json.load(io.open(path, encoding="utf-8"))
    out = {}
    dup = []
    for q in d.get("part2", []):
        (dup.append(q["no"]) if q["no"] in out else None)
        out[q["no"]] = {"part": 2, "options": q["options"], "script": q.get("question", "")}
    for key, part in (("part3", 3), ("part4", 4)):
        for s in d.get(key, []):
            script = s.get("script") or []
            for q in s["questions"]:
                if q["no"] in out:
                    dup.append(q["no"])
                out[q["no"]] = {"part": part, "options": q["options"],
                                "script": " ".join(x.get("en", "") for x in script)}
    return out, dup


def rc_questions(path, p5_path=None, test=None, vol=1):
    """RC 덤프(P6·P7) + Part5 뱅크 → {번호: 문항}."""
    out, dup = {}, []
    if p5_path and os.path.exists(p5_path):
        for q in json.load(io.open(p5_path, encoding="utf-8")):
            if q.get("test") != test or q.get("vol", 1) != vol:
                continue
            if q["num"] in out:
                dup.append(q["num"])
            out[q["num"]] = {"part": 5,
                             "options": [{"label": k, "text": v} for k, v in sorted(q["opts"].items())],
                             "answer": q.get("answer"), "script": q.get("sentence", "")}
    if os.path.exists(path):
        d = json.load(io.open(path, encoding="utf-8"))
        sets = d if isinstance(d, list) else d.get("sets", [])
        for s in sets:
            for q in s.get("questions", []):
                part = 6 if q["no"] <= 146 else 7
                if q["no"] in out:
                    dup.append(q["no"])
                out[q["no"]] = {"part": part, "options": q.get("options", []),
                                "answer": q.get("answer"),
                                "script": " ".join(
                                    " ".join(x if isinstance(x, str) else x.get("en", "")
                                             for x in p.get("sentences", []))
                                    for p in s.get("passages", []))}
    return out, dup


def audit(area, vol, test, verbose=True):
    keys = ak.answer_keys(area, str(vol)).get(test, {})
    if area == "LC":
        path = os.path.join(DUMP, "mock_lc%d_t%02d.json" % (vol, test))
        if not os.path.exists(path):
            return {"area": area, "test": test, "error": "덤프 없음: %s" % path}
        got, dup = lc_questions(path)
        parts = (2, 3, 4)          # Part 1 은 본권 사진 + 별도 경로
    else:
        path = os.path.join(DUMP, "mock_rc%d_t%02d.json" % (vol, test))
        p5 = os.path.join(DUMP, "rc_p5_bank%s.json" % ("" if vol == 1 else vol))
        got, dup = rc_questions(path, p5, test, vol)
        parts = (5, 6, 7)

    rows = []
    for p in parts:
        want, nopt = SPEC[p]
        miss = [n for n in want if n not in got]
        badopt = [n for n in want if n in got and len(got[n]["options"]) != nopt]
        noscript = [n for n in want if n in got and not (got[n]["script"] or "").strip()]
        wrongans = []
        for n in want:
            q = got.get(n)
            if not q or n not in keys:
                continue
            picked = q.get("answer") or next(
                (o["label"] for o in q["options"] if o.get("is_correct") or o.get("correct")), None)
            if picked and picked != keys[n]:
                wrongans.append((n, picked, keys[n]))
        rows.append({"part": p, "want": len(list(want)), "got": len(list(want)) - len(miss),
                     "miss": miss, "dup": [n for n in dup if n in want],
                     "badopt": badopt, "noscript": noscript, "wrongans": wrongans})
    if verbose:
        print("[%s vol%d TEST %02d]" % (area, vol, test))
        for r in rows:
            flag = "OK " if not (r["miss"] or r["dup"]) else "!! "
            print("  %sPart %d  %3d/%-3d  결손 %s  중복 %s  보기수이상 %s  정답불일치 %s"
                  % (flag, r["part"], r["got"], r["want"],
                     r["miss"] or "-", r["dup"] or "-", r["badopt"] or "-",
                     r["wrongans"] or "-"))
            if r["part"] in (3, 4) and r["noscript"]:
                print("       스크립트 없음: %s" % r["noscript"])
    return {"area": area, "vol": vol, "test": test, "rows": rows}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", type=int, default=1, choices=(1, 2))
    ap.add_argument("--test", type=int, default=1)
    ap.add_argument("--area", choices=("LC", "RC"))
    ap.add_argument("--all", action="store_true", help="1~10 회차 전부")
    a = ap.parse_args()

    tests = range(1, 11) if a.all else [a.test]
    areas = [a.area] if a.area else ["LC", "RC"]
    total_miss = 0
    for t in tests:
        for area in areas:
            r = audit(area, a.vol, t)
            if r.get("error"):
                print("[%s TEST %02d] %s" % (area, t, r["error"]))
                continue
            total_miss += sum(len(x["miss"]) + len(x["dup"]) for x in r["rows"])
    print("\n결손+중복 합계: %d" % total_miss)
    return 0 if total_miss == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
