# M3-1105-CK 완료 — 서버 S1c: 손님 iPad 페어링 + 기기 토큰 + `/customer-display/*` 경로 구현 완료 (PR #265)

PR: https://github.com/CuriocityDevAi/storeport/pull/265  
Branch: feat/m3-1105-ck · Base: main · 커밋 5개

## 계약 §6 준수 표 + 정정 2건 반영

| 항목 | 계약 §6 원문 | 정정 | 구현 상태 |
|------|-------------|------|-----------|
| 코드 발급 경로 | `POST /admin/pos/loyalty/sessions` | — | ✅ |
| 코드 소비 경로 | `GET /admin/…/:code/pair` (원문) | **정정①** `POST /customer-display/pair {code}` 인증 없음 | ✅ |
| 토큰 해시 알고리즘 | bcrypt/sha256 (원문 모호) | **정정②** sha256 (bcrypt 불필요 · 매 요청 비용) | ✅ |
| 토큰 평문 DB 저장 | 금지 | — | ✅ DB에 sha256 해시만 |
| register 1:1 | 새 페어링 → 이전 폐기 | — | ✅ |
| rate limit | 5회 → 코드 폐기 · DB 카운터 | — | ✅ 429 `too_many_attempts` |
| 미들웨어 X-Device-Token | register_id 주입 | — | ✅ `src/api/middlewares.ts` unlessPath(/pair) |
| 스냅샷 기기 경로 | GET/PATCH `/customer-display/snapshots/*` | — | ✅ S1a 서비스 재사용 |
| 폐기 API | `POST /admin/…/:register_id/revoke` | — | ✅ |
| 연결 상태 API | `GET /admin/…/:register_id/status` → {paired, last_polled_at} | — | ✅ |
| 오류 코드 | 401 missing/revoked · 403 mismatch | — | ✅ |
| Admin UI | 범위 외 (서버 API만) | — | — (TODO) |
| link-phone 기기 경로 | S1b 머지 뒤 연결 | — | TODO |

## CI job 결과 (gh pr checks 265 -R CuriocityDevAi/storeport)

| job | 결과 |
|-----|------|
| changes-filter | ✅ pass 7s |
| check (feature-map) | ✅ pass 15s |
| markers-and-forbidden | ✅ pass 11s |
| unit-commerce-core | ✅ pass 57s |
| pos-integration | ✅ pass 6m35s |

테스트: 256 passed (기존 213 + 신규 43: device-token 20 + pairing 23)
