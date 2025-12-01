# Rust 移行計画

## 現状分析

### ✅ 完了事項
- パフォーマンスベンチマーク（Node.js）
- Rustプロトタイプ実装
- パフォーマンス比較（4.90倍高速化を確認）
- ボトルネック特定（Data Aggregation: 8.03倍改善）

### 📋 現在のアーキテクチャ
```
Frontend (React) → Backend (Express.js) → ファイルシステム
                    ↓
                 8個のAPIエンドポイント
                    ↓
                 20個のサービスファイル
```

---

## 3つの移行アプローチ

### アプローチ1: 完全Rust化（Full Migration）

**概要:** バックエンド全体をRustで書き直し

```
Frontend (React) → Backend (Rust/Axum) → ファイルシステム
```

#### メリット
- ✅ 最大のパフォーマンス向上（4.90倍）
- ✅ 一貫したコードベース（学習・保守が容易）
- ✅ 型安全性の完全な恩恵
- ✅ メモリ使用量の最適化

#### デメリット
- ❌ 開発期間が長い（2-3週間）
- ❌ リスクが高い（一度に全て変更）
- ❌ テストが大変（全機能を再検証）
- ❌ ロールバックが困難

#### 推奨度: ⭐⭐⭐☆☆
**適用ケース:**
- 時間に余裕がある
- Rustを深く学びたい
- 長期的な品質重視

---

### アプローチ2: 段階的移行（Incremental Migration）

**概要:** APIエンドポイントを1つずつRustに移行

```
Phase 1:
Frontend → Express.js (7 endpoints) + Rust/Axum (1 endpoint)

Phase 2:
Frontend → Express.js (5 endpoints) + Rust/Axum (3 endpoints)

Phase 3:
Frontend → Rust/Axum (8 endpoints)
```

#### メリット
- ✅ リスクが低い（問題があれば途中で戻せる）
- ✅ 学習曲線が緩やか
- ✅ 各フェーズで成果が見える
- ✅ テストが段階的にできる

#### デメリット
- ⚠️ 開発期間が最も長い（3-4週間）
- ⚠️ 2つのバックエンドを並行運用（複雑）
- ⚠️ プロキシ設定が必要

#### 推奨度: ⭐⭐⭐⭐☆
**適用ケース:**
- リスクを最小化したい
- 段階的に学びながら進めたい
- 本番環境で使用中

---

### アプローチ3: ハイブリッド（Hybrid Approach）

**概要:** 重い処理のみRustに、残りはNode.js

```
Frontend → Express.js → Rustバイナリ（重い処理のみ）
                      → Node.jsサービス（軽い処理）
```

#### メリット
- ✅ 最も短期間で効果（1週間）
- ✅ リスクが最小
- ✅ 既存コードの大部分を維持
- ✅ パフォーマンス改善の80%を達成

#### デメリット
- ⚠️ 2言語のメンテナンス
- ⚠️ プロセス間通信のオーバーヘッド
- ⚠️ 完全な型安全性は得られない

#### 推奨度: ⭐⭐⭐⭐⭐
**適用ケース:**
- 早く効果を出したい
- 既存コードを活かしたい
- 最初のステップとして試したい

---

## 🎯 推奨: アプローチ3 → アプローチ2

### 理由
1. **早期の成果**: 1週間でData Aggregationを8倍高速化
2. **低リスク**: 既存システムを壊さない
3. **学習機会**: Rustを段階的に学べる
4. **柔軟性**: 効果を見て次のステップを決定

---

## 詳細実装計画

### Phase 1: ハイブリッド実装（1週間）

#### ステップ1: Rustデータ処理CLIの実装（2-3日）

**実装内容:**
```rust
// rust-processor/src/main.rs
// コマンドライン引数でプロジェクトパスを受け取り
// データ処理結果をJSON形式で標準出力
```

**対象処理:**
1. `processProjectData` (Data Aggregation)
2. `parseMCPLogs` (MCP Logs Processing)
3. `getTodosData` (TODO Processing)

**タスク:**
- [x] Rustベンチマークコードをベースに実装
- [ ] JSON出力フォーマットをNode.jsと完全一致
- [ ] エラーハンドリング
- [ ] テストケース作成

#### ステップ2: Node.jsからRustバイナリを呼び出し（1-2日）

