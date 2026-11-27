#!/usr/bin/env node
// scripts/oke/check-queue-prompt.mjs  M2-1127-G — 큐 프롬프트 필수 항목 검사기

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = process.argv.slice(2);
if (FILES.length === 0) {
  console.error('사용법: node scripts/oke/check-queue-prompt.mjs <queue 파일…>');
  process.exit(1);
}

function checkFile(filePath) {
  const abs = resolve(filePath);
  let text;
  try {
    text = readFileSync(abs, 'utf8');
  } catch (e) {
    return { file: filePath, errors: [`파일 열기 실패: ${e.message}`] };
  }

  const lines = text.split('\n');
  const errors = [];

  // 1. 첫 줄 ID 패턴
  const firstLine = lines[0] ?? '';
  if (!/^(M0|M1|M2|M3|R0)-\d{4}-[A-Z]{1,2} \(/.test(firstLine)) {
    errors.push(
      '첫 줄 형식 불일치 → `M2-1127-X (제목)` 형식으로 첫 줄을 맞출 것'
    );
  }

  // 2. 가벼운 길 여부 (MP-017 — 보존 요소 생략 허용)
  const hasLightPath = lines.slice(0, 4).some(l => l.includes('가벼운 길'));

  // 3. 원장 대사: 줄 + 그 안에 충돌 없음 확인(검색어:
  const ledgerLine = lines.find(l => l.startsWith('원장 대사:'));
  if (!ledgerLine) {
    errors.push('`원장 대사:` 줄 없음 → 두 번째 줄에 `원장 대사: …` 추가');
  } else if (!ledgerLine.includes('충돌 없음 확인(검색어:')) {
    errors.push(
      '`원장 대사:` 줄에 `충돌 없음 확인(검색어:` 없음 → 원장 대사 줄 끝에 `· 충돌 없음 확인(검색어: <키워드> — 결과)` 추가'
    );
  }

  // 4. 건드릴 파일:
  if (!lines.some(l => l.startsWith('건드릴 파일:'))) {
    errors.push(
      '`건드릴 파일:` 줄 없음 → 원장 대사 아래에 `건드릴 파일: <파일 목록>` 추가'
    );
  }

  // 5. 보존 요소: (가벼운 길이면 생략 허용)
  if (!hasLightPath && !lines.some(l => l.startsWith('보존 요소:'))) {
    errors.push(
      '`보존 요소:` 줄 없음 → 건드릴 파일 아래에 `보존 요소: 없음(신규 파일만)` 이라도 적기'
    );
  }

  // 6. [REQ]
  if (!lines.some(l => l.trim() === '[REQ]')) {
    errors.push('`[REQ]` 섹션 없음 → 본문에 `[REQ]` 헤더와 요구사항 목록 추가');
  }

  // 7. [REPORT]
  if (!lines.some(l => l.trim() === '[REPORT]')) {
    errors.push(
      '`[REPORT]` 섹션 없음 → 본문에 `[REPORT]` 헤더와 리포트 형식 지시 추가'
    );
  }

  // 8. 모델: 줄이 있으면 값이 Opus 또는 Sonnet
  const modelLine = lines.find(l => /^모델:/.test(l));
  if (modelLine) {
    const val = modelLine.replace(/^모델:\s*/, '').trim();
    if (!/Opus|Sonnet/.test(val)) {
      errors.push(
        `\`모델:\` 값 "${val}" 불인정 → \`모델: Opus\` 또는 \`모델: Sonnet\` 으로 수정`
      );
    }
  }

  // 9. [REPORT] 에 /loop 금지 문구 — [REPORT] 이후 줄에서 /loop 가 금지 명시되어야 함
  const reportIdx = lines.findIndex(l => l.trim() === '[REPORT]');
  if (reportIdx !== -1) {
    const reportSection = lines.slice(reportIdx).join('\n');
    if (!reportSection.includes('/loop')) {
      errors.push(
        '[REPORT] 섹션에 `/loop` 금지 문구 없음 → `[REPORT]` 아래에 `/loop · 예약 깨우기 금지` 추가'
      );
    }
  }

  return { file: filePath, errors };
}

let anyFail = false;
for (const f of FILES) {
  const { file, errors } = checkFile(f);
  if (errors.length === 0) {
    console.log(`PASS  ${file}`);
  } else {
    anyFail = true;
    console.log(`FAIL  ${file}`);
    for (const e of errors) {
      console.log(`  ✗ ${e}`);
    }
  }
}

process.exit(anyFail ? 1 : 0);
