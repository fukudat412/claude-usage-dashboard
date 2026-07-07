# Claude Code 使用量ダッシュボード

Claude Codeの使用量を可視化するWebサービスです。自分のPC上のClaude Codeデータを読み取り、使用状況を確認できます。

## 機能

### サマリー表示
- 全体的な使用統計を表示
- 日別・月別の使用量推移グラフ
- トップ使用セッションの表示
- データの自動更新（Rキーショートカット対応）

### 使用量分析
- **日別使用量**: 日ごとのトークン使用量とコストの推移
  - 特定日をクリックすると時間帯別詳細を表示（0-23時）
  - 時間帯別チャート・テーブル表示
  - サマリーカード（総コスト・総トークン・総リクエスト）
- **月別使用量**: 月ごとの集計データ
- **時間帯別分析**: 全期間の時間帯別統計
  - テーブル・ヒートマップ・チャート表示切替
  - ピーク時間帯の特定
  - 時間帯分布（朝・昼・夜・深夜）
- **モデル別使用量**: 各AIモデルの使用統計
  - 日別コストの積み上げチャートでモデル構成比の推移を表示

### プロジェクト管理
- **プロジェクト別使用量**: プロジェクトごとの統計（VS Code統合）
- **Todo履歴**: タスク管理の履歴

### ログ・ツール
- **MCPログ**: Claude Code IDE統合のセッション履歴
- **MCPツール使用状況**: 各MCPツールの詳細な使用統計と可視化
- **会話ログ**: セッションごとの会話内容をチャット形式で閲覧（AIタイトル・使用ツール・タイムスタンプ付き）
- **会話の全文検索**: 全プロジェクトを横断して「あの話をしたセッション」をスニペット付きで検索

### 月次予算
- **予算バー**: サマリー上部に今月のコストと予算に対する進捗を表示
- **アラート**: 予算の80%超で黄色、超過で赤色表示（予算は画面から設定、ブラウザに保存）

### 技術機能
- **インタラクティブチャート**: エクスポート・ドリルダウン・フィルタリング機能
- **CSVエクスポート**: 日別・月別・モデル別・プロジェクト別テーブルをUTF-8(BOM付き)CSVでダウンロード
- **型安全性**: フロントエンドのTypeScript化による開発者体験とコード品質の向上
- **キャッシュ機能**: データの高速読み込み

## セットアップ

### 必要な環境
- Node.js (v20.19以上) または Docker
- npm (ローカル実行の場合)

## 実行方法

### Docker での実行（推奨）

#### 🔧 開発環境（ホットリロード対応）

```bash
# 開発環境を起動（ホットリロード対応）
docker-compose -f docker-compose.dev.yml up

# バックグラウンドで実行
docker-compose -f docker-compose.dev.yml up -d

# ログ確認
docker-compose -f docker-compose.dev.yml logs -f

# 停止
docker-compose -f docker-compose.dev.yml down
```

**特徴**:
- **Reactホットリロード**: ソースコード変更時に自動リロード
- **開発ログ**: DEBUG レベルのログ出力

開発環境では以下のポートが利用可能です：
- http://localhost:30000 - React開発サーバー（ホットリロード対応）
- http://localhost:30001 - Expressサーバー（nodemon対応）

#### 本番環境
```bash
# Docker Compose を使用
docker-compose up -d

# または手動でDockerコンテナを実行
docker build -t claude-usage-dashboard .
docker run -d --name claude-dashboard \
  -p 30001:30001 \
  -v ~/.claude:/home/nodejs/.claude:ro \
  -v ~/Library/Caches/claude-cli-nodejs:/home/nodejs/Library/Caches/claude-cli-nodejs:ro \
  -v ~/Library/Application\ Support/Code:/home/nodejs/Library/Application\ Support/Code:ro \
  claude-usage-dashboard
```

#### 開発環境（ホットリロード対応）
```bash
# 開発用プロファイルで実行（ホットリロード対応）
docker-compose --profile dev up

# バックグラウンドで実行
docker-compose --profile dev up -d

# ログを確認
docker-compose --profile dev logs -f
```

