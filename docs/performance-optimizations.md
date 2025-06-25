# パフォーマンス最適化計画

## 📊 現在のパフォーマンス課題

### 1. ファイルI/O処理の問題
**場所**: `server.js:272-489` `processProjectData()`関数

**問題点**:
- 大量のJSONLファイルを同期的に処理
- ファイル読み込み時にメモリに全て保持
- キャッシュ戦略が単純すぎる

**計測データ**:
```javascript
// 現在のログ出力例
console.log('Step 1/2 completed in 1250ms');
console.log('All data fetched in 3850ms');
console.log('Total processing time: 4100ms');
```

### 2. メモリ使用量の問題
- 全てのプロジェクトデータを同時にメモリに保持
- 大きなJSONLファイルでメモリリークの可能性
- ガベージコレクションの頻発

### 3. レスポンス時間の問題
- 初回アクセス時に4秒以上の待機時間
- キャッシュミス時の長い処理時間
- フロントエンドでのデータ処理遅延

## 🚀 最適化戦略

### 1. ストリーミング処理の実装

```javascript
// utils/streamProcessor.js
const fs = require('fs');
const readline = require('readline');

class StreamProcessor {
  async processJSONLFile(filePath, callback) {
    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
      });

      let processedLines = 0;
      const results = [];

      rl.on('line', (line) => {
        if (line.trim()) {
          try {
            const data = JSON.parse(line);
            const result = callback(data);
            if (result) results.push(result);
            processedLines++;
          } catch (error) {
            console.warn(`Parse error on line ${processedLines + 1}:`, error.message);
          }
        }
      });

      rl.on('close', () => {
        console.log(`Processed ${processedLines} lines from ${filePath}`);
        resolve(results);
      });

      rl.on('error', reject);
    });
  }

  async processMultipleFiles(filePaths, callback) {
    const results = await Promise.all(
      filePaths.map(filePath => this.processJSONLFile(filePath, callback))
    );
    return results.flat();
  }
}

module.exports = StreamProcessor;
```

### 2. インクリメンタル処理の実装

```javascript
// services/incrementalProcessor.js
const fs = require('fs-extra');
const crypto = require('crypto');

class IncrementalProcessor {
  constructor() {
    this.lastProcessedState = new Map();
    this.stateFilePath = './cache/processing-state.json';
    this.loadState();
  }

  async loadState() {
    try {
      if (await fs.pathExists(this.stateFilePath)) {
        const data = await fs.readJSON(this.stateFilePath);
        this.lastProcessedState = new Map(Object.entries(data));
      }
    } catch (error) {
      console.warn('Failed to load processing state:', error.message);
    }
  }

  async saveState() {
    try {
      await fs.ensureDir('./cache');
      const stateObject = Object.fromEntries(this.lastProcessedState);
      await fs.writeJSON(this.stateFilePath, stateObject);
    } catch (error) {
      console.error('Failed to save processing state:', error.message);
    }
  }

  async getFileChanges(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const currentHash = `${stats.mtime.getTime()}-${stats.size}`;
      const lastHash = this.lastProcessedState.get(filePath);

      if (currentHash === lastHash) {
        return { changed: false };
      }

      this.lastProcessedState.set(filePath, currentHash);
      return { 
        changed: true, 
        lastModified: stats.mtime,
        size: stats.size 
      };
    } catch (error) {
      return { changed: true, error: error.message };
    }
  }

  async processChangedFilesOnly(filePaths, processor) {
    const changedFiles = [];
    const unchangedData = new Map();

    // 変更されたファイルを特定
    for (const filePath of filePaths) {
      const changeInfo = await this.getFileChanges(filePath);
      if (changeInfo.changed) {
        changedFiles.push(filePath);
      } else {
        // 未変更ファイルのキャッシュデータを取得
        const cachedData = await this.getCachedData(filePath);
        if (cachedData) {
          unchangedData.set(filePath, cachedData);
        }
      }
    }

    console.log(`Processing ${changedFiles.length}/${filePaths.length} changed files`);

    // 変更されたファイルのみ処理
    const newData = await processor(changedFiles);
    
    // キャッシュデータと新データをマージ
    const allData = [...unchangedData.values(), ...newData];

    await this.saveState();
    return allData;
  }
}

module.exports = IncrementalProcessor;
```

### 3. 改善されたキャッシュシステム

