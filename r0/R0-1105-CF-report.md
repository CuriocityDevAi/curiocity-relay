# R0-1105-CF 리뷰 리포트 — fork #100 재확인 + fork #102 영수증 QR 2단계

작성일: 2026-11-12  
대상 PR: #100 (feat/m0-1105-as-order-qr-scan → master) · #102 (feat/m0-1105-at-receipt-qr → #100)

---

## 판정

**#100: APPROVE** — CC 지적(scan.tsx 'Order not found') 해소 확인 · 회귀 0 · master(7d4796c) 대비 `package.json`/`package-lock.json` 충돌 → 머지 전 rebase 필요  
**#102: APPROVE** — ReceiptCard QR 블록·위치·번호 · ESC/POS GS v 0 · 화면 파일 미수정 · 번들 안전 모두 충족 · CI unstable 플래그 있으나 assertions 38+43 PASS 확인

---

## 검증 표

### #100 검증

| # | 항목 | 판정 | file:line |
|---|------|------|-----------|
| 1 | `setErrorMessage('Order not found')` 삭제 (AU 72406e8) | ✅ | `app/(tabs)/scan.tsx:88-93` else 분기 — `setTimeout` 만 남음 |
| 2 | 어설션: 'Order not found 없음' 검사 추가 (AU) | ✅ | `scripts/m0-1105-as-qr-assertions.mjs` §(4) 마지막 줄 |
| 3 | 기존 barcode 흐름 유지 (회귀 없음) | ✅ | `app/(tabs)/scan.tsx:91-100` — `scanBarcodeMutation.mutate` 경로 그대로 |
| 4 | 주문 QR → router.push + 1500ms ref 리셋 | ✅ | `app/(tabs)/scan.tsx:67-76` |
| 5 | `barcodeTypes` 에 `'qr'` 추가 | ✅ | `app/(tabs)/scan.tsx:132` |
| 6 | `parseScanPayload` import · 함수 분기 | ✅ | `lib/qr.ts:62-79` · `app/(tabs)/scan.tsx:64` |
| 7 | 번들 안전: qrcode browser 엔트리 · `node:` import 0 | ✅ | R0-CC-report §번들 안전 근거 (R0 체크 ⑦ 충족) |
| 8 | QR PNG 샘플 실제 커밋 | ✅ | `docs/testing/m0-1105-as-qr-sample.png` blob f041b82 |
| 9 | prettier PASS (AS 어설션 §(5)) | ✅ | `lib/qr.ts` · `app/(tabs)/scan.tsx` — 43/43 PASS (AU 보고서) |
| 10 | **master(7d4796c) 충돌** — `package.json` / `package-lock.json` | ⚠️ | #103이 `prettier-plugin-tailwindcss` 0.5→0.6 추가, #100이 `qrcode` 추가 — 다른 섹션이나 `package-lock.json` rebase + `npm install` 필요 |

### #102 검증

