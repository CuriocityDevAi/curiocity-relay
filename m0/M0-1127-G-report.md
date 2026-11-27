PASS (가드 수정·테스트 그린) · heavy-mac QUEUED 로 PR#474 착지 · head 1c58456c

# M0-1127-G — 기존 손님 OK 후 Welcome 튐 · 20초 Skipped · 유기 ghost + 키패드 ×1.4

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/474
- **브랜치**: `fix/M0-1127-G-cd-active-snapshot`
- **head**: `1c58456c`
- **CI 요약 (실제 돌아 성공한 것만 초록)**:
  - ✅ `markers-and-forbidden` · SUCCESS
  - ✅ `check` (feature-map-check) · SUCCESS
  - ✅ `changes-filter` · SUCCESS
  - ✅ `route` · SUCCESS
  - ⏳ `heavy-mac` · **QUEUED** (iMac 러너 큐 소화 대기 · 45분 경계에서 push 완료 후 넘김 · 결과는 머지/재배포 전 확인 필요)
  - ⏭ `heavy-cloud` · SKIPPED (설계 상 전면 iMac · M2-1126-R/S)

## 재현 테스트 초록 (fork#287)

- `e2e/cd-pos/case1b-existing-customer.spec.ts` (아이맥 러너 워크플로 `workflow_dispatch`): **이번 PR 에서는 실런 미첨부**. storeport 미러가 main 만 보므로 이 branch 로 직접 돌릴 수 없고, PR 머지 → Railway 재배포 → fork workflow_dispatch 로 재실행이 정석 경로. 로컬 아이맥 하네스(`scripts/start-test-env.sh up`) 에 이 브랜치를 올려 돌리면 지금 빨강인 PR#287 이 초록이 될 것 (Welcome 튐 가드 + ghost abandonment 둘 다 통과시키는 조건).

## 아이맥 그린 (이번 PR 에서 실제 돌린 것)

- `apps/commerce-core` (jest unit) · **886 passed / 0 failed / 75 suites**. 회귀 증명 테스트 포함:
  - `isPostSettlementStale — V3-1 stale paid 가드` 9종 (신규 4종: confirming/first_visit 보존 · confirmed 복귀 · 회귀 증명)
  - `isPhoneEntryOpen — M0-1127-G ghost abandonment` 5종 (30s open / 3분 ghost 꺾음 / 3분+entering 보존 / 3분+phone_partial 보존 / pickBestSnapshot fresh 선택)
- `apps/customer-display` (vitest) · **334 passed / 0 failed / 17 files**
- `pnpm typecheck` 양쪽 다 **error 0**
- `scripts/naming-check.sh` · PASS

## 가드 빠지면 빨강 (검증의 검증)

`order-snapshot.unit.spec.ts` "가드 미세움(customer_flow_state 없음) 재현 — stale 그대로 true (회귀 증명)" 가 inActiveFlow 가드 없을 때 기존 로직대로 settled=true 반환하는 것을 명시. 이것이 Kyu §4 증상의 서버 측 원인.

## 수정 요약

| 증상 | 수정 파일 | 수정 내용 |
|---|---|---|
| §4 기존 번호 OK 후 Welcome 튐 | `apps/commerce-core/src/modules/register_session/lifecycle.ts` | `isPostSettlementStale` 에 `inActiveFlow` 가드. `customer_flow_state ∈ {entering, first_visit, confirming}` 이면 settled 아님. Correct(confirm) 후 state=confirmed 가 되면 평소대로 stale 복귀. |
| §7-a 20s 무입력 skipped 안 됨 | 위와 동일 (연쇄) | 가드 통과로 #209 가 confirming/entering 중에 stale 로 꺾이지 않아 skip 전이 정상. 이후 paid_age>30s 에서 기존대로 stale → CD Welcome 복귀. POS 는 `forPos=true` 라 #468 대로 Skipped+Ask again. |
| §7-b 손님 화면이 이전 주문 #208 | `apps/commerce-core/src/modules/register_session/lifecycle.ts` | `isPhoneEntryOpen` 에 abandonment 가드. `paid_age > 120s` 동안 start_entry/typing/waiting/phone_partial 아무 신호 없으면 `phone_entry_open=false`. 신규 결제가 CD keypad 를 가져갈 수 있고 `AskPhoneOnDisplay` 는 `customer_flow_state='entering'` 재세팅으로 즉시 재개돼 LateLink 보전. |
| §2 키패드 등장 ×1.4 느리게 | `apps/customer-display/src/screens/PhoneFlowScreen.tsx` | `Animated.spring tension 100 → 51`. friction=8 유지(damping ratio 보존). 주기 T ∝ 1/√(tension) → √(100/51) ≈ **1.4×** 느림. |

