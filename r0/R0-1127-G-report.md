# R0-1127-G — 기존 고객 OK → 손님 화면 Welcome (서버 isPostSettlementStale 가 confirming 흐름 못 알아봄)

**원인: 확정 · 재현: 코드 경로로 확정(e2e 미실행) · 담당 앱: storeport commerce-core**
한 줄: 서버 `isPostSettlementStale` 이 `customer_phone` 세팅됨 + paid_age>30s 를 "settled" 로 판정해 CD 활성 snapshot 에서 제외 → CD 가 `{snapshot: null}` 받고 MainScreen 폴백. POS 는 `forPos=true` 로 조회해 영향 없음.

---

## [REQ-1] 재현

- **직접 실행**: **미실행**. iMac 하네스(`scripts/start-test-env.sh`) 는 storeport + Postgres + 3 서버 기동이 필요해 이 진단 세션에서 올리지 않음(M3-S 보존 하네스는 8082/9000/4321 포트 점유 · heavy 작업). 대신 코드 경로로 재현 조건을 특정.
- **재현 조건(둘 다 필요)**: (1) 기존 고객(`is_new_phone=false`) — `test_meros` 는 run 마다 초기화되므로 Case 1 은 항상 first_visit 로 흐름. (2) paid_at 이후 **30초 이상 경과 후** OK 를 누를 것 (`CD_STALE_PAID_SETTLED_MS = 30_000` · `apps/commerce-core/src/modules/register_session/lifecycle.ts:69`).
- **재현 테스트 (PR)**: [fork#287 draft](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/287) · branch `test/R0-1127-G-existing-customer-repro` · 파일 `e2e/cd-pos/case1b-existing-customer.spec.ts`. 번호 pre-seed + 결제 후 32s 대기 + OK → `confirm-panel` 기대. **지금 빨강이 정상(버그 증명)** · 머지 금지.
- Railway 운영 쪽만의 문제 아님: 서버 코드가 Railway 에도 로컬에도 같음. 로컬 iMac 하네스에서 동일 조건이면 같은 증상 재현됨(미실행 · 코드 경로로 판정).

## [REQ-2] 원인 (파일:줄)

흐름:
1. 손님이 Phone 키패드에서 번호 입력 → OK 클릭 → CD 가 `POST /customer-display/customer-flow {action: submit_phone, phone}` 호출.
2. 서버 orchestrator (`apps/commerce-core/src/lib/customer-flow/orchestrator.ts:206-214`):
   - `customer_phone = normalized.e164` 세팅
   - `state = 'confirming'` (기존 고객 · `is_new_phone=false` · transitions.ts:53-59)
   - 응답 반환 — 여기까지는 정상.
3. CD 는 응답의 `customer_flow` 를 `setLocalCustomerFlow` 로 낙관적 override (`apps/customer-display/app/index.tsx:418-420`). **한 틱은 confirm-panel 뜰 수 있음.**
4. 다음 polling tick (1000ms · `LiveSnapshotSource.pollIntervalMs` · `src/mocks/snapshot-source.ts:71`) 이 `GET /customer-display/snapshots/active` 호출.
5. 서버 `getActiveSnapshotForRegister` 가 모든 snapshot 을 돌며 `isPostSettlementStale(s, now)` 로 필터링 (`apps/commerce-core/src/modules/register_session/service.ts:612`).
6. `isPostSettlementStale` (`apps/commerce-core/src/modules/register_session/lifecycle.ts:71-90`) 가 TRUE 반환:
   - `snapshot_state === 'paid'` ✓
   - `paid_age > 30s` ✓ (조건 2)
   - `!isPhoneEntryOpen`: `customer_phone` 가 방금 세팅돼 `isPhoneEntryOpen` 이 false 반환 (`lifecycle.ts:107`) → 조건 통과
   - `settled = Boolean(customer_phone)` → TRUE
7. snapshot 이 `alive` 배열에서 빠짐 → `pickBestSnapshot([]) → null` → API 응답 `{snapshot: null}` (`apps/commerce-core/src/api/customer-display/snapshots/active/route.ts:45-51`).
8. CD `snapshot` state → null → `cdSnapshot=null` (index.tsx:322-323) + `cdFallbackMain=false` → render 분기 `else` → `else { screenNode = <MainScreen ... /> }` (index.tsx:752-759).
9. CD 는 **Welcome (MainScreen)** 로 표시. POS 는 `GET /admin/pos/registers/:id/snapshot` 가 `forPos=true` 를 넘겨(#468 `service.ts:589` + `api/admin/pos/registers/[id]/snapshot/route.ts`) 필터 비켜가 snapshot + `customer_flow.state='confirming'` 받음 → chip "Awaiting confirm".

**어느 조건에서 대기 화면으로 떨어지는가** — "스냅샷을 못 받았는지" = 서버에서 활성 목록에서 **제외됨** (polling·소켓 재연결 문제 아님). 1번 틱 뒤 완전 Welcome 으로 고착 — `setLocalCustomerFlow(null)` 이 `snapshot.updated_at` 변화 때마다 발화(index.tsx:287) 하지만 snapshot 자체가 null 이므로 effectiveFlow 읽을 데가 없음.

왜 #466 가드가 안 먹히는가 — #466 (`index.tsx:337-355`) 는 **클라이언트의 stalePaid** 에 `inActiveFlow` 가드를 추가했지만, 그 조건이 돌 때 이미 snapshot=null 이라 `useMemo` 는 `(line 322)` 에서 early return → 가드 실행 자체가 안 됨. 서버 쪽 `isPostSettlementStale` 이 동일 가드 없이 동작.

## [REQ-3] 배포 버전

- Railway commerce-core `GET https://admin.meros.id/health` → `{"ok":true,"version":"d5248b43",...}`
- `d5248b4 = feat(cd/ci): M2-1127-C — 손님 화면 spec-guard 자동화 (#470)` · storeport main HEAD 에서 2 커밋 뒤 (6f1d76d M0-1127-E, 012917d M1-1127-B).
- `#466 (c7b7ab0)` + `#468 (5bc91cb)` 모두 `d5248b4` 선조에 포함 → Railway 는 두 수정 **다 반영된 상태** 로 운영 중.
- 결론: 운영-main 차이가 원인 아님. 코드 자체 결함.

## [REQ-4] 11-26 23:05 "OK → 초기화" 와의 관계

- **같은 증상의 다른 갈래**. 11-26 23:05 은 handoff §6-2 에 기록된 "OK→초기화" 로 #466 (M0-1126-R) 가 클라이언트 쪽 `inActiveFlow` 가드를 추가하며 "고친" 사건.
- 11-26 23:05 재현 조건: Case 1 테스트 그대로(기존 번호 · paid_age>30s) · `handoff-20261127.md:46` 의 §6-2 2번 "보존 테스트는 '버튼이 있다' 만 봄, '흐름이 된다' 는 안 봄" 과 정확히 같은 지적.
- #466 는 **client stalePaid 경로만** 막음. 서버가 snapshot 을 null 로 넘겨주는 경로는 노출된 채 남음 → 11-27 13:01 Kyu 실기에서 재발.
- 이번 PR#287 는 `실` 서버 경로 e2e 로 핵심 흐름(결제→번호→Confirm→적립) 을 검증 → handoff §6-2-2 보강안 그대로.

## [REQ-5] 재현 테스트

- 파일: `e2e/cd-pos/case1b-existing-customer.spec.ts` (181 lines).
- 흐름: signIn → admin API 로 phone_e164 pre-seed → device_token → Cash 결제 → 32s 대기 → 번호 입력 → OK → `confirm-panel` 기대.
- 상태: 빨강(=정상 · 버그 증명). 수정 후 초록이 되어야 함.
- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/287 · draft · 머지 금지.
- 지금 CI 실행 금지(비싼 180s · workflow_dispatch 전용 · #281 설정 그대로 상속).

## [REQ-6] 덤 확인 2개 (읽기만)

### 6-1. 영수증 `Order #205` — POS 자체 세션 카운터
- 소스: `api/hooks/draft-orders.tsx:38-47,160-161,371-382` · fork 가 session 내 draft order 생성 순서로 1,2,3... 부여 → metadata.pos_order_num 에 stamp → 재시작 시 서버 `max(pos_order_num)` 로 복원 (**날짜 무관 · 매장별 서버 1~99 와 별개 카운터**).
- 즉 `Order #205` 는 **POS 세션 누적**(현재 저장된 draft orders 의 최댓값+1). 205 는 해당 레지스터에서 지금까지 만든 draft order 수.
- 큐 §7 "POS fork 자체 #N 카운터 PATCH 제거(선택)" 와 같은 건. storeport #465 (서버 매장별 #1~99) 와 중복 · fork 카운터 제거 예정 → M3 후순위.

### 6-2. 영수증 `No. R-261127-0001` — 폴백 아님, 서버 공식 `receipt_no`
- 소스: `apps/commerce-core/src/modules/receipt/service.ts:201` · `return \`R-${date_key}-${String(no).padStart(4,"0")}\`;` · `nextReceiptNo(date, scope_id)` 가 매일 1 부터 재시작하는 공식 영수증 번호.
- 매장 닉네임(prefix `PIM-26B…`) 세팅과 무관하게 **항상 `R-YYMMDD-NNNN`** 로 발급 — 큐가 말한 "폴백 형식" 은 오해. `PIM-26B1001` 는 `order_custom_display_id`(주문 번호) 이고, `R-261127-0001` 은 `receipt_no`(영수증 번호). **별개 두 필드**.
- 영수증 UI 의 "No." 라벨 아래 어느 필드를 찍는지가 핵심. CD/POS 영수증 템플릿에서 "No." = `receipt_no` 로 매핑돼 있으면 정상. Kyu 가 기대한 건 "No." = `order_custom_display_id` 였을 가능성 → 명세 `specs/screens/pos-payment-flow.md` · receipt 섹션에 "No." 필드 정의 확정 필요(명세↔구현 불일치 — R0 영역 아님 · 오케에 "덤 확인 결과" 로 전달).

## [REQ-7] 고치는 방법 제안

**바꿀 파일**: `apps/commerce-core/src/modules/register_session/lifecycle.ts`

**바꿀 줄**:
- 23 `LifecycleCandidate` 에 `customer_flow_state?: CustomerFlowState | null` 필드 추가 (import 는 이미 있음 — line 5).
- 85-89 `isPostSettlementStale` 의 `settled` 판정 앞에 `inActiveFlow` 가드:
  ```ts
  // R0-1127-G · submit_phone 직후 confirming 흐름 창에서 CD 가 Welcome 으로
  //   튀는 회귀 차단. customer_phone 이 세팅됐어도 customer_flow_state 가
  //   active (entering/first_visit/confirming) 면 "settled" 가 아님 —
  //   Cashier 가 Correct 를 누르기 전까지 "진행 중".
  const state = snapshot.customer_flow_state;
  if (state === "entering" || state === "first_visit" || state === "confirming") {
    return false;
  }
  const settled = ...
  ```

**예상 크기**: lifecycle.ts 6~8 줄 + 테스트 추가. 전체 패치 ~40줄.

**담당 앱**: **storeport commerce-core** (서버 · Railway 재배포 필요).

**사이드 이펙트 점검**:
- POS 쪽 `forPos=true` 는 이미 필터 자체를 건너뜀 → 영향 없음.
- #468 M0-1126-S 가 추가한 "paid+skipped+paid_age>30s 에서 POS 는 chip 유지, CD 는 대기" 는 `state === 'skipped'` 이므로 새 가드가 발화 안 함 → 동작 보존.
- Case 1 처음 방문 경로(test_meros 초기화 · 30s 미만 완주) 는 조건 2 (paid_age>30s) 자체에 안 걸리므로 영향 없음.
- client `#466 inActiveFlow` 가드는 서버 fix 뒤에도 그대로 둠 — snapshot 이 넘어온 뒤의 clientstalePaid 2차 방어선으로 유지.

**추가 보강(오케 판단)**: 수정 PR 에서 PR#287 의 `case1b-existing-customer.spec.ts` 가 초록이 되는지 검증 로그 첨부 — handoff §6-2-2 "실서버 경로 e2e 1개로 CI 상시" 딱 맞는 자리.

---

## 실행 기록

- 직접 돌린 명령:
  - `curl -s https://admin.meros.id/health` → `{"ok":true,"version":"d5248b43",...}`
  - `gh pr create --draft` → https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/287
  - `git push -u origin test/R0-1127-G-existing-customer-repro`
- 미실행:
  - `scripts/start-test-env.sh up` + `playwright test case1b-existing-customer.spec.ts` (iMac 하네스 fire — 여기서는 코드 경로로 확정, PR 머지 금지 지시 준수).
- 소요: ~30분 (상한 40분).
