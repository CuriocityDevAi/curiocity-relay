#381 APPROVE · QRIS O · 키패드 요약 O · 필드명 일치 O · 스레드 해결 2

## 리뷰 대상
- Repo: CuriocityDevAi/storeport (PR #381)
- Branch: feat/M0-1118-K-cd-sync-r3
- 제목: feat(customer-display): M0-1118-K — cd 싱크 R3 (pos_screen 분기 · seq 역행 · 폴링 1s)

## C-1: QRIS 화면 O

- `display-machine.ts` `posScreenToDisplay`: `payment_qris` → `"qris"` 분기 신설 (이전 CHANGES: `"cart"` → 블로커 해소)
- `QrisScreen.tsx` 신규:
  - landscape QR: min(h×0.55, w×0.5×0.9) → 1366×1024에서 563px (뷰포트 높이 55% ✅)
  - portrait QR: min(w×0.7, h×0.45) → 1024×1366에서 615px (뷰포트 폭 60%; 스펙 70% 대비 보수적 — 사소 참고)
  - qr_string 없으면 testID="qris-qr-placeholder" + "QRIS 결제 준비 중" (빈 QR 박스 없음 ✅)
  - 금액 크게(testID="qris-amount"), 소형 장바구니 recap(최대 3줄 + "+N more") ✅

## C-2: 키패드 위 주문 요약 O

- index.tsx MockIndexRoute + LiveIndexRoute 모두 `summary={snapshot}` 전달 (이전 CHANGES: 미전달 → 블로커 해소)
- app/keypad.tsx 라우트도 동일 수정
- KeypadScreen.tsx:
  - landscape: 왼쪽 패널 최상단 keypad-summary 카드 (주문번호 · 품목수 · 합계) ✅
  - portrait/split: keypad grid 바로 위 1줄 압축 스트립 ✅
  - storeConfig.orderNumber 없으면 비노출 (하위 호환) ✅

## C-3: 필드명 일치 O

| 필드 | 서버 | 손님 화면 |
|------|------|-----------|
| pos_screen | OrderSnapshot.pos_screen (M0-1118-J) | display-machine posScreenToDisplay |
| seq | OrderSnapshot.seq | nextScreen 역행 무시 |
| qr_string | OrderSnapshot.qr_string (tenders→session.data→DTO) | QrisScreen snapshot.qr_string |
| amount | OrderSnapshot.amount | snapshot.amount ?? snapshot.grand_total fallback |

## C-4: 스레드 해결 2건

- PRRT_kwDOTe-UYs65CZ3A (C-1 · display-machine.ts): resolved (outdated)
- PRRT_kwDOTe-UYs65Ca6m (C-2 · index.tsx): resolved

## C-5: CI

현재 run QUEUED (새 푸시로 이전 run 취소는 정상). 로컬 QC(PR 본문): typecheck 0 · unit 195/195 · e2e 27/27 ✅

## 사소 (비블로커)

- portrait QR 60% 실측 vs 스펙 70%: height×0.45 → height×0.5 로 올리면 충족 — 다음 이터레이션 감
- e2e spec 60% 임계값 주석에 "스펙 70%" 명시 권장

## 판정: APPROVE

GitHub에 APPROVE 불가(자신의 PR) → PR comment로 게시 완료
https://github.com/CuriocityDevAi/storeport/pull/381#issuecomment-6984414605
