# アーキテクチャ改善提案

## 現在の構造

```
claude-usage-dashboard/
├── server.js (603行 - モノリシック)
├── client/src/App.js (532行 - 巨大コンポーネント)
└── package.json
```

## 推奨する新しい構造

### バックエンド構造

```
src/
├── app.js                 # アプリケーションのエントリーポイント
├── routes/
│   ├── index.js          # ルーター設定
│   ├── usage.js          # 使用量関連のルート
│   ├── logs.js           # ログ関連のルート
│   └── health.js         # ヘルスチェック
├── services/
│   ├── mcpService.js     # MCPログ処理
│   ├── todoService.js    # TODO処理
│   ├── vscodeService.js  # VS Code拡張処理
│   ├── projectService.js # プロジェクトデータ処理
│   └── cacheService.js   # キャッシュ管理
├── utils/
│   ├── pricing.js        # 価格計算ユーティリティ
│   ├── fileUtils.js      # ファイル操作ユーティリティ
│   ├── dateUtils.js      # 日付処理ユーティリティ
│   └── validation.js     # バリデーション
├── middleware/
│   ├── errorHandler.js   # エラーハンドリング
│   ├── security.js       # セキュリティミドルウェア
│   └── cors.js          # CORS設定
├── config/
│   ├── paths.js         # パス設定
│   ├── pricing.js       # 価格設定
│   └── cache.js         # キャッシュ設定
└── models/
    ├── UsageData.js     # 使用量データモデル
    ├── LogEntry.js      # ログエントリモデル
    └── Project.js       # プロジェクトモデル
```

### フロントエンド構造

```
client/src/
├── App.js               # メインアプリケーション
├── components/
│   ├── common/
│   │   ├── Header.js    # ヘッダーコンポーネント
│   │   ├── TabNav.js    # タブナビゲーション
│   │   ├── LoadingSpinner.js
│   │   └── ErrorMessage.js
│   ├── summary/
│   │   ├── SummarySection.js
│   │   ├── SummaryCard.js
│   │   └── SummaryGrid.js
│   ├── charts/
│   │   ├── UsageChart.js
│   │   ├── CostChart.js
│   │   └── TokenChart.js
│   ├── tables/
│   │   ├── DataTable.js
│   │   ├── UsageTable.js
│   │   ├── ProjectTable.js
│   │   └── LogTable.js
│   └── modals/
│       └── LogViewerModal.js
├── hooks/
│   ├── useUsageData.js  # データ取得フック
│   ├── useCache.js      # キャッシュフック
│   └── useErrorHandler.js
├── services/
│   ├── api.js           # API呼び出し
│   └── formatters.js    # データフォーマッター
├── utils/
│   ├── constants.js     # 定数定義
│   └── helpers.js       # ヘルパー関数
└── styles/
    ├── globals.css
    ├── components.css
    └── themes.css
```

## 実装手順

### ステップ1: バックエンド分離

1. **services/の作成**
   ```javascript
   // services/pricingService.js
   class PricingService {
     static calculateCost(usage, model) {
       const rates = this.getRatesForModel(model);
       return {
         inputCost: usage.input_tokens * rates.input,
         outputCost: usage.output_tokens * rates.output,
         cacheCost: usage.cache_tokens * rates.cache
       };
     }
   }
   ```

2. **routes/の作成**
   ```javascript
   // routes/usage.js
   const express = require('express');
   const UsageService = require('../services/usageService');
   
   const router = express.Router();
   
   router.get('/', async (req, res, next) => {
     try {
       const data = await UsageService.getUsageData();
       res.json(data);
     } catch (error) {
       next(error);
     }
   });
   ```

3. **middleware/の作成**
   ```javascript
   // middleware/errorHandler.js
   module.exports = (err, req, res, next) => {
     console.error(err.stack);
     res.status(500).json({
       error: 'Internal Server Error',
       message: process.env.NODE_ENV === 'development' ? err.message : undefined
     });
   };
   ```

### ステップ2: フロントエンド分離

1. **コンポーネント分割**
   ```jsx
   // components/summary/SummarySection.jsx
   import SummaryCard from './SummaryCard';
   
   const SummarySection = ({ summary }) => (
     <div className="summary-section">
       <h2>使用量サマリー</h2>
       <div className="summary-grid">
         <SummaryCard title="MCPセッション数" value={summary.totalMcpSessions} />
         <SummaryCard title="Todoファイル数" value={summary.totalTodoFiles} />
         {/* 他のサマリーカード */}
       </div>
     </div>
   );
   ```

2. **カスタムフック作成**
   ```jsx
   // hooks/useUsageData.js
   import { useState, useEffect } from 'react';
   import { fetchUsageData } from '../services/api';
   
   export const useUsageData = () => {
     const [data, setData] = useState(null);
     const [loading, setLoading] = useState(true);
     const [error, setError] = useState(null);
   
     const refresh = async () => {
       try {
         setLoading(true);
         const result = await fetchUsageData();
         setData(result);
       } catch (err) {
         setError(err.message);
       } finally {
         setLoading(false);
       }
     };
   
     useEffect(() => { refresh(); }, []);
   
     return { data, loading, error, refresh };
   };
   ```

### ステップ3: 設定の外部化

1. **config/paths.js**
   ```javascript
   const os = require('os');
   const path = require('path');
   
   module.exports = {
     mcpLogs: process.env.MCP_LOGS_PATH || 
              path.join(os.homedir(), 'Library/Caches/claude-cli-nodejs/*/mcp-logs-ide'),
     todos: process.env.TODOS_PATH || 
            path.join(os.homedir(), '.claude/todos'),
     vsCodeLogs: process.env.VSCODE_LOGS_PATH || 
                 path.join(os.homedir(), 'Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks'),
     projects: process.env.PROJECTS_PATH || 
               path.join(os.homedir(), '.claude/projects')
   };
   ```

2. **config/pricing.js**
   ```javascript
   module.exports = {
     models: {
       'claude-3-sonnet': {
         input: 0.000003,
         output: 0.000015,
         cacheCreate: 0.00000375,
         cacheRead: 0.0000003
       },
       'claude-3-opus': {
         input: 0.000015,
         output: 0.000075,
         cacheCreate: 0.00001875,
         cacheRead: 0.0000015
       }
     }
   };
   ```

## 移行のメリット

### 保守性
- 各ファイルが単一責任を持つ
- 機能ごとに整理されたコード
- テストが書きやすい構造

### 拡張性
- 新機能の追加が容易
- 既存コードへの影響を最小化
- モジュールの再利用が可能

### パフォーマンス
- 必要な部分のみの読み込み
- 効率的なキャッシュ戦略
- 並列処理の最適化

### セキュリティ
- 入力検証の統一
- セキュリティポリシーの一元管理
- 監査ログの実装

## 注意点

1. **段階的な移行**: 一度にすべてを変更せず、段階的に実施
2. **既存機能の維持**: リファクタリング中も機能が動作することを確認
3. **テストの並行実装**: 新しい構造に対するテストを同時に作成
4. **ドキュメントの更新**: 変更内容を適切にドキュメント化