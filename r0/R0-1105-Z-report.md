---
name: R0-1105-Z · 허브-1107-Z fork #58 재리뷰 relay
description: fork #58 (M3-1105-N · quote + 로고 + Pay 가드) rebase 뒤 재리뷰 · APPROVE · merge-tree clean · 4 파일 rebase 변경 정상 통합 · CI playwright 전부 PASS
author: R0
dated: 2026-11-07
---

# R0-1105-Z · fork #58 재리뷰 relay

**스코프**: fork PR #58 (M3-1105-N · checkout SC+PB1 quote + receipt logo + Pay double-tap guard) · rebase 뒤 HEAD `eeba5b1` 재검.
**정본**: fork master `2c447c3` (#56 M3-M 머지 후) · storeport `fe07858` (quote 서버 PR #197 미머지 · pre-merge 보호 fail-open 설계).
**직전**: R0-1105-Y → CHANGES_REQUESTED (`app/checkout/[draftOrderId].tsx` merge conflict · M3-M OrderTypePicker/PreorderInputs 소실 위험 · CashTenderPanel/ReceiptCard 는 auto-merge clean).
**금지**: 코드 수정 · 커밋.
**claim**: `status/claims/R0-1105-Z.json` (러너 started 자동 기록 완료 · 리포트 push 수동).

## 판정

| PR | head | 판정 |
| --- | --- | --- |
| **#58** (M3-1105-N) | `eeba5b1` | **APPROVE** — rebase 로 master `2c447c3` 위 1-commit fast-forward · 4 축 (checkout · tender-cash · ReceiptCard · CashTenderPanel) 전부 통합 정상 · CI green (m3-1105-m · m3-1105-n · m1-1105-q (cashier 4 case) PASS) |

### 머지 안전성 (R0-Y §A 재검)

```
$ git merge-tree --messages origin/feat/m3-1105-n-quote-receipt-logo origin/master
647022e29a02e711789be42ecaeb966d31934546
```

- **CONFLICT 메시지 없음** · tree 해시만 반환 → clean.
- `git log origin/master..origin/feat/m3-1105-n-quote-receipt-logo` → `eeba5b1` 1 커밋 only (base = `2c447c3` fast-forward).
- `git rev-parse origin/feat/m3-1105-n-quote-receipt-logo^{tree}` = `647022e2` = merge-tree 결과 → **PR tree ≡ merged tree** (rebase 가 완전 선형화).

---

## §A · rebase 변경 4 축 재검

### §A.1 · `app/checkout/[draftOrderId].tsx` (R0-Y 지적 충돌 지점 · 수동 통합 결과)

| 축 | 좌표 | 결과 |
| --- | --- | --- |
| M3-M import | L10-11 `import { OrderTypePicker, type OrderType } from '@/components/payment/OrderTypePicker';` + `import { PreorderInputs } from '@/components/payment/PreorderInputs';` | ✓ 복원 |
| M3-N import | L7 `import { useOrderQuote } from '@/api/hooks/pos-quote';` | ✓ 유지 |
| state (M3-M) | L65-67 `const [orderType, setOrderType] = React.useState<OrderType>('takeaway');` + `pickupAt` + `note` | ✓ 복원 |
| quote 블록 (M3-N) | L178-227 Subtotal/Discount/SC/PB1/Total · `hasQuote = q && typeof q.grand_total === 'number'` 폴백 (L185) · `pct > 0` 숨김 (L187-188) | ✓ 유지 |
| OrderTypePicker UI (M3-M) | L229-236 `<OrderTypePicker value={orderType} onChange={setOrderType} />` + preorder 시 `<PreorderInputs>` | ✓ 복원 |
| Pay 버튼 가드 (M3-M+N 공존) | L244 `disabled={!isDraftOrder \|\| !items.length \|\| (orderType === 'preorder' && !pickupAt) \|\| quote.isLoading}` | ✓ **둘 다** 유지 (M3-M preorder 가드 + M3-N quote.isLoading 가드) |
| router.push params (M3-M) | L247-254 `params: { draftOrderId, orderType, ...(orderType === 'preorder' ? { pickupAt, note } : {}) }` | ✓ 복원 |

**블록 순서**: Cart items → quote 세금 줄 (L178-227) → Order type picker (L229-236) → Pay (L241-258). R0-Y §C step 3 지침과 일치.

### §A.2 · `app/checkout/tender-cash/[draftOrderId].tsx` — "tender-cash quote 통합" (새 변경)

**루트 질문**: Pre-order DP / balance 금액이 `quote.grand_total` 과 섞여 틀리는가 · Takeaway 금액 = `grand_total` 인가.

| 흐름 | 금액 소스 | 서버 payload | 판정 |
| --- | --- | --- | --- |
| Takeaway (`resolvedType === 'takeaway'`) | `total = grandFromQuote ?? draftOrder.data?.total ?? 0` (L50-51) — quote.grand_total 우선 · 폴백 draftOrder.total | `input: { received_amount }` + `order_type: 'takeaway'` (L61-62) · amount 생략 → 서버가 order.total 산정 | ✓ **Takeaway = grand_total** |
| Pre-order DP (`preorder` && `!isBalanceFlow`) | `total = grand_total` (L51) · 디스플레이 라벨 `Pre-order DP` (L121) | `preorder: { pickup_at, note }` (L64-66) · amount **미전달** → 서버가 dp_percent 반영 | ✓ **앱 계산 금지** (Kyu 결정 ⓒ) — 디스플레이 total 은 상한 컨텍스트 · `CashTenderPanel.allowPartial=true` (L129) 로 cashier 가 임의 DP 입력 · `insufficient` 가드 해제 |
| Balance (`isBalance === '1'`) | `balanceAmount = Number(balanceDue)` (L45) · `total = balanceAmount` (L51) | `is_balance: true, amount: balanceAmount` (L63) · `preorder` block 미전달 | ✓ **balance = balance_due 고정** · grand_total 과 **섞이지 않음** (isBalanceFlow 분기 L51) · allowPartial=false (L129) 로 insufficient 가드 유지 |

**섞임 안전성**: L50-51 삼항이 `isBalance → balance`, `else → grand_total` 로 **상호배타적**. `quote.data` 가 null 이어도 balance 흐름은 route param 만 사용 (quote 무관). Takeaway/DP 는 quote 없으면 `draftOrder.total` 폴백 (fail-open).

**minor note** (blocker 아님): Pre-order DP 디스플레이 L119-121 `· Rp grand_total · Pre-order DP` 는 상한 컨텍스트만 보여주고, 실제 DP 금액은 서버가 `tender.amount` 로 돌려줘 success 화면에서 확정됨. "앱 계산 금지" 원칙 지킴 — 이를 바꾸려면 server-side DP 미리보기 엔드포인트가 필요 (스코프 밖).

### §A.3 · `components/receipt/ReceiptCard.tsx` — R0-Y 주의지점: **M1-Q cashier 3단 fallback 보존 여부**

| 축 | 좌표 | 결과 |
| --- | --- | --- |
| **M1-Q import 보존** | L12 `import { pickCashierDisplayName, useAdminUser } from '@/api/hooks/users';` | ✓ 유지 |
| **M1-Q 3단 fallback 로직 보존** | L98 `const snapCashierName = snap.cashier?.name?.trim();` · L99 `const fallbackUserId = !snapCashierName ? (receipt.cashier_user_id ?? undefined) : undefined;` · L100 `const userQ = useAdminUser(fallbackUserId);` · L101 `const cashierDisplay = snapCashierName \|\| pickCashierDisplayName(userQ.data);` | ✓ 유지 (단계 1 snap.cashier.name → 단계 2 /admin/users/:id → 단계 3 first_name / email prefix) |
| Cashier 줄 렌더 (조건부) | L157-161 `{cashierDisplay ? <Text testID="receipt-cashier">Cashier: {cashierDisplay}</Text> : null}` | ✓ 유지 (둘 다 없으면 생략) |
| 로고 (M3-N) | L124 `<View testID="receipt-logo-block">` · L125-131 `snap.store?.logo_url ? <Image maxWidth 240 · height 60 · resizeMode 'contain' testID="receipt-logo"> : <Text testID="receipt-store-name">{snap.store?.name ?? 'MEROS'}</Text>` | ✓ 추가 |
| SC 줄 pct 0 숨김 (M3-N) | L187-192 `snap.service_charge.pct > 0 && snap.service_charge.amount > 0` | ✓ 추가 |
| PB1 줄 (M3-N) | L193-198 `snap.tax.show && snap.tax.amount > 0` + `${label}${rate_pct != null ? ` ${rate_pct}%` : ''}` | ✓ 추가 |
| 여백 (Kyu "여백 더") | L112 `gap-3 rounded-xl border border-line bg-surface px-5 py-12` (M3-L `py-8` → M3-N `py-12`) | ✓ 반영 |
| WIB 날짜 (M3-L) | L27-41 `formatJakartaDateTime` + L153-155 `{formatJakartaDateTime(receipt.issued_at)} WIB` | ✓ 유지 |

**R0-Y 우려 (manual "ours" 전략으로 M1-Q 소실 위험) 해소** — rebased 소스에 M1-Q 구문 완전 보존.

### §A.4 · `components/payment/CashTenderPanel.tsx`

| 축 | 좌표 | 결과 |
| --- | --- | --- |
| `allowPartial?: boolean` prop (M3-M) | L18 type · L28 destructure · L53 `const insufficient = !allowPartial && received < total;` | ✓ 유지 |
| `ProcessButton` 래퍼 (M3-N · double-tap guard) | L120 호출 · L127-152 컴포넌트 (`[busy, setBusy]` · `useEffect(() => { if (!isPending && busy) setBusy(false); })` · `effectivelyDisabled = disabled \|\| isPending \|\| busy`) | ✓ 추가 |

이중 안전망 (hook `_tendersInFlight` M1-R + UI `ProcessButton busy` M3-N) — R0-Y §B 가 "regression 없음" 로 확인. 유지.

---

## §B · 체크리스트 전수 (rebase 뒤 재확인)

| 축 | 결과 | 좌표 |
| --- | --- | --- |
| merge-tree clean (master) | ✓ | tree `647022e2` · CONFLICT 없음 |
| PR tree ≡ merged tree | ✓ | fast-forward (1 commit `eeba5b1`) |
| quote 응답 키 (storeport #197 1:1) | ✓ | `api/hooks/pos-quote.ts` 미변경 (R0-Y OK) |
| checkout: OrderTypePicker/PreorderInputs 복원 | ✓ | `[draftOrderId].tsx:10-11,65-67,229-236` |
| checkout: Pay 버튼 이중 가드 (preorder + quote) | ✓ | `[draftOrderId].tsx:244` |
| tender-cash: Takeaway = grand_total | ✓ | `tender-cash/[draftOrderId].tsx:50-51` |
| tender-cash: Pre-order DP = allowPartial + server 계산 | ✓ | `tender-cash/[draftOrderId].tsx:51,64-66,129` |
| tender-cash: Balance = balance_due (grand_total 분리) | ✓ | `tender-cash/[draftOrderId].tsx:45,51,63` |
| ReceiptCard: M1-Q 3단 cashier fallback 보존 | ✓ | `ReceiptCard.tsx:12,98-101,157-161` |
| ReceiptCard: 로고 + 매장명 폴백 | ✓ | `ReceiptCard.tsx:124-140` |
| ReceiptCard: SC/PB1 pct=0 숨김 | ✓ | `ReceiptCard.tsx:187-198` |
| CashTenderPanel: allowPartial + ProcessButton busy | ✓ | `CashTenderPanel.tsx:18,53,120,127-152` |

---

## §C · CI (fork #58 rebased HEAD `eeba5b1` · run 42377449704)

| job | 결과 |
| --- | --- |
| Lint | ✓ PASS · 1m1s |
| assertions + playwright | ✓ PASS · 9m1s |

### Playwright harness (관련 4개 + 전체 PASS)

| harness | 결과 | 비고 |
| --- | --- | --- |
| `m1-1105-q-playwright.mjs` | ✓ PASS · 49.4s | **cashier 4 case** (snap name · /admin/users 조회 · email 폴백 · 생략) |
| `m3-1105-m-preorder-playwright.mjs` | ✓ PASS · 34.7s | 보드 7 OrderTypePicker · PreorderInputs · DP/balance 흐름 |
| `m3-1105-n-quote-receipt-playwright.mjs` | ✓ PASS · 47.9s | SC+PB1 quote · 로고 · Pay double-tap 가드 |
| 그 외 17 harness (m0-1104-a 부터 m3-1105-f 까지) | 전부 PASS | regression 없음 |

---

## §D · 최종

- **APPROVE** — PR #58 (`eeba5b1`) merge-safe.
- rebase 가 R0-Y 지적 `app/checkout/[draftOrderId].tsx` 충돌을 수동 통합으로 해결했고, M3-M OrderTypePicker/PreorderInputs + state + Pay 가드 모두 복원되었음.
- CashTenderPanel · ReceiptCard 는 auto-merge 결과대로 M1-Q cashier 3단 fallback · M3-M allowPartial · M3-N 로고/SC/PB1/busy guard 모두 공존.
- tender-cash quote 통합에서 Pre-order DP · balance · Takeaway 금액 소스가 상호배타적으로 분기되어 **섞이지 않음**.
- GitHub review 제출: `COMMENT with R0 APPROVE header` (self-authored 제약 유지 · pr review 는 다른 리뷰어 몫).

## §E · 환경 보조

- fork master HEAD: `2c447c3` (R0-Y 와 동일 · M3-M 머지 후)
- #58 head (rebased): `eeba5b1` (base `2c447c3` fast-forward · R0-Y 시점 `bdaf783` → force-push)
- PR tree: `647022e2` (merge-tree 결과와 동일)
- storeport main HEAD: `fe07858` (quote 서버 PR #197 **미머지** · fail-open 동작 재확인)
- claim: `status/claims/R0-1105-Z.json` state=completed (리포트 push 뒤 완료)

## 참조

- 직전 리뷰: `r0/R0-1105-Y-report.md` (fork #58 CHANGES REQUESTED · conflict 지적)
- M3-M: `r0/R0-1105-W-report.md` (fork #56 #57 pair APPROVE)
- storeport PR #197 (M0-1105-Q quote 서버): `r0/R0-1105-V-report.md` APPROVE (미배포)
- GitHub: [fork #58](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/58) · CI run [42377449704](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42377449704)
