# R0-1105-ES 리뷰 보고서 — storeport #262

#262 조건부 APPROVE · CI 적색(unit-commerce-core 실패 — maskPhoneE164 버그)

---

## CI 결과 (gh pr checks 262 -R CuriocityDevAi/storeport)

| job | 결과 | 시간 |
|---|---|---|
| unit-commerce-core | **FAIL** | 55s |
| pos-integration | pass | 6m38s |
| changes-filter | pass | 5s |
| check | pass | 12s |
| markers-and-forbidden | pass | 8s |
| docker-smoke-anchor | skipping | — |
| docker-smoke-commerce-core | skipping | — |
| docker-smoke-wing | skipping | — |
| wrangler-check-care-agent | skipping | — |

---

## REQ 1 — 계약 §1 필드 대사표

| 필드 | 타입 | nullable | 구현 위치 | 계약 일치 |
|---|---|---|---|---|
| `id` | string | N | `customer-display.ts` OrderSnapshot | ✓ |
| `register_id` | string | N | 동일 | ✓ |
| `status` | `"idle"\|"checkout"\|"completed"` | N | 동일 | ✓ (불변 필드) |
| `updated_at` | string (ISO 8601) | N | 동일 | ✓ |
| `order_id` | string | Y (optional) | 동일 | ✓ |
| `items` | SnapshotItem[] | Y (optional) | 동일 | ✓ |
| `subtotal/discount_total/tax_total/grand_total` | number | Y (optional) | 동일 | ✓ |
| `loyalty` | SnapshotLoyalty | Y (optional) | 동일 | ✓ |
| `receipt` | SnapshotReceipt | Y (optional) | 동일 | ✓ |
| `snapshot_state` | `"active"\|"paid"\|"expired"` | N | 동일 (v2 추가) | ✓ |
| `paid_at` | string (ISO 8601) | Y | 동일 | ✓ |
| `link_open_until` | string (ISO 8601) | Y | 동일 | ✓ |
| `pre_entry` | boolean | N | 동일 | ✓ |
| `customer_phone` | string | Y | 동일 | ✓ |
| `server_now` | string (ISO 8601) | N | 동일 | ✓ |
| `polled_at` | string (ISO 8601) | Y | 동일 | ✓ |
| `receipt.earned` | number | N | SnapshotReceipt | ✓ |
| `receipt.new_balance` | number | N | 동일 | ✓ |
| `receipt.phone_masked` | string | Y | 동일 | ✓ |
| `receipt.payment_method` | `"cash"\|"card"\|"qris"` | N | 동일 | ✓ |
| `receipt.qr_string` | string | Y (optional) | 동일 | ✓ |

**공유 타입 위치**: `apps/commerce-core/src/types/customer-display.ts`
- 손님 앱(G1)이 storeport 모노레포 workspace path로 import 예정 (PR 본문 §Q1 명시)
- `apps/customer-display` 추가 시 `@storeport/commerce-core/types/customer-display` 경로 사용 가능
- packages/ 승격은 S1b/G1 착수 시 재검토 (PR 본문에 명시됨)
- **명확성 판정**: 계약 §1-1 주석 "손님 앱이 import할 수 있게 공유 위치 권장안(PR 본문 명시)" 충족 ✓

---

## REQ 2 — 수명 전이 직접 검증

| 전이 | 구현 위치 | 계약 일치 |
|---|---|---|
| 주문 시작 → `active` | `startSnapshotForRegister` pre_entry=false 로 생성 | ✓ |
| 결제 완료 → `paid`(paid_at 세팅) | `markSnapshotPaid` / `markSnapshotPaidByOrder` | ✓ |
| `paid` + link_open_until 미래 → 보류(규칙 E) | `evaluateLifecycle` paid 분기: link_open_until > now → keep | ✓ |
| `paid` + link_open_until 경과 → `expired` | 동일 함수 `<= now → expire` | ✓ |
| active TTL 10분 → `expired` | `evaluateLifecycle` active 분기: age > ttlMs → expire | ✓ |
| POS 새 세션 → 기존 즉시 `expired` (규칙 I) | `startSnapshotForRegister` 루프: 비-expired 전부 expired 전환 | ✓ |
| 새 스냅샷 `pre_entry = false` | 동일 함수 pre_entry: false 하드코딩 | ✓ |
| `server_now` 모든 응답 포함 | `serializeSnapshot` opts.now 주입 · GET route 에서 `now = new Date()` 고정 | ✓ |
| `polled_at` GET 호출 시 갱신 | `getActiveSnapshotForRegister` → `updateOrderSnapshots({ polled_at: now })` | ✓ |
| `polled_at` PATCH typing 호출 시 갱신 | `markSnapshotTyping` → `updateOrderSnapshots({ polled_at: now })` | ✓ |

**lazy expire 패턴**: GET 호출 시 evaluateLifecycle 로 TTL 체크 → DB update. 주기적 cron 없이 동작함.

