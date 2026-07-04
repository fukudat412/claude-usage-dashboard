# Rust対応Docker構成ドキュメント

> **注記 (2026-07)**: 本ドキュメントが説明するRust用Docker構成（Dockerfile.rust / Dockerfile.proxy / docker-compose.rust.yml）は2026-07に削除されました（git履歴から復元可能）。歴史的記録として保存しています。

## 概要

Rustバックエンドを含めたDocker構成により、イメージサイズとメモリ使用量を大幅に削減しました。

## 📊 パフォーマンス比較

### イメージサイズ

| 構成 | イメージサイズ | 削減率 |
|---|---|---|
| 従来版（Node.jsのみ） | ~180MB | 基準 |
| アプローチA（統合版） | ~120MB | **33%削減** |
| アプローチB（マルチコンテナ） | ~115MB | **36%削減** |
| - Rustバックエンド単体 | ~15MB | **92%削減** |
| - Node.jsプロキシ単体 | ~100MB | 44%削減 |

### メモリ使用量

| 構成 | アイドル時 | 負荷時 | 削減率 |
|---|---|---|---|
| 従来版（Node.jsのみ） | ~50-100MB | ~150-200MB | 基準 |
| アプローチA（統合版） | ~20-40MB | ~80-120MB | **60-70%削減** |
| アプローチB（マルチコンテナ） | ~15-35MB | ~60-100MB | **70-80%削減** |
| - Rustバックエンド単体 | ~5-15MB | ~20-40MB | **85-90%削減** |
| - Node.jsプロキシ単体 | ~10-20MB | ~40-60MB | 60-80%削減 |

### レスポンス時間

| 実装 | レスポンス時間 | 改善率 |
|---|---|---|
| Node.js | 108ms | 基準 |
| Rust | 39ms | **2.8倍高速** |

## 🏗 アーキテクチャ

### アプローチA: 統合版（単一コンテナ）

```
┌─────────────────────────────────────────┐
│  Alpine Linux Container (~120MB)        │
│                                         │
│  ┌─────────────────┐ ┌───────────────┐ │
│  │ Rust Backend    │ │ Node.js Proxy │ │
│  │ (Port 8080)     │ │ (Port 3001)   │ │
│  │ ~15MB binary    │ │ ~100MB        │ │
│  └─────────────────┘ └───────────────┘ │
│           ↓                  ↓          │
│  ┌─────────────────────────────────┐   │
│  │  Shared Volume (Claude Data)    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**メリット:**
- セットアップが簡単
- 単一コンテナで管理が容易
- デバッグしやすい

**デメリット:**
- マルチコンテナ版より若干大きい
- 個別スケーリング不可

### アプローチB: マルチコンテナ版（最軽量・推奨）

```
┌──────────────────────────┐     ┌───────────────────────────┐
│ Distroless Container     │     │ Alpine Linux Container    │
│                          │     │                           │
│ ┌──────────────────────┐ │     │ ┌───────────────────────┐ │
│ │ Rust Backend         │ │     │ │ Node.js Proxy         │ │
│ │ (Port 8080)          │◄├─────┤►│ (Port 3001)           │ │
│ │ ~15MB total          │ │HTTP │ │ ~100MB total          │ │
│ └──────────────────────┘ │     │ └───────────────────────┘ │
└──────────────────────────┘     └───────────────────────────┘
         ↓                                    ↓
    ┌──────────────────────────────────────────────┐
    │      Shared Docker Network & Volumes         │
    └──────────────────────────────────────────────┘
