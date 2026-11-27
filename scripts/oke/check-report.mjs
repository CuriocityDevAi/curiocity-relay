#!/usr/bin/env node
// scripts/oke/check-report.mjs  M2-1127-G — 리포트 파일 검사기

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = process.argv.slice(2);
if (FILES.length === 0) {
  console.error('사용법: node scripts/oke/check-report.mjs <리포트 파일…>');
  process.exit(1);
}

// 판정 패턴:
//   줄 시작(공백·별표만 허용) 또는 ": " 구분자 뒤에 오는 경우만 허용
//   "lint pass", "actionlint pass 26s" 같은 임베디드 단어 제외
const VERDICT_RE = /(?:^[\s*]*|:\s+\*{0,2})(PASS|FAIL|APPROVE|CHANGES|CI\s*미확인)/im;
// PR 번호 패턴
const PR_RE = /#\d+|PR\s*#?\d+/i;
// 커밋 SHA 패턴 (7자 이상 hex)
const COMMIT_RE = /\b[0-9a-f]{7,40}\b/i;
// 자기 검증 흔적 패턴
const EVIDENCE_RE = /```[\s\S]*?```|github\.com.*actions.*runs.*\/\d+|Actions\s+링크|run\s+list|gh\s+run/i;
// CI 진행 중 패턴
const CI_RUNNING_RE = /진행\s*중|running|pending|not\s+started/i;
// CI 초록/성공 선언 패턴
const CI_GREEN_RE = /초록|CI.*pass|CI.*success|모두.*완료|전부.*pass/i;

function checkFile(filePath) {
  const abs = resolve(filePath);
  let text;
  try {
    text = readFileSync(abs, 'utf8');
  } catch (e) {
    return { file: filePath, errors: [`파일 열기 실패: ${e.message}`], warnings: [] };
  }

  const lines = text.split('\n');
  const errors = [];
  const warnings = [];

  // 1. 첫 줄 (또는 첫 비어있지 않은 줄) 판정 확인
  // 마크다운 h1 제목 다음의 판정 줄도 허용
  let verdictFound = false;
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const l = lines[i];
    if (VERDICT_RE.test(l)) {
      verdictFound = true;
      break;
    }
  }
  if (!verdictFound) {
    errors.push(
      '판정(PASS/FAIL/APPROVE/CHANGES/CI 미확인) 없음 → 리포트 첫 줄에 판정 명시'
    );
  }

  // 2. PR 번호 또는 커밋 언급
  const hasPr = PR_RE.test(text);
  const hasCommit = COMMIT_RE.test(text);
  if (!hasPr && !hasCommit) {
    errors.push('PR 번호/커밋 해시 없음 → 리포트에 PR 번호(#N) 또는 커밋 SHA 추가');
  }

  // 3. 자기 검증 흔적 (코드블록 실행 로그 또는 Actions 링크)
  if (!EVIDENCE_RE.test(text)) {
    errors.push(
      '자기 검증 흔적 없음 → 직접 실행한 명령 코드블록 또는 Actions 실행 URL 추가'
    );
  }

  // 4. 초록 선언 ↔ 진행 중 혼재 경고
  if (CI_GREEN_RE.test(text) && CI_RUNNING_RE.test(text)) {
    warnings.push(
      '"초록/pass" 선언과 "진행 중/running/pending/not started" 가 같은 리포트에 혼재 — CI 최종 완료 후 리포트 업데이트 필요'
    );
  }

  return { file: filePath, errors, warnings };
}

let anyFail = false;
for (const f of FILES) {
  const { file, errors, warnings } = checkFile(f);
  if (errors.length === 0 && warnings.length === 0) {
    console.log(`PASS  ${file}`);
  } else {
    if (errors.length > 0) {
      anyFail = true;
      console.log(`FAIL  ${file}`);
      for (const e of errors) console.log(`  ✗ ${e}`);
    } else {
      console.log(`WARN  ${file}`);
    }
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
}

process.exit(anyFail ? 1 : 0);
