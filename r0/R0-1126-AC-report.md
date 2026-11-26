#276 CHANGES — R0-1126-AC

판정: 구현은 11-24 pos-ui-approval 6상태를 계약 v1.4 위에 정확히 얹었고 (CustomerPhoneStatus 69-407 · PhoneEntryButton · useAskPhoneOnDisplay fireStart/fireCancel · deriveCustomerFlowActions 폴백 전부 OK), 보존 요소(LateLinkCustomerSheet @ app/orders/[orderId].tsx:949/1017 · SuccessReceiptAnim @ app/checkout/success/[orderId].tsx:298 · cd-phone-status-typing-text 실시간 숫자 · Sell 에 V4-7 없음) 도 그대로다. 다만 "실제로 뜨는지" 증거가 부족해 decision-spec-guard-20261126 §4 (승인 요소 보호 테스트) 바를 못 넘는다. 아래 3건 보강 후 재리뷰 요청.

PR 코멘트: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/276 (COMMENT 로 전환 — GitHub 가 self-PR REQUEST_CHANGES 거부. 결론은 CHANGES.)

## 범위

- PR: CuriocityDevAi/agilo-medusa-pos-fork#276 · head `5462c20` · base `8f092f5` (origin/master) · 실제 merge-base `7d2d320`.
- 원장 대사: decision-cd-pos-sync-v4-20261126 (V4-7 · V4-8) + decision-pos-ui-approval-20261124 (6상태 원형) + decision-spec-guard-20261126 §4 (보존 테스트 규약).
- 보존 대상: POS 우측 상단 번호 상태 칸 6상태(+Ask/Re-enter/Ask again) · 실시간 숫자(#270) · Payment successful 화면 기존 요소 · Order 상세 Link customer(PIN).

## 돌린 명령 · 결과

| 명령 | 결과 | 비고 |
|---|---|---|
| `git fetch origin pull/276/head:pr-276 && git checkout pr-276` | OK | head = 5462c20 |
| `pnpm vitest run` | **1186 pass · 6 xfail · 3 todo** | 90 파일 · M3-1126-K 28건 포함 |
| `pnpm lint` | **0 errors · 70 warnings** | 전부 기존 BottomSheet worklet 경고 등 |
| `pnpm exec tsc --noEmit` | 15 errors (전부 기존) | FlashList estimatedItemSize · dayjs 모듈 누락 · 09-cart-instant-display · use-network-status · toast props 등. origin/master 에서도 동일 — PR 이 새로 만든 오류는 없음. |
| `ls e2e/screenshots/M3-1126-K-*.png` | 4개만 존재 | confirming / confirmed / entering-typing / entering-waiting. none-ask · skipped-ask-again · locked-busy · reenter-cancel · phone-entry-chip · 뷰포트 변형 전부 **파일 없음** |
| 실서버(storeport main #456 · ce4f6ad) 3경로 | **미수행** | 로컬 commerce-core 부팅이 50분 세션 범위 밖 — Kyu 지시 사항 ②번은 R0 환경에서 수행 불가, PR 저자/Kyu 가 대신 떠주셔야 함. 아래 e2e 실패 원인 판정 섹션 참고. |

## 보존 요소 실 코드 확인

| 요소 | 위치 | 상태 |
|---|---|---|
| 6상태 번호 상태 칸 (①~⑥) | components/customer-display/CustomerPhoneStatus.tsx:72-407 (`CustomerFlowChip`) | 계약 v1.4 actions+locked 기반 · 11-24 승인 원형 색/위치/텍스트 그대로 |
| v1.3 폴백 | CustomerPhoneStatus.tsx:86-195 (`classifyPhoneStatus` switch) | 서버 미머지 시 fallback 유지 |
| 실시간 숫자 (#270) | CustomerPhoneStatus.tsx:266 (`cd-phone-status-typing-text`) + flow.phone 그대로 | OK |
| Link customer (PIN) | app/orders/[orderId].tsx:949-957 (`order-link-customer` · `LateLinkCustomerSheet`) | 그대로 유지 · V4-7 Phone entry 는 바로 오른쪽 **추가** (교체 아님) |
| SuccessReceiptAnim (영수증 + Hand over) | app/checkout/success/[orderId].tsx:298 | 그대로 |
| Sell 에 V4-7 없음 | `grep PhoneEntryButton app/(tabs)/sell.tsx` → 0건 | OK (명세 준수) |
| 6결제 화면 공통 배치 | Cart·Checkout·Cash·QRIS·Split·Success 각각 headerRight 에 `CustomerPhoneStatus` + `onStartEntry`/`onCancelEntry` 바인딩 (file:line — components/cart/CartSheet.tsx:88-99, app/checkout/[draftOrderId].tsx:335-347, tender-cash/[draftOrderId].tsx:410-418, tender-qris/[draftOrderId].tsx:399-407, split-tender/[draftOrderId].tsx:613-621, success/[orderId].tsx:274-291) | 전부 OK · `grep CustomerPhoneStatus … onStartEntry` 1회 발부 |

## e2e 실패 원인 판정 (하네스 vs 실제 미노출)

PR 본문: "4/12 pass · 8 실패 = headerRight re-render 타이밍". 리뷰어 판정은 **단순 하네스 타이밍만으로 설명 안 됨 — 재조사 필요**.

근거:

1. 통과 4건은 전부 **버튼 없는 정보형 상태** (entering-waiting / entering-typing / confirming / confirmed-withoutReenter 계열). 실패 8건은 전부 **버튼 분기** 혹은 **lock 분기** — `<Pressable onPress={onStartEntry}>` 가 트리에 추가되는 케이스. 단순 재마운트 타이밍이면 상태별로 섞여 실패해야 정상인데, 버튼 쪽에 전원 몰렸다.
2. 저장된 screenshot 자체는 전부 거의 백색(216×36 / 174×36 … 텍스트 안 보임) — 하지만 이는 이 프로젝트 전역 패턴(M3-1125-R-chip-*, M3-1126-D-chip-* 모두 동일 — headless Chromium 에서 RN Web Text 가 폰트 로드 전에 캡처되어 흰색으로 나옴). 따라서 "흰색이라서 틀렸다" 는 아님. 하지만 그 반대로 **"흰색이지만 통과했다" 도 '화면에 보임' 증거는 아니다** — 결국 toContainText 통과만이 유일한 증거.
3. 통과 4건도 toContainText `/0813 80/`, `/Awaiting confirm/`, `/0813/`, `/Waiting for customer/` 를 보는데, 이것들은 headerRight 가 안정화된 후 진입하는 상태라서 통과한 것으로 보임. **버튼 포함 상태(`<Pressable>` 트리)는 React 가 트리를 교체할 때 refetch → re-mount 사이 window 가 열려 testID 가 잠깐 사라졌다 돌아올 가능성** — 실제 운영에서는 순간이므로 사용자는 못 느끼지만 e2e 는 그 window 를 잡아 fail. 재현 가능한 가설이면 `await page.waitForLoadState('networkidle')` + 작은 `waitForTimeout(300)` 보강 또는 waitFor(stable) 로 녹이면 통과해야 함.

**요약**: 하네스 타이밍 가설은 "증거 없이는 거부" (Kyu 지시 ①). 가설 검증까지 포함해 CHANGES — 코드 자체 로직은 올바르지만 "노출 보장" 증거 (실 서버 실기 + e2e 안정화 + 보존 테스트) 가 부족.

## CHANGES 사유 (요약)

1. **7상태 중 3개(Ask phone · Skipped · Locked) 시각 증거 0** — 저장 screenshot 조차 없음. harness 설명만으로 머지 시 ①·⑤·⑥ 승인 요소가 "구현됐다" 는 R0 보증이 성립 안 함.
2. **실서버(storeport main #456) 3경로 미실기** — PR 본문도 mock-only 인정. 서버가 이미 main 에 있으니 Ask→입력→Done→Re-enter→Cancel / Skipped→Ask again / 결제완료 Phone entry chip→Next customer 후 숨김 3가지 실기 + 캡처 필요.
3. **보존 테스트 자동화 부재** — 지금 M3-1126-K 테스트는 100% `readFileSync` + regex grep. decision-spec-guard-20261126 §4 는 Playwright 로 "실제 DOM 노출" 을 요구. e2e 7상태 전부 toBeVisible + toContainText 안정적 녹색 + CI gate 세워야 다음 리뷰에서 M3-1125-R 때처럼 사라지지 않음.

## 사소 (블로커 아님)

- PR 브랜치가 #274(8f092f5) 이전(7d2d320) 에서 떠 `e2e/flows/M3-1126-H-tabbar-product-image.spec.ts` + H 스크린샷 11개가 diff 에 "deleted" 로 보인다. 3-way merge 로는 살아남지만 `git merge origin/master` 한 번 해 두면 안심.
- `app/(tabs)/_layout.tsx` · `app/product-details.tsx` 가 diff 에 포함되지만 PR 본문엔 언급 없음 — #274 되돌리기 아닌지 재확인.
- `useAskPhoneOnDisplay` 에서 `fireStart` 가 `fireHint()` 먼저 실행 → posAsked=true (15s). 그 뒤 `registerSessionId` 없으면 flow API 는 skip — v1.3/v1.4 혼재시 posAsked 플래그가 양쪽 분기에 남음. v1.4 는 customer_flow 로 렌더하니 가시적 오동작은 없지만 주석 한 줄 추천.

## 메타

- 걸린 시간: ~35분.
- 리뷰 환경: /Users/kyu.lee/projects/pos-r0 · pr-276 체크아웃 · origin = CuriocityDevAi/agilo-medusa-pos-fork.
- /loop 호출 없음.
