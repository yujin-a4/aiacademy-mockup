"""교재 PDF에서 Part 1 사진을 뽑는다.

왜 필요한가
  Part 1 은 사진이 있어야 화면이 돈다. 콘텐츠 시트는 보기·해설만 주고 사진은 "교재 어디"라는
  문항코드(YBM_LC1_T06_Q001)로만 가리킨다. 그 코드는 우리 DB 코드가 아니라 **교재 좌표**다:
      YBM_LC{권}_T{회차}_Q{문항번호}
  이 스크립트가 그 좌표를 실제 이미지 파일로 바꾼다.

지면 구조 (두 권 모두 같다 — 실측)
  Part 1 안내문("four statements about a picture")이 있는 페이지가 그 회차의 시작이고,
  바로 다음 3장에 사진이 2장씩 실린다:  +1 → 1·2번,  +2 → 3·4번,  +3 → 5·6번
  한 페이지 안에서는 **위에 있는 것이 앞 번호**다(y 좌표로 가른다).

사용
  python scripts/extract_part1_photos.py YBM_LC1_T06_Q001 YBM_LC2_T02_Q005 ...
  python scripts/extract_part1_photos.py --from-sheet          # FGI 문항 탭의 LC 코드 전부
  옵션: --out public/part1/fgi   (기본값)

여러 번 돌려도 안전하다 — 같은 이름으로 덮어쓴다.
"""
import io
import json
import os
import re
import sys

import fitz  # PyMuPDF
from PIL import Image

import _book_paths

DPI = 300   # 교재 사진 원본과 비슷한 픽셀 수가 나오는 값

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

def book_path(book):
    """권 번호 → LC 본권 PDF. 위치는 _book_paths(TOEIC_PDF_ROOT)가 정한다."""
    return _book_paths.pick(book, "LC", "본권")
ANCHOR = "four statements about a picture"   # Part 1 안내문 — 회차 시작을 여는 문장
CODE_RE = re.compile(r"^YBM_LC(?P<book>\d)_T(?P<test>\d+)_Q(?P<q>\d+)$", re.I)

_cache = {}


def part1_starts(book):
    """그 권의 회차별 Part 1 안내 페이지(0-base). 순서가 곧 회차 번호다."""
    if book not in _cache:
        path = book_path(book)
        doc = fitz.open(path)
        starts = [i for i in range(doc.page_count) if ANCHOR in doc[i].get_text()]
        _cache[book] = (doc, starts)
    return _cache[book]


def extract(code, out_dir):
    m = CODE_RE.match(code.strip())
    if not m:
        print(f"  ✗ {code}: 코드 형식이 아니다 (YBM_LC1_T06_Q001 꼴)")
        return None
    book, test, qno = m.group("book"), int(m.group("test")), int(m.group("q"))
    if book not in ("1", "2"):
        print(f"  ✗ {code}: {book}권은 없다")
        return None
    doc, starts = part1_starts(book)
    if not 1 <= test <= len(starts):
        print(f"  ✗ {code}: {book}권에 TEST {test} 가 없다(회차 {len(starts)}개)")
        return None
    if not 1 <= qno <= 6:
        print(f"  ✗ {code}: Part 1 은 1~6번뿐이다")
        return None

    # 1·2번 → 안내 페이지+1, 3·4번 → +2, 5·6번 → +3
    page_no = starts[test - 1] + 1 + (qno - 1) // 2
    page = doc[page_no]

    # 한 페이지에 2장 — 위(y 작은 것)가 앞 번호
    placed = []
    for info in page.get_images(full=True):
        xref = info[0]
        for r in page.get_image_rects(xref):
            placed.append((r.y0, xref, r))
    placed.sort(key=lambda x: x[0])
    if len(placed) < 2:
        print(f"  ✗ {code}: p{page_no + 1} 에서 사진을 2장 못 찾았다({len(placed)}장) — 지면 구조가 다르다")
        return None

    _, xref, rect = placed[(qno - 1) % 2]
    """왜 스트림을 꺼내지 않고 **그 자리를 렌더**하는가 (2026-08-12)

    `doc.extract_image(xref)` 는 PDF 안에 박힌 **원본 바이트를 그대로** 준다. 그런데 그림이
    어떻게 보일지는 그 바이트만으로 정해지지 않는다 — 이미지 객체에 붙은 색공간과 /Decode 를
    같이 봐야 한다. 2권의 Part 1 사진들이 정확히 그런 경우라, 스트림만 꺼내면 **흑백이 뒤집혀**
    나왔다(실측: 원본 페이지와 상관계수 −0.98. 사람 얼굴이 까맣고 머리가 하얬다).
    1권은 DeviceGray 라 멀쩡했고 — 그래서 절반만 깨진 채로 지나갔다.

    페이지를 렌더하면 뷰어가 그리는 경로를 그대로 타므로 색공간·Decode·마스크가 전부 적용된다.
    해상도는 dpi 로 정한다(300dpi = 교재 사진 원본과 비슷한 픽셀 수).
    """
    pix = page.get_pixmap(clip=rect, dpi=DPI)
    name = f"{code.upper()}.jpeg"
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, name)
    # 교재 사진은 흑백이다 — 회색조로 저장하면 화질 그대로 파일만 작아진다
    Image.open(io.BytesIO(pix.tobytes("png"))).convert("L").save(path, "JPEG", quality=88, optimize=True)
    kb = os.path.getsize(path) // 1024
    print(f"  ✓ {code} → {os.path.relpath(path, ROOT)}  {pix.width}x{pix.height} {kb}KB  (p{page_no + 1})")
    return path


def codes_from_sheet():
    """시트 덤프의 'FGI 문항' 탭에서 LC 문항코드를 모은다"""
    dump = os.path.join(HERE, "sheet_dump.json")
    if not os.path.exists(dump):
        raise SystemExit("scripts/sheet_dump.json 이 없다 — fetch_sheet.py 를 먼저 돌릴 것")
    with open(dump, encoding="utf-8") as f:
        tab = next(s for s in json.load(f)["sheets"] if s["name"] == "FGI 문항")
    out = []
    for row in tab["values"]:
        for cell in row or []:
            c = str(cell).strip()
            if CODE_RE.match(c) and c not in out:
                out.append(c)
    return out


def main():
    argv = sys.argv[1:]
    out_dir = os.path.join(ROOT, "public", "part1", "fgi")
    if "--out" in argv:
        i = argv.index("--out")
        out_dir = os.path.join(ROOT, argv[i + 1])
        argv = argv[:i] + argv[i + 2:]        # --out 의 **값**도 빼야 한다.
        #  안 빼면 폴더 경로가 문항 코드로 넘어가 '코드 형식이 아니다' 를 매번 찍는다
    args = [a for a in argv if not a.startswith("--")]

    codes = codes_from_sheet() if "--from-sheet" in sys.argv else args
    if not codes:
        raise SystemExit("뽑을 코드가 없다. 코드를 적거나 --from-sheet 를 쓸 것")

    print(f"사진 {len(codes)}장 → {os.path.relpath(out_dir, ROOT)}")
    done = [p for p in (extract(c, out_dir) for c in codes) if p]
    print(f"\n{len(done)}/{len(codes)}장 저장")


if __name__ == "__main__":
    main()
