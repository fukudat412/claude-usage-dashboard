const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const { CLAUDE_PATHS } = require('../config/paths');
const { AppError } = require('../middleware/errorHandler');

const PROJECT_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const SESSION_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const MAX_MESSAGES = 2000;
const MAX_TEXT_LENGTH = 4000;

// パストラバーサル防止: プロジェクト名を検証して実ディレクトリを解決する
function resolveProjectDir(projectName) {
  if (!projectName || !PROJECT_NAME_PATTERN.test(projectName) || projectName.includes('..')) {
    throw new AppError('Invalid project name', 400);
  }
  const dir = path.join(CLAUDE_PATHS.projects, projectName);
  const resolved = path.resolve(dir);
  if (!resolved.startsWith(path.resolve(CLAUDE_PATHS.projects) + path.sep)) {
    throw new AppError('Invalid project path', 400);
  }
  return resolved;
}

// user行から表示用テキストを取り出す（メタ行・ツール結果は除外）
function extractUserText(entry) {
  if (entry.isMeta || entry.isSidechain) return null;
  const content = entry.message?.content;
  if (typeof content === 'string') {
    // ローカルコマンド出力などのシステム的な内容は省く
    if (content.startsWith('<local-command') || content.startsWith('<command-name>')) return null;
    return content;
  }
  if (Array.isArray(content)) {
    const texts = content
      .filter((block) => block.type === 'text')
      .map((block) => block.text);
    if (texts.length === 0) return null; // tool_resultのみの行
    return texts.join('\n');
  }
  return null;
}

// assistant行から表示用テキストとツール使用を取り出す
function extractAssistantParts(entry) {
  if (entry.isSidechain) return null;
  const content = entry.message?.content;
  if (!Array.isArray(content)) return null;
  const texts = [];
  const tools = [];
  for (const block of content) {
    if (block.type === 'text' && block.text) texts.push(block.text);
    if (block.type === 'tool_use' && block.name) tools.push(block.name);
  }
  if (texts.length === 0 && tools.length === 0) return null;
  return { text: texts.join('\n'), tools };
}

function truncate(text, max = MAX_TEXT_LENGTH) {
  if (typeof text !== 'string') return '';
  return text.length > max ? `${text.slice(0, max)}\n…（省略）` : text;
}

async function parseSessionFile(filePath, { withMessages = false } = {}) {
  const sessionId = path.basename(filePath, '.jsonl');
  const summary = {
    sessionId,
    title: null,
    firstUserText: null,
    startTime: null,
    endTime: null,
    userMessages: 0,
    assistantMessages: 0,
    totalTokens: 0,
    models: new Set(),
  };
  const messages = [];

  // ストリーミング中は同じ応答(message.id + requestId)がusage漸増・本文追記で
  // 複数回書き込まれるため、キーごとに最終エントリだけを採用する
  const usageByKey = new Map(); // key -> トークン合計の最大値(=最終値)
  const assistantByKey = new Map(); // key -> messages配列のインデックス
  let fallbackKey = 0;

  const usageTotalOf = (usage) =>
    (usage.input_tokens || 0) +
    (usage.output_tokens || 0) +
    (usage.cache_creation_input_tokens || 0) +
    (usage.cache_read_input_tokens || 0);

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }

    if (entry.type === 'ai-title' && entry.aiTitle) {
      summary.title = entry.aiTitle;
      continue;
    }

    if (entry.timestamp) {
      if (!summary.startTime) summary.startTime = entry.timestamp;
      summary.endTime = entry.timestamp;
    }

    if (entry.type === 'user') {
      const text = extractUserText(entry);
      if (text) {
        summary.userMessages += 1;
        if (!summary.firstUserText) summary.firstUserText = text.slice(0, 120);
        if (withMessages && messages.length < MAX_MESSAGES) {
          messages.push({
            role: 'user',
            text: truncate(text),
            timestamp: entry.timestamp || null,
          });
        }
      }
    } else if (entry.type === 'assistant') {
      const messageId = entry.message?.id;
      const requestId = entry.requestId;
      const key = (messageId || requestId)
        ? (messageId || '') + ':' + (requestId || '')
        : '__nokey__:' + (fallbackKey++);

      const usage = entry.message?.usage;
      if (usage) {
        const total = usageTotalOf(usage);
        if (total > (usageByKey.get(key) || 0)) usageByKey.set(key, total);
      }
      if (entry.message?.model) summary.models.add(entry.message.model);

      const parts = extractAssistantParts(entry);
      if (parts) {
        if (withMessages) {
          const message = {
            role: 'assistant',
            text: truncate(parts.text),
            tools: parts.tools,
            timestamp: entry.timestamp || null,
          };
          if (assistantByKey.has(key) && assistantByKey.get(key) >= 0) {
            // 同じ応答の後続書き込み: 位置は据え置き、内容を最新に置き換える
            messages[assistantByKey.get(key)] = message;
          } else if (messages.length < MAX_MESSAGES) {
            assistantByKey.set(key, messages.length);
            messages.push(message);
          }
        } else if (!assistantByKey.has(key)) {
          assistantByKey.set(key, -1);
        }
      }
    }
  }

  // サブエージェント(<sessionId>/subagents/agent-*.jsonl)の使用量もこのセッションに合算する
  const subagentsDir = path.join(path.dirname(filePath), sessionId, 'subagents');
  if (await fs.pathExists(subagentsDir)) {
    const subFiles = (await fs.readdir(subagentsDir)).filter((f) => f.endsWith('.jsonl'));
    for (const subFile of subFiles) {
      const subStream = fs.createReadStream(path.join(subagentsDir, subFile), { encoding: 'utf8' });
      const subRl = readline.createInterface({ input: subStream, crlfDelay: Infinity });
      for await (const line of subRl) {
        if (!line) continue;
        let entry;
        try { entry = JSON.parse(line); } catch { continue; }
        if (entry.type !== 'assistant') continue;
        const usage = entry.message?.usage;
        if (!usage) continue;
        const messageId = entry.message?.id;
        const requestId = entry.requestId;
        const key = (messageId || requestId)
          ? 'sub:' + (messageId || '') + ':' + (requestId || '')
          : '__nokey__:' + (fallbackKey++);
        const total = usageTotalOf(usage);
        if (total > (usageByKey.get(key) || 0)) usageByKey.set(key, total);
        if (entry.message?.model) summary.models.add(entry.message.model);
      }
    }
  }

  summary.assistantMessages = assistantByKey.size;
  summary.totalTokens = [...usageByKey.values()].reduce((a, b) => a + b, 0);

  const result = { ...summary, models: [...summary.models] };
  return withMessages ? { summary: result, messages } : { summary: result };
}

