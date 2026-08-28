# -*- coding: utf-8 -*-
"""실전 모의고사 회차 전량 추출 구동기.

왜 따로 두나
  추출기 하나를 CLI 로 20번 부르면 매번 200~330쪽짜리 PDF 를 새로 열고, 정답 키 표를
  처음부터 다시 훑는다(회차당 수십 초). 한 프로세스 안에서 PDF 를 한 번만 열고 돌린다.

  그리고 모의고사는 **회차 단위로 완결이어야** 쓸모가 있다. 회차별 결손을 그 자리에서
  같이 찍어 준다(audit_mock_extract 와 같은 기준).

산출물 (scripts/dump/)
  mock_lc{권}_t{회차}.json   Part 2·3·4
  mock_rc{권}_t{회차}.json   Part 6·7
  rc_p5_bank{권}.json        Part 5 (회차 전체가 한 파일 — extract_rc_p5.py 가 만든다)

사용
  TOEIC_PDF_ROOT=... python scripts/extract_mock_all.py --vol 1
  TOEIC_PDF_ROOT=... python scripts/extract_mock_all.py --vol 1 --tests 1,2,3 --area LC
"""
import argparse
import io
import json
import os
import sys
import time

import extract_answer_keys as ak
import extract_lc_pdf as lc
import extract_rc_pdf as rc

HERE = os.path.dirname(os.path.abspath(__file__))
DUMP = os.path.join(HERE, "dump")


def dump(obj, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with io.open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def run_lc(vol, tests):
    hae = lc.find_pdfs(vol)["hae"]
    keys_all = ak.answer_keys("LC", str(vol))
    for t in tests:
        pages = lc.part_pages(hae, t)
        if not pages:
            print("  LC TEST %02d — 회차를 못 찾았다" % t)
            continue
        keys = keys_all.get(t, {})
        text_of = lambda p: lc.part_text(hae, pages, p)
        out = {"vol": vol, "test": t}
        out["part1"] = lc.parse_part1(text_of(1), keys) if 1 in pages else []
        out["part2"] = lc.parse_part2(text_of(2), keys) if 2 in pages else []
        out["part3"] = lc.parse_part34(text_of(3), 32, 70, keys) if 3 in pages else []
        out["part4"] = lc.parse_part34(text_of(4), 71, 100, keys) if 4 in pages else []
        n1 = len(out["part1"])
        n2 = len(out["part2"])
        n3 = sum(len(s["questions"]) for s in out["part3"])
        n4 = sum(len(s["questions"]) for s in out["part4"])
        miss = ([n for n in range(1, 7) if n not in {q["no"] for q in out["part1"]}]
                + [n for n in range(7, 32) if n not in {q["no"] for q in out["part2"]}]
                + [n for n in range(32, 101)
                   if n not in {q["no"] for s in out["part3"] + out["part4"] for q in s["questions"]}])
        dump(out, os.path.join(DUMP, "mock_lc%d_t%02d.json" % (vol, t)))
        print("  LC TEST %02d  P1 %d/6 · P2 %2d/25 · P3 %2d/39 · P4 %2d/30   결손 %s"
              % (t, n1, n2, n3, n4, miss or "-"))


def run_rc(vol, tests):
    pdfs = rc.find_pdfs(vol)
    ranges = rc.test_ranges(pdfs["bon"])
    for t in tests:
        rng = ranges.get(t)
        if not rng:
            print("  RC TEST %02d — 회차를 못 찾았다" % t)
            continue
        sets = rc.parse_bon(pdfs["bon"], rng[0], rng[1], None)
        nums = {q["no"] for s in sets for q in s["questions"]}
        hae = rc.parse_hae(pdfs["hae"], nums, t)
        for s in sets:
            for q in s["questions"]:
                q.update(hae.get(q["no"], {}))
                for o in q["options"]:
                    o["correct"] = (o["label"] == q.get("answer"))
        miss = [n for n in range(131, 201) if n not in nums]
        dump(sets, os.path.join(DUMP, "mock_rc%d_t%02d.json" % (vol, t)))
        print("  RC TEST %02d  세트 %2d · 문항 %2d/70   결손 %s" % (t, len(sets), len(nums), miss or "-"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", type=int, default=1, choices=(1, 2))
    ap.add_argument("--tests", help="'1,2,3' 또는 '1-10'. 없으면 1~10 전부")
    ap.add_argument("--area", choices=("LC", "RC"))
    a = ap.parse_args()

    if not a.tests:
        tests = list(range(1, 11))
    elif "-" in a.tests:
        lo, hi = (int(x) for x in a.tests.split("-"))
        tests = list(range(lo, hi + 1))
    else:
        tests = [int(x) for x in a.tests.split(",")]

    t0 = time.time()
    print("vol %d · 회차 %s" % (a.vol, tests))
    if a.area in (None, "LC"):
        run_lc(a.vol, tests)
    if a.area in (None, "RC"):
        run_rc(a.vol, tests)
    print("%.0f초" % (time.time() - t0))


if __name__ == "__main__":
    main()
