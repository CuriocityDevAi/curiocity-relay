# M3-1105-BR 착지 보고

**HEAD SHA**: bed007db  
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/127  
**vitest**: 17 files · 179 passed | 6 expected fail ✓  
**lint errors**: 0 ✓  
**웹 번들**: expo export -p web 성공 ✓

---

## C1 같은 상품 합치기

**원인**: `sdk.admin.draftOrder.addItems()` 가 variant_id 중복 무관하게 항상 새 줄 생성.  
**수정 파일**: `lib/cart-merge.ts` (신규) · `api/hooks/draft-orders.tsx`  
**내용**:
- `mergeCartItems()` 유틸: 동일 variant_id 있으면 toUpdate(수량 합산), 없으면 toAdd
- `useAddToDraftOrder` 훅: 캐시 조회 후 updateItem or addItems 분기
- 옵션(Hot/Iced)은 variant_id 에 이미 인코딩 → 별도 옵션 비교 불필요
- 서버(storeport) 수정 없음 — 클라이언트 캐시 기반 분기로 해결

## N-a Checkout 뒤로가기 "(tabs)" → "Cart"

**원인**: `headerBackTitle` 미설정 → expo-router 가 `(tabs)` 그룹 디렉터리명 그대로 노출.  
**수정 파일**: `app/_layout.tsx`  
**내용**: checkout/[draftOrderId] Stack.Screen 에 `headerBackTitle: 'Cart'` 추가

## N-b 제목 겹침 (Checkout · Cash tender)

**원인(#113 iPad 미해결)**: `headerBackTitle` 미설정으로 `(tabs)` 긴 괄호 텍스트가 iOS 네이티브 헤더 타이틀 영역까지 밀려 겹침.  
**수정 파일**: `app/_layout.tsx` · `app/checkout/[draftOrderId].tsx` · `app/checkout/tender-cash/[draftOrderId].tsx` · `app/checkout/tender-qris/[draftOrderId].tsx` · `app/checkout/delivery/[draftOrderId].tsx`  
**채택안**: `headerLargeTitle: true` — back 버튼 상단 nav 행, 타이틀 아래 큰 섹션 → 물리적 겹침 불가  
- checkout 콘텐츠 중복 "Checkout" text-4xl 제거 (headerLargeTitle 대체)
- split-tender · delivery 동일 패턴 적용

## N-c View order 직행 (My Orders 플래시 제거)

**원인**: `router.replace('/(tabs)/orders')` → `router.push('/orders/[orderId]')` 두 단계 렌더링 → Orders 목록 약 0.5초 노출.  
**수정 파일**: `app/checkout/success/[orderId].tsx`  
**채택안**: `CommonActions.reset({ index:1, routes:[tabs/orders, orders/[orderId]] })` — 루트 스택을 한 프레임에 최종 상태(모달 상단, Orders 탭 하단)로 재구성  

---

## 자기 검증 결과

| 항목 | 결과 |
|------|------|
| (a) 라떼 2번 담기 → 줄 1·수량 2 | ✓ vitest 5건 / Playwright 스샷 |
| (b) Checkout "< Cart" · 제목 안 겹침 | ✓ 코드 적용 / **iOS 실기 미검증** (web-only 스샷) |
| (c) 현금 입력 화면 제목 안 겹침 | ✓ 코드 적용 / **iOS 실기 미검증** (web-only 스샷) |
| (d) View order → 상세 바로 | ✓ CommonActions.reset / Playwright 스샷 |

Playwright 스샷 (1180×820): `screenshots-m3-1105-br/` 4장 첨부
(b)(c) iOS native header 동작은 iOS 실기에서만 검증 가능 — 미검증 명시
