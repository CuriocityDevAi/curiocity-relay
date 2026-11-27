PASS · PR #64 · head bb7b30f · `node --test scripts/test/*.test.mjs` 519 pass 0 fail (신규 oke-checkers 16 pass 포함 · 기존 503 회귀 없음)

## 작업 내용

**신규 파일 (전부 curiocity-relay)**:
- `scripts/oke/check-queue-prompt.mjs` — 큐 발부 전 필수 항목 린터
- `scripts/oke/merge-gate.mjs` — 머지 전 CI·R0 APPROVE 관문
- `scripts/oke/check-report.mjs` — 리포트 수거 시 판정·증거 검사
- `scripts/test/oke-checkers.test.mjs` — 16건 단위 테스트
- `scripts/test/fixtures/oke/**` — 큐·리포트·merge-gate JSON 픽스처 10건
- `scripts/oke/README.md` — 오케 3단계 사용법 5줄

## 테스트 실행 로그

```
$ node --test scripts/test/oke-checkers.test.mjs
1..16
# tests 16
# pass 16
# fail 0
# duration_ms ~1188ms
```

```
$ node --test scripts/test/*.test.mjs
1..519
# tests 519
# pass 519
# fail 0
# duration_ms ~20648ms
```

## 오늘(11-27) 큐 30건 전수 결과

```
$ node scripts/oke/check-queue-prompt.mjs queue/*/*-1127-*.md
FAIL  queue/m0/M0-1127-A.md   ✗ 충돌 없음 확인 없음
PASS  queue/m0/M0-1127-B.md
PASS  queue/m0/M0-1127-C.md
FAIL  queue/m0/M0-1127-D.md   ✗ 충돌 없음 확인 없음
PASS  queue/m0/M0-1127-E.md
PASS  queue/m1/M1-1127-A.md ~ M1-1127-F.md  (6건)
PASS  queue/m2/M2-1127-A.md ~ M2-1127-C.md  (3건)
FAIL  queue/m2/M2-1127-D.md   ✗ 충돌 없음 확인 없음
PASS  queue/m2/M2-1127-E.md ~ M2-1127-G.md  (3건)
PASS  queue/m3/M3-1127-A.md ~ M3-1127-F.md  (6건)
PASS  queue/r0/R0-1127-A.md ~ R0-1127-F.md  (6건)
→ PASS 27 / FAIL 3 (고치지 않음 — 과거 파일)
```

## 오늘(11-27) 리포트 26건 전수 결과

```
$ node scripts/oke/check-report.mjs <all reports>
WARN  m0/M0-1127-A-report.md   ⚠ 초록+진행 중 혼재
PASS  m0/M0-1127-B~D-report.md
WARN  m0/M0-1127-E-report.md   ⚠ 초록+진행 중 혼재
FAIL  m1/M1-1127-A~D-report.md  ✗ 판정 없음
PASS  m1/M1-1127-E-report.md
FAIL  m2/M2-1127-A~B-report.md  ✗ 자기 검증 흔적 없음
PASS  m2/M2-1127-C-report.md
WARN  m2/M2-1127-D~E-report.md  ⚠ 초록+진행 중 혼재
FAIL  m2/M2-1127-F-report.md    ✗ 자기 검증 흔적 없음
PASS  m3/M3-1127-A~B-report.md
FAIL  m3/M3-1127-C-report.md    ✗ 자기 검증 흔적 없음
PASS  m3/M3-1127-D-report.md
WARN  m3/M3-1127-E-report.md    ⚠ 초록+진행 중 혼재
PASS  r0/R0-1127-A-report.md
WARN  r0/R0-1127-B-report.md    ⚠ 초록+진행 중 혼재
PASS  r0/R0-1127-C-report.md
WARN  r0/R0-1127-D~E-report.md  ⚠ 초록+진행 중 혼재
PASS  r0/R0-1127-F-report.md
→ PASS 9 / WARN 7 / FAIL 7 (고치지 않음 — 과거 파일)
```

PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/64
