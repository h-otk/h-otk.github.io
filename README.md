# h-otk.github.io

https://h-otk.github.io/

個人ポートフォリオサイト（GitHub Pages）。HTML / CSS / JavaScript だけで動き、ビルド作業は不要です。
**文章・作品・見た目の変更は `config/` の JSON ファイルを書き換えるだけ**で行えます。

---

## 1. 作品（Showcase）を追加する

プログラムの知識は不要です。GitHub のブラウザ画面だけで作業できます。

1. **画像をアップロード**
   リポジトリの `img/works/` を開き、「Add file」→「Upload files」で画像を追加。
   ファイル名は半角英数字にしてください（例: `rabbit-2026.jpg`）。大文字・小文字は区別されます。
2. **`config/works.json` を編集**（鉛筆アイコン ✏️ で編集）
   `"works": [` の下にある `{ … }` のまとまりを 1 つ丸ごとコピーし、すぐ下に貼り付けて書き換えます。

   ```json
   {
     "title": "うさぎのイラスト",
     "image": "img/works/rabbit-2026.jpg",
     "description": "春の新作です。\n透明水彩風に仕上げました。",
     "tags": ["イラスト", "オリジナル"],
     "date": "2026-11-25",
     "link": ""
   },
   ```

   | 項目 | 意味 |
   |------|------|
   | `title` | 作品名（必須） |
   | `image` | 画像の場所。`img/works/ファイル名` |
   | `thumbnail` | 一覧用の小さい画像（省略可。重い画像のときに使う） |
   | `description` | 説明文。改行は `\n` |
   | `tags` | 分類。絞り込みボタンにも使われる |
   | `date` / `link` | 制作日 / 関連 URL（空欄 `""` でも可） |

3. **保存は「Create a new branch … and start a pull request」を選ぶ**（main には直接保存できません）。
   PR を作ると自動チェックが走り、書き間違いがあれば **何行目がおかしいか日本語で表示** されます。
   問題なければマージ → 1〜2 分でサイトに反映されます。画像は PR 時に自動で圧縮されます。

> **よくある書き間違い**
> - `}` と `{` の間のカンマ `,` を忘れる
> - いちばん最後の項目の後ろに余計なカンマを付ける
> - `"` を全角の `”` で書いてしまう

絞り込みボタンの並びは `works.json` の `"filters"` で指定します（空 `[]` にするとタグから自動作成）。

## 2. プロフィール・自己紹介を変える

`config/site.json` の `profile`（名前・自己紹介・SNS リンク・アイコン画像）、`about`、`history` を書き換えます。
アイコン画像は `img/` に置いて `"avatar": "img/icon.png"` のように指定します。

### SNS リンク

`config/site.json` の `"sns"` → `"items"` に URL を書くと、プロフィール欄にリンクが表示されます。
`url` を空欄 `""` にすると非表示になります。

```json
{ "service": "x", "url": "https://x.com/あなたのID" },
{ "service": "instagram", "url": "https://www.instagram.com/あなたのID/" },
```

### リファラー（どのページから来たか）を送るかどうか

`config/site.json` の `"links"` → `"referrer"` で、外部リンク（SNS・作品の関連リンク）全体の動作を切り替えます。

| 値 | 動作 |
|----|------|
| `"none"` | 送らない（既定・おすすめ） |
| `"origin"` | `https://h-otk.github.io/` のようにドメインだけ送る |
| `"full"` | ページの URL まで送る |

SNS の項目に `"referrer": "origin"` のように書くと、そのリンクだけ別の設定にできます。

## 3. 見た目（テーマ）を変える

`config/site.json` の `"theme"` → `"name"` を変えるだけで全体の見た目が切り替わります。

| テーマ名 | 見た目 |
|----------|--------|
| `minimal` | 白基調のシンプル（既定） |
| `dark` | 黒基調。作品は画像のみのタイル表示 |
| `pastel` | イラスト向け。丸み・パステル・水玉背景・段組み（Pinterest 風）ギャラリー |
| `material` | Material Design 3 風 |

- URL の末尾に `?theme=pastel` を付けると、設定を変えずに試し見できます。
- `"allowSwitch": true` にすると、閲覧者がページ下部のメニューでテーマを着せ替えられます。
- 一部だけ変えたいときは `"override"` に色（例 `"#e87a90"`）や背景画像（例 `"img/bg/sky.jpg"`）を書きます。
- ギャラリーの並べ方は `"gallery"` の `layout`（`grid` / `masonry`）と `style`（`card` / `image`）で指定できます。

### 新しいテーマを作る

1. `themes/minimal.css` をコピーして `themes/好きな名前.css` を作る
2. 中の色や角丸（`--radius`）、フォント、背景画像（`--bg-image`）を変える
3. `config/site.json` の `"name"` と `"choices"` にその名前を追加

使える変数の一覧は `static/style.css` の先頭にまとまっています。

## 4. Mini Tools（小物置き場）

`mini-tools/` に HTML ファイルを置くと、デプロイ時に Apache 風のファイル一覧ページ（`mini-tools/index.html`）が自動生成されます。
一覧の「Description」には各 HTML の `<title>` が表示されます。

## 5. 手元のパソコンで確認する

JSON を読み込む仕組みのため、HTML をダブルクリックで開くと表示されません。リポジトリのフォルダで次を実行し、
http://localhost:8000/ を開いてください。

```bash
python3 -m http.server 8000
```

## 構成

```
.
├── index.html / works.html   # ページの骨組み（中身は JSON から自動生成）
├── config/
│   ├── site.json             # サイト設定・プロフィール・テーマ指定
│   └── works.json            # 作品一覧
├── themes/                   # 見た目（テーマ）ファイル。好きな数だけ追加可
├── static/
│   ├── style.css             # 共通レイアウト
│   ├── site.js               # JSON を読んで画面を組み立てるスクリプト
│   └── versions.js           # キャッシュバスター用（自動生成）
├── img/
│   ├── works/                # 作品画像
│   └── bg/                   # 背景画像
└── mini-tools/               # 小物ツール置き場（一覧ページは自動生成）
```