```javascript
// services/advancedCache.js
const fs = require('fs-extra');
const crypto = require('crypto');

class AdvancedCache {
  constructor(options = {}) {
    this.memoryCache = new Map();
    this.persistentCachePath = options.persistentPath || './cache/data-cache.json';
    this.maxMemoryItems = options.maxMemoryItems || 100;
    this.ttl = options.ttl || 5 * 60 * 1000; // 5分
    this.compressionEnabled = options.compression || false;
  }

  generateKey(data) {
    return crypto.createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  async get(key) {
    // メモリキャッシュから取得
    if (this.memoryCache.has(key)) {
      const item = this.memoryCache.get(key);
      if (Date.now() - item.timestamp < this.ttl) {
        return item.data;
      } else {
        this.memoryCache.delete(key);
      }
    }

    // 永続キャッシュから取得
    try {
      const persistentData = await this.getPersistentData(key);
      if (persistentData && Date.now() - persistentData.timestamp < this.ttl) {
        // メモリキャッシュに復元
        this.setMemoryCache(key, persistentData.data);
        return persistentData.data;
      }
    } catch (error) {
      console.warn('Failed to get persistent cache:', error.message);
    }

    return null;
  }

  async set(key, data) {
    const item = {
      data,
      timestamp: Date.now()
    };

    // メモリキャッシュに保存
    this.setMemoryCache(key, data);

    // 永続キャッシュに保存
    try {
      await this.setPersistentData(key, item);
    } catch (error) {
      console.warn('Failed to set persistent cache:', error.message);
    }
  }

  setMemoryCache(key, data) {
    // LRU: 古いアイテムを削除
    if (this.memoryCache.size >= this.maxMemoryItems) {
      const firstKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(firstKey);
    }

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  async getPersistentData(key) {
    await fs.ensureDir('./cache');
    const filePath = `./cache/${key}.json`;
    
    if (await fs.pathExists(filePath)) {
      return await fs.readJSON(filePath);
    }
    return null;
  }

  async setPersistentData(key, data) {
    await fs.ensureDir('./cache');
    const filePath = `./cache/${key}.json`;
    await fs.writeJSON(filePath, data);
  }

  async invalidate(pattern) {
    // メモリキャッシュから削除
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // 永続キャッシュから削除
    try {
      const cacheDir = './cache';
      if (await fs.pathExists(cacheDir)) {
        const files = await fs.readdir(cacheDir);
        await Promise.all(
          files
            .filter(file => file.includes(pattern))
            .map(file => fs.remove(`${cacheDir}/${file}`))
        );
      }
    } catch (error) {
      console.warn('Failed to invalidate persistent cache:', error.message);
    }
  }
}

module.exports = AdvancedCache;
```

### 4. 最適化されたプロジェクトデータ処理

