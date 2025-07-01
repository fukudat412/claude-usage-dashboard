const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { asyncHandler } = require('../../middleware/errorHandler');

const router = express.Router();

// 許可されたディレクトリのパス（セキュリティ）
const allowedPaths = [
  process.env.HOME + '/.claude',
  process.env.HOME + '/Library/Caches/claude-cli-nodejs',
  process.env.HOME + '/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev'
];

/**
 * ログファイルの内容を取得（セキュリティ保護付き）
 */
router.get('/content', asyncHandler(async (req, res) => {
  const { file } = req.query;

  if (!file) {
    return res.status(400).json({
      error: 'Missing file parameter',
      message: 'File path is required'
    });
  }

  // パストラバーサル攻撃の防止
  const resolvedPath = path.resolve(file);
  const isAllowed = allowedPaths.some(allowedPath => {
    const resolvedAllowedPath = path.resolve(allowedPath);
    return resolvedPath.startsWith(resolvedAllowedPath);
  });

  if (!isAllowed) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'File access not allowed'
    });
  }

  try {
    // ファイルの存在とサイズチェック
    const stats = await fs.stat(resolvedPath);
    if (stats.size > 10 * 1024 * 1024) { // 10MB制限
      return res.status(413).json({
        error: 'File too large',
        message: 'File size exceeds 10MB limit'
      });
    }

    // ファイル内容を読み取り
    const content = await fs.readFile(resolvedPath, 'utf8');
    
    // JSONファイルの場合はパースして整形
    let formattedContent = content;
    if (resolvedPath.endsWith('.json')) {
      try {
        const jsonData = JSON.parse(content);
        formattedContent = JSON.stringify(jsonData, null, 2);
      } catch (error) {
        // JSONパースに失敗した場合はそのまま返す
      }
    }

    res.json({
      success: true,
      data: {
        content: formattedContent,
        size: stats.size,
        modified: stats.mtime,
        path: resolvedPath
      }
    });

  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: 'File not found',
        message: 'The requested file does not exist'
      });
    }
    
    console.error('Error reading file:', error);
    res.status(500).json({
      error: 'File read error',
      message: 'Unable to read the requested file'
    });
  }
}));

module.exports = router;