# R0-1116-E 리뷰 보고서

#291 APPROVE · #149 APPROVE · 로컬 검증: storeport commerce-core tsc 0 errors / overlap 16/16 ✅ · fork loyalty-snapshot 12/12 ✅ ESLint 0 ✅

---

## PR #291 — feat(admin): M1-1116-D Customer Display Admin UI

### 로컬 검증
- `tsc -p apps/commerce-core/tsconfig.json --noEmit` → **0 errors** (skipLibCheck 적용; main 대비 신규 에러 없음)
- Jest `overlap.unit.spec.ts` → **16/16 pass**
- 전체 테스트: M1 report 기준 326 passes (별도 재실행 미시행 — Postgres 없음)

### 시안 ①② 요소 대사
M1-1116-D-report 대사와 코드 대조:
- **Theme 탭**: ThemeGrid 20종 · CHANGED 배지 · store image upload/replace/remove · sticky PreviewPanel(5화면 탭 + View as date + 이벤트 그리팅 배너) · 황색 변경 배너(changedKeys 개수·필드명) · Discard/Apply to stores · 우상단 Live 배지·applied X ago·– iPads online · Restore previous → ✅ 전부 구현됨
- **Events 탭**: EventCalendar 12-month · 이벤트 목록(상태 배지·Preview·Edit·Delete) · EventForm(7종 이벤트·From/To·이슬람력 Fill·겹침 경고·우선순위 라디오·문구 30자+Reset+카운터·미리보기) → ✅ 전부 구현됨
- **빠진 항목 없음**

### 겹침 판정 (하루 1이벤트·우선순위 미선택 시 저장 불가)
`checkEventOverlap` (customer-display-api.ts) 분석:
- 로직: `newFrom <= ev.to_date && newTo >= ev.from_date` → 겹침 감지, 겹치는 날짜 목록 반환 ✅
- 저장 가드: `allPriorityResolved = conflictingDates.every(d => !!priorityPicks[d])` + `canSave = ... && allPriorityResolved` → 미선택 시 Save 버튼 disabled ✅
- **제약**: `checkEventOverlap`은 **첫 번째 충돌 이벤트만 반환하고 종료** (`for` loop early return). 이벤트 A·B 둘 다 겹칠 때 클라이언트는 A와의 충돌만 표시 → 사용자가 A를 해결 후 Save 시 서버에서 B와의 충돌로 400 반환 가능. UI에 "server enforces strict no-overlap — Save will be blocked if dates still conflict" 명시되어 있어 머지 블로커는 아님. 별도 TODO 권장.

### 문구 30자
`validateMessage`: `msg.length <= 30` (JS string.length). `<Input maxLength={30}>` 과 동일 기준. 멀티바이트(이모지) 테스트 포함 ✅.
서버 측 길이 계산 단위(byte vs char) 불일치 가능성은 M0 범위.

### 서버에 없는 API(404) 분기 안전성
- `fetchCdSettings`/`fetchCdEvents`: 404 → DEV mockFn, PROD throw → loadError 화면. ✅
- `discardDraft`: page.tsx L2724 `catch {}` 블록에서 모든 에러 삼키고 로컬 상태 초기화 + 주석으로 의도 명시. ✅ 안전
- `revertToPrevious`: `.catch()` 에서 `status === 404 || message.includes("404")` → `fetchCdSettings` 폴백. ✅ 안전
- `applyDraft`: page.tsx에서 미사용; `handleApply`는 `updateCdSettings` 직접 호출. ✅
- `addCdEvent/updateCdEvent/deleteCdEvent/fetchIslamicSuggestions`: 서버 #266 엔드포인트. 에러 시 toast.error 처리됨. ✅
- **전체 404 분기 안전**.

### 미리보기 복사본 Drift 위험
`tokens.ts` 주석: "Colour token snapshot — mirrors apps/customer-display/src/theme/tokens.ts. Admin-only copy so the admin bundle does not depend on the customer-display app." 의도적 복사본. customer-display 테마 변경 시 Admin 미리보기와 실제 손님 화면 차이 발생 가능. 머지 블로커 아님; 추후 shared-package 고려 권장.

### Admin 빌드 새 의존성
외부 패키지 추가 없음 — `@medusajs/ui`, `@medusajs/admin-sdk`, React 등 기존 패키지만 사용. ✅

### 판정
**APPROVE** — 머지 블로커 없음. 일반 코멘트 2건 제출.

---

## PR #149 — feat(loyalty): M3-1116-D 손님 화면 연결 뱃지

### 로컬 검증 (pos-m3 worktree = feat/m3-1116-d)
- `vitest run __tests__/loyalty-snapshot.test.ts` → **12/12 pass** ✅
- ESLint (loyalty-snapshot, pos-loyalty, CustomerDisplayStatus) → **0 errors** ✅
- tsc: PR 관련 파일 신규 에러 없음 ✅

### 판정 경계 (15s/30s)
```
if (diffSec > 30) return { kind: 'offline' };
if (snapshot_state === 'active' && !pre_entry && diffSec <= 15) return { kind: 'entering' };
return { kind: 'connected' };
```
- diff=15.0s → entering (경계 포함) ✅
- diff=15.001s → connected ✅
- diff=30.0s → connected ✅  
- diff=30.001s → offline (경계 초과) ✅
- pre_entry=true + diff ≤ 15s → connected (번호 이미 입력) ✅
- offline이 entering보다 우선 (diff > 30s) ✅
- 모든 경계 단위 테스트 통과.

### 페어링 없을 때 폴링 안 함
`enabled: !!registerId` → registerId가 undefined/null이면 쿼리 disabled. ✅

### 화면 떠날 때 폴링 정리 (메모리·배터리)
`useQuery` + `refetchInterval: 10_000`은 TanStack Query가 observer count 기반으로 관리. `CustomerDisplayStatus` unmount → observer 0 → refetchInterval 자동 중단. `Stack.Screen headerRight`에 마운트되어 checkout 화면 이탈 시 unmount됨. ✅

### #148 위 브랜치 — #148 변경은 범위 밖
baseRef: `feat/m3-1116-c`. diff에 #148 관련 수정 없음. ✅

### 판정
**APPROVE** — 머지 블로커 없음.

---

## 미실행 항목
- storeport Playwright 미구성 — Admin UI 화면 미검증 (#291)
- 서버 `GET /admin/pos/registers/:id/snapshot` 미구현 — 뱃지 항상 `hidden` (#149)
