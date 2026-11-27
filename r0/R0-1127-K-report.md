storeport#474: CHANGES · 필수 1건 · 권고 1건 · heavy-mac PASS (14m2s · run 45952426653)
case1b: 미실행 · case1: 미실행 · 하네스 iMac 전용(스크립트 헤더) + MacBook Pro M1 16GB OOM 위험 · 로컬 단위 test 는 PR 브랜치 worktree 에서 재실행

## 헤더
- PR: https://github.com/CuriocityDevAi/storeport/pull/474
- head: 1c58456ca25cda6aab4a474784efc9f9cad650cd
- 리뷰 코멘트: https://github.com/CuriocityDevAi/storeport/pull/474#issuecomment-7212160163
- 머신: MBP-M1 · 16 GB · darwin 25.6.0
- 결론: **CHANGES** (필수 1 · 권고 1)

## CI 상태 (gh pr checks 474 재확인)
| check | conclusion | time |
|---|---|---|
| heavy-mac | **PASS** | 14m2s |
| heavy-cloud | SKIPPED (정상 · M1-1127-B 이후 cloud 넘김 폐지) | 0s |
| changes-filter | PASS | 19s |
| check (feature-map) | PASS | 27s |
| markers-and-forbidden | PASS | 21s |
| route | PASS | 17s |

첫 확인 시(리뷰 시작 13:55 경) heavy-mac IN_PROGRESS — 최초 1번은 "CI 미확인" 상태였고, 코멘트 제출 직전(14:20 경) PASS 확인.

## 재현 테스트(fork#287) 실행 시도 결과
명령 수립 경로:
```
# 하네스가 main 미러만 보는 구조여서 PR 브랜치 체크아웃을 STOREPORT_PATH 로 주입.
git -C ~/projects/storeport worktree add /tmp/sp-pr474 pr-474  # OK
cd ~/projects/agilo-medusa-pos-fork
STOREPORT_PATH=/tmp/sp-pr474 bash scripts/start-test-env.sh up  # 미실행
# 이어서 기대했던:
# pnpm --filter cd-pos exec playwright test e2e/cd-pos/case1b-existing-customer.spec.ts
# pnpm --filter cd-pos exec playwright test e2e/cd-pos/case1.spec.ts
```
결과: **하네스 up 호출 안 함**. 사유:
1. `scripts/start-test-env.sh` 헤더에 "맥북에서는 메모리 상 commerce-core 기동이 무거움 → 아이맥 전용" 명시.
2. `vm_stat` 당시 Pages free=13101(≈204MB) · `top -l 1` PhysMem 15G used of 16G · load avg 15.43 · swap 활발(swapins 1.8M · swapouts 2.6M · compressor 5.2G). Medusa commerce-core + customer-display + POS web 3-프로세스 상주를 더하면 OOM/스왑 지옥.
3. `case1b-existing-customer.spec.ts` 파일은 fork main 에 없음 · `origin/test/R0-1127-G-existing-customer-repro` 브랜치에만 존재(commit 74e4553). fork main 미러 머지가 아직 안 된 상태 — 아이맥 self-hosted 러너도 이 spec 을 PR 브랜치로 바로 돌리려면 mirror 경로 override 필요.
4. ssh 로 접근되는 imac(100.82.115.70) 은 relay heartbeat 머신으로, pnpm/node 는 있지만 storeport · fork 체크아웃이 전혀 없고 psql 없음 — 하네스 올릴 수 없음. CI 의 heavy-mac self-hosted 러너는 "curiocity-mac" 레이블로 별도 머신이며 외부에서 직접 호출 못 함.

대신 수행한 로컬 검증:
```
git -C ~/projects/storeport fetch origin pull/474/head:pr-474
git -C ~/projects/storeport worktree add /tmp/sp-pr474 pr-474
cd /tmp/sp-pr474 && pnpm install --frozen-lockfile --prefer-offline  # 30s
cd /tmp/sp-pr474/apps/commerce-core && pnpm test  # 886 passed / 75 suites · 36.8s
cd /tmp/sp-pr474/apps/customer-display && pnpm install --frozen-lockfile --prefer-offline && pnpm test  # 334 passed / 17 files · 476ms
cd /tmp/sp-pr474/apps/commerce-core && pnpm typecheck  # 0 error
cd /tmp/sp-pr474/apps/customer-display && pnpm typecheck  # 0 error
```
전부 PR 본문의 수치와 **일치**. 임시 regression spec 하나를 `src/modules/register_session/__tests__/verify-regression.spec.ts` 로 추가해 가드 경계 검증 후 삭제 · worktree 도 `git worktree remove /tmp/sp-pr474 --force` 로 정리.

## 핵심 발견 (필수 1건)

**§7-a 20초 idle → Welcome 복귀 보장이 서버 측에서 끊김.**

PR 설명 §7(a) 는 "skip (entering → skipped) 전이 정상" 이라 명시. 실제 코드 경로:
- CD 20초 타임아웃 → `app/index.tsx:551-556 handleTimeout` → `skipPhoneOnServer(snapshot.id, ...)` → `POST /customer-display/snapshots/:id/skip-phone` (`skip-phone/route.ts:65`) → `svc.skipSnapshot` 직접 호출. **orchestrator 를 거치지 않음**.
- `svc.skipSnapshot` (`service.ts:663-678`) 은 `skipped_at=now` + `phone_entry_state='skipped'` 만 세팅 · `customer_flow_state` 미건드림.
- CD 쪽은 결제 후 3초에 `start_entry` 자동 호출(`app/index.tsx:449-463`) → `customer_flow_state='entering'`. 20초 idle 타임아웃 시점에도 `entering` 그대로.

