PASS · storeport PR #452 commit 98ec346 (feat/M0-1126-D-cd-pos-sync-v2)

## 결과 요약

- storeport PR #452 (`feat/M0-1126-D-cd-pos-sync-v2`) 에 R0-1126-L CHANGES 1건 반영 커밋 1개 추가.
- 서버 `deriveCustomerFlow` 가 `state === 'entering'` 일 때 `snapshot.phone_partial ?? customer_phone` 을 `customer_flow.phone` 에 흘려 POS fork #270 chip 이 실시간 "0813…" 표시 복원.
- 계약서 `curiocity-relay/plans/cd-sync-contract-20261125.md` v1.3 1줄 추가 (별도 상대 PR 브랜치 `feat/M0-1126-E-contract-v13`).

## 커밋

- storeport: `98ec346` — `fix(commerce-core): M0-1126-E — CD entering 중 customer_flow.phone = phone_partial (POS-2 실시간 숫자)`
- curiocity-relay: `725ded585` — `plans: 동기화 계약서 v1.3 — entering 중 customer_flow.phone = phone_partial (M0-1126-E · R0-1126-L)`
  - 상대 브랜치 `feat/M0-1126-E-contract-v13` push 완료. main 병합은 T0/오케 소관.

## 변경 파일 (storeport #452)

| 파일 | 변경 | 비고 |
|---|---|---|
| `apps/commerce-core/src/modules/register_session/lifecycle.ts` | `deriveCustomerFlow` entering 분기 `snapshot.phone_partial ?? phone` | 다른 상태(first_visit/confirming/confirmed/skipped/none) 동작 불변 |
| `apps/commerce-core/src/modules/register_session/__tests__/customer-flow-dto.unit.spec.ts` | v1.3 unit 테스트 4건 신규 | 전체 21건 PASS |
| `apps/commerce-core/integration-tests/loyalty/cd-phone-partial.spec.ts` | 신규 통합 테스트 (PATCH phone_partial → GET snapshot) | 2건 PASS |
| `docs/feature-map.yaml` | 신규 spec 파일 등록 | — |

## 자기 검증 로그 (직접 실행)

### 1) 통합 테스트: PATCH phone_partial "0812" → GET snapshot (요구사항 #3)

```
$ cd apps/commerce-core && bash scripts/it.sh cd-phone-partial
PASS integration-tests/loyalty/cd-phone-partial.spec.ts (10.81 s)
    M0-1126-E · customer_flow.phone = phone_partial (entering)
      ✓ PATCH phone_partial '0812' → GET active · customer_flow.phone==='0812' (807 ms)
      ✓ PATCH phone_partial '' → GET active · customer_flow.phone==='' (POS 'Waiting for customer') (684 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

### 2) commerce-core unit 전체

```
$ cd apps/commerce-core && pnpm test
Test Suites: 75 passed, 75 total
Tests:       864 passed, 864 total
Snapshots:   18 passed, 18 total
Time:        28.26 s
```

### 3) commerce-core typecheck

```
$ cd apps/commerce-core && pnpm typecheck
> tsc --noEmit
(0 errors)
```

### 4) pre-push 훅 (storeport push 시 자동 실행)

```
apps/commerce-core test: Test Suites: 75 passed, 75 total
apps/commerce-core test: Tests:       864 passed, 864 total
apps/customer-display test:  Test Files  16 passed (16)
apps/customer-display test:       Tests  313 passed (313)
To https://github.com/CuriocityDevAi/storeport.git
   483ef3a..98ec346  feat/M0-1126-D-cd-pos-sync-v2 -> feat/M0-1126-D-cd-pos-sync-v2
```

## 수정의 핵심 1줄

```diff
-  const phoneExposed =
-    state === "entering" || state === "first_visit" || state === "confirming"
-      ? phone
-      : null;
+  const phoneExposed =
+    state === "entering"
+      ? (snapshot.phone_partial ?? phone)
+      : state === "first_visit" || state === "confirming"
+        ? phone
+        : null;
```

- `state === 'entering'` 에서만 `phone_partial` 우선. submit_phone 완료 전에는 `customer_phone` 이 null 이므로 `phone_partial` 이 소스가 되고, submit_phone 후에는 `customer_phone` 이 세팅돼 그대로 반영된다.
- `phone_partial === ""` → `""` (POS "Waiting for customer" · 요구사항 #1 단서), `phone_partial === null` → `null` (POS "Waiting for customer").
- `first_visit`/`confirming`/`confirmed` 는 기존 동작 (요구사항 #2 보장). 테스트로 재확인.

## 요구사항 체크

| # | 요구 | 상태 |
|---|---|---|
| 1 | entering 시 `customer_flow.phone = snapshot.phone_partial ?? phone` · 0자 → "" 또는 null | ✓ lifecycle.ts |
| 2 | 확인 이후(first_visit/confirming/confirmed) 기존대로 · confirmed 마스킹 규칙 유지 | ✓ 코드 분기 유지 + unit 테스트 "confirming 은 phone_partial 영향받지 않음" |
| 3 | PATCH phone_partial "0812" → GET snapshot → `customer_flow.phone === "0812"` · 빈 값 | ✓ 통합 테스트 `cd-phone-partial.spec.ts` 2/2 PASS |
| 4 | 계약서 v1.3 1줄 추가 · POS fork #270 참조 명시 | ✓ relay 브랜치 `feat/M0-1126-E-contract-v13` |

## 참고

- 소스: `curiocity-relay/queue/m0/M0-1126-E.md` · 근거 보고서 `curiocity-relay/r0/R0-1126-L-report.md`
- 원장: `curiocity-relay/ledger/decision-cd-pos-sync-v2-20261126.md` POS-2
- 계약서 정본: `curiocity-relay/plans/cd-sync-contract-20261125.md` (v1.3 상대 브랜치 push 완료 · 운영 머지 대기)
- storeport 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1126-D-wt` · 브랜치 `feat/M0-1126-D-cd-pos-sync-v2`
- relay 워크트리: `/Users/kyu.lee/projects/curiocity-relay-wts/M0-1126-E` · 브랜치 `feat/M0-1126-E-contract-v13`
- 범위 밖 파일 (`apps/customer-display/screenshots/*.png` 12종) 은 기존 미커밋 상태 그대로 둠. 이 세션 생성 아님.
