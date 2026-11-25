# h-otk.github.io

https://h-otk.github.io/

GitHub Pages で動くポートフォリオサイトのひな形です。IT 系の作品集にもイラストレーターのポートフォリオにも使えます。
**編集するのは `content/` フォルダの中だけ**です（`assets/` はシステム部分なので通常は触りません）。

---

## フォルダ構成

```
content/                ← ここだけ編集する
├── site.json           サイト設定（名前・SNS・テーマ・ページの公開設定・解析タグなど）
├── works/              作品（1 作品 = 1 フォルダ）
│   ├── _template/      見本（「_」始まりは公開されない）
│   └── 作品名/index.md + 画像
├── pages/              固定ページ（利用規約・プライバシーポリシー・お問い合わせ・ご依頼について）
├── news/               更新履歴（1 件 = 1 ファイル）
└── images/             アイコン・背景などの共通画像
assets/                 ← システム（CSS・JS・ファビコン・代替画像）
admin/                  ← 管理画面（ブラウザから編集する場合）
mini-tools/             ← 別プログラム置き場（サイト本体とは独立）
```

| ページ | URL |
|--------|-----|
| トップ | `index.html` |
| 作品一覧 / 作品ページ | `works.html` / `work.html?id=フォルダ名` |
| 固定ページ | `page.html?id=terms` など |
| 更新履歴 | `news.html` |
| 404 | `404.html`（存在しない URL で自動表示） |

---

## 編集方法は 2 通り

### A. 管理画面から（おすすめ・英語の GitHub 画面を使わない方法）

`https://（サイトのURL）/admin/` を開くと、日本語の項目名で作品・ページ・設定を編集できる画面（[Sveltia CMS](https://github.com/sveltia/sveltia-cms)）が開きます。保存すると GitHub に自動で反映され、1〜2 分でサイトが更新されます。

**初回だけ必要な準備**

1. GitHub で「アクセストークン」を作る（Settings → Developer settings → Personal access tokens → Fine-grained tokens）。対象リポジトリをこのリポジトリだけにし、権限は **Contents: Read and write**。
2. 管理画面で「Sign In Using Access Token」を押してトークンを貼る。
3. main ブランチを保護している場合、管理画面からの保存は拒否されます。**ブランチ保護ルールの Bypass list に自分を追加**するか、保護を外してください。

> 自分のサーバで「GitHub でログイン」ボタンを使いたい場合は、OAuth 中継（例: [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth)）を設置し、`admin/config.yml` の `base_url` に URL を書きます。

### B. ファイルを直接編集

GitHub の画面や手元のエディタで `content/` のファイルを書き換え、PR → マージで反映されます。

---

## 1. 作品を追加する

1. `content/works/_template` フォルダをコピーし、フォルダ名を作品名にする（**半角小文字・数字・ハイフン**。例 `rabbit-2026`）
2. 画像をそのフォルダに入れる
3. `index.md` の先頭（`---` で囲んだ部分）を書き換える

```markdown
---
title: うさぎのイラスト
date: 2026-11-25
tags: [イラスト, オリジナル]
image: main.jpg
summary: 春の新作です
---
ここから下が作品ページの本文。**太字** や ![ラフ](sketch.jpg) が書けます。
```

`draft: true` で非公開、`order: 10` で先頭に固定できます。

## 2. 更新履歴を書く

`content/news/_template.md` をコピーして `2026-12-01-内容.md` のような名前にし、`title`・`date`・本文を書きます。

## 3. 固定ページ（利用規約など）

`content/pages/` の各 `.md` を書き換えます。公開・非公開とフッターへのリンクは `content/site.json` の `pages` で切り替えます。
利用規約・プライバシーポリシー・ご依頼についての文面は **暫定版** です。必ず実態に合わせて見直してください。
本文中の `{{site.title}}` `{{profile.name}}` はサイト名・名前に自動で置き換わります。

## 4. サイト設定（`content/site.json`）

| 項目 | 内容 |
|------|------|
| `site` | サイト名・説明・著作権表示・ファビコン |
| `theme` | テーマ（`minimal` / `dark` / `pastel` / `material`）、閲覧者の切替可否、色の部分上書き |
| `nav` | ヘッダーのメニュー |
| `profile` / `about` / `history` | トップページの自己紹介・スキル・経歴 |
| `sns` | SNS リンク（URL 空欄で非表示） |
| `links.referrer` | 外部リンクでリファラーを送るか（`none` 送らない / `origin` ドメインのみ / `full` URL まで） |
| `gallery` | 作品一覧の並べ方（`grid` / `masonry`）、表示形式（`card` / `image`）、トップの表示件数 |
| `pages` | 各ページの公開設定、お問い合わせフォームの URL・メールアドレス |
| `images.protect` | 右クリック保存・ドラッグの抑止 |
| `assets` | 画像を自分のサーバから配信する設定（下記） |
| `analytics.googleAnalyticsId` | Google アナリティクス 4 の測定 ID（`G-` で始まる）。空欄なら読み込まない |

テーマは URL に `?theme=pastel` を付けると試し見できます。新しいテーマは `assets/css/themes/minimal.css` をコピーして作ります。

---

## 画像の保護・配信について

- **電子透かし**：画像に埋め込んでからアップロードしてください（サイト側では行いません）。利用規約に電子透かしの記載があります。
- **右クリック抑止**：`images.protect: true`。スクリーンショット等は防げないので、あくまで抑止です。
- **キャッシュ**：GitHub Pages では HTTP ヘッダー（`Cache-Control` など）を設定できません。代わりにデプロイ時、画像の URL に内容から計算した `?v=…` を付けるので、差し替えた画像はすぐ反映されます。
- **自分のサーバから配信**：`assets.imageBaseUrl` に `https://example.com/portfolio/` のように書くと、作品画像をそのサーバから読み込みます。サーバには `content/` 以下と同じ構成で画像を置きます。
  - 読み込めないときは GitHub 側の `assets/img/fallback.svg` を表示します。
  - 直リンク防止をリファラーで行う場合は `assets.imageReferrer` を `origin` にしておきます（画像取得時にサイトのドメインだけを送る）。nginx の例：

    ```nginx
    location /portfolio/ {
        valid_referers server_names h-otk.github.io;
        if ($invalid_referer) { return 403; }
    }
    ```

  - `<img>` で読むだけなので CORS 設定は不要です。CSRF も「画像を返すだけ」のサーバなら対象外です（ログインや書き込みのある機能を置く場合に考慮が必要）。

---

## 手元のパソコンで確認する

```bash
pip install markdown pyyaml
python3 .github/scripts/build_content.py   # content/ からサイトデータを作る
python3 -m http.server 8000                # http://localhost:8000/ を開く
```

書き間違いがあると `build_content.py` が日本語で場所を教えてくれます（PR の自動チェックでも同じ内容が出ます）。
