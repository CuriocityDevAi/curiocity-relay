PR#145 · 높이 전→후: ~36px → ~68px (py-2→py-6, ×1.89 ≈ 약 2배) · 반영 화면 3개 (일반결제·split 1차·2차)

## 변경 요약

- **파일**: `components/ui/OptionChip.tsx` 1곳만 수정
- **높이**: `tab` variant `py-2`(8px×2) → `py-6`(24px×2) · 총 ~36px → ~68px ≈ **약 2배**
- **아이콘**: tab 전용 13px → 16px (+23%, 살짝)
- **글자**: `text-sm` 유지 · 색 규칙 무변경

## 반영 화면 (3개)

1. 일반 결제 (`tender-cash`) — Cash·Card·QRIS 탭
2. 나눠결제 1차 (`split-tender` FirstStep) — Cash·Card·QRIS 탭
3. 나눠결제 2차 (`split-tender` SecondStep) — Cash·Card 탭

## 스크린샷

- `e2e/screenshots/06-payment-tabs-icons.png` — 결제 탭 after
- `e2e/screenshots/02-split-step1.png` — split 1차 after
- `e2e/screenshots/02-split-step2.png` — split 2차 after
- `/tmp/before-payment-tabs-icons.png` — 결제 탭 before (로컬 보관)

## 테스트 결과

- Vitest: 303 passed (6 expected fail, 2 todo) ✅
- Playwright: 15 passed (Flow 02·06·나머지 포함) ✅
- Flow 04·05 실패는 origin/master 기존 문제 — 이 PR 무관 확인됨

## 확인(실기) 항목

- [ ] iPad 가로/세로 화면 넘침 없음
- [ ] 선택 차콜 + 흰 글자/아이콘 정상
- [ ] 미선택 테두리 + 어두운 글자 정상
- [ ] split 1·2차 동일 높이 반영
