storeport PR #404 · 원인 Fallback이 in_progress run만 조회+heavy-mac 이름 필터→타 run busy mac job 미감지 · 판정 방식 in_progress+queued 양쪽 run 조회·curiocity-mac 라벨 job(in_progress|queued)·자기 run 제외 · 테스트 18/18 · 실측 runner_busy=true → quota exceeded → self-hosted + 라벨(quota 초과 맞는 동작) https://github.com/CuriocityDevAi/storeport/actions/runs/44551925338

## 원인 (1~3줄)

runners API 는 GITHUB_TOKEN 으로 조회 불가 → Fallback 경로 사용.
Fallback 이 `status=in_progress` run 만 조회하고 `.name == "heavy-mac"` + `.status == "in_progress"` 필터를 사용해, 다른 run 의 in_progress heavy-mac job 을 조회했으나 job 이름 불일치 or API 응답 지연으로 감지 실패.
결과: `runner_busy=false → self-hosted (runner idle)` 로 오판정.

## 수정 내용

**`.github/scripts/route-heavy.sh`** (Fallback 교체)
- 쿼리: `in_progress` 단독 → `in_progress` + `queued` 양쪽 (per_page=50 각 1회)
- 필터: `.name == "heavy-mac"` + `.status == "in_progress"` → curiocity-mac 라벨 + status `in_progress|queued`
- 자기 run(`GITHUB_RUN_ID`) 제외
- MOCK_FALLBACK / MOCK_GH_RUNS / MOCK_GH_BUSY_RID 모의 변수 추가

**`.github/workflows/ci.yml`**
- route job `timeout-minutes: 3 → 6` (runner_busy=true 판정 후 _cloud_today 가 100건 완료 run jobs API 순회, ~2.5분 소요 → 기존 3분 초과)
- `permissions: actions: read` 는 기존에 존재 · 변경 없음

## 테스트

```
bash .github/scripts/route-heavy.sh --test
결과: 18 통과 / 18 전체
```

신규 케이스 (4개):
- fallback: other run busy(in_progress) → cloud ✅
- fallback: no other run → self-hosted ✅
- fallback: queued-only run busy → cloud ✅
- fallback: self run excluded → self-hosted ✅

## 실측

run 44551925338 (fix/M1-1119-V-route-busy PR #404 push):
- heavy-mac 이 44546988626 에서 in_progress 중 (15:03 ~15:12 KST 이후)
- route 로그: `runner_busy=true` ✅
- `cloud_today=6 quota=5 → quota exceeded → self-hosted + 라벨` ✅
- 한도 초과 시 self-hosted + 라벨 = 올바른 동작 (REQ 명시)
- run URL: https://github.com/CuriocityDevAi/storeport/actions/runs/44551925338
