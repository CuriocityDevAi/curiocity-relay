# R0-1105-EL 리뷰 리포트 — storeport #258

**판정: CHANGES** — 동시 중복 가드 Map이 Railway 멀티 인스턴스에서 깨짐 + P-3 `take:50` 전체 조회 로직 세션 주문 누락 위험.

---

## REQ 1~5 준수표

| REQ | 항목 | 판정 | 파일:줄 |
|-----|------|------|---------|
| 1 | `08xx` 정규화 | ✓ | phone-id.ts:34-35 |
| 1 | `+628xx` 정규화 | ✓ | phone-id.ts:30-31 |
| 1 | `628xx` 정규화 | ✓ | phone-id.ts:32-33 |
| 1 | 공백·하이픈·점 제거 | ✓ | phone-id.ts:19 |
| 1 | 유효성 08 시작 | ✓ | phone-id.ts:40-42 |
| 1 | 유효성 10~13자리 | ✓ | phone-id.ts:44-48 |
| 1 | 마스킹 `0812-****-7890` | ✓ | phone-id.ts:62-65 |
| 1 | 자체 구현 채택 (OSS 미사용) | ✓ | PR 본문 선택지 |
| 2 | `{phone, consent?: true}` body | ✓ | route.ts:114-127 |
| 2 | `metadata.phone_e164` 조회 | ✓ | route.ts:42-45 |
| 2 | email 없이 customer 생성 | ✓ | route.ts:66-77 |
| 2 | `loyalty_consent·loyalty_consent_at` | ✓ | route.ts:72-73 |
| 2 | 주문에 customer 연결 | ✓ | route.ts:201-204 |
| 2 | store credit account 보장 (IDR) | ✓ | route.ts:80-93 |
| 2 | 응답 형식 완전 | ✓ | route.ts:206-216 |
| 2 | 이름·이메일·사진 미저장 | ✓ | route.ts:66 (email intentionally omitted) |
| 2 | 동시 중복 방지 Map | ✗ | route.ts:24 (멀티 인스턴스 미작동 — CHANGES ①) |
| 3 | P-3 `receipt_no` SoT | ✓ | route.ts:147 |
| 3 | 계산대 단위 `register_session_id` 필터 | ✓ | route.ts:152,162-163 |
| 3 | 409 `link_window_closed` | ✓ | route.ts:168-173 |
| 3 | `needs_post_payment_earn: true` 플래그 | ✓ | route.ts:214-215 |
| 3 | P-3 `take:50` 전체 조회 | ✗ | route.ts:156-164 (고량 환경 세션 누락 — CHANGES ②) |
| 4 | GET loyalty-info 응답 형식 | ✓ | loyalty-info/route.ts:80-87 |
| 4 | earn_preview/available_use = null + TODO | ✓ | loyalty-info/route.ts:84-85 |
| 5 | 단위 테스트 10형식 | ✓ | 18/18 통과 (로그 아래) |
| 5 | 신규·기존 번호 테스트 | ✓ | customer-link.spec.ts:69-124 |
| 5 | 동의 기록 테스트 | ✓ | customer-link.spec.ts:92-95 |
| 5 | 동시 2요청 1명 테스트 | △ | spec.ts:126-152 (단일 프로세스만 증명) |
| 5 | 완료 주문 409/허용 테스트 | ✓ | spec.ts:154-215 |
| 5 | 잘못된 번호 400 테스트 | ✓ | spec.ts:52-68 |
| 5 | **14자리 경계 단위 테스트 누락** | ✗ | phone-id.unit.spec.ts:36 (17자리로 대체 — CHANGES ③ 경미) |

---

## 2. 정규화 직접 검증 — 단위 테스트 로그

```
PASS src/lib/__tests__/phone-id.unit.spec.ts
  normalizePhone — 정규화 표 (10 형식)
    ✓ normalises 08123456789 -> +628123456789 / 0812-****-6789
    ✓ normalises 0812-345-6789 -> +628123456789 / 0812-****-6789
    ✓ normalises 0812 345 6789 -> +628123456789 / 0812-****-6789
    ✓ normalises +6281234567890 -> +6281234567890 / 0812-****-7890
    ✓ normalises 6281234567890 -> +6281234567890 / 0812-****-7890
    ✓ normalises +62 812-3456-7890 -> +6281234567890 / 0812-****-7890
    ✓ normalises 62 8123456789 -> +628123456789 / 0812-****-6789
    ✓ normalises 081234567890 -> +6281234567890 / 0812-****-7890
    ✓ normalises 0812345678901 -> +62812345678901 / 0812-****-8901
    ✓ normalises 0812.345.6789 -> +628123456789 / 0812-****-6789
  normalizePhone — 유효성 오류
    ✓ rejects  with error containing phone required
    ✓ rejects 081234567 with error containing 10        (← 9자리 거부 ✓)
    ✓ rejects 08123456789012345 with error containing 10 (← 17자리 거부 ✓; 14자리 경계 미포함)
    ✓ rejects 07123456789 with error containing 08      (← 08 아닌 시작 거부 ✓)
    ✓ rejects abcd1234 with error containing digits only
    ✓ rejects +63812345678 with error containing 0, 62   (← 외국 국가코드 거부 ✓)
  maskE164: 2 passed

Tests: 18 passed, 18 total  Time: 0.193s
```

