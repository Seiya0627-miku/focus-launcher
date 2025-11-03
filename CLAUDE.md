# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Focus Launcherは、研究用PC向けのChrome拡張機能（Manifest V3）です。ユーザーが作業目的を入力すると、AIがその目的に最適化されたホーム画面とツールを生成し、集中作業をサポートします。実験データの収集・分析機能を備えた研究プロジェクトです。

## コマンド

このプロジェクトにはビルド・テストコマンドはありません。開発は以下の手順で行います：

1. **開発環境での読み込み**
   - Chrome拡張機能ページ（`chrome://extensions/`）を開く
   - 「開発者モード」を有効化
   - 「パッケージ化されていない拡張機能を読み込む」でプロジェクトディレクトリを選択

2. **変更の反映**
   - JavaScript/CSS/HTML変更後：拡張機能ページで「更新」ボタンをクリック
   - Background script（background.js）変更後：拡張機能の再読み込みが必要
   - 新しいタブページ変更後：既存タブを閉じて新しいタブを開く

3. **デバッグ**
   - Background script：`chrome://extensions/` → 「Service Worker」をクリック → DevToolsが開く
   - New tab page：新しいタブを開いてF12 → DevTools
   - Popup：拡張機能アイコンを右クリック → 「ポップアップを検証」

## アーキテクチャ

### ワークフローの状態管理

拡張機能全体は「ワークフロー」という概念を中心に設計されています：

1. **ワークフロー開始**（newtab.js）
   - ユーザーが作業目的を入力
   - Gemini APIを呼び出してホーム画面を生成
   - `chrome.storage.local`に`currentWorkflow`として保存

2. **ワークフロー継続**
   - 新しいタブを開くたびに既存の`currentWorkflow`をチェック
   - 存在する場合は同じホーム画面を表示
   - ページ訪問履歴を`currentWorkflowVisitedPages`に記録

3. **ワークフロー終了**（reflection.js）
   - 「ワークフローを終了」ボタンまたはブラウザ終了
   - 振り返り画面で訪問ページを評価
   - 統一ログを`logs`配列に保存
   - `currentWorkflow`と`currentWorkflowVisitedPages`をクリア

### 主要コンポーネント

**background.js（Service Worker）**
- 拡張機能のライフサイクル管理
- メッセージパッシング（各画面からの要求処理）
- アイドル検知（1時間放置で意図再確認ポップアップ表示）
- 実験ID生成とデータリセット

**newtab.js（メインロジック - FocusLauncherクラス）**
- ワークフローの開始・継続・終了
- Gemini API呼び出し（ホーム画面生成と修正要求処理）
- ページ訪問トラッキング
- 初回利用者の判定と同意画面表示
- 意図再確認オーバーレイ表示

**popup.js（ツールバーポップアップ）**
- ワークフロー状態の表示
- 現在のページをブックマーク（`bookmarks`配列に保存）
- 実験データのエクスポート（JSON形式）
- データリセット機能

**reflection.js（振り返り画面）**
- 訪問ページ一覧表示
- ページ評価（0:後悔なし 1:後悔あり）
- 統一ログの作成と保存

**consent-screen.js（初回同意画面）**
- 実験参加の同意取得
- 実験ID生成と表示

**config.js（設定ファイル）**
- Gemini API設定（APIキー、エンドポイント）
- プロンプトテンプレート
- デフォルトアクション（APIフォールバック用）

### データ構造（chrome.storage.local）

```javascript
{
  // 実験管理
  experimentId: "EXP123456ABC",
  consentGiven: true,
  firstUsedAt: "2025-01-15T10:30:00Z",

  // 現在のワークフロー
  currentWorkflow: {
    text: "研究計画書を書いて、関連文献を調べる",
    timestamp: 1705315800000,
    aiContent: {
      title: "研究作業のサポート",
      content: "<h3>研究計画書の作成をサポートします</h3>...",
      actions: [
        { title: "Google Scholar", description: "学術論文検索", url: "https://scholar.google.com", icon: "📚" }
      ]
    },
    feedback: "Google Docsを追加して",
    fixRequests: [
      { text: "Google Docsを追加して", timestamp: 1705315900000 }
    ],
    purposeChecks: [
      { text: "論文を広く調べる", isSamePurpose: false, timestamp: 1705316000000 }
    ]
  },

  // ページ訪問履歴（現在のワークフロー）
  currentWorkflowVisitedPages: [
    { title: "Google Scholar", url: "https://scholar.google.com", timestamp: 1705315850000 }
  ],

  // ブックマーク
  bookmarks: [
    { id: "bookmark_1705315900000", url: "https://...", title: "...", purpose: "研究計画書...", createdAt: "2025-01-15T10:35:00Z" }
  ],

  // ログ（統一ログ配列）
  logs: [
    {
      workflowText: "研究計画書を書いて、関連文献を調べる",
      startTime: 1705315800000,
      reflectionTime: 1705318400000,
      endTime: 1705318500000,
      fixRequests: [...],
      purposeChecks: [...],
      pageEvaluations: [
        { evaluation: 1, timestamp: 1705315850000 }
      ]
    }
  ],

  // アイドル監視
  waitingForConfirmation: false
}
```

### Gemini API統合

**ホーム画面生成**（newtab.js:667-711）
- `generateHomeScreen()`でプロンプト作成（ブックマーク情報を含む）
- `callGeminiAPI()`でAPI呼び出し
- レスポンスはJSON形式（title, content, actions）
- 失敗時は`generateMockAIResponse()`でローカルフォールバック

**修正要求処理**（newtab.js:231-284）
- ユーザーがホーム画面下部から修正要求を入力
- `processFeedbackWithAI()`で既存ワークフロー+修正要求を送信
- `callGeminiAPIForFeedback()`でAPI呼び出し
- 失敗時は`processFeedbackRequest()`でローカル処理（キーワードマッチング）

**意図再確認判定**（newtab.js:1303-1335）
- アイドル検知後、過去の目的と現在の目的を比較
- `callGeminiForConfirmation()`でtrue/false判定
- trueならワークフロー継続、falseなら振り返り画面へ遷移

### 特殊な仕様

**アイドル監視**（background.js:194-239）
- `chrome.idle` APIで1時間（3600秒）の放置を検知
- `waitingForConfirmation`フラグをtrueに設定
- 新しいタブで意図再確認オーバーレイを表示
- Gemini APIで過去の目的と現在の目的を比較し、一致すればワークフロー継続

**ブックマーク機能**（popup.js:124-224）
- ポップアップの「このページをブックマーク」ボタンで現在のページを保存
- ブックマークは現在のワークフローの目的と紐付け
- 次回同じ目的でワークフロー開始時、Gemini APIのプロンプトに含まれる

**ページ評価の反転**（reflection.js:117）
- チェックボックス**未選択**のページが評価1（後悔あり）
- チェックボックス**選択**のページが評価0（後悔なし）
- 統一ログのpageEvaluationsに記録

## 重要な注意点

- **APIキー管理**：config.jsにGemini APIキーがハードコードされています（本番環境では環境変数に移行推奨）
- **日本語中心**：UIとコメントは日本語（研究対象が日本語話者のため）
- **実験データ**：logsとbookmarksは削除されない（ユーザーが明示的にリセットするまで蓄積）
- **Chrome固有API**：chrome.storage、chrome.tabs、chrome.idle、chrome.runtime等を多用
