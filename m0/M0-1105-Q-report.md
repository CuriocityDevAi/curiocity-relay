---
round: M0-1105-Q
pr:
  storeport: storeport#197
base_pr: null
outcome: tax-sc-logo-live · SC + PB1 compound 과세 (POS 자체 계산) · GET /admin/pos/orders/:id/quote 신규 · receipt snapshot 에 SC+PB1+logo_url · Integration 17/17 · CI 전부 그린
kyu_checks: 1 (open-requirements §세금 11-07 소화 · 11-04 세금 라벨 결정 대체)
ci_links:
  markers-and-forbidden: https://github.com/CuriocityDevAi/storeport/actions/runs/42355871398/job/128353725497
  check: https://github.com/CuriocityDevAi/storeport/actions/runs/42355871387/job/128353725636
  changes-filter: https://github.com/CuriocityDevAi/storeport/actions/runs/42355871398/job/128353725771
  pos-integration: https://github.com/CuriocityDevAi/storeport/actions/runs/42355871398/job/128353749732
---

# M0-1105-Q · 매장별 세금 (SC+PB1 compound) + 영수증 로고 + quote API

**일자**: 2026-11-07 · **허브**: M0 · **대상**: `apps/commerce-core/{src/api/admin/pos,src/modules/{pos_settings,receipt},src/admin/{lib,routes/pos-settings}}` + `integration-tests/pos/tenders.spec.ts`.

**base**: `origin/main @ fe07858` (M0-1105-P 머지 직후).

---

## §0 대사표 — 코어/우회/신규

| 항목 | 현 Medusa 2.17 지원 | 결론 |
|------|---------------------|------|
| 단일 과세 `subtotal × pct` (PPN, PBJT 등) | ✓ core (`tax_rate.rate`) | 사용 가능하지만 compound 불가 |
| Service Charge (가산 수수료) | ✗ 내장 개념 없음 (promotion 은 **차감**만) | **신규 필요** |
| Compound 과세 ("subtotal 위에 SC 가산 → 그 위에 PB1") | ✗ 불가 (tax_rate 는 단일 base) | **신규 필요** |
| Ta Wan 영수증 패턴 (SC 5.5% + PB1 10%) | ✗ 네이티브 표현 불가 | **신규 (POS 자체 계산)** |
| 매장별 (stock_location 단위) 설정 | △ pos_settings 가 "store" 단일 (M0-1104-J) | **신규 scope 확장** |
| 영수증 로고 업로드 | △ `receipt_logo_mode` 는 있으나 URL 저장 없음 | **신규 필드** |

**권장안 (PR 본문 3줄)**:
1. Medusa `tax_rate` 는 단일 과세만 지원 · SC 내장 없음 · compound 표현 불가.
2. **POS 자체 계산**: `pos_settings` 에 `service_charge_pct · pb1_pct` 두고 `quote/tenders` 에서 명시 계산 (Math.round · M0-1105-F 반올림 규칙).
3. 통합 지점 1개 (`GET /admin/pos/orders/:id/quote`) · 재고 차감 시점 불변 · `medusa-config` · providers 미건드림.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | §0 계획서 (코어/우회/신규 · 권장안) | ✓ (§0 대사표) |
| 2 | 매장별 설정 (sc% · pb1% · logo · logo_mode) + Admin 섹션 추가 | ✓ |
| 3 | 계산 (가산 compound: subtotal → SC → PB1 · Math.round) | ✓ |
| 4 | preorder DP/잔금 은 grand_total 기준 | ✓ (tenders base = computedGrand) |
| 5 | GET /admin/pos/orders/:id/quote 신규 | ✓ |
| 6 | receipt snapshot 에 SC · PB1 · logo_url · pb1>0 시 show_tax_label 무시 | ✓ (리포트에 명시) |
| 7 | 통합 4+ (Ta Wan · 0%/0% · 로고 · quote=tenders) | ✓ (17/17) |
| 8 | CI 전부 그린 | ✓ (4/4) |
| 9 | 금지 영역 (medusa-config · providers · 재고 차감 시점) 변경 0 | ✓ |

---

## 1. 변경 ↔ file:line

