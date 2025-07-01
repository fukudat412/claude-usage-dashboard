/**
 * シンプルなタイムベースキャッシュサービス
 * 個人用ダッシュボード向けに簡素化されたキャッシュ実装
 */
class SimpleCacheService {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5分
  }

  /**
   * データをキャッシュに保存
   * @param {string} key - キャッシュキー
   * @param {any} value - 保存するデータ
   * @param {number} ttl - TTL（ミリ秒）、省略時はデフォルト値
   */
  setCache(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
  }

  /**
   * キャッシュからデータを取得
   * @param {string} key - キャッシュキー
   * @returns {any|null} キャッシュされたデータまたはnull
   */
  getCache(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 期限切れのキャッシュエントリを削除
   */
  cleanup() {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * キャッシュサイズを取得
   */
  getSize() {
    return this.cache.size;
  }
}

// シングルトンインスタンス
const cacheService = new SimpleCacheService();

module.exports = cacheService;