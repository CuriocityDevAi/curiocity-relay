PR #343 · refund route 758줄→441줄 · step 6 · 테스트 13(신규)+441(전체)

## 작업 요약 (M2-1117-U — W2 Refund Workflow 추출)

### PR
- #343: https://github.com/CuriocityDevAi/storeport/pull/343
- 브랜치: `refactor/M2-1117-U-refund-workflow`

### 변경 지표
- refund route: **758줄 → 441줄** (317줄 감소)
- 신설 workflow: `src/workflows/pos-refund/` — **6 step**
- 신규 테스트: **13개** (pos-refund-workflow.unit.spec.ts)
- 전체 테스트: **441 passes** (기존 428 + 신규 13)

### 신설 파일 (posRefundWorkflow)
1. `types.ts` — MatchedTender · QrisRefundMeta · I/O 타입
2. `utils.ts` — toNum · providerToMethod
3. `steps/compute-refund-amount.ts` — Step 1 · 환불 금액 계산 (S4 NET 얹을 위치 · REQ3)
4. `steps/execute-refunds.ts` — Step 2 · refundPaymentWorkflow 순차 실행
5. `steps/cancel-if-unshipped.ts` — Step 3 · 미출고 주문 cancel + reservation 소거
6. `steps/mint-receipt.ts` — Step 4 · 영수증 스냅샷 발행 (compensation: 삭제)
7. `steps/persist-refund-metadata.ts` — Step 5 · order.metadata.refund 기록
8. `steps/recover-loyalty.ts` — Step 6 · 포인트 자동 회수
9. `workflow.ts` — posRefundWorkflow
10. `index.ts` — 공개 API

### POS route 잔류 (전용 로직)
- PIN 체크 (CASH 포함 시 필수)
- QRIS preflight (all-or-nothing)
- Cash Movement (CASH 포션 1건 adjustment)
- 응답 조립

### 동작 불변 확인
- tsc 신규 에러 0 (기존 245개 그대로)
- 441 unit tests pass (pre-push hook 통과)
- 응답 JSON 구조 snapshot 2개 잠금

### 다음 단계
- S4 NET preview: `computeRefundAmountStep` 에 loyalty 빚 차감 로직 얹기
- Kyu 실기: Cash+QRIS 환불 1건 회귀 확인 필요
