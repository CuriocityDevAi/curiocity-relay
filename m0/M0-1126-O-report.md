PASS 462 1e634659e75f02bbd349b4dc6bd10b4aab43dea5

# M0-1126-O — CD mirror postMessage 경로 + origin 허용 목록 (V4-9)

**브랜치**: `feat/M0-1126-O` (base = `origin/main` @ b22c2ed · 스택 없음)
**PR**: https://github.com/CuriocityDevAi/storeport/pull/462
**커밋**: `1e634659e75f02bbd349b4dc6bd10b4aab43dea5`

## 원인

fork #275 (M3-1126-L/O) 가 **웹 POS 미리보기를 iframe + `postMessage({type:'pos-mirror', detail}, <CD origin>)` 로 바꿨는데**, storeport `apps/customer-display/app/mirror.tsx` 는 `window` CustomEvent `"pos-mirror"` 만 들어 **`message` 리스너가 없음** → preview 가 Loading 에서 멈춤 (V4-9 "Preview 가 Loading 으로 만 나오고 동작하지 않아").

## 조치

1. `mirror.tsx` 에 `window.addEventListener("message", ...)` 추가 — origin 허용 목록 필터 + `e.data.type === "pos-mirror"` 조건.
2. 두 경로(CustomEvent / postMessage) 가 같은 `applySnapshot(detail)` 로 합류 — 중복 로직 금지.
3. iPad native WebView(injectJavaScript → CustomEvent) 경로는 무변경 — 회귀 없음 테스트로 보호.

## 허용 origin 목록 (설정값 · 하드코딩 아님)

**기본 defaults** (호출부 `mirror.tsx` 에서 조립):
- `window.location.origin` — 운영 어드민과 CD 가 **동일 host 로 서빙** 되는 전형 배포(어드민 서버가 `/customer-display-web/` 로 CD 서빙) 자동 커버.
- `http://localhost:8081` — 로컬 `expo start` 포트 (`LOCAL_DEV_POS_MIRROR_ORIGINS` · `src/lib/pos-mirror-origins.ts`).

**env override** (별 origin · CORS 어드민):
- `EXPO_PUBLIC_POS_MIRROR_ORIGINS=origin1,origin2,...` (comma-split · trim · 중복 제거). non-empty 면 defaults 를 **대체**.

**정리**:

| 소스 | 값 |
| --- | --- |
| defaults | `[window.location.origin, "http://localhost:8081"]` |
| override | `process.env.EXPO_PUBLIC_POS_MIRROR_ORIGINS` (optional) |
| final | override 있으면 override 만, 없으면 defaults |

## 건드린 파일 (5)

- `apps/customer-display/app/mirror.tsx` — message 리스너 + 공유 핸들러 + env override 조립
- `apps/customer-display/src/lib/pos-mirror-origins.ts` (신규) — pure parser/isAllowed + `LOCAL_DEV_POS_MIRROR_ORIGINS` 상수
- `apps/customer-display/src/lib/__tests__/pos-mirror-origins.test.ts` (신규) — 7 unit
- `apps/customer-display/e2e/mirror-postmessage.spec.ts` (신규) — 4 e2e
- `docs/feature-map.yaml` — `cd-mirror` 프로세스(id) 에 신규 3파일 등재

## QC 로그 (heavy-mac 동급 · 로컬)

```
bash scripts/naming-check.sh
  ✓ naming-check PASS (검사 1: 'meros' 매치 = 0 · 검사 2: Medusa 모듈명 규격 정합
    · 검사 3: [...x] 라우트 폴더 없음 · 검사 4: 동명 마이그레이션 없음)

pnpm --filter customer-display typecheck
  tsc --noEmit — 에러 0

pnpm --filter customer-display test
  Test Files  17 passed (17)
  Tests  334 passed (334)
  Duration  361ms

pnpm --filter customer-display build:web
  Exported: dist · /mirror (28KB) 포함 14개 정적 라우트

CD_E2E_PORT=4275 pnpm --filter customer-display e2e --workers=4
  143 passed · 8 skipped · 0 failed
  ✓ e2e/mirror-postmessage.spec.ts (신규, 4건):
    ✓ iPad native 경로: CustomEvent('pos-mirror') 는 그대로 동작한다
    ✓ 웹 iframe 경로: 허용 origin postMessage 는 반영된다
    ✓ 웹 iframe 경로: 다른 origin postMessage 는 무시된다
    ✓ 허용 origin 이라도 type 이 다르면 무시
```

## 보존 (specs/screens/customer-display.md)

- iPad native WebView(CustomEvent) 경로: 회귀 없음 테스트(e2e #1) 로 보호.
- `posScreenToDisplay` · 화면 컴포넌트(Cart/Done/Keypad/Main/Qris/Receipt) · OrderSnapshot 모델 모두 무변경.
- 미리보기 콜백은 no-op (POS 오버레이 터치 차단 보완) — 그대로 유지.

## PR 본문 Kyu 확인 항목

1. 웹 POS 미리보기(iframe) 에서 POS 상태 변경 시 CD preview 가 **실시간 반영** 되는지 (Loading 고착 X).
2. 기존 iPad 손님 화면이 `injectJavaScript` CustomEvent 로 받는 흐름이 **그대로 동작** 하는지.
3. 허용 origin 설정값이 운영 환경에 맞는지 — 어드민과 CD 가 **다른 host** 라면 `EXPO_PUBLIC_POS_MIRROR_ORIGINS` 에 어드민 origin 을 추가.
4. origin 설정 변경 시 CD web 재빌드 (`pnpm --filter customer-display build:web`) 필요 — 번들 시점에 env 가 박히는 구조.

## 규약 체크

- 스택 금지: ✓ base = origin/main (b22c2ed) 에서 1개 커밋 분기. ledger/decision-stacked-pr-ci-20261126.md 준수.
- 네이밍 3층 (CLAUDE.md §0): ✓ meros 매치 0. 운영 어드민 host 는 `window.location.origin` 으로 소스 무노출.
- feature-map: ✓ `customer-display.cd-mirror` 에 신규 3파일 등재 · `processes: [customer-display.cd-mirror]` 본문 포함.
- /loop 금지: ✓ 사용 안 함.
- 35분 상한: ✓ 계측 시작 ~21:10 (install+typecheck+test+build+e2e×2+commit+push+PR) · 완료 ~21:22 → ~12분.