```

**メリット:**
- 最小イメージサイズ（Rust: distroless使用）
- 各コンテナを独立してスケーリング可能
- セキュリティ向上（最小攻撃面）
- 個別アップデート可能

**デメリット:**
- 複数コンテナの管理が必要

## 📁 ファイル構成

### 新規作成ファイル

```
claude-usage-dashboard/
├── rust-backend/
│   └── Dockerfile              # 超軽量Rustバックエンド（~15MB）
│
├── Dockerfile.rust             # 統合版Dockerfile（アプローチA）
├── Dockerfile.proxy            # Node.jsプロキシ用Dockerfile
├── docker-compose.rust.yml     # マルチコンテナ構成（アプローチB）
├── docker-entrypoint-rust.sh   # 統合版起動スクリプト
└── DOCKER_RUST.md              # このドキュメント
```

### 既存ファイル

```
├── Dockerfile                  # 従来版Dockerfile（Node.jsのみ）
├── Dockerfile.dev              # 開発版Dockerfile
└── docker-compose.yml          # 従来版docker-compose
```

## 🚀 使用方法

### アプローチA: 統合版

```bash
# ビルド
docker build -f Dockerfile.rust -t claude-dashboard-rust .

# 起動
docker run -d --name claude-dashboard \
  -p 3001:3001 \
  -v ~/.claude:/home/appuser/.claude:ro \
  -v ~/Library/Caches/claude-cli-nodejs:/home/appuser/Library/Caches/claude-cli-nodejs:ro \
  -v ~/Library/Application\ Support/Code:/home/appuser/Library/Application\ Support/Code:ro \
  claude-dashboard-rust

# ログ確認
docker logs -f claude-dashboard

# 停止・削除
docker stop claude-dashboard
docker rm claude-dashboard
```

### アプローチB: マルチコンテナ版（推奨）

```bash
# ビルドと起動
docker-compose -f docker-compose.rust.yml up -d

# ログ確認（全コンテナ）
docker-compose -f docker-compose.rust.yml logs -f

# 特定コンテナのログ
docker-compose -f docker-compose.rust.yml logs -f rust-backend
docker-compose -f docker-compose.rust.yml logs -f node-proxy

# 停止
docker-compose -f docker-compose.rust.yml down

# 再ビルド
docker-compose -f docker-compose.rust.yml up -d --build
```

## 🔍 トラブルシューティング

### Rustバックエンドが起動しない

```bash
# ログ確認
docker-compose -f docker-compose.rust.yml logs rust-backend

# コンテナ内で実行確認
docker-compose -f docker-compose.rust.yml exec rust-backend /bin/sh
# エラー: distrolessにはシェルがない

# 代わりにビルダーイメージで確認
docker run --rm -it rust:1.75-alpine sh
```

### ポート競合

```bash
# 使用中のポートを確認
lsof -i :3001
lsof -i :8080

# プロセスを停止
kill -9 <PID>
```

### ビルドエラー

```bash
# キャッシュをクリアして再ビルド
docker-compose -f docker-compose.rust.yml build --no-cache

# 古いイメージを削除
docker system prune -a
```

## 🛡 セキュリティ

### Distroless イメージ

Rustバックエンドは`gcr.io/distroless/static:nonroot`を使用:

- **最小攻撃面**: シェル、パッケージマネージャーなし
- **非rootユーザー**: デフォルトでnonrootユーザーで実行
- **CVE削減**: 最小限の依存関係

### Alpine Linux

Node.jsプロキシはAlpine Linuxを使用:

- **軽量**: 約5MBのベースイメージ
- **セキュリティアップデート**: 定期的なアップデート
- **非rootユーザー**: 専用ユーザーで実行

## 📈 今後の改善予定

1. **開発環境のDocker構成**: ホットリロード対応
2. **Kubernetesマニフェスト**: k8sデプロイ用設定
3. **ヘルスチェック改善**: より詳細な監視
4. **メトリクス収集**: Prometheusエクスポーター
5. **自動スケーリング**: 負荷に応じたスケーリング

## 📚 参考資料

- [Rust Backend Migration](./RUST_MIGRATION.md)
- [Performance Optimizations](./docs/performance-optimizations.md)
- [Distroless Container Images](https://github.com/GoogleContainerTools/distroless)
- [Alpine Linux](https://alpinelinux.org/)
