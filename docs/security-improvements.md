# セキュリティ改善計画

> **注記 (2026-07)**: 本ドキュメントは初期実装時のセキュリティ改善計画の記録です。
> **記載された課題はすべて対策済み**です — パストラバーサル検証・入力バリデーション・
> レート制限(15分/1000リクエスト)・Helmetによるセキュリティヘッダは実装済みで、
> 対象だった `/api/log-content` を含むv1エンドポイント自体も削除されています。
> 「現在の」とある記述は執筆当時のものです。

## 🚨 当時のセキュリティ課題

### 1. パストラバーサル脆弱性
**場所**: `server.js:544-593` `/api/log-content`エンドポイント

**問題**:
```javascript
// 現在のコード（脆弱）
const { file } = req.query;
const allowedPaths = [
  path.join(os.homedir(), 'Library/Caches/claude-cli-nodejs'),
  path.join(os.homedir(), '.claude/todos')
];
const isAllowed = allowedPaths.some(allowedPath => file.startsWith(allowedPath));
```

**リスク**:
- `../../../etc/passwd`のような相対パスでシステムファイルにアクセス可能
- symlink攻撃の可能性
- 意図しないファイルの読み取り

### 2. 入力値検証の不備
**問題**:
- ファイルパスの正規化が不十分
- ファイルサイズ制限なし
- MIME typeチェックなし

### 3. レート制限なし
**問題**:
- DoS攻撃に対して脆弱
- 大量のファイル読み取り要求をブロックできない

## 🛡️ セキュリティ強化策

### 1. 安全なパス検証の実装

```javascript
// utils/pathValidator.js
const path = require('path');
const fs = require('fs-extra');

class PathValidator {
  constructor(allowedBasePaths) {
    this.allowedBasePaths = allowedBasePaths.map(p => path.resolve(p));
  }

  async isValidPath(inputPath) {
    try {
      // パスの正規化
      const normalizedPath = path.resolve(inputPath);
      
      // 許可されたベースパス内かチェック
      const isWithinAllowedPath = this.allowedBasePaths.some(basePath => 
        normalizedPath.startsWith(basePath + path.sep) || normalizedPath === basePath
      );
      
      if (!isWithinAllowedPath) {
        return { valid: false, reason: 'Path not within allowed directories' };
      }

      // ファイルの存在確認
      const exists = await fs.pathExists(normalizedPath);
      if (!exists) {
        return { valid: false, reason: 'File does not exist' };
      }

      // symlinkチェック
      const stats = await fs.lstat(normalizedPath);
      if (stats.isSymbolicLink()) {
        const realPath = await fs.realpath(normalizedPath);
        const isRealPathAllowed = this.allowedBasePaths.some(basePath => 
          realPath.startsWith(basePath + path.sep) || realPath === basePath
        );
        if (!isRealPathAllowed) {
          return { valid: false, reason: 'Symlink points outside allowed directories' };
        }
      }

      // ファイルサイズチェック（10MB制限）
      if (stats.size > 10 * 1024 * 1024) {
        return { valid: false, reason: 'File too large' };
      }

      return { valid: true, path: normalizedPath, stats };
    } catch (error) {
      return { valid: false, reason: 'Path validation error' };
    }
  }
}

module.exports = PathValidator;
```

### 2. レート制限の実装

```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// ファイル読み取り用の厳しい制限
const fileAccessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 50, // 最大50リクエスト
  message: {
    error: 'Too many file access requests',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 一般API用の制限
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100, // 最大100リクエスト
  message: {
    error: 'Too many API requests',
    retryAfter: '15 minutes'
  }
});

module.exports = { fileAccessLimiter, apiLimiter };
```

### 3. 入力値サニタイゼーション

```javascript
// utils/sanitizer.js
const validator = require('validator');

class InputSanitizer {
  static sanitizeFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('Invalid file path');
    }

    // 危険な文字を除去
    const sanitized = filePath
      .replace(/[<>:"|?*]/g, '') // Windows禁止文字
      .replace(/\.\./g, '')      // パストラバーサル
      .trim();

    if (sanitized.length === 0) {
      throw new Error('Empty file path after sanitization');
    }

    return sanitized;
  }

  static validateAndSanitizeQuery(query) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        // XSS対策
        sanitized[key] = validator.escape(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

module.exports = InputSanitizer;
```

