#303 APPROVE · #301 CHANGES · 네이티브 이동 블로커

## #303 — fix(customer-display-settings): TS2869 중복 `?? {}` 제거

**APPROVE**

- diff 1파일(`service.ts`) ✅
- L438·L458·L503·L550 — `((row.events_overrides ?? {}) as EventOverrides) ?? {}` → `(row.events_overrides ?? {}) as EventOverrides` 4곳, 동작 동일 ✅
- 나머지 diff(L142 if 단일행, L511 ternary 개행): 포매팅 전용, 의미 변경 없음 ✅
- pos-integration CI(run 43808157220): **Build commerce-core ✅** (TS2869 해소) · Run POS integration tests 진행 중
- docker-smoke-commerce-core: 기존 불량(ExitCode 7 타임아웃), 본 PR 무관 ✅
- 셀프 PR 계정 제약으로 COMMENT 제출(APPROVE 의사 명기)

---

## #301 — feat(customer-display): 페어링 키패드 3열 · 6자리 자동 인증

**CHANGES (블로커 1건)**

### 체크리스트
| 항목 | 결과 |
|------|------|
| diff 4파일만(pair.tsx·strings.ts·context.tsx·e2e/pair-screen.spec.ts) | ✅ |
| #295 코드 재추가 없음 | ✅ |
| 6자리 자동 제출 — `useEffect([digits, doSubmit])` 6번째 입력 1회 발사 | ✅ |
| StrictMode 이중 발사 없음 (mount 2회이나 초기 digits="" → 조건 불충족; update 시 1회) | ✅ |
| 실패 후 재입력 — `setDigits("")` → useEffect 재실행 없음 | ✅ |
| 로딩 중 입력 잠금 — `press()`·`delOne()` loading guard + `disabled={loading}` | ✅ |
| 실패 시 칸 비움 — `setDigits("")` catch block | ✅ |
| raw 색상 0 — hex 7개 모두 테마 토큰 대체(`shadowColor:"#000"` 기존 코드 미변경) | ✅ |
| 웹 이동 — `window.location.replace("/customer-display-web/")` | ✅ |
| **네이티브 이동** | **❌ 블로커** |

### 블로커: 네이티브 이동 경로 없음

`doSubmit`의 `if (Platform.OS === "web" ...)` 분기 이후 native 경로에 화면 이동 코드가 없음.

`_layout.tsx`의 `liveToken`은 마운트 시 `getDeviceToken()` 1회 읽기(`useEffect([mounted, useMock])`), `BootValue`에 setter 미노출 → `saveDeviceToken` 후 레이아웃이 `liveToken === null`로 남아 `/pair` 리디렉션 루프.

**수정 방향(둘 중 하나)**
1. `_layout.tsx`에 `setPaired: (token: string) => void` → `setLiveToken(token)` 추가 후 `BootValue`에 노출, `pair.tsx` doSubmit에서 native 시 호출
2. 또는 Expo Router `router.replace("/")` 후 `_layout.tsx` useEffect를 storage 변화에 반응하도록 변경

### CI
- customer-display ✅ · e2e 3/3 ✅
- pos-integration ❌: 기존 TS2869(#303 머지 전), 본 PR 무관
- docker-smoke-commerce-core ❌: 기존 불량 무관
