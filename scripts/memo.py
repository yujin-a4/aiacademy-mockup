"""'FGI 구현 중 메모' 탭 = 콘텐츠 파트 버그·개선 접수 창구. 읽고, 처리 결과를 되적는다.

서비스 계정으로 돈다(`sheet_sa.py` 참고) — 사람 로그인도, 7일 만료도 없다.

  python scripts/memo.py list           # 열린 건만 (유형 있고 J 가 완료가 아닌 행)
  python scripts/memo.py list --all     # 전부
  python scripts/memo.py show 23        # 한 행을 통째로
  python scripts/memo.py done 23 "반영 후 확인 중" "왜 고쳤는지 (PR #159)"

칸 배치 (08-26 다시 실측): A 구분 · B LC/RC · C 작성자 · D 날짜 · E 유형 · F 현재 상태 ·
G 논의 필요 내용 · H 보충 · **I 회신(콘텐츠 파트)** · **J 수정 여부(드롭다운)** · **K 메모** · L 여분.

⚠️ **H·I 는 머리말이 비어 있다.** 그래서 08-24 실측 때 빠뜨렸다. I 는 콘텐츠 파트가 답을
적는 칸이라 **결정·재요청·신규 제보가 거기 들어온다.** 안 읽으면 다 처리한 줄 알게 된다.
🔴 **셀에 띄워 넣은 사진은 어느 칸이든 API 로 안 읽힌다** — 값이 아니라 오버레이다.

⚠️ K 는 **콘텐츠 파트와 같이 쓰는 칸**이다 — 그쪽이 '확인 완료' 를 K 에 적는다.
그래서 `done` 은 K 를 덮어쓰지 않고 **줄을 바꿔 이어 붙인다**(`--replace` 로만 덮어쓴다).
"""
import argparse
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sheet_sa import ALIAS, read, write  # noqa: E402

SID = ALIAS["콘텐츠"]
TAB = "FGI 구현 중 메모"

# J 열 드롭다운 — 이 여섯 개 말고는 못 쓴다 (아무 글자나 넣으면 셀이 경고 표시가 된다)
J_VALUES = ["수정 중", "반영 후 확인 중", "반영 완료", "반영 완료(수정 없음)", "일부 반영", "실패"]
DONE = {"반영 완료", "반영 완료(수정 없음)"}

# ⚠️ H·I 는 **머리말이 비어 있다.** 08-24 실측 때 그래서 통째로 빠뜨렸고, 08-26 에 41행의
# 콘텐츠 파트 회신을 못 본 채로 처리할 뻔했다. 제목이 없다고 빈 칸이 아니다 — I 는 양쪽이
# 주고받는 **대화 칸**이라 결정도 신규 제보도 여기 들어온다. 반드시 같이 읽는다.
COL = {"구분": 0, "LC/RC": 1, "작성자": 2, "날짜": 3, "유형": 4,
       "현재 상태": 5, "논의 필요 내용": 6, "보충": 7, "회신(콘텐츠 파트)": 8,
       "수정 여부": 9, "메모": 10}


def rows():
    """(행번호, 칸리스트) 목록. 머리말 1행은 뺀다."""
    vals = read(SID, f"'{TAB}'")
    return [(i, r) for i, r in enumerate(vals[1:], start=2)]


def get(row, key):
    i = COL[key]
    return row[i].strip() if len(row) > i and row[i] else ""


def is_open(row):
    return bool(get(row, "유형")) and get(row, "수정 여부") not in DONE


def one_line(s, n):
    return s.replace("\n", " ⏎ ")[:n]


def cmd_list(args):
    picked = [(n, r) for n, r in rows() if args.all or is_open(r)]
    for n, r in picked:
        j = get(r, "수정 여부") or "―"
        note = get(r, "메모")
        reply = get(r, "회신(콘텐츠 파트)")
        print(f"{n:>3} | {get(r,'유형'):<6} | {j:<12} | {one_line(get(r,'현재 상태'), 64)}")
        if reply:
            print(f"    └ 💬 회신: {one_line(reply, 60)}")
        if note:
            print(f"    └ 메모: {one_line(note, 60)}")
    print(f"\n{len(picked)}건" + ("" if args.all else " 열려 있다"))


def cmd_show(args):
    for n, r in rows():
        if n != args.row:
            continue
        print(f"── {n}행 ──")
        for key in COL:
            v = get(r, key)
            if v:
                print(f"{key}: {v}")
        return
    sys.exit(f"{args.row}행이 없다")


def cmd_done(args):
    if args.status not in J_VALUES:
        sys.exit("수정 여부는 드롭다운 값이어야 한다: " + " · ".join(J_VALUES))
    row = next((r for n, r in rows() if n == args.row), None)
    if row is None:
        sys.exit(f"{args.row}행이 없다")

    write(SID, f"'{TAB}'!J{args.row}", args.status)
    if args.note:
        old = get(row, "메모")
        note = args.note if (args.replace or not old) else old + "\n" + args.note
        write(SID, f"'{TAB}'!K{args.row}", note)
        if old and not args.replace:
            print(f"  (K 에 이미 있던 '{one_line(old, 20)}' 아래로 이어 붙였다)")
    # 무엇에 썼는지 되읽어 보여준다. **행 번호는 밀린다** — 콘텐츠 파트가 중간에 줄을 끼워
    # 넣으면 아까 `list` 로 본 65행이 지금은 다른 건이다. 실제로 그렇게 엉뚱한 두 행에 적은
    # 적이 있다(2026-08-25). 사람이 눈으로 대조할 수 있게 현재 상태를 같이 찍는다.
    print(f"{args.row}행 → {args.status}")
    print(f"  ↳ [{get(row, '유형')}] {one_line(get(row, '현재 상태'), 60)}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("list", help="열린 건 목록")
    p.add_argument("--all", action="store_true")
    p.set_defaults(func=cmd_list)

    p = sub.add_parser("show", help="한 행 전체")
    p.add_argument("row", type=int)
    p.set_defaults(func=cmd_show)

    p = sub.add_parser("done", help="수정 여부·메모 되적기")
    p.add_argument("row", type=int)
    p.add_argument("status", help=" / ".join(J_VALUES))
    p.add_argument("note", nargs="?", default="")
    p.add_argument("--replace", action="store_true", help="K 를 이어 붙이지 말고 덮어쓴다")
    p.set_defaults(func=cmd_done)

    args = ap.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
