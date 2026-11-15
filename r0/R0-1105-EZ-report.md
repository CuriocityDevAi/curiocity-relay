# R0-1105-EZ 리포트

**#256 APPROVE · fork#140 APPROVE · #272 CHANGES (1건)**

## #256 — storeport Admin 로열티 CI 수정 (M2-1105-BR)

### tsconfig.json `e2e/**` exclude

이상 없음. `apps/commerce-core/tsconfig.json` 의 `module: "Node16"` CJS 컴파일러가 `e2e/vite.config.ts`(`defineConfig` from vite) 를 포함하면 TS2305 필연 → exclude 정상. 다른 앱(customer-display·anchor·wing)은 각자 tsconfig 가 있어 영향 없음. CI `e2e-admin-loyalty` job 에 별도 typecheck 단계가 없어 e2e 파일은 타입 검사 범위 밖 — 이후 `e2e/tsconfig.json` 추가 과제.

### `import.meta` → `process.env.NODE_ENV`

정상. Vite Admin 빌드는 `process.env.NODE_ENV` 를 string literal 로 치환(define). `typeof process !== "undefined"` guard 로 Node CJS 에서도 안전. `loyalty-api.ts:237-239` 확인.

### pnpm-lock 재생성 diff

의도 밖 의존성 없음. 추가 항목 두 가지만:
- `@playwright/test: ^1.49.0` — 이 PR 의 직접 추가 devDependency ✓
- `apps/customer-display` 섹션 — rebase 전 브랜치에 포함된 prior-PR(#263/#265/#266) 결과물 ✓

### R2 Admin 규칙 대조

| 규칙 | 구현 | 위치 |
|---|---|---|
| 시뮬 1회 후 Save 활성 | `saveEnabled = !!(simResult && lastSimHash === currentHash)` | page.tsx:558 |
| 사유 필수(5자+) | `reason.trim().length < 5` → 에러 반환 | page.tsx:275, 465 |
| 즉시 반영 | `applyMode === "now"` + `simulation_id + reason` | page.tsx:295-305 |
| 예약 반영 | `applyMode === "scheduled"` + `scheduleDate` 달력 | page.tsx:281-287 |
| 감사 기록 | `fetchAuditTrail()` + `audit-table` + 행 펼침 스냅샷 | page.tsx:900-914 |

decision-loyalty-20261114.md §06:15 항목 전부 일치.

### 테스트 실행

```
pnpm -F commerce-core test
# Test Suites: 19 passed · Tests: 288 passed (wt-256, pnpm install 후)
```

e2e Playwright: CI run 43688678345 기준 9/9 (로컬 환경 Vite harness 직접 실행 미검증).

---

## fork#140 — POS 손님 번호 연결 (M1-1105-CH)

### 서버 계약 (#258 · #271)

`loyalty-link.ts:2-6` 에 계약 명시. `POST /admin/pos/orders/:id/customer`, body `{ phone, consent? }`, 응답 `{ customer_id, phone_masked, store_credit_balance, ... }`. `#271` 경로·응답 형식 유지 → 앱 변경 없이 호환. 에러 매핑: `400 → server message` / `409 link_window_closed → 영문 안내` 계약 일치.

### 숫자 키패드 재활용

`LinkCustomerSheet.tsx:106-112` — `DIGITS_INPUT_PROPS` spread on TextInput. Kyu "같은 키패드를 쓰면될듯" 지시 충족. maxLength=13(인도네시아 로컬 번호 최대) + 자체 digit-filter 필요로 `DigitsInput` 컴포넌트 대신 상수 spread — 허용. iPad numeric popup 조건 동일.

### 동의 체크 필수

`canSubmit = phone.length >= 10 && consent && !linkMut.isPending` — consent false 시 Link 버튼 disabled ✓

### 버튼 색 규칙

| 버튼 | variant | 결과 |
|---|---|---|
| Cancel | outline | 선택=차콜 ✓ |
| Link | default(solid) → bg-ink | 결정=검정 ✓ |
| "Link customer"(성공화면) | outline | 선택=차콜 ✓ |

### 시맨틱 토큰

`bg-surface-muted`, `border-line`, `text-ink-muted`, `text-on-ink`, `border-danger` — raw hex 없음 ✓

### 네이티브 모듈 신규 의존 0

`git diff master...origin/feat/m1-1105-ch -- package.json` 변경 없음 → 재빌드 없이 동작 확인.

### vitest 직접 실행

```
npx vitest run __tests__/loyalty-link.test.ts (pos-m1-ch worktree)
Test Files  1 passed · Tests  13 passed
```

---

## #272 — 이벤트 장식 렌더러 (M3-1105-CM)

### 하드코딩 색

`EventDecor.tsx` 레이아웃 → `theme.hero`, `theme.heroInk` 시맨틱 토큰. `events.ts` motif 색 → raw hex 허용("이벤트 데이터 색만 예외") ✓

### 이슬람력 날짜 하드코딩

`resolveActiveEvent.ts` — 이슬람력 날짜는 `islamicDates: IslamicDateTable` 주입형, 함수 내부에 연도 하드코딩 없음 ✓. `islamicDates[year]?.[ik]` 로 연도별 조회.

### 스크린샷 PNG

7종 + 1(all) = ~196 KB. 시안 확인 목적 커밋은 허용 범위. Playwright 재실행 시 재커밋 필요한 운영 비용은 추후 CI artifact 로 대체 고려 여지 있음(현재 CHANGES 아님).

### vitest 직접 실행

```
pnpm -F customer-display test (wt-272, pnpm install 후)
Test Files  4 passed · Tests  98 passed
```

### Playwright 직접 실행

미검증 — `build:web` 빌드 환경 미확보. CI 결과(M3-1105-CM 리포트 8/8)로 대체.

### ❌ CHANGES — `app/decor-preview.tsx` 운영 빌드 노출

`app/decor-preview.tsx` 주석은 "DEV-ONLY" 이지만, Expo Router 는 `app/` 하위 모든 파일을 route 로 등록함. `"output": "static"` 운영 빌드에서 `/decor-preview` 경로가 그대로 노출됨 → 런타임 가드 필요.

```tsx
// 방법 A — __DEV__ guard
export default function DecorPreview() {
  if (!__DEV__) return null;
  // ...
}
// 방법 B — 파일을 e2e/admin/harness/ 로 이동 (Playwright 스펙 경로 수정 필요)
```

GitHub 코멘트: https://github.com/CuriocityDevAi/storeport/pull/272#issuecomment-6891184462
