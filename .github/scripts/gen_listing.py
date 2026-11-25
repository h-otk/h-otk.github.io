"""指定フォルダに Apache 風のファイル一覧ページ（index.html）を生成する。

GitHub Pages にはフォルダの自動一覧機能がないため、デプロイ時にこのスクリプトで作る。

使い方:
  python3 .github/scripts/gen_listing.py mini-tools
"""

import html
import re
import subprocess
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
JST = timezone(timedelta(hours=9))
MARKER = "<!-- gen_listing.py により自動生成 -->"
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.IGNORECASE | re.DOTALL)


def last_modified(path: Path) -> str:
    """最終コミット日時（取得できなければファイルの更新日時）を返す。"""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%ct", "--", str(path)],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
        ts = int(out) if out else int(path.stat().st_mtime)
    except (subprocess.CalledProcessError, FileNotFoundError, ValueError):
        ts = int(path.stat().st_mtime)
    return datetime.fromtimestamp(ts, JST).strftime("%Y-%m-%d %H:%M")


def human_size(path: Path) -> str:
    if path.is_dir():
        return "-"
    size = path.stat().st_size
    for unit in ["", "K", "M", "G"]:
        if size < 1024 or unit == "G":
            return f"{size:.0f}{unit}" if unit == "" or size >= 10 else f"{size:.1f}{unit}"
        size /= 1024
    return str(size)


def description(path: Path) -> str:
    if path.suffix.lower() != ".html":
        return ""
    m = TITLE_RE.search(path.read_text(encoding="utf-8", errors="ignore"))
    return html.unescape(m.group(1).strip()) if m else ""


def generate(folder: Path) -> None:
    entries = sorted(
        (p for p in folder.iterdir() if p.name != "index.html" and not p.name.startswith(".")),
        key=lambda p: (not p.is_dir(), p.name.lower()),
    )
    rel = "/" + folder.relative_to(ROOT).as_posix() + "/"
    rows = []
    for p in entries:
        name = p.name + ("/" if p.is_dir() else "")
        rows.append(
            "      <tr>"
            f"<td><a href=\"{html.escape(name)}\">{html.escape(name)}</a></td>"
            f"<td>{last_modified(p)}</td>"
            f"<td class=\"r\">{human_size(p)}</td>"
            f"<td>{html.escape(description(p))}</td>"
            "</tr>"
        )
        if p.is_dir():
            generate(p)

    page = f"""<!DOCTYPE html>
{MARKER}
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Index of {html.escape(rel)}</title>
  <style>
    body {{ font-family: monospace, monospace; margin: 1rem; }}
    table {{ border-collapse: collapse; }}
    th, td {{ padding: 0.15rem 1rem 0.15rem 0; text-align: left; vertical-align: top; }}
    th {{ border-bottom: 1px solid #999999; }}
    .r {{ text-align: right; }}
    .wrap {{ overflow-x: auto; }}
    td:first-child {{ white-space: nowrap; }}
    hr {{ border: none; border-top: 1px solid #999999; }}
  </style>
</head>
<body>
  <h1>Index of {html.escape(rel)}</h1>
  <div class="wrap">
  <table>
    <thead><tr><th>Name</th><th>Last modified</th><th class="r">Size</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><a href="../">Parent Directory</a></td><td></td><td class="r">-</td><td></td></tr>
{chr(10).join(rows)}
    </tbody>
  </table>
  </div>
  <hr>
  <address>GitHub Pages (h-otk.github.io)</address>
</body>
</html>
"""
    target = folder / "index.html"
    if target.exists() and MARKER not in target.read_text(encoding="utf-8"):
        print(f"スキップ: {target.relative_to(ROOT)} は手書きの index.html のため上書きしません")
        return
    target.write_text(page, encoding="utf-8")
    print(f"生成: {target.relative_to(ROOT)}（{len(entries)} 件）")


def main() -> int:
    for arg in sys.argv[1:] or ["mini-tools"]:
        folder = ROOT / arg
        if not folder.is_dir():
            print(f"::error::フォルダがありません: {arg}")
            return 1
        generate(folder)
    return 0


if __name__ == "__main__":
    sys.exit(main())
