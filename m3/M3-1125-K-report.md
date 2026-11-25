PASS

## PR #261 — base 변경 · rebase · playwright 플래키 수정

### 1. base 변경 · rebase · force-push

- PR base: `feat/M3-1125-I-fix-failing-tests` → **`master`** (`gh pr edit --base master`)
- rebase 전략: `git rebase --onto origin/master 4256023`
  - 중복 커밋 `4256023` (M3-1125-I 원본, master에 squash `17c727a`로 이미 포함) 제거
  - 유일하게 남긴 커밋: `2adbd0d` (M3-1125-J unit-tests job 추가)
- force-with-lease push 완료

### 2. playwright 실패 원인 확정 — **(a) 플래키**

**원인**: `m3-1124-o-checkout-b-playwright.mjs` Round A에서 `page.getByTestId('checkout-pay-bar').isVisible({ timeout: 12000 })`을 사용.  
Playwright에서 `Locator.isVisible()` 는 timeout 을 **대기 조건으로 사용하지 않음** — 현재 가시성을 즉시 반환.  
앞에 붙은 고정 `waitForTimeout(3000)` 이 CI 로드 시 충분하지 않아 "pay-bar not visible — skipped" 5건 실패.

**근거 로그 (run 45559546161)**:
```
· DONE  m3-1124-o-checkout-b-playwright.mjs · FAIL (exit 1) · 27.7s
  ✗ A · checkout-pay-cash 보임   pay-bar not visible — skipped
  ✗ A · checkout-pay-card 보임   pay-bar not visible — skipped
  ✗ A · checkout-pay-qris 보임   pay-bar not visible — skipped
  ✗ A · checkout-pay-in-parts 보임   pay-bar not visible — skipped
  3/8 passed · 5 failed
```

(b) concurrency/포트 충돌 아님 — `unit-tests`(40s)는 playwright 시작 전에 이미 완료.  
(c) old base 아님 — M3-1125-I 코드 diff 없음, 타이밍 이슈가 근본 원인.

**수정**: `waitForTimeout(3000)` + `isVisible()` → `waitFor({ state: 'visible', timeout: 12000 })`  
커밋: `f794677 test(playwright): M3-1125-K — checkout-b 플래키 수정 (isVisible→waitFor visible)`

### 3. CI 결과 (run 45562577758)

| job | 결과 |
|-----|------|
| route | ✓ PASS |
| assertions | ✓ PASS |
| unit-tests | ✓ PASS |
| flow-tests | ✓ PASS |
| heavy-cloud | ✓ PASS |
| playwright | ✓ PASS |

**전체 초록 확인** — https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45562577758

### 4. 필수 체크 이름 (Kyu 오케 몫)

Required status checks에 추가할 이름: **`unit-tests`**
