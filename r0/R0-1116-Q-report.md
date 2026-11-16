#301 APPROVE · 네이티브 이동 OK · pos-integration ✅

## 체크리스트

| 항목 | 결과 |
|------|------|
| REQ 1 — `setPaired(token)` → liveToken 갱신 → /pair 루프 없음 | ✅ |
| REQ 1 — `router.replace("/")` 웹 경로(baseUrl 적용) 올바름 | ✅ |
| REQ 2 — #302 keep-awake 충돌 없음(merge-tree 시뮬레이션) | ✅ |
| REQ 2 — diff 범위 pair.tsx · _layout.tsx setter · boot-context · i18n · 테스트 | ✅ |
| REQ 3 — 6자리 자동제출 · 이중발사 없음 · 실패재입력 · 로딩잠금 | ✅ |
| REQ 3 — raw 색상 0 (shadowColor:"#000" 기존 코드 미변경) | ✅ |
| REQ 4 — pos-integration CI | ✅ SUCCESS |
| REQ 4 — customer-display CI | ✅ SUCCESS |

## 상세

### REQ 1 — 블로커 해소

- `boot-context.tsx`: `BootValue`에 `setPaired: (token: string) => void` 추가 ✅
- `_layout.tsx`: `setPaired = useCallback((token) => setLiveToken(token), [])` → 조건부 return **앞** 배치(Rules of Hooks 준수) ✅
- `pair.tsx`: `window.location.replace("/customer-display-web/")` 제거 → `setPaired(token) + router.replace("/")` 단일 경로 ✅
- 웹 경로: Expo Router가 `app.json` baseUrl(`/customer-display-web/`) 적용 → `router.replace("/")` = 대기 화면 ✅

### REQ 2 — #302(keep-awake) 충돌

`git merge-tree --write-tree origin/main origin/feat/m3-1116-h` 무충돌 반환.
머지 트리(`15765b7d`)의 `_layout.tsx` 확인:
- `import { activateKeepAwakeAsync } from "expo-keep-awake"` 보존 ✅
- `useEffect(() => { activateKeepAwakeAsync().catch(() => {}); }, [])` 보존 ✅
- `setPaired` useCallback 추가됨 ✅

### REQ 3 — 이전 ✅ 유지

6자리 자동제출(`useEffect([digits, doSubmit])`), StrictMode 이중발사 없음(초기 digits="" → 조건 불충족), 실패 후 재입력(`setDigits("")` catch), 로딩잠금(`loading` guard), raw 색상 0(`shadowColor:"#000"` 기존 코드 미변경) 모두 diff에서 보존 확인.

### REQ 4 — CI (run 43816887049 기준)

- pos-integration: ✅ SUCCESS
- customer-display: ✅ SUCCESS
- unit-commerce-core: ✅ SUCCESS
- e2e-admin-loyalty: ✅ SUCCESS
- markers-and-forbidden: ✅ SUCCESS
- docker-smoke-commerce-core: 기존 불량(본 PR 무관)

## 기존 블로커 스레드

`PRRT_kwDOTe-UYs63ylZ1` — 이미 `is_resolved: true` 상태(M3 개발자가 답글+resolve 완료).

## 결론

APPROVE (셀프 PR 계정 제약으로 COMMENT 제출, APPROVE 의사 명기)
