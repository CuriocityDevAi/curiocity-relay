#189 APPROVE · #188 APPROVE

## #189 M3-1117-U — 담기·수량변경 3요청 → oneshot 1요청

**테스트**: 24 PASS (`m3-1117-u.test.ts`)
**tsc**: 신규 에러 0 (pre-existing만 존재)

| REQ | 결과 | 근거 |
|-----|------|------|
| 캐시 갱신 금액 일치 | ✅ | `mergeOneshotDraftOrder` `...serverDraft` spread → subtotal/tax_total/total 덮어쓰기, items merge |
| 삭제 기존 경로 유지 | ✅ | `useUpdateDraftOrderItem`: `quantity > 0` 조건으로 quantity:0은 3-req 경로 |
| 404/405/5xx 폴백 | ✅ | `isOneshotFallbackError` → `_oneshotFallback = true` → 3-req 자동 복귀. 400/422는 폴백 아님 |
| 연타 5회 수량 정확 | ✅ | `pendingVariantAdds` Map + `accQty` 누산 + catch-up oneshot update, 완료 후 `delete` |
| 낙관적 표시 유지 | ✅ | `onMutate` 낙관적 → oneshot 성공 시 `setQueryData`. `_oneshotUpdated` 플래그로 invalidation 스킵 |
| 손님 화면 동기화 훅 | ✅ | `setQueryData(['draft-order'])` 직접 갱신이므로 동일 key 구독 훅 최신 유지 |

## #188 M1-1117-R — 포인트 빚 있는 손님 사용 차단 UI

**테스트**: 7 PASS (`m1-1117-r-credit-block.test.ts`)
**tsc**: 신규 에러 0 (pre-existing만 존재)

| REQ | 결과 | 근거 |
|-----|------|------|
| 필드 있을 때만 차단 | ✅ | `shouldBlockRedeem(redeemBlocked === true)` — `true`일 때만 차단 |
| 없으면 현행 | ✅ | `undefined/false` → `false` → 비차단, 구버전 서버 호환 |
| 문구 | ✅ | `Math.round` 소수점 올림, `Rp X,XXX,XXX` 포맷, "refund" + "settled automatically" 포함 |
| tsc 신규 0 | ✅ | optional 필드 추가만, pre-existing 오류만 |
| 테스트 7 PASS | ✅ | shouldBlockRedeem(true/false/undefined) + formatRedeemBlockedMessage 금액 포맷 |
