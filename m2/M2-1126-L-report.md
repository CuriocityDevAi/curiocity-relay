PASS #51 e19eae045

## 수정 전/후 클라우드 잡 수

| 항목 | 수정 전 | 수정 후 |
|------|---------|---------|
| readRealCloudData 필터 | `!isMarkerJob` only | `isCountableJob` (skipped·cancelled 제외) |
| cancel-on-close | 카운트됨 (마커 아님) | MARKER_JOBS 추가 → 카운트 제외 |
| 오늘 클라우드 잡 | 103 (스크린샷 기준) | 24 (isCountableJob 기준) |

## 폭 100 렌더 스냅샷 (4줄)

```
  MBP M1 오늘     PR 10 · PT 8 · 잡 31
  iMAC M1 오늘    PR 12 · PT 9 · 잡 57
  클라우드 오늘   PR 8 · PT 6 · 잡 24 · 넘김 3/5
  전체 오늘       PR 15 · PT 12 · 잡 112
```

## 테스트 로그

```
node --test scripts/test/ci-watch-w113.test.mjs
# tests 15 / pass 15 / fail 0

node --test scripts/test/ci-watch-w112.test.mjs scripts/test/ci-watch-w110.test.mjs scripts/test/ci-watch-w111.test.mjs
# tests 33 / pass 33 / fail 0
```

## 변경 내역

### REQ 1 — 부풀림 뿌리 수정
- `readRealCloudData`: `!isMarkerJob(r.job)` → `isCountableJob(r)` (skipped·cancelled 제외)
- `isCountableJob` import 추가

### REQ 2 — 4줄 집계 개편
- `renderLayout` 에 `mbpPR`, `mbpPT`, `imacPR`, `imacPT` props 추가
- W10 클라우드 단독 줄 + W7 하단 합계 줄 → 4줄 (MBP / iMAC / 클라우드 / 전체)
- 전체 PR·PT = 중복 제거 고유 수 (규칙: 렌더 JSDoc + 테스트 주석에 명시)
- 전체 오늘 잡 = summaryJobs (기계별 잡 합)
- 라벨 열폭 14 고정 (`클라우드 오늘` 7CJK = 14 display cols) · 폭 100/140 정상
- `ci-watch.mjs` tick(): `computeMachineTodayPRStats` + `computePTForPRSet` 로 MBP/iMAC 집계

### REQ 3 — cancel-on-close 마커 판정
- **결정: 마커 추가**. PR 닫힘 정리 잡, 수 초 수행, 테스트·빌드 아님. route·changes-filter 와 동일 성격.

### REQ 4 — 일관성 테스트
- `ci-watch-w113.test.mjs` W10-일관성: cloudData.realCount == 클라우드 오늘 줄 잡 값
- W10-전체PR: summaryPR ≤ mbpPR + imacPR + cloudPR
- W10-no-duplicate: 하단 단독 PR·PT·잡 줄 없음

### REQ 5 — MBP `?` → `OFF`
- `buildMachineState` 내 `machineStatus`: 러너 목록 존재 + 모두 offline → `partial: false`
- 이전: `partial: isPoolPartial` (CI fetch 실패 여부 무관 `?` 표시)

### REQ 6 — 버전 1.13
- `CI_WATCH_VERSION = '1.13'` · 헤더 주석 갱신

## PR

https://github.com/CuriocityDevAi/curiocity-relay/pull/51
