# M2-1105-AV 리포트 — 운영 모양 시드 공용 헬퍼 · 2026-11-12

## 숨은 버그 후보 (수정 금지)

| spec | test | 실패 모드 | 근거 |
|------|------|-----------|------|
| p6-e2e.spec.ts | `(b) 결제 → fulfill → Void 성공` | POST /void → **400** | 운영 모양 시드(variant↔inventory 링크)에서 void 엔드포인트가 fulfill 후 `restock` 파라미터를 요구. 구 시드(`createTestOrder`, 링크 없음)는 inventory_item 미발견 → restock_required 가드 미작동 → 통과. 운영 경로에서는 항상 400 이었을 것. |

---

## REQ 1 · spec 현황표

| spec | manage_inventory | variant↔inv 링크 | Hot/Iced 옵션 | 사전 reservation | PB1 설정 | 매장 PIN |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| void-refund-restock.spec.ts | ✅ | ✅ | Hot만 | ✅ 11개 | 각 테스트 내 설정 | computePinForTest |
| tenders.spec.ts | ❌ createTestOrder | ❌ | ❌ | ❌ | 일부 테스트 | computePinForTest |
| p6-e2e.spec.ts (이관 전) | 일부 | ❌ | ❌ | 일부 (별도 호출) | ❌ | fetchAdminPin |
| stock-cleanup.spec.ts (이관 전) | ✅ withInventory | ❌ | ❌ | 별도 호출 | ❌ | 없음 |
| **p6-e2e.spec.ts (이관 후)** | ✅ | ✅ | Hot/Iced | ✅ 11개 | ❌ (PIN 테스트라 PB1 미설정) | fetchAdminPin |
| **stock-cleanup.spec.ts (이관 후)** | ✅ | ✅ | Hot/Iced | ✅ 11개 | ❌ | 없음 |

---

## REQ 2 · seedProdShape 헬퍼 (신규 파일)

**경로**: `apps/commerce-core/integration-tests/pos/_helpers/prod-shape-seed.ts`

**시그니처**:
```ts
export async function seedProdShape(
  container: MedusaContainer,
  opts?: {
    preReserved?: number;    // 기본 11 (운영 Order #66)
    initialStock?: number;   // 기본 100
    pb1Pct?: number;         // 기본 10 — api+authHeader 있을 때만 POS 설정 반영
    scPct?: number;          // 기본 0
    variants?: string[];     // 기본 ["Hot", "Iced"]
    unitPrice?: number;      // 기본 30000 IDR
    quantity?: number;       // 기본 1
    api?: any;
    authHeader?: Record<string, string>;
  }
): Promise<ProdShapeSeed>
```

**반환값**:
```ts
{
  order_id, line_item_id, inventory_item_id,
  stock_location_id, stale_reservation_ids,
  active_reservation_id,  // 주문 자체 reservation
  variant_id,
}
```

**설계 근거**: `void-refund-restock.spec.ts` seedOperationalOrder 선례(#221) 직접 추출. `is_draft_order: true` (실 POS P2 흐름), variant↔inventory `link.create`, stale 고아 예약 N개.

---

## REQ 3 · 이관 spec 목록 및 로컬 2회 결과

### 이관된 spec

| spec | 이관 테스트 | 유지한 테스트 | 이유 |
|------|-----------|-------------|------|
| `p6-e2e.spec.ts` | (a)(b)(c-i)(c-ii)(d)(e)(f)(g) | (b-AQ) | (b-AQ)는 `metadata.inventory_item_id=null` 운영 경로 전용 시드 |
| `stock-cleanup.spec.ts` | #1 | — | 전체 이관 |

### 로컬 2회 결과

**Run 1** (2026-11-12 14:06 WIB):

| spec | 결과 | 상세 |
|------|------|------|
| stock-cleanup.spec.ts | ✅ PASS | 1/1 |
| p6-e2e.spec.ts | ⚠ FAIL | 8/9 — (b) fulfill→void 400 = 숨은 버그 후보 |

**Run 2** (2026-11-12 14:08 WIB):

| spec | 결과 | 상세 |
|------|------|------|
| stock-cleanup.spec.ts | ✅ PASS | 1/1 |
| p6-e2e.spec.ts | ⚠ FAIL | 8/9 — (b) 동일 |

> **주의**: 두 spec을 같은 Jest 프로세스로 실행 (`--testPathPattern="stock-cleanup|p6-e2e"`)하면 Medusa MedusaModule singleton 오염(Map.prototype.set receiver 오류)으로 stock-cleanup도 실패. 각 spec을 별도 프로세스로 실행해야 함 (기존 `test:integration:pos` 커맨드 패턴과 동일).

---

## REQ 4 · AX 머지 뒤 이관 목록 (다음 라운드)

| spec | 이관 불가 이유 | AX 뒤 작업 |
|------|--------------|-----------|
| `tenders.spec.ts` | AX 가 order.total/세금 기대값 직접 수정 | seedProdShape 이관 + pb1Pct 설정 통합 |
| `void-refund-restock.spec.ts` | AX 가 세금 포함 금액 기대값 수정 | seedOperationalOrder → seedProdShape 통합 (Hot/Iced 옵션 추가) |

---

## PR

- storeport PR #223: https://github.com/CuriocityDevAi/storeport/pull/223

## git ls-tree

```
040000 tree 8eff654b...  apps/commerce-core/integration-tests/pos/_helpers
040000 tree c7b7ff72...  apps/commerce-core/integration-tests/pos/fixtures
100644 blob 3d80893d...  apps/commerce-core/integration-tests/pos/helpers.ts
100644 blob f3ba9136...  apps/commerce-core/integration-tests/pos/p6-e2e.spec.ts
100644 blob 7f5e0107...  apps/commerce-core/integration-tests/pos/stock-cleanup.spec.ts
100644 blob f506d99a...  apps/commerce-core/integration-tests/pos/tenders.spec.ts
100644 blob 54993f54...  apps/commerce-core/integration-tests/pos/void-refund-restock.spec.ts
100644 blob e2dc280f...  apps/commerce-core/integration-tests/pos/_helpers/prod-shape-seed.ts
```

## 이연 순증감

| 항목 | 이번 | 누적 |
|------|------|------|
| void-refund-restock 이관 | 0 (AX 뒤) | — |
| tenders 이관 | 0 (AX 뒤) | — |

---

## 착지 명령

```
cp /tmp/M2-1105-AV-report.md ~/projects/curiocity-relay/m2/ && cd ~/projects/curiocity-relay && git add m2/M2-1105-AV-report.md && git commit -m "m2: M2-1105-AV" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M2-1105-AV done "seedProdShape 헬퍼 · p6-e2e·stock-cleanup 이관 · 숨은 버그 1건(fulfill→void restock 미전달)"
```
