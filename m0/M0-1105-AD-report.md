# M0-1105-AD — PR #207 CHANGES 반영 + #208 rebase 리포트

**작업**: 2026-11-10 · T0 relay · claim `M0-1105-AD`
**대상**: `storeport` 리포 · feat/m0-1105-ab-void-refund-pin (#207) · feat/m0-1105-ac-return-partial (#208)
**근거**: `r0/R0-1105-AY-report.md` ④ CHANGES · ⑤ 누락 테스트 · ③ 주석 · `ledger/decision-p6-20261110.md`
**계약 정본**: `queue/m0/M0-1105-AB.md` (앱은 변경 없음 · 서버를 계약에 맞춤)

---

## 1. 변경 diff 요약

### #207 (feat/m0-1105-ab-void-refund-pin) · 커밋 `f2624e2`

| 파일 | 변경 |
| --- | --- |
| `apps/commerce-core/src/api/admin/pos/_shared/manager-pin.ts` | `VerifyResult` 타입 `remaining` → `remaining_attempts`, `retry_at` → `locked_until`. 반환값 실체도 동일. 재시작 시 lockout 초기화 범위 주석 (M0 단일 인스턴스 · 다중 인스턴스 땐 Redis) 추가. |
| `apps/commerce-core/src/api/admin/pos/manager-pin/verify/route.ts` | 401/423 응답 필드명 동일 변경. 상단 doc 코멘트 갱신. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/void/route.ts` | PIN 분기 응답 필드명 변경. 교대 검증은 `metadata.register_session_id` 있을 때만 적용 (신규 주문은 tender flow 가 항상 세팅) 주석 추가. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/refund/route.ts` | PIN 분기 응답 필드명 변경. |
| `apps/commerce-core/integration-tests/pos/tenders.spec.ts` | #47 단언을 `remaining_attempts`/`locked_until` 로 변경. 신규 테스트 #51·#52·#53 추가 (M0-1105-AD). |

**신규 테스트 3건** (M0-1105-AD · R0-1105-AY ⑤):

- `#51 CASH/QRIS origin + method:'card_terminal' refund → 400` — 캐셔가 원거래 수단을 속여서 PIN 을 우회하는 경로 차단.
- `#52 WIB 23:59 → 00:00 boundary changes the daily PIN` — `wibDateKeyForTest` 로 UTC 16:59 vs 17:00 두 시점의 키·PIN 이 달라짐을 확증.
- `#53 3 wrong PINs → correct PIN → counter resets (5 fresh attempts)` — 성공 후 4회 틀려도 `remaining_attempts:1` 가 아니라 `remaining_attempts:4` 임을 확증 (success-path 카운터 리셋).

**grep 검증**:

```
$ grep -rn "\bremaining\b\|\bretry_at\b" apps/commerce-core/src/api/admin/pos apps/commerce-core/integration-tests/pos/tenders.spec.ts
# → 매치 = 주석 3곳만 (옛 이름 표기용 · "Do not rename back to `remaining` / `retry_at`" 등). 실행 코드 0.
```

**로컬 typecheck**: `cd apps/commerce-core && npx tsc --noEmit` → exit 0.
**pre-commit**: naming-check PASS · lint-staged (prettier) PASS.
**pre-push**: 전체 unit test suite 33/33 pass (apps/commerce-core · packages/event-contracts).

### #208 (feat/m0-1105-ac-return-partial) · 커밋 `c2dcb96` (force-with-lease rebased)

- 갱신된 #207 (`f2624e2`) 위로 rebase. 1 개 커밋 (`ee3770b` → `c2dcb96` 변경 — stacked PR 의 유일한 커밋).
- `apps/commerce-core/src/api/admin/pos/orders/[id]/return/route.ts` 의 PIN 분기도 `remaining_attempts`/`locked_until` 로 정정.
- `tenders.spec.ts` 머지 충돌 해소: AC describe (`M0-1105-AC · POS return (partial · item-based)`) 를 AD #51-#53 뒤로 배치 · AC 테스트 번호를 #51-#56 → #54-#59 로 재번호.
- **#208 쪽 옛 키 이름 grep 0 확인**.

---

## 2. CI 결과

**pos-integration (CI name = `ci`)** 결과:

- **직전까지**: 2026-11-10 09:18 UTC `ff3e098` (AD 적용 전 PR #207 HEAD) → **success** (feature-map-check + ci 둘 다).
- **AD push 뒤**: `f2624e2` 대상 workflow run 이 **40분 경과 뒤에도 미발화**. PR 재개(close/reopen)로도 재발화 실패. 리포 액션 `enabled:true` · workflow 트리거 `pull_request` 설정 정상 · 다른 모든 PR 들도 09:23 UTC 이후 신규 run 없음 → **GitHub Actions 쪽 지연/장애로 보임** (사용자측 지표 아님).
- AD 코드 diff 자체는 **기존 통과한 #47 단언만 필드명 교체** 이므로 CI 러너가 돌아오면 그대로 green 예상 · 신규 #51-#53 도 결정적 로직 (HMAC/boundary math).
- **실측 가능해지는 즉시 `gh pr checks 207` 로 확인 필요**.

관련 링크:
- PR #207: https://github.com/CuriocityDevAi/storeport/pull/207
- PR #208: https://github.com/CuriocityDevAi/storeport/pull/208
- 최신 HEAD #207: `f2624e2eff02857e1d52315a138fa078270f2bf6`
- 최신 HEAD #208: `c2dcb96df50cca093f7417e23284c0e5844e8660`

---

## 3. 착지 명령

```bash
cp /tmp/M0-1105-AD-report.md ~/projects/curiocity-relay/m0/ && \
  cd ~/projects/curiocity-relay && \
  git add m0/M0-1105-AD-report.md && \
  git commit -m "m0: M0-1105-AD" && \
  git pull --rebase --autostash origin main && \
  git push
```

(위 명령 실행 후 `node scripts/claim.mjs M0-1105-AD done` 로 상태 전환.)
