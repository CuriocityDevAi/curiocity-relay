# M1-1105-CN Report

**원인**: Orders 탭이 `sdk.admin.order.list()`(완결 order 전용)만 조회해 draft order 제외됨 · 나눠결제 1차 QRIS captured 후에도 is_complete=false → draft→order 전환 미발생 · 주문 서버에 draft 상태로 잔류 (`tenders/route.ts:1142-1155`, `orders.ts:26`)  
**지금 찾는 법**: Medusa Admin UI `/app/draft-orders` → 11-15 15:25 경 생성된 draft order 목록에서 확인 가능 (`noreply+pos-guest@agilo.com` 고객 필터)  
**권장안**: Orders 탭 상단에 "Payment in progress" 섹션으로 split-pending draft order 노출 + 이어하기/취소·환불 버튼 (서버 1 route 수정 + 앱 1 훅 · 네이티브 의존 0)  
**PR**: https://github.com/CuriocityDevAi/storeport/pull/282

---

## 1. 원인 (파일:줄)

| 위치 | 내용 |
|------|------|
| `apps/anchor/src/api/hooks/orders.ts:26` | `sdk.admin.order.list()` — draft order 제외 |
| `apps/anchor/src/app/(tabs)/orders.tsx:212-223` | `useOrders(...)` 호출 · status 필터 없어도 order 엔티티만 |
| `tenders/route.ts:1142-1155` | `is_complete=true` 가 될 때만 draft→order 전환 |
| `api/hooks/pos-payments.ts:177-183` | 1차 tender POST 성공 시 `SecureStore draft_order_id` 삭제 → 앱에서도 ID 소실 |

나눠결제 1차 tender(`split:true`)가 성공하고 1차 QRIS가 웹훅으로 CAPTURED 돼도, 2차 tender가 아직 없으므로 `is_complete=false` → draft→order 전환 없음 → 주문은 draft 상태로 서버에 잔류. draft order는 `order` 엔티티가 아니므로 Orders 탭에 표시되지 않는다.

앱의 `SecureStore`에 저장된 `draft_order_id`도 1차 tender `onSuccess` 시점에 삭제되어 앱에서 직접 접근 불가.

## 2. 지금 주문을 찾을 수 있는 경로

**있음** — 단, 앱 내에서는 불가, Admin UI 필요.

1. **Medusa Admin UI Draft Orders** (추천)  
   브라우저에서 `<서버 URL>/app/draft-orders` → 2026-11-15 15:25 근처 생성 항목 확인.  
   고객 이메일 `noreply+pos-guest@agilo.com` 으로 필터링하면 POS 손님 주문만 나옴.  
   해당 Draft order ID 확인 후 qris-split-refund-plan §3-6 환불 경로로 1차 QRIS 50,000 환불 처리.

2. **Stock Cleanup 페이지 Open orders** — draft order 포함 여부 미확정.

3. **앱 Cart 탭** — 복원 불가 (SecureStore ID 삭제됨).

## 3. 업계 관행 · 권장안

**업계 관행 (3줄)**:
- **Square**: 분할 결제 중단 시 "Open Tickets" 큐에 `Partial payment` 뱃지 → 이어하기/취소 버튼.
- **Moka POS**: 미완 거래는 "Transaksi Tertunda(대기 거래)" 화면에 별도 보관, 로그인 시 알림.
- **Toast POS**: Orders 화면에 `In Progress` 필터 슬롯 — draft 주문이 "Payment in progress" 태그로 노출.

**권장안**: Orders 탭 상단에 별도 섹션으로 `metadata.tenders ≥ 1 && is_complete=false` 인 draft order를 "Payment in progress" 상태로 노출 + "이어하기 / 취소·환불" 버튼.  
서버: `GET /admin/draft-orders?split_pending=true` 필터 추가. 앱: `useSplitPendingDraftOrders` 훅 + Orders 탭 상단 섹션. **네이티브 의존 0**.

**대안**: 별도 "Drafts" 탭 (기존 탭 오염 없음 · 단 긴급시 발견 느림).

## Kyu 질문 2개

1. **지금 당장**: Admin UI Draft Orders (`/app/draft-orders`)에서 Order #105 에 해당하는 draft order를 찾아 ID를 확인했나요? 찾으면 qris-split-refund-plan §4(환불 경로)로 1차 QRIS 50,000 환불을 바로 처리할 수 있습니다.

2. **다음 라운드 범위**: "Orders 탭 상단 Payment in progress 섹션"(권장안)으로 가는 게 맞나요? 아니면 임시로 별도 "Drafts" 탭 먼저 추가하고 나중에 통합할까요?
