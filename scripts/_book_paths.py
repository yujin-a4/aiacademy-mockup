# -*- coding: utf-8 -*-
"""교재 PDF 가 어디 있는지 한 곳에서만 정한다.

왜 필요한가
  추출기들(extract_lc_pdf · extract_rc_pdf · extract_rc_p5 · extract_part1_photos ·
  extract_answer_keys)이 저마다 "레포 루트에 'YBM 실전토익 N 최종 pdf 웹용' 폴더가 있다"고
  가정하고 글롭했다. 실제 교재는 레포 밖(사내 메신저 다운로드 폴더)에 있고, 권에 따라
  폴더가 한 겹 더 중첩돼 있다(2권). 5곳을 각각 고치면 다음에 또 어긋난다.

쓰는 법
  TOEIC_PDF_ROOT 환경변수로 교재가 있는 폴더를 가리킨다. 안 주면 예전처럼 레포 루트를 본다
  — 기존 호출은 그대로 돈다(회귀 없음).

      TOEIC_PDF_ROOT=/c/Users/YBM/Documents/YBMMessenger python scripts/extract_lc_pdf.py --test 1
"""
import glob
import os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

PDF_ROOT = os.environ.get("TOEIC_PDF_ROOT") or REPO


def book_pdfs(vol, area=None):
    """해당 권의 PDF 경로 목록. area('LC'/'RC') 를 주면 그것만 거른다.

    권 폴더가 한 겹 더 중첩된 경우(2권)가 있어 두 깊이를 다 훑는다.
    """
    stem = "YBM 실전토익 %s*pdf*" % vol
    pats = [
        os.path.join(PDF_ROOT, stem, "*.pdf"),
        os.path.join(PDF_ROOT, stem, "*", "*.pdf"),
    ]
    files = sorted({f for p in pats for f in glob.glob(p)})
    if area:
        files = [f for f in files if area in os.path.basename(f)]
    return files


def pick(vol, area, kind):
    """'본권' / '해설' PDF 하나를 집는다. 파일명 흔들림(' (2024)' 유무)에 관계없이."""
    hits = [f for f in book_pdfs(vol, area) if kind in os.path.basename(f)]
    if len(hits) != 1:
        raise SystemExit(
            "%s권 %s %s PDF 를 하나로 못 집었다: %s\n(TOEIC_PDF_ROOT=%s)"
            % (vol, area, kind, hits, PDF_ROOT)
        )
    return hits[0]
