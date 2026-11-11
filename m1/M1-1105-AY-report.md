# M1-1105-AY 리포트

날짜: 2026-11-12  
브랜치: `fix/m1-1105-ay-ci-green`  
PR: #97 (https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/97)  
닫은 PR: #96 (계약 칸 이름 되돌림으로 계약 역행 — 머지 금지)

---

## 원인 표

| 스크립트 | 실패 항목 | 원인 | 분류 | 처리 |
|---|---|---|---|---|
| `m3-1105-ad-assertions.mjs` §6 | `verify 401 · remaining` | 스크립트가 옛 이름 `remaining` 기대 — fixture는 `remaining_attempts` (#207 현행 계약) | **옛 계약 이름** | ✅ 스크립트 수정: `remaining` → `remaining_attempts` |
| `m3-1105-ad-assertions.mjs` §6 | `verify 423 · retry_at` | 스크립트가 옛 이름 `retry_at` 기대 — fixture는 `locked_until` (#207 현행 계약) | **옛 계약 이름** | ✅ 스크립트 수정: `retry_at` → `locked_until` |
| `m3-1105-ae-assertions.mjs` §6 | `receipt · kind='void' 도 refund_watermark 표시` | M3-1105-AF가 ReceiptCard 워터마크를 reprint 전용으로 변경하고 void/refund는 VOID/REFUND 배너로 대체 | **구현 변경 (M3-1105-AF)** | ✅ 스크립트 수정: 워터마크 체크 → `testID="receipt-void-refund-banner"` 체크 |
| `m3-1105-d-assertions.mjs` §5 | `Hand over 레이블 (takeaway)` | 스크립트가 `takeaway: 'Hand over'` label map 패턴 기대 — M3-1105-V/AA가 inline JSX로 대체 | **구현 변경 (M3-1105-V/AA)** | ✅ 스크립트 수정: label map 패턴 → takeaway inline + `DISPATCH_HINT` + Done 버튼 체크 |
| `m3-1105-d-assertions.mjs` §5 | `Send to production (preorder)` | 스크립트가 `preorder: 'Send to production'` label map 기대 — 실제 코드에 없음 (DISPATCH_HINT로 대체) | **구현 변경 (M3-1105-V/AA)** | ✅ 스크립트 수정: DISPATCH_HINT 존재 체크로 대체 |
| `m3-1105-d-assertions.mjs` §5 | `Pack (delivery)` | 스크립트가 `delivery: 'Pack'` label map 기대 — 실제 코드에 없음 (DISPATCH_HINT로 대체) | **구현 변경 (M3-1105-V/AA)** | ✅ Done 버튼(testID="done") 체크로 대체 |

---

## 바꾼 파일 표

| 파일 | 구분 | 변경 내용 |
|---|---|---|
| `.github/workflows/ci.yml` | CI | assertions(20m) + playwright(25m) 2잡 분리, workflow_dispatch 추가 |
| `scripts/m3-1105-ad-assertions.mjs` | 스크립트 계약 이름 | `remaining`→`remaining_attempts`, `retry_at`→`locked_until` |
| `scripts/m3-1105-ae-assertions.mjs` | 스크립트 구현 반영 | §6 void 워터마크→VOID/REFUND 배너 체크 |
| `scripts/m3-1105-d-assertions.mjs` | 스크립트 구현 반영 | §5 label map→inline+DISPATCH_HINT+Done 체크 |
| 나머지 121개 파일 | prettier 서식 | 동작 변경 0 (금지 파일 ManagerPinSheet·VoidRefundSheet·DigitsInput·pos-refunds 제외) |

---

## git diff -w --stat (master → HEAD)

prettier 서식 파일은 indentation·multiline 재배치만이므로 동작 변경 없음.  
논리 변경 파일: `.github/workflows/ci.yml` + 스크립트 3개.

```
 .github/workflows/ci.yml  |  49 ++--
 scripts/m3-1105-ad-assertions.mjs  | 138 +++++++++++-----
 scripts/m3-1105-ae-assertions.mjs  |  38 +++--
 scripts/m3-1105-d-assertions.mjs   |  14 +-
 (prettier: 117개 파일 서식만)
 121 files changed, 3275 insertions(+), 1484 deletions(-)
```

---

## 로컬 로그

### node scripts/run-all.mjs assertions

```
==== ASSERTIONS · 37개 ====
  · m0-1103-a-assertions.mjs ... PASS · 0.1s
  · m0-1103-c-assertions.mjs ... PASS · 0.2s
  · m0-1103-d-assertions.mjs ... PASS · 0.1s
  · m0-1104-a-assertions.mjs ... PASS · 0.1s
  · m1-1104-a-assertions.mjs ... PASS · 0.1s
  · m1-1104-b-assertions.mjs ... PASS · 0.1s
  · m1-1105-a-assertions.mjs ... PASS · 0.1s
  · m1-1105-ad-assertions.mjs ... PASS · 0.1s
  · m1-1105-ae-assertions.mjs ... PASS · 0.1s
  · m1-1105-ag-assertions.mjs ... PASS · 4.5s
  · m1-1105-aj-assertions.mjs ... PASS · 0.1s
  · m1-1105-an-assertions.mjs ... PASS · 0.1s
  · m1-1105-av-assertions.mjs ... PASS · 0.7s
  · m1-1105-h-assertions.mjs ... PASS · 0.1s
  · m1-1105-r-tender-guard.mjs ... PASS · 0.2s
  · m2-1104-d-escpos-assertions.mjs ... PASS · 0.4s
  · m2-1105-m-receipt-escpos-assertions.mjs ... PASS · 0.6s
  · m2-1105-n-accent-guard.mjs ... PASS · 0.1s
  · m2-1105-p-logo-bitmap-assertions.mjs ... PASS · 0.6s
  · m2-1105-q-bundle-guard.mjs ... PASS · 7.5s
  · m3-1104-a-assertions.mjs ... PASS · 0.1s
  · m3-1105-a-color-assertions.mjs ... PASS · 0.1s
  · m3-1105-aa-assertions.mjs ... PASS · 0.1s
  · m3-1105-ab-assertions.mjs ... PASS · 6.3s
  · m3-1105-ac-assertions.mjs ... PASS · 0.1s
  · m3-1105-ad-assertions.mjs ... PASS · 0.1s
  · m3-1105-ae-assertions.mjs ... PASS · 0.1s
  · m3-1105-af-assertions.mjs ... PASS · 0.6s
  · m3-1105-ai-assertions.mjs ... PASS · 0.1s
  · m3-1105-aj-assertions.mjs ... PASS · 0.1s
  · m3-1105-ap-assertions.mjs ... PASS · 0.1s
  · m3-1105-ar-assertions.mjs ... PASS · 0.1s
  · m3-1105-c-english-assertions.mjs ... PASS · 0.1s
  · m3-1105-d-assertions.mjs ... PASS · 0.1s
  · m3-1105-s-option-chip-assertions.mjs ... PASS · 0.1s
  · m3-1105-v-assertions.mjs ... PASS · 0.1s
  · m3-1105-x-fulfill-assertions.mjs ... PASS · 0.1s

==== 요약 ====
  총 37 개 · 37 PASS · 0 FAIL · 23.6s
```

### npx prettier --check

```
Checking formatting...
[warn] components/orders/ManagerPinSheet.tsx   ← 금지 파일 (PR #91 리뷰 중)
[warn] components/orders/VoidRefundSheet.tsx   ← 금지 파일 (PR #91 리뷰 중)
[warn] components/ui/DigitsInput.tsx           ← 금지 파일 (PR #91 리뷰 중)
Code style issues found in 3 files. ← 금지 파일만 / 나머지 All matched files use Prettier code style!
```

---

## PR 번호

- **새 PR**: #97 `fix(ci): assertions 계약 이름 교정 · prettier · 잡 분리 타임아웃 해소 (M1-1105-AY)`
- **닫은 PR**: #96 (계약 칸 이름 되돌림으로 계약 역행)

---

## 이연 순증감

- 이연 없음 (모든 항목 완료)
