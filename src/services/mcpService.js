const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { CLAUDE_PATHS } = require('../config/paths');
const { AppError } = require('../middleware/errorHandler');

/**
 * MCPログデータを取得
 */
async function getMcpLogsData() {
  try {
    const logDirs = glob.sync(CLAUDE_PATHS.mcpLogs);
    const logs = [];

    for (const dir of logDirs) {
      if (await fs.pathExists(dir)) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf8');
          
          try {
            const logData = JSON.parse(`[${content}]`);
            logs.push({
              file,
              filePath,
              timestamp: stats.mtime,
              size: stats.size,
              entries: logData.length,
              sessionId: logData[0]?.sessionId
            });
          } catch (e) {
            logs.push({
              file,
              filePath,
              timestamp: stats.mtime,
              size: stats.size,
              entries: 0,
              error: 'Parse error'
            });
          }
        }
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    console.error('Error reading MCP logs:', error);
    throw new AppError('Failed to read MCP logs', 500, 'MCP_READ_ERROR');
  }
}

/**
 * MCPツール使用統計を取得
 */
async function getMcpToolUsageStats() {
  try {
    const logDirs = glob.sync(CLAUDE_PATHS.mcpLogs);
    const toolUsage = {};
    const sessionDetails = [];
    let totalCalls = 0;

    for (const dir of logDirs) {
      if (await fs.pathExists(dir)) {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          const content = await fs.readFile(filePath, 'utf8');
          
          try {
            // ログファイルの内容を解析
            let logEntries = [];
            try {
              // まず全体をJSONとして解析を試みる
              const parsed = JSON.parse(content);
              if (Array.isArray(parsed)) {
                // 配列そのものが格納されている場合
                logEntries = parsed.flat();
              } else if (parsed) {
                logEntries = [parsed];
              }
            } catch (e) {
              try {
                // [{}] 形式で試す
                logEntries = JSON.parse(`[${content}]`);
              } catch (e2) {
                // 失敗したら行ごとに解析
                const lines = content.trim().split('\n').filter(line => line.trim());
                for (const line of lines) {
                  try {
                    const parsed = JSON.parse(line);
                    if (parsed) logEntries.push(parsed);
                  } catch (err) {
                    // 個別のエラーは無視
                  }
                }
              }
            }

            let currentSession = null;
            const sessionTools = {};

            for (const entry of logEntries) {
              try {
                
                if (entry.debug && entry.debug.includes('Calling MCP tool:')) {
                  const toolMatch = entry.debug.match(/Calling MCP tool: (\w+)/);
                  if (toolMatch) {
                    const toolName = toolMatch[1];
                    currentSession = entry.sessionId || 'unknown';
                    
                    // ツール使用統計を更新
                    if (!toolUsage[toolName]) {
                      toolUsage[toolName] = {
                        count: 0,
                        sessions: new Set(),
                        firstUsed: entry.timestamp,
                        lastUsed: entry.timestamp
                      };
                    }
                    
                    toolUsage[toolName].count++;
                    toolUsage[toolName].sessions.add(currentSession);
                    toolUsage[toolName].lastUsed = entry.timestamp;
                    totalCalls++;

                    // セッション別統計
                    if (!sessionTools[currentSession]) {
                      sessionTools[currentSession] = {
                        sessionId: currentSession,
                        tools: {},
                        startTime: entry.timestamp,
                        endTime: entry.timestamp,
                        cwd: entry.cwd,
                        file
                      };
                    }
                    
                    if (!sessionTools[currentSession].tools[toolName]) {
                      sessionTools[currentSession].tools[toolName] = 0;
                    }
                    sessionTools[currentSession].tools[toolName]++;
                    sessionTools[currentSession].endTime = entry.timestamp;
                  }
                }
              } catch (parseError) {
                // 個別のエントリ解析エラーは無視
                continue;
              }
            }

            // セッション詳細を追加
            Object.values(sessionTools).forEach(session => {
              sessionDetails.push(session);
            });

          } catch (e) {
            console.error(`Error parsing MCP log file ${file}:`, e);
          }
        }
      }
    }

    // Setをカウントに変換
    Object.keys(toolUsage).forEach(tool => {
      toolUsage[tool].sessionCount = toolUsage[tool].sessions.size;
      delete toolUsage[tool].sessions;
    });

    // 使用頻度でソート
    const sortedTools = Object.entries(toolUsage)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([name, data]) => ({ name, ...data }));

    return {
      totalCalls,
      uniqueTools: Object.keys(toolUsage).length,
      tools: sortedTools,
      sessions: sessionDetails.sort((a, b) => 
        new Date(b.startTime) - new Date(a.startTime)
      ).slice(0, 50) // 最新50セッション
    };
  } catch (error) {
    console.error('Error reading MCP tool usage:', error);
    throw new AppError('Failed to read MCP tool usage', 500, 'MCP_USAGE_ERROR');
  }
}

module.exports = {
  getMcpLogsData,
  getMcpToolUsageStats
};