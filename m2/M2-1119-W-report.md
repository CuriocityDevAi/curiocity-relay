fork #207 · 슬립 데이터 단일 O · 머리글 동일 O · Ref 동일 O · 동일성 테스트 O · 버튼 wrap O(360/600/1024 추론) · CI 진행중

## 상세

- 브랜치: `fix/M2-1119-S-pos-slip-nextcustomer`
- 커밋 SHA: `c04ce340635c8e0c356a72429c620e3f06add400`
- origin/master 머지: OK (ort strategy, 4 files from master)
- tsc 신규 에러: 0
- vitest 전용 파일: 24/24 pass
- vitest 전체: 793 pass / 6 expected fail / 3 todo (1 failed = 사전존재 playwright config 이슈 `docs/plans/splitview-capture.spec.ts` · PR #203 유래 · M2-1119-W 무관)
- push: 성공 (579128c..c04ce34)
- PR URL: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/207
- CI runs: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44524334197 (CI) · https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/44524334326 (Lint)

## 변경 파일

- `lib/payment-slip.ts` — `logo_url` 필드 · `StoreSlipInfo` · `buildSlipData` 신설
- `components/receipt/PaymentSlipCard.tsx` — 로고 Image 렌더 · Ref 라벨 'Ref' 고정 (Xendit ID 분기 제거) · `buildSlipData` re-export
- `app/checkout/split-tender/[draftOrderId].tsx` — inline storeName=null 빌더 → `buildSlipData` + `quote.data.store`
- `components/payment/SuccessReceiptAnim.tsx` — `tenderToSlipData` 6번째 logo_url 인자 · 버튼 행 flex-1 → flexShrink:0 + flexWrap:'wrap'
- `__tests__/m2-1119-s-pos-slip-fixes.test.ts` — REQ 1-b/c/d 갱신 · REQ 1-e 동일성 추가 · REQ 3-new 버튼 wrap 추가 (총 24 테스트)

## 처리 대상
- REQ 1 (슬립 데이터 불일치): 완전 통일 — 양쪽 화면이 같은 `PaymentSlipData` 를 같은 소스(`quote.data.store` / `receipt.snapshot.store`)에서 생성
- REQ 2 (REQ 3 명칭 · 버튼 "..." 잘림): flex-1 제거 + flexWrap wrap → 360/600/1024 모두 최소 폭 확보, 좁으면 줄바꿈
