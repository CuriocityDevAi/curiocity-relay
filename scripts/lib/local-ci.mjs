// scripts/lib/local-ci.mjs  M2-1124-K — 로컬 self-hosted 러너 상태 읽기
// 읽기 전용 · GitHub API 호출 없음 · hub-runner 가 나중에 import 가능
//
// 출처: 각 러너의 _diag/Runner_*.log · _diag/Worker_*.log
//   Runner_*.log: "Running job: heavy-mac" · "finish job request ... with result: Succeeded"
//   Worker_*.log: "jobDisplayName" · "Total job steps" · "Job completed."

import {
  closeSync,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  readSync,
  statSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir();

// 러너 4대 위치 · 이름 · 리포 (launchd plist WorkingDirectory 에서 확인)
export const LOCAL_RUNNERS = [
  { name: 'Youngkyus-MacBook-Pro-M1', dir: join(HOME, 'actions-runner'),            repo: 'CuriocityDevAi/storeport' },
  { name: 'curiocity-mac-light',      dir: join(HOME, 'actions-runner-light'),       repo: 'CuriocityDevAi/storeport' },
  { name: 'curiocity-mac-fork',       dir: join(HOME, 'actions-runner-fork'),        repo: 'CuriocityDevAi/agilo-medusa-pos-fork' },
  { name: 'curiocity-mac-fork-light', dir: join(HOME, 'actions-runner-fork-light'),  repo: 'CuriocityDevAi/agilo-medusa-pos-fork' },
];

const RUNNER_LOG_READ_BYTES = 60_000;  // Runner_*.log 끝 N바이트
const WORKER_HEAD_BYTES    = 5_000;   // Worker_*.log 앞 N바이트 (jobDisplayName용)
const WORKER_TAIL_BYTES    = 3_000;   // Worker_*.log 끝 N바이트 (완료 여부용)

function readTail(filePath, maxBytes) {
  try {
    const st = statSync(filePath);
    if (st.size <= maxBytes) return readFileSync(filePath, 'utf8');
    const fd = openSync(filePath, 'r');
    const buf = Buffer.alloc(maxBytes);
    readSync(fd, buf, 0, maxBytes, st.size - maxBytes);
    closeSync(fd);
    return buf.toString('utf8');
  } catch { return ''; }
}

function readHead(filePath, maxBytes) {
  try {
    const st = statSync(filePath);
    if (st.size <= maxBytes) return readFileSync(filePath, 'utf8');
    const fd = openSync(filePath, 'r');
    const buf = Buffer.alloc(maxBytes);
    readSync(fd, buf, 0, maxBytes, 0);
    closeSync(fd);
    return buf.toString('utf8');
  } catch { return ''; }
}

function latestLogByMtime(diagDir, prefix) {
  try {
    const all = readdirSync(diagDir)
      .filter(f => f.startsWith(prefix) && f.endsWith('.log'))
      .map(f => ({ f, mt: (() => { try { return statSync(join(diagDir, f)).mtimeMs; } catch { return 0; } })() }));
    if (!all.length) return null;
    return join(diagDir, all.sort((a, b) => b.mt - a.mt)[0].f);
  } catch { return null; }
}

/**
 * Runner_*.log 에서 현재 세션의 마지막 잡 상태 파싱.
 * Returns { running, jobName, startedAt, completedAt, result }
 */
function parseRunnerLog(logPath) {
  if (!logPath) return {};
  const content = readTail(logPath, RUNNER_LOG_READ_BYTES);
  if (!content) return {};

  const lines = content.split('\n');
  let lastRunLine = -1, lastFinishLine = -1;
  let jobName = null, startedAt = null, completedAt = null, result = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // [2026-11-23 09:15:58Z INFO Terminal] WRITE LINE: ...: Running job: heavy-mac
    const runM = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z)[^\]]*\].*?Running job:\s+(.+)/);
    if (runM) {
      lastRunLine = i;
      startedAt = runM[1].replace(' ', 'T');
      jobName = runM[2].trim();
      completedAt = null; result = null;
    }
    // [2026-11-23 09:30:06Z INFO JobDispatcher] finish job request for job <uuid> with result: Succeeded
    const finM = line.match(/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}Z)[^\]]*\].*?finish job request for job .+ with result:\s+(\w+)/);
    if (finM) {
      lastFinishLine = i;
      completedAt = finM[1].replace(' ', 'T');
      result = finM[2];
    }
  }

  if (!jobName && lastRunLine === -1) return {};

  const running = lastRunLine > lastFinishLine;
  return {
    running,
    jobName,
    startedAt,
    completedAt: running ? null : completedAt,
    result: running ? null : (result === 'Succeeded' ? 'success' : result ? 'failure' : null),
  };
}

