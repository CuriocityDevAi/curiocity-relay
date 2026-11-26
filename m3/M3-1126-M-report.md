PASS 3503ead e2e 12/12 ×3

## 결과 요약

- 브랜치: `feat/M3-1126-K` (PR [#276](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/276))
- 커밋: `3503ead fix(e2e): M3-1126-M — V4-7/V4-8 보존 테스트 하네스 + 12/12 안정화`
- 로컬 Playwright: `e2e/flows/M3-1126-K-phone-status.spec.ts` · **12/12 pass × 3회 연속**.
- CI 보존 테스트: `scripts/m3-1126-k-phone-status-playwright.mjs` · 32/32 pass 로컬.

## [REQ 0] master 머지 + #274 보존 확인

```
$ git fetch origin && git merge origin/master
Merge made by the 'ort' strategy.
 app/(tabs)/_layout.tsx              |   8 +-
 app/product-details.tsx             |   2 +-
 e2e/flows/M3-1126-H-tabbar-...spec  (신규)
 e2e/screenshots/M3-1126-H-*.png     (신규 11장)
 15 files changed, 344 insertions(+), 4 deletions(-)
```

`feat/M3-1126-K` → `origin/master` 머지 뒤 `git diff origin/master --stat`:

```
 __tests__/m3-1119-o-cd-emit.test.ts                |   6 +-
 __tests__/m3-1126-k-customer-phone-v4.test.ts      | 141 ++
 api/hooks/customer-flow.ts                         |  85 +
 app/checkout/[draftOrderId].tsx                    |  11 +-
 app/checkout/split-tender/[draftOrderId].tsx       |  11 +-
 app/checkout/success/[orderId].tsx                 |  10 +-
 app/checkout/tender-cash/[draftOrderId].tsx        |  11 +-
 app/checkout/tender-qris/[draftOrderId].tsx        |  11 +-
 app/orders/[orderId].tsx                           |   6 +
 components/cart/CartSheet.tsx                      |  11 +-
 components/customer-display/CustomerPhoneStatus.tsx| 311 +++++---
 components/customer-display/PhoneEntryButton.tsx   |  92 +
 components/customer-display/useAskPhoneOnDisplay.ts|  63 +-
 e2e/flows/M3-1126-K-phone-status.spec.ts           | 300 ++
 e2e/screenshots/M3-1126-K-*.png                    | (9 상태 + 2 뷰포트)
 lib/loyalty-snapshot.ts                            |  15 +
 scripts/m3-1126-k-phone-status-playwright.mjs      | 395 ++
 27 files changed, 1351 insertions(+), 128 deletions(-)
```

- `app/(tabs)/_layout.tsx` · `app/product-details.tsx` · `e2e/flows/M3-1126-H-*` · `e2e/screenshots/M3-1126-H-*.png` **모두 없음** — #274 Sell 탭 글자 가시성·상품 시트 사진 보존 OK.

## [REQ 1] 8건 FAIL 원인 판정

**타이밍 아님 · 하네스(ㄱ) 환경 문제**. 증거:

1. 처음 `npx playwright test` → 4 pass / 8 fail. 실패 패턴은 "Pressable 분기(none-ask·skipped·locked·V4-7·orientation)" 쪽이라 (ㄴ) 코드 문제로 보였음.
2. 동일 조건 diag 하네스에서 state='skipped' 를 보냈을 때 DOM 이 "Not confirmed"(unconfirmed 브랜치 결과)로 떴다. classifyCustomerFlowChip 매핑과 완전 일치:
   - state='none' → 'hidden' (no render)
   - state='skipped' → 'not_confirmed' ("Not confirmed")
   - state='entering'+locked → 'typing' (lock 무시)
3. 현재 소스 `CustomerPhoneStatus.tsx` 는 `flow.state === 'skipped'` 분기(line 339)에서 "Skipped" + aria "Customer skipped phone entry" 를 반환 · 코드는 맞다.
4. 번들 grep: `dist/_expo/static/js/web/__common-*.js` 에 `"entering…"`(locked 분기 텍스트) 가 **0건**. 즉 번들은 locked 분기 추가 이전의 CustomerPhoneStatus 로 빌드돼 있었음.
5. 포트 4321 는 **다른 worktree(pos-r0)의 `node serve dist` 프로세스가 선점** 중이었고 playwright.config 의 `reuseExistingServer: !process.env.CI` 때문에 Playwright 가 그 stale bundle 에 접속.
6. 해당 프로세스 종료 + `npx expo export -p web` 재빌드 + 동일 diag 재실행 → `cd-phone-status` DOM 이 **네 상태 모두 정상** 렌더 ("Ask phone" · "Waiting for customer" · "Skipped\nAsk again" · "#? entering…").
7. `CI=1 npx playwright test` 로 본 spec 재실행 → **10/12 pass**. 남은 2 FAIL(V4-7 success 화면)은 `[pageerror] Cannot read properties of undefined (reading 'length')` — 테스트가 넘긴 receipt mock 이 `items`/`tenders`/`labels` 배열 누락이라 `SuccessReceiptAnim` 이 TypeError 를 던져 페이지 전체가 흰 화면이 됐던 것.

**판정**: (ㄱ) 하네스. 소스 수정 불필요. 이후 spec 자체를 다음으로 보강:

- fixture 재사용(`fs.readFileSync('fixtures/pos-receipt-response.json')`)으로 V4-7 success 화면 TypeError 제거.
- `document.fonts.ready` 대기 + 250ms 안정화로 흰 화면 스크린샷 제거.
- 상태별 추가 testID(`cd-phone-status-ask`/`-reenter`/`-ask-again`) 가시성 단언 + locked 상태 aria-label 단언 추가.

## [REQ 2] 12/12 ×3 안정 통과

```
==== Run 1 ====  12 passed (17.5s)
==== Run 2 ====  12 passed (17.5s)
==== Run 3 ====  12 passed (18.0s)
```

7 상태별 1 테스트 + V4-8 Re-enter cancel 1 + V4-7 eligible true/false 2 + portrait/landscape 2 = 12.

각 테스트 어설션 요약:

- V4-8 7상태 — `cd-phone-status` 가시성 + `toContainText(/상태별 텍스트/)` + 보조 testID(`cd-phone-status-ask`/`-reenter`/`-ask-again`) + locked 는 aria-label `/Customer display busy/`.
- V4-7 eligible=true — chip 가시성 + click 시 `POST /admin/pos/orders/:id/phone-entry` 호출 확인(`entryCalls[0] === 'POST'`).
- V4-7 eligible=false — chip 가시성 후 click 시 `toHaveCount(0)` 로 숨김 확인.
- V4-8 Re-enter Cancel — entering + phone_masked 상태에서 `cd-phone-status-cancel` 가시성 + click 시 `POST /admin/pos/customer-flow` body 에 `action === 'cancel_entry'` 포함.
- Orientation — portrait(820×1180) · landscape(1180×820) 양 뷰포트에서 none+ask Ask phone 칩 가시성.

## [REQ 3] CI 필수 체크 경로 연결 (보존 테스트 1호)

- 새 파일: `scripts/m3-1126-k-phone-status-playwright.mjs`
- CI 경로: `.github/workflows/ci.yml` → job `playwright` → `node scripts/run-all.mjs playwright --workers 4` → `scripts/run-all.mjs` 의 glob `/^[a-z0-9-]+-playwright\.mjs$/` 가 신규 파일을 자동 포함.
- 러너 placement: `needs.route.outputs.runs_on` (fork 운영 = curiocity-mac-fork · 과부하 시 ubuntu-latest). timeout 25m.
- 로컬 실행: `node scripts/m3-1126-k-phone-status-playwright.mjs` → **32 passed · 0 failed**.
  - 소스 어설션 10건 (CustomerPhoneStatus v1.4 분기 · PhoneEntryButton eligible=false 사유별 토스트).
  - Playwright 22건: 7상태 가시성+텍스트 (14) · Re-enter Cancel 2 · V4-7 eligible 2 · V4-7 ineligible 2 · 뷰포트 2.
  - 화면 캡처: `../screenshots-m3-1126-k/M3-1126-K-{상태}.png` 9장(글자 보이는 상태 — document.fonts.ready + 250ms wait 뒤 badge 요소 단독 스크린샷) · 뷰포트 2장 · V4-7 chip 1장.
- decision-spec-guard-20261126 §4 "보존 테스트 = 실제 화면 노출 증거" 첫 적용 — testID `cd-phone-status` 가시성 + `innerText` 매치로 "실제 렌더" 증거를 하네스가 CI 에서 재현.

## [REQ 4] 실서버 실측

**불가 — 이유**: 서버 PR #456 (storeport 계약 v1.4) 미머지. `/admin/pos/customer-flow` 및 `/admin/pos/orders/:id/phone-entry` 404 상태라 실측 불가. mock 응답으로만 검증. 서버 머지 후 Kyu 실기로 PR 본문 체크리스트 8개 검수 필요.

## [REQ 5] fireStart v1.3/v1.4 혼재 주석 수정

`components/customer-display/useAskPhoneOnDisplay.ts` fireHint 위 주석을 한 줄로 통일:

```ts
// posAsked 는 v1.3 레거시 classifyPhoneStatus 폴백 전용(15s 로컬 플래그로 snapshot 지연 커버).
// v1.4 customer_flow 가 있으면 CustomerFlowChip 이 state/actions 로 직접 판정 → posAsked 는 미사용.
```

## PR #276 본문 갱신

M3-1126-M 로그·결과·M3-1126-M R0 지적 반영 섹션 추가 (merge 검증 결과 · 8건 FAIL 원인 판정 · 주석 통일 메모). 보존 테스트 하네스 설명 포함. 링크: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/276

## 스크린샷 (9장 — 글자 보이는 상태)

레포의 `e2e/screenshots/`:

- `M3-1126-K-none-ask.png` (Ask phone)
- `M3-1126-K-entering-waiting.png` (Waiting for customer)
- `M3-1126-K-entering-typing.png` (0813 80)
- `M3-1126-K-confirming.png` (Awaiting confirm · 0813 **** 80)
- `M3-1126-K-confirmed-reenter.png` (0813 **** 80 · +Rp 12,345 + Re-enter)
- `M3-1126-K-skipped-ask-again.png` (Skipped + Ask again)
- `M3-1126-K-locked-busy.png` (#? entering…)
- `M3-1126-K-reenter-cancel-visible.png` (entering + Cancel 보이는 순간)
- `M3-1126-K-phone-entry-chip.png` (V4-7 Payment successful 상단 칩)

추가: 뷰포트 샷 `M3-1126-K-viewport-portrait.png` · `M3-1126-K-viewport-landscape.png`.

전부 `document.fonts.ready` 대기 후 badge 요소 단독 캡처(흰 화면 방지).
