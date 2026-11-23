# M0-1123-G-report — PARTIAL (CI 러너 큐 대기 중 · 로컬 실측 OK)

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/237
- 브랜치: `fix/M0-1123-G-playwright-time` · head `2849a39`
- 리포: `CuriocityDevAi/agilo-medusa-pos-fork`
- CI playwright 소요 (로컬 측정 · master Mac): **wall 9분 50초** (`node scripts/run-all.mjs playwright --workers 4`).
- CI playwright 소요 (실측 · fork Mac 러너): **아직 미실측 — assertions+flow-tests 가 ≥ 33분 queued, playwright 시작 전**. 작업 상한 60분 초과 전 중단 · 큐 상태 그대로 보고.

## 1. 원인 (쉬운 말 1단락)

fork CI `playwright` 잡은 단일 Mac 러너 `curiocity-mac-fork` 에서 **27 개 하네스를 직렬 실행**하는 `scripts/run-all.mjs playwright` 를 돌린다. 하나하나는 4–287 초라서 짧지만, 합치면 25 분을 넘어 `timeout-minutes: 25` 에 매번 걸려 cancelled → master/PR 모두 빨간 체크. 멈추는 spec 이나 운영 URL 의존은 없고, 각 하네스는 random-port HTTP 서버 + 독립 Chromium + harness-id-prefixed 스크린샷 경로라 **공유 상태가 없음** = 완전 병렬화 가능.

## 2. 조치

### scripts/run-all.mjs

- `--workers N` 옵션 (기본 `playwright=4` · `assertions/guard=1`), `RUN_ALL_WORKERS` env override 가능.
- 간이 promise pool — spawn 순서 결정론, 완료 순서는 비결정론. 자식 stdout/stderr 는 완료 시 일괄 flush → 로그 섞임 없음.
- 결과 요약을 **"하네스 소요 (ms desc)" 표로 항상 출력** → 잡 로그 끝에서 어느 하네스가 늦었는지 즉시 파악.

### .github/workflows/ci.yml

- `Run Playwright harnesses` → `node scripts/run-all.mjs playwright --workers 4`.
- 주석으로 "random-port HTTP + 독립 Chromium = 공유 상태 없음" 사실 명시.
- `timeout-minutes: 25` **유지 · 상향 금지** (역사적 안전 마진 · 10 분 wall 이면 여유).

## 3. 전/후 하네스 소요 표

| 하네스 | 전 (CI master 09:25Z · 직렬) | 후 (로컬 workers=4) |
|---|---:|---:|
| m1-1105-ao-playwright | 287.3s PASS | 287.4s PASS ← floor |
| m3-1105-p-playwright | — (취소 전 미실행) | 202.5s PASS |
| m3-1105-n-quote-receipt-playwright | — (취소 전 미실행) | 195.9s PASS |
| m1-1105-q-playwright | 167.1s PASS | 167.2s PASS |
| m3-1105-y-preorder-pay-playwright | — (취소 전 미실행) | 164.0s PASS |
| m1-1105-aj-playwright | 163.5s PASS | 163.3s PASS |
| m3-1105-q-playwright | — (취소 전 미실행) | 126.3s FAIL★ |
| m1-1105-p-playwright | 122.6s PASS | 122.6s PASS |
| m3-1105-d-playwright | 96.7s FAIL★ | 96.9s FAIL★ |
| m3-1105-m-preorder-playwright | 96.4s FAIL★ | 96.4s FAIL★ |
| m1-1105-u-playwright | 83.9s FAIL★ | 84.0s FAIL★ |
| m1-1105-o-playwright | 83.2s FAIL★ | 83.3s FAIL★ |
| m1-1105-n-playwright | 78.2s FAIL★ | 78.3s FAIL★ |
| m3-1105-b-playwright | 67.7s FAIL★ | 67.7s FAIL★ |
| m3-1105-f-playwright | 51.2s FAIL★ | 51.2s FAIL★ |
| m1-1105-ae-playwright | 43.2s PASS | 43.3s PASS |
| m2-1105-c-settings-playwright | 39.7s PASS | 39.6s PASS |
| m1-1105-h-playwright | 8.0s FAIL★ | 38.0s FAIL★ |
| m1-1105-b-playwright | 37.0s PASS | 37.2s PASS |
| m3-1117-a-playwright | — (취소 전 미실행) | 9.0s PASS |
| (나머지 짧은 7개) | 4–5s PASS | 4–5s PASS |
| **합계 wall** | **25분+ (취소)** | **9분 50초 (3.87× 가속)** |

★ = master 선재존재 FAIL · M0-1123-G 범위 외 (아래 §5).

## 4. 열린 PR 대응 (스코프 외 미수정)

- #231 fix/M1-1123-G-mirror-url · #235 feat/M2-1123-E-receipt-queue-num · #236 feat/M3-1123-H-ask-on-display → **자기 spec 미수정**. 이 세 PR 어느 하나도 FAIL 하네스 세트(m1-1105-h/n/o/u · m3-1105-b/d/f/m/q)와 네임스페이스가 겹치지 않음. 현 FAIL 은 master 선재존재.

## 5. master 선재존재 FAIL (별건 — 이 티켓 범위 외)

- m1-1105-h / n / o / u
- m3-1105-b / d / f / m / q

위 9 건은 CI master 09:25Z run 로그에서도 FAIL 로 잡혔다. 각 하네스 로컬 로그에 어떤 step 이 터지는지 그대로 남아 있어 별도 티켓에서 바로 진단 가능. **이 PR 은 시간 문제만 해소** · FAIL/PASS 분포는 그대로.

## 6. CI 실측 상태 (대기)

- PR #237 opened 2026-11-23T13:45Z.
- CI run `45187100719`:
  - route: completed 13:47:09Z ✓
  - flow-tests: **queued** 13:47:10Z (37분째 미시작 at 14:20Z 측정)
  - assertions: **queued** 13:47:10Z (playwright 선행 · 못 시작하면 playwright 도 못 시작)
  - playwright: **대기 중** (`needs: [route, assertions]`)
- 사유: fork Mac 러너 `curiocity-mac-fork` 는 heavy 단일 러너. 오늘 master/PR run 여러 건 (M2-1123-E/F · M3-1123-G/H · M0-1123-E 등) 이 같은 러너 큐에 쌓여 있음. 재진입 후 다음 확인 지시 시 playwright 실측 분수 치환 예정.

## 7. 재현 (로컬)

```
cd <worktree>  # fix/M0-1123-G-playwright-time · dist/ 준비
node scripts/run-all.mjs playwright --workers 1   # 직렬 (옛 동작 · 25분+)
node scripts/run-all.mjs playwright --workers 4   # 병렬 (신기본 · ~10분)
RUN_ALL_WORKERS=6 node scripts/run-all.mjs playwright   # env override
```

## 8. 다음 단계 제안

1. (즉시) 열린 fork PR #237 CI 가 큐에서 나와 playwright 실측 시간 확정 → 이 보고서 §6 업데이트.
2. (별건) master 선재존재 FAIL 9건 → 각 1 티켓씩 할당 (제안 티켓 M0-1123-H 번들 또는 M3 별건).
3. (선택) 러너 큐 체증이 상시라면 `M2-1121-A` 정신에 맞춰 `curiocity-mac-fork-light` 추가 분리 (현재 ci/M2-1123-F PR 가 열려 있음). 본 티켓 범위 외.
