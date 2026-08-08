# K0-0807-K · v0.3 구현 2탄 · I+2 hubs.json registry (⑥ N-허브 · Q-I-6 fallback + 온보딩 실증)

**허브**: K0 · test-portal
**일자**: 2026-08-08
**상태**: **완료** (PR #63 · **실기 없음** · 다음 Kyu 실기 지점 = I+8 미션 보드)

---

## [실기] · 없음 (내부 계층 · Kyu 명시)

**K = 내부 계층 라운드**: hubs registry + 소비자 전환 · UI 파급 (미션 보드) 은 I+8 에서.
**다음 Kyu 실기 지점 = I+8 미션 컨트롤 보드**.

### 확인 A · CLI 실측 (Kyu 선택 · 실행 안 해도 됨)

```bash
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge hubs
# → fallback 경고 + 초기 4 허브 표시
```

### 확인 B · hubs.json 편입 (선택 · deprecation 해소)

```bash
node -e "
import { defaultHubs, hubsPath } from '~/projects/test-portal/tools/kyu-bridge/src/hubs.mjs';
import { writeFileSync } from 'node:fs';
writeFileSync(hubsPath(), JSON.stringify({ version: 1, hubs: defaultHubs() }, null, 2));
"
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge hubs
# → source: file · 검증 ✓ OK
```

### 확인 C · 새 프로젝트 편입 (⑥ 존재 증명)

Kyu 가 hubs.json 편집 · 새 허브 항목 추가 → CLI/watcher/queue 자동 인식.

---

## 완료 요약

### PR #63 (feat/k0-0807-k-hubs-registry · `bf64201`)

- 11 파일 · 1039+ / 27-
- pnpm check 952 파일 0 err 0 warn
- pnpm test 497 pass (신설 23: hubs 17 · onboarding 6)
- pnpm build ✔
- **PR #62 (J) 위에 rebase** · J 병합 후 순차

### K-1 · hubs.mjs (스키마 · 로딩 · 검증)

- **Hub 스키마**: slug · hubKey · relayFolder · repoFullName · localPath · ports? · devCommand? · migrateCommand? · envFile? · enabled
- **defaultHubs()**: 초기 4 (k0/test-portal · n0/grownest · t0/todoboss · m0/storeport-anchor · K0-0807-B 재확증 정본)
- **validateHubs()**: 스키마 · 중복 slug/hubKey · 포트 충돌 (활성 허브만)
- **loadHubs()**: 파일 우선 · fallback + **deprecation 경고** (Q-I-6)
- **enabledHubs · findHub · findHubByKey** helpers
- deps 0 · Node 22 stdlib only

### K-2 · 소비자 전환 (4 파일)

**tools/kyu-bridge/src/whitelist.mjs**:
- `allowedSlugsFromHubs(hubs)` 신설
- `isAllowedSlug(value, allowedList?)` 확장 · ALLOWED_SLUGS 상수 fallback

**tools/kyu-bridge/src/events-store.mjs**:
- `extractHub(path, hubKeys?)` 동적 지원 · 정규식 escape
- `isReportFile(path, hubKeys?)` 동적 지원
- FALLBACK_HUB_KEYS 상수 유지

**tools/kyu-bridge/src/server.mjs**:
- `createBridgeServer({ hubs })` opt 신설
- dynamicAllowedSlugs · portMatrixFromHubs
- **GET /hubs endpoint 신설** (Bearer · 포털 소비)
- /health `allowed_slugs` 동적 · `hubs_source` 표기
- handleStart/Stop 에 portMatrix 인자
- KYU_BRIDGE_VERSION 0.3.0

**tools/kyu-devenv/src/registry.mjs**:
- `loadDevenvRegistry({ log? })` async 신설 · dynamic import kyu-bridge hubs.mjs
- hubs.json 있으면 5 필드 변환 · 없으면 DEVENV_REGISTRY (기존) + deprecation

### K-3 · 온보딩 실증 (⑥ 존재 증명)

**CLI**: `kyu-bridge hubs` = 목록 + 검증 결과

**통합 test 6 케이스**:
- dummy-hub 등록 → hubs.json validated
- extractHub 동적 인식 (x0 = fallback 불가 · 동적 배열로 인식)
- /health allowed_slugs 편입
- /hubs endpoint 5 항목
- /start 미등록 slug 400 · dummy-hub hint 포함
- queue 격리 (dummy-hub 큐 ≠ grownest 큐)

**결과 = "프로젝트 추가 = 설정 1건" 존재 증명 완료**

### kyu-bridge hubs 실측 로그 (K0 재현)

```
kyu-bridge hubs
  path: /Users/kyu.lee/.kyu-bridge/hubs.json
  source: fallback (hardcoded default)

  [hubs] ~/.kyu-bridge/hubs.json 없음 → 하드코딩 fallback 사용 (Q-I-6 정합).
       deprecation: hubs.json 으로 이전하세요 (kyu-bridge hubs --write-default)
검증: (fallback · defaultHubs · 4건)

허브 (4건):

  ● test-portal          hubKey=k0  CuriocityDevAi/test-portal
    localPath: ~/projects/test-portal

  ● grownest             hubKey=n0  CuriocityDevAi/grownest
    localPath: ~/projects/grownest
    ports:     3000(web) · 3002(backend)
    dev:       npm run dev:all
    migrate:   npm run migrate:dev -- up
    envFile:   .env.dev

  ● todoboss             hubKey=t0  CuriocityDevAi/todoboss
    localPath: ~/projects/todoboss
    ports:     4000(backend) · 4173(web-admin)
    dev:       npx concurrently -n backend,web-admin -c blue,green "cd b…
    migrate:   cd backend && pnpm run migrate:dev
    envFile:   backend/.env.dev

  ● storeport-anchor     hubKey=m0  CuriocityDevAi/storeport
    localPath: ~/projects/storeport
    ports:     3010(anchor)
    dev:       pnpm --filter anchor dev
    envFile:   apps/anchor/.env.dev
```

---

## 이연 순증감

**implemented (K0-0807-K)**:
- hubs.mjs · 스키마 · defaultHubs · validateHubs · loadHubs · helpers
- 소비자 전환 4 파일 (whitelist · events-store · server · kyu-devenv)
- CLI `kyu-bridge hubs`
- GET /hubs endpoint
- 온보딩 실증 통합 6 케이스

**신설 이연 (별건 라운드 · 순차)**:
- **I+3** 승인 큐 데이터 계층 (1일)
- **I+4** 원장 공유 스캐폴드 (1일)
- **I+5** headless 세션 (2일 · --session-id 실측)
- **I+6** 자동 투입 루프 (2일)
- **I+7** 안전장치 4 + 하트비트 (1.5일)
- **I+8** 미션 컨트롤 보드 + 세션 로그 라이브 (2.5일 · **Kyu 실기 지점**)
- **I+9** 포털 허브 탭 4 + head SHA 재조회 (2일)

**병합 순서**:
- PR #62 (J) 위에 rebase 된 PR #63 (K) · J 병합 후 순차

---

## 다음 대기 (Kyu 회신 후)

1. **PR #62 → PR #63 순차 병합** (실기 없음 · 내부 계층)
2. **I+3 착수 사인** (승인 큐 데이터 계층)
3. 순차: I+4 → I+5 → I+6 → I+7 → **I+8 (Kyu 실기 지점)** → I+9

---

*K0-0807-K · 2026-08-08 · v0.3 구현 2탄 · I+2 hubs registry · ⑥ N-허브 확장성 정본 · Q-I-6 fallback + deprecation · 온보딩 실증 · 실기 없음 · 다음 실기 = I+8*