**実装内容:**
```javascript
// src/services/rustProcessor.js
const { execFileSync } = require('child_process');

function processProjectDataRust() {
  const result = execFileSync('./rust-processor/target/release/rust-processor', [
    '--projects-path',
    CLAUDE_PATHS.projects
  ]);
  return JSON.parse(result.toString());
}
```

**タスク:**
- [ ] Rustバイナリ実行ラッパー作成
- [ ] エラーハンドリング（Rustプロセス失敗時）
- [ ] フォールバック機能（Rustがない場合はNode.js実行）
- [ ] パフォーマンス計測

#### ステップ3: 統合テスト（1日）

**タスク:**
- [ ] 既存のAPIテスト実行
- [ ] パフォーマンス計測（before/after）
- [ ] エラーケースのテスト
- [ ] ドキュメント更新

**期待される結果:**
- API全体で 2-3倍 の高速化
- 既存機能の完全互換性

---

### Phase 2: REST API の段階的Rust化（2-3週間）

各エンドポイントを1つずつRustに移行

#### 移行優先順位

| 優先度 | エンドポイント | 理由 | 推定工数 |
|--------|---------------|------|----------|
| 1 | `/api/v2/daily` | データ処理が重い | 3日 |
| 2 | `/api/v2/monthly` | データ処理が重い | 2日 |
| 3 | `/api/v2/summary` | 複数サービス統合 | 3日 |
| 4 | `/api/v2/mcp` | MCP特有の処理 | 2日 |
| 5 | `/api/v2/hourly` | 比較的シンプル | 2日 |
| 6 | `/api/v2/models` | 比較的シンプル | 2日 |
| 7 | `/api/v2/projects` | 比較的シンプル | 2日 |
| 8 | `/api/v2/logs` | ファイル読み込み | 2日 |

**合計推定工数:** 18日（約3週間）

#### Rust Webフレームワーク選定

**推奨: Axum**

理由:
- Tokioベース（高性能）
- 型安全なルーティング
- ミドルウェアが豊富
- ドキュメントが充実

#### 実装構成

```
rust-backend/
├── Cargo.toml
├── src/
│   ├── main.rs           # Axumサーバー起動
│   ├── routes/           # APIルート
│   │   ├── summary.rs
│   │   ├── daily.rs
│   │   └── ...
│   ├── services/         # ビジネスロジック
│   │   ├── project_service.rs
│   │   ├── mcp_service.rs
│   │   └── ...
│   ├── models/           # データ構造
│   │   ├── usage.rs
│   │   └── ...
│   └── config/           # 設定
│       └── paths.rs
```

#### 移行手順（各エンドポイント）

1. **Rust実装** (1日)
   - ルート定義
   - サービスロジック実装
   - テスト作成

2. **プロキシ設定** (0.5日)
   ```javascript
   // server.js
   app.use('/api/v2/daily', proxy('http://localhost:8080/api/v2/daily'));
   ```

3. **テスト・検証** (0.5日)
   - 機能テスト
   - パフォーマンステスト
   - エラーケース確認

4. **デプロイ** (次のエンドポイントへ)

---

### Phase 3: 完全Rust化（1週間）

#### ステップ1: 残りのエンドポイント移行

**タスク:**
- [ ] 静的ファイル配信（React build）
- [ ] SPAフォールバック
- [ ] CORS設定
- [ ] セキュリティヘッダー

#### ステップ2: Express.js削除

**タスク:**
- [ ] server.jsを削除
- [ ] package.jsonから不要な依存関係削除
- [ ] 起動スクリプト更新
- [ ] ドキュメント更新

#### ステップ3: 本番環境準備

**タスク:**
- [ ] ビルドスクリプト作成
- [ ] 環境変数設定
- [ ] ロギング設定
- [ ] エラー監視

---

## 技術スタック（Rust）

### 必須ライブラリ

```toml
[dependencies]
# Webフレームワーク
axum = "0.7"
tokio = { version = "1", features = ["full"] }
tower = "0.4"
tower-http = { version = "0.5", features = ["fs", "cors"] }

# シリアライゼーション
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# ファイルI/O
glob = "0.3"

# 日時処理
chrono = { version = "0.4", features = ["serde"] }

# エラーハンドリング
anyhow = "1.0"
thiserror = "1.0"

# ロギング
tracing = "0.1"
tracing-subscriber = "0.3"

# 環境変数
dotenvy = "0.15"
```

