---
round: M3-1105-U
pr:
  fork: agilo-medusa-pos-fork#65 (draft · head 25f3810 · base master 14a7e53)
commits:
  - 25f3810 docs(m3-1105-u): Fulfill 시트 + Delivery 활성 §0 계획서 (코드 0 · 플랜 전용)
base: master 14a7e53 (#62 M3-1105-P/S/T 머지됨)
outcome: §0 계획서만. 코드 0. 신규 파일 1건 (docs/M3-1105-U-plan.md · 406 lines). Draft PR #65 본문 = 플랜 전문. Kyu 결정 질문 3건 노출 (Q1 배송지 수집 시점 · Q2 Delivery 필수 필드 · Q3 1단계 vs 2단계).
kyu_checks: 3 (Q1·Q2·Q3 결정) — 코딩 라운드 (M3-1105-V 후보) 착수 전 필수.
---

# M3-1105-U · Fulfill 시트 + Delivery 활성 §0 계획서

**일자**: 2026-11-09 · **허브**: M3 · **성격**: 큰 라운드 — 계획 승인 후 코딩. 이번 라운드는 플랜 PR 1건만 제출.

---

## §0 산출물

- **Draft PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/65
- **브랜치**: `feat/m3-1105-u-fulfill-plan` (base `master 14a7e53`)
- **커밋**: 1건 (`25f3810` · 406줄 신규 · `docs/M3-1105-U-plan.md` 한 파일)
- **코드 변경**: **0 건** (fulfill/UI/hook/fixture 전부 미수정 — 승인 후 코딩 라운드에서 착수)

---

## §1 PR 본문 요약 (4섹션)

1. **§1 대사표**: 서버 #200 fulfill shape (body `{stage, method, courier, driver, contact, tracking_ref, note}` · 응답 `{ok, order_type, stage, method, fulfillment_id, inventory_decremented, reservations_released, completed, inventory_warning}`) + Fulfill 버튼 노출 규칙 표 (takeaway Hand over 유지 · preorder paid_full/delivery awaiting_dispatch 는 시트 · dp_paid 숨김 + 서버 400 가드) + 코어/우회/신규 매핑 12건.
2. **§2 화면 스케치 2건**: Pickup 탭 (note 만 선택) · Delivery 탭 (courier 필수 · driver/contact/tracking_ref/note 선택 · 검정 Fulfill 1개). 성공 뒤 상태 배지 (Fulfilled + Completed / Dispatched).
3. **§3 Checkout Delivery 칩 활성**: 현행 `components/payment/OrderTypePicker.tsx:14` `disabled:true` 제거 → 결제 → `awaiting_dispatch` → Fulfill 시트 → `dispatched`. **Kyu 결정 질문 3건** (§2 참조).
4. **§4 Fixture 3종** (pickup 200 · delivery 200 · dp_paid 400) + **어설션 12건 계획** (`scripts/m3-1105-u-fulfill-assertions.mjs` 후속 라운드) + **건드릴 파일 12건** (주인 M3 · 금지 영역 명시).

---

## §2 Kyu 결정 질문 (3건)

### Q1 — 배송지/연락처 수집 시점 ⭐ (가장 큰 결정 · UX 분기)

Delivery 주문의 **배송지(주소) + 받는 사람 연락처**를 어느 시점에 받을까?

- **A. 결제 때** (Checkout 에 Shipping 단계 추가 · 주소 필수) — ⭐ **권장**
  - 운영 현실: 손님이 매장에 있을 때 받아야 안전. 영수증 주소 인쇄 가능. 서버 표준 `shipping_address` 활용.
- **B. Fulfill 때** (Checkout 안 받음 · Fulfill 시트에 "Ship to" 섹션)
  - UX 짧음 · 포장 직전 최종 주소 확정 가능. 단점: 손님 떠난 뒤 재확인 부담.
- **C. 둘 다** (결제 수집 + Fulfill 시트 prefill 수정 허용)
  - 가장 안전하되 저장 지점 2개 (shipping_address vs metadata.delivery.ship_to) 모호.

**A 선택 시**: Checkout 플로우 단계 1개 추가 → 선행 라운드 가능 (M3-1105-V = Shipping 스텝).
**B 선택 시**: FulfillSheet 에 주소/연락처 폼 추가 (§2.2 와이어에 "Ship to" 섹션 신설).
**C 선택 시**: 양쪽 다 구현 + 단일 진실원 결정 (shipping_address 로 통일 권장).

### Q2 — Delivery Fulfill 시트 필수 필드

택배사·기사·연락처·운송장·메모 중 Fulfill 버튼 활성 조건?

- **A. 택배사만 필수** (나머지 선택) — ⭐ **권장**. 운송장은 1~2일 뒤 받는 운영 많음.
- **B. 택배사 + 운송장 필수**. 추적 가능성 강제.
- **C. 전부 선택** (Fulfill 항상 활성). 가장 느슨.

### Q3 — Delivery Fulfill = 1단계 (즉시 Completed) vs 2단계 (Dispatched → Delivered)

- **A. 1단계** (Fulfill 즉시 재고 차감 + completed) — ⭐ **권장**. 서버 M0-T #200 shape 그대로. 2단계는 Admin 보정 범위.
- **B. 2단계** (Fulfill = dispatched · 별도 Delivered 버튼 뒤 completed). 서버 계약 확장 필요 → M0 라운드 재개.

---

## §3 승인 뒤 예상 코딩 라운드 범위 (M3-1105-V 후보 · 본 라운드 外)

**파일 12건 + 어설션 12건 + fixture 3건** (PR #65 §4.2·§4.3 참조). 주요:

- `components/orders/FulfillSheet.tsx` (신규 · BottomSheet + 2탭 + 폼 + 검정 Fulfill 버튼)
- `components/payment/OrderTypePicker.tsx` — `disabled:true` 제거 · "Coming soon" 서브라벨 제거
- `components/orders/OrderTypeChip.tsx` — `delivery.stage` (`awaiting_dispatch` / `dispatched`) 배지 분기
- `app/orders/[orderId].tsx` — showFulfillSheet 분기 (`showHandOver` 를 `takeaway paid` 단일 조건으로 축소 · 나머지는 시트)
- `api/hooks/pos-payments.ts` — `PosFulfillResponse` 확장 (`method · inventory_decremented · reservations_released · completed · inventory_warning`) · `useFulfillOrder` input 에 `method/courier/driver/contact/tracking_ref/note` 수용
- `fixtures/pos-fulfill-{pickup,delivery}-response.json` · `fixtures/pos-fulfill-dp-paid-400.json`
- `scripts/m3-1105-u-fulfill-assertions.mjs` (U1~U12)

**금지 영역**: `lib/printer/*` · `lib/receipt-layout.ts` · `app/_layout.tsx` · `components/shift/ShiftCloseGate*` · `api/hooks/pos-orders.ts useHandOver` · storeport 서버.

---

## §4 push 완료 증빙

```
$ git log --oneline -3
25f3810 (HEAD, origin/feat/m3-1105-u-fulfill-plan) docs(m3-1105-u): Fulfill 시트 + Delivery 활성 §0 계획서
14a7e53 (origin/master) feat(m3-1105-p): tender Cash/Card/QRIS 탭 + EDC 시트 + Hand over 토스트 영문화 (#62)
6375e05 fix(shift-gate): sticky closingShift latch (#64)

$ git push -u origin feat/m3-1105-u-fulfill-plan
  * [new branch]      feat/m3-1105-u-fulfill-plan -> feat/m3-1105-u-fulfill-plan
  branch 'feat/m3-1105-u-fulfill-plan' set up to track 'origin/feat/m3-1105-u-fulfill-plan'.

$ gh pr create --draft ... → https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/65
```

---

## §5 다음

- Kyu Q1·Q2·Q3 결정 (슬랙/댓글) → 플랜 PR #65 본문에 결정 반영 (필요 시 commit amend 또는 신규 revision 커밋) → **draft 상태 해제 + 머지** → 코딩 라운드 (M3-1105-V) 신청.
- Q1=A 선택 시 Checkout Shipping 스텝 스펙 1장 추가 (이 역시 플랜 PR 범위로 흡수 가능).
- 서버 #200 배포 확인 (storeport M0-1105-T 끝 뒤 R0 → 배포) 은 코딩 라운드 착수 전 전제.

---

## §6 원장 정리

- `open-requirements.md:55` "M3: Fulfill 시트(Pickup/Delivery · fixture) · Delivery 칩 활성" — **§0 계획서 제출 완료**. 코딩 라운드 대기.
- M3-1105-S 체크 4건 유지 (M3-1105-T 보고서와 동일 · 본 라운드 UI 미변경).
