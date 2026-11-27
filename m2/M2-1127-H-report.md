PASS · 차이 32행 · 라운드 6개 · relay PR #67

# M2-1127-H — 영수증 단일 출처 진단서 (상한 45분)

- **PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/67
- **브랜치**: `docs/M2-1127-H-receipt-single-source` (relay)
- **커밋**: `5d7e0dab4` · 4 files changed · 304 insertions
- **코드 수정**: 없음 (진단 전용)

## 자료 (relay `assets/receipt-diff-20261127/`)
| 파일 | 출처 | 비고 |
| --- | --- | --- |
| `01-pos-receipt-card.png` | agilo `screenshots-m1-1105-av/02-ipad-receipt-single-sale.png` (아카이브) | POS ReceiptCard 렌더 결과 |
| `02-customer-display-receipt-qris.png` | storeport `apps/customer-display/screenshots/m0-1125-c-receipt-qris.png` (**11-27 13:34 재캡처**) | CD ReceiptScreen 현 상태 |
| `03-printer-escpos-text.txt` | agilo `docs/testing/receipt-escpos-sample.txt` (아카이브) | ESC/POS 바이트 → 텍스트 |

> 자료 3장은 같은 주문 데이터가 아님 (아카이브 조합). "같은 주문 1건 실시간 캡처" 는 계획 R5 보존 e2e 가 담당. 진단 단계의 1:1 비교는 코드 레벨(§2-A · 32 행) 로 수행 · 자료보다 상세.

## 직접 돌린 명령
```bash
# 지도 수집
grep -rn "ReceiptCard" apps/ components/ app/ 2>/dev/null | head
find apps -type f \( -iname "*receipt*" -o -iname "*escpos*" \) 2>/dev/null
find ~/projects/agilo-medusa-pos-fork -type f \( -iname "*receipt*" -o -iname "*escpos*" \)

# CD 영수증 재캡처
cd /Users/kyu.lee/curiocity-live/storeport-wts/hub-m2
CD_E2E_PORT=4193 pnpm --filter customer-display e2e --grep "qris 단일"
# → 1 passed (487ms) · apps/customer-display/screenshots/m0-1125-c-receipt-qris.png

# relay worktree
git -C ~/projects/curiocity-relay worktree add -b docs/M2-1127-H-receipt-single-source \
    ~/projects/curiocity-relay-wts/M2-1127-H origin/main
cp apps/customer-display/screenshots/m0-1125-c-receipt-qris.png \
   ~/projects/curiocity-relay-wts/M2-1127-H/assets/receipt-diff-20261127/02-...
cp ~/projects/agilo-medusa-pos-fork/screenshots-m1-1105-av/02-ipad-receipt-single-sale.png \
   ~/projects/curiocity-relay-wts/M2-1127-H/assets/receipt-diff-20261127/01-...
cp ~/projects/agilo-medusa-pos-fork/docs/testing/receipt-escpos-sample.txt \
   ~/projects/curiocity-relay-wts/M2-1127-H/assets/receipt-diff-20261127/03-...

# commit + push + PR
cd ~/projects/curiocity-relay-wts/M2-1127-H
git add plans/ assets/
git commit -m "plan(receipt): M2-1127-H — 영수증 단일 출처 진단서 · 라운드 6 · Kyu 결정 3"
git push -u origin docs/M2-1127-H-receipt-single-source
gh pr create --title "..."
```

## 지도 — 영수증이 그려지는 곳

