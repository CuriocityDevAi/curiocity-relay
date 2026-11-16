#301 네이티브 이동 수정 · e2e 3/3 · pos-integration ✅

## 블로커 수정 내용

**근본 원인**: `_layout.tsx`에서 `setLiveToken`이 `BootValue`에 노출되지 않아, `pair.tsx` 성공 시 `saveDeviceToken` 후 레이아웃이 `liveToken === null` 상태로 머물러 `/pair` 리디렉션 루프 발생. 웹은 `window.location.replace`로 우회했지만 네이티브에는 이동 경로 없음.

**수정 (REQ 1 — 권장안 1)**

| 파일 | 변경 |
|------|------|
| `src/lib/boot-context.tsx` | `BootValue`에 `setPaired: (token: string) => void` 추가 |
| `app/_layout.tsx` | `setPaired = (token) => setLiveToken(token)` useCallback 추가 — 조건부 return **앞**에 배치 (Rules of Hooks) |
| `app/pair.tsx` | `window.location.replace` 제거 → `setPaired(token) + router.replace("/")` 단일 경로 |

**추가 버그 수정**: `setPaired` useCallback을 조건부 early return 뒤에 넣었다가 Rules of Hooks 위반으로 렌더 blank 발생 → 조건부 return 앞으로 이동.

## 검증

### vitest (128/128)
- `pair-flow.test.ts` 신규 4케이스:
  - liveToken null → redirect 필요
  - setPaired(token) → liveToken 변경 → redirect 없음
  - 로딩 중(undefined) → redirect 없음
  - pairDevice 성공 → setPaired + router.replace('/') 호출, /pair 재진입 없음
  - pairDevice 실패 → setPaired · router.replace 호출 없음

### e2e Playwright (27/27, 8 skipped)

pair-screen 3/3:
- ✅ no device token → /pair 렌더
- ✅ 6자리 입력(mock POST) → 대기 화면 이동 (스샷: `screenshots/pair-screen-success.png`)
- ✅ 실패 → 오류 메시지 + 칸 비움

스샷: `/pair` 6자리 입력 후 대기화면(pastel 테마 · "Belanja hari ini, poinnya masuk ke nomor HP kamu.") 확인.

### CI (run 43816887049)

| 잡 | 결과 |
|---|---|
| customer-display | ✅ |
| pos-integration | ✅ |
| unit-commerce-core | ✅ |
| e2e-admin-loyalty | ✅ |
| markers-and-forbidden | ✅ |
| docker-smoke-commerce-core | 기존 불량(본 PR 무관) |

## 커밋

- `94b7097` fix(customer-display): M3-1116-J — 네이티브 pair 성공 후 대기화면 이동 수정
- `76fcbd5` chore(feature-map): M3-1116-J — pair-flow.test.ts 등록
