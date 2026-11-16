fork #156 rebase · 충돌 파일 없음(M3-1116-F 자동 skip) · 유닛 351 pass

## 작업 내용
- 브랜치: feat/m3-1116-o-checkout-snapshot
- rebase 대상: origin/master (HEAD: 879a476 — #155 NumericKeypad)
- 결과: M3-1116-F 커밋(8a3930a)은 origin/master에 이미 머지(fcbb27d)되어 git이 자동 skip
- #156 고유 커밋 1개(03b80d8 — M3-1116-O startSnapshot/cancelSnapshot)만 master 위에 착지
- 충돌 파일: 없음

## 변경 파일 (M3-1116-O만)
- api/hooks/pos-loyalty.ts (+30)
- app/checkout/[draftOrderId].tsx (+16)

## 테스트
- vitest: 351 passed | 6 expected fail | 2 todo
- TypeScript: 기존 사전 에러 그대로(app/_layout.tsx global.css, cart.tsx FlashList 등) — M3-1116-O 신규 에러 0

## push
- forced update: 4395377 → 03b80d8
