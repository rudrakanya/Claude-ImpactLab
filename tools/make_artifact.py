"""Produce dist/artifact.html: the app page as body-only HTML with the stylesheet inlined,
for hosts that wrap the page in their own document skeleton (claude.ai Artifacts).
JS modules, data and the vendored QR library are published as supporting files from app/.

Run: python tools/make_artifact.py
"""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(ROOT, "app", "index.html"), encoding="utf-8").read()
css = open(os.path.join(ROOT, "app", "css", "app.css"), encoding="utf-8").read()
body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
title = re.search(r"<title>(.*?)</title>", html).group(1)
desc = re.search(r'<meta name="description" content="(.*?)">', html).group(1)
out = f"""<title>{title}</title>
<meta name="description" content="{desc}">
<style>
{css}
</style>
{body.strip()}
"""
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
p = os.path.join(ROOT, "dist", "artifact.html")
open(p, "w", encoding="utf-8").write(out)
print("wrote", os.path.relpath(p, ROOT), len(out), "bytes")