**14자리 경계**: 테스트는 17자리(`08123456789012345`)를 사용해 "too long" 경로를 검증하지만, REQ가 명시한 14자리(`08123456789012`, 14 local digits) 경계값 케이스가 없음. 로직은 `local.length > 13` 조건으로 올바르게 거부함.

---

## 3. 개인정보 — 저장 경로 0 확인

`createCustomers` 호출(route.ts:67-76):
```ts
{
  phone: phoneE164,       // E.164 (전화번호 = ID, 허용)
  metadata: {
    phone_e164: phoneE164,
    loyalty_consent: ...,
    loyalty_consent_at: ...,
  },
}
```
`first_name`, `last_name`, `email`, `avatar_url` 없음 ✓.  
통합 테스트(spec.ts:88-91)에서 `saved.email`, `saved.first_name`, `saved.last_name` falsy 검증 ✓.

---

## 4. 동시 중복 가드 판단 — **깨짐 → CHANGES ①**

**구현**: `const inFlight = new Map<string, Promise<UpsertResult>>()` (route.ts:24) — 모듈 스코프(프로세스 내 싱글톤).

**Railway 멀티 인스턴스 시 깨지는 이유**:
- Railway는 `numReplicas` 명시 없이 auto-scale 및 deploy rollover(구 인스턴스/신 인스턴스 동시 가동) 가능.
- 인스턴스 A와 B가 동시에 `+62812...` 요청 수신 시, 각각 독립적인 `inFlight` Map 보유.
- 양쪽 모두 `listCustomers → []` → `createCustomers` → DB에 같은 `phone_e164` metadata를 가진 customer **2건 생성**.
- `is_new: true` 를 양쪽에서 반환하는 경쟁 조건.

**권장 대안**:
1. **DB unique 인덱스 (우선)**: Medusa 2.17.2의 `customer.phone` 컬럼에 unique 제약이 있는지 확인. 있다면 `phone: phoneE164` 충돌 시 `catch → retry listCustomers`로 처리. 없다면 별도 migration으로 `external_id`(already unique) 필드에 `phone_e164` 저장.
2. **Advisory lock (대안)**: `SELECT pg_advisory_xact_lock(hashtext($1))` + 트랜잭션. Medusa raw query 접근 필요.

현재 단일 프로세스 POS 가정은 PR 본문에 명시됐지만, Railway 배포 특성상 보장되지 않으므로 Phase 1이라도 수정 필요.

---

## 5. P-3 판정 근거 + 409 테스트

**`receipt_no` SoT 근거**: tenders 라우트가 결제 완료 후 항상 `metadata.receipt_no` 세팅 → 직접 확인 가능. Medusa `payment_status` 대비 외부 계산 불필요 ✓.

**계산대 단위 맞음**: `register_session_id` 필터 → 각 계산대는 별도 session을 가지므로 계산대 단위 스코프 ✓.

**409 테스트**: spec.ts:184-212에서 `setTimeout(10ms)`로 순서 보장 후 409 + `type: "link_window_closed"` 검증 ✓.

**`take: 50` 전체 조회 문제 — CHANGES ②**:

```ts
// route.ts:156-166
const recentOrders = await (orderModule as any).listOrders({}, {
  take: 50,
  fields: ["id", "created_at", "metadata"],
  order: { created_at: "DESC" },
});
const sessionOrders = recentOrders.filter(
  (o) => o.metadata?.register_session_id === registerSessionId,
);
const mostRecentId = sessionOrders[0]?.id;
if (mostRecentId && mostRecentId !== order_id) → 409
```

- 전체 주문 TOP-50 가져온 후 client-side 필터. 다른 세션에서 50건 이상 주문이 쌓이면 대상 세션의 최신 주문이 TOP-50에서 밀려남.
- `sessionOrders = []` → `mostRecentId = undefined` → `if (undefined && ...)` = false → **P-3 검증 없이 허용(false negative)**.

**수정 방향**:
```ts
// metadata.register_session_id 직접 필터 + DESC take:2
const sessionOrders = await (orderModule as any).listOrders(
  { metadata: { register_session_id: registerSessionId } },
  { take: 2, fields: ["id", "created_at"], order: { created_at: "DESC" } },
);
```
Medusa `listOrders` metadata 필터 지원 여부 확인 필요. 불가 시 `created_at > order.created_at` 조건으로 더 최신 주문 존재 여부만 쿼리.

---

## 6. 통합 테스트 · CI 결과

**로컬 단위 테스트**: 18/18 통과 ✓ (실행 로그 §2 참고)

**통합 테스트**: 로컬에서 실 Postgres 부팅 없이 미실행. CI check runs API 접근 불가(403).  
PR 코멘트에서 feature-map bot 경고 확인:
- `phone-id.ts`, `phone-id.unit.spec.ts` 미분류 → 최종 커밋에서 `docs/feature-map.yaml` 패턴 추가로 해소됨.
- `loyalty-store-credit` 프로세스 `planned → live` 미승격 경고 잔존 (merge 전 반영 권장).

---

## 판정: CHANGES

| # | 심각도 | 항목 |
|---|--------|------|
| ① | 중요 | 동시 중복 가드 Map → 멀티 인스턴스에서 customer 중복 생성. DB unique 제약으로 대체. |
| ② | 중요 | P-3 `take:50` 전체 조회 → 고량 환경에서 session 주문 누락 시 false negative. 직접 session 필터 쿼리로 수정. |
| ③ | 경미 | 14자리 경계 단위 테스트 누락 (`08123456789012`). |
