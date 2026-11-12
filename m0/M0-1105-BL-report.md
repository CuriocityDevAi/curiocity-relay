# M0-1105-BL — qris-simulate 세션 키 버그 + fork playwright 조사 · 보고

## [REQ1] storeport #236 qris-simulate 세션 조회 버그

### 뿌리
`qris-simulate/route.ts:71` 가 `filters: { id: payment_request_id }` 로
Medusa `payment_session.id` (`payses_…`) 를 조회했으나, 클라는 Xendit
`pr_id` (`pr_…`) 를 보내므로 실제로는 **항상 404**. iPad "Simulate payment"
버튼 작동 불가.

### 수정 (fd017bb)
- `apps/commerce-core/src/api/admin/pos/orders/[id]/qris-simulate/route.ts:64-96`
  — `container.resolve("pgConnection")` 로 pg 획득 후
  `findSessionByXenditRefs(pg, payment_request_id, "")` 로 webhook 과 동일한
  `data->>'payment_request_id'` JSONB 직조회.
- `apps/commerce-core/src/modules/payment_xendit/lib/webhook.ts:214,236`
  — `XenditSessionRow` 에 `provider_id?: string | null` 추가 · SELECT 에
  `provider_id` 추가 (qris-simulate 가 QRIS 세션 여부 검사용).
- `apps/commerce-core/src/modules/payment_xendit/__tests__/qris-simulate-bk.unit.spec.ts`
  — query.graph mock 을 pg mock 으로 교체해 **실제 SQL · bindings 를 검사**
  (SQL 에 `data->>'payment_request_id'` 포함 · `bindings[0] === "pr_real_123"`).
  [BL] 회귀 케이스 2건 추가: ① pr_id JSONB 매칭 확인 · ② 옛 가정 (session.id)
  을 보내면 404 로 떨어지는지.

### 테스트 로그 (고치기 전 → 후)
고치기 전 (route.ts 원본 · webhook.ts 원본 유지 · 테스트만 신규 기대):
```
Tests:       7 failed, 3 passed, 10 total
  ● [BL] Xendit pr_id 로 JSONB 조회 — unexpected resolve: query
  ● [BL] seed 가 다른 pr_id 만 가지면 404 — unexpected resolve: query
  ● live 키 → 403 — unexpected resolve: query
  (옛 코드가 pgConnection 대신 query 로 resolve 하려다 실패)
```

고친 후 (route.ts 수정 반영):
```
Tests:       10 passed, 10 total
  ✓ POST /v3/payment_requests/{id}/simulate · body = {amount}
  ✓ amount 는 정수로 반올림되어 전달
  ✓ [BL] Xendit pr_id 로 JSONB 조회 — SQL 에 data->>'payment_request_id' + bindings[0]=pr_id
  ✓ [BL] seed 가 다른 pr_id 만 가지면 404 — session.id 매칭에 '기대지 않음'
  ✓ live 키 → 403 · code simulate_live_forbidden
  ✓ 다른 주문의 payment_request_id → 400 · code payment_request_mismatch
  ✓ payment_request_id 결여 → 400
  ✓ session 이 QRIS 가 아님 → 400
  ✓ key 미설정 → 400 · xendit_not_configured
  ✓ Xendit API 실패 → 502 · error_code 전달
```

연관 테스트 전수 PASS (회귀 없음):
```
qris-xendit · webhook-route · qris-simulate · qris-xendit-bd
Test Suites: 4 passed, 4 total
Tests:       69 passed, 69 total
```

typecheck: 에러 0.

### pos-integration 신규 케이스
40분 상한 안에서 real-DB 통합 테스트 세팅까지는 못 넣음 (후속 라운드 권장).
Unit 2건 ([BL]) 으로 SQL/bindings 를 실측 검증하므로 버그 재발 방지.

---

## [REQ2] fork #119 playwright 15분 타임아웃 조사

### 실제 CI 결과 분석
PR #119 (fork/feat/m0-1105-bk-qris-simulate · pre-rename SHA b173b13) 의
`playwright` 잡은 **타임아웃이 아니고** 16m17s 에 **정상 종료 (exit 1)**.
한 하네스 (`scripts/m3-1105-p-playwright.mjs`) 가 113.8s 에 1/19 실패:
```
=== (A) PaymentMethodTabs 노출 ===
  (A-5) QRIS sublabel = "Coming soon"   ← FAIL
… 나머지 전부 ✓
18/19 passed · 1 failed
```

### 뿌리 (BK 와 무관 · master 선존)
`components/payment/PaymentMethodTabs.tsx` 가 이미 master 에서 QRIS 탭을
`enabled: true` + sublabel 없음 으로 바꿨는데 (`M3-1105-P`), 옛 하네스가
"Coming soon" 을 기대. 이 실패는 **master 에서도 재현** (CI run 43263113292
master-head · 같은 1/19 FAIL).

- 성공 run (master): 43250966214 (SHA 68a771e · c3b8b7c 머지 전)
- 실패 run (master): 43254500942, 43263113292 (c3b8b7c 이후)
- 실패 run (BK branch): 43270871847 (b173b13 · 같은 시그니처)

결론: **BK 브랜치가 유도한 회귀 아님**. REQ3 지침 ("lint 는 master 선존
문제라 범위 밖") 동일 적용 — m3-1105-p 수정은 M0-1105-BL 범위 밖 (후속
라운드가 PaymentMethodTabs 변경과 함께 하네스 보정 필요).

### 새 spec `06-qris-simulate-bk.spec.ts` 영향
없음. CI 의 `playwright` 잡은 `scripts/run-all.mjs playwright` 로
`scripts/*-playwright.mjs` 하네스만 실행. `e2e/flows/*.spec.ts` (Playwright
`@playwright/test`) 는 `npm run test:e2e:flows` 명령어로만 로컬 실행 —
CI 파이프라인 **밖**. 따라서 06 spec 은 CI 시간/실패에 기여 안 함.

### 번호 충돌 처리 (f908780)
M3 #118 이 같은 06 번호 (`06-payment-tabs-icons.spec.ts`) 를 쓰므로 혼선
방지로 `06-qris-simulate-bk.spec.ts` → `07-qris-simulate-bk.spec.ts` 로 이동.
`git mv` rename — 내용 변경 없음 · lint/flow-tests 영향 없음.

---

## 착지 SHA + 새 CI run
| 리포 | PR | HEAD SHA (push 후) | CI run |
|------|-----|--------------------|--------|
| storeport | #236 | `fd017bb` | Node CI 43277250204 **SUCCESS** · CI 43277250268 **SUCCESS** |
| fork | #119 | `f908780` | 43277905735 · 43277906814 (in_progress 시점) |

Fork PR CI 는 master 선존 m3-1105-p 실패를 그대로 재발 할 가능성 (BK 변경
무관). 범위 밖으로 둔다.

---

## 요약
- #236: 서버 세션 조회 버그 (pr_id ≠ session.id) 뿌리 수정 · 10/10 unit PASS
  · typecheck 0 · webhook 경로 공유 헬퍼 (`findSessionByXenditRefs`) 재사용.
- #119: 15분 타임아웃은 사실 1건 테스트 실패 (master 선존 · BK 무관) · spec
  06→07 rename 완료. e2e spec 은 CI 에서 실행되지 않음.
