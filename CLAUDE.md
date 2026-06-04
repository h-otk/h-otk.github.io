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

## Issue 対応の流れ

1. Issue の内容を確認する
2. 作業ブランチを作成する
3. 実装・コミット
4. PR を作成して `Closes #番号` を記載する
5. ユーザーのマージを待つ
