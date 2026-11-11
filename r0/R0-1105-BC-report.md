# R0-1105-BC — 리뷰 리포트 · PR #80 (P6 Void/Refund 영수증 · 58mm ESC/POS)

**판정: APPROVE** (CHANGES 1건 — assertion 스크립트 false positive · non-blocking)

---

## 체크 표

| 항목 | 결과 | 비고 |
|---|---|---|
| #80이 #77 위에 쌓였는지 | ❌ 미쌓임 | 둘 다 master 기반 병렬 브랜치 (상세 §1) |
| ReceiptCard void 배너 | ✅ | `VOID` / `REFUND` text-3xl bold danger |
| ReceiptCard 원 영수증 번호 | ✅ | `Original: No. R-261110-0003` |
| ReceiptCard 환불 수단 | ✅ | `CARD TERMINAL` / `CASH` |
| ReceiptCard 승인번호 | ✅ | `APPROVAL 123456` (card) · cash 는 미노출 |
| ReceiptCard 반품 줄 | ✅ | `snap.items[]` 그대로 소비 |
| ReceiptCard 환불 합계 | ✅ | `-IDR N,NNN` bold |
| ReceiptCard 처리자 | ✅ | `Processed by` (void/refund) vs `Cashier` (sale) |
| ESC/POS `*** VOID ***` / `*** REFUND ***` | ✅ | center+bold · rule 아래 |
| ESC/POS 원 영수증 번호 | ✅ | `Original No. R-261110-0003` |
| ESC/POS 환불 수단 | ✅ | `Method CARD TERMINAL` / `CASH` |
| ESC/POS 승인번호 | ✅ | `APPROVAL 123456` (tender 섹션) |
| ESC/POS 환불 합계 bold | ✅ | `Refund total -IDR 95,000` bold |
| 58mm 32자 폭 | ✅ | V1a/R1a 통과 · 모든 줄 ≤ 32자 |
| IDR 포맷 | ✅ | formatIDR + `-` 접두 패턴 |
| 문구 영어 | ✅ | VOID · REFUND · Method · Original No. · Processed by |
| raw hex 0 (m3-af 전용 가드) | ✅ | V3a/R3a pass |
| raw hex 0 (전체 color-guard) | ⚠️ | 1건 false positive — §4 참조 |
| `node:` import 0 (app·components·lib) | ✅ | 없음 |
| sale 영수증 회귀 0 | ✅ | S1a~S1h 전부 pass |
| master 충돌 여부 | ⚠️ | ReceiptCard.tsx 겹침 → §1 참조 |

---

## §1 Stack 확인 — #80이 #77 위에 쌓였는지

```
#80 head:  7992908  feat(m3-1105-af)
#80 parent: 3e5f9df  feat(checkout): pre-order pickup… (#78) ← master commit
#77 head:  6b83663  feat(m3-1105-ae): wire void/refund…
merge-base(#80, #77) = 345f23fa  ← master commit
```

- **#80은 #77 위에 쌓이지 않음.** 두 브랜치 모두 master 에서 직접 분기된 병렬 브랜치.
- **공유 파일**: `components/receipt/ReceiptCard.tsx`
  - #77 (AE): `receipt.kind === 'void'` → `refund_watermark` 추가
  - #80 (AF): watermark 를 `reprint` 전용으로 좁히고 큰 배너로 대체
  → #77 머지 후 #80 rebase 시 ReceiptCard.tsx 에서 watermark 로직 충돌 예상.
  해결: #80 접근(배너 > watermark) 으로 conflict 수동 해소.

---

## §2 실행 로그 — 의존성 · 어설션

```
npm ci     → 완료 (node_modules 없음에서 신규 설치)
m3-1105-af → 30/30  PASS  (void 10 · refund 7 · sale 회귀 8 · 32자/raw hex 가드)
run-all    → 27/29  (29개 중 2 FAIL)
  FAIL m3-1105-a-color-assertions.mjs  36/37  — §4 참조
  FAIL m3-1105-x-fulfill-assertions.mjs 70/71 — 선-재발 · §5 참조
```

---