### 서버
- **`modules/pos_settings/service.ts`** · DEFAULT 에 `service_charge_pct:0 · pb1_pct:0 · logo_file_id:null · logo_url:null` 추가. scope 체계: `"store"` 전역 · `"location:<id>"` 매장별. `getForLocation(locationId)` 메서드 신규 → 매장 row 없으면 store fallback.
- **`api/admin/pos/settings/route.ts`** · ALLOWED_PATCH_KEYS 에 `service_charge_pct · pb1_pct · logo_file_id · logo_url` 추가 + SC/PB1 0~100 범위 검증 + logo_url http(s) 검증.
- **`api/admin/pos/orders/[id]/quote/route.ts`** (신규) · `GET /admin/pos/orders/:id/quote`. 공식 (Kyu 11-07):
  ```
  subtotal    = items 합 (Medusa Order.subtotal 폴백)
  sc_amount   = round(subtotal × sc_pct / 100)
  pb1_amount  = round((subtotal + sc_amount) × pb1_pct / 100)
  grand_total = subtotal + sc_amount + pb1_amount
  ```
  응답: `{ subtotal, service_charge:{pct,amount}, tax:{label:"PB1",pct,amount}, grand_total, store:{id,name,logo_url} }`.
- **`api/admin/pos/orders/[id]/tenders/route.ts`** · pos_settings `getForLocation` 으로 switch + base total 을 `computedGrand = subtotal + SC + PB1` 로 재계산 · body.amount 생략 시 서버 grand_total 산정 · **non-preorder 에서 명시 amount ≠ grand_total 이면 400** ("amount must equal grand_total …"). 잔금 예외는 M0-1105-L 블록 유지. Subtotal 은 items 합 폴백.
- **`modules/receipt/service.ts::buildSnapshot`** · ReceiptSnapshotInput 에 `service_charge · posSettings.pb1_pct · pb1_amount · logo_url` 추가. tax block: **`pb1_pct > 0` 이면 show_tax_label 과 무관하게 항상** `{label:"PB1", rate_pct, amount, show:true}` 반환. `snapshot.store.logo_url` 미러링. `snapshot.labels.service_charge` 추가.

### Admin UI
- **`admin/lib/pos-settings-api.ts`** · PosSettings 타입 확장 (`service_charge_pct · pb1_pct · logo_file_id · logo_url` + tax_label "PB1" 추가).
- **`admin/routes/pos-settings/page.tsx`** · 2 섹션 추가:
  - "Store taxes · service charge (M0-1105-Q)" — Service charge % + PB1 % (0~100 inline validate) + 안내 문구 "pb1_pct>0 이면 show_tax_label 토글 무시".
  - "Receipt logo URL" — URL text input (http(s) validate) + 안내 "열전사용 B&W 변환은 앱/프린터 몫".
  - Save 가드 확장 (`invalid = dpInvalid || scInvalid || pb1Invalid || logoInvalid`).

### Receipt logo 업로드 전략
Medusa file 모듈 네이티브 업로드 UI 는 Admin dashboard 에서 지원. 사용자가 "Files" 메뉴에서 PNG 업로드 → 생성된 URL 복사 → POS Settings 의 "Receipt logo URL" 에 붙여넣기. 포인터만 저장하므로 서버 재업로드 없음. 열전사 B&W 변환은 앱 프린터 드라이버 책임 (서버 contract 아님).

**금지 영역 변경 0**: `medusa-config.ts` · providers (`payment_cash` · `payment_edc_manual` · `payment_xendit`) · 재고 차감 시점 (`createOrderFulfillmentWorkflow` 단일 지점 유지).

---

## 2. 검증

| 체크 | 결과 |
|---|---|
| ⓐ Build | Backend **3.98s** · Frontend **15.78s** · PASS |
| ⓒ 산출물 기동 | `BOOT OK unknown :9991` · `Server is ready on port: 9991 – 2226ms` · `/health 200` |
| Unit | **24/24 PASS** |
| Integration | **17/17 PASS** |
| CI `markers-and-forbidden` | PASS 8s |
| CI `check` (feature-map) | PASS 14s |
| CI `changes-filter` | PASS 5s |
| CI `pos-integration` | PASS 1m56s |

### Integration 로그 (17/17 · 신규 4 + #6 변환)
```
✓ #1  cash tender · metadata.receipt_id · draft→order auto-convert + Orders 목록 포함
✓ #2  edc approval 누락 → 400 · collection 0건
✓ #3  preorder dp=50 · 첫 tender draft 전환
✓ #4  takeaway fulfill inventory decrement
✓ #5  preorder fulfill → send_to_production
✓ #6  [M0-1105-Q] non-preorder · amount ≠ grand_total → 400 (split P6 후순위)
✓ #7  settings dp%=30 · body override
✓ #8  show_tax_label=false → tax.show=false
✓ #9  receipt_header 3줄 CRLF→LF
✓ #10 DP (converted:true) → balance (converted:false 멱등)
✓ #11 balance 미달/초과 → 400
✓ #12 balance → fulfill(hand_over) → 재고 1회
✓ #13 non-draft 멱등 skip-path
✓ #14 [M0-1105-Q] SC 5.5% + PB1 10% (Ta Wan) · 348,000 → 403,854 · quote=tenders 일치   455ms
✓ #15 [M0-1105-Q] 0%/0% · grand_total = subtotal · snapshot.tax.show=false              472ms
✓ #16 [M0-1105-Q] logo_url → snapshot.store.logo_url                                     419ms
✓ #17 [M0-1105-Q] pb1_pct>0 면 show_tax_label 토글 무시 (조리시설)                        442ms
Tests: 17 passed, 17 total
```

