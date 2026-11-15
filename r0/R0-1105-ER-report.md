# R0-1105-ER — #261 리뷰 리포트

**#261 판정: APPROVE with CHANGES · CI: 전 job pass (unit·pos-integration·check·markers)**

---

## 1. REQ 1~6 준수표

| REQ | 내용 | 충족 | 근거 (file:line) |
|-----|------|------|-----------------|
| 1 | `enabled=false` / `expiry_days=0` → no-op · `skipped_reason` 리턴 | ✅ | `expiry-runner.ts:60-80` (`!enabled` → `"disabled"`) · `expiry-runner.ts:81-89` (`expiryDays <= 0` → `"no_expiry"`) · `expiry.ts:72-74` (computeExpiry 내부 가드) |
| 2 | FIFO 순수 함수 · 사용은 오래된 적립분부터 소진 · 소멸 debit 재차감 금지 | ✅ | `expiry.ts:88-137` (FIFO bucket loop) · `expiry.ts:95-108` (expiry debit → 해당 bucket.remaining 에서 차감, FIFO 재활용 금지) · `expiry.unit.spec.ts:102-152` (FIFO 표 테스트) |
| 3 | store credit debit(사유 "expiry") · 잔액 초과 차감 금지 | ✅ | `expiry-runner.ts:116-143` (`debitExpiry`) · `expiry-runner.ts:120` `reference: EXPIRY_REFERENCE` · 주석: "플러그인이 Insufficient balance 로 거부" · try/catch 없이 job 실패로 가시화 |
| 4 | 매일 매장 timezone 00:10 근처 · 재실행 멱등 | ✅⚠️ | `loyalty-expiry.ts:28` `"10 17 * * *"` = UTC 17:10 = Jakarta(UTC+7) 00:10 ✅ · 멱등 메커니즘: `reference_id="expiry:<credit_tx_id>"` 재주사 ✅ · **다중 인스턴스 동시 실행 시 unique constraint 의존 → ⚠️ 아래 §4 참조** |
| 5 | `POST /admin/pos/loyalty/expire {dry_run?}` → 응답 형식 · admin 인증 | ✅⚠️ | `route.ts:9-34` · admin 인증: Medusa admin middleware 위임(`/admin/pos/` 경로 자동 적용) ✅ · `dry_run=true` → debit 미수행 ✅ · **`now` 파라미터가 plan §3-1에 없고 운영 악용 가능 → ⚠️ §4 CHANGES** |
| 6 | 테스트: FIFO 표 · expiry_days=0 · 멱등 · dry_run 무변경 · 통합 1건 | ✅ | `expiry.unit.spec.ts`: 11 케이스 (FIFO 3건·expiry_days=0·음수·단일·만료전·사용전소진·멱등·부분멱등·문자열amount·동시각) · `expiry.spec.ts`: 통합 2건 (credit→만료→debit·enabled=false/expiry_days=0) |

---

## 2. FIFO 손계산 직접 검증

### 시나리오 A: 적립 3건 · 중간 사용 · 일부 만료  
(`expiry.unit.spec.ts:102–152`)

```
C1  2024-01-01  credit  50,000  → 만료일 2025-01-01
C2  2024-06-01  credit  30,000  → 만료일 2025-06-01
D1  2024-07-01  debit   20,000  (order_use)
C3  2024-12-01  credit  20,000  → 만료일 2025-12-01

FIFO 순서: C1 → C2 → C3
D1(20,000) FIFO 소진: C1에서 20,000 → C1.remaining = 30,000

now = 2025-02-01
  C1 만료일 2025-01-01 ≤ 2025-02-01 → 소멸 대상 · amount = 30,000  ✓
  C2 만료일 2025-06-01 > 2025-02-01 → 미소멸  ✓
  C3 만료일 2025-12-01 > 2025-02-01 → 미소멸  ✓

예상: [{C1, 30,000}], total=30,000
코드 단언: r.items[0] = {credit_tx_id:"C1", amount:30000}, total=30,000  ✅ 일치
```

### 시나리오 B: 단일 credit · 멱등 (이미 소멸된 분 재차감 0)  
(`expiry.unit.spec.ts:155–181` + `expiry.spec.ts:step 5~6`)

```
C1  2024-01-01  credit  50,000
D_EXP_1  debit  50,000  reference="expiry"  reference_id="expiry:C1"  (1차 run 결과)

computeExpiry 재실행:
  C1 버킷 초기 remaining = 50,000
  D_EXP_1 처리: extractExpiredCreditId("expiry:C1") = "C1"
    → C1.remaining = max(0, 50,000 − 50,000) = 0
  만료 판정 루프: C1.remaining = 0 → skip
  items = [], total = 0  ✅ 멱등 보장

잔액 초과 차감: C1.remaining ≥ D_EXP_1.amount(50,000) → clamp to 0, 초과 없음  ✅
```

**손계산 결론**: 코드 결과와 완전 일치. 경계값(잔액 0, 중간 사용으로 모두 소진, 부분 소멸 후 재실행) 모두 올바르게 처리됨.

---

## 3. Cron 표현식 · 멱등성

