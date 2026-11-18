relay PR #4 · mem 샘플 O · 현재 used/total=15.72/16 GB · swap=9.81 GB

## 작업 완료 요약

**브랜치**: `m2/runner-mem` → PR #4 (머지 대기)
**커밋**: ee9eca40

## 구현 내용

### 신규 파일

**`scripts/lib/mem-sample.mjs`**
- `vm_stat` · `sysctl hw.memsize` · `sysctl vm.swapusage` · `memory_pressure -Q` 파싱
- 타임아웃 2s (루프 블록 방지) · 실패 시 null 반환
- standalone 실행: `node scripts/lib/mem-sample.mjs`

**`scripts/test/hub-runner-mem.test.mjs`**
- `parseVmStat` 단위 테스트 9개 전부 통과 (pageSize · free · speculative · wired · active · compressorPhysical · null 케이스 2개 · 다른 pageSize)

### 수정 파일

**`scripts/hub-runner.mjs`**
- `all.json`에 `mem: { total_gb, used_gb, compressed_gb, swap_used_gb, pressure, at }` 추가
- `mem_peak_today: { date, used_gb }` — 날짜 바뀌면 리셋
- 1시간마다 `status/runners/mem-log.ndjson` 한 줄 추가 (1MB 초과 시 오래된 줄 자르기)
- `fireMem()` 비동기 호출 (loop 시작 시 + 매 tick) — 30s 루프 블록 없음

## 로컬 샘플 출력 (2026-11-18T06:10:22Z)

```json
{
  "total_gb": 16,
  "used_gb": 15.72,
  "compressed_gb": 3.57,
  "swap_used_gb": 9.81,
  "pressure": "normal",
  "at": "2026-11-18T06:10:22.301Z"
}
```

**해석**: M1 16GB · 현재 사용 15.72 GB (98%) · 스왑 9.81 GB (11GB 중) · compressed 3.57 GB
→ 메모리 압박 실증 데이터 수집 시작 가능.

## 적용 방법

머지 후 러너 재시작:
```bash
# launchd 사용 중이면:
launchctl unload ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
launchctl load  ~/Library/LaunchAgents/com.curiocity.hub-runner.plist
```
→ `status/runners/all.json`에 `mem` 필드 등장 확인.
