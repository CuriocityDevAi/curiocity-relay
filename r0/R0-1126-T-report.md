#48 APPROVE

## 판정 근거

### W1 — 평균대기 x 정렬 (폭 100 · 140)

`CI_AVG_X = 94` (2+16+2+22+2+14+2+14+2+16+2).

| 폭 | 허브 큐 머리줄 `평균대기` | 허브 줄 평균대기 값 |
|---|---|---|
| 100 | **생략** (CI_AVG_X+8=102 > 100 · 올바름) | x=94 표시 (94+4=98 < 100) ✓ |
| 140 | x=94 표시 (102 ≤ 140) ✓ | x=94 표시 ✓ |

직접 렌더 스냅샷으로 양 폭 모두 확인.

### W2 — 오늘 처리 수치 검증 · unknown 29건

`buildTodayMachineStats` / `buildTodayPoolMachineStats` 양쪽에 동일 필터 적용:
1. `isMarkerJob(r.job)` — Set(`route`, `heavy-cloud`, `ci-summary`, `feature-map-route`) + `ci-summary*`
2. `r.conclusion === 'skipped' || r.conclusion === 'cancelled'`

오늘(2026-11-26) JSONL 273건 직접 집계:
- pool별 합산(MBP=7, iMAC=68) = `buildTodayMachineStats` 합산 일치 ✓

**runner_name=null 35건** (skipped 29 · cancelled 6):
- 전부 conclusion 필터로 먼저 제외됨 → 미집계 올바름 ✓
- `classifyMachine(null) = 'cloud'` 이지만 필터가 먼저 실행되므로 classifyMachine 도달 불가
- 모두 `completed_at` 존재하는 완료 잡이며, 실행 전 skip/cancel된 것이므로 runner 미배정 정상
- 대기 중(queued) 잡이 아님 → "완료 잡이면 원인" → 원인: 선행 조건 미충족으로 CI skip/cancel

### W3 — 실행 중 프롬프트 대기 칩 제거

`tick()` 내 `allJson?.hubs?.[hub]?.current` ID를 `rawUnclaimed` 필터에서 제외 ✓

W3-1 테스트: hubPending 에서 current ID 미포함 시 허브 줄 칩 중복 없음, └ 줄 현재 ID 표시 모두 통과 ✓

### W4 — 쉼(N) / ⠋ID 3m (N) / —(N)

직접 렌더(폭 140 기준):
- `쉼(7)`, `쉼(2)`, `쉼(41)`, `쉼(20)` — idle MBP/iMAC 셀 ✓
- `—(12)`, `—(2)`, `—(4)` — idle cloud 셀 ✓
- fork-light cloud(count=0, todayN=0) → `—` (괄호 없음, nStr='' · 올바름) ✓
- `오늘 처리(잡)` 라벨 ✓

### 테스트 결과

```
$ cd /Users/kyu.lee/projects/curiocity-relay-wts/M2-1126-F
$ node --test scripts/test/ci-watch-w110.test.mjs
tests 10 / pass 10 / fail 0

$ node --test scripts/test/*.test.mjs
tests 394 / pass 394 / fail 0

PTY-1: 잔상 자기 검증 ② — ok
P-1a~d: truncateAnsiWidth — ok
ci-watch-machines.test.mjs 49개 — ok
```

### 참고 (차기 발부 검토)

`fmtMachineCell` running 경로: `⠋M2-1126-F 3m (7)` ≈ 17 display cols > CI_COL_MBP=14.  
`padEndWidth`는 overflow 시 패딩 없이 반환 → 약간 열 넘침 가능.  
기존 `⠋M2-1126-F 3m`=13도 타이트한 설계였으므로 현행 허용 범위 내.

---
실행 명령: `node --test scripts/test/ci-watch-w110.test.mjs`, `node --test scripts/test/*.test.mjs`  
검토 worktree: `/Users/kyu.lee/projects/curiocity-relay-wts/M2-1126-F`