// プロジェクト内のセッション一覧（新しい順）
async function listSessions(projectName) {
  const dir = resolveProjectDir(projectName);
  if (!(await fs.pathExists(dir))) {
    throw new AppError('Project not found', 404);
  }
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.jsonl'));
  const sessions = [];
  for (const file of files) {
    try {
      const { summary } = await parseSessionFile(path.join(dir, file));
      // 会話が1つもないセッション（設定変更のみ等）は除外
      if (summary.userMessages > 0 || summary.assistantMessages > 0) {
        sessions.push(summary);
      }
    } catch {
      // 壊れたファイルはスキップ
    }
  }
  sessions.sort((a, b) => String(b.endTime || '').localeCompare(String(a.endTime || '')));
  return sessions;
}

// セッションの会話内容
async function getSessionMessages(projectName, sessionId) {
  if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
    throw new AppError('Invalid session id', 400);
  }
  const dir = resolveProjectDir(projectName);
  const filePath = path.join(dir, `${sessionId}.jsonl`);
  if (!(await fs.pathExists(filePath))) {
    throw new AppError('Session not found', 404);
  }
  return parseSessionFile(filePath, { withMessages: true });
}

const MAX_SEARCH_SESSIONS = 50;
const SNIPPETS_PER_SESSION = 3;
const SNIPPET_CONTEXT = 60;

function buildSnippet(text, index, queryLength) {
  const start = Math.max(0, index - SNIPPET_CONTEXT);
  const end = Math.min(text.length, index + queryLength + SNIPPET_CONTEXT);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

/**
 * 全プロジェクト（またはプロジェクト指定）の会話を横断全文検索する。
 * 大文字小文字を区別しない部分一致。
 */
async function searchSessions(query, projectName = null) {
  if (!query || String(query).trim().length < 2) {
    throw new AppError('Query must be at least 2 characters', 400);
  }
  const needle = String(query).toLowerCase();

  const root = path.resolve(CLAUDE_PATHS.projects);
  let projectDirs;
  if (projectName) {
    projectDirs = [path.basename(resolveProjectDir(projectName))];
  } else {
    projectDirs = (await fs.readdir(root).catch(() => []))
      .filter((name) => PROJECT_NAME_PATTERN.test(name));
  }

  const results = [];
  for (const project of projectDirs) {
    const dir = path.join(root, project);
    const stat = await fs.stat(dir).catch(() => null);
    if (!stat || !stat.isDirectory()) continue;
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.jsonl'));

    for (const file of files) {
      if (results.length >= MAX_SEARCH_SESSIONS) return { query, results, truncated: true };
      const filePath = path.join(dir, file);
      const sessionId = path.basename(file, '.jsonl');
      let hit = null;

      const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
      let title = null;
      let endTime = null;
      for await (const line of rl) {
        if (!line) continue;
        let entry;
        try { entry = JSON.parse(line); } catch { continue; }
        if (entry.type === 'ai-title' && entry.aiTitle) { title = entry.aiTitle; continue; }
        if (entry.timestamp) endTime = entry.timestamp;

        let role = null;
        let text = null;
        if (entry.type === 'user') {
          text = extractUserText(entry);
          role = 'user';
        } else if (entry.type === 'assistant') {
          const parts = extractAssistantParts(entry);
          text = parts?.text || null;
          role = 'assistant';
        }
        if (!text) continue;

        const index = text.toLowerCase().indexOf(needle);
        if (index === -1) continue;
        if (!hit) hit = { project, sessionId, matchCount: 0, snippets: [] };
        hit.matchCount += 1;
        if (hit.snippets.length < SNIPPETS_PER_SESSION) {
          hit.snippets.push({
            role,
            snippet: buildSnippet(text, index, needle.length),
            timestamp: entry.timestamp || null,
          });
        }
      }

      if (hit) {
        hit.title = title;
        hit.endTime = endTime;
        results.push(hit);
      }
    }
  }

  results.sort((a, b) => String(b.endTime || '').localeCompare(String(a.endTime || '')));
  return { query, results, truncated: false };
}

module.exports = { listSessions, getSessionMessages, searchSessions };
