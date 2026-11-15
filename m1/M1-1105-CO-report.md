PR#285(서버) · PR#147(앱) · Continue=split-tender 화면 이동 · Cancel=비활성(서버 draft void 미지원·이연) · 테스트=vitest 6/6 · pos-integration 4건

## 완료 항목

### 서버 (storeport PR#285)
- **새 엔드포인트** `GET /admin/pos/draft-orders`
  - `is_draft_order=true` && `metadata.tenders` active ≥ 1인 draft order 목록 반환
  - 응답: `id, display_id, created_at, currency_code, grand_total, paid_so_far, remaining, tenders, stock_location_id, register_session_id`
  - `grand_total` = `metadata.pos_totals.grand_total` (SoT)
  - 쿼리 파라미터: `?stock_location_id=`, `?register_session_id=`
  - 최근 7일 이내 · 최대 200건 · 최신순 정렬
- **통합 테스트** `integration-tests/pos/split-pending-draft-orders.spec.ts` — 4건
  - #1 active tender 1건 → 목록에 포함 · 금액 정확
  - #2 tender 없는 draft → 제외
  - #3 변환된(non-draft) order → 제외
  - #4 `stock_location_id` 필터 → 범위 한정

### 앱 (fork PR#147)
- **새 훅** `api/hooks/split-pending-orders.ts` — `useSplitPendingDraftOrders(locationId?)`
  - 30s staleTime · 60s refetchInterval
- **Orders 탭 상단** "Payment in progress" 섹션
  - 카드: Order #X · 1차 수단 + 금액 · 남은 금액(warning 색)
  - [Continue payment] → `/checkout/split-tender/[draftOrderId]` 이동
  - [Cancel & refund] → **비활성**(opacity-40 + disabled)
- **Vitest** `__tests__/split-pending-orders.test.ts` — 6/6 통과

## 미검증 (실기)
- iOS 시뮬레이터: 서버 PR#285 미배포 상태이므로 "Payment in progress" 섹션 실제 렌더링 미확인
- split-tender 화면 navigate 동작 (기존 화면 미수정으로 계약 호환 가정)

## 이연 (Cancel & refund 활성화)
- **서버 작업**: `POST /admin/pos/orders/:id/void`에서 `is_draft_order=true` 감지 → `refundPaymentWorkflow`(캡처된 PC) → draft 삭제 → void 영수증 발행
- **앱 작업**: 버튼 활성화 + `VoidRefundSheet` 연결 (manager PIN 규칙 유지)
- 이연 +1건 (신규 추가)
