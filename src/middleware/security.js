const helmet = require('helmet');
const cors = require('cors');

/**
 * セキュリティミドルウェアの設定
 */
function configureSecurityMiddleware(app) {
  // Helmet.jsによるセキュリティヘッダー設定
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // インライン CSS を許可
        scriptSrc: ["'self'"], // 信頼できるスクリプトのみ
        imgSrc: ["'self'", "data:", "blob:"], // 画像とデータURL
        connectSrc: ["'self'", "ws:", "wss:"], // WebSocket接続を許可
        fontSrc: ["'self'"], // フォントファイル
        objectSrc: ["'none'"], // オブジェクト埋め込みを禁止
        mediaSrc: ["'self'"], // メディアファイル
        frameSrc: ["'none'"], // フレーム埋め込みを禁止
        baseUri: ["'self'"], // ベースURIを制限
        formAction: ["'self'"] // フォーム送信先を制限
      }
    },
    crossOriginEmbedderPolicy: false, // WebSocketとの互換性のため
    hsts: {
      maxAge: 31536000, // 1年間
      includeSubDomains: true,
      preload: true
    },
    noSniff: true, // MIME タイプスニッフィングを防止
    frameguard: { action: 'deny' }, // クリックジャッキング防止
    xssFilter: true, // XSS フィルターを有効化
    referrerPolicy: { policy: 'same-origin' } // リファラーポリシー
  }));

  // CORS設定
  app.use(cors({
    origin: function(origin, callback) {
      // 開発環境では複数のオリジンを許可
      const allowedOrigins = process.env.NODE_ENV === 'production' 
        ? ['http://localhost:3001'] 
        : ['http://localhost:3000', 'http://localhost:3001'];
      
      // オリジンが未定義（直接アクセス）または許可リストに含まれる場合
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS policy violation'));
      }
    },
    credentials: true, // 認証情報の送信を許可
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 許可するHTTPメソッド
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // 許可するヘッダー
    maxAge: 86400 // プリフライトリクエストのキャッシュ時間（24時間）
  }));

  // レート制限（基本的な実装）
  const requestCounts = new Map();
  const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15分
  const RATE_LIMIT_MAX_REQUESTS = 1000; // 15分間に1000リクエスト

  app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    // 古いエントリを削除
    for (const [ip, requests] of requestCounts.entries()) {
      const filteredRequests = requests.filter(timestamp => timestamp > windowStart);
      if (filteredRequests.length === 0) {
        requestCounts.delete(ip);
      } else {
        requestCounts.set(ip, filteredRequests);
      }
    }

    // 現在のIPのリクエスト履歴を取得
    const ipRequests = requestCounts.get(clientIP) || [];
    
    // レート制限チェック
    if (ipRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW / 1000)
      });
    }

    // 新しいリクエストを記録
    ipRequests.push(now);
    requestCounts.set(clientIP, ipRequests);

    // レート制限ヘッダーを追加
    res.set({
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS,
      'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT_MAX_REQUESTS - ipRequests.length),
      'X-RateLimit-Reset': new Date(now + RATE_LIMIT_WINDOW).toISOString()
    });

    next();
  });

  // セキュリティ関連のカスタムヘッダー
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Download-Options': 'noopen',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    });
    next();
  });
}

module.exports = { configureSecurityMiddleware };