**에지 케이스**: `snapshot_state = "paid"` + `link_open_until = null` 조합 → `evaluateLifecycle` 에서 keep 무한 반환. `markSnapshotPaid` 는 항상 link_open_until을 세팅하므로 정상 흐름에서는 발생 불가. DB 직접 조작 시 위험하나 S1a 범위 내 허용.

---

## REQ 3 — 결제 완료 갱신 방식 · 결제 실패 오류 전환 없음

**POS 결제 라우트 수정 여부**:
- PR 변경 파일 목록: `tenders/route.ts`, `refund/**`, `return/**`, `void/**`, xendit 웹훅 파일 없음 ✓
- 계약 §5 S1a "결제 라우트 파일 0 바이트 수정" 충족 ✓

**subscriber 구현** (`order-snapshot-paid.ts`):
- 구독 이벤트: `order.updated` + `payment.captured`
- 필터: `payment_status !== "captured" && payment_status !== "paid"` → early return
- 결제 실패(`payment_status = "requires_capture"` 등) 이벤트 수신 시 → early return → paid 전환 없음 ✓
- 멱등: `markSnapshotPaidByOrder` 에서 `snapshot_state === "paid" && paid_at` 존재 시 no-op ✓

**규칙 G (결제 실패 → snapshot_state = active 복원)**: 현재 미구현. 계약 §5 S1a 범위표에 명시 없음 → R8(실시간 채널) 또는 별도 단계 소관으로 판단, S1a 범위 이탈 없음.

**잠재적 주의**: `order.updated` 는 결제 외 order 변경(배송, 반품 등)에도 발생. payment_status 체크로 필터링하므로 오작동 없음 ✓.

---

## REQ 4 — 여러 계산대 동시 · 인증

**스냅샷 섞임 0**:
- `listOrderSnapshots({ register_session_id })` 쿼리로 계산대별 완전 격리
- GET `/snapshots/active?register_id=` 에서 `registerId` 필터 필수 (400 처리) ✓
- 여러 계산대 동시 운영 시 각자 독립 스냅샷 보장 ✓

**인증**:
- 경로: `/admin/pos/loyalty/sessions/snapshots/active` → Medusa admin 미들웨어 적용
- POS (admin JWT): 기존 admin 세션 그대로 사용 ✓
- **손님 iPad 인증 방식**: 계약 §2 경로 명세에 인증 방법 미명시. 현재 admin 경로이므로 손님 iPad가 admin JWT를 취득해야 함. 가능한 방법: (a) POS 가 proxy로 호출, (b) POS publishable API key 별도 경로 추가. 계약과 현재 구현 모두 이 부분을 열어 둔 상태. G1(손님 앱) 착수 전 계약 §2에 인증 방식 명시 필요. **S1a 완료 blocking은 아니나 G1 착수 전 결정 필요.**

---

## REQ 5 — CI 결과 (상세)

**unit-commerce-core FAIL 원인 분석**:

실패 테스트 2건 모두 `maskPhoneE164` 버그:

```
Expected: "+62****6789"
Received: "+6281****6789"
```

**버그 위치**: `apps/commerce-core/src/types/customer-display.ts` `maskPhoneE164`

```typescript
// 현재 (버그)
const head = phone.slice(0, Math.max(1, phone.length - 8));
// → "+628123456789"(13자) 에서 head = slice(0, 5) = "+6281"

// 수정 필요
const head = phone.slice(0, Math.max(1, phone.length - 10));
// → "+628123456789"(13자) 에서 head = slice(0, 3) = "+62"
```

`phone.length - 8` → `phone.length - 10` 수정 시 뒤 4자리 + 국가코드 패턴 충족:
- "+628123456789" (13자): head = 3 → "+62****6789" ✓
- "짧은 번호(≤4)": 별도 분기로 처리 ✓
- 테스트 "짧은 번호는 전부 마스킹" ("1234" → "****"): 영향 없음 ✓

**CI 통과 조건**: `maskPhoneE164` formula 1줄 수정 후 재실행.

---

## 종합 판정

| 항목 | 결과 |
|---|---|
| §1 필드 전부 구현 | ✓ |
| 공유 타입 위치 명확 | ✓ (PR 본문 §Q1 명시) |
| 수명 전이 계약 준수 | ✓ |
| POS 결제 라우트 무수정 | ✓ |
| 결제 실패 오류 paid 전환 없음 | ✓ |
| 계산대 격리 (스냅샷 섞임 0) | ✓ |
| admin 경로 인증 | ✓ (손님 iPad 방식 미결 — G1 전 결정 필요) |
| CI unit-commerce-core | **FAIL** — maskPhoneE164 버그 |
| CI pos-integration | pass |

**판정**: 조건부 APPROVE — `maskPhoneE164` 1줄 수정(`length - 8` → `length - 10`) 후 CI 통과 시 머지 가능. 로직 설계(수명 관리·subscriber·격리)는 계약 §1·§2·§5 S1a 준수 완료.
