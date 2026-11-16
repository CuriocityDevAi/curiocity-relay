#302 CHANGES · 운영 웹 영향 없음 · pos-integration ❌(기존)

## CI 결과

| job | 결과 |
|-----|------|
| check (feature-map-check) | ❌ FAIL — blocker (아래) |
| pos-integration | ❌ FAIL — **기존 불량** (main run 43802538623 동일 실패 확인) |
| customer-display | ✅ PASS |
| e2e-admin-loyalty | ✅ PASS |
| unit-commerce-core | ✅ PASS |
| markers-and-forbidden | ✅ PASS |
| docker-smoke-commerce-core | pending (기존 불량 · 판정 제외) |

## REQ 검토

**REQ 1 — 운영 웹 영향 0** ✅  
- Dockerfile(`cd-builder` stage)는 `app.json` 직접 참조 없음 — `COPY apps/customer-display/` + `run build:web` 경로.  
- Docker 환경 `EAS_BUILD_PLATFORM` 미설정 → `isNativeBuild = false` → `config.experiments.baseUrl = '/customer-display-web'` 유지.  
- M0 실측: `pnpm build:web` → `dist/index.html` `/customer-display-web/` prefix 확인.

**REQ 2 — PLACEHOLDER URL 런타임 안전** ✅  
- `EAS_PROJECT_ID` 없을 때 `updates.url = 'https://u.expo.dev/PLACEHOLDER-RUN-EAS-INIT'` (non-empty 문자열, 런타임 오류 없음).  
- 웹 빌드는 `expo-updates` 비관여. 네이티브 dev-client: development profile 에서 업데이트 강제 없음.  
- `extra = undefined` 처리 정상. M0 `expo-doctor` 20/20 pass 확인.

**REQ 3 — keep-awake 웹 무해 · 네이티브 활성 · #295 회귀 없음** ✅  
- `activateKeepAwakeAsync().catch(() => {})` — 웹 거부 시 삼킴, 네이티브 활성.  
- useEffect 는 mount-gate / mockState / liveToken 흐름과 완전 독립. #295 boot/mock 로직 무회귀.

**REQ 4 — dev-refresh.sh** ✅  
- main gate: `current_branch != "main"` 시 에러 종료 + 안내 메시지.  
- 인라인 `#` 주석 없음 — 모든 `#` 는 독립 줄 주석.  
- POS 스크립트(`~/projects/pos-m0-bk/scripts/dev-refresh.sh`)와 구조 동형.

## 블로커

**feature-map-check 실패**: `app.json` 이 이 PR 에서 삭제됐으나 `docs/feature-map.yaml` `cd-envelope` files 목록에서 제거되지 않아 unmatched 판정.

```
"unmatched": ["apps/customer-display/app.json"]
```

fix: `docs/feature-map.yaml` cd-envelope 의 `- apps/customer-display/app.json` 줄 삭제.  
(`app.config.ts` 는 이미 추가됐으므로 대체 선언은 완료 — 삭제만 남음.)

PR 라인 코멘트 등록 완료: https://github.com/CuriocityDevAi/storeport/pull/302
