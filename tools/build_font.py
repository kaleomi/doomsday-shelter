#!/usr/bin/env python3
"""生成标题字体子集，内嵌成 css/font.css（data URI，双击 index.html 打开时也能用）
只包含标题、日期卡、战斗标题、结局名用到的字，体积很小，且不依赖 Google Fonts（国内访问不稳定）。
字体：Noto Serif CJK SC Black（SIL Open Font License 1.1）。
用法：python3 tools/build_font.py [字体文件路径]
"""
import json, os, subprocess, sys
from fontTools import subset
from fontTools.ttLib import TTCollection, TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else '/usr/share/fonts/opentype/noto/NotoSerifCJK-Black.ttc'
js = r"""
const fs=require('fs'),vm=require('vm');const ctx={window:{},console};ctx.window.window=ctx.window;vm.createContext(ctx);
for (const f of ['js/data/items.js','js/data/world.js','js/data/cast.js','js/data/status.js','js/data/extra.js']) vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const DS=ctx.window.DS;let s='';
DS.ENDINGS.forEach(e=>s+=e.id);Object.values(DS.BATTLES).forEach(b=>s+=b.name);Object.keys(DS.ENEMIES).forEach(k=>s+=k+'头目·');
s+='末日安全屋重生者第天守卫战波挑战完成倒在了春天篇每日VS·/ 0123456789';
process.stdout.write(JSON.stringify(s));
"""
text = json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))
chars = ''.join(sorted(set(text)))
print('glyphs:', len(chars))
if SRC.endswith('.ttc'):
    coll = TTCollection(SRC)
    font = next(f for f in coll.fonts if 'SC' in f['name'].getDebugName(1))
else:
    font = TTFont(SRC)
opts = subset.Options()
opts.flavor = 'woff'
opts.hinting = False
opts.desubroutinize = True
opts.name_IDs = ['*']
opts.notdef_outline = True
sub = subset.Subsetter(opts)
sub.populate(text=chars)
sub.subset(font)
import tempfile
out = os.path.join(tempfile.gettempdir(), 'ds_title.woff')
font.flavor = 'woff'
font.save(out)
print('wrote', out, os.path.getsize(out), 'bytes')

import base64
b64 = base64.b64encode(open(out, 'rb').read()).decode()
css = "/* 由 tools/build_font.py 生成：标题字体子集（Noto Serif CJK SC Black，SIL OFL 1.1） */\n@font-face { font-family: 'DSTitle'; src: url(data:font/woff;base64," + b64 + ") format('woff'); font-weight: 100 900; font-display: swap; }\n"
open(os.path.join(ROOT, 'css', 'font.css'), 'w').write(css)
print('wrote css/font.css', len(css))
