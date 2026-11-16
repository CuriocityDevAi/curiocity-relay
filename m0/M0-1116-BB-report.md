판정: fork 경로 중 정규화 안 되는 것 = 3건 (쓰기 W9 · 검색 S7·S8)

# M0-1116-BB 리포트 — 전화번호 계획서 fork POS 경로 보강

- 일자: 2026-11-17
- 브랜치: `docs/m0-1116-as-phone-identity`
- PR: https://github.com/CuriocityDevAi/storeport/pull/320
- 커밋: bd25406 (`docs(plan): M0-1116-BB — 전화번호 계획서 fork POS(agilo-medusa-pos-fork) 경로 보강`)
- 변경 파일: `docs/plans/phone-identity-plan.md` (1 file · +84 / −44)
- Scope: **docs only** · 코드 변경 0 · 운영 DB 조회 0

## 조사 대상

- Fork repo: `CuriocityDevAi/agilo-medusa-pos-fork` (iPad React Native + Expo) · `/tmp/agilo-pos-fork` 에 `gh repo clone --depth 1` (읽기 전용)

## 결론 (판정 근거)

### Fork 쓰기 경로 2건 + 비식별 2건

| 신규 ID | 파일 (fork repo)                                                                         | 서버 엔드포인트                                                            | 정규화 |
| ------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------ |
| **W8**  | `components/loyalty/LinkCustomerSheet.tsx:41·71` + `api/hooks/pos-loyalty.ts:62-68`      | POST `/admin/pos/orders/:id/customer` → 서버 `link-customer-order.ts` (W2) | ✓      |
| **W9**  | `app/customer-lookup.tsx:19-24·48-71` + `api/hooks/customers.ts:52-71`                   | `sdk.admin.customer.create` 직행 (Medusa core)                             | **✗**  |
| W10     | `api/hooks/draft-orders.tsx:32-49` (`useGetOrSetDefaultCustomer`)                        | email-only guest default · phone 미사용                                    | n/a    |
| W11     | `app/checkout/tender-cash/[draftOrderId].tsx:54-84` 등 (delivery.phone)                  | `order.metadata.delivery.phone` (수취인) · 손님 식별 아님                  | n/a    |

### Fork 검색 경로 2건 + 비식별 1건

| 신규 ID | 파일 (fork repo)                                                           | 서버 호출                       | 비교                                       | 정규화 |
| ------- | -------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------ | ------ |
| **S7**  | `app/customer-lookup.tsx:214-245` + `api/hooks/customers.ts:33-37`         | `sdk.admin.customer.list({ q })` | Medusa core LIKE (phone/first/last/email)  | **✗**  |
| **S8**  | `app/(tabs)/orders.tsx:293-317` + `api/hooks/orders.ts:7-43`               | `sdk.admin.order.list({ q })`   | Medusa core LIKE (customer.phone 등)       | **✗**  |
| S9      | `api/hooks/draft-orders.tsx:32-36`                                         | `customer.list({ email, ... })` | email equality (손님 식별 아님)            | n/a    |

### Kyu "Kyu Lee · psychica@… · Nov 4" 레코드 — 가장 유력한 생성 경로

- **W9** (fork `AddNewCustomerButton` Dialog) — email+first_name+last_name+phone 수동 입력 후 Medusa core `customer.create` 직행. zod `customerFormSchema` 는 email 만 required · phone optional · regex 없음 → raw 저장.
- 결과: `email="psychica@…" · first_name="Kyu" · last_name="Lee" · phone="0813..." · metadata={}` (phone_e164 없음).
- S2 가 못 보므로 Link 시트(W8) 가 돌 때마다 **새 customer** 추가 생성 가능 → 4번째 레코드 존재 여부는 §7 Q1 SQL 로 확인.

## 라운드 재배정 요약 (§6)

- **R1 (쓰기 정규화)**:
  - core (M0): `phone-id.ts` · anchor hooks · anchor schema (매장 미사용이나 fork 전환 지연 대비 유지).
  - **fork (M1/M3 · 별도 리포 PR)**: `customerFormSchema` 에 ID 모바일 regex · `AddNewCustomerButton` 서버 라우팅 교체 권장 (W9 폐지, 서버 커스텀 엔드포인트 경유로 통일).
- **R2 (검색 정규화)**:
  - core (M0): `/admin/pos/orders-list` · 신설 `/admin/pos/customers/search`.
  - **fork (M1/M3)**: S7 → 신설 `/admin/pos/customers/search` · S8 → 기존 `/admin/pos/orders-list` 로 호출 교체.
- R3~R5 는 기존 그대로 (core · 운영 DB · migration).

## Kyu 결정 질문 (변동 없음)

- Q1 SQL 유지 (Kyu 실행).
- Q2~Q4 권장안 유지.

## 산출물

- 문서: https://github.com/CuriocityDevAi/storeport/blob/docs/m0-1116-as-phone-identity/docs/plans/phone-identity-plan.md
- PR: https://github.com/CuriocityDevAi/storeport/pull/320 (본문 "2026-11-17 보강" 블록 추가)
