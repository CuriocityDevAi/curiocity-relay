// scripts/test/hub-runner-pipeline-log.test.mjs · M1-1125-E
//
// pipeline-log.mjs 단위 테스트 + --selftest-pipeline-log 하네스.
//
// 테스트 항목:
//   1. appendPipelineEvent 가 올바른 JSONL 을 기록한다.
//   2. 이벤트 5종(queued · started · report · artifact · done) 의 순서가 보존된다.
//   3. blocked 이벤트가 reason 필드와 함께 기록된다.
//   4. 쓰기 실패(읽기전용 경로) 시 예외가 미전파되고 false 가 반환된다.
//   5. extractArtifactFromReport 가 PR URL 에서 repo · pr_number 를 추출한다.
//   6. archiveOldPipelineLogs 가 14일 초과 파일만 archive/ 로 이동한다.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendPipelineEvent,
  extractArtifactFromReport,
  archiveOldPipelineLogs,
  pipelineLogPath,
} from '../lib/pipeline-log.mjs';

function assert(ok, msg) {
  if (!ok) { console.error(`  FAIL · ${msg}`); throw new Error(msg); }
  console.log(`  OK · ${msg}`);
}

function withTmp(fn) {
  const tmp = mkdtempSync(join(tmpdir(), 'hr-plog-'));
  try { return fn(tmp); } finally {
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* noop */ }
  }
}

export function runSelftest() {
  // --- 1. 기본 쓰기 ---
  withTmp((root) => {
    const ok = appendPipelineEvent(root, 'TEST-001', 'm1', 'queued', { model: 'sonnet' });
    assert(ok === true, '1. appendPipelineEvent 가 true 반환');
    const p = pipelineLogPath(root, 'TEST-001');
    assert(existsSync(p), '1. JSONL 파일 생성됨');
    const line = JSON.parse(readFileSync(p, 'utf8').trim().split('\n')[0]);
    assert(line.event === 'queued', `1. event=queued · got=${line.event}`);
    assert(line.id === 'TEST-001', `1. id=TEST-001 · got=${line.id}`);
    assert(line.hub === 'm1', `1. hub=m1 · got=${line.hub}`);
    assert(line.model === 'sonnet', `1. model=sonnet · got=${line.model}`);
    assert(typeof line.ts === 'string' && line.ts.includes('T'), '1. ts ISO 형식');
  });

  // --- 2. 이벤트 5종 순서 보존 ---
  withTmp((root) => {
    const id = 'ORD-002';
    const events = ['queued', 'started', 'report', 'artifact', 'done'];
    for (const ev of events) {
      appendPipelineEvent(root, id, 'm2', ev, ev === 'artifact' ? { pr_number: 42, repo: 'o/r' } : {});
    }
    const lines = readFileSync(pipelineLogPath(root, id), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
    assert(lines.length === 5, `2. 줄 수 5 · got=${lines.length}`);
    for (let i = 0; i < events.length; i++) {
      assert(lines[i].event === events[i], `2. 순서[${i}] = ${events[i]} · got=${lines[i].event}`);
    }
    assert(lines[3].pr_number === 42, `2. artifact.pr_number=42 · got=${lines[3].pr_number}`);
  });

  // --- 3. blocked 이벤트 (reason 필드) ---
  withTmp((root) => {
    appendPipelineEvent(root, 'BLK-003', 'r0', 'blocked', { reason: 'timeout' });
    const line = JSON.parse(readFileSync(pipelineLogPath(root, 'BLK-003'), 'utf8').trim());
    assert(line.event === 'blocked', `3. event=blocked · got=${line.event}`);
    assert(line.reason === 'timeout', `3. reason=timeout · got=${line.reason}`);
  });

  // --- 4. 쓰기 실패 non-fatal ---
  (() => {
    const badRoot = '/no_such_dir_pipeline_test_xyz';
    let threw = false;
    let result;
    try {
      result = appendPipelineEvent(badRoot, 'FAIL-004', 'm0', 'queued');
    } catch {
      threw = true;
    }
    assert(!threw, '4. 예외 미전파');
    assert(result === false, `4. false 반환 · got=${result}`);
  })();

  // --- 5. extractArtifactFromReport ---
  (() => {
    const r1 = extractArtifactFromReport('## Summary\n\nPR: https://github.com/CuriocityDevAi/storeport/pull/99\n완료');
    assert(r1 !== null, '5. PR URL 감지');
    assert(r1.repo === 'CuriocityDevAi/storeport', `5. repo · got=${r1.repo}`);
    assert(r1.pr_number === 99, `5. pr_number=99 · got=${r1.pr_number}`);

    const r2 = extractArtifactFromReport('리포트에 PR 없음');
    assert(r2 === null, '5. PR 없으면 null');

    const r3 = extractArtifactFromReport('');
    assert(r3 === null, '5. 빈 리포트 null');
  })();

  // --- 6. archiveOldPipelineLogs ---
  withTmp((root) => {
    const dir = join(root, 'status', 'pipeline');
    mkdirSync(dir, { recursive: true });
    const oldFile = join(dir, 'OLD-006.jsonl');
    const newFile = join(dir, 'NEW-006.jsonl');
    writeFileSync(oldFile, '{"ts":"old"}\n');
    writeFileSync(newFile, '{"ts":"new"}\n');
    // 15일 전으로 mtime 조정
    const oldTime = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    utimesSync(oldFile, oldTime, oldTime);

    const { archived } = archiveOldPipelineLogs(root);
    assert(archived === 1, `6. 1개 archive · got=${archived}`);
    assert(!existsSync(oldFile), '6. 원본 삭제');
    assert(existsSync(join(dir, 'archive', 'OLD-006.jsonl')), '6. archive/ 에 이동');
    assert(existsSync(newFile), '6. 새 파일 유지');
  });

  console.log('[selftest-pipeline-log] OK · 6종 테스트 모두 통과');
  return true;
}
