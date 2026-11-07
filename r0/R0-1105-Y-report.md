---
name: R0-1105-Y · 허브-1107-Y 재리뷰 relay
description: fork #58 (M3-1105-N · quote + 로고 + Pay 가드) REQUEST CHANGES · app/checkout/[draftOrderId].tsx 머지 충돌 (M3-M OrderTypePicker 소실) · CashTenderPanel/ReceiptCard 는 auto-merge clean
author: R0
dated: 2026-11-07
---

# R0-1105-Y · fork #58 리뷰 relay

**스코프**: fork PR #58 (M3-1105-N · checkout SC+PB1 quote + receipt logo + Pay double-tap guard).
**정본**: fork master `2c447c3` (#56 M3-M 머지 후) · storeport `fe07858` (quote 서버 PR #197 미머지 상태 · pre-merge 보호 fail-open 설계).
**금지**: 코드 수정 · 커밋.
**claim**: `status/claims/R0-1105-Y.json` · in_progress → completed.

## 판정

| PR | head | 판정 |
| --- | --- | --- |
| **#58** (M3-1105-N) | `bdaf783` | **CHANGES REQUESTED** — `app/checkout/[draftOrderId].tsx` 머지 충돌 (M3-M 보드 7 OrderTypePicker/PreorderInputs 삭제) · rebase 뒤 수동 통합 필요 |

### 왜 CHANGES
- PR base `baed53a` 는 master #55 (Cashier) · #56 (M3-M 보드 7) · #57 (M1-R 가드/썸네일) 가 머지되기 **이전**. #58 작업 중 master 가 세 PR 머지되면서 branch 가 `app/checkout/[draftOrderId].tsx` 에서 **M3-M 가 추가한 OrderTypePicker/PreorderInputs/orderType state 를 모른 채** 그 영역을 재작성.
- `git merge-tree` 결과: `CONFLICT (content): Merge conflict in app/checkout/[draftOrderId].tsx` (수동 해결 필수).

### 왜 CashTenderPanel/ReceiptCard 는 OK
- 둘 다 `Auto-merging` 성공 · merged tree 콘텐츠 확인:
  - `CashTenderPanel.tsx`: `allowPartial` (master #56) + `ProcessButton busy` (branch #58) **공존** ✓
  - `ReceiptCard.tsx`: Cashier 3단 fallback (master #55) + logo Image + SC/PB1 줄 (branch #58) **공존** ✓
- git 이 다른 라인 수정을 자동 병합. **단 ReceiptCard 는 branch 소스 자체에서는 M1-Q cashier 로직 삭제**되어 있어, 저자가 rebase 중 "ours" 전략으로 resolve 하면 소실 가능 — manual rebase 시 **M1-Q import + fallback 로직 유지 확인** 필요.

---

## §A · 충돌 실측

```
$ git merge-tree --messages origin/feat/m3-1105-n-quote-receipt-logo origin/master
a62dd7feacab528b008020aca6447dd4bb8d7066

Auto-merging app/checkout/[draftOrderId].tsx
CONFLICT (content): Merge conflict in app/checkout/[draftOrderId].tsx
Auto-merging components/payment/CashTenderPanel.tsx
Auto-merging components/receipt/ReceiptCard.tsx
```

| 파일 | 결과 | 세부 |
| --- | --- | --- |
| `components/payment/CashTenderPanel.tsx` | **auto-merge clean** | diff `allowPartial` prop 삭제 vs master 는 유지 → git 이 master 유지 + branch 의 `ProcessButton` 추가만 적용 |
| `components/receipt/ReceiptCard.tsx` | **auto-merge clean** | branch 가 Cashier fallback 블록 삭제 vs master 는 M1-Q 유지 → git auto-merge 가 master 블록 유지 + branch 의 logo/SC/PB1 추가 병합 |
| `app/checkout/[draftOrderId].tsx` | **CONFLICT (content)** | branch 의 Pay 버튼 영역 재작성 vs master 의 OrderTypePicker/PreorderInputs/state 가 **같은 영역** 수정 → 수동 해결 필수 |

### Merged tree 확인 (`a62dd7f`)
- `CashTenderPanel.tsx:18` `allowPartial?: boolean;` 유지 ✓
- `CashTenderPanel.tsx:53` `const insufficient = !allowPartial && received < total;` 유지 ✓
- `CashTenderPanel.tsx:120` `<ProcessButton onPress={...} disabled={insufficient} isPending={isPending} />` ✓
- `CashTenderPanel.tsx:127+` `const ProcessButton` 블록 추가 ✓
- `ReceiptCard.tsx:12` `import { pickCashierDisplayName, useAdminUser } from '@/api/hooks/users';` 유지 ✓
- `ReceiptCard.tsx:98-101` Cashier 3단 fallback 블록 유지 ✓
- `ReceiptCard.tsx:124` `testID="receipt-logo-block"` 추가 ✓
- `ReceiptCard.tsx:187-193` SC + PB1 Row 추가 ✓

Auto-merge **잘 되어 있음**. 다만 `app/checkout/[draftOrderId].tsx` 는 수동.

---

## §B · 체크리스트 전수

| 축 | 결과 | 코드 좌표 |
| --- | --- | --- |
| quote 응답 키 일치 (storeport #197) | ✓ | `api/hooks/pos-quote.ts:19-25` `OrderQuote = {subtotal, service_charge?:{pct,amount}, tax?:{label,pct,amount}, grand_total, store?:{id?,name?,logo_url?}}` = storeport `quote/route.ts:108-120` 응답 1:1 |
| pct 0 숨김 (checkout) | ✓ | `[draftOrderId].tsx:90-91` `const sc = q?.service_charge && q.service_charge.pct > 0 ? q.service_charge : null;` |
| pct 0 숨김 (receipt) | ✓ | `ReceiptCard.tsx:187-193` `snap.service_charge.pct > 0 && amount > 0` + `snap.tax.show && amount > 0` |
| fail-open (서버 미배포/404) | ✓ | `pos-quote.ts:36-41` `try { ... } catch { return null; }` · `[draftOrderId].tsx:88-92` `hasQuote = q && typeof q.grand_total === 'number'` · 폴백 = `draftOrder.data.total` |
| 로고 fallback | ✓ | `ReceiptCard.tsx:113-131` `snap.store?.logo_url ? <Image maxHeight=60 resizeMode=contain> : <Text>{snap.store?.name ?? 'MEROS'}</Text>` |
| SC/PB1 줄 | ✓ | `ReceiptCard.tsx:187-200` `${labels.service_charge} ${pct}%` + `${tax.label} ${rate_pct}%` + amount |
| 여백 (Kyu "여백 더") | ✓ | `ReceiptCard.tsx:100` `px-5 py-12` (M3-L `py-8` → M3-N `py-12` 수직 +16) + `gap-3` 블록 간격 |
| **Cashier 유지** (M1-Q) | ⚠ | **Branch 소스에선 삭제** (`-14 lines: useAdminUser · pickCashierDisplayName · snapCashierName/fallbackUserId/userQ/cashierDisplay`) → `{snap.cashier?.name ‖ id}` 로 되돌림. **Merge-tree auto-resolve 에서는 master 쪽 Cashier fallback 유지됨** (git auto-merge). 실제 rebase 시 "ours" 전략 시 소실 위험 · manual commit 시 **M1-Q import/로직 유지 확인 필요** |
| 가드 중복 (Pay) | ⚠ 이중 안전망 | `_tendersInFlight Set` (M1-R hook 레벨 · R0-W 검증됨) + `ProcessButton busy` (M3-N UI 레벨). **중복 (둘 다 double-submit 차단)** 이나 **상호보완** (UI 즉시 반응 + hook 네트워크 봉쇄). PR body "이중 안전망" 명시. 둘 다 정상 재시도 복구 (hook `finally delete` + UI `useEffect isPending`). **regression 없음 · 변경 요청 아님** |

### fixtures 확인
- `pos-quote-sc-pb1.json`: Ta Wan 348000 → 403854 (SC 19140 + PB1 36714) · M0-1105-Q §3.1 Ta Wan 샘플 1:1 ✓
- `pos-quote-zero.json`: 0%/0% · grand_total = subtotal = 95000 ✓
- `pos-receipt-sc-pb1-response.json`: snapshot.service_charge + snapshot.tax (show:true, PB1) + store.logo_url ✓

---

## §C · 해결 지침 (PR #58 쪽 작업)

**1단계 · rebase**:
```bash
git rebase origin/master
# app/checkout/[draftOrderId].tsx 충돌 → manual resolve
```

**2단계 · M3-M (보드 7) 복원 유지**:
```typescript
// import 추가
import { OrderTypePicker, type OrderType } from '@/components/payment/OrderTypePicker';
import { PreorderInputs } from '@/components/payment/PreorderInputs';

// state 유지
const [orderType, setOrderType] = React.useState<OrderType>('takeaway');
const [pickupAt, setPickupAt] = React.useState<string>('');
const [note, setNote] = React.useState<string>('');

// JSX: Order type 섹션 + PreorderInputs 유지
<OrderTypePicker value={orderType} onChange={setOrderType} />
{orderType === 'preorder' ? <PreorderInputs ... /> : null}

// Pay 버튼 params 복원
disabled={!isDraftOrder || !items.length || (orderType === 'preorder' && !pickupAt) || quote.isLoading}
router.push({ pathname: '/checkout/tender-cash/[draftOrderId]',
  params: { draftOrderId, orderType, ...(orderType === 'preorder' ? { pickupAt, note } : {}) }
})
```

**3단계 · #58 (M3-N) quote 블록 통합**:
- `useOrderQuote(draftOrderId)` + Subtotal/Service charge/PB1/Total 블록 (`[draftOrderId].tsx:88-128` lambda) 유지.
- `disabled` 조건에 `|| quote.isLoading` AND 추가.
- M3-M OrderTypePicker 섹션과 공존 (순서: items list → quote 블록 (Subtotal/SC/PB1/Total) → Order type picker → Pay).

**4단계 · ReceiptCard 재검**:
- rebase 뒤 `ReceiptCard.tsx` 에 M1-Q cashier fallback (`useAdminUser · pickCashierDisplayName · cashierDisplay`) 가 **유지됐는지** 확인. git auto-merge 가 보존하지만, 저자가 vim/vscode 로 "ours" 수동 선택 시 소실 위험.

---

## §D · 환경 보조

- fork master HEAD: `2c447c3` (#56 M3-M 머지 후)
- #58 head: `bdaf783` (base `baed53a` pre-#55·#56·#57)
- storeport main HEAD: `fe07858` (quote 서버 PR #197 **미머지** · pre-merge 보호 fail-open 필요)
- 머지 결과 tree: `a62dd7f` (CONFLICT entry `app/checkout/[draftOrderId].tsx` stages 1/2/3 포함)
- claim: `status/claims/R0-1105-Y.json` state=completed

## 참조

- 직전 리뷰: `r0/R0-1105-W-report.md` (fork #56 #57 pair APPROVE)
- storeport PR #197 (M0-1105-Q quote 서버) 리뷰: `r0/R0-1105-V-report.md` APPROVE (미배포)
- GitHub review 제출: [fork #58](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/58) · **COMMENT with R0 REQUEST CHANGES** header (self-authored 제약)
