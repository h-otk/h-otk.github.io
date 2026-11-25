"""content/ の Markdown と site.json を読み込み、サイトが使うデータ（assets/data/content.json）を作る。

同時に書き間違いのチェックも行い、問題があれば日本語で報告する。
  python3 .github/scripts/build_content.py          # 生成（デプロイ時・手元確認時）
  python3 .github/scripts/build_content.py --check  # チェックのみ（Lint 用）

必要なライブラリ: pip install markdown pyyaml
"""

import hashlib
import json
import os
import re
import sys
from datetime import date, datetime
from pathlib import Path

import markdown
import yaml

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content"
OUTPUT = ROOT / "assets" / "data" / "content.json"
REFERRERS = ("none", "origin", "full")
FRONT_MATTER = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)
IMG_SRC = re.compile(r"(<img\b[^>]*\bsrc=\")([^\"]+)(\")")

errors: list[str] = []
warnings: list[str] = []


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


def is_external(url: str) -> bool:
    return bool(re.match(r"^([a-z]+:|//)", url))


# ── site.json ──────────────────────────────────────────────
def load_site() -> dict:
    path = CONTENT / "site.json"
    text = path.read_text(encoding="utf-8")
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        lines = text.splitlines()
        line = lines[e.lineno - 1].strip() if e.lineno <= len(lines) else ""
        errors.append(
            f"content/site.json の {e.lineno} 行目 {e.colno} 文字目付近で書式エラー: {e.msg}\n"
            f"    → {line}\n"
            "    よくある原因: 項目の間のカンマ忘れ / 最後の項目の後ろの余計なカンマ / \" の閉じ忘れ"
        )
        return {}


def check_site(conf: dict) -> None:
    where = "content/site.json"
    for key in ["site", "theme", "profile"]:
        if key not in conf:
            errors.append(f"{where}: \"{key}\" の項目がありません")
    theme = conf.get("theme", {})
    names = [theme.get("name", "")] + [c.get("name", "") for c in theme.get("choices", [])]
    for name in filter(None, names):
        if not (ROOT / "assets/css/themes" / f"{name}.css").is_file():
            errors.append(f"{where}: テーマ \"{name}\" に対応する assets/css/themes/{name}.css がありません")
    for label, value in [
        ("theme.override.backgroundImage", theme.get("override", {}).get("backgroundImage", "")),
        ("profile.avatar", conf.get("profile", {}).get("avatar", "")),
        ("site.favicon", conf.get("site", {}).get("favicon", "")),
    ]:
        if value and not is_external(value) and not (ROOT / value).is_file():
            errors.append(f"{where}: {label} のファイルが見つかりません -> {value}（大文字・小文字も区別されます）")
    if conf.get("links", {}).get("referrer", "none") not in REFERRERS:
        errors.append(f"{where}: links.referrer は none / origin / full のどれかにしてください")
    if conf.get("assets", {}).get("imageReferrer", "origin") not in REFERRERS:
        errors.append(f"{where}: assets.imageReferrer は none / origin / full のどれかにしてください")
    base = conf.get("assets", {}).get("imageBaseUrl", "")
    if base and not re.match(r"^https://.+/$", base):
        errors.append(f"{where}: assets.imageBaseUrl は https:// で始まり / で終わる URL にしてください -> {base}")
    for i, s in enumerate(conf.get("sns", {}).get("items", []), 1):
        url = s.get("url", "")
        if url and not re.match(r"^(https://|mailto:)", url):
            errors.append(f"{where}: sns の {i} 番目の url は https:// か mailto: で始めてください -> {url}")
        if s.get("referrer") and s["referrer"] not in REFERRERS:
            errors.append(f"{where}: sns の {i} 番目の referrer は none / origin / full のどれかにしてください")
        if not s.get("service") and not s.get("label"):
            errors.append(f"{where}: sns の {i} 番目に service か label を書いてください")
    ga = conf.get("analytics", {}).get("googleAnalyticsId", "")
    if ga and not re.match(r"^G-[A-Z0-9]+$", ga):
        errors.append(f"{where}: analytics.googleAnalyticsId は G-XXXXXXXXXX の形式です -> {ga}")
    g = conf.get("gallery", {})
    if g.get("layout") not in ("", None, "grid", "masonry"):
        errors.append(f"{where}: gallery.layout は grid か masonry（または空欄）にしてください")
    if g.get("style") not in ("", None, "card", "image"):
        errors.append(f"{where}: gallery.style は card か image（または空欄）にしてください")


# ── Markdown ───────────────────────────────────────────────
def read_markdown(path: Path) -> tuple[dict, str]:
    text = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    m = FRONT_MATTER.match(text)
    if not m:
        errors.append(f"{rel(path)}: 先頭に --- で囲んだ設定（タイトルなど）がありません")
        return {}, text
    try:
        meta = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError as e:
        mark = getattr(e, "problem_mark", None)
        line = f" {mark.line + 2} 行目付近" if mark else ""
        errors.append(f"{rel(path)}:{line} 先頭の設定部分の書き方に誤りがあります（「項目名: 値」の形か、: の後ろの半角スペースを確認）")
        return {}, m.group(2)
    if not isinstance(meta, dict):
        errors.append(f"{rel(path)}: 先頭の設定部分は「項目名: 値」の形で書いてください")
        return {}, m.group(2)
    return meta, m.group(2)


def to_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, (date, datetime)):
        return value.strftime("%Y-%m-%d")
    return str(value)


