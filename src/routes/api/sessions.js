const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { listSessions, getSessionMessages } = require('../../services/sessionService');
const cacheService = require('../../services/cacheService');

// GET /api/v2/sessions?project=<name> — プロジェクト内のセッション一覧
router.get('/', asyncHandler(async (req, res) => {
  const { project } = req.query;
  const cacheKey = `sessions:${project}`;
  const cached = cacheService.getCache(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  const sessions = await listSessions(project);
  const result = { project, sessions };
  cacheService.setCache(cacheKey, result, 60 * 1000); // 1分キャッシュ
  res.json(result);
}));

// GET /api/v2/sessions/content?project=<name>&session=<id> — 会話内容
router.get('/content', asyncHandler(async (req, res) => {
  const { project, session } = req.query;
  const result = await getSessionMessages(project, session);
  res.json(result);
}));

module.exports = router;
