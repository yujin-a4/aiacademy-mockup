"""Fetch a Google Sheet's cell values via the Sheets API.

**서비스 계정을 먼저 쓴다** (`sheet_sa.py`, 레포 루트 `gcp-vertex-key.json`) — OAuth 토큰은
동의 화면이 "테스트" 라 7일마다 죽는데, 이 덤프는 대본 생성기가 물고 있어 만료되면 파이프라인이
통째로 선다. 키가 없을 때만 예전 OAuth 흐름으로 내려간다(`--oauth` 로 강제할 수도 있다).

Usage: python scripts/fetch_sheet.py <spreadsheetId> [--oauth]
"""
import json
import os
import sys

from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

HERE = os.path.dirname(os.path.abspath(__file__))
CLIENT_SECRET = os.path.join(
    os.path.dirname(HERE),
    "client_secret_643194950870-p9o76hovskobe5cnn68t0uclle1loj76.apps.googleusercontent.com.json",
)
TOKEN = os.path.join(HERE, "token_sheets.json")
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

_args = [a for a in sys.argv[1:] if not a.startswith("-")]
SPREADSHEET_ID = _args[0] if _args else "1OPPgrk3taaC99_1QPvVVT5fIFFxRr9ZxjYaHTs8KUqY"


def get_creds():
    creds = None
    if os.path.exists(TOKEN):
        creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(CLIENT_SECRET, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN, "w") as f:
            f.write(creds.to_json())
    return creds


def sa_creds():
    """서비스 계정 자격. 키가 없으면 None 을 돌려 OAuth 로 내려간다."""
    sys.path.insert(0, HERE)
    try:
        from sheet_sa import KEY, creds as make  # noqa: PLC0415
    except ImportError:
        return None
    return make() if os.path.exists(KEY) else None


def main():
    creds = None if "--oauth" in sys.argv else sa_creds()
    print("자격: " + ("서비스 계정" if creds else "OAuth(7일 만료)"))
    if creds is None:
        creds = get_creds()
    service = build("sheets", "v4", credentials=creds)
    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()

    result = {"title": meta.get("properties", {}).get("title"), "sheets": []}
    for sh in meta.get("sheets", []):
        name = sh.get("properties", {}).get("title")
        rng = f"'{name}'"
        vals = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range=rng)
            .execute()
            .get("values", [])
        )
        result["sheets"].append({"name": name, "values": vals})

    out_path = os.path.join(HERE, "sheet_dump.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"OK: {len(result['sheets'])} tabs -> {out_path}")
    for s in result["sheets"]:
        print(f"  - {s['name']}: {len(s['values'])} rows")


if __name__ == "__main__":
    main()
