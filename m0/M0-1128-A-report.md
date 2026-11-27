# M0-1128-A — case1 는 이미 GREEN · case1b 는 silent SHA fallback 으로 거짓 RED

**FAIL** (게이트 관문 여전히 open · 리허설 신뢰 회복용 workflow fix 1건 push · 실 리허설 재시도는 ci-mirror 갱신 필요)

**fork#296 head**: `fc11066` (M0-1128-A workflow fix) — 이전 head `f7c9b26`

---

## 실패 지점 (REQ1 · 한 줄)

**"상품 카드 hidden" 은 이미 해소됨 · 다른 단계임**. 두 failing run 모두 `case1.spec.ts` (FlashList 포함 full flow) **PASS**. `case1b.spec.ts` line 112 `getByTestId("keypad-panel") toBeVisible` 에서 FAIL — POS Re-enter 클릭 → CD 가 earned 패널을 유지 (`customer_flow.state="confirmed"`), keypad 전이 없음.

## 진짜 원인 (trace 역학 분석)

`/tmp/case1b-trace/resources/fc111b3854089c1c1b37db581ddf3f02e6d3748f.json` 분석:

```
POST /admin/pos/orders/.../phone-entry  (= openPostSettlementPhoneEntry)
→ {"eligible": false, "reason": "phone_already_linked", ...}
```

이 응답은 **pre-#480 코드**. storeport#480 f5fdb3ef 는 `phone_already_linked` 거절 분기를 명시적으로 제거했음. 즉, "SHA cf89b55 로 리허설" 이라고 적혀 있던 run 46029234882 가 **실제로는 pre-#480 코드**를 돌리고 있었음.

## 왜 그랬나 (infra 결함 · workflow silent fallback)

`.github/workflows/e2e-cd-pos.yml` 의 "Storeport SHA 체크아웃" 단계:

```
for src in /Users/KyuLee/projects/storeport $HOME/projects/storeport; do
  if [ -d "$src/.git" ] && git rev-parse ... >/dev/null 2>&1; then
    git worktree add ...
    exit 0
  fi
done
echo "::notice::... 미발견 — 미러 경로 유지"   # ← silent fallback
```

run 46029234882 log: `##[notice]storeport SHA cf89b55 로컬 클론에서 미발견 — 미러 경로 유지`. 미러의 `storeport.sha` 는 `f33eef82` (= storeport main HEAD). 따라서 리허설은 main pre-#480 코드로 돌아감 · case1b 가 pre-#480 거절 로직에 걸려 당연히 RED.

queue 의 서사 ("fork#296 FlashList 수정으로도 case1 빨강") 은 **log 오독** — case1 는 GREEN · case1b (= #480 게이트) 만 RED. 그마저도 실제 테스트 대상이 main 이었기 때문에 **의미 있는 RED 가 아님** (gate 는 pre-#480 에서 RED 가 정상).

## 수정 (fork#296 fc11066)

`.github/workflows/e2e-cd-pos.yml`:
- SHA 미발견 시 `git fetch origin + refs/pull/*/head` 재시도
- 재시도 후에도 미발견이면 `::error` + `exit 1` (notice → error)
- 이유 3줄 PR #296 본문에 기록 (REQ · 상시 조항 ⓒ)

## 리허설 결과 표 (REQ4·REQ5)

| PR | fork head | storeport_sha | run URL | 결과 | 의미 |
|---|---|---|---|---|---|
| storeport#480 | `f7c9b26` (fork#296 old) | `cf89b55` | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46029234882 | case1 ✓ · case1b ✘ (keypad-panel 미노출) | **거짓 RED** — silent fallback 으로 실제 main 테스트 |
| storeport main | `f7c9b26` | (mirror f33eef82) | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46029217384 | case1 ✓ · case1b ✘ | **REQ5 verify-of-verify** — pre-#480 case1b RED 확인 (기대값 · 게이트 정합) |
| storeport main | `fc11066` (fork#296 new) | (mirror) | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46082428654 | case1 ✓ · case1b ✘ | fix push 후 재확인 — 동일 결과 (case1b RED on pre-#480 코드) |
| storeport#480 | `fc11066` | `cf89b55146beef439352620b5b0b3980895d815f` | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46082498598 | **bail** at Storeport SHA step | **새 workflow 정상 동작 확인** — ci-mirror runner 에 storeport 로컬 클론 없음 · fail-fast · silent fallback 차단 성공 |
| fork#294 `bc236af` | — | — | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46082199630 | **bail** at Storeport 미러 경로 확인 | 러너 `curiocity-mac-fork` (= `kyu.lee` user) 에 `/Users/KyuLee/ci-mirror/storeport` 자체 없음 (다른 러너 머신) |
| fork#291 `19e5b8e` | — | — | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46082205661 | **bail** at Storeport 미러 경로 확인 | 동일 — `kyu.lee` 러너 ci-mirror 부재 |

## 보류된 과제 (M0-1128-A 범위 밖 · 별개 티켓 필요)

1. **ci-mirror 갱신 (storeport 쪽)** — storeport Actions → `ci-mirror-main` 재실행 (가능하면 #480 SHA 체크아웃 포함). 아니면 M0 러너에서 `git fetch origin pull/480/head` 수동 수행.
2. **러너 `curiocity-mac-fork` (= `kyu.lee` 사용자) ci-mirror 설정 부재** — 두 fork heavy 러너 (`ci-box-fork-heavy-imac` · `curiocity-mac-fork`) 간 ci-mirror 공유 안 됨. 운영 결정 필요: (a) 둘 다 ci-mirror 주입, (b) 라벨 분리로 heavy-mirror 러너만 e2e-cd-pos 가 소비, (c) workflow 에서 clone-from-github fallback (PAT 가 생기면).
3. **#480 Re-enter 실제 동작 검증** — 위 1 완료 후 `gh workflow run e2e-cd-pos.yml --ref fix/M1-1127-L-flashlist-reenter -f storeport_sha=cf89b55146beef439352620b5b0b3980895d815f` 재실행 → case1b 가 GREEN 이면 #480 의 실질 수정 확진. RED 이면 #480 의 Re-enter 수정에 추가 버그 (별도 조사).

## 착지 전 자기 검증

- commit `fc11066` push 완료 · fork#296 head 로 등재.
- 새 workflow 동작 **실측 확인** — run 46082498598 가 `fetch 후에도 미발견` 으로 fail-fast (옛 silent `::notice` 미사용 확진).
- case1 GREEN · case1b RED 상태 **3개 run 동일** (46029234882 / 46082177148 / 46082428654) — 리허설 재현성 확인.
- iMac 로컬 수동 수행은 미실행 ("미검증" 명시 — 현 세션 박스엔 Medusa+CD+POS harness 없음).
- 네이티브 (Android/iPad) 동작 변경 없음 (workflow 파일만 수정 · 앱 코드 미터치 · 테스트 보존 요구 충족).
- 앱 쪽 FlashList 근본 수정 (REQ2) **미수행 — 근거**: case1 이 이미 GREEN · FlashList 는 fork#296 기존 test-side micro-resize 로 해소됨. 불필요한 앱 수정 추가 금지 (CLAUDE.md "작업 범위 외 변경 금지").

## 범위

- fork#296 only — storeport 측은 건드리지 않음 (queue 의 "다른 허브 PR 브랜치 커밋 금지" 준수).
- workflow 변경만 (`.github/workflows/e2e-cd-pos.yml`) — fork 앱 소스 / e2e 테스트 소스 unchanged.
