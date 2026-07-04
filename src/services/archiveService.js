const fs = require('fs-extra');
const path = require('path');
const { processProjectData } = require('./projectService');

// Claude Codeは既定で約30日で古いトランスクリプトを削除するため、
// 日次集計をローカルにスナップショットして履歴を保持する。
// 元ログに存在する日付はライブ値で常に上書きし、消えた日付だけアーカイブから補完する。
const ARCHIVE_DIR = process.env.ARCHIVE_DIR || path.join(__dirname, '../../data');
const ARCHIVE_FILE = path.join(ARCHIVE_DIR, 'daily-archive.json');
const SNAPSHOT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6時間
const INITIAL_DELAY_MS = 15 * 1000; // 起動直後の負荷を避ける

let archiveCache = null;

async function readArchive() {
  if (archiveCache) return archiveCache;
  try {
    archiveCache = await fs.readJson(ARCHIVE_FILE);
  } catch {
    archiveCache = { updatedAt: null, days: {} };
  }
  return archiveCache;
}

async function writeArchive(archive) {
  await fs.ensureDir(ARCHIVE_DIR);
  const tmp = `${ARCHIVE_FILE}.tmp`;
  await fs.writeJson(tmp, archive, { spaces: 0 });
  await fs.move(tmp, ARCHIVE_FILE, { overwrite: true });
  archiveCache = archive;
}

/**
 * 現在のライブ集計をアーカイブへマージして保存する。
 * ライブに存在する日付は常に最新値で上書き（当日分は増え続けるため）。
 */
async function snapshotDailyUsage() {
  try {
    const projectData = await processProjectData();
    const dailyUsage = projectData.dailyUsage || [];
    if (dailyUsage.length === 0) return { added: 0, updated: 0 };

    const archive = await readArchive();
    let added = 0;
    let updated = 0;
    for (const day of dailyUsage) {
      if (!day.date) continue;
      if (archive.days[day.date]) updated += 1; else added += 1;
      archive.days[day.date] = { ...day };
    }
    archive.updatedAt = new Date().toISOString();
    await writeArchive(archive);
    console.log(`[Archive] Snapshot saved: ${added} new day(s), ${updated} updated (${ARCHIVE_FILE})`);
    return { added, updated };
  } catch (err) {
    console.error('[Archive] Snapshot failed:', err.message);
    return { added: 0, updated: 0, error: err.message };
  }
}

/**
 * ライブの日次データに、元ログから消えた日付をアーカイブから補完する。
 * 補完された日付には archived: true が付く。
 */
async function mergeWithArchive(liveDailyUsage) {
  const archive = await readArchive();
  const liveDates = new Set((liveDailyUsage || []).map((day) => day.date));
  const restored = Object.values(archive.days)
    .filter((day) => !liveDates.has(day.date))
    .map((day) => ({ ...day, archived: true }));
  if (restored.length === 0) return liveDailyUsage;
  // projectServiceの規約に合わせて日付昇順
  return [...liveDailyUsage, ...restored].sort(
    (a, b) => String(a.date).localeCompare(String(b.date))
  );
}

/** サーバー起動時に呼ぶ: 初回スナップショット + 定期実行 */
function startArchiveScheduler() {
  const initial = setTimeout(snapshotDailyUsage, INITIAL_DELAY_MS);
  const interval = setInterval(snapshotDailyUsage, SNAPSHOT_INTERVAL_MS);
  // プロセス終了を妨げない
  initial.unref();
  interval.unref();
}

module.exports = { snapshotDailyUsage, mergeWithArchive, startArchiveScheduler, ARCHIVE_FILE };
