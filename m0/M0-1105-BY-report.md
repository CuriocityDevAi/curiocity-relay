# M0-1105-BY — #251 CI pos-integration partial-refund-anytime #BF-2 /fulfill 500 수정 (완료)

원인(한 줄): `/fulfill` 이 body.items 를 변환 없이 Medusa workflow 로 전달 → 테스트가 `line_item_id` 키로 보내 workflow 가 id 미인식으로 throw → 500. 겸사로 drilled-down 재발: reservation / polyfill scope 가 항상 `order.items` 전수라 부분 fulfill 요청이 전 라인을 소진. 추가 노출: `/return` 의 복원 location 이 PIN-scope 용 `order.metadata.stock_location_id` 를 그대로 inventory location 으로 써서 scoped-fake 테스트가 `inventory_restored=false`.

결과: **CI green** · head `e542085` (base `2083c54` + 2 commits).

## PR / CI 체크 (head `e542085` · run 43569373454)
- pos-integration: **pass** 6m8s · 160 tests 모두 pass · refund-retry-qris **7/7** (BW 이후 CI 에 처음 노출된 spec 포함 전원 green)
- unit-commerce-core: pass 55s · 160 tests
- changes-filter · markers-and-forbidden · check: pass
- docker-smoke-* · wrangler-check-care-agent: skipping (브랜치 변경 영향 없음)

## [REQ] 응답
1. **main(#251 없이) 대사**: 로컬 Postgres DB 부팅 비용 + 25분 상한 때문에 로컬 재현은 포기. 대신 workflow 타입 시그니처 교차검증 (`node_modules/.pnpm/@medusajs+types@2.17.2.../workflow/order/create-fulfillment.d.ts:7-16` · `{id, quantity}` 만 유효) + spec 시드 데이터 (`integration-tests/pos/partial-refund-anytime.spec.ts:329-342` · `{line_item_id, quantity}` 계약) 로 **기존 버그** 확정. R2(#248) 와 무관 — M0-1105-BW 의 auto-discovery 가 이 spec 을 처음 CI 에 노출시켰을 뿐.
2. **500 원인 파일:줄**: `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts:452-485` (pre-fix) — body.items 정규화 없이 workflow 호출. 로그 stack 은 CI 상에서 `fulfillment create failed: ...` 로 집어 쓰지만 (route 자체 500 핸들러), 뿌리는 workflow validator throw.
3. **수정** (최소 서버 수정 · 테스트 불변):
   - `fulfill/route.ts`: body.items 를 `{id|line_item_id, quantity}` → `{id, quantity}` 로 정규화, `line_item_ids` / fallback reservations / polyfill 을 정규화된 범위로 좁힘 (부분 fulfill 이 선택 라인만 소진) — commit `f5c4589`.
   - `/return/route.ts` **후속 fix** (BY 범위 내 · 같은 버그 체인): adjust 위치를 `inventoryModule.listInventoryLevels` 첫 레벨의 `location_id` 에서 뽑도록. 과거엔 PIN-scope 용 `order.metadata.stock_location_id` 를 그대로 썼기 때문에 테스트/운영이 scoped id 로 override 하면 adjustInventory 실패 → `inventory_restored=false`. BW 이전엔 partial-refund-anytime / refund-decision-bc 가 CI 에 노출되지 않아 은폐됨 — commit `e542085`.
   - **테스트 수정 없음**. 호출자 (앱 · 통합테스트) 는 `/return` 과 동일하게 `{line_item_id, quantity}` 키를 쓰는 쪽이 API 간 일관성에 우위라 서버가 둘 다 수용.
4. **jest bail / silent-drop 재발 제거**: `apps/commerce-core/scripts/test-integration-pos.sh` 의 `set -e` 로 첫 실패 spec 에서 즉시 종료 → refund-retry-qris 등 후속 spec 이 CI 로그에 **아예 미실행** (BW 이후 재발 뿌리). `set -uo pipefail` 로 변경 · 각 spec 결과를 `FAILED_SPECS` 에 수집, 끝에서 종합 비-0. 이번 run 에서 모든 12 spec 결과가 CI 로그에 남는 것 확인.
5. **CI pos-integration 전 suite 결과**:
   - open-order-reservations: 5 pass
   - p6-e2e: 10 pass
   - partial-refund-anytime: **3 pass** (BF-1·**BF-2**·BF-3)
   - pos-qris-simulate: 12 pass
   - pos-tax-lines: 9 pass
   - refund-decision-bc: **3 pass** (BC-1·**BC-2**·BC-3)
   - refund-ghost-reservation: 5 pass
   - refund-receipt-kind: 4 pass
   - refund-retry-qris: **7 pass** (BW 이후 CI 에 처음 노출)
   - stock-cleanup: 1 pass
   - tenders: 95 pass
   - void-refund-restock: 6 pass
   - **합계: 12 suite · 160 tests · 모두 PASS**

## 변경 파일
- `apps/commerce-core/src/api/admin/pos/orders/[id]/fulfill/route.ts` (+47 / -11 · body.items 정규화 + partial scope)
- `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts` (+44 / -17 · inventory adjust location 을 inventory_item level 에서 뽑도록)
- `apps/commerce-core/scripts/test-integration-pos.sh` (+15 / -4 · set -e 제거 + FAILED_SPECS 수집)

## 커밋
- `f5c4589 fix(pos): #BF-2 /fulfill partial items 500 — body.items {line_item_id|id} 수용 + reservation/polyfill partial scope + pos runner set -e 제거 (M0-1105-BY)`
- `e542085 fix(pos): #BF-2 #BC-2 /return inventory_restored=false — adjust 위치를 inventory_item level 에서 뽑도록 (M0-1105-BY 후속)`

processes: [commerce-core.pos-tenders-fulfill]
