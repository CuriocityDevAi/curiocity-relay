# M0-1105-BQ — 리포트 (QRIS × split · 환불 실패 재시도 · 계획서)

**status**: done · docs-only
**head SHA**: 7c412b55df323d95533d53bdcfc16267e4cce197
**branch**: docs/m0-1105-bq-qris-split-refund-plan (base: main)
**PR**: https://github.com/CuriocityDevAi/storeport/pull/246 (draft · docs-only)

## 변경 파일

- `docs/plans/qris-split-refund-plan.md` (신규 · 344 lines)

## 자기 검증

```
git diff --stat origin/main
 docs/plans/qris-split-refund-plan.md | 344 +++++++++++++++++++++++++++++++
 1 file changed, 344 insertions(+)
```

docs-only 1파일 확정. 코드/테스트/스크립트/워크플로 변경 0건.

## 라운드 수

- **총 4 라운드** · R1·R2·R3 필수 + R4 선택
- 의존: R1(서버 split 가드 해제) → R2(refund-retry 확장) → R3(앱 UI) → R4(운영 알림)
- 각 30~45 min 단위 · 각 PR 1건

## 열린 질문 (Kyu 결정 필요 · 권장안 전부 닫음)

1. Q1 1차 QRIS PENDING 중 2차 tender → **409 거부** 권장
2. Q2 split 양쪽 QRIS **허용** 권장
3. Q3 늦은 Xendit SUCCEEDED 대응 — **자동 교정 금지 · 로그만** 권장
4. Q4 cash_fallback 뒤 영수증 kind — **기존 helper 유지** 권장
5. Q5 7일 window 임박 알림 — **R4 cron 별도** 권장
6. Q6 실패 tender count 보정 — **처음부터 제외** 권장
7. Q7 split 한쪽 QRIS 7일 초과 — **다른 몫만 환불 허용** (기존 동작 그대로) 권장

## 주요 설계 결정 (요약)

- **가드 해제 전략**: `tenders/route.ts:384-397` 의 `qris_split_not_supported` 를 조건부로 풀되, "1차 QRIS PENDING 중 2차 요청" 은 신규 코드 `qris_pending_cannot_split_next` 로 차단 → remaining 흔들림 원천 봉쇄
- **이중환불 가드 3중**: pre-check(`withOrderLock` + metadata 재load) + webhook SUCCEEDED 후처리 dedup + Xendit reference_id unique
- **`/refund-retry` mode 분기**: `retry` (기존 A안 보강 · QRIS 는 `tryXenditRefund` 실호출 추가) + `cash_fallback` (매니저 PIN + Cash Movement -amount · 신규)
- **영수증 kind**: `resolveRefundReceiptKind` 재사용 (M0-1105-BP) · cash_fallback 도 금액 정합 기준 그대로

## 테스트 모드 제약

- Xendit 라이브 승격 전이므로 R1/R2 QC 는 전부 sandbox simulate (`PaymentRequest.simulatePayment` · 기존 `pos-qris-simulate.spec.ts` 패턴)
- 실제 돈 검증은 Xendit 라이브 승격 후 Kyu 수기 실기 (별도 세션)

## 참고 리뷰 포인트

- `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:364-397` — split 가드 + metadata.tenders SoT
- `apps/commerce-core/src/api/admin/pos/orders/[id]/refund-retry/route.ts:69-71, 163-172, 252-275` — A안 S3 + QRIS 미처리 지점
- `apps/commerce-core/src/api/hooks/payment/xendit/route.ts:503-634` — refund webhook · `qris_refund_failed` 세팅
- `apps/commerce-core/src/api/admin/pos/_shared/xendit-refund.ts:30-80` — 7일 window + partial 미지원 발급사 분기
- `apps/commerce-core/src/modules/receipt/service.ts:40-58` — resolveRefundReceiptKind
