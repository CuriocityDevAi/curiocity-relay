---
ticket: M2-1127-N
branch: feat/M2-1127-J-receipt-lines
pr: https://github.com/CuriocityDevAi/storeport/pull/482
commit: 6b253461
date: 2026-11-27
status: COMPLETE
---

# M2-1127-N 완료 보고

## REQ 대응 결과

### REQ 1 — ESC/POS 황금 샘플 갱신 · receipt-lines 포맷 패리티

**완료.** `docs/testing/receipt-escpos-sample.txt` 를 fork 포맷으로 갱신하고,
`packages/receipt-lines/src/resolve-receipt-lines.ts` 및 `render-text.ts` 를 수정해
fork ESC/POS 렌더러와 출력이 일치하도록 했다.

변경 내역:
- 배너(VOID/REPRINT 워터마크)를 로고 앞으로 이동
- ITEMS 헤더 및 그 아래 rule 제거
- 현금·QRIS·CARD 라벨 대문자 (`CASH` / `QRIS` / `CARD`)
- KV 및 Tender 라벨의 콜론(`:`) 제거
- `Received` / `Change` 줄 들여쓰기 없음 (top-level)
- 모든 rule → 단일 `'-'` 반복 (굵은 `'='` 폐기)
- 날짜 형식에서 초(ss) 제거 → `HH:mm`
- 총액(TOTAL) 앞 rule 제거 · tender 앞 rule 1개로 통합
- 하단 footer rule → `'-'`

#### fork 와 의도적으로 보존한 차이점

| 항목 | fork | storeport | 이유 |
|---|---|---|---|
| 금액 포맷 | `IDR 33,000` | `Rp 33.000` | 인도네시아 로컬 관행 |
| 헤더 Tel/NPWP 줄 | 없음 | 있음 | 매장 필수 정보 |
| `Order #<display_id>` KV | 있음 | 없음 (Order = custom_display_id) | #N 1회 원칙 |
| 하단 Receipt No 중복 | 있음 (QR 블록 하단) | 없음 | #N 1회 원칙 |

---

### REQ 2 — QRIS 결제에서 PB1·서비스 차지 snapshot 포함

**완료.** `apps/commerce-core/src/workflows/pos-fulfill/steps/mint-sale-receipt.ts` 수정.

**근본 원인**: `settings.pb1_amount` 는 `DEFAULT_POS_SETTINGS` 에 없는 필드 → 항상 `0` →
`pb1_amount: null` 로 `buildSnapshot` 에 전달 → `tax.show=false`. Cash 에서도 같은 경로를
거쳤지만 Cash 는 `show_tax_label: true` 로 돌렸기에 증상이 가려져 있었다.

**수정 내용**:
```typescript
// 추가 (line 131~134)
const posTotals = ((md.pos_totals as Record<string, unknown>) ?? {});
const pb1FromMeta = toNum(posTotals.pb1);
const scPctFromMeta = toNum(posTotals.sc_pct);
const scAmountFromMeta = toNum(posTotals.service_charge);

// service_charge 전달 (line 157~159)
service_charge:
  scPctFromMeta > 0 && scAmountFromMeta > 0
    ? { pct: scPctFromMeta, amount: scAmountFromMeta }
    : null,

// pb1_amount 출처 변경 (line 167)
pb1_amount: pb1FromMeta > 0 ? pb1FromMeta : null,
// was: Number(settings.pb1_amount ?? 0) > 0 ? Number(settings.pb1_amount) : null
```

---

### REQ 3 — `RECEIPT_LINES_VERSION` export

**완료.** `packages/receipt-lines/src/index.ts` 에 추가:

```typescript
export const RECEIPT_LINES_VERSION = "1.1.0-20261127";
```

포맷(배너 위치·ITEMS 헤더 없음·CASH 대문자·초 없는 날짜·단일 구분선) 변경 시 갱신.

---

### REQ 4 — 패리티 테스트 (황금 샘플 한 줄 차이 → RED)

**기존 동작 확인.** `packages/receipt-lines/tests/parity.test.ts` 는 R1 에서 이미 구현.
황금 샘플을 갱신한 뒤 `pnpm test` 에서 2 tests PASS 확인.

---

## 테스트 결과

| 스위트 | 결과 |
|---|---|
| `@storeport/receipt-lines` (36 tests) | ✅ PASS |
| `commerce-core` receipt-snapshot (9 tests) | ✅ PASS |
| `commerce-core` 전체 (878 tests) | ✅ PASS |
| Naming check | ✅ PASS |

## 파일 변경 목록

- `packages/receipt-lines/src/resolve-receipt-lines.ts` — 포맷 6건
- `packages/receipt-lines/src/render-text.ts` — 콜론·rule·들여쓰기
- `packages/receipt-lines/src/index.ts` — RECEIPT_LINES_VERSION export
- `docs/testing/receipt-escpos-sample.txt` — 황금 샘플 갱신
- `apps/commerce-core/src/workflows/pos-fulfill/steps/mint-sale-receipt.ts` — pb1/sc 출처 수정
- `apps/commerce-core/src/modules/receipt/__tests__/receipt-snapshot.unit.spec.ts` — QRIS PB1 테스트
