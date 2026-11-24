M3-1124-E · receipt-scroll CI 하네스 추가
판정: PASS — CI playwright 잡에서 receipt-scroll 스펙 12개 실행·통과 확인.

## 작업 내용

**신규 파일**: `scripts/m3-1124-c-receipt-scroll-playwright.mjs`

`e2e/flows/M3-1124-C-receipt-scroll.spec.ts` 를 `@playwright/test` CLI 로 실행하는
래퍼 하네스. `scripts/run-all.mjs` 의 `*-playwright.mjs` glob 패턴에 편입되어
CI playwright 잡이 자동으로 픽업.

구현 방식: `spawnSync('npx', ['playwright', 'test', '--config', 'playwright.config.ts', 'e2e/flows/M3-1124-C-receipt-scroll.spec.ts'])` → 종료 코드 그대로 반환.

lint: 0 errors (warnings 불변 64개 — 기존과 동일).
커밋: `55cfe99` (fix/M3-1124-C-chip-receipt)

## CI 실행 증거 (`gh run view --log --job 138258600791`)

```
Run Playwright harnesses  ==== PLAYWRIGHT · 28개 · workers=4 ====
...
  · START m3-1124-c-receipt-scroll-playwright.mjs
...
  · DONE  m3-1124-c-receipt-scroll-playwright.mjs · PASS · 77.7s
...
  77.7s  PASS    m3-1124-c-receipt-scroll-playwright.mjs
...
  총 28 개 · 28 PASS · 0 FAIL · wall 245.2s
```

이전 CI (run #45329948794, 커밋 fc35d1b): `총 27 개 · 27 PASS`.
이번 CI (run #45338946362, 커밋 55cfe99): `총 28 개 · 28 PASS`.
→ 하네스 1개 증가, receipt-scroll 스펙 77.7s 에 통과 (12개 × 3뷰포트 × 4결제수단).

CI URL: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45338946362

## M3-1124-D (#249) 하네스 여부

**있음** — `e2e/flows/M3-1124-D-sell-scroll.spec.ts` 존재하나
대응 하네스 `scripts/m3-1124-d-sell-scroll-playwright.mjs` 없음.
동일한 "CI glob 미편입" 문제. 별도 PR(#249)에서 수정 필요.
