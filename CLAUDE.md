# このリポジトリについて

GitHub Pages の個人ポートフォリオサイト。HTML / CSS / JavaScript の静的サイト。
開発場疑義が生じた際は、「Github Pages」を含めて検索し解消。

## 開発ルール

- **main への直接コミット・プッシュ禁止**（ブランチ保護設定済み）
- ブランチ名：`feature/説明` / `fix/説明` / `design/説明`
- 作業完了後は PR を作成し、ユーザーのマージを待つ
- コミットメッセージ・PR 説明は日本語で書く
- Issue がある場合は PR 本文に `Closes #番号` を記載する

## 技術スタック

- HTML / CSS / JavaScript（ビルド不要）
- GitHub Pages で配信

## ファイル構成
PR作成時にファイル構成を調査(treeなど適切なコマンド)し変更を以下に反映

```
.
├── index.html          # トップページ（骨組みのみ。中身は config から生成）
├── works.html          # 作品一覧（フィルタ・ライトボックス）
├── config/
│   ├── site.json       # サイト設定・プロフィール・テーマ指定
│   └── works.json      # 作品データ
├── themes/             # テーマ CSS（minimal / dark / pastel / material）。任意個数追加可
├── static/
│   ├── style.css       # 共通レイアウト（CSS 変数の既定値）
│   ├── site.js         # config を読んで描画・テーマ適用
│   └── versions.js     # キャッシュバスター用ハッシュ表（デプロイ時に自動生成）
├── img/
│   ├── works/          # 作品画像
│   └── bg/             # 背景画像
├── mini-tools/         # 単体ツール HTML（index.html は gen_listing.py で自動生成）
├── robots.txt
├── google*.html        # Search Console 所有権確認
├── .htmlhintrc / .stylelintrc.json  # リンター設定
├── CLAUDE.md           # このファイル
├── README.md           # 編集ガイド（非プログラマ向け）
└── .github/
    ├── ISSUE_TEMPLATE/ # Issue テンプレート
    ├── PULL_REQUEST_TEMPLATE.md
    ├── scripts/
    │   ├── cache_bust.py      # キャッシュバスター & 参照チェック
    │   ├── gen_listing.py     # Apache 風ファイル一覧の生成
    │   └── validate_config.py # config/*.json の検証
    └── workflows/
        ├── deploy.yml     # 一覧生成 → キャッシュバスター → Pages デプロイ
        ├── lint.yml       # HTMLHint / Stylelint / 参照切れ / config 検証
        └── compress.yml   # 画像圧縮
```

### キャッシュバスター

- HTML 内では `?v=0` のままでよい（デプロイ時に `?v=<ファイル内容ハッシュ>` へ自動置換）
- 対象はローカルの CSS / JS / 設定 JSON（HTML・画像・外部 URL は対象外）
- JS から動的に読む `themes/`・`config/` は `static/versions.js` のハッシュ表で対応

### テーマ・設定の仕組み

- 見た目は CSS 変数で定義。共通の既定値は `static/style.css` の `:root`、各テーマは `themes/*.css` で上書き
- ギャラリーの並べ方の既定はテーマ側の `--gallery-layout` / `--gallery-style`、`config/site.json` の `gallery` が優先
- 表示テーマの優先順位: URL `?theme=` > 閲覧者の選択（localStorage）> `site.json` の `theme.name`

## Git 操作の定義

Claude がこのリポジトリで行う作業の各ステップの意味を明確にする。

| 操作 | 実行者 | 意味 |
|------|--------|------|
| ファイルを編集する | Claude | コードを書き換えるだけ。Git はまだ何も知らない |
| `git add` | Claude | 変更をコミット候補として選択（ステージング） |
| `git commit` | Claude | ブランチの履歴にスナップショットとして記録。**サンドボックス内で完結** |
| `git push` | Claude | GitHub のリモートブランチにアップロード。**サンドボックス外に出る** |
| プルリクエスト（PR） | Claude | feature ブランチ → main へのマージ申請。GitHub 上に作成される |
| マージ | **ユーザー** | PR 画面のマージボタンを押す。main が更新され GitHub Pages に公開される |

### ポイント

- コミットだけでは GitHub に何も届かない
- プッシュで GitHub のリモートブランチには届くが、**main はまだ変わらない**
- ユーザーが PR をマージして初めて main に反映され、サイトが更新される
- main への直接プッシュはブランチ保護により禁止されている

---

## Issue 対応の流れ

1. Issue の内容を確認する
2. 作業ブランチを作成する
3. 実装・コミット(tag一覧を取得し適切なタグを付与する必要がある)
4. PR を作成して `Closes #番号` を記載する
5. ユーザーのマージを待つ(確認してmainブランチにマージすることを促す)

---

## テンプレートから新規リポジトリを作成したあとの手動設定

ファイルは自動でコピーされるが、以下は GitHub 上で手動設定が必要なため、ユーザーに促す。
場合によってはステップバイステップで初期設定サポートを行う。

### ① ブランチ保護ルール
```
Settings → Branches → Add branch ruleset
- Branch pattern: main
- Require a pull request before merging ✅
- Block force pushes ✅
- Allowed merge methods: Squash のみ
```

### ② ラベルの整備
```
Issues → Labels
- 不要なデフォルトラベルを削除
- 以下を追加：
  バグ #d73a4a / 新機能 #0075ca / デザイン #7b61ff
  成果物追加 #0e8a16 / コンテンツ #e4a24a
  アイデア #cfd3d7 / 改善 #84b6eb
```

### ③ Projects カンバン
```
リポジトリ → Projects → New project → Board
カラム名：予定 / 進行中 / 完了
Linked repositories にこのリポジトリを追加
```

### ④ Wiki の無効化
```
Settings → General → Features → Wiki のチェックを外す
```

### ⑤ テンプレートリポジトリの有効化（次のテンプレート用）
```
Settings → General → Template repository にチェック
```
