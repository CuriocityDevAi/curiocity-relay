# M3-1124-G Report

판정: ✅ PASS — #249 CI 전체 초록 · sell-scroll 9케이스 통과 (run 45355050144)

실패 원인(이전 run 45341151674): D 하네스(`playwright.config.ts` port 4321)가 C 하네스와 동일 포트 + 동일 `outputDir` 공유 → 병렬 실행 시 D가 즉시 충돌·종료하면서 C의 trace 파일 디렉토리 삭제 → `ipad-portrait` ENOENT

## CI 결과 (run 45355050144)

| 잡 | 결과 | 소요 |
|---|---|---|
| route | ✅ | 6s |
| flow-tests | ✅ | 45s |
| assertions | ✅ | 1m 19s |
| heavy-cloud | ⏭ | — |
| playwright | ✅ | 4m 52s |

**전체: success**

## 수정 내용

- `playwright.config.sell.ts` 신설: port **4322** · `outputDir: e2e/test-results-sell`
  → `playwright.config.ts`(port 4321 / C 하네스)와 완전 분리
- `scripts/m3-1124-d-sell-scroll-playwright.mjs`: `playwright.config.ts` → `playwright.config.sell.ts`
- `origin/master` 머지 (ba6b45f #246 · 1a25c58 #248 수신)

## sell-scroll 9케이스 실행·통과

`m3-1124-d-sell-scroll-playwright.mjs · PASS · 27.4s`

```
① 맨 아래 상품 스크롤 도달 — phone-portrait    PASS
① 맨 아래 상품 스크롤 도달 — ipad-portrait     PASS
① 맨 아래 상품 스크롤 도달 — ipad-landscape    PASS
② 마지막 카드 CartBottomBar 가림 없음 — phone-portrait   PASS
② 마지막 카드 CartBottomBar 가림 없음 — ipad-portrait    PASS (skip: width≥768)
② 마지막 카드 CartBottomBar 가림 없음 — ipad-landscape   PASS (skip: width≥768)
③ 마지막 카드 클릭 → product-details — phone-portrait    PASS
③ 마지막 카드 클릭 → product-details — ipad-portrait     PASS
③ 마지막 카드 클릭 → product-details — ipad-landscape    PASS
```

C 하네스도 동일 run에서 `m3-1124-c-receipt-scroll-playwright.mjs · PASS · 73.5s` (12/12 통과).
