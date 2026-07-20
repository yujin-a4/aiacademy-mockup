-- 0009: 보기별 듣기 음원 — question_options.audio_url
--
-- 기존에는 문항당 mp3가 하나뿐이었다(content.audio_url = 보기 A~D 통합 내레이션).
-- 그래서 에이전트가 replay_sentence(index)로 "비 보기만 다시"를 호출해도 A~D 전체가 재생됐다.
-- (대시보드 툴 정의에는 index가 있는데 클라이언트 구현은 파라미터를 무시하고 전체를 틀던 상태)
--
-- 보기 하나만 다시 들려주려면 보기 단위 음원 소스가 있어야 한다.
--   · 통합 mp3에 타임스탬프를 재는 방식은 수작업·부정확 → 채택하지 않음
--   · option_text가 이미 DB에 있으므로 보기별로 TTS를 새로 합성하는 쪽이 정확하고 재생성도 쉽다
--
-- 이 컬럼은 option_text에서 생성되는 "파생물"이다. 시트에는 컬럼을 두지 않는다 —
-- 콘텐츠팀이 보기 텍스트를 고치면 scripts/gen_option_audio.js를 다시 돌려 재생성한다.
-- (통합 음원 content.audio_url은 1차 청취용으로 그대로 유지)

alter table question_options
  add column if not exists audio_url text;

comment on column question_options.audio_url is
  '보기 하나만 재생하는 mp3 경로(/part1/options/<question_code>_<label>.mp3). option_text에서 TTS로 생성되는 파생물 — scripts/gen_option_audio.js';
