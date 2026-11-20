# M3-1120-E 리포트

**#218 충돌 해소 O · CI QUEUED(lint·route 대기중) · #409 feature-map O · diff 파일 2개(apps/customer-display/app/mirror.tsx · docs/feature-map.yaml) · CI feature-map-check/route/changes-filter/markers-and-forbidden SUCCESS · heavy-mac IN_PROGRESS · heavy-cloud SKIPPED**

---

## 1. fork #218 — 충돌 해소

### 작업 내용

- 브랜치 `feat/M3-1120-B-cd-preview-r1` 에는 R1·lint fix 2커밋이 master에 squash(d2a28e3 = #214+#215) 로 이미 포함됨 → `git rebase --onto origin/master 860d823`으로 R2 커밋(234afe0)만 origin/master 위로 올림
- prettier 오류 1건 수정: `components/cd-preview/__tests__/CdPreviewWindow.test.ts:69` 쌍공백 → 단공백
- 최종 HEAD: `13a24ac`

### 변경 파일 (origin/master 대비 diff, 7개)

| 파일 | 변경 내용 |
|------|-----------|
| `app/(tabs)/_layout.tsx` | kindToBadgeState·CdHeaderRight·snapshot 실연결 |
| `components/cd-preview/CdPreviewOverlay.tsx` | snapshot 폴링 + lastUpdatedAt 전달 |
| `components/cd-preview/CdPreviewWindow.tsx` | placeholder → WebView + ageText + injectJavaScript |
| `components/cd-preview/__tests__/CdPreviewWindow.test.ts` | 비율·ageText 테스트 추가 |
| `components/cd-preview/__tests__/CdStatusBadge.test.ts` | kindToBadgeState 테스트 추가 |
| `constants/api.ts` | MEROS_CD_WEB_URL 추가 |
| `e2e/flows/cd-preview.spec.ts` | R2 mirror/크기 테스트 추가 |

### 로컬 검증

```
vitest: 3 test files · 37 tests passed (166ms)
lint:   npm run lint → 0 errors · 63 warnings(pre-existing)
```

### Playwright cd-preview 로컬 실행

```
e2e/flows/cd-preview.spec.ts — 5 passed / 1 failed (15.9s)

PASS: CD Preview R1 — badge button visible at 1024w
PASS: CD Preview R1 — window opens on button press
PASS: CD Preview R1 — window closes on second button press
PASS: CD Preview R1 — badge button visible at 600w (narrow)
PASS: CD Preview R2 — window size S: width ~15% of viewport
FAIL: CD Preview R2 — window contains mirror WebView after open
  → cd-preview-age testID not visible (timeout 3000ms)
  → 원인: RN Web에서 WebView=iframe, 실제 CD web 접속 없이 ageText 요소 렌더 불완전
  → R0 리포트 "미검증 항목" 항목과 동일한 한계 — 실기 테스트 필요
```

### CI 상태 (push 후 curiocity-mac-fork 대기 중)

```
route: QUEUED
lint:  QUEUED
```
→ 큐 진입 확인됨 · 결과는 CI 완료 후 추가 확인 필요

---

## 2. storeport #409 — feature-map 등록 + diff 정리

### 작업 내용

a. **feature-map-check 수정**: `docs/feature-map.yaml`에 `cd-mirror` 항목 추가

```yaml
- id: cd-mirror
  name: CD Preview 미러 (M3-1120-D)
  summary: POS CD Preview WebView가 로드하는 read-only 미러 라우트...
  status: live
  files:
    - apps/customer-display/app/mirror.tsx
```

b. **diff 정리**: `41c279c`(feat/ci: M1-1120-C — PARTNER_REPO 합산, 이미 main에 #407로 머지됨)를 `git rebase --onto origin/main 41c279c`로 제거 → diff에서 `route-heavy.sh` · `ci.yml` 제거됨

### 최종 diff 파일 목록 (2개)

| 파일 | 상태 |
|------|------|
| `apps/customer-display/app/mirror.tsx` | added (115줄) |
| `docs/feature-map.yaml` | modified (+7줄, cd-mirror 항목) |

### CI 상태

```
check (feature-map-check):   COMPLETED/SUCCESS ✅
route:                        COMPLETED/SUCCESS ✅
changes-filter:               COMPLETED/SUCCESS ✅
markers-and-forbidden:        COMPLETED/SUCCESS ✅
heavy-mac:                    IN_PROGRESS (실행 중)
heavy-cloud:                  COMPLETED/SKIPPED
```

---

## 3. 미러 동작 범위 (PR 본문 "후속" 등록 완료)

> 현재 미러는 POS `pos_screen` 기준 단순 라우팅 — 손님 화면 로컬 전이(영수증→번호입력후→동의 등)는 반영 안 됨 · 번호 입력 흐름 v2(#408) 구현 시 정렬 예정

- #218 · #409 PR 본문 모두 "후속" 섹션에 1줄 추가 완료

---

## 종합

| 항목 | 결과 |
|------|------|
| #218 충돌 해소 | ✅ rebase --onto 성공 · force push |
| #218 lint | ✅ 0 errors (prettier 1건 수정 포함) |
| #218 vitest(37) | ✅ 37/37 pass |
| #218 Playwright | ⚠️ 5/6 pass · R2 mirror ageText 1건 fail (RN Web iframe 한계) |
| #218 CI | ⏳ QUEUED — curiocity-mac-fork 배치 대기 |
| #409 feature-map | ✅ cd-mirror 등록 · check SUCCESS |
| #409 diff 파일 | ✅ 2개 (mirror.tsx · feature-map.yaml) |
| #409 CI | ✅ 4/5 checks pass · heavy-mac IN_PROGRESS |
| PR 본문 "후속" | ✅ #218 · #409 모두 추가 완료 |
