# R0-1105-CS — storeport #228 리뷰 결과 (QRIS Xendit 서버 1차 · M0-1105-BC)

**판정**: 조건부 APPROVE — 핵심 보안 경로(timing-safe 토큰·금액·세션 대조·비밀 비노출)는 견고. race condition 가드와 DB fallback 전체 테이블 조회 2건을 운영 전 수정 권고.

검토 커밋: `32545a3` · 변경 파일 11 · +1826/-33

---

## 검증 표

| # | 항목 | 판정 | 근거 |
|---|------|------|------|
| 1a | x-callback-token timing-safe 비교 | ✅ 통과 | `webhook.ts:38-47` · `crypto.timingSafeEqual` 사용 |
| 1b | 토큰 미설정 시 처리 | ⚠️ 주의 | `route.ts:42-50` · 미설정 → 500 반환 (Xendit 재시도 유발). 503 또는 401 이 더 명확하나 보안상 차단됨 |
| 1c | 금액 불일치 거부 | ✅ 통과 | `route.ts:124-135` · `Math.round` 비교 후 400 반환 |
| 1d | reference_id·payment_request_id DB 대조 | ✅ 통과 | `route.ts:66-105` · session 조회 후 unknown → 200 ignored (위조 불가) |
| 1e | 다른 주문 ID 위조 불가 | ✅ 통과 | session ID = payment_request_id · DB 조회 통과 필수 |
| 2a | paid 2회 멱등 | ✅ 통과 | `route.ts:112-122` · `alreadyCaptured` 체크 → 200 no-op |
| 2b | paid 후 expired 역순 도착 | ⚠️ 낮음 | `route.ts:138-155` · expired 분기에 `alreadyCaptured` 체크 없음 → `session.data.xendit_status` 가 EXPIRED 로 덮어쓰여짐. qris-status 는 `payment.captured_at` 우선 체크(`qris-status/route.ts:52-58`)로 보호되나 session.data 불일치가 혼란 초래 가능 |
| 2c | 동시 2건 race condition | ❌ 필수 수정 | `route.ts:66-220` · JS 레벨 `alreadyCaptured` 체크만 있고 DB 트랜잭션 lock 없음. Xendit 재전송 타이밍이 겹치면 `capturePaymentWorkflow` 중복 호출 가능. Medusa workflow 내부 보호에 묵시적 의존 |
| 3a | QRIS short-circuit cash·card 미영향 | ✅ 통과 | `tenders/route.ts:~370` · `isQris=true` 에서 early return · 기존 경로 분리 명확 |
| 3b | split + QRIS 처리 명시 | ⚠️ 낮음 | `split=true` + `pp_xendit_qris_default` 조합이 명시적으로 막혀있지 않음. QRIS short-circuit 후 pending 상태에서 2차 split tender 도착 시 `paidSoFarBefore=0` 오산 → undefined behavior. 명시적 400 필요 |
| 4a | apiKey 로그·응답 미노출 | ✅ 통과 | `xendit-client.ts:60-73` · 오류 시 `error_code`만 반환. apiKey 는 클로저 내부 |
| 4b | session.data whitelist | ✅ 통과 | `xendit-qris-provider.ts:111-117` · qr_string·expires_at·payment_request_id·reference_id·amount 5개만 저장 |
| 4c | console.warn 에 토큰·키 미노출 | ✅ 통과 | 모든 warn 에 `payment_request_id`·에러 메시지만 기록 |
| 4d | pos_settings 평문 저장 | ℹ️ 범위 외 | `config.ts:21-24` 주석 명시 · M1-J-e 라운드 범위. 현재는 env fallback 전용 운용 |
| 5a | /hooks/payment/xendit vs Medusa default 충돌 | ✅ 통과 | static route 가 `[provider]` dynamic route 보다 우선 · 주석에서도 이유 명시 |
| 5b | 인증 미들웨어 밖 여부 | ✅ 통과 | `/hooks/**` 는 admin 미들웨어 범위 밖 · Xendit 은 JWT 없이 호출 |
| 6a | qris-status admin 인증 | ✅ 통과 | `/admin/pos/...` → Medusa `/admin/**` JWT + API key 자동 적용 |
| 6b | qris-regenerate admin 인증 | ✅ 통과 | 동일 · `qris-regenerate/route.ts` |
| 7 | CI · main 충돌 | ✅ 통과 | `mergeable_state: "clean"` · PR 본문 `pnpm test` 64 pass · typecheck 0 error |
| DB fallback 전체 테이블 조회 | ❌ 필수 수정 | `route.ts:84-100` · `filters: {}` 빈 필터로 전체 `payment_session` 조회 후 JS filter. 주문 증가 시 성능 저하 + 외부 반복 호출 시 DoS 가능 |

---

## 필수 수정 (머지 전)

### [1] 동시 paid 이벤트 race condition
**파일**: `apps/commerce-core/src/api/hooks/payment/xendit/route.ts:112`

현재 JS 레벨 `alreadyCaptured` 체크로만 멱등 보호. 진짜 동시 요청은 둘 다 `false`를 읽고 `capturePaymentWorkflow`를 중복 호출할 수 있음.

권고: `payment_session.id`를 `WITH ... FOR UPDATE` 또는 Medusa `setPaymentSessionStatus('captured')` 선행 호출로 DB 레벨 잠금 → 중복 `capturePaymentWorkflow` 차단.
또는 최소한 `capturePaymentWorkflow` catch에서 "already captured" 에러를 멱등 성공으로 처리하고 명시적으로 문서화.

### [2] DB fallback 전체 테이블 조회
**파일**: `apps/commerce-core/src/api/hooks/payment/xendit/route.ts:84-100`

```ts
// 현재 (위험)
filters: {},  // 전체 테이블 조회
// 수정 — reference_id 기반 직접 조회
filters: { reference_id: parsed.referenceId }
// 또는 Medusa metadata JSON query 지원 여부 확인 후
// data->>'reference_id' = $1 형태 raw query 사용
```

---

## 낮음 / 범위 외 (다음 라운드 권고)

- **L1** `webhook.ts:40` · length oracle: `a.length !== b.length` 즉시 false → 토큰 길이 추측 가능. 패딩 또는 HMAC 으로 완전 timing-safe 구현 권고.
- **L2** `tenders/route.ts:~370` · split + QRIS 명시적 400 차단 추가 (현재 undefined behavior).
- **L3** `route.ts:138` · expired/failed 분기 앞에 `alreadyCaptured` 체크 추가 (session.data 보호).
