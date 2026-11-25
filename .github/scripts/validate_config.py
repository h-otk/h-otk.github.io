"""config/*.json の書き間違いをチェックする（GitHub Actions の Lint で実行）。

JSON の文法ミス（カンマ忘れ等）、必須項目の抜け、存在しない画像・テーマの指定を
日本語で分かりやすく報告する。
使い方: python3 .github/scripts/validate_config.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
errors: list[str] = []
warnings: list[str] = []


def load(rel: str):
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        line = text.splitlines()[e.lineno - 1] if e.lineno <= len(text.splitlines()) else ""
        errors.append(
            f"{rel} の {e.lineno} 行目 {e.colno} 文字目付近で書式エラー: {e.msg}\n"
            f"    → {line.strip()}\n"
            "    よくある原因: 項目の間のカンマ忘れ / 最後の項目の後ろの余計なカンマ / \" の閉じ忘れ"
        )
        return None


def check_local_file(rel_from: str, value: str, label: str) -> None:
    if not value or re.match(r"^(https?:)?//", value):
        return
    if not (ROOT / value).is_file():
        errors.append(f"{rel_from}: {label} のファイルが見つかりません -> {value}（大文字・小文字も区別されます）")


def check_site(conf) -> None:
    rel = "config/site.json"
    for key in ["site", "theme", "profile"]:
        if key not in conf:
            errors.append(f"{rel}: \"{key}\" の項目がありません")
    theme = conf.get("theme", {})
    names = [theme.get("name", "")] + [c.get("name", "") for c in theme.get("choices", [])]
    for name in filter(None, names):
        if not (ROOT / "themes" / f"{name}.css").is_file():
            errors.append(f"{rel}: テーマ \"{name}\" に対応する themes/{name}.css がありません")
    override = theme.get("override", {})
    check_local_file(rel, override.get("backgroundImage", ""), "theme.override.backgroundImage")
    check_local_file(rel, conf.get("profile", {}).get("avatar", ""), "profile.avatar")
    g = conf.get("gallery", {})
    if g.get("layout") not in ("", None, "grid", "masonry"):
        errors.append(f"{rel}: gallery.layout は grid か masonry（または空欄）にしてください")
    if g.get("style") not in ("", None, "card", "image"):
        errors.append(f"{rel}: gallery.style は card か image（または空欄）にしてください")


def check_works(data) -> None:
    rel = "config/works.json"
    works = data.get("works")
    if not isinstance(works, list):
        errors.append(f"{rel}: \"works\" は [ ] で囲んだリストにしてください")
        return
    for i, w in enumerate(works, 1):
        where = f"{rel}: {i} 番目の作品"
        if not isinstance(w, dict):
            errors.append(f"{where} が {{ }} で囲まれていません")
            continue
        if not w.get("title"):
            errors.append(f"{where} に title（作品名）がありません")
        if not isinstance(w.get("tags", []), list):
            errors.append(f"{where} の tags は [\"A\", \"B\"] の形で書いてください")
        check_local_file(rel, w.get("image", ""), f"{i} 番目の作品の image")
        check_local_file(rel, w.get("thumbnail", ""), f"{i} 番目の作品の thumbnail")
        if w.get("date") and not re.match(r"^\d{4}(-\d{2}(-\d{2})?)?$", w["date"]):
            warnings.append(f"{where} の date は 2026-11-25 の形式がおすすめです（現在: {w['date']}）")


def main() -> int:
    site = load("config/site.json")
    works = load("config/works.json")
    if site is not None:
        check_site(site)
    if works is not None:
        check_works(works)
    for w in warnings:
        print(f"::warning::{w}")
    for e in errors:
        print(f"::error::{e}")
    if not errors:
        print("設定ファイルに問題はありません")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
