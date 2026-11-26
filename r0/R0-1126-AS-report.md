storeport#466 APPROVE · fork#280 APPROVE · relay#59 APPROVE

# R0-1126-AS · 원장 대사 리뷰

날짜: 2026-11-26 · 담당: R0 (CuriocityDevAi)

---

## 1. storeport#466 (M0-1126-R) — APPROVE

**PR**: https://github.com/CuriocityDevAi/storeport/pull/466  
**제목**: Phone entry OK → Confirm 카드 (결제 30초+) · 키패드 20초 타이머 디짓 재앵커  
**코멘트**: https://github.com/CuriocityDevAi/storeport/pull/466#issuecomment-7198321911

### 증상 ④ · `inActiveFlow` 가드

`apps/customer-display/app/index.tsx:329-337` 에 `inActiveFlow = (flowState === "entering" || flowState === "first_visit" || flowState === "confirming")` 가드 추가. `stalePaid` 조건에 `!inActiveFlow &&` 삽입. submit_phone 직후 서버가 `state=confirming + phone_entry_open=false` 로 응답하는 찰나 stalePaid=true 로 MainScreen 복귀하던 회귀 차단.

**회귀 가드 체크**: `confirmed / skipped / unconfirmed` 는 inActiveFlow=false → Correct → Next customer → 대기 화면 복귀 정상 작동. 가드 범위 적절 ✓

### 증상 ④' · digits 전달

`keypad-after.tsx:24`: `onOk={() => router.replace("/consent")}` → `onOk={(digits) => router.replace({pathname:"/consent", params:{digits}})}`. consent 화면이 masked phone을 그릴 수 있게 됨 ✓

### 증상 ③ · 타이머 재앵커

`KeypadAfterScreen.tsx:46-57`: `handleDigitsChange` callback에서 `startMs.current = Date.now()` + `firedRef.current = false` 재세팅. 마지막 입력 기준 20초 보장. 19초 간격 연속 입력 시 타임아웃 미발화 ✓

### e2e 한계

`cd-pos-sync-v4-phone-entry-ok.spec.ts` — Playwright chromium mock 서버 경로. 실 iPad Safari 타이밍 재검증은 운영 책임으로 이관(PR 본문에 명시). 334/334 unit + 기존 e2e 미변경 ✓

### 마이너

CI bot: `docs/feature-map.yaml` `customer-display.cd-keypad` 프로세스가 `planned`인데 실제 e2e 파일 존재 → `live` 승격 권장(비블로킹).

**② (POS 칩 "Ask phone" 복귀)는 의도적으로 별도 PR 분리 — 범위 적절.**

---

## 2. agilo-medusa-pos-fork#280 (M3-1126-S) — APPROVE

**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/280  
**제목**: Payment successful Phone entry 칩 제거 · Ask phone/again → phone-entry  
**코멘트**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/280#issuecomment-7198323936

### Success 화면 칩 제거

`app/checkout/success/[orderId].tsx`: `PhoneEntryButton` import 제거, `REASON_TOAST` export import로 교체. 헤더 `phone-entry-chip` 삭제. decision-success-single-phone-button-20261126 취지 일치 ✓

### onAskPhone → phone-entry 직접 호출

`useOpenPostSettlementPhoneEntry().mutate(orderId, {...})` 사용. eligible=true → 성공 토스트, eligible=false → `REASON_TOAST[res.reason]` 조회. reason 맵 미포함 시 `if (toastMsg)` 가드로 안전 처리(무음) ✓

### 불필요 state/effect 정리

`askPhoneStatus` state, `buttonPressedAtRef`, `pre_entry` 감지 effect, `skipped_at` 감지 effect, `shouldTransitionToSkipped` import 모두 제거. 범위 적절 ✓

### 보존 요소

- Cart/Checkout/tender 화면: `start_entry` 경로 미변경 ✓
- Order 상세 `Phone entry` 버튼: 미변경 ✓

### Carousel width 수정 (M3-1126-R 번들)

`app/product-details.tsx`: `windowDimensions.width` → `0` 초기값 + `onLayout.nativeEvent.layout.width` 측정 후 Carousel 렌더. max-w-xl 부모 초과 방지. e2e 가드 `M3-1126-R-pos-fixes.spec.ts` 추가 ✓

### Playwright 스크립트 V4-7 갱신

`phone-entry-chip` 없음 어설션 + `cd-phone-status-ask` 클릭 → POST /phone-entry 호출 어설션으로 교체 ✓  
#277 미머지 미동봉 명시(비블로킹) ✓

---

## 3. curiocity-relay#59 (M2-1126-S) — APPROVE

**PR**: https://github.com/CuriocityDevAi/curiocity-relay/pull/59  
**제목**: 넘김 폐지 · cloud>0 빨간 경고 · iMac heartbeat 끊김 경보  
**코멘트**: https://github.com/CuriocityDevAi/curiocity-relay/pull/59#issuecomment-7198325727

### #58 충돌 확인

#58 머지: 16:52:51 · #59 생성: 16:17:52 — #59 base(`d489284...`)는 #58 이전 상태.  
**#58 변경 파일**: `scripts/lib/ci-health.mjs` (2파일)  
**#59 변경 파일**: `scripts/ci-watch.mjs`, `scripts/watch/ci-watch-render.mjs`, `scripts/test/ci-watch-w112.test.mjs`, `scripts/test/ci-watch-w113.test.mjs`, `scripts/ci-box/README.md`  
→ **겹침 없음 · conflict-free 머지 ✓**

### 넘김 폐지 로직 (`ci-watch-render.mjs`)

`renderLayout`: cloud=0 → 녹색 `· 넘김 폐지`, cloud>0 → 빨강 `⚠ 넘김 폐지 위반 (N잡 발생)` ✓  
`renderCompact`: realCount=0 → 녹색 `0건 · 넘김 폐지`, >0 → 빨강 `⚠ N건 — 몰래 생긴 클라우드 잡` ✓

### iMac heartbeat 경보 (`ci-watch.mjs:1263-1278`)

`readImacJson().ts` → `hbAgeMin` 계산 → 3분+ 시 `imac_heartbeat_stale` 경보.  
파일 없거나 `.ts` 없으면 `imac_heartbeat_missing` 경보.  
`runnerAlerts` 선두에 삽입 → 상단 빨간 경보 ✓

### 테스트

W10-2/4/5(w112) · W10-cloud줄/넘김폐지위반/정상(w113) 모두 새 의미에 맞게 갱신.  
243/244 통과 — w115 1건 live jsonl drift, 본 PR 범위 밖 명시 ✓

### 실 jsonl 렌더

렌더 레이어만 변경. 집계 정확도는 #58(`scripts/lib/ci-health.mjs`)이 보장.  
단일 소스(`cloudData.realCount` / `cloudTodayCount`) 계승(v1.15) ✓

---

## 요약

| PR | 결정 | 핵심 |
|----|------|------|
| storeport#466 | APPROVE | inActiveFlow 가드 범위 적절 · digits 전달 · 타이머 재앵커 · e2e mock 한계 명시 |
| fork#280 | APPROVE | 칩 제거 · phone-entry 직접 호출 · eligible=false 토스트 안전 · Carousel 번들 |
| relay#59 | APPROVE | #58 파일 겹침 없음 · 넘김 폐지 렌더 · iMac heartbeat 경보 · 243/244 통과 |
