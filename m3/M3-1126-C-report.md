# M3-1126-C · CI heavy-mac failure 원인 분류 · 재실행 결과

**원인 분류: 맥북 자원(포트 충돌 — EADDRINUSE) · #450 변경 무관**  
**재실행 결과: success · runner_name = ci-box-storeport-heavy-imac** (03:10:20Z → 03:25:17Z, 14분 57초)

---

## 1. 실패 개요

| 항목 | 값 |
|---|---|
| PR | #450 (`feat/M1-1126-B-cd-order-list-font-scale`) |
| 실패 job | `heavy-mac` (job 139649926353) |
| runner | `Youngkyus-MacBook-Pro-M1` |
| 실행 시간 | 02:25:12Z → 02:48:31Z (**23.3분**, 평소 4~15분) |
| 실패 단계 | `pos-integration` (스텝 `pos_int`) |
| 실패 테스트 스위트 | `integration-tests/pos/refund-qris-tender.spec.ts` |
| 실패 테스트 수 | **4건 / 4건 모두** (`#AV-1` ~ `#AV-4`) |

---

## 2. 실패 로그 발췌

```
02:39:32Z  FAIL integration-tests/pos/refund-qris-tender.spec.ts (12.689 s)
    M0-1116-AV · POST /refund · method:'qris' tender 허용 + Xendit refund 선행
      ✕ #AV-1 cash+qris 전액 환불 → 200 · Cash Movement 1건(현금 몫) · Xendit /v3/refunds 1회(QRIS 몫)
      ✕ #AV-2 cash+qris · QRIS 즉시 실패 → 400 qris_refund_rejected · Cash Movement 0건 · 현금 미처리
      ✕ #AV-3 qris 단독 전액 환불 → 200 · PIN 불요 · Xendit /v3/refunds 1회
      ✕ #AV-4 card+qris · 승인번호 누락 → 400 · 승인번호 포함 → 200

  ● #AV-1 …
    listen EADDRINUSE: address already in use :::54635
      at Function.listen (express/lib/application.js:635:24)
      at bootstrap-app.ts:95:10
      at MedusaTestRunner.beforeAll (medusa-test-runner.ts:277:7)

  ● #AV-1 … (cascade)
    TypeError: api.post is not a function
      at helpers.ts:58:30
      at refund-qris-tender.spec.ts:436:40
```

**근본 원인**: 직전 스위트 `refund-decision-bc`(02:38:12Z 완료)가 사용하던 포트 54635를 아직 OS에 반납하지 않은 상태에서, 즉각 시작된 `refund-qris-tender`가 동일 포트에 바인딩 시도 → `EADDRINUSE` → `beforeAll` 실패 → 모든 테스트가 `api.post is not a function`으로 연쇄 실패.

포트가 늦게 해제된 직접 원인은 맥북 메모리 압박(실행 당시 15.8/16GB 사용, swap 4.5GB). main 브랜치도 11-25 23:38Z 같은 runner에서 failure → 01:27Z success 재현 이력.

**#450 변경 파일** (`apps/customer-display/src/screens/OrderListScreen.tsx`) 과 `pos-integration` 테스트는 완전 무관.

---

## 3. 재실행 결과

| 항목 | 값 |
|---|---|
| rerun 명령 | `gh run rerun 45742155206 --failed` |
| 새 job ID | 139665934808 |
| runner_name | **ci-box-storeport-heavy-imac** |
| 실행 시간 | 03:10:20Z → 03:25:17Z (14분 57초) |
| 결과 | **success** |
| PR #450 최종 | 모든 checks pass (heavy-cloud: skipped, 정상) |

---

## 4. 이연 순증감 보고

| 구분 | 내용 |
|---|---|
| 이연 발생 | 없음 (flaky 판정 → 재실행으로 해소) |
| 품질 일감 후보 | `refund-qris-tender.spec.ts`: EADDRINUSE 취약. 메모리 압박 시 직전 스위트 포트 미해제 → 재실행 불가피. 포트 충돌 방지를 위한 동적 포트 할당 또는 `--runInBand` / 포트 해제 대기 로직 도입 검토 권장. |
| 맥북 runner 상태 | 11-25 23:38Z failure → 01:27Z success, 11-26 02:25Z failure(현재) → 03:25Z success. 반복 flaky. 메모리 용량(16GB) 한계로 heavy 테스트 시 swap 급증. |
