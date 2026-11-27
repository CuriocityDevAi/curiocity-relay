e2e-cd-pos case1: 진행 중 · case1b(#287): 진행 중 — run URL 기록 후 착지(결과는 오케 확인)

## Health
- endpoint: https://admin.meros.id/health
- version: b6f89c16 (storeport#474 머지 b6f89c1 이상 ✔ — 배포 완료)

## Dispatch 결과
| run | 브랜치 | dispatch 시 상태 | run URL |
|-----|--------|-----------------|---------|
| case1 (master) | master | in_progress | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45963405636 |
| case1b (#287) | test/R0-1127-G-existing-customer-repro | queued | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45963410193 |

## 비고
- 두 run 모두 실행 중(큐/in_progress) — 20분 상한 내 미완료로 착지.
- #287 PR draft 상태 유지 확인 (isDraft: true, state: OPEN).
- 최종 PASS/FAIL 판정은 오케가 run URL 에서 직접 확인 요망.
