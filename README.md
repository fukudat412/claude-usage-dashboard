# Claude Code 使用量ダッシュボード

Claude Codeの使用量を可視化するWebサービスです。自分のPC上のClaude Codeデータを読み取り、使用状況を確認できます。

## 新機能：セッション管理

メインセッションからMCP経由でサブセッションを作成・管理できるようになりました。

## 機能

- **サマリー表示**: 全体的な使用統計を表示
- **MCPログ**: Claude Code IDE統合のセッション履歴
- **MCPツール使用状況**: 各MCPツールの詳細な使用統計と可視化
- **Todo履歴**: タスク管理の履歴
- **VS Code拡張**: Claude Dev拡張の使用履歴
- **日別・月別使用量**: トークン使用量とコストの推移
- **モデル別使用量**: 各AIモデルの使用統計
- **プロジェクト別使用量**: プロジェクトごとの使用統計
- **セッション管理**: メインセッション・サブセッションの作成と管理（WebSocket対応）

## セットアップ

### 必要な環境
- Node.js (v14以上) または Docker
- npm (ローカル実行の場合)

## 実行方法

### Docker での実行（推奨）

#### 本番環境
```bash
# Docker Compose を使用
docker-compose up -d

# または手動でDockerコンテナを実行
docker build -t claude-usage-dashboard .
docker run -d --name claude-dashboard \
  -p 3001:3001 \
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
- http://localhost:3000 - React開発サーバー（ホットリロード対応）
- http://localhost:3001 - Expressサーバー（nodemon対応）

#### Dockerコンテナの管理
```bash
# 停止
docker-compose down

# ログ確認
docker-compose logs -f

# ヘルスチェック
curl http://localhost:3001/api/health
```

### ローカルでの実行

#### インストール
1. 依存関係のインストール
```bash
npm install
```

2. Reactアプリのビルド
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

アプリケーションは http://localhost:3001 でアクセスできます。

## MCPサーバーセットアップ（セッション管理用）

1. MCPサーバーの依存関係をインストール:
```bash
cd mcp-server
npm install
```

2. Claude Codeの設定ファイルに以下を追加:

**基本セッション管理:**
```json
{
  "mcpServers": {
    "claude-session": {
      "command": "node",
      "args": ["/Users/gondotomotaka/fukuda_work/claude-usage-dashboard/mcp-server/index.js"],
      "cwd": "/Users/gondotomotaka/fukuda_work/claude-usage-dashboard"
    }
  }
}
```

**オーケストレーション対応（推奨）:**
```json
{
  "mcpServers": {
    "claude-code-orchestration": {
      "command": "node",
      "args": ["/Users/gondotomotaka/fukuda_work/claude-usage-dashboard/mcp-server/index.js"],
      "env": {
        "API_URL": "http://localhost:52003",
        "WORKER_ID": "claude-worker-1",
        "WORKER_SPECIALIZATIONS": "code,review,documentation"
      },
      "cwd": "/Users/gondotomotaka/fukuda_work/claude-usage-dashboard"
    }
  }
}
```

3. MCPツールの使用例:
- `initialize_session`: ダッシュボードとの接続を初期化
- `create_subsession`: 新しいサブセッションを作成
- `update_session_status`: セッションステータスを更新
- `respond_to_subsession`: サブセッションへのレスポンスを送信

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
- **Todo履歴**: `~/.claude/todos/`
- **VS Code拡張ログ**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks/`

## 技術仕様

- **バックエンド**: Node.js + Express
- **フロントエンド**: React
- **データ形式**: JSON
- **スタイル**: CSS（レスポンシブデザイン）
- **パッケージ管理**: 統合されたpackage.json（Flat構成）
- **コンテナ**: Docker（マルチステージビルド）
- **オーケストレーション**: Docker Compose

## プロジェクト構造

```
claude-usage-dashboard/
├── package.json           # 統合されたpackage.json
├── server.js             # Express サーバー（エントリーポイント）
├── src/
│   ├── components/        # React コンポーネント
│   │   ├── Dashboard.js
│   │   ├── DataTable.js
│   │   ├── LogViewer.js
│   │   ├── McpToolUsage.js
│   │   ├── SummaryCard.js
│   │   └── UsageChart.js
│   ├── hooks/            # カスタムフック
│   │   └── useUsageData.js
│   ├── utils/            # 共通ユーティリティ
│   │   └── formatters.js
│   ├── routes/           # Express ルート
│   │   ├── usage.js
│   │   ├── logs.js
│   │   └── health.js
│   ├── services/         # ビジネスロジック
│   │   ├── mcpService.js
│   │   ├── todoService.js
│   │   ├── vscodeService.js
│   │   ├── projectService.js
│   │   ├── pricingService.js
│   │   └── cacheService.js
│   ├── middleware/       # Express ミドルウェア
│   │   └── errorHandler.js
│   ├── config/          # 設定ファイル
│   │   └── paths.js
│   ├── App.js           # メインReactコンポーネント
│   └── index.js         # Reactエントリーポイント
├── public/              # React パブリックファイル
├── build/               # React ビルド出力
├── docs/                # プロジェクトドキュメント
├── Dockerfile           # 本番用Docker設定
├── Dockerfile.dev       # 開発用Docker設定
└── docker-compose.yml   # Docker Compose設定
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

### フロントエンド（コンポーネント構成）
- **Components**: 再利用可能なUIコンポーネント
  - `Dashboard.js`: サマリーダッシュボード
  - `McpToolUsage.js`: MCPツール使用状況の可視化（チャート・統計）
  - `UsageChart.js`: トークン使用量チャート
  - `DataTable.js`: 汎用データテーブル
- **Hooks**: カスタムフック（データフェッチ等）
- **Utils**: 共通ユーティリティ関数

## Docker 仕様

### 本番用イメージ
- **ベースイメージ**: Node.js 18 Alpine Linux
- **セキュリティ**: 非rootユーザー (nodejs:1001) で実行
- **ポート**: 3001
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

## ライセンス

MIT License