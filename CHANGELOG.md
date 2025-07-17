# Changelog

このプロジェクトのすべての注目すべき変更はこのファイルに記録されます。

## [v1.2.0] - 2025-01-17

### 🚀 Added

#### エラーログダッシュボード
- エラーログの表示・フィルタリング・分析機能を追加
- レベル別（ERROR、WARNING、CRITICAL、INFO）でのフィルタリング
- 統計情報の表示（エラー数、重要度分析）
- 類似エラーの自動検出機能
- `ErrorDashboard.tsx`コンポーネントの新規作成
- `errorLogService.ts`サービス層の実装
- `/api/v2/errors`エンドポイントの追加

#### VS Code拡張機能のオプション化
- VS Code拡張機能の有無を自動検出する機能
- 拡張機能が利用できない場合のユーザーフレンドリーなメッセージ表示
- `useVsCodeExtension.ts`フックの新規作成
- `/api/v2/vscode/available`エンドポイントの追加
- グレースフルなフォールバック機能の実装

### 🔧 Changed

#### 機能の最適化
- プロジェクト別使用量タブの表示名を「プロジェクト・VS Code統合」に変更
- VS Code拡張機能の可用性に基づく条件付きレンダリング
- UIの一貫性改善

#### アーキテクチャの改善
- モジュラー構成の強化
- サービス層の分離とTypeScript化
- 条件付きレンダリングの実装

### 🗑️ Removed

#### 機能の削除
- Todo履歴機能を削除（個人使用に特化のため）
- `todoService.js`の削除
- `/api/v2/todos`エンドポイントの削除
- `UsageData`インターフェースから`todos`プロパティを削除

### 🐛 Fixed

- API レスポンス形式の統一化
- 型安全性の向上
- VS Code拡張機能の可用性チェック

### 📦 Dependencies

- TypeScript関連依存関係の更新
- React関連ライブラリの最適化

## [v1.1.0] - 2025-01-XX

### 🐛 Fixed

#### MCPログ解析の修正
- ログファイル形式を`.jsonl`から`.txt`に変更対応
- JSON配列形式とJSON Lines形式の両方をサポート
- `debug`フィールドからのツール名抽出機能を追加
- プロジェクト名の正確な抽出機能を実装

#### トークン使用量・コスト計算の修正
- `calculateUsageMetrics`関数を新規実装
- キャッシュトークンの正確なコスト計算（読み取り：10%、作成：100%）
- Claude Opus 4モデルの価格情報を追加
- マイナスコストエラーの解決

#### Docker環境の改善
- TypeScript依存関係の競合解決（`--legacy-peer-deps`フラグ追加）
- ビルドプロセスの最適化
- パス設定の統一化

### 🚀 Improved

#### データ表示の修復
- 総トークン数の正確な表示
- 総コストの正確な計算
- 使用量推移グラフの復旧
- MCPツール使用統計の改善

#### 設定の統一化
- `APP_CONFIG`と`CLAUDE_PATHS`の統合
- エラーハンドリングの強化（`AppError`クラス追加）
- キャッシュサービスのAPI統一

## [v1.0.0] - 2025-01-XX

### 🚀 Added

#### 初期リリース
- Claude Code 使用量ダッシュボードの基本機能
- サマリー表示機能
- MCPログ解析機能
- MCPツール使用状況の可視化
- 日別・月別使用量表示
- モデル別使用量統計
- プロジェクト別使用量統計
- Docker対応

#### 技術基盤
- Node.js + Express バックエンド
- React フロントエンド
- TypeScript化
- Docker環境対応
- セキュリティ機能の実装

---

## 形式について

このファイルは [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) の形式に従っています。

### 変更タイプ

- `Added` - 新機能の追加
- `Changed` - 既存機能の変更
- `Deprecated` - 非推奨となった機能
- `Removed` - 削除された機能
- `Fixed` - バグ修正
- `Security` - セキュリティ修正