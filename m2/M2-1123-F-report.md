DONE — PR #238 생성 · mergeable (master 충돌 없음)

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/238

## mergeable
- master 최신 rebase 완료 · 충돌 없음
- M0-1123-G(playwright 잡)와 겹치는 라인 없음 — playwright `runs-on` 미변경

## 변경 파일
- `.github/scripts/route-fork.sh`: `MAC_LIGHT_RUNNER="curiocity-mac-fork-light"` 상수 · `_light_runner_online()` 헬퍼 · `RUNS_ON_LIGHT` 출력 · `_check_light` 테스트 함수 + light 케이스 5개
- `.github/workflows/ci.yml`: route outputs에 `runs_on_light` 추가 · assertions·flow-tests `runs-on` → `runs_on_light`
- `.github/workflows/lint.yml`: route outputs에 `runs_on_light` 추가 · lint `runs-on` → `runs_on_light`

## 자체 테스트 로그 (route-fork.sh --test)
```
=== route-fork.sh 단위 확인 ===
  ✅ idle runner → self-hosted
  ✅ draft PR → self-hosted
  ✅ main push → self-hosted
  ✅ offline runner (not registered) → queued self-hosted
  ✅ busy + used=0/5 → ubuntu
  ✅ busy + used=4/5 → ubuntu
  ✅ busy + used=5 quota=5 → self-hosted + 한도초과
  ✅ busy + used=5 extra=5 quota=10 → ubuntu
  ✅ busy + used=10 extra=5 quota=10 → self-hosted
  ✅ 합산: fork=2 + storeport=1 = 3 → ubuntu
  ✅ 합산: fork=3 + storeport=2 = 5 → self-hosted 한도초과
  ✅ 합산: fork=0 + storeport=5 = 5 → self-hosted 한도초과
  ✅ 합산: fork=2 + storeport=1 extra=2 quota=7 → ubuntu
  ✅ API fail → self-hosted fallback
  ✅ extra non-integer → self-hosted
  ✅ force_cloud + used=0 → ubuntu
  ✅ force_cloud + quota exceeded → self-hosted

── light 러너 배차 ──
  ✅ light online → fork-light
  ✅ light offline → heavy fallback
  ✅ API fail → heavy fallback
  ✅ cloud routing(busy) + light online → fork-light
  ✅ cloud routing(busy) + light offline → heavy fallback

결과: 22 통과 / 22 전체
```

## CI runner_name 기록
새 `curiocity-mac-fork-light` 러너 미설치 상태 → PR CI에서 assertions·flow-tests·lint는 `runs_on_light` = `["self-hosted","curiocity-mac-fork"]`(heavy 폴백)으로 실행 예정.
light 러너 등록 후 재실행 시 `runner_name`이 light 머신으로 전환됨.
