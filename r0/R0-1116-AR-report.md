#319 APPROVE · #318 REQUEST_CHANGES · #162 APPROVE

## storeport #319 — APPROVE
- 파서: `payment_details.receipt_id` 1순위, `rrn` 2순위, 추측 경로 없음 ✅
- captured 가드(`status !== "captured"`) 유지, 멱등/금액 검증 무변경, 필드 추가만 ✅
- 폴백 체인 `qris_receipt_id → xendit_payment_id → reference_no → paymentRequestId` 정확 ✅
- 레거시 `issuer_rrn`·`reference_no` 호환 유지 ✅
- unit 31/31, 전체 350/350 passed ✅

## storeport #318 — REQUEST_CHANGES
- ❌ icon.png IHDR color_type=6 (RGBA) — 알파 채널 있음, App Store/EAS 경고 대상
  - 수정: gen-icons.mjs magick 명령에 `-alpha off` 추가 후 재생성 필요
- ✅ SVG HP M 좌표 = POS M × 0.8 (수학 검증)
- ✅ #FFE58A = pastel.hero (tokens.ts:75), #3B2A1F = pastel.heroInk (tokens.ts:76)
- ✅ app.config.ts splash backgroundColor #FFE58A 적용
- ✅ 76px·60px 미리보기 "HP POINT" 판독 가능

## fork #162 — APPROVE
- ✅ SVG 좌표 명세 A안과 완전 일치
- ✅ #FFE58A = pastel.hero, #3B2A1F = pastel.heroInk (토큰 실제 값)
- ✅ icon.png color_type=2 (RGB) — 알파 없음
- ✅ app.json adaptiveIcon·splash backgroundColor #FFE58A 적용
- ✅ 76px M 판독 가능, assets 외 변경 없음
