# M0-1105-AZ — storeport #224 main rebase + CI 초록 확인

## 수행
- `feat/m0-1105-ax-pos-tax-lines` → `origin/main` (7a7ad02) rebase 성공 · 충돌 없음 · 5 커밋 재적층
- force-with-lease push → HEAD `e804403`
- 로컬 3 spec 각 별도 프로세스로 실행
- CI pos-integration 결과 확인
- PR #224 에 결과 코멘트 게시

## 로컬 결과
| spec | 결과 | 로그 |
| --- | --- | --- |
| tenders.spec | ✅ 88/88 (66.6 s) | `/tmp/M0-1105-AZ-tenders.log` |
| pos-tax-lines.spec | ✅ 7/7 (12.7 s) | `/tmp/M0-1105-AZ-pos-tax-lines.log` |
| p6-e2e.spec | ❌ 2 failed / 8 passed / 10 total (15.8 s) | `/tmp/M0-1105-AZ-p6-e2e.log` |

## CI
- run **43181416871** / job **131058170502** (pos-integration)
- 결과: **FAILURE** (로컬과 동일 · tenders ✅ · pos-tax-lines ✅ · p6-e2e ❌ 2건)

## 빨강 원인 (수정 안 함)
`apps/commerce-core/integration-tests/pos/p6-e2e.spec.ts`
- (b) line 151–154 · (b-restock) line 215–218
- 두 테스트 모두 `seedProdShape(container, { initialStock: 10, unitPrice: 100000 })` 호출

`apps/commerce-core/integration-tests/pos/_helpers/prod-shape-seed.ts:58,93-94`
- `preReserved` 기본값 11 · `initialStock: 10` 과 drift
- 11 > 10 → `createReservationItems` 에서 `Not enough stock available` overflow

## 판정
R0-1105-CO 의 "p6-e2e (b) 수정은 이미 main(7a7ad02 · #223) 에 있음" 전제가 **성립하지 않음**.
#223 머지본 자체가 (b)(b-restock) 를 `initialStock: 10` 으로 바꾸면서 `preReserved` 기본 11 과 drift 를 남겼다 (#223 CI 는 어떻게 통과했는지 별도 조사 필요 — 머지 전 force-push drift 가능성).

후속 티켓: #223 drift 해소 (`preReserved` 명시 override or `initialStock` 복원) — M0-1105-AZ 범위 밖.

## PR 코멘트
https://github.com/CuriocityDevAi/storeport/pull/224#issuecomment-6818493348
