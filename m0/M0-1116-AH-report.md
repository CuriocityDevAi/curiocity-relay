# M0-1116-AH — 영수증 QRIS "Ref" 를 손님 결제앱 거래번호로 (진단 + 서버 수정)

**판정**: 지금 영수증 "Ref …4zi5fz3o" / "…fjqv4ssd" 는 **우리가 생성한 내부 `reference_id`** (= Xendit `/v3/payment_requests` 호출 시 보낸 멱등 키 · 형식 `<orderId>:<tenderSeq>:<nonce>`) 의 마지막 8자 꼬리. **손님 결제앱 거래번호 아님** — 바꿀 값 = Xendit paid webhook 에서 받아오는 **QRIS acquirer RRN** (없을 때만 Xendit payment id 로 폴백 · 라벨 다르게).

---

## 브랜치 / 범위

- 브랜치: `feat/m0-1116-ah-qris-rrn` (origin/main 기점 · 로컬 · **커밋/푸시 없음**)
- 워크트리: `/Users/kyu.lee/projects/storeport`
- 상태: 로컬 변경 · 커밋 전 · 사용자 검토 대기

## 변경 파일 (223+/3- · stat)

```
apps/commerce-core/src/api/hooks/payment/xendit/route.ts            | +35
apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts        | +85
apps/commerce-core/src/modules/payment_xendit/__tests__/qris-xendit.unit.spec.ts | +100
apps/commerce-core/src/modules/receipt/service.ts                   |  +6
```

---

## 1. 진단 (파일:줄)

### 1-a. 영수증 "Ref" 가 지금 들어가는 경로 (writer → reader)

**Writer 1 · 최초 기록** — `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts:995`
```ts
reference_no: (sData.reference_id as string) ?? null,
```
- `sData.reference_id` = 우리가 `buildReferenceId(orderId, tenderSeq)` 로 만든 **내부 멱등 키**
  (`apps/commerce-core/src/modules/payment_xendit/lib/xendit-client.ts:buildReferenceId`).
- Xendit 측에는 `/v3/payment_requests` 호출의 `reference_id` 로 전달되지만, 이 값은 **손님 결제앱이나 Xendit 대시보드에서 찾기용 외부 참조 번호가 아님** — 그냥 우리 계층 식별자.

**Writer 2 · 폴백** — `apps/commerce-core/src/api/hooks/payment/xendit/route.ts:685-686`
```ts
base.reference_no =
  t?.reference_no ?? parsed.paymentRequestId ?? null;
```
- `parsed.paymentRequestId` = Xendit 의 `payment_request_id` (예: `pr-xxx`) · 역시 **손님이 보는 번호 아님**.

**Reader (영수증 snapshot 데이터 모델)** — `apps/commerce-core/src/modules/receipt/service.ts:89-96`
```ts
{ method: "qris"; amount; issuer?; issuer_rrn?; reference_no?; at?; }
```
- Ref 라인 소스 = `reference_no`.

**실기 리포에서 "Ref" 를 글자 그대로 출력하는 renderer 는 storeport repo 안에서 발견되지 않음.**
- Anchor 의 `apps/anchor/src/utils/pos/receipt/index.ts` 가 만드는 ESC/POS 텍스트는 단일
  `paymentMethod` 라인만 찍고, per-tender ref 라인 없음. customer-display 의 `ReceiptScreen.tsx`
  도 method badge 1개만. Ref/RRN 분리 라인 포맷 (`QRIS BRI RRN ... Ref ...`) 은
  `docs/plans/M0-1104-J-payment-core-plan.md:146` 에 **설계로만** 명시 · **구현은 아직 없음**.
