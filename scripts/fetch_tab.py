"""Fetch only the named tab(s) and splice them into scripts/sheet_dump.json.

Why: the 콘텐츠 시트는 탭이 62개라 fetch_sheet.py 를 통째로 돌리면 분당 60 읽기 한도에 걸려 429 로 죽는다.
batchGet 은 몇 탭을 받아도 읽기 1회다.

Usage: python scripts/fetch_tab.py <spreadsheetId> "탭이름" ["탭이름2" ...]
"""
import json
import os
import sys

from googleapiclient.discovery import build

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fetch_sheet import get_creds  # noqa: E402

DUMP = os.path.join(HERE, "sheet_dump.json")


def creds():
    """OAuth 를 먼저 쓰고, **죽어 있으면 서비스 계정으로 떨어진다.**

    OAuth 토큰(`token_sheets*.json`)은 동의 화면이 '테스트' 상태라 7일마다 만료된다.
    그때마다 이 스크립트가 `invalid_grant` 로 죽어서 대본을 못 받아 왔다(실측 09-04).
    읽기는 서비스 계정으로 충분하다 — 그 계정은 시트에 편집자로 등록돼 있고 만료가 없다.
    (새 문서를 **만드는** 일만 OAuth 몫이다 — 서비스 계정은 제 드라이브 용량이 0이다.)
    """
    try:
        return get_creds()
    except Exception as e:  # noqa: BLE001 — 어떤 이유로 죽든 서비스 계정으로 가면 된다
        print(f"  (OAuth 를 못 썼다: {e} — 서비스 계정으로 간다)")
        from sheet_sa import creds as sa_creds

        return sa_creds()


def main():
    sid = sys.argv[1]
    tabs = sys.argv[2:]
    if not tabs:
        print("탭 이름을 하나 이상 넘길 것")
        return

    service = build("sheets", "v4", credentials=creds())
    res = (
        service.spreadsheets()
        .values()
        .batchGet(spreadsheetId=sid, ranges=[f"'{t}'" for t in tabs])
        .execute()
    )

    with open(DUMP, encoding="utf-8") as f:
        dump = json.load(f)
    by_name = {s["name"]: s for s in dump["sheets"]}

    for tab, vr in zip(tabs, res.get("valueRanges", [])):
        vals = vr.get("values", [])
        if tab in by_name:
            before = len(by_name[tab]["values"])
            by_name[tab]["values"] = vals
        else:
            before = None
            dump["sheets"].append({"name": tab, "values": vals})
        print(f"  - {tab}: {before} -> {len(vals)} rows")

    with open(DUMP, "w", encoding="utf-8") as f:
        json.dump(dump, f, ensure_ascii=False, indent=2)
    print(f"OK -> {DUMP}")


if __name__ == "__main__":
    main()
