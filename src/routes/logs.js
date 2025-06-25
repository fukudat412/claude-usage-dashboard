const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const router = express.Router();
const { asyncHandler, validateFilePath, AppError } = require('../middleware/errorHandler');
const { ALLOWED_PATHS, APP_CONFIG } = require('../config/paths');

/**
 * ログファイルの内容を取得するAPI
 */
router.get('/content', asyncHandler(async (req, res) => {
  const { file } = req.query;
  
  // 入力検証
  validateFilePath(file);
  
  // ファイルパスのサニタイゼーション - パストラバーサル攻撃を防ぐ
  const normalizedFile = path.normalize(file);
  
  // 危険な文字列をチェック
  if (normalizedFile.includes('..') || normalizedFile.includes('~')) {
    throw new AppError('Invalid file path', 400, 'UNSAFE_FILE_PATH');
  }

  // セキュリティのため、許可されたディレクトリのみアクセス可能
  const resolvedFile = path.resolve(normalizedFile);
  const isAllowed = ALLOWED_PATHS.some(allowedPath => {
    const resolvedAllowed = path.resolve(allowedPath);
    return resolvedFile.startsWith(resolvedAllowed);
  });

  if (!isAllowed) {
    throw new AppError('Access denied to this path', 403, 'ACCESS_DENIED');
  }

  // ファイルの存在確認
  if (!(await fs.pathExists(resolvedFile))) {
    throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
  }

  // ファイルサイズ制限
  const stats = await fs.stat(resolvedFile);
  if (stats.size > APP_CONFIG.maxFileSize) {
    throw new AppError('File too large', 413, 'FILE_TOO_LARGE');
  }

  const content = await fs.readFile(resolvedFile, 'utf8');
  
  // JSONファイルの場合はパースして整形
  let formattedContent = content;
  if (file.endsWith('.json')) {
    try {
      // 複数のJSONオブジェクトが改行で区切られている場合
      if (content.includes('}\n{')) {
        const objects = content.split('\n').filter(line => line.trim());
        formattedContent = objects.map(obj => {
          try {
            return JSON.stringify(JSON.parse(obj), null, 2);
          } catch {
            return obj;
          }
        }).join('\n\n');
      } else {
        // 通常のJSONファイル
        const parsed = JSON.parse(content);
        formattedContent = JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      // パースできない場合はそのまま返す
      console.warn('Failed to parse JSON file:', e.message);
    }
  }

  res.json({ 
    content: formattedContent,
    size: stats.size,
    mtime: stats.mtime
  });
}));

module.exports = router;