| # | 항목 | 판정 | file:line |
|---|------|------|-----------|
| 11 | ReceiptCard QR 블록 삽입 위치 (합계·결제 아래 · Thank you 위) | ✅ | `components/receipt/ReceiptCard.tsx:343-357` — tender 블록 뒤, `snap.footer` 앞 |
| 12 | QR 크기 120×120 (SvgXml) | ✅ | `ReceiptCard.tsx:349` `width={120} height={120}` |
| 13 | 번호 작은 글씨 (`text-xs text-ink-muted`) | ✅ | `ReceiptCard.tsx:351` testID="receipt-qr-no" |
| 14 | Sale/VOID/REFUND 공통 — kind 분기 없음 | ✅ | `ReceiptCard.tsx:343` `receipt.order_id` 가드만 |
| 15 | `order_id` 없으면 QR 블록 생략 | ✅ | `ReceiptCard.tsx:343` `receipt.order_id ? ... : null` |
| 16 | ESC/POS GS v 0 raster · `escposRasterCommand` (로고와 같은 경로) | ✅ | `lib/printer/receipt-escpos.ts:255` |
| 17 | 프린터 raster widthPx = 384 (전폭 가운데 정렬) | ✅ | `lib/qr.ts:95` `PRINTER_WIDTH_DOTS_QR = 384` · 어설션 (7) pass |
| 18 | quiet zone 4모듈 (`QR_QUIET_MODULES = 4`) | ✅ | `lib/qr.ts:92` |
| 19 | 용지 증가 27.8mm @203DPI (목표 20~25mm 대비 2.8mm 초과) | 허용 | ISO 최소 quiet zone(4모듈) 준수 우선 — AT 보고서 기재 |
| 20 | `order_id=""` → ESC/POS QR raster 생략 | ✅ | `receipt-escpos.ts:248` `if (receipt.order_id)` · 어설션 (5) pass |
| 21 | `escposBytesToText` GS v 0 디코더 추가 | ✅ | `receipt-escpos.ts:340-350` xL/xH/yL/yH 파싱 · `i += 8 + bytesPerRow*rows` |
| 22 | receipt_no 가 "Thank you" 앞에 위치 | ✅ | `docs/testing/receipt-escpos-sample.txt` diff · 어설션 (8) pass |
| 23 | 화면 파일 미수정 (`app/orders/[orderId].tsx`, `success/[orderId].tsx`) | ✅ | #102 changed_files 11건 중 미포함 |
| 24 | 스샷·이미지 실제 커밋 (`git ls-tree` 확인) | ✅ | blobs: escpos-sale-qr.png a4949c1 · escpos-void-qr.png dd2536e · screen-sale/void-qr.svg 실체 diff 확인 |
| 25 | 어설션 수정 전 실패 근거 | ✅ | M0-1105-AU 보고서: 'Order not found' 어설션 "FAIL→PASS" 명시 |
| 26 | AT 어설션 38/38 · m2-1105-m 39/39 (회귀 없음) | ✅ | M0-1105-AT 보고서 |
| 27 | `SvgXml` (react-native-svg) 번들 — 기존 dep, 신규 위험 없음 | ✅ | 기존 의존성 |
| 28 | CI `mergeable_state` unstable | ⚠️ | PR #102 GitHub 표시 — assertions 38+43 PASS 확인, CI 로그 직접 확인 불가(403). #100 rebase 후 재실행 권장 |

### #101 충돌 여부

| 비교 | 겹치는 파일 | 판정 |
|------|------------|------|
| #100 ↔ #101 | 없음 (#101: VoidRefundSheet·refund-rules·fixtures·scripts, #100: qr.ts·scan.tsx·package) | ✅ 무충돌 |
| #102 ↔ #101 | 없음 (#102: ReceiptCard·receipt-escpos·qr.ts·scripts, #101: 위 동일) | ✅ 무충돌 |

---

## 머지 순서

1. **#100 먼저** — master `7d4796c` 위로 rebase (`package.json` 양측 변경 병합 · `npm install` → `package-lock.json` 재생성) → push → merge
2. **#102 base 변경** — `feat/m0-1105-as-order-qr-scan` → `master` (rebase on new master) → CI 재실행 확인 → merge
3. **#101 독립** — #100/#102 와 파일 겹침 없어 순서 무관 · 별도 머지 가능

---

## Kyu 실기 항목 (쉬운 말)

**#100 머지 후:**
1. iPad Scan 탭 열면 카메라 아래 "Scan receipt QR or barcode" 글자 보이는지 확인
2. `docs/testing/m0-1105-as-qr-sample.png` 파일을 휴대폰 카메라로 찍으면 `merospos://orders/01JT9...` 텍스트 읽히는지 확인

**#102 머지 후:**
3. Sale 영수증 화면: QR 코드가 결제 금액 블록 아래, "Thank you" 위에 나오는지
4. VOID 영수증 화면: "VOID" 빨간 배너 + QR 코드 둘 다 보이는지
5. QR 코드를 카메라 앱으로 직접 찍으면 `merospos://orders/{orderId}` 로 읽히는지
6. 프린터 출력: QR이 결제 금액 아래·Thank you 위에 찍히고, QR 아래 `No. R-261112-0001` 형식 작은 글씨 있는지
7. VOID 영수증 프린터 출력 시에도 QR 블록 포함되는지

---

## 이연 순증감

| 항목 | 증감 |
|------|------|
| `qrcode@1.5.4` 런타임 dep | +1 |
| `@types/qrcode` devDep | +1 |
| `lib/qr.ts` 신규 (Round 1 79줄 + Round 2 65줄 = 144줄) | +1 파일 |
| 신규 이연 | 없음 |
| #100 rebase(package.json/lock) 필요 | 미완료 작업 |

---

## 착지 명령

```bash
cp /tmp/R0-1105-CF-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-CF-report.md && git commit -m "r0: R0-1105-CF" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-CF done "#100 APPROVE(CC해소·package.json+lock rebase 필요) · #102 APPROVE(ReceiptCard QR·ESC/POS·화면미수정·번들안전)"
```
