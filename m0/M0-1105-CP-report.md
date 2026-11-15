# M0-1105-CP — S1c 마무리 · customer-display link-phone 정식 경로 + 페어링 보안 2건

PR#280 · 새 경로 POST /customer-display/snapshots/:id/link-phone · 보안 2건(원자 카운터 · timingSafeEqual) · CI pos-integration 매처 자동 편입

## 수행 요약

### REQ1 — 손님 iPad 번호 연결 정식 경로
- 신설 `apps/commerce-core/src/api/customer-display/snapshots/[id]/link-phone/route.ts`
- device-token 미들웨어(M3-1105-CK · 기존 `/customer-display/*` matcher) 그대로 재사용 → `X-Device-Token` 검증 완료 후 `register_session_id` 가 req 에 주입된 상태.
- route 내부: `snapshot.register_session_id !== deviceRegisterId` → `403 register_mismatch`.
- 성공 시 `linkCustomerToOrder(source:"customer_display")` 공용 함수로 위임 — admin 경로와 100% 동일한 번호정규화 · upsert · 창 검증 · R4 적립.

### REQ2 — 임시 admin 경로 처리
- 임시 admin link-phone route 상단 헤더 블록을 `@deprecated` 로 교체. 내부는 변경 없이 공용 함수 그대로 호출 → 호환성 유지.
- 손님 앱(`apps/customer-display`) 에는 호출 상수 부재 (`grep -rn "link-phone\|linkPhone\|link_phone" apps/customer-display` = 0). REQ2 단서 "있으면" 에 따라 skip.

### REQ3 — R0 후속 보안 2건
- 원자 카운터: `src/modules/register_session/service.ts` `consumePairCode(code, pgConnection?)` 서명 확장. pg 주입 시 `UPDATE register_session SET pair_code_attempts = pair_code_attempts + 1 WHERE pair_code = ? RETURNING …` 단일 쿼리로 레이스-프리 증가. pg 미주입(단위 테스트 fallback) 은 기존 비원자 경로 유지.
- 상수시간 비교: `src/lib/device-token.ts` 에 `safeEqualStrings(a, b)` 신설 (`crypto.timingSafeEqual` 래퍼 · 길이 다르면 Buffer 변환 전 false). `consumePairCode` 가 반환 row 의 `pair_code` 를 입력 code 와 재비교, `verifyDeviceToken` 이 저장 hash 를 재계산 hash 와 재비교.
- pair API route 는 `req.scope.resolve("__pg_connection__")` 로 pg 획득 후 서비스에 전달 (earn.ts 와 동일 패턴).

### REQ4 — 통합 테스트
- `apps/commerce-core/integration-tests/loyalty/customer-display-link-phone.spec.ts` 신설. jest.config.js `integration:pos` · `integration:loyalty` 매처(`integration-tests/loyalty/**`) 자동 편입 → pos-integration 러너에서 실행.
- 커버 케이스:
  1. 유효 X-Device-Token + 자기 계산대 스냅샷 → 200 + customer_id + phone_masked
  2. 토큰 미제공 → 401 missing_device_token
  3. 다른 계산대 스냅샷 id → 403 register_mismatch
  4. link_open_until 경과 → 409 link_window_closed
  5. 페어링 실패 카운터 동시 5회 → ok ≤ 1 · 나머지 429 · pair_code=null · 원자 증가 보증

## 확인 (실기)

- [ ] pos-integration CI (PR#280) 통과 — PR 열림 즉시 CI 트리거. 미검증 (push 직후 로컬 pos-integration 미실행 · Postgres 부팅 비용 + 45분 상한).
- [ ] 통합 테스트 신규 5 케이스 통과 — PR CI 결과 대기. 미검증.
- [ ] pairing.unit.spec.ts / device-token.unit.spec.ts 23 건 재통과 — **로컬 확인 완료** (0.274s · PASS).
- [ ] typecheck(`tsc --noEmit`) clean — **로컬 확인 완료** (기존 playwright 무관 1건 외 신규 0).
- [ ] naming-check PASS — **로컬 확인 완료**.
- [ ] 손님 iPad 실기 (결제 후 번호 입력 → 적립 confirm) — 미검증 (S1c 손님 앱 인수 이후 · M3-1105-CK 후속).
- [ ] 임시 admin 경로 실 삭제 — 범위 외 (별도 티켓).

## 이연 순증감

- +0 (상쇄). handoff-20261115 `R0 지적 후속` 항목 2건(원자 카운터 · timingSafeEqual) → **완료**. 손님 앱 호출 상수 교체는 호출부 부재로 자동 해결(이연 불필요). 임시 admin 경로 삭제는 호환성 유지 목적 유예 — 별도 티켓에서 수거 예정이나 새로 생성한 이연 없음.

## PR

https://github.com/CuriocityDevAi/storeport/pull/280