- 따라서 Kyu 가 실기 영수증에서 "Ref …4zi5fz3o" 를 봤다면 **그 renderer 는 (a) 이 repo 외부
  (별도 printer service · Tauri Rust command 등) 거나, (b) 다른 트랙에서 WIP 로 추가됐거나,
  (c) snapshot JSON 을 직접 본 것**. 서버 사이드 **snapshot 의 `reference_no` 값을 바꾸면
  어느 renderer 든 올바른 값을 받는다** — 그래서 이번 PR 은 webhook + snapshot 만 다룬다.
- **후속 필요 (별도 티켓)**: Ref/RRN 두 라인 분리 포맷을 실제 영수증 renderer 에 구현
  (docs/plans/M0-1104-J-payment-core-plan.md:146 설계 반영). 전체 표시·잘라쓰기 금지 요구는
  renderer 소관 — 이 PR 에서는 **값만 전달**.

### 1-b. "…4zi5fz3o" 정체

- 길이·꼴 상 `buildReferenceId` 의 nonce 꼬리 (현재 ≥6자 · nanoid-like) · **8자 꼬리로 보이는
  건 renderer 가 뒤 8자만 잘라 쓴 결과** 로 추정 (renderer 를 찾지 못해 확증은 불가).
- GoPay/OVO/은행앱 또는 Xendit 대시보드에서 이 꼬리로 거래를 찾을 **수 없음** — 외부 번호 아님.

---

## 2. Xendit QRIS 표준 거래번호 (확인 + TODO)

### 2-a. 현재 webhook parser 가 보는 필드 (`payment_xendit/lib/webhook.ts:30-44` 기존)

```ts
data: { payment_request_id, payment_id, id, status, request_amount, amount,
         reference_id, refund_id, failure_code, channel_properties: { expires_at } }
```
→ **acquirer-측 거래번호 필드 전무.** paid 이벤트 처리 시 손님 결제앱 번호를 기록할 수 없음.

### 2-b. Xendit v3 `payment.capture` payload 내 RRN 후보 경로 (문서 + 공식 샘플 기준)

Xendit v3 의 `payment.capture` (QRIS 1-step) payload 에는 발급사/버전에 따라 다음 경로 중
하나로 acquirer RRN 또는 동등 거래번호가 노출된다 (문서 기준 알려진 후보). **정확한 필드명은
sandbox 응답으로 확정 필요** — fixture 가 repo 에 없어 실측 미완.

| 후보 경로                                               | 의미                                   |
| ------------------------------------------------------- | -------------------------------------- |
| `data.channel_properties.rrn`                           | acquirer RRN (12자리 수준 · 가장 흔함) |
| `data.channel_properties.reference_id`                  | 동 (일부 버전)                         |
| `data.channel_properties.qr_reference_id`               | QRIS 전용 레퍼런스                     |
| `data.payment_details.rrn`                              | 발급사 블록                            |
| `data.payment_details.reference_id`                     | 동                                     |
| `data.payment_method.qr_code.channel_properties.rrn`    | nested (일부 버전)                     |
| `data.payment_method.qr_code.channel_properties.reference_id`         |                                        |
| `data.payment_method.qr_code.channel_properties.qr_reference_id`      |                                        |

**필드명 확정 TODO (사용자 후속)**:
- Xendit dashboard → QRIS 샘플 paid webhook payload 캡처 · 어느 키에 RRN 이 오는지 확정.
- 또는 `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-simulate/route.ts` 를
  sandbox simulate 와 함께 호출해 실수신 fixture 획득 (실 Xendit live 호출 없이 sandbox 범위).
- 확정되면 `webhook.ts` 의 `rrnCandidates` 배열에서 불필요 경로 제거 · 단일 경로로 좁힘.

### 2-c. Xendit payment id (RRN 부재 시 폴백)

- `data.payment_id` 를 primary · `data.payment_method.id` 를 폴백으로 추출.
- 값 존재 시 영수증 Ref 라인에 **"Xendit ID" 라벨** 로 전환 (renderer 가 분기 필요 — 2-d).

### 2-d. 영수증 Ref 라벨 전환 (renderer 측 후속)

