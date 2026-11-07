---
round: M2-1105-K
pr:
  fork: agilo-medusa-pos-fork#45
commit: e4e0c66e8fe4da87b604001f1b2b503d48bcf51c
outcome: Maestro iOS 시뮬 현금 결제 플로 템플릿 신설 · CI 전부 green · 미실행 (자격 증명 부재 · 지침 "요청·추측 금지")
kyu_checks: 1 (테스트 계정 확보 후 `npm run sim:test:cash -- -e EMAIL=.. -e PASSWORD=.. -e PRODUCT_TITLE=..` 1 회 실행 → 스샷 + 주문 id 리포트 회부)
ci_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42339789437
ci_duration_s: 326
lint_run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42339789440
lint_duration_s: 46
---

# M2-1105-K · Maestro 현금 결제 플로 템플릿

**일자**: 2026-11-07 · **허브**: M2 (관측/빌드) · **상대 리포**: `agilo-medusa-pos-fork` · **base**: `master = 26b6b78` · **work-queue.md**: #7d

## 1. 산출물 (PR #45)

| 파일 | 변경 | 라인 |
|------|------|------|
| `maestro/pos/sim-cash-flow.yaml` (신규) | 로그인 → Open shift → 상품 → 담기 → Cart → Checkout → Pay → Cash tender → Exact → Process payment → 성공 → 스샷 | 103 |
| `package.json` scripts | `sim:test:cash` 1 줄 | 1 |
| `docs/testing/native-sim.md` | §E 섹션 추가 + §npm scripts 1 줄 | 18 |

**제품 코드 수정 0**.

## 2. testID 소스 (현행 코드 직독)

| 단계 | testID / selector | 파일 |
|------|-------------------|------|
| 로그인 | `loginEmail`, `loginPassword`, "Sign In" | `app/login.tsx` |
| Open shift | "Opening float (IDR)" placeholder, "Open register" | `app/register/open.tsx` |
| 상품 → 담기 | ${PRODUCT_TITLE} 텍스트, "Add to cart" | `app/product-details.tsx` |
| Cart → Checkout | "Cart", "Checkout" | `app/(tabs)/cart.tsx` |
| Pay | `checkout-pay` | `app/checkout/[draftOrderId].tsx:219` |
| Cash tender | `cash-tender-panel`, `cash-exact`, `cash-process` | `components/payment/CashTenderPanel.tsx` |
| 성공 | `payment-success`, `No. R-` 패턴 | `components/payment/SuccessReceiptAnim.tsx:64` · `app/checkout/success/[orderId].tsx:61` |

## 3. 실행 여부 · **미실행**

```
$ ls /Users/kyu.lee/projects/pos-m2/.env*       # 매치 없음
$ ls /Users/kyu.lee/projects/agilo-medusa-pos-fork/.env*  # 매치 없음
$ find /Users/kyu.lee/projects -maxdepth 3 -name '.env*' | grep -i -E 'meros|pos|agilo' # 0건
```

지침 "자격 증명 요청·추측 금지" 에 따라 값을 추정하지 않음 → **템플릿만 신설** · 실 서버 주문 생성 0 건 · 스샷 산출 0 건.

Kyu 가 테스트 계정 확보 후:
```bash
npm run sim:test:cash -- \
  -e EMAIL=<test-account> \
  -e PASSWORD=<test-password> \
  -e PRODUCT_TITLE='<test-product>'
```
1 회 실행 → `~/.maestro/tests/<ts>/sim-cash-flow/takeScreenshot/m2-1105-k-cash-success.png` 생성 + 성공 화면 `No. R-xxxxx` receipt_no 노출.

## 4. 생성 주문 id

**0 건** (미실행). 실행 시 success 화면의 `view-order` 로 Admin → Orders 에서 조회하여 리포트에 기록 · 테스트 주문 cancel/hand-over 로 정리 권장.

## 5. 자동 검증 (M2-1105-G fork CI)

| workflow | 결과 | 소요 |
|----------|------|------|
| **CI** (assertions + playwright) | ✓ success | **5m22s** (326s) |
| **Lint** | ✓ success | **42s** |

- CI 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42339789437
- Lint 런: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42339789440

본 PR 은 `maestro/**` + `docs/**` + `package.json scripts` 만 변경 → 제품 코드 영향 0 · 기존 20 개 어설션·Playwright 하네스 영향 0.

## 6. 안전 flag

- ⚠️ **실 서버 `api.meros.id` 에 실제 주문이 생성된다** — `PRODUCT_TITLE` 은 반드시 테스트 전용 상품으로 지정.
- 생성 주문 id 는 실행 뒤 리포트에 기록하고 Admin → Orders 에서 정리 (Hand over · Cancel · Refund 중 선택).
- Open shift 시트는 `runFlow when: visible: 'Register Open'` 분기 — 이미 open 상태면 skip.

## 7. 참고

- PR: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/45
- 브랜치: `chore/m2-1105-k-cash-flow` · 커밋 `e4e0c66`
- 선행 라운드: M2-1105-H (iOS 시뮬 네이티브 빌드 · 런북) · M3-1105-D (P2 cash flow 서버/UI) · M3-1105-K/M0-1105-K (receipt_no server contract)
- 다음 액션: Kyu 가 테스트 계정 전달 → M2 (또는 M3) 가 `npm run sim:test:cash` 1 회 실행 → 스샷 + 주문 id 회부 라운드
