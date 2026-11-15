#280 CHANGES · CI ❌ pos-integration

## 돌려본 명령·로그

```
gh run view 43711349869 --repo CuriocityDevAi/storeport --log-failed
gh pr view 280 --repo CuriocityDevAi/storeport
# middleware, service.ts, device-token.ts diff 직접 분석
# mcp github pull_request_read: get / get_files / get_comments
```

**CI 실패 — pos-integration `customer-display-link-phone.spec.ts`:**

```
✕ 유효 X-Device-Token + 자기 계산대 스냅샷 → 200   Expected: 200  Received: 401
✕ 다른 계산대 스냅샷 id → 403 register_mismatch   Expected: 200  Received: 401
✕ link_open_until 경과 → 409 link_window_closed   Expected: 200  Received: 401
✕ 페어링 실패 카운터 동시 5회 → attempts 정확히 5   Expected: 5   Received: 0
```

케이스 2(`X-Device-Token 미제공 → 401`)만 통과 → 미들웨어는 동작, **유효 토큰 전부 거절**.

---

## 🔴 MUST FIX 1 — `verifyDeviceToken` safeEqualStrings 가 CI 실패 원인

`service.ts` 하단 추가 블록:

```typescript
if (!safeEqualStrings(session.device_token_hash, hash)) {
  return null;
}
```

Medusa `listRegisterSessions({ device_token_hash: hash })` 는 WHERE 절에 필터를 걸지만
반환 엔티티 select 에 `device_token_hash` 가 없으면 `session.device_token_hash === undefined`.
→ `safeEqualStrings(undefined, hash)` → `typeof undefined !== "string"` → `false`
→ `verifyDeviceToken` null 반환 → 미들웨어 `401 device_token_revoked`.

이 체크는 SQL WHERE 가 이미 보장하는 동치를 중복 확인하므로 timing 보호 의미도 없음.
**제거하거나 `retrieveRegisterSession(id, { select: ["device_token_hash"] })` 로 명시 select 필요.**

## 🔴 MUST FIX 2 — `pgConnection.raw()` 미처리 예외 → 케이스 5 전부 500

CI 로그: `"Connection Error: Connection ended unexpectedly"` × N건
→ `okCount + limitCount == 0` (expected 5).

동시 5요청에서 `pgConnection.raw()` 가 throw → route handler 미처리 → Express 500.
모든 요청이 200도 429도 아니므로 assertion `expect(okCount + limitCount).toBe(5)` 실패.

fix: `consumePairCode` atomic path 를 try-catch 로 감싸 오류 시 fallback 재시도.

---

## 보안 분석 (REQ 1)

| 항목 | 판정 |
|------|------|
| 미들웨어 matcher `/customer-display/*` → 신규 경로 보호 | ✅ unlessPath가 `/customer-display/pair` 만 제외 |
| `register_mismatch` 403 — 미들웨어 주입 `deviceRegisterId` 사용 | ✅ |
| 원자 카운터 SQL 타이밍 오라클 여부 | ⚠️ SQL 단일 쿼리 동일, 앱 레벨 found/not-found 처리 경로 길이 차이 존재. pair_code 6자리+TTL 단기로 실용 위험 낮음 |
| `UPDATE … WHERE pair_code = ?` 평문 비교라 timingSafeEqual 의미 | ⚠️ WHERE 가 먼저 평문 비교 → 반환 row 재확인 항상 true → timing 보호 없음. device_token hash 재확인은 유의미, pair_code 재확인은 오해 소지 |
| pg 미주입 fallback 운영 탈출 가능성 | ⚠️ `pgConnection` 해석 실패 시 warn 로그 없이 silent degradation → 운영 misconfiguration 감지 불가 |
| 동시 5회 기대값 계약 | ✅ attempts=4→5회+1→전부 ≥MAX→all 429, `okCount≤1`(실제 0) 계약 충족 |

## 보안 분석 (REQ 2 — 임시 admin 경로 권한 우회)

`@deprecated` 주석만 추가, 내부 로직 변경 없음.
`/admin/*` 는 Medusa v2 프레임워크 admin auth middleware 가 보호 → 권한 우회 없음. ✅

---

MUST FIX 2건 수정 후 CI 재통과 확인 필요.
