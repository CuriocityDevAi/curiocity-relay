MUST 1 ✅ · MUST 2 부분 (2/5→사례 1·3·4 통과 · 5 잔여 sum=2) · CI pos-integration ❌

## 돌려본 명령·로그

```
gh run view 43711349869 --repo CuriocityDevAi/storeport --log-failed  # 최초 실패 분석
# /tmp/M0-1105-CQ-wt detached HEAD at m0/M0-1105-CP 생성
# service.ts · pair/route.ts · middlewares.ts 수정
pnpm exec jest pairing.unit.spec.ts  # 11 passed
pnpm typecheck  # 1 pre-existing (playwright) · 신규 0
git push origin HEAD:refs/heads/m0/M0-1105-CP-customer-display-link-phone
# 9e0a772 (service · route) + 564d1dd (middlewares)
# CI run 43716800748 pos-integration ❌ 8m30s
```

## MUST 1 ✅ — 뿌리: 미들웨어가 /customer-display/pair 를 가로채고 있었다

1차 수정: `verifyDeviceToken` 의 `safeEqualStrings(session.device_token_hash, hash)`
중복 비교 제거(§보안 분석 R0-FG · WHERE 가 평문 동치 보장).

2차 수정(addendum): 1차 push 후에도 테스트 1·3·4 가 pairDevice 헬퍼의 `expect(res.status).toBe(200)`
에서 401 로 터지는 리그레션 재현. 추적 결과 Medusa `unlessPath` 가 `req.path` 로
`/^\/customer-display\/pair$/` 를 테스트하는데 `defineMiddlewares` 의 matcher
`/customer-display/*` 가 Express 레벨에서 prefix 를 떨구는 환경이 있어 pair 요청도
`deviceTokenMiddleware` 가 가로채 401 `missing_device_token` 반환.

**수정**: `skipForPair` 래퍼로 `req.originalUrl` 기준 `/customer-display/pair`
를 skip. 결과: 유효 토큰 케이스(1) · register_mismatch(3) · link_window_closed(4)
전부 통과.

## MUST 2 부분 ⚠️ — pg Connection ended · 동시 5회 sum = 0 → 2 (목표 5)

`consumePairCode` 원자 경로의 `pgConnection.raw(UPDATE RETURNING)` 가 CI 환경 동시
5요청에서 knex `Connection ended unexpectedly` 로 throw.

**수정**:
- 서비스 내부에서 raw 호출을 try-catch 로 격리 · warn 로그 · 비원자 fallback 재시도
  (완전 삼키기 아님 · 성공·실패 양쪽 정의된 결과 반환).
- route 는 서비스가 끝까지 throw 하면 503 `pair_service_unavailable` 정의 코드로
  매핑(unhandled 500 금지).
- fallback 의 `pair_code` 중복 `safeEqualStrings` 제거(§권고).

**결과**: 전부 500/401 → sum=0 이었던 것이 sum=2 로 개선. 남은 3 요청은 fallback
경로의 mikro-orm EM 호출(`updateRegisterSessions`)도 같은 pg pool 이슈로 throw
→ 503 로 반환되며 test assertion `okCount+limitCount==5` 미달. 잔여 수정 방향:
atomic 경로 pool 레벨 retry(1~2회 backoff) 또는 pool 설정 강화 · M0-1105-CQ-b
로 이연 권고.

## 권고 (2건 모두 반영) ✅

1. pair_code 중복 비교(atomic · fallback) 제거 + "WHERE 가 평문 동치 보장" 주석 정정.
2. pair route 에서 `pgConnection` 미해석 시 `console.warn` 1회로 silent degradation 감지.

## CI

- PR #280 head `564d1dd` · run `43716800748` · pos-integration ❌ (8m30s)
- 실패 1건(`페어링 실패 카운터 동시 5회` · Expected 5 Received 2) · 사례 1·2·3·4 전부 통과
- unit-commerce-core · customer-display · e2e-admin-loyalty · markers · check 전부 pass

## 이연

- M0-1105-CQ-b (권고): atomic 경로 Connection ended 재시도/pool 보강. 잔여 테스트
  1건(동시 5 sum=5) 통과 필요. 이연 순증감: +1.
