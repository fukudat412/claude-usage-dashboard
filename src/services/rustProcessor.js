const { execFileSync } = require('child_process');
const path = require('path');
const { CLAUDE_PATHS } = require('../config/paths');

// Rustプロセッサのパス
const RUST_PROCESSOR_PATH = path.join(__dirname, '../../rust-processor/target/release/rust-processor');

// 環境変数でRust使用のON/OFF切り替え
const USE_RUST = process.env.USE_RUST !== 'false';

/**
 * Rustプロセッサを使ってプロジェクトデータを処理
 * エラー時はnullを返す（フォールバック用）
 */
function processProjectDataWithRust() {
  if (!USE_RUST) {
    return null;
  }

  try {
    const startTime = Date.now();

    const result = execFileSync(
      RUST_PROCESSOR_PATH,
      ['--projects-path', CLAUDE_PATHS.projects],
      {
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024, // 50MB
        timeout: 30000 // 30秒タイムアウト
      }
    );

    const data = JSON.parse(result);
    const processingTime = Date.now() - startTime;

    console.log(`[Rust] Project data processed in ${processingTime}ms`);

    return data;
  } catch (error) {
    console.error('[Rust] Failed to process project data:', error.message);
    return null;
  }
}

/**
 * Rustが利用可能かチェック
 */
function isRustProcessorAvailable() {
  const fs = require('fs');
  try {
    return fs.existsSync(RUST_PROCESSOR_PATH);
  } catch {
    return false;
  }
}

module.exports = {
  processProjectDataWithRust,
  isRustProcessorAvailable,
  USE_RUST
};
