#359 APPROVE · C1 O · C2 O

---

## REQ 1 — C1: R-A1-APP 라운드 존재 · 순서 (앱 먼저 → 서버)

**O**

§2.1 S2 `"클라이언트 영향 0"` 삭제 확인. 대신:

> "클라이언트 영향 無 아님 — 앱 라운드 R-A1-APP 가 선행되어야 함"

§2.1 하단 선행 요건 블록에 대상 파일 3개 명시:
- `app/checkout/tender-cash/[draftOrderId].tsx:74–76` hard-throw 제거
- `app/checkout/split-tender/[draftOrderId].tsx:349` 2nd leg 동일
- 카드 결제 경로 (`tender-card/*`) 동일

§5 라운드 표에 R-A1-APP 행 신설 (45분 · pos-r0 fork · R-A1-1 선행 blocker).

순서 라인 (`plan:316`):
```
R-A1-0 → R-A1-APP (fork repo · 머지+배포) → R-A1-1 → ...
```
파일 겹침 표에도 "POS 앱 checkout 화면 (fork) | R-A1-APP | R-A1-1 선행" 행 추가 확인.

---

## REQ 2 — C2: 재조회 경로 실 존재 여부

**O**

§2.1 S2 (`plan:77`):
> `GET /admin/pos/receipts/:id` (실 엔드포인트 · pos-payments.ts:145 `useReceipt` 훅) 또는 `order.metadata.receipt_id` 재조회, 최대 5회 × 2초 (QRIS 흐름 `tender-qris/[draftOrderId].tsx:95–134` 동일 패턴)

잘못된 `GET /admin/pos/orders/:id/receipt` 완전 제거 확인.
R-A1-APP 라운드 본문(`plan:306`)에도 동일 경로 명시.

---

## REQ 3 — §4.4 · A2 원자성 · 번호 대응표

**§4.4 결정 4건** (`plan:277–288`): 전부 기입 확인.

| # | 대상 | 결정 |
|---|---|---|
| 1 | register_session | 4모델 기준 core/order_snapshot 2분할 · R-B2 60분 |
| 2 | payment_xendit 자격 | env 직접 읽기 · config.ts:11 포함 명시 |
| 3 | customer-display | POS 전용 유지 + `if (channel !== 'pos') return;` 가드 R-A1-0 추가 |
| 4 | workflows/pos-* | POS 전용 유지 · Wing 환불 요건 확정 뒤 재검토 |

**A2 위험 2건** (`plan:193–195`):
1. dual-write 원자성 — Medusa `transaction` helper + `orderModuleService.update` 명시
2. 기존 orders FK null 처리 — 3개 규칙 + legacy fixture 테스트 1개 필수 명시

**§3.3 step ↔ §5 라운드 번호 대응표** (`plan:182–190`): S1+S2→R-A2-S1 흡수 이유 포함 명시.

---

## REQ 4 — 판정

**APPROVE**

C1(앱 선행 라운드 R-A1-APP 신설·순서) · C2(엔드포인트 정정) 모두 반영 완료. §4.4 결정 4건·A2 원자성·null 처리 규칙·번호 대응표 기입 확인. 필수 수정 사항 없음.
