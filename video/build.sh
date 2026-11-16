#!/bin/zsh
# Assembles the pitch video from the recorded clips: 2560x1440 (2K, 16:9), 30 fps, no audio
# (the team narrates live). Code generated with SI assistance (Claude Code).
# Usage: zsh video/build.sh [out|out-en|out-light] [black|white]   (after record_slides.mjs and record_demo.mjs)
set -e
cd "$(dirname "$0")/${1:-out}"
FADE=${2:-black}
ORDER=(title threat flames problem solution demo sources audience close)
: > all.txt
for id in $ORDER; do
  dur=$(awk '/^duration/{s+=$2} END{printf "%.2f", s}' $id.txt)
  out=$(printf "%.2f" $((dur - 0.4)))
  ffmpeg -v error -y -f concat -safe 0 -i $id.txt \
    -vf "fps=30,scale=2560:1440:flags=lanczos,fade=t=in:st=0:d=0.4:color=$FADE,fade=t=out:st=$out:d=0.4:color=$FADE,format=yuv420p" \
    -t $dur -c:v libx264 -preset slow -crf 17 -an clip-$id.mp4
  echo "file 'clip-$id.mp4'" >> all.txt
  echo "$id: ${dur}s"
done
ffmpeg -v error -y -f concat -safe 0 -i all.txt -c copy -movflags +faststart kukulcan-fire-lab-pitch.mp4
ffprobe -v error -show_entries format=duration,size -of default=nw=1 kukulcan-fire-lab-pitch.mp4
