# M0-1128-C — PASS · fork PR #299 · 리허설 ① 그린 + 검증의 검증 통과

**결과**: PASS · fork PR https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/299 (head `e758787`)

## 리허설 표

| # | 대상 | 리허설 run | storeport SHA | case1 | case1b | sequential | 결과 |
|---|---|---|---|---|---|---|---|
| ① | 이 브랜치(`fix/M0-1128-C-test-typing-aria`) + storeport main 최신 (= mirror) | [46097668801](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46097668801) (초기 fix) · [46098329192](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46098329192) (검증의 검증 원복) | mirror sha: `9cd3bc5541191e6d81804628e96da81dc914acdd` (storeport main #486 HEAD) | PASS | PASS | PASS | 🟢 GREEN |
| ② | fork#294 head + 이 커밋 | — (스킵: `fork_sha` 입력은 단일 SHA checkout 이라 rebase 조합 불가 · 자동화되지 않음) | — | — | — | — | **머지 뒤 M3 가 rebase 할 것으로 유예** |
| ③ | fork#291 head + 이 커밋 | — (동일 사유) | — | — | — | — | **머지 뒤 M3 가 rebase 할 것으로 유예** |

주: 워크플로 `e2e-cd-pos` 의 "Playwright · 리허설 케이스 (case1·case1b 최소 · glob)" 단계는 `case1-mutation*` 를 제외한 `e2e/cd-pos/*.spec.ts` 를 모두 실행하므로 case1·case1b·sequential 세 스펙이 한 run 에서 함께 검증됐다.

## 변경 (fork)

- `e2e/cd-pos/case1.spec.ts:107` 만 변경 — 앱/워크플로/다른 e2e 미터치.
- `entering phone <PHONE>\b` → `\btyping <PHONE>\b` (전체 번호 정확 일치 유지 · 느슨하지 않음).
- `prefix = "#N · "` 또는 `""` 두 경우 모두 커버 (`CustomerPhoneStatus.tsx:269` 이 생성).

```
diff --git a/e2e/cd-pos/case1.spec.ts b/e2e/cd-pos/case1.spec.ts
--- a/e2e/cd-pos/case1.spec.ts
+++ b/e2e/cd-pos/case1.spec.ts
@@ -100,13 +100,15 @@ test.describe("Case 1 · 결제 후 번호 입력 → Confirm → 적립", () =>
       await cdPage.waitForTimeout(200);
     }
-    // POS 칩 ⑤ typing — 서버 스냅샷 기반 aria-label 로 검증.
-    // UI 표시 형식(점·마스킹·#N prefix) 가정 없이, 서버가 아는 phone 이
-    // 손님이 누른 번호(PHONE) 와 같음을 확인.
+    // POS 칩 ③ typing — 서버 스냅샷 기반 aria-label 로 검증.
+    // 명세(relay specs/screens/pos-payment-flow.md:30 ③): state='entering' · phone.length>0
+    //   → aria-label = `${prefix}typing ${partial}` (CustomerPhoneStatus.tsx:269).
+    //   prefix = `#N · ` 또는 `` (posOrderNum 미세팅 시). 어느 쪽이든 `typing <phone>`
+    //   리터럴이 포함돼야 하므로 `\btyping <PHONE>\b` 경계 매치로 좁힘(느슨하지 않음 · 전체 번호 정확 일치).
     const chipTyping = posPage.getByTestId("cd-phone-status").filter({ visible: true }).first();
     await expect(chipTyping).toHaveAttribute(
       "aria-label",
-      new RegExp(`entering phone ${PHONE}\\b`),
+      new RegExp(`\\btyping ${PHONE}\\b`),
       { timeout: T.visible },
     );
```

## 기대값 출처 대조 (Step 1)

명세 (relay `specs/screens/pos-payment-flow.md:28~33`, 6 상태 표):

| # | 상태 | 조건 | 색/배지 | 문구 |
|---|---|---|---|---|
| ① | `ask` | `state='none'` · `actions⊇['ask']` | 회색 테두리 | `#N · Ask phone` |
| ② | `waiting` | `state='entering'` · `phone` 없음 | 회색 · 점 3개 | `#N · Waiting` + dots |
| ③ | **`typing`** | **`state='entering'` · `phone.length>0`** | **파랑 · 점 3개** | **`#N · <phone>` + dots (실시간)** |
| ④ | `done` | `state='confirmed'` · `actions⊇['reenter']` | 초록 · 체크 | `#N · <phone>` · Re-enter |
| ⑤ | `skipped` | `state∈{'skipped','unconfirmed'}` | 회색 | `#N · Skipped` + Ask again |
| ⑥ | `busy` | `locked=true` | 노랑 · 자물쇠 | `Display · #M entering` |

구현 (`fork/components/customer-display/CustomerPhoneStatus.tsx:260–278`):

```ts
if (flow.state === 'entering' || flow.state === 'first_visit') {
  const partial = flow.phone ?? '';
  const numLabel = posOrderNum != null ? `#${posOrderNum}` : '';
  const prefix = numLabel ? `${numLabel} · ` : '';
  // aria-label = partial ? `${prefix}typing ${partial}` : 'Waiting for customer'
  accessibilityLabel={partial ? `${prefix}typing ${partial}` : 'Waiting for customer'}
```

→ 단계별 기대 aria-label 표:

| 단계 | 조건 | aria-label (실측 · 명세) |
|---|---|---|
| 입력 전 (② Waiting) | `state='entering'` · `phone=''` | `Waiting for customer` |
| ③ typing | `state='entering'` · `phone='0813…0000'` · posOrderNum 세팅됨 | `#<N> · typing 0813804420000` |
| ③ typing | 동일 · posOrderNum 미세팅 | `typing 0813804420000` (현재 실제 CI 수신값) |
| confirming | `state='confirming'` · `phone='…'` | `Awaiting customer confirm for <phone>` |
| ④ confirmed | `state='confirmed'` | `Customer confirmed: <phone>[ earned <n>]` |

판정: **앱 = 명세 일치 (`typing <phone>`)** · **테스트 기대값만 옛 것 → 테스트만 수정**.

## 검증의 검증 (Step 4) — 실행 · 통과

1. 커밋 `6dc1e59` — 기대값 `\\btyping <PHONE>\\b` → `\\bentered <PHONE>\\b` (일부러 틀림).
2. run [46098024290](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46098024290) = **failure (기대대로 빨강)** — "Playwright · 리허설 케이스" 단계 exit code 1.
3. 커밋 `e758787` — 원복 (`typing` 복귀).
4. run [46098329192](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/46098329192) = **success (원복 확인)**.

→ 어설션이 느슨하지 않음을 실제 CI 로 입증. `typing` 리터럴이 실제로 요구됨 (단순 번호 포함 매치가 아님).

## precheck 요약 (Step 2)

```
 precheck 요약  PASS=5  FAIL=0
  PASS: 머지 여부 (현재 브랜치는 미머지)
  PASS: origin/master 충돌 없음 · 최신 상태
  PASS: lint (소스 변경 없음 — 스킵)
  PASS: typecheck (TS 변경 없음 — 스킵)
  PASS: 단위 테스트
✅ 모든 검사 PASS
```

## 충돌·배타성 확인

- `grep -rn "entering phone" e2e/` → `e2e/cd-pos/case1.spec.ts:107` 만 (sequential.spec.ts 의 `entering phone` 은 한글 주석 "without entering phone" 이라 테스트 어설션과 무관). **다른 어설션 없음**.
- `e2e/cd-pos/case1b.spec.ts`, `e2e/cd-pos/sequential.spec.ts`, `e2e/cd-pos/case1-mutation-skip-confirm.spec.ts` — `aria-label` 어설션에 `entering phone`·`typing` 패턴 없음 (case1b 는 Re-enter keypad 재오픈만 어설트 · sequential 은 `/Ask phone on display/` 만).
- M3-1128-E (영수증 진단) 및 다른 허브 fork e2e 미터치.
- case1b Re-enter 게이트 그대로.

## 머지 안내 (오케)

- 이 PR 은 `e2e-cd-pos` 가 Required 가 아닌 **정보용 체크** (ci.yml/lint.yml 과 분리 · `fork e2e-cd-pos.yml` 상단 주석). mergeable `UNSTABLE` 는 e2e-cd-pos 비차단성 표기.
- 리허설 ① GREEN + 검증의 검증 적중 → **오케 머지 가능**.
- 머지 후 M3 가 fork#294·#291 을 rebase 해 ②③ 리허설 수행 (단일 SHA checkout 인 `fork_sha` 입력으로는 두 브랜치 head + 이 커밋 조합이 불가 · rebase 필요).

## 산출물

- 브랜치: `fix/M0-1128-C-test-typing-aria` (3 commits · 순 1 파일 · +6 −4)
- PR: fork #299 (head `e758787f4e74ddb72871bb4413cf62ba5d7decbd`)
- 리허설 ① run: 46097668801 (초기 fix · PASS) · 46098024290 (검증 빨강 · FAIL as expected) · 46098329192 (원복 · PASS)
- 상시 조항 ⓒ 적용.

## 시간

- 40분 상한 · 실제 소요 ≈ 11분 (fix 3min + 검증 3min + 원복 3min + 리뷰·보고 ~2min).
- `/loop` · 예약 깨우기 미사용.
