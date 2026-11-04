---
round: M0-1104-I
pr:
  storeport: storeport#179
outcome: railway-boot-hotfix · medusa-config 런타임 파일 I/O 제거 · 산출물 기동 BOOT OK · Playwright 4 항 재PASS
kyu_checks: 1 (railway-boot-stable · PR #179 머지 후 Railway 재배포 ENOENT 없이 BOOT OK)
---

# M0-1104-I · Admin 리브랜딩 (#178) Railway 기동 핫픽스

**일자**: 2026-11-04 · **허브**: M0 · **대상**: `apps/commerce-core/medusa-config.ts` + 런북.

**선행**: M0-1104-H (#178) · Kyu 가 #176 으로 Redeploy 해 서비스 복구 중.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | medusa-config 런타임 파일 읽기 제거 (favicon base64 내장) | ✓ |
| 2 | **빌드 산출물로 실제 기동** → `BOOT OK` 로그 | ✓ (이번 라운드 핵심 · 사고의 구멍 메우기) |
| 3 | Playwright 4 항 재확인 | ✓ (4/4 PASS) |
| 4 | 런북에 "asset 런타임 파일 읽기 금지 · 산출물 기동 검증" 1절 | ✓ |
| 5 | 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile) | **N/A** · package.json 미변경 |

---

## 1. 사고 뿌리 (I 가 보강한 "H 의 구멍")

### 사고 재현
```
$ cd apps/commerce-core/.medusa/server
$ NODE_ENV=production node -e "require('./medusa-config.js')"
Error: ENOENT: no such file or directory, open
  '/.../apps/commerce-core/.medusa/server/src/admin/assets/meros-favicon.svg'
at readFileSync (node:fs:449:20)
at Object.<anonymous> (.../.medusa/server/medusa-config.js:18:52)
```

### 왜 H 에선 안 보였나
- H 는 `pnpm --filter commerce-core build` PASS 만 확인. 빌드는 성공 — 다만 `src/admin/assets/` 는 **빌드 산출물에 포함되지 않음** (admin UI 는 `.medusa/server/public/admin/` 으로, 서버 TS 는 `.medusa/server/src/{api,modules,...}/` 로 산출 · asset 폴더는 둘 중 어느 경로에도 안 감).
- 로컬 node REPL 로 `require('./medusa-config.ts')` 하면 workspace 루트에 `src/admin/assets/` 가 있어서 통과. Railway Dockerfile 은 `.medusa/server/` 만 `COPY --from=builder` 하므로 ENOENT.
- **구멍**: "로컬 build PASS" 는 런타임 파일 I/O 누락을 잡지 못한다.

### 이번 라운드가 메운 것
- `medusa-config.ts` 에서 `readFileSync` + `node:fs`/`node:path` import 전부 제거.
- favicon SVG 를 **base64 상수**(`MEROS_FAVICON_SVG_B64` · 864 chars · 647 B 원본) 로 **직접 내장**.
- 재생성 절차 명시 (asset 수정 시 `base64 -i ... | tr -d '\n'` 로 상수 갱신).
- 로고 SVG 는 위젯의 ES `import` 로만 사용 → Vite 번들에 흡수 → server config 와 무관.

---

## 2. 변경 (3 파일)

| 파일 | 변경 |
|------|------|
| `apps/commerce-core/medusa-config.ts` | `readFileSync` + `node:fs` + `node:path` import 제거 · `MEROS_FAVICON_SVG_B64` 상수 내장 · `merosFaviconDataUri` 계산 · plugin 유지 |
| `docs/runbooks/admin-branding.md` | "asset 은 런타임 파일 읽기 금지 · 산출물 기동 검증" 1절 신규 (규약·기동 검증 블록·체크리스트 step 추가) |
| `docs/M0-1104-I-admin-boot.png` | Playwright 재검증 스샷 (`docs/M0-*-admin-*.png` 패턴 포섭) |

---

## 3. 검증 (산출물 실제 기동 · Dockerfile CMD 동일)

### 빌드
```
$ pnpm --filter commerce-core build
Backend  3.36s · Frontend 16.85s · PASS
```

### 산출물 config require (ENOENT 유무 즉시 확인)
```
$ NODE_ENV=production node -e "require('./medusa-config.js'); console.log('OK')"
[file] R2 미설정 · 로컬 저장
OK
```

### 산출물 기동
```
$ cd apps/commerce-core/.medusa/server
$ ... npx medusa db:migrate  # 모든 migration (admin seeds 포함) 완료
$ ... npx medusa start > /tmp/medusa-boot.log &
$ sleep 20 && tail /tmp/medusa-boot.log
[file] R2 미설정 · 로컬 저장
{"level":"info","message":"Creating server"}
{"level":"info","message":"OTEL registered"}
SENTRY disabled · SENTRY_DSN not set (set in Railway Variables to enable)
BOOT OK unknown :9999
...
{"activity_id":"...","duration":2685,"level":"info","message":"Server is ready on port: 9999"}

$ curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:9999/health
200
```

`BOOT OK unknown :9999` + `Server is ready on port: 9999` + `/health 200`. ENOENT 재발 안 함.

### Playwright 4 항 재확인
```json
{
  "title": "Meros Admin",
  "faviconHref": "data:image/svg+xml;base64,PD94bWw...",
  "faviconIsSvg": true,
  "faviconLen": 890,
  "heading": "Welcome to Meros",
  "logoVisible": true,
  "logoAlt": "Meros",
  "ok": true
}
```
4/4 PASS. 스샷: `docs/M0-1104-I-admin-boot.png` (PR 본문 임베드).

---

## 4. 런북 보강 (`docs/runbooks/admin-branding.md`)

"asset 은 런타임 파일 읽기 금지 · 산출물 기동 검증" 신설 절. 핵심:
- **규약**: server config 는 node_modules 외 어떤 파일에도 의존 X. 필요 asset 은 base64 상수 내장 (권장) 또는 위젯 ES import. 피치 못하면 `existsSync` 가드 + 기본값.
- **산출물 기동 검증 블록**: `pnpm build` → `.medusa/server` 에서 `medusa db:migrate` → `medusa start` → `BOOT OK` + `/health 200` 확인. **이 검증 없이 머지 금지**.
- **체크리스트 step 2** 로 "산출물 기동" 삽입 (로컬 build PASS 만으로 런타임 파일 I/O 누락 미감지 재발 방지).

---

## 5. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = medusa-config.ts (+ 런북 · 스샷) | ✓ |
| `node_modules` 수정 금지 | ✓ |
| 빌드 PASS | ✓ |
| **산출물 실제 기동 → BOOT OK** | ✓ (이번 라운드 핵심) |
| Playwright 4 항 재확인 | ✓ (4/4) |
| feature-map matched | ✓ |
| naming-check PASS (admin 예외 유지) | ✓ |
| 커밋 메시지 `!` 미사용 | ✓ |
| 상시 ⓑ (package.json 변경 시 격리 frozen-lockfile) | **N/A** · package.json 미변경 |
| 런북 "asset 런타임 파일 읽기 금지" 1절 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (Railway 기동 ENOENT 크래시) |
| 등재 | +1 (상시 조항 제안 — "asset 런타임 파일 읽기 금지 · 산출물 기동 검증" 런북 편입) |
| 미결 | 1 (railway-boot-stable · PR #179 머지 후 Railway 재배포 성공 확인) |
| **총 순증감** | **-1** (해소 1 - 미결 신규 1 = 0 · 등재 상쇄) |

---

## 7. 다음 게이트

1. **Kyu**: PR #179 머지 → Railway 자동 재배포 → `BOOT OK ... · sentry on` (DSN 있으면) 로그 확인 → kyu_checks `railway-boot-stable` PASS.
2. **병렬 가능**: **M0-1104-J** (fork Shop URL 제거 · G 계획 C) · **M0-1104-K** (fork 1 매장 auto-select · G 계획 D).
3. **별건 (지연)**: Expo 앱 Sentry 연결 · Anchor Tauri 잔재 cleanup.

---

*M0-1104-I · 2026-11-04 · medusa-config 런타임 파일 I/O 제거 · 산출물 기동 BOOT OK · Playwright 4 항 재PASS · 런북 "asset 런타임 파일 읽기 금지" 1절 · storeport PR #179 · 이연 -1 (Kyu 도장 대기)*
