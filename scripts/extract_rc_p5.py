# -*- coding: utf-8 -*-
"""RC1000 본권+해설에서 Part5(문항 101~130) 문법문항을 추출·조인.
   출력: scripts/dump/rc_p5_bank{권}.json  +  라벨 빈도 리포트.

   사용: python scripts/extract_rc_p5.py [--vol 1|2]
   1권과 2권은 파일명 규칙이 다르다(1권만 뒤에 ' (2024)'가 붙는다).
"""
import fitz, io, re, json, os, sys
import _book_paths
VOL = 2 if '--vol' in sys.argv and sys.argv[sys.argv.index('--vol') + 1] == '2' else 1

BOOK = fitz.open(_book_paths.pick(VOL, 'RC', '본권'))
SOL  = fitz.open(_book_paths.pick(VOL, 'RC', '해설'))
SUFFIX = '' if VOL == 1 else str(VOL)

def norm(s):
    return re.sub(r'[ \t]+',' ', s.replace('\u2019',"'").replace('\u2018',"'")
                  .replace('\u201c','"').replace('\u201d','"').replace('\u2013','-').replace('\u2014','-')).strip()

# ---------- 본권: (test,qnum) -> {sentence, opts{A..D}} ----------
book_q = {}
cur_test = None
for p in range(BOOK.page_count):
    t = BOOK[p].get_text()
    # 페이지 상단 러닝헤더/타이틀에서 테스트 감지
    for m in re.finditer(r'TEST\s+(\d{1,2})', t):
        cur_test = int(m.group(1))
        break
    if cur_test is None:
        continue
    # 문항 블록 파싱: "NNN. sentence (A) .. (B) .. (C) .. (D) .."
    # 탭/개행 정규화
    lines = t.split('\n')
    # 재조립: 번호로 split
    joined = '\n'.join(lines)
    # 각 문항: 시작 "\n101." ... 다음 문항 번호 전까지
    for m in re.finditer(r'(?:^|\n)\s*(\d{3})\.\s*(.*?)(?=\n\s*\d{3}\.\s|\nGO ON|\nPART 6|\Z)', joined, re.S):
        num = int(m.group(1))
        if not (101 <= num <= 130):
            continue
        body = m.group(2)
        om = re.search(r'\(A\)(.*?)\(B\)(.*?)\(C\)(.*?)\(D\)(.*?)$', body, re.S)
        if not om:
            continue
        sent = norm(body[:om.start()])
        opts = {L: norm(x) for L, x in zip('ABCD', om.groups())}
        # 보기 텍스트 뒤에 남는 잡텍스트 제거(줄바꿈 이후 첫 토큰군만) — 이미 $ 앵커라 대체로 OK
        book_q[(cur_test, num)] = {'sentence': sent, 'opts': opts}

def split_solution(body):
    """해설 한 덩이 → {translation, explanation, vocab}.

    교재 해설은 `번역 \x07…  해설 \x07…  어휘 \x07…` 세 도막이 이어 붙어 온다.
    (\x07 은 라벨과 본문을 가르는 조판 글리프다 — 화면에 그대로 뿌리면 네모로 보인다.)
    통째로 두면 '번역'을 보기 싫은 사람에게도 정답이 한글로 먼저 읽혀 버린다. 나눠 둔다.

    줄바꿈은 PDF 가 폭에 맞춰 접은 것이라 뜻이 없다. **앞뒤에 공백이 있었으면 한 칸으로,
    없었으면 그냥 붙인다** — 한글은 단어 중간에서도 접히기 때문에 무조건 공백을 넣으면
    '소유격 대명사 (C) his 가 정답이다' 처럼 조사가 떨어진다.
    """
    if not body:
        return {'translation': '', 'explanation': '', 'vocab': ''}

    def unwrap(t):
        t = re.sub(r'\s*\n\s*', lambda m: ' ' if ' ' in m.group(0) or '\t' in m.group(0) else '', t)
        t = t.replace('\u2003', ' · ')          # 어휘 항목 사이 EM SPACE
        return re.sub(r'[ \t]{2,}', ' ', t).strip()

    out = {'translation': '', 'explanation': '', 'vocab': ''}
    # 2권은 '번역' 대신 '해석' 을 쓰고 라벨 뒤 BEL 도 없다. 게다가 앞 문장에 붙어 온다('…이다.어휘 wipe off').
    KEY = {'번역': 'translation', '해석': 'translation', '해설': 'explanation', '어휘': 'vocab'}
    parts = re.split(r'(?:^|(?<=[\s.]))(번역|해석|해설|어휘)[\x07\s]\s*', body)
    if len(parts) == 1:
        # 라벨이 없는 판(2권 일부) — 통째로 해설로 본다
        out['explanation'] = unwrap(body.replace('\x07', ' '))
        return out
    for i in range(1, len(parts) - 1, 2):
        out[KEY[parts[i]]] = unwrap(parts[i + 1].replace('\x07', ' '))
    return out