| 위치 | 파일:줄 | 입력 데이터 | 글꼴·폭·줄 순서 | 소비하는 뷰모델 |
| --- | --- | --- | --- | --- |
| 서버 snapshot 빌더 | `apps/commerce-core/src/modules/receipt/service.ts:220` `buildSnapshot()` | pos_settings + order + tenders + cashier | — (데이터 생성) | — |
| sale 발행 | `apps/commerce-core/src/workflows/pos-fulfill/steps/mint-sale-receipt.ts` | buildSnapshot 호출 | — | — |
| void/refund 발행 | `apps/commerce-core/src/workflows/pos-refund|pos-return/steps/mint-receipt.ts` | — | — | — |
| **공용 뷰모델** (CD/Admin 전용) | `packages/receipt-view-model/src/receipt-view.ts:80` `resolveReceiptView()` | snapshot | — | — |
| **POS 화면** | agilo `components/receipt/ReceiptCard.tsx:171` | snapshot **raw** | monospace · 420px · 로고→queue→No./Date/Order/Cashier→(VOID 메타)→items→divider→subtotal/SC/PB1/total→tenders→preorder→delivery→QR→footer→custom id | **미소비** |
| **CD 손님 화면** | storeport `apps/customer-display/src/screens/ReceiptScreen.tsx:64` | snapshot → `resolveReceiptView` | **sans-serif** · 340px · store→order#→items→subtotal/tax→total→tenders→bottom order→footer | CD view-model (축약판) |
| **프린터 (ESC/POS)** | agilo `lib/printer/receipt-escpos.ts:166` `renderReceiptEscPos()` | snapshot **raw** | 프린터 mono · 58mm 32 chars · ReceiptCard 와 같은 순서 | **미소비** |
| Admin 미리보기 | `apps/commerce-core/src/admin/routes/pos-settings/components/ReceiptPreview.tsx` | snapshot → `resolveReceiptView` | font-mono · 260px · `id-ID` 포맷 | CD view-model |
| 로고 치수 공유 | agilo `lib/receipt-layout.ts:17` `LOGO = { maxHeightPx: 110, maxWidthRatio: 0.8 }` | — | ReceiptCard + ESC/POS 1:1 공유 | — |

→ **"공용 뷰모델" 은 이름만 공용. 실제로는 POS/프린터 두 축이 raw snapshot 을 직접 읽음.** 이것이 "4번째 반복" 의 근본.

## 차이 32행 — 코드 레벨 1:1 비교

- 폭 (420px · 32char · 340px)
- 글꼴 (monospace · 프린터 mono · **sans-serif**)
- 숫자 포맷 (`IDR 16,500` · `IDR 16,500` · **`Rp 16.500`**)
- 매장 로고 (이미지 · 비트맵 · **없음**)
- 매장 WA phone (없음 · 중앙 1줄 · 없음)
- Queue #N 큰 블록 (있음 · 있음 · **없음**)
- No. R-YYMMDD-NNNN (있음 · 있음 · **없음**)
- 일시 WIB (있음 · 있음 · **없음**)
- Order #display_id (있음 · 있음 · 있음)
- Cashier (있음 · 있음 · **없음**)
- VOID/REFUND 배너 (있음 · 있음 · **없음**)
- 원 영수증 번호 (있음 · 있음 · **없음**)
- 환불 메타 (있음 · 있음 · **없음**)
- 품목 1행 포맷 (`title ⟵→ price` · 동일 · `qty× title ⟵→ price`)
- 품목 2행 (수량·단가·variant, muted · kv · **없음**)
- 품목 discount 줄 (있음 · 있음 · **없음**)
- Subtotal (영어 · 영어 · **i18n**)
- Discount_total (있음 · 있음 · **없음**)
- Service charge (있음 · 있음 · **없음**)
- PB1 10% (있음 · 있음 · 있음)
- TOTAL (영어 · 영어 · **i18n**)
- Tender 라벨 (`CASH`/`Card (EDC)`/`QRIS` + ordinal · `CASH`/`CARD`/`QRIS` · **`Cash`/`Card`/`QRIS`**)
- Received/Change (snapshot labels · snapshot labels · **inline i18n 5개 언어**)
- Card 상세 (전체 · `brand ****last4` + APPROVAL · **없음**)
- QRIS 상세 (Issuer · Ref 전체 · Issuer + Ref 뒤 8자 · **없음**)
- Preorder 블록 (있음 · **없음** · **없음**)
- Delivery 블록 (있음 · 있음 · **없음**)
- 주문 QR (SVG · 비트맵 · **없음**)
- QR 아래 No. (있음 · 있음 · **없음**)
- Footer (muted 중앙 · 중앙 · "— Thank you —" dash 추가)
- Custom display id (muted 작게 · 중앙 · **큰 bold** 강조)

## 계획 요약
R1 `packages/receipt-lines` 신설 → R2 ESC/POS 전환 (바이트 보존) → R3 ReceiptCard → R4 CD ReceiptScreen → R5 보존 검사 (줄 목록 1:1 + 스크린샷 겹치기) → R6 Admin 미리보기.

## Kyu 결정 필요 (계획 §4)
- Q1 숫자 포맷 — 권장 `Rp 16.500` (ID 로케일)
- Q2 영수증 언어 — 권장 영어 고정
- Q3 공용 패키지 위치 — 권장 npm publish 단기 + agilo 흡수 중기

## 미완 없음. /loop · 예약 깨우기 없음.