조합: `paid + skipped_at=now + phone_entry_state='skipped' + customer_flow_state='entering' + paid_age=60s`
- **수정 전** `isPostSettlementStale` → `true` (settled && age>30s) → non-forPos `getActiveSnapshotForRegister` 가 필터 → CD `{snapshot: null}` → `display-machine.ts:362-368` `stay('main')`.
- **PR 반영 후** `isPostSettlementStale` 의 inActiveFlow 가드가 최상단에서 `entering → return false` 로 빠져버려 `isPhoneEntryOpen`/settled 체크를 못 탐 → non-forPos 응답에 그대로 포함 → `display-machine.ts:340-353` paid 분기가 `currentScreen==='main'` 에서 `stay("receipt")` 반환 → **방금 지운 영수증으로 되돌아감**.

로컬 PR worktree 임시 테스트(이후 삭제) 결과:
```
expect(isPostSettlementStale(snap_with_skipped_and_entering, NOW)).toBe(true);
Expected: true · Received: false  ← 가드 narrowing 확인
```

수정 방향(코멘트에 3안 제시):
1. 가드 순서 재정렬: `if (!settled && inActiveFlow) return false` — settled 가 아닐 때만 진행 중 보존
2. `skip-phone/route.ts` 가 `svc.skipSnapshot` 대신 `applyCustomerFlow({ action: 'skip' })` 사용 — orchestrator 가 state=skipped 로 전이
3. `skipSnapshot` 자체가 `customer_flow_state='skipped'` 로 리셋

어느 쪽이든 **회귀 테스트 추가 필수**: 위 조합이 stale=true 를 반환하도록. 추가로 §7-a 자체를 커버하는 e2e(20초 idle + paid_age>30s → CD=main · POS 칩=Skipped+Ask again) 누락 — fork 측에 `case1c-idle-skip.spec.ts` 혹은 유사 신설 권고.

## 권고 1건
`isPhoneEntryOpen` 의 ghost abandon 가드에 `phone_entry_state === 'waiting'` 이 `hasInteraction` 으로 들어감. 현재는 `waiting` 을 쓰는 세팅 포인트가 start_entry·ask-phone-on-display 두 곳뿐이라 문제가 되진 않지만, 향후 `markSnapshotPaid` 등에 초기값으로 `waiting` 이 추가되면 guard 가 노-옵 됨. `hasInteraction` 은 `typing` + `phone_partial != null` 조합으로 좁히는 쪽을 권고.

## 보존·수치 확인
- **REQ 2①** 손님이 느리게 번호 입력: `updatePhonePartial` (`service.ts:635-642`) 150ms debounce 로 `phone_partial` 계속 갱신 → ghost guard `hasInteraction=true` → 안 걸림. ✓
- **REQ 2②** POS `AskPhoneOnDisplay` 재개: `service.ts:1024-1035` 가 `customer_flow_state='entering'` + `phone_entry_state='waiting'` + `skipped_at=null` 리셋 → 즉시 재개. ✓
- **REQ 4** tension 100 → 51: 스프링 주기 T ∝ 1/√(tension) · √(100/51) = **1.4007** → 정확히 40% 느림. friction=8 유지로 damping ratio 보존. 수학적으로 "40% 느리게" 의 정확한 해석. ✓
- 처음 방문(Case 1) · #466(클라 inActiveFlow 가드) · #468(forPos Skipped 유지) · `08` prefix 영향 없음 — `confirmed` 로 전이 후 기존 stale 판정 복귀 테스트가 PR 에 포함돼 통과.

## 상시 규칙 적용
- CI = PASS 확인된 상태(heavy-mac 14m2s). 리뷰 시작 시 QUEUED 상태였으나 코멘트 제출 직전에 완료 확인.
- 러너 폴더(~/projects/curiocity-relay) 는 건드리지 않음(claim 경로만).
- 커밋·푸시·머지·브랜치 수정 없음 — 리뷰 전용. 워크트리 `/tmp/sp-pr474` 는 PR 브랜치(`pr-474`) 임시 체크아웃 후 `git worktree remove --force` + `git branch -D pr-474` 로 완전 정리.
- 리포트는 이 파일에만 저장. 리포 안에 쓰지 않음.
- 소요 ≈ 25분 (45분 상한 내).

## 참고 파일/라인
- `apps/commerce-core/src/modules/register_session/lifecycle.ts:79-151` (수정 영역)
- `apps/commerce-core/src/modules/register_session/service.ts:663-678` (skipSnapshot) · `1024-1035` (ask-phone-on-display)
- `apps/commerce-core/src/api/customer-display/snapshots/[id]/skip-phone/route.ts:63-70`
- `apps/customer-display/app/index.tsx:449-463, 544-556`
- `apps/customer-display/src/lib/display-machine.ts:340-353`
- `apps/commerce-core/src/modules/register_session/__tests__/order-snapshot.unit.spec.ts:515-633` (PR 추가 테스트)
