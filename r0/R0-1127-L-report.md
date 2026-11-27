# R0-1127-L 리뷰 리포트

fork#288: CI 미확인 · 코드 OK — CI 성공 후 머지 가능
fork#289: CI 미확인 · 코드 OK — CI 성공 후 머지 가능
fork CI: 미시작 (두 PR 모두 workflow run 미생성 · queued 런도 없음 · 원인: curiocity-mac-fork-light 오프라인 추정 또는 GitHub webhook 처리 실패)

---

## CI 조사

### 명령 및 결과

```
gh pr checks 288 --repo CuriocityDevAi/agilo-medusa-pos-fork
→ no checks reported on the 'fix/M3-1127-G-sheet-typing-dots' branch

gh pr checks 289 --repo CuriocityDevAi/agilo-medusa-pos-fork
→ no checks reported on the 'fix/M3-1127-H-draft-duplicate' branch

gh run list --repo CuriocityDevAi/agilo-medusa-pos-fork --status queued
→ (빈 출력)

gh run list --repo CuriocityDevAi/agilo-medusa-pos-fork --limit 20
→ 최근 20개 모두 completed · fix/* 브랜치 런 없음
   마지막 pull_request 이벤트: 06:12 (test/R0-1127-G-existing-customer-repro) ← 성공
   마지막 workflow_run(ci-summary): 06:27 (master)
   PR #288 생성: 06:30 — 런 없음
   PR #289 생성: 06:50 — 런 없음
```

### 원인 분석

- **fork#285 영향 아님**: 05:51 머지 후 06:12 PR CI 정상 완료
- **워크플로 파일 문제 아님**: 두 PR 브랜치의 ci.yml / lint.yml 이 master 와 SHA 동일 (efce0ad, 56f0aaf)
- **route-fork.sh 문제 아님**: 항상 curiocity-mac-fork-light 고정 출력, 단위 테스트 통과 로직
- **queued 런조차 없음**: 단순 runner offline이면 queued 런이라도 생성되어야 함. 생성 자체가 없으므로 GitHub webhook 처리 실패 또는 runner 등록 해제 의심
- **storeport#474 heavy-mac 도 queued**: 같은 iMac 문제 연관 가능성

---

## fork#288 — fix(sheet+typing-dots): M3-1127-G (코드 OK)

### 이미지 상한 (`product-details.tsx`)

- `useWindowDimensions()` → `IMAGE_MAX_H = round(screenHeight * 0.26)` 동적 계산
- `height = Math.min(round(width * 0.75), IMAGE_MAX_H)` — 4:3 비율과 상한 중 낮은 값
- iPhone portrait(844px→219px), iPad landscape(1024px→266px), iPad portrait(1366px→355px) 모두 시트 최상단 방지 로직 올바름
- placeholder `maxHeight: IMAGE_MAX_H` 추가 → Carousel 초기화 전 layout jump 방지
- 이미지 가운데(`resizeMode="contain"`) 미변경 — #279 보존 ✓

### 점 3개 렌더 테스트 (`[POS-TYPING-DOTS]`)

- `locator('[data-testid="cd-phone-status-dots"]').count() > 0` — 렌더 기반 ✓
- `testID="cd-phone-status-dots"` 현 코드 `CustomerPhoneStatus.tsx:429` 직접 확인 ✓
- `accessibilityLabel` 에 `"typing"` 포함 체크 ✓
- 소스 문자열 검사 아님 — 명세 요건 충족 ✓

### spec-guard 항목

- `POS-TYPING-DOTS`: testids=["cd-phone-status-dots"], tests=[m3-1126-k-phone-status-playwright.mjs] ✓
- `SELL-PRODUCT-SHEET-POS`: tests=[spec-guard-pos-playwright.mjs], bgDiv Y ≥ 100px (portrait) ✓
- `maxTodo` 9→1 (8개 정리) ✓

### ⚠ 갭 (블로커 아님)

- `SELL-PRODUCT-SHEET-POS` PW 테스트가 portrait(390×844)만 커버, iPad landscape(1366×1024) 뷰포트 케이스 없음
- fix 로직은 `useWindowDimensions` 동적이므로 iPad landscape도 올바르게 작동 — 블로커 아님

---

## fork#289 — fix(draft-duplicate): M3-1127-H (코드 OK)

### 버그 재현 경로 (task 명세 일치)

`product-details.tsx:314 router.dismissTo('/(tabs)/cart')` → cart.tsx Redirect to sell
→ sell `useFocusEffect` 재실행 → `reconcileDraftOrderList` → `restoreWaitingDraftOrders`
→ 실제 draft 를 `_draftOrderList` 에 추가
→ 이 시점 `activeId='__temp__'` → 기존 로직: `__temp__` + 실제 ID = 칩 2개(#1·#1)

### Fix (`components/order-chips/types.ts` → `mergeActiveId`)

```typescript
if (activeId && activeId !== '__temp__' && !merged.some((e) => e.id === activeId)) {
  merged.unshift({ id: activeId, createdAt: nowMs });
}
```

- `'__temp__'` 가드 추가 — 경쟁 조건에서 플레이스홀더 무시 ✓
- 실제 ID 는 여전히 prepend ✓
- 중복 방지(`.some` 체크) 유지 ✓
- `OrderChips.tsx` useMemo 에서 `mergeActiveId` 사용으로 교체 ✓

### 테스트 (`__tests__/m3-1127-h-draft-duplicate.test.ts`)

- 경쟁 조건 재현: `list=[draftA] + activeId='__temp__'` → merged 1개 ✓
- `[검증의 검증]`: 가드 제거 시 2개 → 버그 직접 재현 ✓
- 여러 주문 보존: `draftA + draftB = 2개` ✓
- 정상 경로: `list=[] + activeId='draftA'` → 1개 ✓

### 손님 화면 스냅샷 여지

- `__temp__` 는 서버 사이드 state 에 절대 없는 로컬 낙관적 플레이스홀더
- 고객 화면 snapshot 은 서버 `/customer-display/snapshot` → `__temp__` 등장 여지 없음 ✓

### #288 중복 포함

- spec-guard-map.json · product-details.tsx 등 — 두 PR 모두 동일 최종 SHA 로 수렴
- #288 머지 후 #289 리베이스 시 자동 conflict-free ✓

---

## PR 코멘트 URL

- fork#288: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/288#issuecomment-7212396881
- fork#289: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/289#issuecomment-7212399339
