#!/usr/bin/env bash
# 모의고사 LC 음원을 64kbps 모노로 제자리 재인코딩한다.
#
# 왜
#   교재 원본은 128kbps 스테레오 + 파일마다 앨범아트(~140KB)가 박혀 있다. 20회차 전량이 898MB라
#   Supabase Free 스토리지 1GB 의 88% 를 먹는다. 64k 모노 + 아트 제거로 44% 인 ~400MB 가 된다.
#
# 샘플레이트는 44.1kHz 를 **유지한다**. 22050Hz 로 낮추면 11kHz 위가 잘리는데 LC 에는 치찰음
# (s·f·th) 변별을 묻는 문항이 있어 거기서 손해를 본다. 낮추지 않아도 44% 가 나오는 이유는
# 용량의 상당수가 앨범아트였기 때문이다(-vn).
#
#   bash scripts/encode-mock-audio.sh public/mock/lc1-t02
set -euo pipefail
DIR="${1:?사용: bash scripts/encode-mock-audio.sh <폴더>}"
BR="${2:-64k}"
before=$(du -sm "$DIR" | cut -f1)
n=0
for f in "$DIR"/*.mp3; do
  # 이미 모노면 건너뛴다 — 두 번 돌려도 안전하고, 손실 재압축이 겹치지 않는다
  ch=$(ffprobe -v error -select_streams a:0 -show_entries stream=channels -of csv=p=0 "$f")
  if [ "$ch" = "1" ]; then continue; fi
  ffmpeg -v error -y -vn -i "$f" -ac 1 -b:a "$BR" "$f.tmp.mp3"
  mv -f "$f.tmp.mp3" "$f"
  n=$((n+1))
done
after=$(du -sm "$DIR" | cut -f1)
echo "$DIR: ${n}개 인코딩 · ${before}MB → ${after}MB"
