# 시트 덤프 두 벌을 견줘 **어느 칸이 달라졌는지** 짚는다.
#   python scripts/_sheet-diff.py <이전덤프.json> "<탭이름>"
import io
import json
import sys

old_path, tab_name = sys.argv[1], sys.argv[2]


def cells(path):
    d = json.load(io.open(path, encoding="utf-8"))
    tab = next((s for s in d["sheets"] if s.get("name") == tab_name), None)
    if not tab:
        return {}
    out = {}
    for i, row in enumerate(tab.get("values") or [], 1):
        for j, c in enumerate(row):
            if isinstance(c, str) and c.strip():
                out[f"{chr(65 + j)}{i}"] = c.strip()
    return out


a, b = cells(old_path), cells("scripts/sheet_dump.json")
added = [k for k in b if k not in a]
gone = [k for k in a if k not in b]
changed = [k for k in b if k in a and a[k] != b[k]]

print(f"바뀐 칸 {len(changed)} · 새 칸 {len(added)} · 사라진 칸 {len(gone)}\n")
for k in sorted(changed, key=lambda x: (int(x[1:]), x[0])):
    print(f"── {k}")
    print(f"   전: {a[k][:150]}")
    print(f"   후: {b[k][:150]}")
for k in sorted(added, key=lambda x: (int(x[1:]), x[0]))[:20]:
    print(f"── {k} (새로 생김)\n   {b[k][:150]}")
for k in sorted(gone, key=lambda x: (int(x[1:]), x[0]))[:20]:
    print(f"── {k} (지워짐)\n   {a[k][:150]}")