---

## リスク管理

### 主要リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| Rustスキル不足 | 高 | 段階的アプローチ、ドキュメント作成 |
| 互換性問題 | 中 | 徹底的なテスト、フォールバック実装 |
| パフォーマンス未達 | 低 | ベンチマーク継続、最適化 |
| デプロイ問題 | 中 | クロスコンパイル、Docker化 |

### ロールバック戦略

#### Phase 1（ハイブリッド）
- Rustプロセスエラー時は自動的にNode.js処理にフォールバック
- 環境変数でRust使用のON/OFF切り替え

#### Phase 2（段階的移行）
- 各エンドポイントは独立してロールバック可能
- プロキシ設定を変更するだけで元に戻せる

#### Phase 3（完全Rust化）
- Git tagでNode.js版を保持
- 問題発生時は即座に前バージョンにロールバック

---

## スケジュール

### 楽観的スケジュール（4週間）

```
Week 1: Phase 1 - ハイブリッド実装
  Day 1-3: Rustデータ処理CLI
  Day 4-5: Node.js統合
  Day 6-7: テスト・検証

Week 2-3: Phase 2 - REST API移行（前半）
  Week 2: /daily, /monthly, /summary, /mcp
  Week 3: /hourly, /models, /projects, /logs

Week 4: Phase 3 - 完全Rust化
  Day 1-3: 静的ファイル配信、最終調整
  Day 4-5: 本番環境準備
  Day 6-7: ドキュメント、クリーンアップ
```

### 現実的スケジュール（6週間）

```
Week 1-2: Phase 1 - ハイブリッド実装
  Week 1: Rustデータ処理CLI実装
  Week 2: Node.js統合、テスト

Week 3-5: Phase 2 - REST API移行
  Week 3: /daily, /monthly
  Week 4: /summary, /mcp, /hourly
  Week 5: /models, /projects, /logs

Week 6: Phase 3 - 完全Rust化
  完全移行、テスト、ドキュメント
```

---

## 成功指標

### パフォーマンス目標

| 指標 | 現状 | 目標 |
|------|------|------|
| API平均レスポンス | 83ms | 20ms以下 |
| Data Aggregation | 42ms | 5ms以下 |
| メモリ使用量 | - | 50%削減 |

### 品質目標

- [ ] 全APIテストパス率 100%
- [ ] パフォーマンステストパス率 100%
- [ ] コードカバレッジ 80%以上
- [ ] ドキュメント完備

---

## 学習リソース

### Rust Web開発

1. **公式ドキュメント**
   - [The Rust Book](https://doc.rust-lang.org/book/)
   - [Axum Documentation](https://docs.rs/axum/)

2. **推奨チュートリアル**
   - [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
   - [Building a REST API with Axum](https://github.com/tokio-rs/axum/tree/main/examples)

3. **コミュニティ**
   - r/rust
   - Rust Discord

---

## 次のアクション

### 即座に開始できるタスク

1. **Phase 1の開始**
   ```bash
   cd rust-benchmark
   # ベンチマークコードをCLIツールに変換
   # JSONシリアライゼーション追加
   ```

2. **開発環境セットアップ**
   ```bash
   # VS Code拡張機能
   # - rust-analyzer
   # - CodeLLDB (デバッグ)
   ```

3. **テスト環境準備**
   - 既存APIのテストケース確認
   - Rustでの同等テスト作成準備

---

## 質問・確認事項

### ユーザーへの質問

1. **優先順位は？**
   - [ ] 速度優先（Phase 1 → 2 → 3）
   - [ ] 学習優先（じっくりRustを学ぶ）
   - [ ] 安全性優先（段階的に慎重に）

2. **スケジュール制約は？**
   - [ ] できるだけ早く（4週間）
   - [ ] じっくり進める（6週間以上）
   - [ ] 特に制約なし

3. **どこまでやりたい？**
   - [ ] Phase 1のみ（ハイブリッド）
   - [ ] Phase 2まで（段階的移行）
   - [ ] Phase 3まで（完全Rust化）

---

生成日時: 2025-12-01
