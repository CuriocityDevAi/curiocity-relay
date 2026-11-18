#!/usr/bin/env node
// scripts/lib/mem-sample.mjs · macOS 메모리 샘플러 (M2-1118-I)
// vm_stat · sysctl vm.swapusage · memory_pressure -Q — 설치 필요 도구 없음.
// 실패 시 null 반환 · 러너 계속 동작.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);
const GB = 1024 ** 3;

async function run(cmd, args) {
  try {
    const { stdout } = await execFileP(cmd, args, { timeout: 2000 });
    return stdout;
  } catch {
    return null;
  }
}

export function parseVmStat(out) {
  if (!out) return null;
  const psm = out.match(/page size of (\d+) bytes/);
  if (!psm) return null;
  const pageSize = parseInt(psm[1]);

  function pages(label) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const m = out.match(new RegExp(esc + '\\s*:\\s*([\\d]+)\\.'));
    return m ? parseInt(m[1]) : 0;
  }

  return {
    pageSize,
    free: pages('Pages free'),
    speculative: pages('Pages speculative'),
    wired: pages('Pages wired down'),
    active: pages('Pages active'),
    inactive: pages('Pages inactive'),
    // physical RAM occupied by compressor (current, not cumulative)
    compressorPhysical: pages('Pages occupied by compressor'),
  };
}

function parseSysctlTotal(out) {
  if (!out) return null;
  const m = out.match(/hw\.memsize[:\s]+(\d+)/);
  return m ? parseInt(m[1]) : null;
}

function parseSysctlSwap(out) {
  if (!out) return null;
  const m = out.match(/used\s*=\s*([\d.]+)M/);
  return m ? +(parseFloat(m[1]) / 1024).toFixed(2) : null;
}

function parsePressure(out) {
  if (!out) return null;
  const m = out.match(/free percentage[:\s]+(\d+)/i);
  if (!m) return null;
  const pct = parseInt(m[1]);
  if (pct >= 20) return 'normal';
  if (pct >= 5) return 'warn';
  return 'critical';
}

export async function sampleMem() {
  const [vmStatOut, sysctlTotalOut, sysctlSwapOut, memPressureOut] = await Promise.all([
    run('vm_stat', []),
    run('sysctl', ['hw.memsize']),
    run('sysctl', ['vm.swapusage']),
    run('memory_pressure', ['-Q']),
  ]);

  const vmStat = parseVmStat(vmStatOut);
  const totalBytes = parseSysctlTotal(sysctlTotalOut);
  if (!vmStat || !totalBytes) return null;

  const { pageSize, free, speculative, compressorPhysical } = vmStat;
  const totalPages = totalBytes / pageSize;
  const usedPages = totalPages - free - speculative;

  return {
    total_gb: +(totalBytes / GB).toFixed(2),
    used_gb: +(usedPages * pageSize / GB).toFixed(2),
    compressed_gb: +(compressorPhysical * pageSize / GB).toFixed(2),
    swap_used_gb: parseSysctlSwap(sysctlSwapOut),
    pressure: parsePressure(memPressureOut) ?? 'normal',
    at: new Date().toISOString(),
  };
}

// standalone: node scripts/lib/mem-sample.mjs
if (process.argv[1] === new URL(import.meta.url).pathname) {
  sampleMem().then((m) => {
    if (!m) { console.error('sampling failed'); process.exit(1); }
    console.log(JSON.stringify(m, null, 2));
  }).catch((e) => { console.error(e); process.exit(1); });
}