- 이 PR 의 snapshot tender 는 **3개 필드** 를 모두 유지:
  `qris_rrn` · `xendit_payment_id` · `reference_no` (기존 호환 · 세 값 중 1개가 담긴다).
- renderer (별도 PR 필요) 권고:
  1. `qris_rrn` 값 있음 → `Ref <qris_rrn>` **전체** · 길면 줄바꿈 (잘라쓰기 금지).
  2. 없고 `xendit_payment_id` 있음 → `Xendit ID <xendit_payment_id>` **전체**.
  3. 그 외 → `Ref <reference_no>` (기존 동작).

---

## 3. 수정 (서버 · 로컬 적용 · 커밋 없음)

### 3-a. `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts` (+85)

- `XenditWebhookEvent.data` 타입에 `channel_properties` · `payment_details` · `payment_method`
  nested 를 받도록 확장 (알려진 RRN 후보 경로 전부).
- `ParsedWebhook` 의 paid-계열 variant 에 `qrisRrn: string | null` · `xenditPaymentId: string | null` 추가.
- `parseWebhookEvent` 가 2-b 후보 경로를 순차 검사 → 첫 번째 non-empty string 을 `qrisRrn` 로 채택.
- `payment_id` / `payment_method.id` 중 존재하는 값으로 `xenditPaymentId` 채택.
- refund-계열 변동 없음.

### 3-b. `apps/commerce-core/src/api/hooks/payment/xendit/route.ts` (+35)

- **metadata.tenders patch** (lines 572 블록 · paid 분기 내) — captured 전환 시
  `qris_rrn` · `xendit_payment_id` 두 필드를 이번 webhook 값으로 세팅 (기존 값 보존).
- **receipt snapshot tenderList builder** (lines 683 블록) — QRIS tender 를
  `{ ...issuer, qris_rrn, xendit_payment_id, reference_no (= rrn ?? paymentId ?? 기존), at }`
  구성으로 변경. 기존 renderer 가 `reference_no` 만 읽어도 **이제 그 값이 RRN** 이 됨.
- 폴백 (metadata.tenders 미기록 · 단일 QRIS 레거시) 도 같은 3필드 구성.

### 3-c. `apps/commerce-core/src/modules/receipt/service.ts` (+6)

- `TenderForReceipt` 의 QRIS variant 에 `qris_rrn?: string | null` · `xendit_payment_id?: string | null` 타입 추가.
  (기존 `issuer_rrn` · `reference_no` 는 호환 유지.)

### 3-d. 테스트 — `apps/commerce-core/src/modules/payment_xendit/__tests__/qris-xendit.unit.spec.ts` (+100)

새 describe 블록 "M0-1116-AH · QRIS RRN · Xendit payment id 추출" 5 케이스:

- `channel_properties.rrn` 경로 → `qrisRrn` 채택 · `xenditPaymentId` 는 `payment_id`.
- `payment_details.reference_id` 폴백 경로.
- `payment_method.qr_code.channel_properties.rrn` nested 경로.
- RRN 후보 전부 부재 → `qrisRrn=null` · `xenditPaymentId=payment_id` 유지.
- `data.payment_id` 결여 · `payment_method.id` 폴백.

### 3-e. 미반영 (별도 PR 로)

- **영수증 renderer (ESC/POS 또는 HTML)** 의 Ref/RRN/Xendit ID 라벨 분기 + 전체-표시/줄바꿈 처리.
  renderer 를 이 repo 안에서 특정하지 못해 이 PR 범위 밖. (설계는
  `docs/plans/M0-1104-J-payment-core-plan.md:146` 에 이미 명시.)

### 3-f. 기존 영수증 (이미 발행된 주문)

- **그대로 둠** — 변경은 **paid webhook 재수신 시** 에만 `metadata.tenders` 를 패치. 이미
  `status === "captured"` 인 tender 는 분기 상 재기록 안 함 (`route.ts:572` guard). 신규 결제만 적용.

---

