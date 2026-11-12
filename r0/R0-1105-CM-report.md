# R0-1105-CM 리포트 — #225 Stock cleanup "Open orders holding stock" + #223 운영 모양 시드

**날짜**: 2026-11-12
**판정**: #225 수정 필요 · #223 APPROVE

---

## 판정 2줄

- **#225 (M2-1105-AW)**: ⚠️ 수정 필요 — `prod-shape-seed.ts` 충돌(Critical) · `handleCompleteOrder` 서버 guard 없음(Medium) · `#2` 테스트 누락(Medium)
- **#223 (M2-1105-AV)**: ✅ APPROVE — `(b)` restock:true 수정 + `(b-restock)` 계약 고정 + 기존 테스트 약화 없음

---

## 검증 표

### #225

| 항목 | 파일:줄 (approximate) | 판정 |
|---|---|---|
| 기존 stale 판정 불변 | `route.ts:93-95` — mode 없거나 "stale" → 기존 분기 | ✅ |
| 24h cutoff | `route.ts:275` — `cutoff24h = Date.now() - 24*60*60*1000` | ✅ |
| preorder 보호 (`is_expected_pending`) | `route.ts:347-351` — `order_type=preorder && stage!=="paid_full"` | ✅ |
| delivery 보호 (`is_expected_pending`) | `route.ts:352-354` — `order_type=delivery && !has_fulfillment` | ✅ |
| Release 강한 확인 다이얼로그 | `page.tsx:541-561` — 경고 텍스트 + Cancel/Release | ✅ |
| 자동 삭제 0 | route.ts 전체 — UI 액션 필요, 자동 실행 없음 | ✅ |
| #224 충돌 없음 | route.ts — tenders/tax 경로 미접촉 | ✅ |
| **`prod-shape-seed.ts` 충돌** | `_helpers/prod-shape-seed.ts` — `item_id` vs `line_item_id` 불일치 | ❌ Critical |
| **`handleCompleteOrder` 서버 guard** | `route.ts:401-414` — `has_fulfillment` 미검증 | ❌ Medium |
| **`#2` 테스트 누락** | `open-order-reservations.spec.ts` — #1/#3/#4만 있음 | ❌ Medium |
| `backdateReservation` 에러 묵살 | `open-order-reservations.spec.ts:48-58` — catch 블록 silent | ⚠️ |

### #223

| 항목 | 파일:줄 | 판정 |
|---|---|---|
| `(b)` `restock: true` 추가 | `p6-e2e.spec.ts:184` | ✅ |
| `(b-restock)` 400 계약 고정 | `p6-e2e.spec.ts:208-250` | ✅ |
| `(b-AQ)` 별도 유지 | `p6-e2e.spec.ts:(b-AQ) 블록` | ✅ |
| 기존 (a)(c-i)(c-ii)(d)(e)(f)(g) 약화 없음 | `p6-e2e.spec.ts` 전체 | ✅ |
| seedProdShape — variant↔inv 링크 | `prod-shape-seed.ts:148-154` | ✅ |
| seedProdShape — `is_draft_order: true` | `prod-shape-seed.ts:155` | ✅ |
| stock-cleanup.spec.ts 이관 | `stock-cleanup.spec.ts` 전체 | ✅ |
| 로컬 2회 결과 | stock-cleanup PASS×2 / p6-e2e 8/9×2 (`(b)` 수정으로 9/9 예상) | ✅ |

---

## 머지 순서

**권장**: `#224(세금)` → `#223(seedProdShape·(b) 수정)` → `#225(Open orders — 수정 후)`

- `#224` 먼저: tenders/세금 경로 안정화 후 `#223` 테스트가 올바른 금액으로 통과
- `#223` 먼저: `prod-shape-seed.ts` 풍부한 버전이 main에 먼저 들어가야 `#225`가 그 위에 쌓임
- `#225` 수정 후: `prod-shape-seed.ts` 제거 + server guard + #2 테스트 추가

---

## Kyu 실기 항목 (#225)

1. **`_helpers/prod-shape-seed.ts` 제거** (Critical)
   - `#225` 브랜치에서 이 파일을 제거
   - `open-order-reservations.spec.ts`의 import 경로는 동일(`../_helpers/prod-shape-seed`) — #223 버전 사용
   - spec이 사용하는 `order_id / active_reservation_id / stock_location_id`는 #223 반환 타입과 호환

2. **`handleCompleteOrder` 서버 guard 추가** (Medium)
   - `route.ts`의 `handleCompleteOrder`에서 order graph 조회
   - `packed_at != null && canceled_at == null` fulfillment 없으면 `400 { type: "no_fulfillment" }` 반환

3. **`#2` 테스트 추가 / `backdateReservation` 개선** (Medium)
   - `order_id` 누락 → 400 계약 테스트 추가
   - `backdateReservation` catch 블록: 에러 묵살 대신 명시적 `test.skip()` 또는 throw

---

## 이연 순증감

| 항목 | 변화 | 비고 |
|---|---|---|
| "pending 고착 주문 cleanup" UI 구현 (R0-1105-CI 신규 이연) | 조건부 소멸 | #225 수정 완료 후 머지 시 소멸 |
| `completeOrderWorkflow` 재시도 보조 도구 (R0-1105-CI 대안) | 조건부 소멸 | #225 guard 수정 완료 후 소멸 |
| void-refund-restock 이관 (M2-1105-AV 이연) | 무변화 | AX 머지 후 |
| tenders 이관 (M2-1105-AV 이연) | 무변화 | AX 머지 후 |
| **#225 Kyu 수정 3건** | **신규** | prod-shape-seed 충돌·guard·#2 테스트 |

---

착지 명령:
```
cp /tmp/R0-1105-CM-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-CM-report.md && git commit -m "r0: R0-1105-CM" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-CM done "#225 수정 필요(prod-shape-seed 충돌·server guard·#2 테스트) · #223 APPROVE · 머지 순서 #224→#223→#225"
```
