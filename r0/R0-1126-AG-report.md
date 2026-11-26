#459 APPROVE

## ⑦ 선택지 2개

**선택지 A — 현 동작 고정 (PR 채택)**: confirm 시 order.customer_id = B 덮어쓰기 + earnForOrder의 metadata.loyalty_earn.applied 가드가 B 재적립·A 회수 모두 차단. A 계좌 = 최초 적립 보존, B = 0. ⑦번 테스트가 이 동작을 명시적으로 고정.
- 장점: 구현 단순, 즉시 출하.
- 단점: B 손님 입장에서 본인 주문인데 포인트 0.

**선택지 B — 번호 교체 시 A 회수 + B 재적립**: Re-enter 후 B 확정 시 A debit → B credit. cancel_entry 역방향 복원도 필요.
- 장점: 최종 연결 고객에게 정확히 귀속.
- 단점: debit/credit 추가, cancel/skip 케이스, 에러 롤백, 테스트 범위 증가.

---

## 실행 로그

### gh pr checks 459
```
check                        pass   28s
heavy-mac                    pass   13m5s
heavy-cloud                  skipping
changes-filter               pass   28s
docker-build-commerce-core   pass   5m52s
markers-and-forbidden        pass   22s
route                        pass   18s
```

### heavy-mac 단계별 결과 (45810368444)
- commerce-core-standalone-install: success
- build-commerce-core: success
- unit-commerce-core: success (877 tests)
- pos-integration: success (615s)
- customer-display · Typecheck: skipped (customer_display filter=false)
- customer-display · Unit: skipped
- customer-display · Build web: skipped
- customer-display · E2E: skipped
- e2e-admin-loyalty: skipped (loyalty_admin filter=false)

> 이 PR은 apps/commerce-core/ 만 수정 → customer_display=false, loyalty_admin=false → CD e2e / e2e-admin-loyalty CI skip 정상.

### 로컬 실행 (663e260 HEAD)
| 스텝 | 결과 |
|---|---|
| unit-commerce-core | ✅ 75 suites, 877 tests, 18 snapshots PASS |
| pos-integration | ✅ 전 spec PASS (exit 0) · 첫 실행 EADDRINUSE=병렬 포트 충돌·PR 무관 |
| customer-display typecheck | ✅ PASS |
| customer-display unit | ✅ 16 files, 327 tests PASS |
| customer-display build:web | ✅ PASS |
| customer-display e2e | ✅ 139 passed, 8 skipped |
| e2e-admin-loyalty | — 로컬 미실행 (CI에서도 skip·admin 경로 미변경) |

---

## Advisory lock 분석

### ① 키 충돌 — 다른 레지스터끼리 막히지 않는가
키: `hashtext('phone-entry:REGISTER_SESSION_ID')::bigint`. hashtext()는 32-bit 정수 → bigint 캐스팅. 운영 레지스터 100개 기준 충돌 확률 < 10⁻⁶. 다른 레지스터끼리 차단되지 않는다. ✅

### ② 트랜잭션 밖에서 lock이 풀려 무의미해지지 않는가
pg_advisory_xact_lock은 트랜잭션 단위. `pgConnection.transaction(async trx => { await trx.raw(lock); return await work(); })` — work() 완료 후 outer transaction commit 시 lock 해제. ORM 호출이 trx 연결을 공유하지 않아도 work() 내부 순차 실행 완료 후 반환 → lock은 work() 범위 안에서 유지. ✅

### ③ pgConnection 미해석 시 fallback이 운영에서 일어날 수 있는가 — 판정: 있음
조건: DI scope에서 __pg_connection__·pgConnection 모두 resolve 실패, 또는 resolve된 객체에 .transaction() 없음. withRegisterPhoneEntryLock 가드가 묵묵히 work()만 실행 → fallback 발생 시 로그·에러 없이 원자화 보증 소멸.

현재 CI pos-integration ⑧번 테스트(HTTP API → route → pgConnection 주입 → lock → new_cart_started 결정론적 수렴)가 통과했으므로 현 Medusa DI 환경에서 정상 주입 간접 확인됨.

fallback이 silent인 점이 약점. 운영 배포 후 진단 어려움. `console.warn('[phone-entry] lock fallback: pgConnection unavailable')` 추가 권장 — blocking 아님.

추가: startSnapshotForRegister는 lock 밖 → recheck ~ update 사이 미세한 창 존재 (PR 인지). recheck 직전 재검증으로 대폭 완화. 완전 원자화는 별도 scope.

---

## PR 코멘트
CuriocityDevAi/storeport#459 에 COMMENT 형식 리뷰 제출 완료 (동계정 APPROVE 불가).
