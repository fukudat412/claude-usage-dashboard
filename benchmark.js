/**
 * パフォーマンスベンチマークスクリプト
 * 各処理の詳細なタイミングを計測
 */

const { performance } = require('perf_hooks');
const { processProjectData } = require('./src/services/projectService');
const { parseMCPLogs } = require('./src/services/mcpService');
const { getTodosData } = require('./src/services/todoService');
const fs = require('fs-extra');
const path = require('path');
const { CLAUDE_PATHS } = require('./src/config/paths');

class PerformanceProfiler {
  constructor(name) {
    this.name = name;
    this.timings = [];
    this.start = performance.now();
    this.lastMark = this.start;
  }

  mark(label) {
    const now = performance.now();
    const elapsed = now - this.lastMark;
    const total = now - this.start;
    this.timings.push({ label, elapsed, total });
    this.lastMark = now;
    return elapsed;
  }

  report() {
    const total = performance.now() - this.start;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Performance Report: ${this.name}`);
    console.log(`${'='.repeat(60)}`);
    this.timings.forEach(({ label, elapsed, total }) => {
      console.log(`  ${label.padEnd(40)} ${elapsed.toFixed(2)}ms (累計: ${total.toFixed(2)}ms)`);
    });
    console.log(`${'='.repeat(60)}`);
    console.log(`  ${'TOTAL'.padEnd(40)} ${total.toFixed(2)}ms`);
    console.log(`${'='.repeat(60)}\n`);
    return total;
  }
}

async function benchmarkFileIO() {
  const profiler = new PerformanceProfiler('File I/O Operations');

  const projectsPath = CLAUDE_PATHS.projects;

  profiler.mark('Start');

  // ディレクトリ読み込み
  const projectDirs = await fs.readdir(projectsPath);
  profiler.mark(`Read ${projectDirs.length} project directories`);

  let totalFiles = 0;
  let totalSize = 0;
  let totalLines = 0;

  for (const projectDir of projectDirs) {
    const projectPath = path.join(projectsPath, projectDir);
    const stats = await fs.stat(projectPath);

    if (!stats.isDirectory()) continue;

    const files = await fs.readdir(projectPath);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));
    totalFiles += jsonlFiles.length;

    for (const file of jsonlFiles) {
      const filePath = path.join(projectPath, file);
      const stat = await fs.stat(filePath);
      totalSize += stat.size;

      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      totalLines += lines.length;
    }
  }

  profiler.mark(`Read ${totalFiles} files (${(totalSize / 1024).toFixed(2)} KB, ${totalLines} lines)`);

  return {
    totalTime: profiler.report(),
    stats: { totalFiles, totalSize, totalLines }
  };
}

async function benchmarkJSONParsing() {
  const profiler = new PerformanceProfiler('JSON Parsing');

  const projectsPath = CLAUDE_PATHS.projects;
  const projectDirs = await fs.readdir(projectsPath);

  profiler.mark('Start');

  let totalParsed = 0;
  let totalFailed = 0;

  for (const projectDir of projectDirs) {
    const projectPath = path.join(projectsPath, projectDir);
    const stats = await fs.stat(projectPath);

    if (!stats.isDirectory()) continue;

    const files = await fs.readdir(projectPath);
    const jsonlFiles = files.filter(f => f.endsWith('.jsonl'));

    for (const file of jsonlFiles) {
      const filePath = path.join(projectPath, file);
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          JSON.parse(line);
          totalParsed++;
        } catch (e) {
          totalFailed++;
        }
      }
    }
  }

  profiler.mark(`Parsed ${totalParsed} JSON objects (${totalFailed} failures)`);

  return {
    totalTime: profiler.report(),
    stats: { totalParsed, totalFailed }
  };
}

async function benchmarkDataAggregation() {
  const profiler = new PerformanceProfiler('Data Aggregation');

  profiler.mark('Start processProjectData');
  const result = await processProjectData();
  profiler.mark(`Processed ${result.dailyUsage.length} days, ${result.monthlyUsage.length} months, ${result.projects.length} projects`);

  return {
    totalTime: profiler.report(),
    stats: {
      days: result.dailyUsage.length,
      months: result.monthlyUsage.length,
      projects: result.projects.length,
      totalSessions: result.totalSessions
    }
  };
}

async function benchmarkMCPLogs() {
  const profiler = new PerformanceProfiler('MCP Logs Processing');

  profiler.mark('Start parseMCPLogs');
  const result = await parseMCPLogs();
  profiler.mark(`Processed ${result.logs.length} MCP log files`);

  return {
    totalTime: profiler.report(),
    stats: {
      logs: result.logs.length,
      toolCalls: result.toolUsage?.totalCalls || 0
    }
  };
}

async function benchmarkTodos() {
  const profiler = new PerformanceProfiler('TODO Processing');

  profiler.mark('Start getTodosData');
  const result = await getTodosData();
  profiler.mark(`Processed ${result.length} TODO files`);

  return {
    totalTime: profiler.report(),
    stats: {
      todos: result.length
    }
  };
}

async function runFullBenchmark() {
  console.log('\n' + '='.repeat(60));
  console.log('Starting Comprehensive Performance Benchmark');
  console.log('='.repeat(60) + '\n');

  const results = {};

  // 1. File I/O Benchmark
  results.fileIO = await benchmarkFileIO();

  // 2. JSON Parsing Benchmark
  results.jsonParsing = await benchmarkJSONParsing();

  // 3. Data Aggregation Benchmark
  results.dataAggregation = await benchmarkDataAggregation();

  // 4. MCP Logs Benchmark
  results.mcpLogs = await benchmarkMCPLogs();

  // 5. TODO Benchmark
  results.todos = await benchmarkTodos();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('BENCHMARK SUMMARY');
  console.log('='.repeat(60));
  console.log(`File I/O Operations:        ${results.fileIO.totalTime.toFixed(2)}ms`);
  console.log(`JSON Parsing:               ${results.jsonParsing.totalTime.toFixed(2)}ms`);
  console.log(`Data Aggregation:           ${results.dataAggregation.totalTime.toFixed(2)}ms`);
  console.log(`MCP Logs Processing:        ${results.mcpLogs.totalTime.toFixed(2)}ms`);
  console.log(`TODO Processing:            ${results.todos.totalTime.toFixed(2)}ms`);
  console.log('='.repeat(60));

  const total = Object.values(results).reduce((sum, r) => sum + r.totalTime, 0);
  console.log(`TOTAL:                      ${total.toFixed(2)}ms`);
  console.log('='.repeat(60) + '\n');

  // Data Statistics
  console.log('\n' + '='.repeat(60));
  console.log('DATA STATISTICS');
  console.log('='.repeat(60));
  console.log(`Total JSONL Files:          ${results.fileIO.stats.totalFiles}`);
  console.log(`Total File Size:            ${(results.fileIO.stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`Total Lines:                ${results.fileIO.stats.totalLines}`);
  console.log(`Total JSON Objects Parsed:  ${results.jsonParsing.stats.totalParsed}`);
  console.log(`Parse Failures:             ${results.jsonParsing.stats.totalFailed}`);
  console.log(`Days Processed:             ${results.dataAggregation.stats.days}`);
  console.log(`Projects:                   ${results.dataAggregation.stats.projects}`);
  console.log(`MCP Log Files:              ${results.mcpLogs.stats.logs}`);
  console.log(`TODO Files:                 ${results.todos.stats.todos}`);
  console.log('='.repeat(60) + '\n');

  return results;
}

// Run the benchmark
runFullBenchmark().catch(console.error);
