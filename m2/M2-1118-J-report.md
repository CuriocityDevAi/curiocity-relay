relay PR #5 · v7.4 mem O · install 기본 v7.4 O · 현재 used/total 15.74/16 GB

## 작업 내용
- 브랜치: `m2/runner-mem-v74` (relay-dev 클론)
- PR: https://github.com/CuriocityDevAi/curiocity-relay/pull/5

## 변경 파일
1. `scripts/hub-runner-v7.4.mjs`
   - `sampleMem` import 추가
   - `MEM_LOG_FILE` / `MEM_LOG_MS` 상수 추가
   - `lastMemSample` / `memPeakToday` / `lastMemLogAt` 상태 변수 추가
   - `updateMemPeak` / `fireMem` / `appendMemLog` 함수 추가
   - `writeHeartbeat` payload 에 `mem` · `mem_peak_today` 필드 추가 (비동기·2s timeout·실패 시 null)
   - `writeHeartbeat` 에 1시간마다 `status/runners/mem-log.ndjson` 한 줄 + git add
   - `loop` 시작 · tick 마다 `fireMem()` 호출 (루프 블록 없음)
2. `scripts/hub-runner-install.sh`
   - TARGET 기본값: v7.3 → v7.4
   - FALLBACK 기본값: v7.2 → v7.3
3. `scripts/hub-runner.mjs`
   - M2-1118-I 변경 완전 되돌리기 (안 쓰는 옛 파일 오염 방지)

## 검증 결과
- `node --check scripts/hub-runner-v7.4.mjs` OK
- `node scripts/lib/mem-sample.mjs` 출력: used=15.74 GB / total=16 GB
- `node --test scripts/test/*.test.mjs` 122 pass / 0 fail

## 메모리 현황 (2026-11-18T06:39:57Z)
- total_gb: 16
- used_gb: 15.74
- compressed_gb: 4.79
- swap_used_gb: 11.36
- pressure: normal
