# このリポジトリについて

GitHub Pages の個人ポートフォリオサイト。HTML / CSS / JavaScript の静的サイト。

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

```
.
├── index.html          # メインページ
├── style.css           # スタイルシート
├── CLAUDE.md           # このファイル
└── .github/
    ├── ISSUE_TEMPLATE/ # Issue テンプレート
    └── PULL_REQUEST_TEMPLATE.md
```

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