# ---------- 해설: (test,qnum) -> {answer, label, translation, explanation} ----------
sol_ans = {}   # (test,num)->letter
sol_exp = {}   # (test,num)->{label, body}
cur_test = None
for p in range(SOL.page_count):
    t = SOL[p].get_text()
    tm = re.search(r'\bTEST\s+(\d{1,2})\b', t)
    if tm:
        cur_test = int(tm.group(1))
    # 정답표: "101 (A)". 2권은 5번째 칸마다 잡숫자가 낀다 — TEST 1 은 "1045(D)", 2회차부터는
    # "104 5(C)" 로 자리가 달라진다. 번호와 (X) 사이의 숫자 하나를 어느 쪽이든 흘려보낸다.
    for m in re.finditer(r'(?<!\d)(\d{3})\s*\d?\s*\(([A-D])\)', t):
        n = int(m.group(1))
        if 101 <= n <= 200 and cur_test:
            sol_ans[(cur_test, n)] = m.group(2)
    # PART5 해설 블록: "NNN  라벨\n...본문..."
    #   1권은 "101  명사 자리_ …", 2권은 앞에 공백이 붙고 탭으로 갈린다(" 108\t 동사의 태").
    #   라벨에 **한글이 있어야** 문항 머리로 본다 — 그래야 정답표 줄("101\t(C)")을 머리로 착각하지 않는다.
    # 1권은 번호와 라벨을 EN SPACE(U+2002)로, 2권은 탭으로 가른다 → 줄바꿈 아닌 공백을 전부 받는다
    HEAD = r'[^\S\n]*(\d{3})[^\S\n]+([^\n]*[가-힣][^\n]*)'
    if 'PART 5' in t or re.search(r'\n' + HEAD, t):
        for m in re.finditer(rf'(?:^|\n){HEAD}\n(.*?)(?=\n{HEAD}\n|\nPART 6|\Z)', t, re.S):
            n = int(m.group(1))
            if 101 <= n <= 130 and cur_test:
                sol_exp[(cur_test, n)] = {'label': norm(m.group(2)), 'body': norm(m.group(3))}

# ---------- 조인 ----------
bank = []
for key in sorted(set(book_q) & set(sol_exp)):
    test, num = key
    b = book_q[key]; e = sol_exp[key]
    ans = sol_ans.get(key)
    bank.append({
        'test': test, 'num': num, 'answer': ans,
        'label': e['label'], 'sentence': b['sentence'], 'opts': b['opts'],
        **split_solution(e['body']),
    })

os.makedirs('scripts/dump', exist_ok=True)
for x in bank:
    x['vol'] = VOL
with io.open(f'scripts/dump/rc_p5_bank{SUFFIX}.json','w',encoding='utf-8') as f:
    json.dump(bank, f, ensure_ascii=False, indent=1)

# 라벨 빈도(첫 토큰 기준)
from collections import Counter
c = Counter(x['label'].split('_')[0].strip() for x in bank)
rep = [f"총 문항(조인 성공): {len(bank)}  / 본권 {len(book_q)}  해설 {len(sol_exp)}  정답 {len(sol_ans)}"]
rep.append("\n라벨 빈도(앞부분):")
for lab, n in c.most_common():
    rep.append(f"  {n:3d}  {lab}")
with io.open(f"scripts/dump/rc_p5_report{SUFFIX}.txt","w",encoding="utf-8") as f:
    f.write("\n".join(rep))
print("done", len(bank))
