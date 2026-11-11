# M0-1105-AF · #207 main 충돌 해소 rebase → #208 이어서 rebase · CI 초록

- 작업 시작 2026-11-11T02:32:39Z · 착지 보고 작성 시점 ≈ UTC 02:47
- 트랙: M0 (hub T0)
- 브랜치: `feat/m0-1105-ab-void-refund-pin` (#207) · `feat/m0-1105-ac-return-partial` (#208)
- 새 HEAD **#207 = 0dcb97a** · **#208 = 4761c14**

## 1. 충돌 표 (git rebase origin/main · 4커밋 중 2번째에서 발생)

| 파일 | 양쪽 내용 요약 | 해소 | 근거 |
| --- | --- | --- | --- |
| `apps/commerce-core/integration-tests/pos/tenders.spec.ts` | **ours(origin/main)**: #206 M0-1105-Z delivery 테스트 #44~#46 + #45a/#45b/#45c (recipient_name · phone · address_lines 400 English 가드 + takeaway 무시). **theirs(3849bc2)**: `describe("M0-1105-AB · POS void / refund / manager-pin")` 블록 + 테스트 #44~#50 흡수 + 파일 상단 helper 삼종 (`crypto` · `PIN_SECRET_FOR_TEST` · `wibDateKeyForTest` · `computePinForTest`) + import 확장 (`ensureBaseSeed`). | **양쪽 다 보존.** 외부 describe 안에 ours 의 M0-1105-Z 테스트 #44~#46 (서브넘버 #45a/#45b/#45c 포함) 를 그대로 두고, 바로 이어 theirs 의 전체 `describe("M0-1105-AB ...")` 블록 (#44~#50) 를 추가. 파일 최상단 import/helper 섹션도 theirs 쪽 블록 (crypto · ensureBaseSeed · PIN 상수/함수) 를 전부 복원 (초기 1차 수동 머지에서 누락 → CI pos-integration 10 실패 원인 `ReferenceError: ensureBaseSeed is not defined` → `git commit --fixup=5da3add` + `git rebase -i --autosquash` 로 5da3add 커밋에 접어 넣음). | `#205 fulfill` 은 main 에 이미 선반영 (ade942a) · `#206 delivery` 는 ours 쪽의 `#44~#46` 테스트 체계와 fixtures/route/receipt 전부 포함 → 양쪽 번호 체계가 중첩되므로 M0-1105-Z 는 outer describe 직속, M0-1105-AB 는 내부 describe 아래로 분리해서 공존. |
| `apps/commerce-core/integration-tests/pos/void-refund.spec.ts` | 자동 제거 (3849bc2 가 tenders.spec 으로 흡수). | git 자동 (unmerged 아님) · 그대로 승인 (#206 은 이 파일 미접촉). | 충돌 아님. |

- **범위 외 미접촉 상속**: `apps/commerce-core/src/api/admin/pos/orders/[id]/tenders/route.ts` · `apps/commerce-core/src/api/admin/pos/orders/[id]/route.ts` · `apps/commerce-core/src/modules/receipt/service.ts` · fixtures `m0-1105-z-delivery.*.json` — 전부 #206 범위, rebase 에서 자동 상속.
- #207 의 나머지 3 커밋 (534c99c · b4e5371 · 0dcb97a) 은 추가 충돌 없이 clean replay.

## 2. 테스트 · CI 결과

### 로컬

| 명령 | 결과 |
| --- | --- |
| `pnpm --filter commerce-core typecheck` | **PASS** (0 error) |
| `pnpm --filter commerce-core test` (unit) | **PASS** · 5 suites · **33/33 tests** |
| 저장소 전체 `pnpm -r typecheck` | **4/5 PASS** · apps/wing 단독 실패 `components/ui/button.tsx:50 TS2786 ButtonPrimitive` · 이 PR 미접촉 · origin/main 에서도 동일 재현 → **pre-existing · 회귀 0** |
| `pnpm -r test` | **PASS** · care-agent/wing (no tests yet) · `packages/event-contracts` 21/21 · `apps/commerce-core` 33/33 |
| `pnpm test:integration:pos` | 로컬 `.env` 미구성으로 미실행 · CI 로 판정 |

### CI (`gh pr checks`)

- **PR #207** (`0dcb97a` · run 42947917849): `pos-integration` **PASS 2m15s** · `changes-filter` PASS 7s · `check` PASS 13s · `markers-and-forbidden` PASS 9s · `docker-smoke-*` · `wrangler-check-*` skipping (경로 필터).
- PR #207 1차 push (`951f8e8` · run 42947237408): `pos-integration` FAIL 2m14s · `ReferenceError: ensureBaseSeed is not defined` at `tenders.spec.ts:2567` → 10 failed / 49 passed (#44~#53) · import/helper 복원 fixup 뒤 2차 push 에서 **전부 PASS** 로 회복.
- **PR #208** (`4761c14`): CI 미발화. 설계상 정상 — `.github/workflows/ci.yml` 의 `pull_request.branches: [main]` 트리거 때문에 base 가 `feat/m0-1105-ab-void-refund-pin` 인 #208 에는 발화하지 않음. #207 머지로 base 가 main 으로 바뀌면 자동 발화.

## 3. PR 본문 갱신

- **#207** 본문 끝에 `§7 M0-1105-AF rebase 충돌 해소 (2026-11-11)` 섹션 추가 (상황 · 해소 1건 · 삭제 1건 · 범위 외 미접촉 · 로컬 검증 · 새 HEAD).
- **#208** 본문 끝에 `M0-1105-AF rebase stacked follow-up (2026-11-11)` 섹션 추가 (base · 충돌 0 · 새 HEAD · CI 미발화 설계 설명).

## 4. 이연 (Deferred) 순증감

- **이연 0건 신설 · 0건 소멸.**
- 사전 이연 항목 중 이번 작업으로 영향 받은 것 없음 (rebase 범위는 테스트 파일 · import 복원에 한정).

## 5. 착지 명령 (relay repo)

```
cp /tmp/M0-1105-AF-report.md ~/projects/curiocity-relay/m0/ \
  && cd ~/projects/curiocity-relay \
  && git add m0/M0-1105-AF-report.md \
  && git commit -m "m0: M0-1105-AF" \
  && git pull --rebase --autostash origin main \
  && git push
```

이후: `claims/M0-1105-AF.json` → `done`.

## 6. 상시 체크리스트 재확인

- `git fetch origin` ✓
- 운영 SSH · railway CLI · 운영 DB · 키체인 전부 **미접촉**.
- /loop · 예약 깨우기 · 백그라운드 대기 **미사용**.
- 커밋/push 묻지 않고 즉시 실행 (rebase 뒤 `--force-with-lease` 2회) ✓
- **#207 머지하지 않음** (R0 재확인 뒤 오케가 머지).
- 45 분 한도 내 완결 (CI 초록까지).
