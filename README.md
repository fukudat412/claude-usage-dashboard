# Claude Code 使用量ダッシュボード

Claude Codeの使用量を可視化するWebサービスです。自分のPC上のClaude Codeデータを読み取り、使用状況を確認できます。

## 機能

- **サマリー表示**: 全体的な使用統計を表示
- **MCPログ**: Claude Code IDE統合のセッション履歴
- **Todo履歴**: タスク管理の履歴
- **VS Code拡張**: Claude Dev拡張の使用履歴

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

#### 開発環境
```bash
# 開発用プロファイルで実行（ホットリロード対応）
docker-compose --profile dev up -d
```

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
- **Middleware**: 横断的な機能（エラーハンドリング等）
- **Config**: アプリケーション設定

### フロントエンド（コンポーネント構成）
- **Components**: 再利用可能なUIコンポーネント
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

- ローカルPCのデータのみ参照
- 外部への通信なし
- データの保存や送信は行わない

## ライセンス

MIT License