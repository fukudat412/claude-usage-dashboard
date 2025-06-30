const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../../middleware/errorHandler');
const { processProjectData } = require('../../services/projectService');
const cacheService = require('../../services/cacheService');

/**
 * ページネーション用のヘルパー関数
 */
function paginateArray(array, page = 1, limit = 20) {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = array.slice(startIndex, endIndex);
  
  return {
    data: paginatedItems,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      itemsPerPage: limit,
      hasNext: endIndex < array.length,
      hasPrev: page > 1
    }
  };
}

/**
 * プロジェクト一覧を取得
 */
router.get('/', asyncHandler(async (req, res) => {
  console.log('Fetching projects data...');
  
  // クエリパラメータ
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const sortBy = req.query.sortBy || 'lastActivity'; // lastActivity, totalCost, totalTokens, name
  const sortOrder = req.query.sortOrder || 'desc';
  const minCost = parseFloat(req.query.minCost) || 0;
  const search = req.query.search;
  
  // バリデーション
  if (page < 1 || limit < 1 || limit > 200) {
    return res.status(400).json({
      error: 'Invalid pagination parameters',
      message: 'Page must be >= 1, limit must be between 1 and 200'
    });
  }
  
  const validSortFields = ['lastActivity', 'totalCost', 'totalTokens', 'name', 'messageCount'];
  if (!validSortFields.includes(sortBy)) {
    return res.status(400).json({
      error: 'Invalid sort field',
      message: `sortBy must be one of: ${validSortFields.join(', ')}`
    });
  }
  
  if (!['asc', 'desc'].includes(sortOrder)) {
    return res.status(400).json({
      error: 'Invalid sort order',
      message: 'sortOrder must be "asc" or "desc"'
    });
  }
  
  // キャッシュチェック
  const cacheKey = `projects_${page}_${limit}_${sortBy}_${sortOrder}_${minCost}_${search || 'all'}`;
  const cachedData = cacheService.getCache(cacheKey);
  if (cachedData && await cacheService.isCacheValid()) {
    console.log('Returning cached projects data');
    return res.json(cachedData);
  }
  
  console.log('Generating fresh projects data...');
  const startTime = Date.now();
  
  const projectData = await processProjectData();
  let projects = projectData.projects || [];
  
  // フィルタリング
  if (minCost > 0) {
    projects = projects.filter(project => parseFloat(project.totalCost) >= minCost);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    projects = projects.filter(project => 
      project.name.toLowerCase().includes(searchLower)
    );
  }
  
  // ソート
  projects.sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'lastActivity':
        aVal = new Date(a.lastActivity);
        bVal = new Date(b.lastActivity);
        break;
      case 'totalCost':
        aVal = parseFloat(a.totalCost);
        bVal = parseFloat(b.totalCost);
        break;
      case 'totalTokens':
        aVal = a.totalTokens;
        bVal = b.totalTokens;
        break;
      case 'messageCount':
        aVal = a.messageCount;
        bVal = b.messageCount;
        break;
      case 'name':
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
        break;
      default:
        aVal = a[sortBy];
        bVal = b[sortBy];
    }
    
    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
  
  // ページネーション適用
  const result = paginateArray(projects, page, limit);
  
  // 統計情報を追加
  result.stats = {
    totalProjects: projects.length,
    totalCost: projects.reduce((sum, p) => sum + parseFloat(p.totalCost), 0).toFixed(2),
    totalTokens: projects.reduce((sum, p) => sum + p.totalTokens, 0),
    totalMessages: projects.reduce((sum, p) => sum + p.messageCount, 0),
    activeProjects: projects.filter(p => {
      const lastActivity = new Date(p.lastActivity);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return lastActivity > thirtyDaysAgo;
    }).length
  };
  
  // キャッシュに保存
  await cacheService.setCache(cacheKey, result, 5 * 60 * 1000); // 5分キャッシュ
  
  console.log(`Projects data generated in ${Date.now() - startTime}ms`);
  res.json(result);
}));

/**
 * 特定プロジェクトの詳細データを取得
 */
router.get('/:projectName', asyncHandler(async (req, res) => {
  const { projectName } = req.params;
  
  console.log(`Fetching detailed data for project: ${projectName}`);
  
  const projectData = await processProjectData();
  const project = projectData.projects.find(p => p.name === projectName);
  
  if (!project) {
    return res.status(404).json({
      error: 'Project not found',
      message: `No data found for project: ${projectName}`
    });
  }
  
  // プロジェクトの詳細統計を計算
  const dailyUsageForProject = projectData.dailyUsage.filter(day => 
    day.sessions && day.sessions.some(session => session.project === projectName)
  );
  
  const detailedProject = {
    ...project,
    dailyBreakdown: dailyUsageForProject.slice(0, 30), // 最新30日
    trends: {
      tokensPerDay: dailyUsageForProject.slice(-7).map(day => ({
        date: day.date,
        tokens: day.sessions
          .filter(s => s.project === projectName)
          .reduce((sum, s) => sum + s.totalTokens, 0)
      })),
      costPerDay: dailyUsageForProject.slice(-7).map(day => ({
        date: day.date,
        cost: day.sessions
          .filter(s => s.project === projectName)
          .reduce((sum, s) => sum + parseFloat(s.cost || 0), 0)
      }))
    }
  };
  
  res.json(detailedProject);
}));

module.exports = router;