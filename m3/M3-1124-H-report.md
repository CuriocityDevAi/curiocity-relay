OK

## M3-1124-H 착지 보고

**판정: OK** — CI playwright 빨강 → 초록 완료.

---

### 수정 내역

#### 1. `scripts/m2-1124-n-order-number-display-playwright.mjs`

**원인**: check(1) 정규식이 `/products/` 고정이었는데 M3-1123-A 이후 홈이 `/sell` 로 변경됨.
로그인 후 `page.url()` = `http://127.0.0.1:XXXXX/sell` → check 실패.

**수정**: `/products/.test(url)` → `/products|sell/.test(url)` (1줄).

**로컬 검증 (신규 dist 빌드 후)**:
```
9/9 passed · 0 failed
```
모든 기능 체크(3a·5a·5b·6a·6b·7a·7b) + URL 체크(1·2) 전부 통과.

---

#### 2. `scripts/m3-1124-c-receipt-scroll-playwright.mjs`

**원인 조사**:
- main(origin/master) 에도 spec 파일 존재 (`1a25c58` 에서 추가됨, PR #248).
- CI 로그 확인: 12 테스트가 **8.8초** 만에 전부 실패 → assertion timeout(15s)이 아닌 webServer 시작 실패 패턴.
- 근본 원인: 기존 하네스가 `spawnSync('npx', ['playwright', 'test', '--config', 'playwright.config.ts', ...])` 로 `@playwright/test@1.65.0` 를 실행. CI는 `playwright-chromium@1.64.1` Chromium 만 설치 → `@playwright/test@1.65.0` 가 자신의 Chromium 버전을 찾지 못해 `npx serve dist -l 4321 --single` webServer 도 같이 실패, 12/12 즉시 실패.
- ReceiptCard `order_display_id` fallback "Order 1001" 추가는 로컬에서 scroll 어설션에 영향 없음(scroll assertions 모두 통과).

**수정**: `spawnSync+playwright.config` 방식 완전 제거 → `_harness.mjs` 직접 사용 패턴으로 전환.
- `createDistServer()` (random port) + `playwright-chromium@1.64.1` chromium 사용.
- `seedAuth` · `mockBaseAuth` · 엔드포인트 mocks 직접 구현.
- `assertScrollWorks` 로직 동일 유지 (payment-success · footer 위치·bounding box · Item#15 · Reprint bounds).
- Split 나눠결제 slip 패널 열림·스크롤 체크 동일 유지.
- 기능 어설션 약화 없음.

**로컬 검증**:
```
117/117 passed · 0 failed
```
(Cash × 3 + Card × 3 + QRIS × 3 + Split × 3 뷰포트, 각 10 assertion)

---

### 로컬 로그 tail

**m2-1124-n (9/9)**:
```
--- (1) 로그인 → products ---
  ✓ (1) 홈 도달
--- (2) Orders 탭 이동 ---
  ✓ (2) /orders 도달
--- (3) 주문 목록 row 존재 ---
  ✓ (3a) ord_custom_id_1 row 노출
--- (5) order-detail-custom-id 헤더 노출 ---
  ✓ (5a) order-detail-custom-id 노출
  ✓ (5b) 헤더 텍스트 = "PIM26B1000"
--- (6) ReceiptCard 하단 Order label ---
  ✓ (6a) receipt-custom-id 노출
  ✓ (6b) ReceiptCard 하단 텍스트 = "Order PIM26B1000"
--- (7) 에러 수집 ---
  ✓ (7a) pageerror 0
  ✓ (7b) console.error 0
9/9 passed · 0 failed
```

**m3-1124-c (117/117, 발췌)**:
```
--- Cash 15품목 스크롤 · phone-portrait ---
  ✓ Cash·phone-portrait · payment-success 보임
  ✓ Cash·phone-portrait · next-customer-footer 보임
  ✓ Cash·phone-portrait · footer 하단 684px 이내
  ✓ Cash·phone-portrait · Item #15 count=1
  ✓ Cash·phone-portrait · Item #15 스크롤 후 보임
  ✓ Cash·phone-portrait · reprint 보임
  ✓ Cash·phone-portrait · reprint bottom ≤ viewport
  ... (ipad-portrait, ipad-landscape, Card, QRIS, Split 동일 패턴)
117/117 passed · 0 failed
```

---

### PR #250 CI 결과

push 후 CI run #45364661074:
- assertions: **pass** 1m12s
- flow-tests: **pass** 41s
- playwright: **pass** 5m28s
- lint: **pass** 1m5s
- route: **pass** (×2)

PR URL: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/250
커밋: `f408dd0` fix(e2e): M3-1124-H — m2 URL 체크 sell|products 허용 · m3 하네스 _harness.mjs 직접 사용 전환
