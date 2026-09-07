#!/usr/bin/env bash
# mp3 앞뒤 여백. 뒤여백은 **파일을 뒤집어** 앞여백처럼 재면 확실하다(silencedetect 는 끝 무음을 안 닫는다).
lead() { ffmpeg -hide_banner -i "$1" $2 -af "silencedetect=noise=-45dB:d=0.03" -f null - 2>&1 \
  | grep -m1 "silence_end" | sed -E 's/.*silence_end: ([0-9.]+).*/\1/'; }
printf "%-34s %7s %9s %9s\n" "파일" "길이" "앞여백" "뒤여백"
for f in "$@"; do
  dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  h=$(lead "$f"); t=$(lead "$f" "-af areverse" )
  # areverse 를 옵션으로 못 넘기므로 따로 돌린다
  t=$(ffmpeg -hide_banner -i "$f" -af "areverse,silencedetect=noise=-45dB:d=0.03" -f null - 2>&1 \
      | grep -m1 "silence_end" | sed -E 's/.*silence_end: ([0-9.]+).*/\1/')
  # 맨 앞이 소리로 시작하면 silence_end 가 없다 → 여백 0
  hs=$(ffmpeg -hide_banner -i "$f" -af "silencedetect=noise=-45dB:d=0.03" -f null - 2>&1 | grep -m1 -c "silence_start: 0")
  [ "$hs" = "0" ] && h=0
  ts=$(ffmpeg -hide_banner -i "$f" -af "areverse,silencedetect=noise=-45dB:d=0.03" -f null - 2>&1 | grep -m1 -c "silence_start: 0")
  [ "$ts" = "0" ] && t=0
  printf "%-34s %7.2f %9.3f %9.3f\n" "$(basename "$f")" "$dur" "${h:-0}" "${t:-0}"
done
