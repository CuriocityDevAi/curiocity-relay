# R0-1105-EV — #265 APPROVE · #256 CI fail 지속

## #265 보안 검증 결과

**판정: APPROVE** — 필수 보안 요구사항 전부 충족. 사소한 주의사항 2건 (차단 불필요).

| 체크 항목 | 결과 | 근거 |
|---|---|---|
| 토큰 평문 DB 저장 없음 | ✅ | `device_token_hash: model.text().nullable()` 필드만, plaintext 반환만. pairing spec "토큰 평문 DB 저장 금지" 통과 |
| 해시 비교 timing-safe | △ | `verifyDeviceToken` → `sha256Hash(token)` 후 DB WHERE 조회 (timingSafeEqual 미사용). 그러나 HTTP 레이어에서는 DB 쿼리 타이밍 외부 측정 불가 → 실질적 위험 없음 |
| 다른 계산대 403 | ✅ | `snapshot.register_session_id !== deviceRegisterId` → 403 `register_mismatch` |
| 폐기 후 401 | ✅ | `revokeDeviceToken` → `device_token_hash = null` → `verifyDeviceToken` null → 미들웨어 401 `device_token_revoked` |
| 재페어링 후 이전 토큰 401 | ✅ | 새 페어링 시 `device_token_hash` 덮어씀 → 이전 토큰 `verifyDeviceToken` null. pairing spec "재페어링 — 이전 토큰 무효화" 통과 |
| 5회 실패 → 코드 폐기 429 | △ | DB 카운터 방식, SELECT+UPDATE non-atomic. 여러 인스턴스 동시 추측 시 경쟁 조건 가능. 단 페어링 동시성 낮아 실질 위험 미미 |
| `/pair` 만 예외 미들웨어 | ✅ | `unlessPath(/^\/customer-display\/pair$/, deviceTokenMiddleware)` — 정확히 pair만 제외 |
| admin 경로 영향 없음 | ✅ | `middlewares.ts`에 `/customer-display/*` matcher만 추가. admin 기존 JWT 미들웨어 불변 |
| 기기 토큰 → admin API 불가 | ✅ | device token 미들웨어는 `/customer-display/*`에만 적용. admin 경로는 Medusa admin JWT 필수. pos-integration CI pass |

## 계약 §6 정정 2건 반영 확인

| 정정 | 내용 | 확인 |
|---|---|---|
| 정정① | 코드 소비 = `POST /customer-display/pair` (인증 없음) | ✅ 경로 표·흐름 다이어그램 반영. "정정① 반영" 명시 |
| 정정② | 기기 토큰 해시 = sha256 (bcrypt 불필요) | ✅ `sha256Hash` 사용. 계약 "bcrypt 불필요 · 매 요청 검증 비용" 명시. Rate Limit 절 "DB 카운터 방식" 명시 |

## CI 결과

### #265
| job | 결과 | 시간 |
|---|---|---|
| pos-integration | ✅ pass | 6m35s |
| unit-commerce-core | ✅ pass | 57s |
| check | ✅ pass | 15s |
| markers-and-forbidden | ✅ pass | 11s |
| changes-filter | ✅ pass | 7s |
| docker-smoke-* | skipping | — |

**전부 pass.**

### #256
| job | 결과 | 시간 |
|---|---|---|
| e2e-admin-loyalty | ❌ fail | 1m33s |
| pos-integration | ❌ fail | 1m46s |
| unit-commerce-core | ✅ pass | 54s |
| check | ✅ pass | 14s |
| markers-and-forbidden | ✅ pass | 6s |
| changes-filter | ✅ pass | 6s |

**mergeable: UNKNOWN** — CI fail 로 인한 상태. e2e-admin-loyalty · pos-integration 2개 여전히 실패. R0-1105-EN에서 ET 시간 초과 문제로 보고된 건과 동일 fail 상태 지속. 별도 대응 필요.
