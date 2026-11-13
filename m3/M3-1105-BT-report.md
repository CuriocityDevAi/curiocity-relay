# M3-1105-BT 리포트

## 수정 파일
- `components/ui/QuantityPicker.tsx` — onRemove/isRemoving 추가 · quantity===min 시 Trash2 아이콘
- `components/ui/toast/CapsuleToastRemoved.tsx` — 신규 · 휴지통+Undo 버튼 캡슐 토스트
- `components/ui/toast/index.ts` — showToast.removedUndo() 추가
- `config/toast.tsx` — removedUndo 타입 등록
- `app/(tabs)/cart.tsx` — DraftOrderItem: handleTrashPress + Undo(useAddToDraftOrder)
- `app/checkout/tender-card/[draftOrderId].tsx` — 신규 · Card 전용 결제 화면 (K-3 수정)
- `app/_layout.tsx` — checkout/tender-card Stack.Screen · headerLargeTitle: true
- `__tests__/cart-trash.test.ts` — 신규 · shouldShowTrash/isTrashDisabled/Card 옵션 10건

## Head SHA
HEAD_SHA: 14415323279aaeaaa4289be7984347261fa092e1

## PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/129 (draft)

## 자기 검증
- vitest: 197 passed, 0 failed ✅
- lint errors: 0 ✅ (warnings 45)
- iOS 네이티브 헤더 (d): Kyu 실기 필요
- Playwright 스샷 (a)~(c): Kyu 실기 필요 (웹 번들에서 toast/animation 확인 불가)

## 완료 여부
완료 (45분 이내)
