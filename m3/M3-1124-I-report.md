PASS

# M3-1124-I — 태블릿 매장별 POS 인식 (R2 POS)

- **PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/251
- **Branch**: `feat/M3-1124-I-multi-store-pos`
- **Base commit**: `f3decf5` (origin/master · M2-1124-N #250)
- **Head commit**: `0b2842b`
- **원장**: `ledger/decision-multi-store-20261124.md` · Kyu 15:52·15:57·16:07
- **서버 연동**: storeport PR #418 (머지 직전 · 서버 리뷰 통과)

## 결과 요약

| 요구 | 상태 | 지점 |
|------|------|------|
| #1 `GET /admin/pos/settings?location_id=<id>` | ✅ | `api/hooks/pos-settings.ts` new |
| #2 PB1 pct=0 매장 영수증·합계 숨김 · 서버↔앱 grand_total 일치 | ✅ | 기존 `pct>0 && amount>0` 가드 유지 |
| #3 Orders 탭 매장 필터 `?stock_location_id=…` | ✅ | `usePosOrdersList` + metadata stamp |
| #4 상단 매장명 D1 subtle 노출 (닫힘·열림 공통) | ✅ | `RegisterBadge` |
| #5 location 미선택 → 기존 브랜드 동작 (회귀 0) | ✅ | enabled 가드 · metadata 생략 · badge null fallback |

## 변경 파일 (10)

| 유형 | 경로 | 요약 |
|------|------|------|
| new | `api/hooks/pos-settings.ts` | `usePosSettings(locationId)` · `BRAND_DEFAULT_POS_SETTINGS` fallback · 404/네트워크 실패 안전 |
| edit | `api/hooks/orders.ts` | `usePosOrdersList(q, stockLocationId?, limit)` · queryKey/query 에 location 포함 |
| edit | `app/(tabs)/orders.tsx` | `locationId` 전달 |
| edit | `api/hooks/draft-orders.tsx` | `useCompleteDraftOrder` 가 `order.metadata.stock_location_id` stamp (session 무관) |
| edit | `components/RegisterBadge.tsx` | 레지스터 닫힘도 매장명 노출 · muted 토큰 · storeName null → null (회귀 0) |
| new | `__tests__/m3-1124-i-multi-store.test.ts` | vitest 16 cases |
| new | `scripts/m3-1124-i-multi-store-playwright.mjs` | e2e 11 cases · 포트 0 자동 할당 |
| new | `e2e/screenshots/M3-1124-I-pb1-10-checkout.png` | PIM 10% 체크아웃 |
| new | `e2e/screenshots/M3-1124-I-pb1-0-checkout.png` | PS 0% 체크아웃 |
| new | `e2e/screenshots/M3-1124-I-header-store-closed.png` | 레지스터 닫힘 매장명 |

## 로컬 실행 로그

### Vitest (M3-1124-I 단위)

```
$ npx vitest run __tests__/m3-1124-i-multi-store.test.ts

 Test Files  1 passed (1)
      Tests  16 passed (16)
   Duration  152ms
```

### Vitest (전체 회귀)

```
 Test Files  2 failed | 73 passed (75)
      Tests  3 failed | 973 passed | 6 expected fail | 3 todo (985)
```

3 pre-existing failures (master 에서도 동일 재현):
- `m2-1119-s-pos-slip-fixes` Next customer testID / onNextCustomer 패턴 2건
- `m3-1119-o-cd-emit` revertDisplayToPaid order_id 패턴 1건

→ M3-1124-I 와 무관 (git stash 로 master HEAD 에서도 3건 그대로 fail 확인 · 보고 전용 메모).

### Playwright 하네스

```
$ node scripts/m3-1124-i-multi-store-playwright.mjs
serving on :59124

--- PIM (PB1 10%) · PB1 pct=10 ---
  ✓ PIM (PB1 10%) · checkout-tax-lines 보임
  ✓ PIM (PB1 10%) · PB1 10% 줄 노출 (count=1)
  ✓ PIM (PB1 10%) · 'PB1 (10%)' 라벨
  ✓ PIM (PB1 10%) · grand_total = subtotal+PB1 (110000)

--- PS (PB1 0%) · PB1 pct=0 ---
  ✓ PS (PB1 0%) · checkout-tax-lines 보임
  ✓ PS (PB1 0%) · PB1 0% 줄 숨김 (count=0)
  ✓ PS (PB1 0%) · grand_total = subtotal+PB1 (100000)

--- Orders 탭 · /admin/pos/orders-list stock_location_id 파라미터 ---
  ✓ orders 검색창 노출
  ✓ orders-list 호출 url 에 stock_location_id=sl_01 포함

--- Sell 상단 · 레지스터 닫혀 있어도 매장명 노출 ---
  ✓ register 닫힘 · 매장명 라벨 보임
  ✓ 매장명 = "PIM Store"

11/11 passed · 0 failed
```

## Kyu 실기 체크리스트 (PR 본문에 반영됨)

- PIM 태블릿 결제 → PB1 줄 보이고 grand_total = subtotal × 1.10
- PS 태블릿 결제 → PB1 줄 없고 grand_total = subtotal
- Orders 탭 → 자기 매장 주문만 (매장 전환 후 재확인)
- Sell 상단 → 레지스터 닫혀 있어도 매장명 노출 (subtle 톤)
- location 미선택 → 기존 wizard/브랜드 동작 (회귀 0)

## 기술 결정 (권장안 · PR 본문 3줄 반영)

1. `usePosSettings` 404 → `BRAND_DEFAULT_POS_SETTINGS` fallback: 서버 pre-머지/오프라인에서도 앱 안 깨짐.
2. `stock_location_id` metadata stamp 를 openSession 유무와 독립화: session 미오픈 draft / Admin 직접 생성 경로에도 매장 라벨 유지.
3. `RegisterBadge` 닫힘 상태 매장명 노출: 매장 전환 혼선 예방 · D1 muted 토큰만 사용 → 디자인 보드 회귀 없음.

## 서버 측에 남은 의존 (storeport PR #418)

- `GET /admin/pos/settings?location_id=…` route 연결 (service 에 scope 있고 route 미연결 — M2-1124-O 진단).
- `GET /admin/pos/orders-list?stock_location_id=…` metadata 필터.
- `/admin/pos/orders/:id/quote` 가 매장별 pb1_pct 적용된 pct/amount 반환.

POS 측은 서버 응답 shape 변화에 대비해 nullish/404 fallback 을 모두 갖춤.

## 실행한 커맨드 (감사 흔적)

```
git checkout -b feat/M3-1124-I-multi-store-pos origin/master
# ... 10 files 변경 ...
npx expo export -p web                                # dist 리빌드 (하네스 대상)
npx vitest run __tests__/m3-1124-i-multi-store.test.ts  # 16/16 pass
node scripts/m3-1124-i-multi-store-playwright.mjs       # 11/11 pass
git commit -m "feat(multi-store): M3-1124-I ..."
git push -u origin feat/M3-1124-I-multi-store-pos
gh pr create ...  →  https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/251
```
