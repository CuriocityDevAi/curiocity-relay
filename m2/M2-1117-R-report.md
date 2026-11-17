PR #339 · 유효 잔액 · 서버 가드 · 테스트 7

## 구현 요약

**receipt-preview.ts**
- `ReceiptPreviewInput.negative_balance?` 추가 (optional, 하위 호환)
- `ReceiptPreview.negative_balance` + `redeem_blocked` 반환 필드 추가
- `effectiveBalance = max(0, creditBalance − negativeBalance)` 계산
- `creditUsed` 상한을 `creditBalance` → `effectiveBalance` 로 교체 (서버 가드)

**loyalty-info/route.ts (기존 조회 1곳)**
- `LOYALTY_NEGATIVE_MODULE.getBalance(customer_id)` 조회
- 응답에 `negative_balance` · `redeem_blocked` · `available_use` 추가

**테스트 7건 (receipt-preview-negative.unit.spec.ts)**
1. 잔액 10k · 빚 15k → creditUsed=0 · redeem_blocked=true (§6 시나리오 5)
2. 잔액 15k · 빚 5k · 10k 요청 → 사용 10k (부분 사용)
3. 잔액 15k · 빚 5k · 12k 요청 → cap 10k (effective_balance 초과 cap)
4. negative_balance 미지정 → 기존 동작 그대로 (회귀)
5. negative_balance=0 명시 → 기존 동작 그대로 (회귀)
6. loyalty disabled → creditUsed=0 (settings guard 우선)
7. 잔액 = 빚 (5k = 5k) → effective_balance=0 → 차단

전체 테스트: 407건 통과 · 스냅샷 12건 무결