開発環境では以下のポートが利用可能です：
- http://localhost:30000 - React開発サーバー（ホットリロード対応）
- http://localhost:30001 - Expressサーバー（nodemon対応）

#### Dockerコンテナの管理
```bash
# 停止
docker-compose down

# ログ確認
docker-compose logs -f

# ヘルスチェック
curl http://localhost:30001/api/health
```

### ローカルでの実行

#### インストール
1. 依存関係のインストール
```bash
npm install
```

2. TypeScriptの型チェック
```bash
npm run typecheck
```

3. Reactアプリのビルド
```bash
npm run build
```

#### 実行
開発モード（フル開発環境：サーバー+クライアント自動リロード）:
```bash
npm run dev
```

開発モード（サーバーのみ）:
```bash
npm run dev:server
```

本番モード:
```bash
npm start
```

アプリケーションは http://localhost:30001 でアクセスできます。開発モード時のフロントエンドは http://localhost:30000 で起動します。

## TypeScript移行について

### 完全TypeScript化の実装

フロントエンドは**完全にTypeScript化**されており、以下の特徴があります（バックエンドはCommonJSのJavaScriptで、`tsconfig.json` の `allowJs` で型チェック対象に含まれます）：

#### 型安全性
- **Strict Mode**: `tsconfig.json`でstrict modeを有効化
- **完全な型定義**: すべてのコンポーネント、フック、ユーティリティが型付け
- **インターフェース定義**: `src/types/index.ts`で包括的な型定義を管理
- **ジェネリック対応**: `DataTable`コンポーネントなどでジェネリック型を活用

#### 主要な型定義
- `ChartDataPoint`: チャートデータの型安全性
- `McpLogEntry`: MCPログエントリの構造
- `TableColumn`: データテーブルの列定義
- `UsageData`: 使用量データの包括的な型

#### 開発者体験の向上
- **IDE支援**: VSCodeでの自動補完・型チェック・リファクタリング支援
- **コンパイル時エラー検出**: 実行前に型エラーを検出
- **型安全なプロパティアクセス**: typoや不正なプロパティアクセスを防止
- **リファクタリング安全性**: 型システムによる安全なコード変更

## MCPツール使用状況機能

新しく追加されたMCPツール使用状況機能では、以下の情報を確認できます：

### 統計情報
- **総呼び出し回数**: すべてのMCPツールの呼び出し総数
- **ユニークツール数**: 使用されたツールの種類数
- **総セッション数**: MCPツールを使用したセッション数

### 可視化
- **棒グラフ**: 上位10ツールの使用頻度とセッション数
- **円グラフ**: ツール使用比率の視覚的表示
- **セッション履歴**: 最近のセッションとツール使用詳細
- **詳細テーブル**: 各ツールの初回使用・最終使用日時を含む統計

### 対応ツール例
- `getDiagnostics`: 診断情報の取得
- `openDiff`: 差分表示
- `close_tab`: タブの終了
- `closeAllDiffTabs`: すべての差分タブを閉じる
- その他のMCPツール

## データソース

以下のClaude Codeデータを読み取ります：