/**
 * Worker_*.log 앞부분에서 jobDisplayName 추출,
 * 뒷부분에서 완료 여부 보조 확인.
 */
function parseWorkerLog(logPath) {
  if (!logPath) return {};
  const head = readHead(logPath, WORKER_HEAD_BYTES);
  const tail = readTail(logPath, WORKER_TAIL_BYTES);

  let jobDisplayName = null;
  const dnM = head.match(/"jobDisplayName":\s*"([^"]+)"/);
  if (dnM) jobDisplayName = dnM[1];

  let stepsTotal = null;
  const stM = (head + tail).match(/Total job steps:\s*(\d+)/);
  if (stM) stepsTotal = parseInt(stM[1], 10);

  const workerDone = tail.includes('Job completed.');
  return { jobDisplayName, stepsTotal, workerDone };
}

/**
 * 러너 1대의 로컬 상태를 읽어 반환.
 *
 * @returns {{
 *   name: string, dir: string, repo: string,
 *   running: boolean,
 *   jobName: string|null,
 *   startedAt: string|null,  // ISO UTC
 *   completedAt: string|null,
 *   result: 'success'|'failure'|null,
 *   runningMin: number|null,
 *   stepsTotal: number|null,
 *   source: 'local',
 *   readAt: number,
 * }}
 */
export function readRunnerState(runnerInfo) {
  const { name, dir, repo } = runnerInfo;
  const diagDir = join(dir, '_diag');
  const readAt = Date.now();
  const base = { name, dir, repo, running: false, jobName: null, startedAt: null, completedAt: null, result: null, runningMin: null, stepsTotal: null, source: 'local', readAt };

  if (!existsSync(diagDir)) return base;

  const latestRunner = latestLogByMtime(diagDir, 'Runner_');
  const latestWorker = latestLogByMtime(diagDir, 'Worker_');

  const rl = parseRunnerLog(latestRunner);
  const wl = parseWorkerLog(latestWorker);

  // Worker 완료 로그가 있으면 Runner log 의 running 판정 보정
  // (Runner.Worker 가 "Job completed." 를 쓴 뒤 Runner log "finish" 가 약간 늦을 수 있음)
  const running = rl.running === true && !wl.workerDone;

  const jobName = wl.jobDisplayName || rl.jobName || null;
  const startedAt = rl.startedAt || null;
  const completedAt = running ? null : (rl.completedAt || null);
  const result = running ? null : (rl.result || null);

  let runningMin = null;
  if (running && startedAt) {
    runningMin = Math.round((readAt - new Date(startedAt).getTime()) / 60_000);
  }

  return { name, dir, repo, running, jobName, startedAt, completedAt, result, runningMin, stepsTotal: wl.stepsTotal || null, source: 'local', readAt };
}

/**
 * 4대 러너 상태를 모두 읽어 배열로 반환.
 * @returns {ReturnType<typeof readRunnerState>[]}
 */
export function readAllLocalRunnerStates() {
  return LOCAL_RUNNERS.map(r => {
    try { return readRunnerState(r); }
    catch {
      return { name: r.name, dir: r.dir, repo: r.repo, running: false, jobName: null, startedAt: null, completedAt: null, result: null, runningMin: null, stepsTotal: null, source: 'local', readAt: Date.now() };
    }
  });
}
