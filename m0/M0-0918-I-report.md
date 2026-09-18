---
round: M0-0918-I
pr:
  design: storeport#125
outcome: pos-core-gap-design-doc-only
kyu_checks: 0
---

# M0-0918-I · POS 코어 갭 설계 보고서 (R042 · R023 · R021 · R040)

**일자**: 2026-09-18 · **허브**: M0 · **성격**: 설계 · Kyu 결정 요청 (코드 변경 zero).

---

## 0. 산출물

- **정본 문서**: `storeport/docs/plans/pos-core-gap-design.md` (PR #125).
- **relay 사본**: `m0/M0-0918-I-pos-core-gap-design.md` (본 커밋).

---

## 1. Kyu 결정 필요 항목 (3 개 이내 · 문서 §7)

### 1.1 라운드 1 착수 순서

- **제안**: 프로모션 배지 + 재고 배지 = **병렬 착지** (S 공수 둘 다 · 매장 즉시 효과).
- **대안**: 이행 코어화 (pickup_slot 실체) 를 먼저 · 케이크 예약 요구가 급하면.
- **M0 판단**: 매장 하루 흐름에서 결제·상품 우선 · 이행은 라운드 2 로.

### 1.2 결제 total=0 결함 해소 시점

- **제안**: **별건 hotfix M0-0919-Z 오늘 착지** (결제 blocker · 매출 zero 방지 · S 공수 1일).
- **대안**: 라운드 1 (M0-0919-A) 안에서 4 항목 함께.
- **M0 판단**: 별건 hotfix 권장 (blocker 는 격리 · 나머지 3 항목은 병렬 준비).

### 1.3 RMA (반품/교환/취소) 도입 시점

- **제안**: **라운드 2 (M0-0919-B)** 확정 · 관측 후 재판정.
- **대안**: 매장 실 반품 빈도가 예상보다 높으면 라운드 1 로 앞당김.
- **M0 판단**: 라운드 2 유지 · 1주 관측 후 재판정. cash_movement(refund) migration 이 필요해 hotfix 부적합.

---

## 2. 라운드 계획 요약 (문서 §5)

| 라운드 | 성격 | 무엇 | Kyu 실기 항목 |
|--------|------|------|--------------|
| **M0-0919-Z** (제안) | Hotfix | 결제 total=0 뿌리 fix (pos-complete query graph) | K1 (Card 결제 성공) · K2 (Orders Paid) |
| **M0-0919-A** | 굵직 · 결제·상품 | provider 매핑 · 프로모션 배지 · 재고 배지 | K3 (프로모션 할인 반영) · K4 (품절 회색) |
| **M0-0919-B** | 굵직 · 반품·픽업 | RMA · pickup_slot 실체 · 다중 draft | K5 (반품 · 서랍 -X) · K6 (예약 픽업) · K7 (복수 손님) |
| **M0-0919-C** | 굵직 · 고객·알림·Scan | 고객 검색 · WA 자동 알림 · Scan 실측 | K8 (단골 검색) · K9 (WA 자동) · K10 (Scan) |
| **M0-0919-D** | 소소 마감 | chip 완결 · 영어 잔여 · typography 강제 · 결제 완료 재설계 | K11~K14 |

**굵직 3 라운드 안**: M0-0919-A · B · C (M0-0919-Z hotfix 는 별건 앞당김).

---

## 3. 갭 12 도메인 요약 (문서 §1)

| 도메인 | 상태 |
|--------|------|
| 결제 | 부분 (컬렉션·캡처 있음 · 환불·provider 정식 없음 · total=0 결함) |
| 이행 | 부분 (fulfillment 있음 · pickup_slot 없음 · 배송 없음) |
| RMA | 없음 (반품·교환·클레임·취소 전량) |
| 재고 | 부분 (Stock Location 있음 · 재고 배지·조정 없음) |
| 프로모션 | 없음 (앱 UI zero) |
| 고객 | 우회 (POS placeholder · 검색·연결 zero) |
| 가격 목록 | 없음 (Admin 만 · 앱 안 넣음) |
| 판매 채널 | 있음 (POS 단일) |
| 드래프트 주문 | 부분 (단일 · 다중 없음) |
| 알림 | 부분 (WA 수동 복사 · 자동 발송 없음) |
| 세금 | 있음 (region 자동) |
| 기프트카드 | 없음 (Phase 2) |

---

## 4. 라운드 1 화면 설계 요약 (문서 §3)

| 항목 | 공수 | API |
|------|------|-----|
| 결제 total=0 fix | S (1일) | `query.graph({ entity: "order", fields: [...] })` |
| Payment provider 매핑 | S (반나절) | provider 3 등록 (`pp_system_cash/card/qris`) |
| 프로모션 배지 | M (2-3일) | `sdk.admin.promotion.list` · `applyPromotionsWorkflow` |
| 재고 배지 | S (1-2일) | `sdk.admin.inventoryItem.list` |

---

## 5. 결제 total=0 뿌리 (문서 §4)

- **위치**: `apps/commerce-core/src/api/admin/register-sessions/[id]/pos-complete/route.ts:113~181`
- **원인**: `orderModule.retrieveOrder` (module service) 는 raw column 만 반환 · `total` derived field 는 remote query 로만 계산.
- **수정**: `container.resolve(ContainerRegistrationKeys.QUERY).graph()` 로 대체 (옵션 A) + items 수동 합산 폴백 (옵션 B).
- **회귀 방지**: Not Paid 배지 재시도 액션 (M0-0918-E 착지본) 유지.

---

## 6. 오케 5순위 M0 재정렬 (문서 §6)

| 오케 순위 | 본 판단 | 근거 |
|-----------|---------|------|
| 1. 결제 provider 정식화 | 다음 (M0-0919-A 매핑 스텁 · 실 provider Phase 2) | K13 EDC 대기 |
| 2. 이행 코어 활용 | 라운드 2 | 케이크 픽업 = 반품과 같이 |
| 3. 프로모션 + 재고 배지 | **지금** (라운드 1) | 매일 · 손님 인지 |
| 4. RMA | 라운드 2 | 원장 보호 |
| 5. 고객 연결 | 라운드 3 | 후순위 |
| (+) Scan | 라운드 3 | 실측 후 개선 |

---

## 7. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| 코드 변경 zero | ✓ |
| 문서 단일 산출물 + relay 사본 | ✓ |
| Kyu 결정 3항 이내 | ✓ |
| relay push | ✓ |

---

## 8. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+1** | R042 설계 문서 착지 |
| **신설** | 0 | 새 REQ 없음 |
| **총 순증감** | **-1** | 병합 후 -1 |

---

## 9. 다음 게이트

1. **Kyu 결정 3항 회신** (§1) → 라운드 순서 확정.
2. **PR #125 병합** → 정본 등재.
3. **M0-0919-Z hotfix** 착수 (M0 제안 채택 시) → 결제 total=0 fix + Railway 배포.
4. **M0-0919-A** 착수 (결제 provider 매핑 · 프로모션 · 재고 배지).

---

*M0-0918-I · 2026-09-18 · 설계 보고서 · PR #125 · relay 사본 편입 · Kyu 결정 3항 · 코드 변경 zero*