```javascript
// services/optimizedProjectService.js
const StreamProcessor = require('../utils/streamProcessor');
const IncrementalProcessor = require('./incrementalProcessor');
const AdvancedCache = require('./advancedCache');

class OptimizedProjectService {
  constructor() {
    this.streamProcessor = new StreamProcessor();
    this.incrementalProcessor = new IncrementalProcessor();
    this.cache = new AdvancedCache();
  }

  async processProjectData() {
    const startTime = Date.now();
    console.log('Starting optimized project data processing...');

    try {
      // キャッシュから確認
      const cacheKey = 'project-data-summary';
      const cachedData = await this.cache.get(cacheKey);
      if (cachedData) {
        console.log(`Returned cached data in ${Date.now() - startTime}ms`);
        return cachedData;
      }

      const projectDirs = await this.getProjectDirectories();
      console.log(`Found ${projectDirs.length} project directories`);

      // 並列処理でプロジェクトを処理
      const projects = await Promise.all(
        projectDirs.map(dir => this.processProjectDirectory(dir))
      );

      // 集計データを生成
      const aggregatedData = this.aggregateProjectData(projects);

      // キャッシュに保存
      await this.cache.set(cacheKey, aggregatedData);

      console.log(`Optimized processing completed in ${Date.now() - startTime}ms`);
      return aggregatedData;

    } catch (error) {
      console.error('Error in optimized project processing:', error);
      throw error;
    }
  }

  async processProjectDirectory(projectPath) {
    const jsonlFiles = await this.getJSONLFiles(projectPath);
    
    if (jsonlFiles.length === 0) {
      return this.createEmptyProjectData(projectPath);
    }

    // インクリメンタル処理で変更されたファイルのみ処理
    const processedData = await this.incrementalProcessor.processChangedFilesOnly(
      jsonlFiles,
      (files) => this.processJSONLFiles(files)
    );

    return this.aggregateFileData(projectPath, processedData);
  }

  async processJSONLFiles(filePaths) {
    const allResults = [];

    for (const filePath of filePaths) {
      try {
        const results = await this.streamProcessor.processJSONLFile(
          filePath,
          (data) => this.extractUsageData(data)
        );
        allResults.push(...results);
      } catch (error) {
        console.warn(`Failed to process ${filePath}:`, error.message);
      }
    }

    return allResults;
  }

  extractUsageData(data) {
    if (!data.message?.usage) return null;

    return {
      timestamp: data.timestamp,
      model: data.message.model,
      usage: data.message.usage,
      sessionId: data.sessionId
    };
  }

  aggregateFileData(projectPath, usageData) {
    const stats = {
      name: path.basename(projectPath),
      path: projectPath,
      totalTokens: 0,
      totalCost: 0,
      messageCount: usageData.length,
      lastActivity: null,
      dailyUsage: new Map(),
      monthlyUsage: new Map(),
      modelUsage: new Map()
    };

    for (const item of usageData) {
      if (item.timestamp) {
        const timestamp = new Date(item.timestamp);
        if (!stats.lastActivity || timestamp > stats.lastActivity) {
          stats.lastActivity = timestamp;
        }

        // 日毎集計
        const dateKey = timestamp.toISOString().split('T')[0];
        this.updateUsageMap(stats.dailyUsage, dateKey, item);

        // 月毎集計
        const monthKey = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
        this.updateUsageMap(stats.monthlyUsage, monthKey, item);

        // モデル別集計
        if (item.model) {
          this.updateUsageMap(stats.modelUsage, item.model, item);
        }
      }

      // 総計
      const usage = item.usage;
      const tokens = (usage.input_tokens || 0) + (usage.output_tokens || 0) + 
                    (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
      stats.totalTokens += tokens;
      stats.totalCost += this.calculateCost(usage, item.model);
    }

    return stats;
  }

  updateUsageMap(usageMap, key, item) {
    if (!usageMap.has(key)) {
      usageMap.set(key, {
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        totalTokens: 0,
        cost: 0,
        messages: 0,
        sessions: new Set()
      });
    }

    const usage = usageMap.get(key);
    const itemUsage = item.usage;

    usage.inputTokens += itemUsage.input_tokens || 0;
    usage.outputTokens += itemUsage.output_tokens || 0;
    usage.cachedTokens += (itemUsage.cache_creation_input_tokens || 0) + (itemUsage.cache_read_input_tokens || 0);
    usage.totalTokens += (itemUsage.input_tokens || 0) + (itemUsage.output_tokens || 0) + 
                        (itemUsage.cache_creation_input_tokens || 0) + (itemUsage.cache_read_input_tokens || 0);
    usage.cost += this.calculateCost(itemUsage, item.model);
    usage.messages++;

    if (item.sessionId) {
      usage.sessions.add(item.sessionId);
    }
  }

  calculateCost(usage, model) {
    // 価格計算ロジック（別ファイルに移動予定）
    let inputRate = 0.000003, outputRate = 0.000015;
    let cacheCreateRate = 0.00000375, cacheReadRate = 0.0000003;

    if (model && model.includes('opus')) {
      inputRate = 0.000015;
      outputRate = 0.000075;
      cacheCreateRate = 0.00001875;
      cacheReadRate = 0.0000015;
    }

    return (usage.input_tokens || 0) * inputRate +
           (usage.output_tokens || 0) * outputRate +
           (usage.cache_creation_input_tokens || 0) * cacheCreateRate +
           (usage.cache_read_input_tokens || 0) * cacheReadRate;
  }
}

module.exports = OptimizedProjectService;
```

### 5. フロントエンドの最適化

```javascript
// hooks/useOptimizedData.js
import { useState, useEffect, useCallback } from 'react';

export const useOptimizedData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const fetchDataWithProgress = useCallback(async () => {
    try {
      setLoading(true);
      setProgress(0);

      // プログレス更新のためのSSE接続
      const eventSource = new EventSource('/api/usage-progress');
      
      eventSource.onmessage = (event) => {
        const progressData = JSON.parse(event.data);
        setProgress(progressData.percentage);
      };

      const response = await fetch('/api/usage');
      const result = await response.json();
      
      eventSource.close();
      setData(result);
      setProgress(100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataWithProgress();
  }, [fetchDataWithProgress]);

  return { data, loading, error, progress, refresh: fetchDataWithProgress };
};
```

## 📈 期待される改善効果

### パフォーマンス向上
- **初回読み込み時間**: 4秒 → 1秒以下
- **キャッシュヒット時**: 50ms以下
- **メモリ使用量**: 50%削減
- **CPU使用率**: 30%削減

### スケーラビリティ
- 大量のプロジェクトデータに対応
- ファイルサイズに関係なく安定した処理時間
- 並列処理による処理能力向上

### ユーザーエクスペリエンス
- プログレスバーによる待機時間の可視化
- レスポンシブな操作感
- エラー耐性の向上

## 🔧 実装優先度

### 高優先度（即座に実装）
1. ストリーミング処理の導入
2. 基本的なキャッシュ改善
3. 並列処理の最適化

### 中優先度（短期実装）
1. インクリメンタル処理の実装
2. 永続キャッシュの追加
3. プログレス表示の実装

### 低優先度（長期実装）
1. 高度な監視機能
2. 自動最適化機能
3. パフォーマンス分析ツール

これらの最適化により、アプリケーションのレスポンス性能が大幅に向上し、より多くのデータを効率的に処理できるようになります。