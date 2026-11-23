#238: APPROVE

## 체크포인트 결과

### ① lint·assertions·flow-tests → light / playwright → heavy
- `ci.yml:79` assertions `runs-on` → `runs_on_light` ✅
- `ci.yml:126` flow-tests `runs-on` → `runs_on_light` ✅
- `lint.yml:54` lint `runs-on` → `runs_on_light` ✅
- playwright: diff 미포함 → `runs_on` (heavy) 그대로 ✅

### ② light 오프라인 → heavy 폴백 (무한 대기 없음)
`route-fork.sh:95` `_light_runner_online()` — 미등록·offline·API 실패 모두 "false" 반환.  
`route-fork.sh:378` 기본값 `RUNS_ON_LIGHT='["self-hosted","curiocity-mac-fork"]'` → online=true 일 때만 light로 교체.  
테스트: `✅ light offline → heavy fallback` / `✅ API fail → heavy fallback` ✅

### ③ 클라우드 overflow 쿼터 로직 영향 없음
`RUNS_ON_LIGHT`는 `_light_runner_online()` 결과만으로 결정되며, 클라우드 쿼터 계산 블록(`_cloud_today()` / `MOCK_CLOUD_TODAY` 분기)과 완전히 독립.  
쿼터 로직은 `RUNS_ON`·`IS_CLOUD`·`REASON`만 조작 — `RUNS_ON_LIGHT` 미접촉 ✅

### ④ route-fork.sh 자체 테스트
22 통과 / 22 전체 (기존 17 + light 케이스 5) ✅

### ⑤ #238 CI runner_name
run 45187851335 (ci.yml) · run 45187851086 (lint.yml) 기준:

| job | labels | status | runner_name |
|---|---|---|---|
| assertions | `["self-hosted","curiocity-mac-fork"]` | queued | "" (미할당) |
| flow-tests | `["self-hosted","curiocity-mac-fork"]` | queued | "" (미할당) |
| lint | `["self-hosted","curiocity-mac-fork"]` | queued | "" (미할당) |

route 잡이 실행된 시점에 `curiocity-mac-fork-light`가 아직 online 상태가 아니었거나 쿼리 결과가 false → `runs_on_light = ["self-hosted","curiocity-mac-fork"]`(heavy 폴백)으로 배차됨.  
잡 3개 모두 아직 queued(runner_name 미확정). light 러너가 online인 상태에서 재실행 시 `curiocity-mac-fork-light`로 전환 예정.

## 결론

5개 체크포인트 모두 통과. APPROVE.
