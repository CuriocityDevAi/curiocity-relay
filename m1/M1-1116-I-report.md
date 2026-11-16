# M1-1116-I 실행 리포트

**실행일**: 2026-11-16  
**작업**: 5개 storeport PR 순서대로 rebase → push → CI 대기 → Oké 머지 완료

---

## 최종 결과

| PR  | 브랜치 | 머지 여부 | CI 결과 |
|-----|--------|-----------|---------|
| #292 | feat/m2-1116-e-loyalty-toggle-label | ✅ MERGED | 모두 통과 |
| #294 | feat/m1-1116-f | ✅ MERGED | 통과 (feature-map check 수정 포함) |
| #293 | feat/m1-1116-e-customer-loyalty-detail | ✅ MERGED | 통과 |
| #291 | feat/m1-1116-d-customer-display-admin | ⛔ OPEN — pos-integration FAILED | 로직 충돌 |
| #295 | m2/M2-1116-G-live-connect | ⛔ OPEN — pos-integration + customer-display FAILED | 로직 충돌 2건 |

---

## 머지 완료 (3건)

### #292 (M2-1116-E) — 적립 토글 문구
origin/main: `ed78843`  
별도 수정 없이 rebase → push → Oké 머지.

### #294 (M1-1116-F) — Admin UI 스모크
origin/main: `2f63e4d`  
feature-map `check` CI 실패 → `admin-smoke-ci` 항목 신설 (playwright.smoke.config.ts, scripts/admin-smoke.sh 등록) → 재push → Oké 머지.

### #293 (M1-1116-E) — Customer 상세 Loyalty 위젯
origin/main: `202997d`  
수정 사항 2건:
1. TypeScript 오류: `"returned"` → 유효한 `OrderStatus` 아님 → `status: ["completed"]` 으로 수정 (커밋 M1-1116-G)
2. package.json `test:e2e:admin` 스크립트: 기본 playwright.config.ts를 쓰던 것을 `--config playwright.smoke.config.ts`로 교정
3. feature-map `check` 실패 → `customer-loyalty-detail` 항목 신설 (customers/[id]/summary/route.ts 등록)

---

## 미머지 — 로직 충돌 보고

### #291 (M1-1116-D) — pos-integration FAILED

**실패 스펙**:
- `integration-tests/pos/orders-list.spec.ts`
- `integration-tests/loyalty/customer-summary.spec.ts`

**orders-list 실패 내용**:
- `#1 loyalty_earn 객체 형식 → 숫자 반환` (line 132): 실제값≠기대값
- `#2 전화번호 일부 필터 (q=2480)` (line 151): `toContain` 불일치
- `#6 loyalty_earn + loyalty_recover → 순적립` (line 210): 계산값 불일치

**customer-summary 실패 내용**:
- `T3 visit_count` → Expected: 1, Received: 0 (API가 `completed` 주문만 집계하는데 테스트 주문이 `completed` 상태 아님)
- `T5 orderModule.cancelOrders is not a function` → Medusa 2.17.2에서 해당 메서드 존재하지 않음
- `T4` → T3·T5 선행 오류 영향

**판정**: 로직 충돌. `customer-summary` API의 `visit_count` 집계 조건 및 테스트 코드가 Medusa 2.x API 불일치 (cancelOrders). 단순 CI 설정 문제 아님.

---

### #295 (M2-1116-G) — pos-integration FAILED + customer-display E2E FAILED

**[충돌 1] customer-display E2E (9개 실패)**

**원인**: PR의 `apps/customer-display/app/_layout.tsx` 수정으로 live mode 부팅 게이트 추가됨.

```typescript
// Live mode: redirect to /pair when no token
useEffect(() => {
  if (!mounted || useMock) return;
  if (liveToken === null) {
    router.replace("/pair");
  }
}, [mounted, useMock, liveToken]);
```

기존 E2E 테스트(`e2e/snapshots.spec.ts`, `e2e/event-decor-screens.spec.ts`)는 `?mock=1` 없이 `/keypad?...` 등 직접 경로로 이동. 새 로직은 `?mock=1` 없으면 live mode → device token 없음 → `/pair` 리다이렉트 → `keypad-screen` testid 미노출.

**영향 테스트 (9건)**:
- event-decor-screens.spec.ts 3건 (Christmas window · inactive date)
- snapshots.spec.ts 6건 (keypad-ok, keypad-del-long, keypad-after-skip, keypad-after-timer, consent-screen, keypad-lang-ko)

**판정**: 로직 충돌. 기존 E2E 테스트에 `?mock=1` 추가 또는 `isMockRequested()` 로직을 state/theme/lang 파라미터 존재 여부로 확장해야 함. PR 작성자 의도 확인 필요.

**[충돌 2] pos-integration FAILED**

#291과 동일한 `orders-list` + `customer-summary` 실패에 더해 `customer-display-settings-draft-apply` 추가 실패:
- line 70, 81: `color_theme_key` toBe 불일치 (draft apply 로직 오류)

---

## 중간 수정 커밋 목록

| 커밋 | 내용 | 대상 PR |
|------|------|---------|
| `fix(feature-map): M1-1116-I — #294 admin-smoke-ci 신설` | playwright.smoke.config.ts 등 등록 | #294 |
| `fix(api): M1-1116-G — "returned" → valid OrderStatus` | summary route.ts 수정 | #293 |
| `fix(feature-map): M1-1116-I — #293 customer-loyalty-detail 신설` | customers/[id]/summary/route.ts 등록 | #293 |
| `fix(feature-map): M1-1116-I — #295 customer-display 미등록 파일 4개 등록` | pair.tsx·pairing.ts·boot-context.tsx·live-connect.test.ts | #295 |

---

## 현재 상태 요약

- origin/main: `202997d` (M1-1116-E #293까지 머지)
- PR #291 (`feat/m1-1116-d-customer-display-admin`): OPEN, pos-integration FAILED — 로직 충돌 수동 해결 필요
- PR #295 (`m2/M2-1116-G-live-connect`): OPEN, customer-display E2E + pos-integration FAILED — 로직 충돌 2건 수동 해결 필요
