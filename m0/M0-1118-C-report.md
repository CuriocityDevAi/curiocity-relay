PR #359 · C1 앱 라운드 삽입 · C2 정정 · §4.4 기입 · 라운드 12개

---

## 요약

M0-1118-C — R0-1118-E CHANGES (C1 · C2 필수 + R1 · R2 권장) 및 §4.4 애매 4건 결정(오케)을
`docs/plans/pos-finish-shared.md`(PR #359) 에 반영. **문서 only**. 코드·테스트 변경 無.
diff = +79 -28 (107 lines touched / total 383 lines).

---

## 적용 상세

### C1 (필수) — R-A1-APP 신설 + §S2 "클라이언트 영향 0" 삭제
- **§2.1 S2 행 교체**: "클라이언트 영향 0" 삭제 → "**클라이언트 영향 無 아님** — 앱 라운드 R-A1-APP 가 선행되어야 함".
- **§2.1 하단 "선행 요건" 블록 신설**:
  - `app/checkout/tender-cash/[draftOrderId].tsx:74–76` hard-throw 제거.
  - `app/checkout/split-tender/[draftOrderId].tsx:349` 2nd leg 동일.
  - 카드 결제 경로 (`tender-card/*` 또는 등가) 동일.
  - JS 만이면 Expo dev-refresh · 네이티브 번들 변경 없으면 EAS 아님.
- **§5 라운드 표**: `R-A1-APP` 신설 (45분 · pos-r0 fork repo · R-A1-1 선행 blocker).
- **순서 라인**: `R-A1-0 → R-A1-APP (fork repo · 머지+배포) → R-A1-1 → ...`.
- **파일 겹침 표**: "POS 앱 checkout 화면 (fork) | R-A1-APP | R-A1-1 선행" 행 추가.
- **총 12 라운드** (기존 11 + R-A1-APP).

### C2 (필수) — §S2 polling 엔드포인트 정정
- 잘못된 `GET /admin/pos/orders/:id/receipt` 삭제.
- 실 엔드포인트 `GET /admin/pos/receipts/:id` (pos-payments.ts:145 `useReceipt` 훅) 로 교체.
- 대안 `order.metadata.receipt_id` 재조회도 명시.
- QRIS 흐름 `tender-qris/[draftOrderId].tsx:95–134` 패턴 동일 (5회 × 2초).

### R1 — §3.2 metadata 표 보강
- 2개 키 추가:
  - `metadata.register_session_id` (string · 교대 식별 · tenders/route.ts:563)
  - `metadata.pos_totals` (object · POS 측 합계 스냅샷 · tenders/route.ts:573)
- 개수 근거: order-level 11개 (order_type + register_session_id + pos_totals + preorder.* 8개) + line_item.lettering_text 1개 per item.
- R0-1118-E 사실 불일치 #1 명시.

### R2 + §4.4 — 애매 4건 결정 확정 (오케 그대로 기입)
- **애매 #1 register_session**: 4-모델 기준 재정의. `register_session/core` (교대·현금·`customer-display-device` · POS 전용) + `register_session/order_snapshot` (공용). R-B2 **60분** 또는 R-B2a/R-B2b 2라운드 분할 (각 30분).
- **애매 #2 payment_xendit 자격**: env 직접 읽기로 이동 (`payment_xendit/lib/config.ts`). pos_settings 는 Admin UI 표시 전용. R-B1 scope **`config.ts:11` 포함 명시** (4건 fix).
- **애매 #3 customer-display**: POS 전용 유지. `order-snapshot-paid.ts` 에 채널 가드 신규 `if (channel !== 'pos') return;` (R-A1-0 에서 추가).
- **애매 #4 workflows/pos-***: POS 전용 유지. Wing 환불 요건 확정 뒤 재검토 (Phase Wing).
- 실제 파일 수 교정: `register_session/**` = 18 파일 (4 모델), `workflows/pos-*/**` = 43 파일 (R0-1118-E 사실 불일치 #3·#4 반영).

### A2 위험 2건 추가 (§3.3)
1. **dual-write 원자성**: `PickupSlotService.createReservation/markDeposit/markPaidFull` 가 DB row + `order.metadata.preorder.*` 를 한 트랜잭션에 커밋 또는 compensation 규칙 명시. metadata 가 POS 앱 SoT 이므로 "row 성공 + metadata 미갱신" 상태가 더 위험. 구현: Medusa `transaction` helper + 같은 트랜잭션에 참여하는 `orderModuleService.update`.
2. **기존 orders FK null 처리**: 조회 시 FK null = legacy row = metadata-only 로 취급 · 환불·취소 시 row 없으면 metadata 만 전이 · S4 가용성 집계는 row 기반 + legacy metadata 기반 별도 집계 후 합산. legacy fixture 테스트 1개 필수.

### R-A1-0 보강
- (a) subscriber 가드 확인 명시: `register-session-order-attribution.ts:43` `if (!session) return;` 확인됨 · `loyalty-earn-on-paid.ts` 는 try/catch 로 흡수.
- (b) `order-snapshot-paid.ts` **채널 가드 없음 → 가드 신규 추가** `if (channel !== 'pos') return;` (R0-1118-E REQ 1a).
- (c) 테스트 1개 추가 (`metadata.channel='wing_online'` 시 3개 subscriber 모두 skip).

### §3.3 ↔ §5 대응표 (R0-1118-E REQ 5 명칭 불일치 반영)
- §3.3 S1 + S2 → §5 R-A2-S1 **흡수** (모델 없이 서비스 테스트 불가 이유 명시).
- §3.3 S3 → R-A2-S3 · S4 → R-A2-S4 · S5 → R-A2-S5.

### 기타
- 파일 헤더에 M0-1118-C 갱신 날짜·리뷰 레퍼런스 추가.
- §5 헤더 "각 30~45분" → "각 30~60분" (R-B2 60분 반영).
- §8 다음 단계: 애매 4건 결정 체크 완료 · R-A1-APP → R-A1-1 순서 엄수 명시.
- §9 변경 이력 섹션 신설 (M0-1118-B 신설 + M0-1118-C 갱신 요약).

---

## 커밋·푸시 대기

- 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/hub-m0`
- 브랜치: `docs/M0-1118-B-pos-finish-plan` (PR #359)
- staged: 無 (수정만 완료, add·commit 미실행)
- 사용자 승인 대기 — 머지 금지.

## 라운드 집계 (PR #359 반영 후)

총 **12 라운드**:
1. R-B0 · R-B1 · R-B2 (또는 R-B2a + R-B2b) · R-B3 — 폴더 경계 1차
2. R-A1-0 → R-A1-APP (fork) → R-A1-1 → R-A1-2 — A1 결제 뒤처리
3. R-A2-S1 → R-A2-S3 → R-A2-S4 → R-A2-S5 — A2 픽업·선주문

파일 겹침: `tenders/route.ts` (A1-1 → A2-S3 → A2-S5) · `xendit/route.ts` (A1-1 → A1-2) · POS 앱 (R-A1-APP → 서버 R-A1-1).
