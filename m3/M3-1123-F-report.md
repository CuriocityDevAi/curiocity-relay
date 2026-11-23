# M3-1123-F Report

판정: 완료 (lint 0 errors · PR 생성 · e2e 동봉)

PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/232

---

## 6항 결과표

| 항목 | 내용 | 결과 | 비고 |
|------|------|------|------|
| 1 | CartBottomBar 흑색 · View cart 시트 완전 펼침 | ✅ 구현 | CartBottomBar `bg-ink`, CartSheet `translateY=screenHeight→0` |
| 2 | 취소 확인 진동 + 상품 요약 | ✅ 구현 | Haptics.Heavy + Alert.alert + buildItemSummary / 진동 실기 필요 |
| D | 칩 순서 고정 · 번호 재매김 · 결제 칩 즉시 제거 | ✅ 구현 | OrderChipsRow 생성 순서 렌더 · bg-selected/bg-surface-muted |
| C | 결제 완료 카트 잔존 버그 | ✅ 수정 | draft-orders.tsx useCompleteDraftOrder에 removeDraftAfterPayment 추가 |
| A | Pickup/Close → 상태줄 … 메뉴 | ✅ 구현 | RegisterBadge 전체 탭 + MoreHorizontal 아이콘 + Alert.alert |
| B | 바코드 버튼 무반응 | ✅ 구현 | BarcodeScannerModal + useScanBarcode 재사용 · 카메라 실기 필요 |

---

## 신규 파일
- `app/(tabs)/sell.tsx` — Sell 화면 (products.tsx 대체, 멀티드래프트·칩·CartBottomBar 통합)
- `components/cart/CartBottomBar.tsx` — 흑색 하단 바
- `components/cart/CartSheet.tsx` — 풀스크린 bottom sheet
- `components/order-chips/OrderChipsRow.tsx` — 멀티 드래프트 칩 행
- `components/scan/BarcodeScannerModal.tsx` — 바코드 스캐너 모달
- `components/icons/more-horizontal.tsx` — MoreHorizontal lucide 아이콘
- `e2e/flows/M3-1123-F-sell.spec.ts` — Playwright 자기 검증

## 수정 파일
- `api/hooks/draft-orders.tsx` — 멀티 드래프트 헬퍼 + removeDraftAfterPayment + useMultiDraftIds 등
- `components/RegisterBadge.tsx` — Pickup/Close 제거 → … 액션시트
- `app/(tabs)/_layout.tsx` — sell 탭 등록 · products 탭 href:null 숨김

---

## 실기 필요 항목 (iPad·폰)
- CartSheet 완전 펼침 (390×844 / 820×1180)
- 취소 진동 (expo-haptics Heavy)
- 칩 3개 · #2 선택 시 순서 유지
- 결제 완료 → 칩 사라짐 · 번호 재매김
- 바코드 버튼 → 카메라 열림 · 스캔 성공 카트 추가
- 카메라 권한 거부 안내

## 미결
- `docs/plans/pos-multi-customer-v3.md` 미존재 (storeport 쪽) → 칩 D 규칙 갱신 불가 · PR 본문에 메모