## §3 Playwright · ESC/POS 덤프

**스크린샷 (iPad 가로 1366×1024)**
- `screenshots-m3-1105-af/01-ipad-receipt-void.png`      (65KB)
- `screenshots-m3-1105-af/02-ipad-receipt-refund-partial-cash.png` (60KB)

두 장 모두 ReceiptCard 내 7요소 (배너·번호·처리자·환불블록·품목·합계·tender) 정상 노출.

**ESC/POS 텍스트 덤프 (void)**
```
*** VOID ***
--------------------------------
MEROS
Jakarta Main / Jl. Melati 1
--------------------------------
No. R-261110-0007
Date 2026-11-10 15:12 WIB
Original No. R-261110-0003
Order #42
Processed by Kyu Lee
--------------------------------
Method             CARD TERMINAL
Refund total         -IDR 95,000
--------------------------------
Cheese Bread
  1 x IDR 95,000      IDR 95,000
--------------------------------
Subtotal              IDR 95,000
TOTAL                 IDR 95,000
--------------------------------
CARD                 IDR -95,000
APPROVAL                  123456
--------------------------------
Thank you
```
모든 줄 32자 이내 · raw hex 없음 · 7요소 완비.

---

## §4 CHANGES 사항 (non-blocking · assertion 스크립트 false positive)

**`m3-1105-a-color-assertions.mjs` 36/37 FAIL**

원인: 스크립트의 hex 정규식 `/#[0-9a-fA-F]{3,8}\b/g` 이 `//` 행 주석은 제외하지만
JSX `{/* */}` 블록 주석은 미제외. `ReceiptCard.tsx` 의 아래 주석 2행에서 false positive:

```
L155: {/* … 서버 #207/#208 Receipt.kind 그대로 */}
L207: {/* … 서버 #207/#208 배포 후 채워짐. */}
```

`#207` / `#208` 는 storeport PR 번호로, 실제 hex 색값이 아님.

**권장 수정 (m3-1105-a-color-assertions.mjs)**:
```js
// 기존: //행만 제외
const commentStart = line.indexOf('//');
const beforeComment = commentStart >= 0 ? line.slice(0, commentStart) : line;

// 수정: JSX {/* */} 도 제외
const jsxComment = /\{\/\*.*?\*\/\}/g;
const lineNoJsx = line.replace(jsxComment, '');
const commentStart = lineNoJsx.indexOf('//');
const beforeComment = commentStart >= 0 ? lineNoJsx.slice(0, commentStart) : lineNoJsx;
```

또는 더 간단하게: 가드 패턴에 `2[0-9]{2}` (3자리 숫자로만 이루어진 hex) 예외 추가.

---

## §5 선-재발 FAIL (PR #80 무관)

`m3-1105-x-fulfill-assertions.mjs` U1 "OrderTypePicker · Delivery disabled:true 유지" 실패.
PR #75 Delivery 해제 이후 선-재발. #77 PR body 에서도 동일하게 언급(`28/29 PASS · 1 실패 m3-1105-x`).
#80 scope 밖.

---

## §6 minor 관찰 (blocker 아님)

ReceiptCard 에서 카드 void/refund 시 `APPROVAL` 코드가 2회 노출:
1. 환불 메타 블록 (refundMeta.approvalCode → `<Row left={labels.approval} …>`)
2. TenderBlock (tender.approval_code → `<Row left={labels.approval} …>`)

ESC/POS 는 tender 섹션에서만 1회 노출. 화면/프린터 간 경미한 불일치.
기능 오류 아님 · 가독성 이슈 · 추후 라운드에서 TenderBlock 의 approval 조건에
`!isVoidOrRefund` 가드 추가 검토.

---

## 착지 명령

```bash
cp /tmp/R0-1105-BC-report.md ~/projects/curiocity-relay/r0/ \
&& cd ~/projects/curiocity-relay \
&& git add r0/R0-1105-BC-report.md \
&& git commit -m "r0: R0-1105-BC" \
&& git pull --rebase --autostash origin main \
&& git push
```

claim done → `status/claims/R0-1105-BC.json` → `"status": "done"`