- **MCPログ**: `~/Library/Caches/claude-cli-nodejs/*/mcp-logs-ide/`
- **会話トランスクリプト**: `~/.claude/projects/**/*.jsonl`（再帰的に収集。サブエージェント分は `<sessionId>/subagents/` 配下に別保存されており、これも集計対象）
- **Todo履歴**: `~/.claude/todos/`
- **VS Code拡張ログ**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks/`

## データの永続化

Claude Codeは既定で約30日（`cleanupPeriodDays`）より古い会話トランスクリプトを削除するため、
何もしないと使用量の履歴も約1ヶ月分しか残りません。本ダッシュボードは2つの対策を取っています:

1. **日次集計のアーカイブ（自動）**: サーバー起動時と6時間ごとに日次集計を `data/daily-archive.json`
   に保存します。元ログが削除された日付はアーカイブから自動補完され、`archived: true` フラグが付きます。
   Docker利用時は `./data` がボリュームとしてマウントされます。
2. **元ログの保持期間延長（推奨・手動）**: `~/.claude/settings.json` に以下を追加すると、
   Claude Code自体がトランスクリプトを長期間保持します（会話ログの閲覧にも必要）:
   ```json
   { "cleanupPeriodDays": 3650 }
   ```

## 技術仕様

- **バックエンド**: Node.js + Express (JavaScript)
- **フロントエンド**: React + TypeScript（ビルド: Vite、テスト: Vitest）
- **データ形式**: JSON
- **型安全性**: フロントエンドの完全TypeScript化（strict mode対応）
- **スタイル**: CSS（レスポンシブデザイン）
- **パッケージ管理**: 統合されたpackage.json（Flat構成）
- **コンテナ**: Docker（マルチステージビルド）
- **オーケストレーション**: Docker Compose

## プロジェクト構造

```
claude-usage-dashboard/
├── package.json           # 統合されたpackage.json
├── tsconfig.json         # TypeScript設定
├── vite.config.ts        # Vite + Vitest設定
├── index.html            # Viteエントリーポイント
├── server.js             # Express サーバー（エントリーポイント）
├── src/
│   ├── components/        # React コンポーネント（TypeScript）
│   │   ├── Dashboard.tsx
│   │   ├── DataTable.tsx
│   │   ├── LogViewer.tsx
│   │   ├── McpToolUsage.tsx
│   │   ├── HourlyAnalysis.tsx      # 時間帯別分析コンポーネント
│   │   ├── DailyHourlyDetail.tsx   # 日別時間帯詳細モーダル
│   │   ├── FilterPanel.tsx
│   │   ├── SummaryCard.tsx
│   │   ├── UsageChart.tsx
│   │   └── charts/
│   │       └── InteractiveChart.tsx
│   ├── hooks/            # カスタムフック（TypeScript）
│   │   ├── useUsageData.ts
│   │   └── useChartData.ts
│   ├── utils/            # 共通ユーティリティ（TypeScript）
│   │   └── formatters.ts
│   ├── types/            # 型定義
│   │   └── index.ts
│   ├── routes/           # Express ルート
│   │   └── api/          # APIエンドポイント
│   │       ├── health.js         # ヘルスチェック
│   │       ├── summary.js
│   │       ├── daily.js
│   │       ├── monthly.js
│   │       ├── hourly.js         # 時間帯別API
│   │       ├── mcp.js
│   │       ├── models.js
│   │       ├── projects.js
│   │       └── logs.js
│   ├── services/         # ビジネスロジック
│   │   ├── mcpService.js
│   │   ├── todoService.js
│   │   ├── vscodeService.js
│   │   ├── projectService.js
│   │   ├── pricingService.js     # 価格計算・最新モデル対応
│   │   ├── cacheService.js
│   │   └── rustProcessor.js      # rust-processor連携（任意の高速化）
│   ├── middleware/       # Express ミドルウェア
│   │   ├── errorHandler.js
│   │   └── security.js
│   ├── config/          # 設定ファイル
│   │   ├── paths.js
│   │   └── model-pricing.json  # モデル別単価の単一情報源 (Node/Rust共用)
│   ├── App.tsx          # メインReactコンポーネント（TypeScript）
│   └── index.tsx        # Reactエントリーポイント（TypeScript）
├── public/              # React パブリックファイル
├── build/               # React ビルド出力
├── docs/                # プロジェクトドキュメント
├── rust-processor/      # JSONLパース高速化CLI（Rust・ビルドされていれば自動利用）
├── Dockerfile           # 本番用Docker設定
├── Dockerfile.dev       # 開発用Docker設定
├── docker-compose.yml   # Docker Compose設定
└── docker-compose.dev.yml # 開発用Docker Compose設定
```

## アーキテクチャ

### バックエンド（モジュラー構成）
- **Routes**: APIエンドポイントの定義
- **Services**: ビジネスロジックの実装
  - `mcpService.js`: MCPログ解析とツール使用統計
  - `todoService.js`: Todo履歴の読み取り
  - `vscodeService.js`: VS Code拡張データ処理
  - `projectService.js`: プロジェクト別使用量集計
  - `pricingService.js`: 料金計算ロジック
  - `cacheService.js`: キャッシュ管理
- **Middleware**: 横断的な機能（エラーハンドリング等）
- **Config**: アプリケーション設定

### フロントエンド（TypeScriptコンポーネント構成）
- **Components**: 型安全な再利用可能なUIコンポーネント
  - `Dashboard.tsx`: サマリーダッシュボード（完全型付け）
  - `McpToolUsage.tsx`: MCPツール使用状況の可視化（チャート・統計）
  - `HourlyAnalysis.tsx`: 時間帯別分析コンポーネント（テーブル・ヒートマップ・チャート）
  - `DailyHourlyDetail.tsx`: 日別時間帯詳細モーダル（0-23時詳細表示）
  - `UsageChart.tsx`: トークン使用量チャート（インタラクティブ機能付き）
  - `FilterPanel.tsx`: 高度なフィルタリング機能
  - `DataTable.tsx`: 汎用データテーブル（ジェネリック型対応、行クリック対応）
  - `InteractiveChart.tsx`: エクスポート・ドリルダウン機能付きチャート
- **Hooks**: TypeScript化されたカスタムフック（データフェッチ・チャートデータ加工）
- **Types**: 包括的な型定義（`src/types/index.ts`）
- **Utils**: 型安全な共通ユーティリティ関数

## Docker 仕様

### 本番用イメージ
- **ベースイメージ**: Node.js 22 Alpine Linux
- **セキュリティ**: 非rootユーザー (nodejs:1001) で実行
- **ポート**: 30001
- **ヘルスチェック**: `/api/health` エンドポイント
- **信号処理**: dumb-init による適切なプロセス管理

### ボリュームマウント
Claude Codeのローカルデータディレクトリを読み取り専用でマウント:
- `~/.claude` → Claude設定ディレクトリ
- `~/Library/Caches/claude-cli-nodejs` → MCPログ
- `~/Library/Application Support/Code` → VS Code拡張データ

## セキュリティ

### データセキュリティ
- ローカルPCのデータのみ参照
- 外部への通信なし
- データの保存や送信は行わない

### アプリケーションセキュリティ
- **Helmet.js**: 包括的なセキュリティヘッダー設定
- **CSP**: Content Security Policyによるコンテンツ制限
- **CORS**: 適切なクロスオリジン設定
- **レート制限**: DoS攻撃防止（15分間に1000リクエスト）
- **XSS防止**: XSSフィルター有効化
- **クリックジャッキング防止**: X-Frame-Options設定
- **HSTS**: HTTP Strict Transport Security
- **MIME Sniffing防止**: X-Content-Type-Options設定

## 最近の更新履歴

### v1.2.0 - 時間帯別分析機能

#### 🚀 新機能
- **日別時間帯詳細表示**: 日別使用量テーブルから特定日をクリックすると、0-23時の時間帯別詳細を表示
  - 時間帯別チャート（コスト・トークン数）
  - 時間帯別テーブル（入力/出力/キャッシュトークン、コスト、リクエスト数）
  - サマリーカード（総コスト・総トークン・総リクエスト）
  - 時間帯分類（朝・昼・夜・深夜）
- **時間帯別分析タブ**: 全期間の時間帯別統計を表示
  - 3つの表示モード（テーブル・ヒートマップ・チャート）
  - ピーク時間帯の特定（コスト・トークン・リクエスト）
  - 時間帯分布の可視化
- **時間帯別APIエンドポイント**: `/api/v2/hourly`
  - 日付フィルタリング対応
  - キャッシュ機能搭載

### v1.1.0 - 基盤の安定化

#### 🐛 バグ修正
- MCPログ解析の修正（`.txt`形式対応）
- トークン使用量・コスト計算の修正
- キャッシュトークンの正確なコスト計算
- 最新Claudeモデルの価格情報追加（Sonnet 4.5, Haiku 4.5）
- グラフ表示順の修正（時系列を左から右に変更）

#### 🚀 機能改善
- データ表示の精度向上
- Docker環境の改善
- エラーハンドリングの強化
- キャッシュサービスのAPI統一

## ライセンス

MIT License