### 4. 改善されたログファイル読み取りエンドポイント

```javascript
// routes/logs.js
const express = require('express');
const PathValidator = require('../utils/pathValidator');
const InputSanitizer = require('../utils/sanitizer');
const { fileAccessLimiter } = require('../middleware/rateLimiter');
const config = require('../config/paths');

const router = express.Router();
const pathValidator = new PathValidator([
  config.mcpLogs,
  config.todos,
  config.vsCodeLogs
]);

router.get('/content', fileAccessLimiter, async (req, res, next) => {
  try {
    // 入力値のサニタイゼーション
    const sanitizedQuery = InputSanitizer.validateAndSanitizeQuery(req.query);
    const { file } = sanitizedQuery;

    if (!file) {
      return res.status(400).json({ 
        error: 'File path is required' 
      });
    }

    // パス検証
    const validation = await pathValidator.isValidPath(file);
    if (!validation.valid) {
      return res.status(403).json({ 
        error: 'Access denied',
        reason: validation.reason 
      });
    }

    // ファイル読み取り
    const content = await fs.readFile(validation.path, 'utf8');
    
    // JSONファイルの場合は整形
    let formattedContent = content;
    if (validation.path.endsWith('.json')) {
      try {
        if (content.includes('}\n{')) {
          // 複数JSONオブジェクト
          const objects = content.split('\n').filter(line => line.trim());
          formattedContent = objects.map(obj => {
            try {
              return JSON.stringify(JSON.parse(obj), null, 2);
            } catch {
              return obj;
            }
          }).join('\n\n');
        } else {
          // 単一JSONオブジェクト
          const parsed = JSON.parse(content);
          formattedContent = JSON.stringify(parsed, null, 2);
        }
      } catch (e) {
        // パースエラーの場合はそのまま返す
      }
    }

    res.json({ 
      content: formattedContent,
      size: validation.stats.size,
      lastModified: validation.stats.mtime
    });

  } catch (error) {
    console.error('Log file access error:', error);
    next(error);
  }
});

module.exports = router;
```

### 5. セキュリティヘッダーの追加

```javascript
// middleware/security.js
const helmet = require('helmet');

const securityMiddleware = [
  // Helmetでセキュリティヘッダー設定
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }),

  // カスタムセキュリティヘッダー
  (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  }
];

module.exports = securityMiddleware;
```

### 6. 監査ログの実装

```javascript
// utils/auditLogger.js
const fs = require('fs-extra');
const path = require('path');

class AuditLogger {
  constructor(logFile = 'security-audit.log') {
    this.logFile = path.join(process.cwd(), 'logs', logFile);
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    await fs.ensureDir(path.dirname(this.logFile));
  }

  async logFileAccess(req, filePath, success, reason = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      filePath,
      success,
      reason,
      method: req.method,
      url: req.originalUrl
    };

    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }
  }

  async logSecurityEvent(type, details, req) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type,
      details,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl
    };

    try {
      await fs.appendFile(this.logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.error('Failed to write security audit log:', error);
    }
  }
}

module.exports = AuditLogger;
```

## 📋 実装チェックリスト

### 即座に対応すべき項目
- [ ] PathValidatorクラスの実装
- [ ] レート制限の追加
- [ ] 入力値サニタイゼーションの実装
- [ ] セキュリティヘッダーの追加

### 短期間で対応する項目
- [ ] 監査ログの実装
- [ ] エラーハンドリングの改善
- [ ] ファイルサイズ制限の実装
- [ ] MIME typeチェックの追加

### 中長期で対応する項目
- [ ] セキュリティテストの実装
- [ ] 脆弱性スキャンの自動化
- [ ] セキュリティポリシーの文書化
- [ ] 定期的なセキュリティ監査

## 🚀 導入手順

1. **パッケージの追加**
   ```bash
   npm install helmet express-rate-limit validator
   ```

2. **ディレクトリ構造の作成**
   ```bash
   mkdir -p utils middleware logs
   ```

3. **段階的な実装**
   - PathValidatorから開始
   - 既存エンドポイントに段階的に適用
   - テストと検証を並行実施

4. **設定の外部化**
   - 環境変数でセキュリティ設定を管理
   - 本番環境では厳格な設定を適用

これらのセキュリティ改善により、アプリケーションの安全性が大幅に向上し、潜在的な攻撃から保護されます。