### cron `"10 17 * * *"` 검증

| 표현식 | UTC | Jakarta(UTC+7) | 판정 |
|--------|-----|----------------|------|
| `10 17 * * *` | 17:10 | 00:10+1 | ✅ Asia/Jakarta 00:10 |

Medusa scheduled job의 기준 TZ = UTC (Medusa 기본값). 주석과 코드 일치.

### 다중 인스턴스 멱등성 ⚠️

**현황**: 멱등 메커니즘은 `reference_id="expiry:<credit_tx_id>"`로 기록 → computeExpiry 재주사 시 remaining 에서 차감. **단, 이 가드는 순차 재실행에만 완전 보장됨.**

**리스크**: 두 인스턴스가 동시에 실행될 경우:
1. 둘 다 같은 txs를 읽음 (expiry debit 아직 없음)
2. 둘 다 `computeExpiry` → 동일 amount 계산
3. 둘 다 `debitExpiry` 호출
4. 최악 경우: 플러그인의 `debitAccounts`에 `reference_id` unique constraint 없으면 이중 debit 발생

**검증 불가**: `@medusajs/loyalty-plugin` 내부 코드가 PR에 없어 unique constraint 여부 미확인. 플러그인이 (account_id, reference_id) unique 제약을 DB 수준에서 강제한다면 두 번째 인스턴스는 오류 발생 후 job 실패로 가시화됨 → 허용 가능. 그렇지 않으면 중복 소멸 위험.

**권고**: 플러그인 store_credit_account_transaction 테이블의 `reference_id` unique constraint 여부 확인 · 문서화. 불명확하면 Medusa job 단일 인스턴스 실행 설정(`MEDUSA_WORKER_MODE=worker` 1개) 또는 Redis 분산락 추가 권고.

---

## 4. Admin API 보안 검토

### 인증

- 경로: `/admin/pos/loyalty/expire` → Medusa의 `/admin/**` middleware가 자동으로 admin 세션/JWT 인증 적용.
- route.ts에 별도 auth guard 없음 — middleware 위임 패턴은 기존 `/admin/pos/orders/*/tenders` 등과 동일. ✅

### `dry_run` 무변경 보장

- `expiry-runner.ts:95-98`: `if (!dryRun) { for (const it of expiries) { await debitExpiry(...) } }`
- dry_run=true 경우 debit 호출 없음. 계산만 수행 후 items 반환. ✅
- 통합 테스트 step 4에서 `afterDry[0].balance = 50,000` (불변) 직접 확인. ✅

### `now` 파라미터 악용 가능 — **CHANGES 필요** ⚠️

- `route.ts:13-21`: 미래 날짜 입력 가능 (유효성 검사: ISO 파싱 여부만 확인).
- 악용 시나리오: 운영자가 `now=2028-01-01` 입력 → expiry_days=365 계정의 2027년치 적립금이 즉시 소멸. 고객 불이익 발생.
- plan §3-1 엔드포인트 표에 `now` 파라미터 없음 → 계획에 없는 기능이 운영 노출.

**권고**: 환경 제한 추가 필요:

```ts
// route.ts 수정 예시
if (typeof body.now === "string" && body.now.length > 0) {
  if (process.env.NODE_ENV === "production") {
    res.status(400).json({ type: "invalid_data", message: "now is not allowed in production" });
    return;
  }
  // ... 기존 파싱 로직
}
```

또는 `now` 파라미터 자체를 route에서 제거하고 runner 함수의 테스트 전용 경로로만 유지.

---

## 5. CI 결과

```
job                         결과    시간
--------------------------  ------  ------
unit-commerce-core          pass    59s
pos-integration             pass    6m12s
check                       pass    14s
markers-and-forbidden       pass    6s
changes-filter              pass    6s
docker-smoke-*              skip    (변경 없음 · 조건부)
wrangler-check-care-agent   skip    (변경 없음 · 조건부)
```

**전 실행 job pass. 필수 CI 충족.**

---

## 종합 판정

| 항목 | 결과 |
|------|------|
| REQ 1~6 | ✅ 전 항목 충족 |
| FIFO 손계산 2건 | ✅ 코드 결과 일치 |
| Cron UTC 환산 | ✅ Jakarta 00:10 맞음 |
| 순차 멱등 | ✅ reference_id 보장 |
| 동시 실행 멱등 | ⚠️ 플러그인 unique constraint 미확인 |
| Admin 인증 | ✅ middleware 위임 충분 |
| dry_run 무변경 | ✅ |
| `now` 파라미터 운영 악용 | ❌ **CHANGES 필요** |
| CI | ✅ 전 pass |

**판정: APPROVE with CHANGES**

필수 변경:
1. **`now` 파라미터를 `NODE_ENV !== "production"` 가드로 제한** (또는 route에서 제거)

권고 사항:
2. `loyalty-plugin` `reference_id` unique constraint 여부 확인 · PR 본문에 명시
3. 운영 다중 인스턴스 환경에서 cron 중복 실행 방지 방안 명문화

DRAFT 상태 감안 시 CHANGES 반영 후 Ready for Review 전환 권고.
