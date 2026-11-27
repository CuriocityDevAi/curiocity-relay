PASS · PR #481 · head 64546af1d4bcd3229e84332a7ec0682dd7cc0abf · 신규 테스트 10건 (QRIS 5 · Cash 1 · split 1 · void 1 · 공통 fixture 2) · CD vitest 360/360 PASS · receipt-lines 36/37 PASS (pre-existing 1 skip) · typecheck clean.

# M0-1127-O · R4 — 손님 화면 ReceiptScreen 전체 영수증 "줄 목록" 소비

## 결과

- PR: https://github.com/CuriocityDevAi/storeport/pull/481 (`feat/M0-1127-O-cd-receipt-full` · stacked on #479 head 99a55bd2)
- HEAD: `64546af1d4bcd3229e84332a7ec0682dd7cc0abf`
- 커밋 1건: `feat(cd): M0-1127-O R4 — 손님 화면 ReceiptScreen 본문을 공용 "줄 목록" 소비로`
- CI 는 러너/Kyu 확인 몫 (ticket "CI 기다리지 말 것").

## 기술 선택 (권장안)

**A. OrderSnapshot → ReceiptSnapshot 어댑터 (채택).** `receipt-lines-adapter.ts` 에서
서버 `OrderSnapshot.receipt` + top-level 폴백을 `@storeport/receipt-lines` 의 입력
모양으로 매핑. `resolveReceiptLines` 는 그대로 — 줄 순서 · 라벨 · 숫자 포맷은 공용
패키지가 전부 결정. 매체 차이는 오직 `CD_LINES_OPTIONS` 의 `show_logo=false` ·
`show_qr=false` (로고/QR 은 CD paper 에선 그리지 않음).

**B. (기각) CD 에서 resolveReceiptLines 를 안 쓰고 자체 재구현.** R1 이 세운 "한 출처"
원칙 역행 — 세 소비자가 또 갈라짐.

**C. (기각) 서버에서 ReceiptLine[] 까지 완성해 내려보냄.** Q4 (서버 영수증 엔드포인트
신설) 는 아직 미결 — 이번 라운드 scope out. 지금은 snapshot 을 CD 가 그대로 소비하는
구조 유지.

## PR 본문 3줄

- R4 = CD 전체 영수증(ReceiptScreen) 을 프린터·POS 와 **같은 줄 목록** 으로 통일.
- Left 패널 체크 pop · "Payment complete" · Get N points CTA · 5초 자동 진행 전부 보존.
- 기존 e2e testID 는 label 매칭으로 하위 호환 (receipt-store-name / subtotal / tax /
  total / tender-N / bottom-order-no).

## 범위 한정 (충돌 없음)

- 건드린 파일: `apps/customer-display/src/screens/ReceiptScreen.tsx` · `receipt-lines-adapter.ts` (신규) · `ReceiptLinesRenderer.tsx` (신규) · `__tests__/receipt-lines-adapter.test.ts` (신규) · `package.json` · `pnpm-lock.yaml` · `docs/feature-map.yaml`.
- 안 건드림: `LeftPaymentPanel.tsx` · `PhoneFlowScreen.tsx` · `app/index.tsx` (#480 몫) · narisolutions fork (M1-1127-H 몫).

## Kyu 실기 체크리스트

iPad 결제 완료 영수증 vs POS 영수증 나란히 — 줄 순서 · 라벨 · `Rp 16.500` · `#N` 머리 · `No. R-…` · 긴 번호(PIM26B…) 1:1. QRIS / Cash / split / void 변형 각 한 번.