---

## 3. Fixture JSON (M3 배포 · 규칙 ⓑ)

### 3.1 quote 응답 (Ta Wan 샘플)
```json
{
  "subtotal": 348000,
  "service_charge": { "pct": 5.5, "amount": 19140 },
  "tax": { "label": "PB1", "pct": 10, "amount": 36714 },
  "grand_total": 403854,
  "store": {
    "id": "stock_loc_01M6TXXXX",
    "name": "Soopsok Cafe",
    "logo_url": "https://files.example.com/logos/soopsok.png"
  }
}
```

### 3.2 tenders 응답 (amount 생략 → 서버 grand_total 산정)
```json
{
  "ok": true,
  "order_id": "order_01M6TXXXXXX",
  "provider_id": "pp_cash_default",
  "amount": 403854,
  "order_type": "takeaway",
  "converted": true,
  "is_draft_order": false,
  "is_balance": false,
  "preorder_stage": null,
  "balance_due_after": null,
  "payment_collection_id": "paycol_01M6TXXXXXX",
  "payment_session_id": "payses_01M6TXXXXXX",
  "payment_id": "pay_01M6TXXXXXX",
  "receipt_id": "rec_01M6TXXXXXX",
  "receipt_no": "R-261107-0003",
  "receipt_kind": "sale",
  "method": "cash"
}
```

### 3.3 receipt snapshot (M3 가 렌더)
```json
{
  "store": { "name": "Soopsok Cafe", "logo_url": "https://files.example.com/logos/soopsok.png" },
  "header": "",
  "footer": "Thank you",
  "logo_mode": "full",
  "order_display_id": 42,
  "items": [ { "title": "Combo", "quantity": 1, "unit_price": 348000, "line_total": 348000 } ],
  "subtotal": 348000,
  "service_charge": { "label": "Service charge", "pct": 5.5, "amount": 19140 },
  "tax": { "label": "PB1", "rate_pct": 10, "amount": 36714, "show": true },
  "grand_total": 403854,
  "tenders": [ { "method": "cash", "amount": 403854, "received_amount": 403854, "change": 0 } ],
  "labels": {
    "subtotal": "Subtotal",
    "discount": "Discount",
    "service_charge": "Service charge",
    "total": "TOTAL",
    "received": "Received",
    "change": "Change",
    "approval": "APPROVAL",
    "copy_watermark": "*** COPY ***",
    "refund_watermark": "*** REFUND ***"
  }
}
```

### 3.4 400 (amount ≠ grand_total)
```json
{
  "type": "invalid_data",
  "message": "amount must equal grand_total (expected 403854, got 400000)"
}
```

---

## 4. Admin 설정 화면 스샷

`docs/M0-1105-Q-pos-settings-tax-sc-logo.png` — Admin 좌측 사이드바 "POS Settings" → 5 섹션 (show_tax_label · dp_percent · receipt_header · **Store taxes (SC 5.5 · PB1 10)** · **Receipt logo URL**). 스샷은 Ta Wan 샘플 값이 미리 채워진 상태.

---

## 5. 산출물

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/197
- **브랜치**: `feat/m0-1105-q-tax-sc-logo` (base = `main @ fe07858`)
- **커밋**: `e38bc96` · 9 파일 · +656/-91
- **CI run**: https://github.com/CuriocityDevAi/storeport/actions/runs/42355871398

---

## 6. 다음 후보

- M3 (앱) · 결제 전 Checkout 이 `GET /admin/pos/orders/:id/quote` 호출해 사용자에게 **최종 금액** (grand_total) 표기 + SC/PB1 라인 표시.
- M3 · receipt renderer · `snapshot.service_charge` 라인 + `snapshot.store.logo_url` 이미지 로드 (thermal printer 드라이버 B&W 변환).
- M0-1105-M (Delivery 단계) 재개.
- Admin · Medusa file 모듈 네이티브 업로드 → URL 자동 복사 heavier UI (현재는 수동 붙여넣기).
