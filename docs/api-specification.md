# API仕様書

## 概要

Claude Usage Dashboard API v2では、データを効率的に取得するために分割されたエンドポイントとページネーション機能を提供します。

## ベースURL

```
http://localhost:3001/api/v2
```

## 共通仕様

### ページネーション

多くのエンドポイントでページネーションをサポートしています。

**クエリパラメータ:**
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりのアイテム数（エンドポイントごとに上限あり）

**レスポンス形式:**
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalItems": 250,
    "itemsPerPage": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### エラーレスポンス

```json
{
  "error": "エラータイプ",
  "message": "詳細なエラーメッセージ"
}
```

## エンドポイント

### 1. サマリーデータ

**GET** `/api/v2/summary`

使用量の概要データを取得します。

**レスポンス:**
```json
{
  "totalMcpSessions": 150,
  "totalTodoFiles": 45,
  "totalVsCodeTasks": 89,
  "totalSize": 2048576,
  "totalMessages": 340,
  "totalConversations": 25,
  "totalTokens": 125000,
  "totalCost": "25.50",
  "lastActivity": "2024-06-30T10:30:00Z"
}
```

### 2. 日別使用量

**GET** `/api/v2/daily`

日別の使用量データを取得します。

**クエリパラメータ:**
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりのアイテム数（最大: 1000、デフォルト: 50）
- `startDate`: 開始日（YYYY-MM-DD形式）
- `endDate`: 終了日（YYYY-MM-DD形式）

**レスポンス:**
```json
{
  "data": [
    {
      "date": "2024-06-30",
      "totalTokens": 5000,
      "inputTokens": 3000,
      "outputTokens": 2000,
      "cachedTokens": 500,
      "cost": "1.25",
      "sessions": 3
    }
  ],
  "pagination": { ... }
}
```

**GET** `/api/v2/daily/:date`

特定日の詳細データを取得します。

### 3. 月別使用量

**GET** `/api/v2/monthly`

月別の使用量データを取得します。

**クエリパラメータ:**
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりのアイテム数（最大: 120、デフォルト: 12）
- `year`: 年でフィルタ（例: 2024）

**レスポンス:**
```json
{
  "data": [
    {
      "month": "2024-06",
      "totalTokens": 150000,
      "inputTokens": 90000,
      "outputTokens": 60000,
      "cachedTokens": 15000,
      "cost": "37.50",
      "sessions": 45,
      "messages": 380
    }
  ],
  "pagination": { ... }
}
```

**GET** `/api/v2/monthly/:month`

特定月の詳細データを取得します（月は YYYY-MM 形式）。

### 4. MCPデータ

**GET** `/api/v2/mcp/logs`

MCPログデータを取得します。

**クエリパラメータ:**
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりのアイテム数（最大: 500、デフォルト: 50）
- `sessionId`: セッションIDでフィルタ

**レスポンス:**
```json
{
  "data": [
    {
      "file": "session-123.json",
      "timestamp": "2024-06-30T10:30:00Z",
      "size": 2048,
      "entries": 15,
      "sessionId": "session-123"
    }
  ],
  "pagination": { ... }
}
```

**GET** `/api/v2/mcp/tools`

MCPツール使用統計を取得します。

**レスポンス:**
```json
{
  "totalCalls": 1250,
  "uniqueTools": 8,
  "tools": [
    {
      "name": "getDiagnostics",
      "count": 450,
      "sessionCount": 25,
      "firstUsed": "2024-06-01T09:00:00Z",
      "lastUsed": "2024-06-30T15:30:00Z"
    }
  ],
  "sessions": [...]
}
```

**GET** `/api/v2/mcp/tools/:toolName`

特定ツールの詳細統計を取得します。

### 5. プロジェクトデータ

**GET** `/api/v2/projects`

プロジェクト一覧を取得します。

**クエリパラメータ:**
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりのアイテム数（最大: 200、デフォルト: 20）
- `sortBy`: ソートフィールド（lastActivity, totalCost, totalTokens, name, messageCount）
- `sortOrder`: ソート順（asc, desc）
- `minCost`: 最小コストでフィルタ
- `search`: プロジェクト名で検索

**レスポンス:**
```json
{
  "data": [
    {
      "name": "my-project",
      "totalTokens": 25000,
      "totalCost": "6.25",
      "messageCount": 45,
      "lastActivity": "2024-06-30T15:30:00Z"
    }
  ],
  "pagination": { ... },
  "stats": {
    "totalProjects": 15,
    "totalCost": "125.50",
    "totalTokens": 500000,
    "totalMessages": 750,
    "activeProjects": 8
  }
}
```

**GET** `/api/v2/projects/:projectName`

特定プロジェクトの詳細データを取得します。

## キャッシュ戦略

- サマリーデータ: 5分キャッシュ
- 日別/月別データ: 5-10分キャッシュ
- MCPデータ: 3-5分キャッシュ
- プロジェクトデータ: 5分キャッシュ

## レート制限

- 15分間に1000リクエスト
- 超過時は429ステータスコードを返却

## 移行ガイド

### v1からv2への移行

**v1 (レガシー):**
```
GET /api/usage
```

**v2 (推奨):**
```
GET /api/v2/summary          # サマリーのみ
GET /api/v2/daily?limit=30   # 日別データ
GET /api/v2/monthly          # 月別データ
GET /api/v2/mcp/logs         # MCPログ
GET /api/v2/projects         # プロジェクト
```

v2 APIの利点:
- ページネーション対応
- フィルタリング機能
- より高速なレスポンス
- キャッシュ最適化
- 詳細なエラーハンドリング