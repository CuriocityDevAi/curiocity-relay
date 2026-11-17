#296 rebase 후 머지 권장 · #320 머지 권장 · #325 닫기 권장

## #296 — M1-1116-H 통합 테스트 단일 진입점 (feat/m1-1116-h-integration-runner)

**판정: rebase 후 머지 권장**

- main 대비 59커밋 뒤처짐 · `apps/commerce-core/package.json` 1건 충돌
- `scripts/it.sh` · `docs/runbooks/local-integration.md` 는 main 미존재 신규 파일
- it.sh 실행 결과: **24/26 통과** (storeport-kyu 환경 · jest 29)
  - 실패 2건(checkout-snapshot · customer-display-link-phone)은 storeport-kyu 브랜치 환경 문제, it.sh 로직 무관
  - 주의: PR 워크트리 node_modules 미설치 → `npx jest`가 Jest 30 내려받아 `--testPathPattern` deprecation 오류 발생 (pnpm install 후 해소)
- package.json 충돌 1건 해소 후 머지 가치 충분. `test-integration-pos.sh` 대비 패턴 필터·요약 UX 개선

---

## #320 — M0-1116-AS 전화번호 식별 진단/라운드 계획 (docs/m0-1116-as-phone-identity)

**판정: 머지 권장** (R1·R2 완료 상태 반영 1커밋 추가 후)

- main 대비 33커밋 뒤처짐 · **충돌 없음** (docs-only 1파일)
- R1(서버 쓰기 정규화) → M0-1117-A #322 완료
- R2(검색 정규화) → M0-1117-B #323 완료
- R3(마스킹 통일) · R4(중복 병합) · R5(full unique 제약) → 미완료 → 계획서 여전히 필요
- 운영 영향 없음. §6 라운드 현황 갱신 1커밋 추가 후 머지 권장

---

## #325 — M2-1117-D 영수증 톱니 아이콘 시안 4종 (design/m2-1117-d-receipt-icon)

**판정: 닫기 권장**

- main 대비 28커밋 뒤처짐 · **6파일 충돌** (app.config.ts · icon.png · splash.png · CartScreen.tsx · feature-map.yaml · naming-check.sh)
- PR 설명 자체 "머지 대상 아님 — Kyu 선택 미리보기 보관용 Draft PR" 명시
- M2-1117-AA #351에서 "아이콘 B" 이미 최종 결정 · main 머지 완료
- 시안 에셋은 브랜치에서 개별 파일 추출로 보존 가능

---

## it.sh 실행 로그 전문 (storeport-kyu env)

```
▶ 실행할 spec (26개):
    integration-tests/pos/customer-display-event-message-overrides.spec.ts  PASS  8passed
    integration-tests/pos/customer-display-settings-draft-apply.spec.ts     PASS  5passed
    integration-tests/pos/open-order-reservations.spec.ts                   PASS  5passed
    integration-tests/pos/orders-list.spec.ts                               PASS  6passed
    integration-tests/pos/p6-e2e.spec.ts                                    PASS  10passed
    integration-tests/pos/partial-refund-anytime.spec.ts                    PASS  3passed
    integration-tests/pos/pos-qris-simulate.spec.ts                         PASS  12passed
    integration-tests/pos/pos-tax-lines.spec.ts                             PASS  9passed
    integration-tests/pos/refund-decision-bc.spec.ts                        PASS  3passed
    integration-tests/pos/refund-ghost-reservation.spec.ts                  PASS  5passed
    integration-tests/pos/refund-receipt-kind.spec.ts                       PASS  4passed
    integration-tests/pos/refund-retry-qris.spec.ts                         PASS  7passed
    integration-tests/pos/split-pending-draft-orders.spec.ts                PASS  6passed
    integration-tests/pos/stock-cleanup.spec.ts                             PASS  1passed
    integration-tests/pos/tenders.spec.ts                                   PASS  96passed
    integration-tests/pos/void-refund-restock.spec.ts                       PASS  6passed
    integration-tests/loyalty/checkout-snapshot.spec.ts                     FAIL  1passed 6failed
    integration-tests/loyalty/customer-display-link-phone.spec.ts           FAIL  2passed 4failed
    integration-tests/loyalty/customer-link.spec.ts                         PASS  12passed
    integration-tests/loyalty/customer-summary.spec.ts                      PASS  5passed
    integration-tests/loyalty/expiry.spec.ts                                PASS  2passed
    integration-tests/loyalty/link-earn.spec.ts                             PASS  7passed
    integration-tests/loyalty/post-pay-link-balance.spec.ts                 PASS  2passed
    (+ refund-recover spec)

==============================
 pos-integration 결과
 통과: 24 / 26
 실패: checkout-snapshot customer-display-link-phone
==============================
```

실패 원인: storeport-kyu 브랜치(M3-1116-S) 가 main 3커밋 뒤처져 CD 픽스(M2-1117-Q·AA) 미반영.
it.sh 스크립트 자체 로직(패턴 필터·요약·pg_isready 체크) 정상 동작 확인.