def fill_placeholders(text: str, conf: dict) -> str:
    values = {
        "site.title": conf.get("site", {}).get("title", ""),
        "profile.name": conf.get("profile", {}).get("name", ""),
        "contact.email": conf.get("pages", {}).get("contact", {}).get("email", ""),
    }
    return re.sub(r"\{\{\s*([\w.]+)\s*\}\}", lambda m: values.get(m.group(1), m.group(0)), text)


class Resolver:
    """画像パスを「サイトから見た URL」に変換する（外部サーバ配信・キャッシュバスター対応）。"""

    def __init__(self, conf: dict):
        self.base = conf.get("assets", {}).get("imageBaseUrl", "")

    def __call__(self, value: str, folder: Path, source: Path) -> str:
        if not value or is_external(value):
            return value or ""
        target = (ROOT / value.lstrip("/")) if value.startswith("/") else (folder / value)
        target = target.resolve()
        path = target.relative_to(ROOT).as_posix() if target.is_relative_to(ROOT) else value
        if self.base:
            return self.base + path  # 外部サーバ側にも同じフォルダ構成で置く
        if not target.is_file():
            errors.append(f"{rel(source)}: 画像が見つかりません -> {value}（大文字・小文字も区別されます）")
            return path
        return f"{path}?v={file_hash(target)}"


def render(body: str, conf: dict, folder: Path, source: Path, resolve: Resolver) -> str:
    html = markdown.markdown(
        fill_placeholders(body, conf),
        extensions=["extra", "sane_lists", "nl2br"],
        output_format="html",
    )
    return IMG_SRC.sub(lambda m: m.group(1) + resolve(m.group(2), folder, source) + m.group(3), html)


def as_list(value) -> list[str]:
    if value is None or value == "":
        return []
    if isinstance(value, list):
        return [to_text(v) for v in value if v not in (None, "")]
    return [s.strip() for s in str(value).split(",") if s.strip()]


def build_works(conf: dict, resolve: Resolver) -> list[dict]:
    works = []
    for md in sorted((CONTENT / "works").glob("*/index.md")):
        slug = md.parent.name
        if slug.startswith("_"):  # _template など「_」始まりは見本なので公開しない
            continue
        meta, body = read_markdown(md)
        if not re.match(r"^[a-z0-9][a-z0-9_-]*$", slug):
            errors.append(f"{rel(md.parent)}: フォルダ名は半角小文字・数字・ハイフンにしてください（URL に使われます）")
        if meta.get("draft"):
            continue
        if not meta.get("title"):
            errors.append(f"{rel(md)}: title（作品名）がありません")
        images = [resolve(to_text(v), md.parent, md) for v in as_list(meta.get("images"))]
        image = resolve(to_text(meta.get("image", "")), md.parent, md)
        works.append({
            "slug": slug,
            "title": to_text(meta.get("title")),
            "date": to_text(meta.get("date")),
            "tags": as_list(meta.get("tags")),
            "image": image,
            "thumbnail": resolve(to_text(meta.get("thumbnail", "")), md.parent, md) or image,
            "images": images,
            "summary": to_text(meta.get("summary")),
            "link": to_text(meta.get("link")),
            "order": meta.get("order", 0) if isinstance(meta.get("order", 0), int) else 0,
            "html": render(body, conf, md.parent, md, resolve),
        })
    # order（大きいほど先）→ 日付の新しい順
    works.sort(key=lambda w: (w["order"], w["date"]), reverse=True)
    return works


def build_simple(folder: str, conf: dict, resolve: Resolver) -> list[dict]:
    items = []
    for md in sorted((CONTENT / folder).glob("*.md")):
        if md.name.startswith("_"):
            continue
        meta, body = read_markdown(md)
        if meta.get("draft"):
            continue
        if not meta.get("title"):
            errors.append(f"{rel(md)}: title がありません")
        items.append({
            "slug": md.stem,
            "title": to_text(meta.get("title")),
            "date": to_text(meta.get("date") or meta.get("updated")),
            "html": render(body, conf, md.parent, md, resolve),
        })
    return items


def main() -> int:
    check_only = "--check" in sys.argv
    conf = load_site()
    if conf:
        check_site(conf)
    resolve = Resolver(conf)
    data = {
        "works": build_works(conf, resolve),
        "pages": {p["slug"]: p for p in build_simple("pages", conf, resolve)},
        "news": sorted(build_simple("news", conf, resolve), key=lambda n: n["date"], reverse=True),
    }
    for page in conf.get("pages", {}):
        if not page.startswith("_") and page != "news" and page not in data["pages"]:
            if conf["pages"][page].get("enabled"):
                errors.append(f"content/site.json: pages.{page} が有効ですが content/pages/{page}.md がありません")

    for w in warnings:
        print(f"::warning::{w}")
    for e in errors:
        print(f"::error::{e}")
    if errors:
        return 1
    if not check_only:
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"生成: {rel(OUTPUT)}（作品 {len(data['works'])} / ページ {len(data['pages'])} / お知らせ {len(data['news'])}）")
    else:
        print("コンテンツに問題はありません")
    fix_404_base()
    return 0


def fix_404_base() -> None:
    """404.html は深い階層の URL でも表示されるので、<base> をサイトのルートに合わせる。"""
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not repo or "--check" in sys.argv:
        return
    name = repo.split("/")[-1]
    base = "/" if name.endswith(".github.io") else f"/{name}/"
    page = ROOT / "404.html"
    if page.is_file():
        text = re.sub(r'<base href="[^"]*">', f'<base href="{base}">', page.read_text(encoding="utf-8"))
        page.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
