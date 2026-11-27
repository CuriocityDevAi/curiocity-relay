# M1-1127-H Report

PASS · PR #292 · feat/M1-1127-H-receipt-r2 → master · b6e0e66

## 테스트 수
- Vitest: 15/15 (신규) + 기존 통과 유지
- Node assertion script: 46/46

## 바이트 차이 요약
`renderReceiptEscPos(receipt)` 출력 변경:
- 금액 포맷: `IDR N,NNN` → `Rp N.NNN` (Intl 없음, 순수 regex)
- 헤더: `Order #<display_id>` 제거 → `pos_order_num` 있을 때만 `#N` 출력
- QRIS tender 도 Cash 와 동일 경로로 PB1/service 줄 렌더 (분기 삭제)
- 제어 코드: 방어적 `alignLeft()` 추가로 미세 차이 가능 — 텍스트 내용 동일

## 기술 선택

**권장안**: `lib/receipt-lines/` vendored 패키지 — `@storeport/receipt-lines` SHA 5c6754d 를 타입+화폐 포맷만 복사.
- 장점: 외부 dep 없이 순수 TS, Node assertion script 가 그대로 `esbuild-register` 로 실행 가능
- 트레이드오프: 업스트림 변경 시 수동 sync 필요

## PR 본문 3줄
1. `renderLinesEscPos(ReceiptLine[])` 순수 렌더러 — `resolveReceiptLines` 로 레이아웃 결정 일원화
2. `pos_order_num` → `#N` (없으면 생략); `order_display_id` 헤더 완전 제거
3. QRIS 세금줄 근인: `buildSnapshot` QRIS 분기에서 `tax.show=false` + 단가에 세금 포함 → 클라이언트 단 분기 삭제로 수정
