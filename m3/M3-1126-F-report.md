#272 fixed d77f95f · #271 checks assertions FAIL (favicon.png 32x32 ≠ 48x48)

## #272 — types.ts:90 괄호 제거

**변경 내용**
```diff
-        elapsedMs: (w.createdAt > 0 && w.createdAt <= nowMs) ? (nowMs - w.createdAt) : null,
+        elapsedMs: w.createdAt > 0 && w.createdAt <= nowMs ? nowMs - w.createdAt : null,
```

**검증 결과**
```
$ npx eslint components/order-chips/types.ts
(no output = 0 errors)

$ npx vitest run --reporter=verbose
__tests__/m3-1123-a-order-chips.test.ts — 26 tests all ✓
Test Files  89 passed (89)
Tests  1158 passed | 6 expected fail | 3 todo (1167)
```

**커밋**: `d77f95f` fix(order-chips): M3-1126-F — types.ts:90 괄호 제거 · prettier 통과
**push**: `6c95256..d77f95f  feat/M3-1126-E -> feat/M3-1126-E`

---

## #272 — gh pr checks 272 결과

```
assertions    pass     (run 45762183282)
lint          pass     (run 45762183149)
unit-tests    pass
flow-tests    pass
route         pass     (×2)
playwright    pending
heavy-cloud   skipping
```

---

## #271 — gh pr checks 271 결과

```
assertions    FAIL   1m20s   (run 45760490970/job 139709139782)
playwright    skipping
flow-tests    pass   40s
unit-tests    pass   43s
heavy-cloud   skipping
lint          pass   53s
route         pass   (×2)
```

**assertions 실패 로그 핵심 3줄**
```
  · m0-1103-c-assertions.mjs ... FAIL (exit 1) · 0.2s
  ✗ assets/images/favicon.png is 48x48
     actual: 32x32
```

**실패 원인 (1줄)**: PR #271(`feat/M1-1126-I-login-logo`)에서 favicon.png를 32×32로 교체하여 `m0-1103-c-assertions.mjs` 섹션(3) 아이콘 PNG 크기 assertion 실패.

**mergeable_state=blocked 원인**: `assertions` 체크 실패로 인해 PR #271이 blocked 상태.
