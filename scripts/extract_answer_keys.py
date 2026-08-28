"""교재 해설 PDF의 **정답 키 표**에서 정답 라벨을 뽑는다.

왜 필요한가
  시트 'FGI 파트&문항' R 열('복습용 유사 문항')은 문항코드와 보기 4개만 준다. 정답이 없다.
  정답은 교재가 정본이라 지어내면 안 되고, 해설 PDF 앞머리의 정답 키 표에서 그대로 읽는다.

지면 구조 (네 권 모두 같다 — 실측)
  해설 PDF 앞쪽에 회차별 정답 키 표가 있다:
      TEST 1
      101 (C)   102 (C)   103 (A)   1045(D)   105 (D)
                                    ^^^^
  ⚠️ 4번째 칸의 번호에 **'5' 가 눌어붙어 나온다**(1045 = 104). 조판이 만든 군더더기라
     번호는 앞 3자리(LC 는 1~2자리)만 본다. 안 그러면 그 칸이 통째로 빠진다.

사용
  python scripts/extract_answer_keys.py YBM_RC2_T01_Q104 YBM_LC1_T03_Q001 ...
  python scripts/extract_answer_keys.py --from-sheet    # 시트 R 열의 유사 문항 전부
"""
import json
import os
import re
import sys

import fitz  # PyMuPDF

import _book_paths

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

CODE_RE = re.compile(r"^YBM_(?P<area>LC|RC)(?P<book>\d)_T(?P<test>\d+)_Q(?P<q>\d+)$", re.I)

LABEL_RE = re.compile(r"^(\d*)\(([A-D])\)$")   # '(C)' 또는 번호가 눌어붙은 '45(C)'
NUM_RE = re.compile(r"^\d{1,3}$")
TEST_RE = re.compile(r"TEST\s*(\d+)")

_keys = {}


def grid_of(page, lo, hi):
    """정답표 한 쪽 → {문항번호: 라벨}. 정답표 쪽이 아니면 None.

    **글자 흐름이 아니라 격자 좌표로 읽는다.** 4번째 칸은 번호·군더더기·라벨이 한 토큰으로
    눌어붙어 나온다("45(C)" = 4번 (C), "1045(D)" = 104번 (D)). 그 군더더기 '5' 를 글자로
    가려내려 하면 4번을 45번으로 읽는다 — 실측으로 LC 정답 여러 개가 통째로 어긋났다.
    자리는 거짓말을 하지 않는다: 20줄 × 5칸 격자에서 **몇 줄 몇 칸인가**가 곧 문항 번호다.
    """
    rows = {}
    for x0, y0, _x1, _y1, tk, *_ in page.get_text("words"):
        m = LABEL_RE.match(tk)
        if m:
            rows.setdefault(round(y0, 1), []).append((x0, m.group(2)))

    # 정답표 쪽에는 그 회차 해설도 같이 실려 있어 '(A)' 가 본문에도 널려 있다.
    # 가려내는 표시는 **한 줄에 정확히 5개** — 격자 줄만 그렇고 본문 줄은 그렇지 않다
    # (실측: 한 쪽 라벨 136개 중 5개짜리 줄은 정확히 20줄, 간격도 12.0 으로 일정하다).
    grid = sorted(y for y, v in rows.items() if len(v) == 5)
    need = (hi - lo + 1) // 5
    if len(grid) != need:
        return None
    # 줄 간격이 고른가. 딱 떨어지길 요구하면 안 된다 — 좌표 반올림으로 11.9/12.0 이 섞인다(실측)
    gaps = [b - a for a, b in zip(grid, grid[1:])]
    if max(gaps) - min(gaps) > 0.5:
        return None            # 들쭉날쭉하면 격자가 아니다. 잘못 읽느니 이 쪽을 버린다

    keys = {}
    for r, y in enumerate(grid):
        for c, (_x, lab) in enumerate(sorted(rows[y])):
            keys[lo + r * 5 + c] = lab
    return keys


def answer_keys(area, book):
    """(회차 → {문항번호: 라벨}).

    정답표는 **회차마다 그 회차 해설 앞에** 있다(앞쪽에 몰려 있지 않다) → 전체를 훑는다."""
    if (area, book) not in _keys:
        path = _book_paths.pick(book, area, "해설")
        lo, hi = (1, 100) if area == "LC" else (101, 200)
        doc = fitz.open(path)
        by_test, cur = {}, None
        for i in range(doc.page_count):
            m = TEST_RE.search(doc[i].get_text())
            if m:
                cur = int(m.group(1))
            if cur is None or cur in by_test:
                continue        # 그 회차 정답표는 이미 읽었다 — 뒤의 해설 쪽은 볼 것이 없다
            keys = grid_of(doc[i], lo, hi)
            if keys:
                by_test[cur] = keys
        _keys[(area, book)] = by_test
    return _keys[(area, book)]


def answer_of(code):
    m = CODE_RE.match(code.strip())
    if not m:
        return None, f"코드 형식이 아니다 ({code})"
    area, book = m.group("area").upper(), m.group("book")
    test, q = int(m.group("test")), int(m.group("q"))
    by_test = answer_keys(area, book)
    if test not in by_test:
        return None, f"{area}{book} 에 TEST {test} 정답표가 없다"
    label = by_test[test].get(q)
    if not label:
        return None, f"{area}{book} TEST {test} 에 {q}번이 없다"
    return label, None


def sheet_codes():
    """시트 'FGI 파트&문항' R 열(=17) 첫 줄이 유사 문항 코드다. (원문항코드, 유사코드) 로 돌려준다"""
    dump = json.load(open(os.path.join(HERE, "sheet_dump.json"), encoding="utf-8"))
    rows = next(s for s in dump["sheets"] if s["name"] == "FGI 파트&문항")["values"]
    out = []
    for r in rows:
        if len(r) < 18:
            continue
        src, blob = (r[1] or "").strip(), (r[17] or "").strip()
        if not src.startswith("YBM_") or not blob:
            continue
        sim = blob.splitlines()[0].strip()
        if CODE_RE.match(sim):
            out.append((src, sim))
    return out


def main():
    args = sys.argv[1:]
    pairs = sheet_codes() if "--from-sheet" in args else [(None, a) for a in args]
    if not pairs:
        raise SystemExit(__doc__)
    result = {}
    for src, sim in pairs:
        label, err = answer_of(sim)
        result[sim] = {"answer": label, "from": src, "error": err}
        print(f"  {'✗' if err else '✓'} {sim:22} {label or ''}  {err or ''}"
              + (f"   (← {src})" if src else ""))
    out = os.path.join(HERE, "_answer_keys.json")
    json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\n→ {out}")


if __name__ == "__main__":
    main()
