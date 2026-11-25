"""HTML 内のローカル CSS / JS 参照にキャッシュバスターを付与する。

使い方:
  python3 .github/scripts/cache_bust.py          # ?v=<ファイル内容のハッシュ> に書き換え
  python3 .github/scripts/cache_bust.py --check  # 参照先ファイルの存在確認のみ（書き換えなし）

HTML と画像は対象外。外部 URL（http:// / https:// / //）も対象外。
JS から読み込むテーマ・設定・生成データは assets/js/versions.js にハッシュ表を書き出して対応する。
"""

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXCLUDE_DIRS = {".git", "node_modules"}
DYNAMIC_PATHS = ["assets/css/themes", "assets/data", "assets/img", "content/site.json"]
VERSIONS_JS = ROOT / "assets" / "js" / "versions.js"

# href="xxx.css" / src="xxx.js"（?v=... の有無を問わない）
PATTERN = re.compile(
    r"""(?P<attr>\b(?:href|src)=)(?P<q>["'])(?P<path>[^"'?#]+\.(?:css|js))(?:\?[^"'#]*)?(?P<end>["'])"""
)


def resolve(html_file: Path, ref: str) -> Path | None:
    if ref.startswith(("http://", "https://", "//", "data:")):
        return None
    if ref.startswith("/"):
        return ROOT / ref.lstrip("/")
    return (html_file.parent / ref).resolve()


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


def write_versions_js() -> None:
    """JS から動的に読み込むファイル（テーマ CSS・設定 JSON 等）のハッシュ表を assets/js/versions.js に書き出す。"""
    versions = {}
    for entry in DYNAMIC_PATHS:
        target = ROOT / entry
        paths = [target] if target.is_file() else sorted(target.rglob("*"))
        for path in paths:
            if path.is_file() and path.suffix in {".css", ".js", ".json", ".svg"}:
                versions[path.relative_to(ROOT).as_posix()] = file_hash(path)
    VERSIONS_JS.write_text(
        "// デプロイ時に .github/scripts/cache_bust.py が自動生成します（手で編集しないでください）\n"
        f"window.ASSET_VERSIONS = {json.dumps(versions, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"更新: {VERSIONS_JS.relative_to(ROOT)}（{len(versions)} 件）")


def main() -> int:
    check_only = "--check" in sys.argv
    errors = []

    # versions.js を先に作る（その後 HTML 側の ?v= に versions.js 自体のハッシュが入る）
    if not check_only:
        write_versions_js()

    for html_file in sorted(ROOT.rglob("*.html")):
        if EXCLUDE_DIRS & set(html_file.relative_to(ROOT).parts):
            continue
        text = html_file.read_text(encoding="utf-8")

        def replace(m: re.Match) -> str:
            target = resolve(html_file, m.group("path"))
            if target is None:
                return m.group(0)
            if not target.is_file():
                errors.append(f"{html_file.relative_to(ROOT)}: 参照先が存在しません -> {m.group('path')}")
                return m.group(0)
            return f"{m.group('attr')}{m.group('q')}{m.group('path')}?v={file_hash(target)}{m.group('end')}"

        new_text = PATTERN.sub(replace, text)
        if not check_only and new_text != text:
            html_file.write_text(new_text, encoding="utf-8")
            print(f"更新: {html_file.relative_to(ROOT)}")

    for e in errors:
        print(f"::error::{e}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
