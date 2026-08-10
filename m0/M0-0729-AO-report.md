# M0-0729-AO · POS 결제 정본 + Fulfillment 확정 (β 2/3)

**일자**: 2026-08-10 · **허브**: M0 storeport · **라운드**: AO (AN cash fix 후 결제수단 1단계 착지)

---

## Kyu 정본 반영

- 매장 실결제 = **Card/QRIS 대부분 · Cash 예외적** (기존 AK/AL "cash 만" 가정 뒤집힘)
- 단말기 조작은 캐시어가 별도 (앱은 승인번호만 입력 · 단말 통합은 EDC 2단계 별건)
- **Fulfillment 정본** (AN-3 심문 3답 채택):
  - Q1: **(a)** POS 판매 완료 시 즉시 자동 fulfilled
  - Q3: **(B)** 앱-트리거 endpoint (subscriber 우회)
  - Q2: **(나)** 반품 재고 수동 유지 (반품 flow 후순위)

---

## AO-1~4 착지 요약

### AO-1 · Checkout 결제수단 3택 (fork)

- Cash / Card / QRIS 3택 · 기본 = 현금 · Card/QRIS 는 승인번호(Invoice) 필수
- 단말기 조작은 앱 밖 (Kyu 정본 · 현행 유지)

### AO-2 · pos-complete 원자 endpoint (backend)

- `POST /admin/register-sessions/:id/pos-complete` · 신설
- 원자 실행: metadata 편입 → payment_collection 생성 → mark-as-paid → auto-fulfill → cash_movement (현금만)
- 원장에 "order 는 있는데 결제 기록 빈" 상태 종식

### AO-3 · by_payment_method 확장

- cash/card/qris 각 합계·건수 (기존 cash 폴백 승격)
- 시재 대조는 **cash 만** 반영 (비현금 = 서랍 무관)
- WA 텍스트 한글 라벨 + 건수: `- 현금: Rp 350,000 (1건)`

### AO-4 · Fulfillment 확정

- pos-complete 내부에서 `createOrderFulfillmentWorkflow` 실행 · `no_notification: true`
- Orders 화면 "Not fulfilled" → "Fulfilled" 즉시 전환
- 반품 flow 는 별건 (Q2=나 채택)

---

## AO-5 · EDC 2단계 조사 (조사만 · 구현 금지)

3옵션 조사 완료:

| 옵션 | 설명 | 난이도 | 실기 착지 |
|-----|------|--------|----------|
| A | 단말 직접 통신 (Serial/IP) | 상 | 2-4 주 · 매입사 SDK/NDA 필요 · Native module |
| B | 매입사 API 사후 대사 (T+1) | 중 | 1-2 주 · Client cert · IP whitelist |
| C | QRIS 표준 (BI/Aggregator) | 중하 | 1 주 · Xendit/Midtrans/Doku Aggregator 계약 |

**EDCAdapter 승격 방향**: `verifyInvoice(invoice_number, amount)` + `syncPeriodic(from, to)` 추상화. 현재 = NullAdapter (앱 입력만).

**심문**: 별도 게시 `m0/M0-0729-AO-inquiry.md` (Aggregator 선택 · 매입사 우선순위 · 옵션 채택).

---

## 착지 · 배포

### PR

- **[agilo-medusa-pos-fork]_PR#4** · Checkout UI + pos-complete 호출 · commit `64ff474`
- **[storeport]_PR#70** · pos-complete endpoint + by_payment_method 확장 · commit `a8e04e0` (lockfile fix 포함)
- **[storeport]_PR#71** · 원장 P1a-3 round5 · docs/m0-0729-ao-pos-payment

### 배포

- Railway `d43d180f-9e50-4836-90db-be1ac737d5ba` **SUCCESS** (2026-08-10 18:02) · `/health` 200 · pos-complete route 401 (auth 요구 확진)
- 이전 2배포 (`2347cd5a` · `9670c37d`) FAILED = `apps/commerce-core/pnpm-lock.yaml` 미갱신 원인 · 재생성 후 통과

### 검증

- TS: 0 errors (backend + fork)
- lint: 0 errors 0 warnings (fork)
- pos-complete endpoint 라우팅 확진 (401 = auth 요구 · 404 아님)

---

## Kyu 통합 실기 요지 (self-contained)

**전제**: fork `feat/m0-0729-ao-payment-methods` (`64ff474` 이상) + 백엔드 `d43d180f` 이상 SUCCESS

**Mac**:

```
cd ~/projects/agilo-medusa-pos-fork
git fetch origin && git checkout feat/m0-0729-ao-payment-methods && git pull
npm ci
npx expo start --tunnel --clear
```

**폰 관통 (3-way sequence)**:

1. Login → 개점 (500,000)
2. 판매 1 · **현금** (AN 회귀) → Fulfilled 확인
3. 판매 2 · **카드** + 승인번호 `TEST-CARD-001` → Fulfilled
4. 판매 3 · **QRIS** + 승인번호 `TEST-QRIS-001` → Fulfilled
5. 수금 100k (아내)
6. 마감 → Expected = 개점 + **현금매출만** − pickup
7. Z Report → 3 결제수단별 라인 정합 · 건수 표기
8. [WA 복사] → 그룹 붙여넣기 · 정합 확인

**게이트**: 8단계 순차 통과 = AO 실기 승인.

**상세**: 스토어포트 리포 `docs/plans/P1a-3-register-report-round5.md` §6

---

## 이연 순증감

### 해소 (+4)

- 결제수단 = cash 전용 → 3택
- payment_collection 미생성 → pos-complete 편입
- payment status 빈 상태 → mark-as-paid 편입
- fulfillment 미확정 → auto-fulfill 편입

### 정본화 (+1)

- fulfillment 정책 심문 (AN-3) → Kyu 3답 채택

### 신설 (+2)

- **[별건 · 조사만]** EDC 2단계 통합 옵션 A/B/C
- **[별건]** 반품 flow (Q2=나 채택 · 구현 후순위)

### 유지 (5)

1. Subscriber `order.placed` 뿌리 규명 (실 로그: **`Processing order.placed which has 1 subscribers`** 실은 발화 중 · 재조사 별건)
2. Z snapshot `session.closed_at=null`
3. Anchor Tauri CI (pre-existing)
4. Maestro CLI 로컬/CI
5. Kyu 매장 상품명 실측 e2e

### 순증감

- 해소 4 + 정본화 1 − 신설 2 = **-3 (실질 감소)** · 유지 5 그대로

---

## 회부

- **fix PR (fork)**: [agilo-medusa-pos-fork]_PR#4
- **fix PR (backend)**: [storeport]_PR#70
- **원장 PR**: [storeport]_PR#71
- **relay 심문 (별도)**: `m0/M0-0729-AO-inquiry.md`
- **다음 게이트**: Kyu 통합 실기 통과 → AO 종결 · AP (β 3/3 · 사장 뷰) 착수 심문 회신 대기

---

*M0-0729-AO · 2026-08-10*
