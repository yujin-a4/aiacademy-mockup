# -*- coding: utf-8 -*-
"""LC 음원 파일 → 문항 번호 매핑.

교재 음원은 **이미 문항 단위로 쪼개져 있다.** 강제정렬도 ffmpeg 분할도 필요 없고,
파일명만 읽으면 된다.

    Test 01_Part 1_01.mp3        → 1번            (Part 1·2 는 문항 하나에 파일 하나)
    Test 01_Part 2_07.mp3        → 7번
    Test 01_Part 3_32-34.mp3     → 32·33·34번     (Part 3·4 는 세트 하나에 파일 하나)
    Test 01_Part 4_98-100.mp3    → 98·99·100번

폴더는 5회차씩 묶여 있다:
    YBM TOEIC LC 1000/YBM TOEIC LC 1000 Vol_{권}_T_5-{묶음}/Test {회차}/

쓰는 법
    TOEIC_LC_AUDIO_ROOT 로 음원 최상위 폴더를 가리킨다.
    python scripts/map_mock_audio.py --check          # 20회분 100문항이 다 덮이는지
    python scripts/map_mock_audio.py --vol 1 --test 1 # 매핑 출력
"""
import argparse
import glob
import json
import os
import re
import sys

AUDIO_ROOT = os.environ.get("TOEIC_LC_AUDIO_ROOT") or \
    os.path.expanduser("~/Downloads/YBM TOEIC LC 1000")

# 'Test 01_Part 3_32-34.mp3' / 'Test 01_Part 1_01.mp3'
NAME = re.compile(r"Test\s*(\d+)_Part\s*(\d)_(\d+)(?:-(\d+))?\.mp3$", re.I)

# 교재 음원 파일명의 오타. **원본 파일은 고치지 않는다** — 남의 자료라 손대지 않고 여기서 읽어 준다.
# 둘 다 앞뒤 파일 사이의 자리가 하나로 정해져서 다른 해석이 없다.
#   Vol2 T04 'Part 2_01' : Part 2 는 7번부터다. 1번짜리 Part 2 는 없고, 파일 순서상 _08 바로 앞이다
#   Vol2 T08 'Part 4_84-85': 앞이 80-82, 뒤가 86-88 → 빈 자리는 83-85 뿐이다
FIXUPS = {
    (2, 4, "Test 04_Part 2_01.mp3"): (7, 7),
    (2, 8, "Test 08_Part 4_84-85.mp3"): (83, 85),
}


def test_dir(vol, test):
    """회차 폴더. 묶음(5-1~5-5) 번호를 몰라도 찾도록 글롭한다."""
    pat = os.path.join(AUDIO_ROOT, "*Vol_%d_T_*" % vol, "Test %02d" % test)
    hits = [p for p in glob.glob(pat) if os.path.isdir(p)]
    return hits[0] if len(hits) == 1 else None


def mapping(vol, test):
    """{문항번호: 파일 절대경로}. 없으면 빈 dict."""
    d = test_dir(vol, test)
    if not d:
        return {}
    out = {}
    for f in sorted(os.listdir(d)):
        fix = FIXUPS.get((vol, test, f))
        if fix:
            a, b = fix
        else:
            m = NAME.match(f)
            if not m:
                continue
            a = int(m.group(3))
            b = int(m.group(4)) if m.group(4) else a
        for n in range(a, b + 1):
            out[n] = os.path.join(d, f)
    return out


def check():
    bad = 0
    for vol in (1, 2):
        for t in range(1, 11):
            mp = mapping(vol, t)
            miss = [n for n in range(1, 101) if n not in mp]
            files = len(set(mp.values()))
            flag = "OK " if not miss else "!! "
            print("  %svol%d TEST %02d  파일 %3d · 덮은 문항 %3d/100  결손 %s"
                  % (flag, vol, t, files, 100 - len(miss), miss or "-"))
            bad += len(miss)
    print("\n음원 결손 합계: %d" % bad)
    return bad


def emit(vol, test, out_path, web_prefix):
    """{문항번호: 웹 경로} JSON. 적재기(load-mock-test.js)가 이걸 읽어 content.audio_url 을 채운다.

    파일명 보정(FIXUPS)이 여기 한 곳에만 있으므로, 적재기는 규칙을 다시 구현하지 않는다.
    """
    mp = mapping(vol, test)
    data = {"vol": vol, "test": test, "web_prefix": web_prefix,
            "audio": {str(n): web_prefix + "/" + os.path.basename(mp[n]) for n in sorted(mp)}}
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("→ %s (문항 %d개 · 파일 %d개)" % (out_path, len(mp), len(set(mp.values()))))
    return mp


def copy_to(vol, test, dest):
    """회차 mp3 를 dest 로 복사. 이미 같은 크기면 건너뛴다(다시 돌려도 싸게)."""
    import shutil
    mp = mapping(vol, test)
    os.makedirs(dest, exist_ok=True)
    n = skipped = 0
    for src in sorted(set(mp.values())):
        dst = os.path.join(dest, os.path.basename(src))
        if os.path.exists(dst) and os.path.getsize(dst) == os.path.getsize(src):
            skipped += 1
            continue
        shutil.copy2(src, dst)
        n += 1
    total = sum(os.path.getsize(os.path.join(dest, f)) for f in os.listdir(dest)
                if f.lower().endswith(".mp3"))
    print("→ %s  복사 %d · 건너뜀 %d · 합계 %.0fMB" % (dest, n, skipped, total / 1048576))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", type=int, default=1, choices=(1, 2))
    ap.add_argument("--test", type=int, default=1)
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--emit", help="매핑 JSON 을 쓸 경로")
    ap.add_argument("--copy", help="mp3 를 복사할 폴더 (예: public/mock/lc1-t01)")
    ap.add_argument("--web-prefix", help="브라우저에서 쓸 경로 (예: /mock/lc1-t01)")
    a = ap.parse_args()
    print("AUDIO_ROOT = %s" % AUDIO_ROOT)
    if a.check:
        return 1 if check() else 0
    if a.copy:
        copy_to(a.vol, a.test, a.copy)
    if a.emit:
        prefix = a.web_prefix or "/mock/lc%d-t%02d" % (a.vol, a.test)
        emit(a.vol, a.test, a.emit, prefix)
    if not (a.copy or a.emit):
        mp = mapping(a.vol, a.test)
        for n in sorted(mp):
            print("%3d  %s" % (n, os.path.basename(mp[n])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
