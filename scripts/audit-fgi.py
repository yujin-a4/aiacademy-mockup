"""FGI 시연 2강의 — **시트에 있는 것이 화면에 그대로 들어갔는가** 전수 대조.

시트가 정본이고 사이에 생성기가 끼어 있어서, 조용히 어긋나는 자리가 생긴다(탭 이름·열 이동·
새 블록·표 머리말…). 시트를 고칠 때마다 이걸 돌려 무엇이 빠졌는지 눈으로 본다.

보는 것
  ① 도입      제목·오늘 배울 내용·강사 발화
  ② 대본 턴   발화가 시트 문장 그대로인가 (생성기가 만들어 낸 문장은 없는가)
  ③ 문항      DB 문항(본문·보기·정답)이 시트 'FGI 문항' 과 같은가
  ④ 핵심요약  올라간 것 / 버려진 것

사용: PYTHONIOENCODING=utf-8 python scripts/audit-fgi.py
"""
import json
import os
import re
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def norm(s):
    """대조용 정규화 — 공백·따옴표·붙임표 차이는 무시한다(생성기가 다듬는 부분)."""
    s = (s or '')
    for a, b in (('“', ''), ('”', ''), ('″', ''), ('‘', "'"), ('’', "'")):
        s = s.replace(a, b)
    s = re.sub(r'\s+', '', s)
    s = s.replace('잘했어요', '잘했어요')
    return s.strip()


def sheet_cells(tab):
    d = json.load(open(os.path.join(HERE, 'sheet_dump.json'), encoding='utf-8'))
    rows = next(s for s in d['sheets'] if s['name'] == tab)['values']
    return rows


def all_text(tab):
    """그 탭의 모든 칸을 정규화해 한 덩어리로 — '이 문장이 시트에 있나' 를 보는 데 쓴다."""
    return norm(' '.join(c or '' for r in sheet_cells(tab) for c in r))


def scenario():
    """생성기에서 **직접** 받는다 — 만들어진 .ts 를 다시 파싱하면 조판이 바뀔 때마다 깨진다."""
    out = subprocess.run(['node', os.path.join(HERE, 'build-fgi-scenario.js'), '--json'],
                         capture_output=True, text=True, encoding='utf-8', cwd=ROOT)
    if out.returncode != 0:
        raise SystemExit('생성기 실행 실패: %s' % (out.stderr or '')[:300])
    return json.loads(out.stdout)


TABS = {'yun_daeun': 'FGI_윤다은', 'lee_doyun': 'FGI_이도윤'}

# 화면(TypeLessonPlayer.ACK_OPENER)과 **같은 규칙**이어야 한다. 이걸로 못 잡는 맞장구가 있으면
# 앱이 자기 맞장구를 하나 더 얹어 "잘했어요. 잘했어요. are이 있죠?" 가 나간다(실측).
ACK = re.compile('^(맞\\s*아요|맞\\s*습니다|좋\\s*아요|좋\\s*습니다|좋\\s*네요|그렇\\s*죠|그래\\s*요'
                 '|정확\\s*해요|정확\\s*합니다|잘\\s*했어요|잘\\s*찾았어요|잘\\s*하셨어요'
                 '|완벽\\s*해요|훌륭\\s*해요|바로\\s*그거|네[,\\s])')
# 이쪽은 **넓게** 잡아야 한다 — 좁으면 새 칭찬이 조용히 빠져나간다.
# "잘 찾았어요"(24강 밑줄 턴 7곳)가 '잘\s*했' 에 안 걸려 그대로 겹쳐 나갔다(실측).
LOOKS_ACK = re.compile('^(잘\\s*[했찾하]|정확|완벽|훌륭|좋|맞|그렇|바로\\s*그|네[ ,.]|와|오케|굿|대단)')

bad = 0


def flag(msg):
    global bad
    bad += 1
    print('   ✗', msg)


sc = scenario()
for inst, byCode in sc.items():
    tab = TABS[inst]
    hay = all_text(tab)
    for code, les in byCode.items():
        print('\n== %s · %s  (%s)' % (inst, code, tab))

        # ① 도입
        intro = les.get('intro') or {}
        for para in (intro.get('script') or '').split('\n'):
            if para.strip() and norm(para) not in hay:
                flag('도입 발화가 시트에 없다: %s…' % para[:40])
        for pt in intro.get('points') or []:
            if norm(pt) not in hay:
                flag('오늘 배울 내용이 시트에 없다: %s' % pt)
        print('   도입: 발화 %d문단 · 오늘 배울 내용 %d개'
              % (len((intro.get('script') or '').split('\n')), len(intro.get('points') or [])))

        # ② 대본 턴
        turns = (les.get('turns') or []) + (les.get('review') or [])
        miss = [t for t in turns if norm(t['tutor']) not in hay]
        print('   턴: 수업 %d · 실전 %d' % (len(les.get('turns') or []), len(les.get('review') or [])))
        for t in miss[:6]:
            flag('발화가 시트에 없다 [%s] %s…' % (t.get('stage', ''), t['tutor'][:46]))
        if len(miss) > 6:
            flag('… 그 밖에 %d개' % (len(miss) - 6))

        # 맞장구로 시작하는데 화면 규칙이 못 잡는 발화 — 있으면 강사가 같은 말을 두 번 한다
        for t in turns:
            head = t['tutor'].strip()
            if LOOKS_ACK.match(head) and not ACK.match(head):
                flag('맞장구인데 ACK_OPENER 가 못 잡는다(앱 맞장구와 겹친다): %s…' % head[:30])

        # ④ 핵심요약
        for g in les.get('summary') or []:
            for it in g['items']:
                if norm(it['answer']) not in hay:
                    flag('핵심요약 정답이 시트에 없다: %s' % it['answer'])
            print('   핵심요약 "%s" %d개' % (g['title'] or '(제목 없음)', len(g['items'])))

# ③ 문항 — DB vs 시트 'FGI 문항'
print('\n== 문항 (DB vs 시트 FGI 문항)')
out = subprocess.run(['node', os.path.join(HERE, 'dump-db-questions.js')],
                     capture_output=True, text=True, encoding='utf-8', cwd=ROOT)
if out.returncode != 0:
    flag('DB 문항을 못 읽었다: %s' % (out.stderr or '').strip()[:200])
else:
    db = json.loads(out.stdout)
    qrows = sheet_cells('FGI 문항')
    by_src = {}
    for r in qrows:
        if len(r) > 16 and (r[6] or '').startswith('YBM_'):
            by_src[r[6].strip()] = r
    for q in db:
        src = (q['content'] or {}).get('source_code')
        row = by_src.get(src)
        if not row:
            if (q['content'] or {}).get('stage') != 'review':
                flag('%s: 시트에서 교재코드 %s 를 못 찾았다' % (q['code'], src))
            continue
        want = [norm(row[i]) for i in (11, 12, 13, 14)]
        got = [norm(o['text']) for o in q['options']]
        if want != got:
            flag('%s 보기가 다르다\n        시트 %s\n        DB   %s' % (q['code'], want, got))
        ans = norm(row[15])
        mine = norm(next((o['label'] for o in q['options'] if o['correct']), ''))
        if ans and mine and ans != mine:
            flag('%s 정답이 다르다 — 시트 %s / DB %s' % (q['code'], ans, mine))
    print('   대조한 문항 %d개' % len(db))

print('\n' + ('✅ 어긋난 곳 없음' if not bad else '⚠️  어긋난 곳 %d건 — 위 ✗ 참고' % bad))
