# 이 페이지에 실제로 쓰인 글자만 Pretendard에서 서브셋 → woff2 → base64로 @font-face 주입
import base64, io, re, sys
from fontTools.subset import Subsetter, Options
from fontTools.ttLib import TTFont

DEFAULT = r"C:\Users\YBM\AppData\Local\Temp\claude\C--Users-YBM-Desktop-aiacademy-mockup\c9b02238-458c-495c-bd2e-f37d7cdbe9aa\scratchpad\persona-quadrant.html"
HTML = sys.argv[1] if len(sys.argv) > 1 else DEFAULT
TTF  = r"C:\Users\YBM\Desktop\aiacademy-mockup\public\fonts\PretendardVariable.ttf"

src = open(HTML, encoding="utf-8").read()

# 재실행 가능하도록: 이미 심어둔 @font-face가 있으면 걷어내고 placeholder를 되돌린다
src, n = re.subn(r"@font-face\{font-family:'Pretendard Variable';.*?font-display:swap\}",
                 "/*__FONTFACE__*/", src, flags=re.S)
if n:
    print(f"기존 @font-face {n}개 제거 후 재주입")
if "/*__FONTFACE__*/" not in src:
    sys.exit("placeholder 없음 — 파일 구조가 다름")

# 페이지에 등장하는 모든 문자 + 여유분(숫자/영문/기본 기호)
chars = {c for c in src if c.isprintable() and not c.isspace()}
chars |= set("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
chars |= set(".,:;!?()[]{}<>/\\|-–—_'\"“”‘’·…%&+=*#@~^$")
text = "".join(sorted(chars))
print(f"고유 글자 {len(chars)}자")

font = TTFont(TTF)
opts = Options()
opts.layout_features = ["kern", "liga", "calt", "ss01"]
opts.drop_tables += ["DSIG"]
opts.name_IDs = ["*"]
opts.notdef_outline = True
opts.recalc_bounds = True
sub = Subsetter(options=opts)
sub.populate(text=text)
sub.subset(font)

font.flavor = "woff2"
buf = io.BytesIO()
font.save(buf)
raw = buf.getvalue()
print(f"서브셋 woff2 {len(raw)/1024:.0f} KB")

b64 = base64.b64encode(raw).decode("ascii")
face = (
    "@font-face{font-family:'Pretendard Variable';"
    "src:url(data:font/woff2;base64," + b64 + ") format('woff2-variations');"
    "font-weight:100 900;font-style:normal;font-display:swap}"
)
open(HTML, "w", encoding="utf-8").write(src.replace("/*__FONTFACE__*/", face))
print(f"주입 완료 · HTML {len(src.replace('/*__FONTFACE__*/', face))/1024/1024:.2f} MB")
