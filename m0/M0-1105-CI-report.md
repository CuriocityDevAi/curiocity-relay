# M0-1105-CI — 리포트

**결과**: S1b(번호 연결 단일화) + R4(적립 훅 · 멱등) 서버 코드 + 통합 테스트 1차 완료 · PR #271 draft.

## 핵심 성과
- **#261 리뷰 대화 정리**: 두 open thread 모두 이미 `isResolved: true` (CF/CG 반영 답글 포함) · 추가 조치 불필요. 머지 블로킹은 다른 원인(mergeStateStatus=UNKNOWN)일 수 있음 · Admin UI 확인 필요.
- **CH 잔여물**: `~/curiocity-live/storeport-wts/M0-1105-CH-wt` 브랜치 `m0/M0-1105-CH-link-earn` = origin/main 과 동일 (`git log origin/main..HEAD` 비어 있음) · 가져올 변경 없음.
- **S1b+R4 본 작업**: 공용 함수 1개 + R3 교체 + 손님 경로 신규 + 적립 라이브러리 + subscriber 작성.

## 변경 파일 (6 code + 2 test + 1 doc)
| 파일 | 역할 |
|---|---|
| `apps/commerce-core/src/lib/link-customer-order.ts` 신규 | POS·손님 공용 `linkCustomerToOrder` |
| `apps/commerce-core/src/lib/loyalty/earn.ts` 신규 | `earnForOrder` (receipt-preview 규칙 그대로 · 멱등) |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/customer/route.ts` 수정 | R3 → 공용 함수 호출 · `register_session_id` 판정 제거 |
| `apps/commerce-core/src/api/admin/pos/loyalty/sessions/snapshots/[id]/link-phone/route.ts` 신규 | 손님 iPad 경로(임시 Admin 아래) · TODO S1c |
| `apps/commerce-core/src/subscribers/loyalty-earn-on-paid.ts` 신규 | 결제 완료 → 적립 (결제 라우트 파일 무수정) |
| `apps/commerce-core/integration-tests/loyalty/link-earn.spec.ts` 신규 | 4 시나리오 테스트 |
| `apps/commerce-core/integration-tests/loyalty/customer-link.spec.ts` 수정 | 기존 P-3 테스트 → `link_open_until` 계약으로 교체 |
| `docs/feature-map.yaml` 수정 | `loyalty-store-credit` 커버리지 확장 |

## 계약 준수 표
| 항목 | 상태 | 비고 |
|---|---|---|
| `linkCustomerToOrder` 공용 함수 | ✅ | union 반환 · R3 route 가 상태 코드 그대로 사용 |
| `link_open_until` 단일 가드 | ✅ | 완료 주문 + snapshot 존재 시 창 판정 · `register_session_id` 판정 제거 |
| `POST /snapshots/:id/link-phone` | ⚠️ 임시 | Admin 경로 아래 (`/admin/pos/loyalty/sessions/snapshots/:id/link-phone`) · S1c(M3-1105-CK) 머지 후 `/customer-display/snapshots/:id/link-phone` 이관 · route 코드에 TODO 명시 |
| R4 금액 = `receipt-preview` | ✅ | `previewReceipt` 직접 호출 (simulate route 와 동일 매핑) |
| 결제 완료 subscriber | ✅ | `order.updated`·`payment.captured` 구독 · 결제 라우트 무수정 |
| 결제 후 연결 경로 적립 | ✅ | `linkCustomerToOrder` 안에서 `earnForOrder` 호출 |
| 멱등 (order_id 기준) | ✅ | `order.metadata.loyalty_earn.applied` 1차 가드 + credit tx `reference_id="earn:<order_id>"` 2차 |
| enabled=false → 0 | ✅ | `skipped_reason="loyalty_disabled"` |
| 스냅샷 receipt 필드(earned·new_balance·phone_masked) | ✅ | 양 경로에서 갱신 |

## 선택지 · 채택 · 이유
1. **공용 함수 반환 타입**: Union(`ok: true/false` + `status` 코드).
   채택: Union. 이유: route 에서 중복 검증 제거, 테스트 가독성 향상.
2. **창 판정 fallback**: register_session 모듈 없으면 창 미검증(허용).
   채택: try/catch + silent fallback. 이유: S1a 미배포 환경 안전장치.
3. **적립 멱등 2중 가드**: `metadata.loyalty_earn` + credit tx `reference_id`.
   채택: 두 겹. 이유: 플러그인 unique 제약 유무 불확실(PR#261 리뷰 지적 패턴) · metadata 가 primary.

## 테스트 실행 로그
- `npx tsc --noEmit` (apps/commerce-core): **error 1** (= pre-existing `loyalty-info/route.ts:79` · 본 변경 아님 · main 도 동일 에러).
- 통합 테스트(`link-earn.spec.ts` · `customer-link.spec.ts`)는 Postgres 필요 → 로컬 미실행 · CI 에 위임 (**미검증 · CI 결과 대기**).

## `gh pr checks 271` 결과
- 커밋 후 ~1분 조회: `no checks reported on the 'feat/m0-1105-ci-s1b-r4' branch` (워크플로 디스패치 중).

## 이연 순증감
- **이연 +1**: S1c (`/customer-display/*` 로 link-phone 경로 이관) — M3-1105-CK 선행 필요.
- **이연 +1**: R4 통합 테스트 "결제 전 연결 → 결제(subscriber) 적립" 시나리오 — Medusa 2.17.2 테스트 러너에서 `payment.captured` 이벤트 발화 세팅 복잡 → 후속 라운드.
- **이연 +1**: R4 통합 테스트 "subtotal 반영 scenario 2개" — Medusa 2.17.2 `createOrders` 가 `item_subtotal` 을 직접 세팅 불가 → 순수 `previewReceipt` 호출 검증으로만 축소(계약 일치 간이 보장).
- **이연 −1**: 해결됨 — #261 양 리뷰 스레드 이미 resolved.

## 처리 흐름 요약
1. `gh api graphql` 로 #261 리뷰 스레드 조회 → 이미 두 건 모두 resolved · 추가 조치 없음.
2. CH 워크트리 조사 → 가져올 커밋 없음.
3. 새 워크트리 `M0-1105-CI-wt` 분기 (base: origin/main · 29ea759).
4. 공용 함수·earn 라이브러리·route·subscriber 작성 → 첫 push → PR #271 draft.
5. 통합 테스트 추가 → 두 번째 push.
6. 리포트 생성.

processes: [commerce-core.loyalty.phase1-plan]
