# R0-1105-CY — fork #113(M3-1105-BI) + storeport #231(M0-1105-BH) 리뷰

## 판정

| PR | 판정 |
|----|------|
| fork #113 (M3-1105-BI · B안 네이티브 헤더 복귀) | **APPROVE** — B안 적용 완료 · BH rebase 확인 · N3 유지 |
| storeport #231 (M0-1105-BH · refund webhook 직조회) | **APPROVE** — JSONB 직조회 1회 · 파라미터 바인딩 · 토큰 순서 · 멱등 · 충돌 해소 완료 |

---

## #113 (M3-1105-BI) 세부

| 항목 | 판정 | 근거 |
|------|------|------|
| PillBackButton 사용처 0 · 삭제 | ✅ | `components/ui/PillBackButton.tsx` · `components/icons/chevron-left.tsx` 브랜치에 없음 (파일 조회 확인). PR diff net zero — BG 도입·BI 삭제로 최종 미존재. |
| 헤더 겹침 해소 | ✅ | `_layout.tsx`: `checkout/[draftOrderId]` `headerShown:false` 제거 → 네이티브 헤더 복귀. `success` `headerBackVisible:false`. `split-tender` `title:'Split payment'` (S3-2 자연 해소). |
| Checkout 뒤로가기 표시 | ✅ | `options={{ title: 'Checkout' }}` — `headerShown` 미지정(기본 true) → 네이티브 Back 자동. 추가 코드 0 (A안). |
| Payment successful 뒤로가기 숨김 | ✅ | `headerBackVisible:false` (`_layout.tsx`). |
| N3 View order → Orders + 상세 | ✅ | `router.replace('/(tabs)/orders')` + `router.push('/orders/[orderId]')`. Checkout 히스토리 소거. |
| #114(BH) BI 위로 rebase | ✅ | `feat/m3-1105-bh-both-void-refund` 커밋: `b2e0ea4`(BH) → `1faa967`(BI) → `8cfafdd`(BG). |

## #231 (M0-1105-BH) 세부

| 항목 | 판정 | 근거 |
|------|------|------|
| JSONB containment 직조회 1회 | ✅ | `findOrderByXenditRefundRef` → `pg.raw("SELECT id, metadata FROM \"order\" WHERE metadata @> ?::jsonb ... LIMIT 2")`. `query.graph(filters:{})` 완전 제거. 테스트: `selectOrderCalls.length===1` + `metadata @> ?::jsonb` 검증. |
| 전체 스캔 0 | ✅ | `filters:{}` 패턴 route.ts 에 없음. `findOrderByXenditRefundRef` 단일 경로. |
| SQL 파라미터 바인딩 · 인젝션 없음 | ✅ | `clauses` 는 리터럴 `metadata @> ?::jsonb`만. user 값은 `JSON.stringify` 후 `bindings[]`로 전달. |
| 토큰 검증 → 조회 순서 | ✅ | `handleRefundWebhook(req, parsed)` 는 outer POST가 `validateWebhookToken` 통과 후 호출. |
| 멱등 | ✅ | 중복 webhook 테스트: 이미 `SUCCEEDED` → `already===1` · `updateOrders` 미호출. |
| #230 rebase 충돌 해소 | ✅ | #230 헤드(`11f4c55`) `return/route.ts`: `xendit:{refund_id,status,reference_id,payment_request_id}` (#229 qris) + `reservation_released` (#230 disposition) 둘 다 응답·metadata 보존. |

## 로컬 실행 결과

### fork (#113)
| 항목 | 결과 |
|------|------|
| assertions (m2-1105-ar) | 13/13 ✓ |
| expo lint | 0 errors · 44 warnings (pre-existing) ✓ |
| vitest | 99 passed · 6 expected fail ✓ |
| CI (GitHub Actions) | ⚠ billing 사유 미실행 |

### storeport (#231)
| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | 0 errors ✓ |
| `jest webhook-route.unit.spec.ts` | 12 pass (기존 8 + BH 4) ✓ |
| `jest payment_xendit/__tests__/` | 41 pass ✓ |
| pre-push hook (#230 재push) | 9 suites · 97 tests pass ✓ |
| CI (GitHub Actions) | ⚠ billing 사유 미실행 |
