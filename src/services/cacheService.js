const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const { CLAUDE_PATHS, APP_CONFIG } = require('../config/paths');

/**
 * キャッシュサービス
 */
class CacheService {
  constructor() {
    this.dataCache = new Map();
    this.cacheTimestamp = null;
  }

  /**
   * ファイルハッシュを計算してキャッシュの有効性を確認
   */
  async getFilesHash() {
    try {
      const projectDirs = await fs.readdir(CLAUDE_PATHS.projects);
      let hashString = '';
      
      for (const projectDir of projectDirs) {
        const projectPath = path.join(CLAUDE_PATHS.projects, projectDir);
        const stats = await fs.stat(projectPath);
        
        if (stats.isDirectory()) {
          const files = await fs.readdir(projectPath);
          for (const file of files) {
            if (file.endsWith('.jsonl')) {
              const filePath = path.join(projectPath, file);
              const fileStats = await fs.stat(filePath);
              hashString += `${filePath}:${fileStats.mtime.getTime()};`;
            }
          }
        }
      }
      
      return crypto.createHash('md5').update(hashString).digest('hex');
    } catch (error) {
      console.warn('Failed to generate files hash:', error.message);
      return null;
    }
  }

  /**
   * キャッシュの有効性をチェック
   */
  async isCacheValid() {
    if (!this.cacheTimestamp || Date.now() - this.cacheTimestamp > APP_CONFIG.cacheTimeout) {
      return false;
    }
    
    const currentHash = await this.getFilesHash();
    const cachedHash = this.dataCache.get('filesHash');
    
    return currentHash === cachedHash;
  }

  /**
   * データをキャッシュに保存
   */
  async setCache(key, data) {
    const filesHash = await this.getFilesHash();
    this.dataCache.set(key, data);
    this.dataCache.set('filesHash', filesHash);
    this.cacheTimestamp = Date.now();
  }

  /**
   * キャッシュからデータを取得
   */
  getCache(key) {
    return this.dataCache.get(key);
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.dataCache.clear();
    this.cacheTimestamp = null;
  }
}

// シングルトンインスタンス
const cacheService = new CacheService();

module.exports = cacheService;