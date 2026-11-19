# M2-1119-M 완료 보고

멈춘 job PR #394 pos-integration 단계 11분 소요 · 취소 X (자연 완료 run #757) · push 미트리거 원인 branch 2 커밋 뒤처짐 refs/pull/merge 계산 실패 → rebase 수정 · overflow 배차 O · 하루 한도+extra O · 초과 라벨 O · ubuntu 실측 2m25s·O (run #761 heavy GitHub Actions 1000007283) · step timeout O (pos-integration 30m)

## 1. 멈춘 job 조사

- 대상: run #757 (`ci/M2-1119-J-one-heavy` PR #394)
- 조사 결과: **멈추지 않음**. pos-integration step 이 05:50 UTC 에 시작해 ~11분 소요
  (macOS Postgres 기동 포함 정상 범위). 06:01 UTC 에 job 전체 성공 완료.
- 취소: X (불필요)
- 추가 조치: pos-integration `timeout-minutes: 30` 추가 (M2-1119-M)

## 2. push 미트리거 원인 (M2-1119-M 착지)

- 현상: `ci/M2-1119-J-one-heavy` 에 M2-1119-L 커밋 3건 push 후 CI 미트리거
- 원인: branch 가 main 보다 2 커밋 뒤처진 상태
  (`9f628d9 M2-1119-I` · `6b86e33 docs/runbook` — squash merge 로 main 착지된 커밋)
  → GitHub `refs/pull/394/merge` 임시 머지 커밋 계산 실패
- 수정: `git rebase origin/main` → 1db0b1d (M2-1119-I) skip · 이후 push 에서 CI 정상 트리거

## 3. 클라우드 overflow 배차 구현 (M2-1119-M)

### 추가 파일

| 파일 | 내용 |
|------|------|
| `.github/scripts/route-heavy.sh` | 배차 결정 스크립트 (10 단위 확인 · 모두 통과) |
| `.github/actionlint.yaml` | curiocity-mac / curiocity-mac-light 라벨 등록 |

### ci.yml 변경

| 항목 | 변경 |
|------|------|
| `workflow_dispatch` | `force_cloud: boolean` 입력 추가 |
| `permissions` | `pull-requests: write`, `actions: read` 추가 |
| `route` job | light 러너에서 배차 결정 → `runs_on` / `is_cloud` 출력 |
| `heavy` job | `runs-on: fromJSON(needs.route.outputs.runs_on)` |
| `services: postgres:16` | ubuntu-latest 전용 (Linux only) |
| `cache: pnpm` (Setup Node) | `runner.os == 'Linux'` 조건부 |
| `pos-integration Wait for Postgres` | `runner.os != 'Linux'` 조건 추가 |
| `pos-integration` timeout | `timeout-minutes: 30` |

### 배차 로직

```
main push / draft PR            → self-hosted curiocity-mac
PR + runner idle                → self-hosted curiocity-mac
PR + runner busy + used < quota → ubuntu-latest
PR + runner busy + used ≥ quota → self-hosted + 라벨 ci-cloud-quota-exceeded
API 오류                        → self-hosted (안전 fallback)
```

한도: 5건/일 (WIB) + relay `ci/cloud-quota/<DATE>.json` `.extra`

### 단위 확인 (route-heavy.sh --test)

10/10 통과:
- idle runner → self-hosted ✅
- draft PR → self-hosted ✅
- busy + used=0/5 → ubuntu ✅
- busy + used=5 quota 5 → self-hosted ✅
- busy + used=5 extra=5 → ubuntu ✅
- busy + used=7 extra=5 quota=10 → ubuntu ✅
- busy + used=10 extra=5 quota=10 exceeded → self-hosted ✅
- API fail → self-hosted fallback ✅
- main push → self-hosted ✅
- force_cloud + used=0 → ubuntu ✅

## 4. ubuntu 실측 결과

- 트리거: `workflow_dispatch` `force_cloud=true` (run #761)
- route 출력: `runs_on="ubuntu-latest"` `is_cloud=true`
- heavy runner: `GitHub Actions 1000007283` (runner_group: GitHub Actions)
- heavy 소요: 06:17:07–06:19:32 UTC = **2분 25초**
- postgres:16 service container: 정상 기동 (Linux path 활성)
- 결론: **성공** ✅
