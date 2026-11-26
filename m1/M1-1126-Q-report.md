PASS 요소 53 · 일치 41 · 불일치 1 · 진행 중 9 · 미구현 2 · Kyu 질문 3

## PR #52 push 완료

branch: `docs/M1-1126-P-screen-spec` · commit: `22bff1d4b`

---

## 정정한 행 목록 (전/후)

### pos-payment-flow.md

| ID / 항목 | 전 | 후 |
|---|---|---|
| `SELL-TAB-LABEL` 일치 여부 | 진행 중 PR#275 | **일치** (fork #274 · 8f092f5 · M3-1126-H 머지 완료) |
| `SELL-PRODUCT-SHEET-IMG` 일치 여부 | 진행 중 PR#275 | **일치** (fork #274 · 8f092f5 · M3-1126-H 머지 완료) |
| `LG-1` 일치 여부 | 진행 중 PR#276 | **일치** (fork #271 · 2669fb0 · M1-1126-I 머지 완료) |
| `LG-2` 일치 여부 | 진행 중 PR#276 | **일치** (fork #271 · 2669fb0 · M1-1126-I 머지 완료) |
| `LG-3` 일치 여부 | 진행 중 PR#276 | **일치** (fork #271 · 2669fb0 · M1-1126-I 머지 완료) |
| `POS-HDR-PHONE` 일치 여부 | 진행 중 PR#275/#276 | **진행 중 PR#276** · storeport #456 머지 완료(ce4f6ad) 추가 |
| `CART/CHECKOUT/TENDER×3/SPLIT/SUCC HDR-PHONE` (각 7개) | 진행 중 PR#275/#276 | **진행 중 PR#276** |
| `POS-HDR-PHONE` 이력 | fork #275/#276 | fork #276 · storeport #456 머지 완료(ce4f6ad) |
| 헤더 꼬리표 | fork #275 · fork #276 · storeport #457 · #458 | fork #276 · storeport #457·#458 · storeport #456·fork #274·#271 머지 완료 |
| 충돌 2번 | Kyu 질문 후보 (계약서 폐기 여부) | **오케 결정(11-26)**: relay v1.3 폐기됨 · 정본 storeport v1.4 |

### customer-display.md

| ID / 항목 | 전 | 후 |
|---|---|---|
| `CD-RECEIPT-FORMAT` 일치 여부 | **불일치** (V3-2 · storeport #454 머지 후) | **진행 중 PR#457·#458** (매장명·주소=#454 완료 · 결제수단 등=#457 · 캐셔·로고=#458) |
| 충돌 1 (공유) | relay v1.3 §5 축약 vs 6상태 미결 | **오케 결정 반영**: storeport #456 머지 완료로 CD 쪽 필드 추가됨 |
| 충돌/미결 2 (서버 derive) | Kyu 질문 후보 | **보존 테스트 항목**: production 입력 조건 통합 테스트 — 다음 라운드 |
| 미결 1 (V3-2 CD-RECEIPT-FORMAT) | "storeport#454 머지 후 발부" | **진행 중 PR#457·#458** (Kyu 질문 아님) |
| 미결 3 (V4-1 lingering snapshot) | "storeport#454 이후 발부" | **진행 중 PR#457** (Kyu 질문 아님) |
| 계약서 헤더 | v1.3 + v1.4 | v1.3 (**폐기됨 11-26**) + v1.4 **(정본)** |

### specs/screens/README.md

- 추가: "**규칙**: 계약서는 명세서를 축약할 수 없음 · 다르면 명세서가 이김."

### plans/cd-sync-contract-20261125.md

- 첫 줄 추가: `⚠️ 폐기(11-26) · v1.3 §5 는 Kyu 11-24 6상태 승인을 축약 — 정본은 storeport v1.4`

---

## 수치 계산 근거

| 분류 | P판 | Q판(정정 후) | 변동 |
|---|---|---|---|
| 일치 | 36 | **41** | +5 (LG-1~3 + SELL-TAB-LABEL + SELL-PRODUCT-SHEET-IMG) |
| 불일치(pure) | 2 | **1** | -1 (CD-RECEIPT-FORMAT → 진행 중) |
| 진행 중 | 13 | **9** | -5(→일치)+1(←불일치CD-RECEIPT-FORMAT) |
| 미구현 | 2 | **2** | 변동 없음 |
| 합계 | 53 | **53** | ✓ |
| Kyu 질문 | 7 | **3** | SUCC-LINK-CUSTOMER · 긴 Order 번호 채번 · PB1 11% vs 10% |
