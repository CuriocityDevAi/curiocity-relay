# M3-1128-E 진단 보고서 — 영수증 패리티 8항목 분석

**원인 분포: 패키지(storeport receipt-lines) 7 · 어댑터(fork#292 forkReceiptToArgs) 1**

---

## 3열 대조표 — QRIS 픽스처 (5종 중 차이가 가장 많이 드러나는 케이스)

> (A) = fork master 73ae612 `renderReceiptEscPos` · (B) = storeport 13014336 `resolveReceiptLines + renderLinesAsText` · (C) = fork#292 e768836 `renderReceiptEscPos`
>
> 픽스처: `QRIS_SALE_SNAPSHOT + SALE_META` / 동등 fork Receipt (receipt_no R-261127-0012, issued_at 2026-11-27T03:15:30Z, order_id ord_42, store name Soopsok Sweets phone +62 21 7123 4567 npwp 01.234.567.8-901.000, header "Jl. Kemang Raya…", items Chocolate Croissant×2@16500 + Americano×1@22000, tax PB1 10% 5775, service_charge 5% 2750, grand_total 63525, tenders [qris 63525 issuer=GoPay qris_receipt_id=QRS-20261127-ABC123 reference_no=RRN987654321])

```
줄                      (A) Fork master 73ae612         (B) Storeport 13014336          (C) Fork#292 e768836
──────────────────────  ──────────────────────────────  ──────────────────────────────  ──────────────────────────────
store phone             WA +62 21 7123 4567             Tel: +62 21 7123 4567           Tel: +62 21 7123 4567
store npwp              (없음)                          NPWP: 01.234.567.8-901.000      NPWP: 01.234.567.8-901.000
─                       ────────────────────────────    ────────────────────────────    ────────────────────────────
meta Order #            Order #42                       #42                             (없음 — pos_order_num=null)
meta Cashier            Cashier Kirana                  Cashier Kirana                  Cashier Kirana
─                       ────────────────────────────    ────────────────────────────    ────────────────────────────
items qty×price         2 x IDR 16,500    IDR 33,000   2 x Rp 16.500      Rp 33.000   2 x Rp 16.500      Rp 33.000
─                       ────────────────────────────    ────────────────────────────    ────────────────────────────
service_charge          (없음 — 타입에 없음)            Service charge 5%   Rp 2.750   Service charge 5%   Rp 2.750
tax label               PB1                IDR 5,775   PB1 10%             Rp 5.775   PB1 10%             Rp 5.775
TOTAL                   TOTAL              IDR 63,525  TOTAL              Rp 63.525   TOTAL              Rp 63.525
─                       ────────────────────────────    ────────────────────────────    ────────────────────────────
구분선(tender 앞)        ────────────────────────────    ────────────────────────────    ────────────────────────────
QRIS amount             QRIS               IDR 63,525  QRIS               Rp 63.525   QRIS               Rp 63.525
QRIS issuer             "  GoPay"                      "  Issuer               GoPay"  "  Issuer               GoPay"
QRIS qris_receipt_id    (렌더 안 함)                    Ref   QRS-20261127-ABC123        Ref   QRS-20261127-ABC123
QRIS reference_no       Ref            …87654321       Ref No.      RRN987654321        Ref No.      RRN987654321
구분선(tender 뒤)        (없음)                          ────────────────────────────    ────────────────────────────
blank                   (없음)                          (없음 — qrMode=placeholder)     ""  (blank line)
QR                      ──── / [QR] / ""               [QR]                            [QR]
QR 하단 텍스트          No. R-261127-0012               (qrMode=placeholder → 생략)     Scan to pay / verify
구분선(footer 앞)        ────────────────────────────    (없음)                          (없음)
footer                  Thank you for visiting...      Thank you for visiting...        Thank you for visiting...
```

---

## 8항목 개별 분석

### ①  통화 `IDR 15,000` ↔ `Rp 15.000`

| | 값 | 근거 |
|--|--|--|
| (A) Fork master | `IDR 16,500` (쉼표 · en-US locale · "IDR" 접두사) | `lib/printer/receipt-escpos.ts:36,48` (73ae612) — `const DEFAULT_CURRENCY = 'IDR'` + `toLocaleString('en-US')` |
| (B) Storeport | `Rp 16.500` (마침표 · 인도네시아 표기 · "Rp" 접두사) | `packages/receipt-lines/src/currency.ts:9` (13014336) — `formatIdrRp` |
| (C) Fork#292 | `Rp 16.500` | storeport `formatIdrRp` 그대로 사용 |

**어긋남 지점:** 패키지 자체가 프린터와 다름.  
storeport는 `decision-receipt-single-source-20261127 Q1 a`에서 `Rp` 형식을 결정했으나, 이 결정이 fork master의 `IDR` 형식(73ae612 `receipt-escpos.ts:36`)을 반영하지 않음.

---

### ②  메타 `Order #100` ↔ 없음/`#7`

| | 값 | 근거 |
|--|--|--|
| (A) Fork master | `Order #42` | `lib/printer/receipt-escpos.ts:207` (73ae612) — `if (snap.order_display_id != null) b.line(\`Order #${snap.order_display_id}\`)` |
| (B) Storeport | `#42` (TextLine, 레이블 없이 숫자만) | `packages/receipt-lines/src/resolve-receipt-lines.ts` (13014336) — `lines.push({ kind: "text", text: top.number })` |
| (C) Fork#292 | 없음 (pos_order_num=null이면 Queue 블록 없음 → TextLine도 없음) | `lib/printer/receipt-escpos.ts:126` (e768836) — `order_display_id: snap.pos_order_num ?? null` |

**어긋남 지점:** fork#292 어댑터 입력 차이.  
fork master에서 `snapshot.order_display_id = 100`은 메타 줄에 그대로 출력되지만, fork#292의 `forkReceiptToArgs`는 `snap.pos_order_num`을 storeport `order_display_id`로 매핑(`e768836 lib/printer/receipt-escpos.ts:126`). `pos_order_num`이 null이면 Queue 블록 전체 없음 → `Order #100` 메타 줄 소실.  
(B) storeport는 `order_display_id=42`를 `#42` TextLine으로 출력(레이블 없음); fork master는 `Order #42` 형식(레이블 있음).

---

### ③  QR 하단 `No. R-261127-0012` ↔ `Scan to pay / verify`

| | 값 | 근거 |
|--|--|--|
| (A) Fork master | `No. R-261127-0012` (receipt_no 출력) | `lib/printer/receipt-escpos.ts:277` (73ae612) — `b.line(\`No. ${receipt.receipt_no}\`)` |
| (B) Storeport | `[QR]` (caption은 text 렌더러에서 생략됨) | `packages/receipt-lines/src/resolve-receipt-lines.ts` (13014336) — `{ kind: "qr", caption: "Scan to pay / verify" }` / `render-text.ts` `qrMode:"placeholder"` → caption 출력 안 함 |
| (C) Fork#292 (ESC/POS) | `Scan to pay / verify` | `lib/printer/receipt-escpos.ts` (e768836) — `case 'qr': ... if (line.caption) b.line(line.caption)` |

**어긋남 지점:** 패키지 자체가 프린터와 다름.  
storeport는 QR 하단에 정적 "Scan to pay / verify" 캡션을 고정; fork master는 receipt_no를 검증용으로 출력. 또한 parity test는 `qrMode:"placeholder"` 사용 → caption 필드 자체가 텍스트 비교에서 무시됨(차이 감지 불가).

---

### ④  Tender 뒤 구분선 위치

| | 구조 | 근거 |
|--|--|--|
| (A) Fork master | `tender` → (rule 없음) → `rule` → `[QR]` → `No. R-…` → `rule` → `footer` | `lib/printer/receipt-escpos.ts:246-299` (73ae612) — 구분선이 tender 뒤가 아닌 QR 앞과 footer 앞에 위치 |
| (B) Storeport | `rule(tender 앞)` → `tender` → `rule(tender 뒤)` → `blank` → `[QR]` → `footer(rule 없음)` | `packages/receipt-lines/src/resolve-receipt-lines.ts:270-284` (13014336) — tenders 블록 뒤 `lines.push({kind:"rule"})` 추가, footer 앞 rule 없음 |
| (C) Fork#292 | (B)와 동일 구조 | storeport resolveReceiptLines 출력 그대로 렌더 |

**어긋남 지점:** 패키지 자체가 프린터와 다름.  
fork master는 footer 앞에 항상 `b.rule()` 추가, tender 뒤에는 없음. storeport는 tender 블록 뒤에 rule을 추가하고 footer 앞에는 추가하지 않음. QR이 없는 경우 `---footer` 순서는 같아 보이지만, QR이 있으면 blank 위치와 rule 개수가 다름.

---

### ⑤  QRIS issuer 형식 `  GoPay` ↔ `Issuer  GoPay`

| | 값 | 근거 |
|--|--|--|
| (A) Fork master | `  GoPay` (2공백 들여쓰기 plain 줄) | `lib/printer/receipt-escpos.ts:116` (73ae612) — `b.line(\`  ${tender.issuer}\`)` |
| (B) Storeport | `  Issuer               GoPay` (KV, 왼쪽 `Issuer` 레이블) | `packages/receipt-lines/src/resolve-receipt-lines.ts:tenderDetails` (13014336) — `out.push({ label: "Issuer", value: tender.issuer! })` |
| (C) Fork#292 | `  Issuer               GoPay` | storeport tenderDetails 그대로 |

**어긋남 지점:** 패키지 자체가 프린터와 다름.  
storeport는 issuer를 KV pair로 출력; fork master는 plain 들여쓰기 줄.

---

### ⑥  `Ref` ↔ `Ref No.`

| | 값 | 근거 |
|--|--|--|
| (A) Fork master | `Ref  …87654321` (reference_no를 "Ref" 레이블로, 10자 초과 시 뒤 8자 truncate) | `lib/printer/receipt-escpos.ts:117-121` (73ae612) — `b.kv('Ref', ref.length > 10 ? '…'+ref.slice(-8) : ref)` |
| (B) Storeport | `Ref  QRS-20261127-ABC123` (qris_receipt_id) + `Ref No.  RRN987654321` (reference_no, truncate 없음) | `packages/receipt-lines/src/resolve-receipt-lines.ts:tenderDetails` (13014336) — qris_receipt_id → label "Ref", reference_no → label "Ref No." |
| (C) Fork#292 | 동일 (qris_receipt_id 있으면 Ref · reference_no 있으면 Ref No.) | 어댑터가 tenders를 그대로 pass-through |

**어긋남 지점:** 패키지 자체가 프린터와 다름.  
fork master는 `reference_no` 하나만 "Ref"로 출력(truncate 포함); storeport는 `qris_receipt_id`→"Ref", `reference_no`→"Ref No." 2개로 분리 출력(truncate 없음). 필드명도 다름.

---

### ⑦  `PB1` ↔ `PB1 10%`

| | 값 | 근거 |
|--|--|--|
| (A) Fork master | `PB1               IDR 5,775` (tax.label 그대로) | `lib/printer/receipt-escpos.ts:243` (73ae612) — `b.kv(snap.tax.label, formatIDR(snap.tax.amount))` |
| (B) Storeport | `PB1 10%            Rp 5.775` (rate_pct 붙임) | `packages/receipt-lines/src/resolve-receipt-lines.ts` (13014336) — `const full = ratePct != null ? \`${taxLabel} ${ratePct}%\` : taxLabel` |
| (C) Fork#292 | `PB1 10%            Rp 5.775` | storeport 세금 블록 그대로 |

**어긋남 지점:** 패키지 자체가 프린터와 다름.  
storeport는 `tax.rate_pct`가 있으면 레이블에 `10%`를 자동 append; fork master는 서버 snapshot의 `tax.label` 그대로.

---

### ⑧  Store phone prefix `WA +62…` ↔ `Tel: +62…` + NPWP 줄 추가

| | 값 | 근거 |
|--|--|--|
| (A) Fork master | `WA +62 21 7123 4567` (WhatsApp 접두사) · NPWP 줄 없음 | `lib/printer/receipt-escpos.ts:186-189` (73ae612) — `centerLines(b, \`WA ${snap.store.phone}\`)` · npwp 렌더 없음 |
| (B) Storeport | `Tel: +62 21 7123 4567` + `NPWP: 01.234.567.8-901.000` | `packages/receipt-lines/src/resolve-receipt-lines.ts` (13014336) — `\`Tel: ${storePhone}\`` + `\`NPWP: ${npwp}\`` |
| (C) Fork#292 | `Tel: +62 21 7123 4567` + `NPWP: 01.234.567.8-901.000` | 어댑터가 `store.phone / store.npwp` pass-through → storeport 렌더 |

**어긋남 지점:** 패키지 자체가 프린터와 다름.  
fork master는 `WA` 접두사로 WhatsApp 번호임을 표시하고 NPWP를 출력하지 않음; storeport는 `Tel:` 접두사에 NPWP 줄 추가.

---

## M2-1127-S "차이 0"이 무엇과 무엇을 비교했는지

**비교 대상:** `resolveReceiptLines(SALE_SNAPSHOT, SALE_META)` → `renderLinesAsText(…, {qrMode:"placeholder"})` 출력 ↔ `docs/testing/receipt-escpos-sample.txt` (동일 함수로 `WRITE_SAMPLE=1`에 미리 생성한 파일).

**왜 놓쳤는지:** golden 파일 자체가 storeport `__write-sample.test.ts`가 storeport 렌더러로 생성한 것이므로(13014336 `tests/__write-sample.test.ts`), 패리티 테스트는 "storeport ↔ storeport 자신의 이전 출력" 자기 일치를 검증할 뿐이다. fork master `renderReceiptEscPos`의 실제 바이트 출력과 한 번도 비교하지 않았고, `qrMode:"placeholder"`로 QR 캡션 차이가 텍스트 비교에서 완전히 차단됐다.

---

## 재발 방지안 (결정용)

**fork master 프린터 출력 5종을 golden 파일로 storeport에 커밋하고, parity 테스트가 그 파일과 비교; fork CI는 skip 대신 GitHub raw/SHA로 대조.**

구체적 방법:
1. **storeport 측**: `docs/testing/receipt-escpos-printer-*.txt` 파일 5종을 fork master `renderReceiptEscPos` + `escposBytesToText`로 직접 생성해 커밋. parity.test.ts를 수정해 `receipt-escpos-sample.txt`(스스로 생성) 대신 `receipt-escpos-printer-*.txt`(fork master 소스)와 비교하도록 변경.
2. **fork#292 CI 측**: `m1-1127-m-receipt-lines-sync.test.ts`의 `it.skipIf(!storeportAvailable)` 5건을 제거하고, storeport 경로 없는 환경에서는 `https://raw.githubusercontent.com/<org>/storeport/<RECEIPT_LINES_VENDORED_FROM>/packages/receipt-lines/src/<file>`로 GitHub raw 콘텐츠를 fetch해 sha256 비교. 이렇게 하면 CI upstream에서 "skip=통과"가 "fail=차이 감지"로 바뀜.

이 두 조치로 storeport 패키지가 fork master 출력과 어긋나는 순간 parity 테스트가 빨강이 되고, fork 쪽도 vendored 파일이 storeport와 달라지면 CI가 차단된다.
