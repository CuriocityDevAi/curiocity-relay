M0-1121-D-report
route 수정 O · 호출처 id 형식 sloc+rss(둘 다) · 같은 오인 추가 발견 0건 · tests 5/5 · PR #411

---

## 1. 수정 (1개 route · 1개 테스트 파일)

### `apps/commerce-core/src/api/admin/pos/registers/[id]/snapshot/route.ts`

```ts
const snapshot = registerId.startsWith("sloc_")
  ? await svc.getActiveSnapshotByStockLocation(registerId, now)
  : await svc.getActiveSnapshotForRegister(registerId, now);
```

- `sloc_` → `getActiveSnapshotByStockLocation(id, now)` (open session 경유 · M2-1121-E 진단 수용)
- `rss_` (및 기타) → `getActiveSnapshotForRegister(id, now)` (기존 경로 유지 · 하위 호환)

## 2. 호출처 조사(POS fork `agilo-medusa-pos-fork`)

| 호출처 | 전달 | 분기 후 결과 |
|---|---|---|
| `components/loyalty/CustomerDisplayRow.tsx:19` | `stockLocationId` (`sloc_…`) | 이제 open session 의 snapshot 반환 (수정 전엔 null) |
| `app/checkout/success/[orderId].tsx:64` (M1-1117-O · M3-1116-R) | `openSession.data?.id` (`rss_…`) | 기존 그대로 |
| `app/orders/[orderId].tsx:710` | `openSession.data?.id` (`rss_…`) | 기존 그대로 |
| `components/loyalty/CustomerDisplayStatus.tsx:19` | `registerId` prop (호출자 context) | prop 에 따라 분기 |

→ POS fork 가 **두 접두어 모두** 호출 → `startsWith("sloc_")` 분기 정합.

## 3. 같은 오인 추가 발견: 0건

유사 라우트 2개 점검:

- `apps/commerce-core/src/api/customer-display/snapshots/active/route.ts` — device-token 이 `stock_location_id` 주입 후 `getActiveSnapshotByStockLocation` 호출. **오인 없음** (이미 올바름).
- `apps/commerce-core/src/api/admin/pos/loyalty/sessions/snapshots/active/route.ts` — `?register_id=` query, `register_session_id` 명시 계약. fork 쪽 호출처 없음 (storeport 내부 docs/tests 만 참조). **범위 밖**.

## 4. 테스트 — `integration-tests/loyalty/register-snapshot.spec.ts`

5/5 통과 (`bash scripts/it.sh register-snapshot`, 18.4s):

| # | 케이스 | 결과 |
|---|---|---|
| 1 | 존재하지 않는 register_id → snapshot: null | PASS ✓ (기존) |
| 2 | 활성 스냅샷 + customer_phone 마스킹 | PASS ✓ (기존) |
| 3 | Authorization 헤더 없음 → 401 | PASS ✓ (기존) |
| 4 | **sloc_ 호출 → open session 의 active snapshot 반환** | PASS ✓ (신규) |
| 5 | **sloc_ 호출 · open session 없음 → snapshot: null (200, 404 아님)** | PASS ✓ (신규) |

## 5. 금지 범위 준수

`display-machine.ts` · `useDisplayMachine.ts` — 무변경.
`order_snapshot` service — service 는 이미 두 메서드 다 가짐, 수정 불필요.

## 6. PR

- https://github.com/CuriocityDevAi/storeport/pull/411
- 브랜치 `fix/M0-1121-D-pos-snapshot-sloc` · head `3b90fe5` (prettier 후처리 포함)
- 커밋·푸시·발의 완료 · **머지 보류** (지시 준수)
- processes: `commerce-core.pos-register-snapshot`
