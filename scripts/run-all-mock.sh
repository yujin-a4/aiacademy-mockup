#!/usr/bin/env bash
# 모의고사 회차를 통째로 파이프라인에 태운다 (매핑 → 64k 인코딩 → 사진 → 적재 → 업로드).
#
#   bash scripts/run-all-mock.sh 1:3-10 2:1-10     # 1권 3~10회차, 2권 1~10회차
#   bash scripts/run-all-mock.sh 1:1-1             # 한 회차만
#
# 전부 idempotent 다 — 다시 돌리면 같은 상태가 된다(적재는 upsert, 인코딩은 모노면 건너뛴다,
# 업로드는 덮어쓴다). 그래서 중간에 실패한 회차만 골라 다시 돌려도 된다.
#
# ⚠️ PYTHONIOENCODING=utf-8 이 필요하다. 윈도우 콘솔이 cp949 라 파이썬이 '✓' 를 찍다가 죽는다.
export TOEIC_PDF_ROOT="${TOEIC_PDF_ROOT:-/c/Users/YBM/Documents/YBMMessenger}"
export PYTHONIOENCODING=utf-8
cd "$(dirname "$0")/.."

fail=()
for spec in "$@"; do
  vol="${spec%%:*}"; range="${spec##*:}"
  for t in $(seq "${range%%-*}" "${range##*-}"); do
    tt=$(printf '%02d' "$t"); dir="public/mock/lc${vol}-t${tt}"
    echo; echo "════ ${vol}권 TEST ${t} ════"
    {
      python scripts/map_mock_audio.py --vol "$vol" --test "$t" \
        --copy "$dir" --emit "scripts/dump/audio_lc${vol}_t${tt}.json" &&
      bash scripts/encode-mock-audio.sh "$dir" &&
      python scripts/extract_part1_photos.py --out "$dir" \
        YBM_LC${vol}_T${tt}_Q00{1,2,3,4,5,6} &&
      node scripts/load-mock-test.js --vol "$vol" --test "$t" --go &&
      node scripts/upload-mock-media.mjs --vol "$vol" --test "$t" --go
    } || { echo "✗ ${vol}권 TEST ${t} 실패"; fail+=("${vol}:${t}"); }
  done
done
echo; echo "════ 끝 ════"
if [ ${#fail[@]} -gt 0 ]; then echo "실패한 회차: ${fail[*]}"; else echo "전 회차 성공"; fi
