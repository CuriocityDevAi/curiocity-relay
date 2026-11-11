# R0-1105-BG 보고서

## 판정: ✅ APPROVE

---

## ① 영수증 폭 실측 (Playwright 직접 재측정)

| 뷰포트 | success 영수증 | orders detail 영수증 | diff |
|--------|---------------|---------------------|------|
| iPad landscape 1194×834 | 420px | 420px | **0.0px** ✅ |
| iPad portrait 834×1194 | 420px | 420px | **0.0px** ✅ |

- 측정 방법: `scripts/m1-1105-ao-playwright.mjs` AO1 어설션 직접 실행 (31/31 passed).
- 근거: `components/receipt/ReceiptSection.tsx` 도입 — `maxWidth: 420, width: '100%', alignSelf: 'center'`.
  두 화면(success + orders detail) 동일 래퍼 사용 → 폭 자동 일치.
- `SuccessReceiptAnim.tsx`: `"relative items-center"` 제거 확인 (`SRC1` ✓) · Animated.View `width: '100%'` 추가.

스크린샷: `screenshots-m1-1105-ao/01-success-ipad-landscape-receipt-width.png` · `02-…portrait…`.

---

## ② 머리줄 제목 (경로 노출 0)

### Stack.Screen 타이틀 목록

| 화면 | 파일 | 타이틀 | 판정 |
|------|------|--------|------|
| checkout/success/[orderId] | `app/checkout/success/[orderId].tsx:118` | `` `Order #${displayId}` `` (로딩 중 `''`) | ✅ |
| checkout/tender-cash/[draftOrderId] | `app/checkout/tender-cash/[draftOrderId].tsx:192` | `` `Order #${displayId}` `` (로딩 중 `''`) | ✅ |
| checkout/delivery/[draftOrderId] | `app/checkout/delivery/[draftOrderId].tsx:37` | `'Delivery'` | ✅ |
| checkout/[draftOrderId] | `app/_layout.tsx:78` | `headerShown: false` | ✅ |
| orders/[orderId] · product-details · customer-lookup | `app/_layout.tsx:95,107` | `headerShown: false` (모달) | ✅ |
| Products / Orders / Cart / Scan / Settings (탭) | `app/(tabs)/_layout.tsx` | 각 고정 영문 | ✅ |
| +not-found | `app/+not-found.tsx:9` | `'Oops!'` | ✅ |

### Playwright 렌더 헤더 텍스트 (AO2)

```
iPad landscape: document.title = "Meros POS"  → "[" 없음 ✓ · "/" 없음 ✓
iPad portrait:  document.title = "Meros POS"  → "[" 없음 ✓ · "/" 없음 ✓
```

grep 전체 — `Stack.Screen` title 에 `[` 또는 `/` 포함 행: **0건** ✅

---

## ③ 현금 빠른 버튼 규칙 대조

### 원장 확정 규칙 vs 구현 (`lib/cash-quick-buttons.ts`)

| 항목 | 원장 | 구현 | 판정 |
|------|------|------|------|
| 버튼 A | `ceil(total/50,000)×50,000` | `Math.ceil(total/50_000)*50_000` | ✅ |
| 버튼 B | `ceil(total/100,000)×100,000` | `Math.ceil(total/100_000)*100_000` | ✅ |
| 멱등 | 여러 번 눌러도 같은 값 | 순수 함수 (상태 없음) · Playwright AO6 확인 | ✅ |
| 두 값 같으면 하나만 | B만 표시 | `showA = a!==total && a!==b` | ✅ |
| total이 배수면 그 버튼 숨김 | 숨김 | `showA = a!==total` / `showB = b!==total` | ✅ |
| 버튼 글자 = 실제 금액 | 눌렀을 때 들어갈 금액 | formatIDR(buttons.a/b) 표시 | ✅ |
| 고정 50k/100k 버튼 제거 | 제거 | `const PRESETS` 없음 (`SRC4` ✓) | ✅ |
| Exact 버튼 제거 | 제거 | `testID="cash-exact"` 없음 (`SRC4` ✓) | ✅ |
| received < total → Process 꺼짐 | 유지 | 기존 로직 그대로 | ✅ |

### 단위 테스트 (vitest `__tests__/cash-quick-buttons.test.ts`) — 6/6 passed

| 케이스 | 기대값 | 결과 |
|--------|--------|------|
| 68,200 (ceil÷50k=100k, A=B → A숨김) | `{a:null, b:100000}` | ✅ |
| 99,000 (동일 패턴) | `{a:null, b:100000}` | ✅ |
| 120,000 | `{a:150000, b:200000}` | ✅ |
| 150,000 (a=total → 숨김) | `{a:null, b:200000}` | ✅ |
| 100,000 (둘 다 =total) | `{a:null, b:null}` | ✅ |
| 멱등 (68,200 × 2회) | 동일 결과 | ✅ |