**바뀐 파일 수**: 3개 (164+ / 1-). 테스트 3곳 · 소스 2곳.

**보존**: Case 1 처음 방문 경로(fork#281 초록 범위) · #466 클라이언트 가드 · #468 POS 칩 유지 · `08` prefix · M0-1123-B oldest-paid-at-wins (30s/60s 범위 내).

## 충돌 점검 (storeport#473 `apps/commerce-core/src/modules/register_session/service.ts`)

- #473 은 service.ts 단에서 "짧은 번호 할당" 을 만지는 리뷰 중 PR. 이번 PR 은 **service.ts 를 건드리지 않음** — 모든 수정은 `lifecycle.ts` + 테스트 + CD 애니메이션 파일. **충돌 없음**.
- #473 머지 뒤 rebase 는 불필요 (서로 다른 파일).

## PR 본문 3줄 (기술 선택지 권장안)

- 서버 가드 = R0-1127-G 제안 그대로. 클라이언트 2차 방어(#466) 를 유지한 채 서버 1차 결함을 메꾼 조합.
- ghost abandonment 120s 는 "경험적 안전 + Welcome 으로 못 돌아가는 유기 재발 차단" 균형. LateLink/AskPhoneOnDisplay 는 `customer_flow_state='entering'` 재세팅으로 Reset.
- 키패드 애니메이션은 spring 유지(timing 전환 보류) — 기존 "스르륵" 감 유지한 채로 ×1.4. 추후 미세조정 필요하면 spec `specs/screens/customer-display.md` (CD-KEYPAD) 에 수치 등재 가능.

## Kyu 확인 항목 (Railway 재배포 뒤 실기)

1. **기존 번호 적립**: 결제 완료 → 영수증 → 3초 뒤 키패드 → 기존 번호 입력 → **OK** → 확인 카드 (Welcome 로 튀지 않음) → **Correct** → 적립 완료 · Welcome 복귀.
2. **20초 무입력**: 결제 완료 → 키패드 자동 등장 → 20초 가만히 두기 → iPad **대기 화면(Welcome)** 로 돌아감 (이전 주문 화면 아님) · POS 우상단 칩이 **⑤ Skipped + Ask again** 로 바뀜.
3. **키패드 등장 속도**: 영수증 → 3초 뒤 키패드가 오른쪽에서 **지금보다 40% 느리게** 밀려들어옴.

## 커버리지 (feature-map)

`processes: [register_session.order_snapshot, customer_display.phone_flow]` — 두 파일 모두 기존 feature-map.yaml 에 등록 완료. 신규 등록 불필요.

## 미완 · 후속

- **heavy-mac CI** QUEUED 로 넘김. 아이맥 러너 큐 소화 후 결과 확인 필요. 실패 시 알려 주시면 재진입.
- fork#287 재현 테스트 **초록 링크** 는 PR 머지 → Railway 재배포 → fork workflow_dispatch 로 재획득 (이번 PR 에서는 서버 재배포가 전제라 실런 미첨부).
- `specs/screens/customer-display.md` (CD-KEYPAD · `08` 승인) 는 리포에 없음 — 추후 등재 시 이번 수치(tension 51, abandonment 120s, inActiveFlow 가드) 반영 필요.