## 4. 나눠결제 (2건 이상 QRIS)

- 각 QRIS tender 는 고유한 `payment_request_id` → **각자의 paid webhook 수신** → 각자의
  `metadata.tenders[idx]` 를 `matchIdx` (payment_collection_id | payment_request_id) 로 찾아 패치.
- 따라서 QRIS 2건이면 `tenders[0].qris_rrn` 와 `tenders[1].qris_rrn` 이 독립적으로 세팅.
- 영수증 snapshot 의 tenderList 는 `nextTenders.map(...)` 로 전 tender 를 돌며 각자의 값을 적는다
  → **각 QRIS 줄에 각자 다른 거래번호** (Kyu 확인 항목 충족 설계).

---

## 5. 자기 검증

### 5-a. 유닛 테스트 (실행)

- `pnpm --filter commerce-core exec jest --testPathPattern "qris-xendit.unit|webhook-route.unit|qris-simulate-bk"`
  → **Test Suites: 3 passed · Tests: 54 passed** (신규 5 포함).
- `pnpm --filter commerce-core exec jest --testPathPattern "qris-xendit.unit"` → 27 pass (신규 5 포함).

### 5-b. 타입 체크 (실행)

- `pnpm --filter commerce-core run typecheck` → 245 error (모두 **기존** · 변경 파일 대응 0건).
  - 변경 파일 (`webhook.ts`, `route.ts`, `receipt/service.ts`, `qris-xendit.unit.spec.ts`) 에서
    신규 오류 **0건**. 기존 오류는 admin React 19 widget 측 (예:
    `src/admin/widgets/order-pos-timeline.tsx` · `Text` ForwardRef) — 이 PR 과 무관.

### 5-c. naming 검증 (실행)

- `bash scripts/naming-check.sh` → **PASS** (meros 매치 0 · 모듈명 규격 OK · [...x] 없음 · 동명 migration 없음).

### 5-d. Sandbox webhook fixture 로 저장 확인 (미실행)

- `/qris-simulate` sandbox 경로로 paid webhook 왕복을 돌려 `metadata.tenders[idx].qris_rrn`
  이 persist 되는지 실수신 확인 — **미실행** (실 Xendit live 호출 금지 · sandbox fixture 가
  이번 작업 범위에 없었음). Kyu 가 sandbox token 으로 1회 돌려주면 필드명 확정 (§2-b) 과
  같이 종결 가능.

### 5-e. 실기 (미실행)

- 실기 QC 는 **사용자 소관** · 이 PR 은 커밋/푸시 없음.

---

## 6. PR 본문 3줄 (제안)

```
QRIS 영수증 Ref 를 손님 결제앱에 찍히는 acquirer RRN 으로 바꾼다.
paid webhook 에서 RRN 후보 경로 (channel_properties/payment_details/payment_method.qr_code) 를 추출해 metadata.tenders[idx].qris_rrn · xendit_payment_id 에 저장하고 receipt snapshot QRIS tender 의 reference_no 를 RRN → Xendit payment id → 기존 폴백 순으로 설정한다.
Kyu 확인 항목: QRIS 결제 영수증 Ref 에 거래번호 전체가 나오고, 나눠결제면 두 줄 각자 다른 번호 (renderer 쪽 Ref/RRN 라인 분리 + 전체 표시는 별도 PR — docs/plans/M0-1104-J-payment-core-plan.md:146 설계 반영 후속).
```

## 7. 권장안 1건

- 이 PR 서버분 (webhook + snapshot + 타입 + 단위 테스트) 선행 머지.
- 사용자 sandbox fixture 1회 수행 → `webhook.ts:rrnCandidates` 의 실제 경로 1개로 좁히는 후속 PR.
- 영수증 renderer Ref/RRN/Xendit ID 라벨 분기 + 전체 표시 + 줄바꿈 처리 PR (설계 docs
  이미 존재 · renderer 구현 위치 확정 후).