---

## ④ run-all 실패 3건 분류

| 스크립트 | 실패 테스트 | PR 브랜치 | master | 분류 |
|----------|------------|-----------|--------|------|
| m3-1105-ad-assertions.mjs | verify 401 · {reason:'mismatch'} / verify 423 · {reason:'locked'} | 2 FAIL | 2 FAIL (동일) | 낡은 어설션 (stale) |
| m3-1105-ae-assertions.mjs | kind='void' 도 refund_watermark 표시 | 1 FAIL | 1 FAIL (동일) | 낡은 어설션 (stale) |
| m3-1105-d-assertions.mjs | Hand over 레이블 / Send to production / Pack | 3 FAIL | 3 FAIL (동일) | 낡은 어설션 (stale) |

- PR 브랜치 m3-1105-d: 총 28개 (master는 27개) — PR이 테스트 1개 추가 + PASS.
- 진짜 회귀: **없음**.
- 환경 오류: **없음** (모든 실패 script-level · 소스 grep 기반 · runtime 없음).

---

## ⑤ raw hex · 영어 · 충돌

| 항목 | 결과 |
|------|------|
| raw hex / 제어문자 | 없음 ✅ |
| 영어 전용 | 한국어는 주석(`//` · `{/* */}`)에만 · UI 문자열 전부 영어 ✅ |
| master 충돌 | `mergeable: MERGEABLE` ✅ |

---

## ⑥ storeport #209 CI 재확인

```
gh pr checks 209 (run #42984907941)
pos-integration  pass  2m31s  ✅
check            pass  11s    ✅
markers-and-forbidden  pass  9s  ✅
```

이전 2회 연속 실패(R0-1105-BF에서 flaky 환경 분류)와 달리 이번 run은 **PASS**. 코드 결함 없음 확인.

---

## 체크 표

| # | 항목 | 판정 |
|---|------|------|
| ① | 영수증 폭 차이 ≤2px (landscape + portrait) | ✅ diff 0.0px |
| ② | 헤더 "Order #N" · "[" "/" 없음 | ✅ |
| ③ | 현금 버튼 확정 규칙 완전 준수 · 단위 6/6 | ✅ |
| ④ | 실패 3건 = stale (master 동일) | ✅ 회귀 없음 |
| ⑤ | raw hex 0 · 영어 전용 · mergeable | ✅ |
| ⑥ | storeport #209 pos-integration | ✅ PASS |

---

## 실행 로그

```
# PR branch: pos-m1 (fix/m1-1105-ao-checkout-polish)
# master baseline: agilo-fork-test

# ① 폭 실측 (Playwright)
cd ~/projects/pos-m1 && node scripts/m1-1105-ao-playwright.mjs
→ AO1 iPad landscape diff=0.0px ✓ · AO1 iPad portrait diff=0.0px ✓
→ 31/31 passed

# ③ 단위 테스트
cd ~/projects/pos-m1 && npx vitest run __tests__/cash-quick-buttons.test.ts
→ 6/6 passed

# ④ run-all PR 브랜치
cd ~/projects/pos-m1 && node scripts/run-all.mjs assertions
→ 총 31개 · 28 PASS · 3 FAIL (m3-1105-ad/ae/d)
(+ playwright 포함 run-all: 총 57개 · 54 PASS · 3 FAIL)

# ④ 실패 스크립트 master 비교
cd ~/projects/agilo-fork-test && node scripts/m3-1105-ad-assertions.mjs → 2 FAIL (동일)
cd ~/projects/agilo-fork-test && node scripts/m3-1105-ae-assertions.mjs → 1 FAIL (동일)
cd ~/projects/agilo-fork-test && node scripts/m3-1105-d-assertions.mjs  → 3 FAIL (동일)

# ⑤ mergeable
gh pr view 85 --json mergeable → MERGEABLE

# ⑥ storeport #209
gh pr checks 209 --repo CuriocityDevAi/storeport
→ pos-integration pass (run #42984907941 · 2m31s)
```

---

## 이연 순증감

- 이연 없음.

---

## 착지 명령

```bash
cp /tmp/R0-1105-BG-report.md ~/projects/curiocity-relay/r0/ && cd ~/projects/curiocity-relay && git add r0/R0-1105-BG-report.md && git commit -m "r0: R0-1105-BG" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs R0-1105-BG done "fork#85 APPROVE · 폭 420/420 diff=0 · 헤더 경로 노출 0 · 현금 규칙 6/6 · run-all 54/57(stale 3=master동일) · #209 pos-integration PASS"
```
