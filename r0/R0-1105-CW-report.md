# R0-1105-CW Report

## 판정

| PR | 판정 | 사유 한 줄 |
|----|------|-----------|
| fork #113 (M3-1105-BG) | **CHANGES** | CI `m2-1105-ar` S3-2 fail + PillBackButton 스타일 iOS 네이티브 대비 불일치 (`#F2F2F0` 배경·그림자 없음) |
| storeport #230 (M0-1105-BF) | **APPROVE** | CI 전체 pass · unfulfilled reservation 삭제 로직 정확 · disposition 분기 완비 |

---

## #113 검증 표

| 항목 | 결과 |
|------|------|
| N1 뒤로가기 스타일 — iOS 네이티브 대비 | ✗ `bg-surface-muted`(`#F2F2F0`) + 그림자 없음 ≠ iOS 흰 배경 + 그림자 |
| CI assertions (`m2-1105-ar` S3-2) | ✗ split-tender title assertion fail (headerShown:false 로 title 프로퍼티 사라짐) |
| N2 헤더 겹침 해소 | ✓ `headerShown: false` 완전 제거 |
| N2 스와이프-백 | ✓ 체크아웃 하위 화면 `gestureEnabled: false` 없음 → swipe-back 유지 |
| N3 replace + push 스택 초기화 | ✓ checkout 스택 → Orders 탭 → 상세 오픈 → 닫으면 Orders 목록 |
| 새 패키지 | ✓ 0개 |
| master 충돌 | ✓ MERGEABLE |
| lint / flow-tests | ✓ pass |

**수정 필요**:
1. `m2-1105-ar-assertions.mjs` — `headerShown: false`도 S3-2 허용으로 업데이트
2. `PillBackButton.tsx` — `bg-white shadow-sm` 추가(A안) 또는 네이티브 헤더 유지 + paddingTop(B안)

---

## #230 검증 표

| 항목 | 결과 |
|------|------|
| CI run 43203413144 (pos-integration BF-1/2/3) | ✓ success |
| CI unit-commerce-core | ✓ success |
| 미출고 품목 In stock 불변 | ✓ `sp.fulfilled_qty <= 0` → adjustInventory skip |
| BF-1 부분 축소 (qty 3→2) 순서 | ✓ delete → create(leftover), 실패 시 inventory_warning |
| 혼합 라인 disposition 분리 | ✓ itemsOut 두 행 (`returned` / `canceled_unfulfilled`) |
| 세금 포함 금액 (#224) | ✓ lineRefunds 금액 경로 미변경 |
| CASH-first / 나눠 결제 | ✓ refundPaymentWorkflow S3 경로 미변경 |
| 매니저 PIN | ✓ 검증 로직 미변경 |
| 이미 환불 수량 재환불 차단 | ✓ 누적 가드 (M0-1105-AE) 미변경 |
| leftover 생성 실패 gap | ⚠ 미세 gap (delete 성공 후 create 실패 시 초과 qty 소거) — 블로킹 아님, inventory_warning 감지 가능 |
