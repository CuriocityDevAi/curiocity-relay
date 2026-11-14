# M0-1105-BX — #251 rebase onto main (181a532) + CI 재실행

**결과**: ✅ rebase OK · new head `2083c54` · CI FAILED (pos-integration FAIL · 단 **refund-retry-qris 는 미실행**, partial-refund-anytime 선실패로 `set -e` 조기 종료)

## 1. Rebase 수행

- base `origin/main` 최신 pull: `181a532 feat(pos): QRIS × split tender R1 (#248)` (#248 squash 머지 확인)
- 명령: `git rebase --onto origin/main b76eb0f feat/m0-1105-bt-qris-split-refund-retry`
  - `b76eb0f` = #248 마지막 커밋 (M0-1105-BV)
- 충돌: 없음 · 2 커밋 clean 재적용
- `git push --force-with-lease` 성공

### Before → After (branch 상단 3개)

**Before** (46e3f2d · 5 커밋 ahead of 이전 main):
```
46e3f2d test(pos): M0-1105-BW · test:integration:pos auto-discovery
fd375ce feat(pos): QRIS × split tender R2 — /refund-retry (M0-1105-BT)
b76eb0f fix(pos): #248 R0 CHANGES REQ3 — expired QRIS late-paid (M0-1105-BV)
7a58622 fix(pos): tender append 매치 (M0-1105-BS #BS-d)
7a232ed feat(pos): QRIS × split tender R1 (M0-1105-BS)
```

**After** (2083c54 · 2 커밋 ahead of origin/main 181a532):
```
2083c54 test(pos): M0-1105-BW · test:integration:pos auto-discovery
195dc08 feat(pos): QRIS × split tender R2 — /refund-retry (M0-1105-BT)
181a532 feat(pos): QRIS × split tender R1 (M0-1105-BS) (#248)   ← origin/main
```

#248 커밋 3개 (7a232ed · 7a58622 · b76eb0f) 는 squash 결과물 181a532 와 동치로 흡수 · 제거됨.

## 2. PR Changed Files (R2 전용 확인)

`git diff --name-only origin/main...HEAD`:
```
apps/commerce-core/integration-tests/pos/refund-retry-qris.spec.ts       (BT · 신규 테스트)
apps/commerce-core/package.json                                          (BW · test:integration:pos 스크립트 교체)
apps/commerce-core/scripts/test-integration-pos.sh                       (BW · 신규 auto-discovery)
apps/commerce-core/src/api/admin/pos/_shared/xendit-refund.ts            (BT · 이중환불 가드)
apps/commerce-core/src/api/admin/pos/orders/[id]/refund-retry/route.ts   (BT · mode 분기)
apps/commerce-core/src/api/hooks/payment/xendit/route.ts                 (BT)
docs/feature-map.yaml                                                    (BT/BW · processes 등록)
```

→ R2 파일만 남음 · R1 (#248 범위) 파일 1건도 안 보임.

## 3. CI run (job 이름별)

Run `43562998737` (push 완료 `2026-11-14T05:44Z`):

| Job | Conclusion |
|---|---|
| changes-filter | ✅ success |
| markers-and-forbidden | ✅ success |
| unit-commerce-core | ✅ success |
| **pos-integration** | ❌ **failure** |
| feature-map-check | ✅ success |
| docker-smoke-wing | ⏭️ skipped |
| docker-smoke-commerce-core | ⏭️ skipped |
| docker-smoke-anchor | ⏭️ skipped |
| wrangler-check-care-agent | ⏭️ skipped |

### pos-integration 실패 상세

auto-discovery 스크립트가 `integration-tests/pos/*.spec.ts` 를 알파벳 순으로 돌리다 세 번째에서 조기 종료:

| # | Spec | 결과 |
|---|---|---|
| 1 | open-order-reservations | PASS (5/5) |
| 2 | p6-e2e | PASS (10/10) |
| 3 | partial-refund-anytime | **FAIL** (1 failed · 2 passed) ← `set -e` HALT |
| 4~ | …refund-retry-qris 포함 **미실행** | — |

실패 테스트:
```
M0-1105-BF · 부분 환불 언제든 · 미출고 품목 취소
  › #BF-2 혼합 (A fulfilled · B unfulfilled) · 두 라인 환불 → A restore · B reservation release · items[].disposition 분기
  at integration-tests/pos/partial-refund-anytime.spec.ts:506:24
```

**판정**:
- **BT R2 자체 코드 결함 아님** — refund-retry-qris 는 실행되지 않음 (7건 검증 실패가 아님).
- `partial-refund-anytime.spec.ts` (M0-1105-BF) 는 BT R2 가 건드린 파일이 아님 (changed-files 목록에 부재). **main 에 선존재하는 regression 가능성** 이 큼 · 혹은 BW auto-discovery 로 **처음 편입되어 silent-drop 이 드러난 경우** 가능성.
- 다음 티켓 (BY 등) 에서 ① main 에서 partial-refund-anytime 가 PASS 하는지 선확인 ② 그 후 refund-retry-qris 7건 PASS 여부 재검증 필요.

## 4. 금지사항 준수

- 코드 변경 0 (rebase 재적용만)
- PR 머지 안 함
- force-push 는 `--force-with-lease` 로만 수행
- Monitor · /loop · 예약 깨우기 · 실 Xendit · 운영 SSH/DB · 허브 폴더 밖 쓰기 — 모두 미사용
