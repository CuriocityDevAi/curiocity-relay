---
round: K1-0915-A
pr: https://github.com/CuriocityDevAi/test-portal/pull/97
outcome: 자기 검증 통과 (todoboss PR#23 실 실행 · TODOBOSS Admin 서명 확증 · pnpm test 987 · check 0 err · build done · SPEC v1.64 · docs/env-recipes.md 신설) · Kyu 프로덕션 실기 확증 대기
kyu_checks:
  - 포털 상세 [테스트 열기] 탭 → SSE 스트림 (준비 중·설치 중·서버 기동·준비됨) 순차 관측
  - todoboss PR#23 열기 → 새 Chrome 창 (임시 프로필) + http://127.0.0.1:4321/?test=1&autologin=admin (TODOBOSS Admin 자동 로그인 화면)
  - grownest PR 열기 → "수동 로그인" 배지 노출 · localhost:3000 · 수동 로그인
  - agilo (Expo · PR#5 or main) → exp:// tunnel + Expo Go 로드
  - 환경 종료 (DELETE /env/stop) → 서버 kill + /tmp/kyu-chrome-* 삭제
  - kyu-bridge 재기동 시 orphan Chrome 프로필 (6시간+ stale) 자동 청소
  - test-portal PR body frontmatter + outcome 자기 검증 = k1-auto-selfcheck-merge 자동 squash
---

## 요지

Kyu 09-14 최우선 = "버튼 하나 = 최신 소스 · 깨끗한 브라우저 · 로그인 · 그 화면 · 대기" 착지. K1 환경 열기 v2 = kyu-bridge `POST /env/open` (SSE) + 4+1 프로젝트 레시피 + Chrome 임시 프로필 + URL 쿼리 autologin + test-portal auto-merge 워크플로. todoboss PR#23 실 실행 완결 (K1 자체 · SHA d33b397 · elapsed 2.9초 재실행 · TODOBOSS Admin 서명 확증). grownest·agilo = 코드+레시피 (실 실행 Kyu 실기).

## 1. Kyu 심문 회신 반영 (K1-0915-B 전결)

| 항목 | Kyu 정본 | 착지 |
| --- | --- | --- |
| Q1 K2 정체성 | (a) 실 허브 · PR#96 · runner/api/runs/migrations/docs/testing | K1 편집 금지 확정 · SPEC § K1 파일 경계 확장 |
| Q2 storeport PR#5 오기 | agilo-medusa-pos-fork PR#5 정정 | `feat` head `docs/m0-0909-a-e2e-ao-steps` · open · 코드+레시피 |
| Q3 autologin | (a) URL 쿼리 정본 · todoboss만 편입 · grownest/storeport = none 배지 | `env-autologin.mjs buildTargetUrl` · 3 method 정본 |
| Q4 브라우저 | (a) Chrome 임시 프로필 · Safari 안내 | `env-browser.mjs createTempProfile` · Safari `safariGuidance` |
| Q5 auto-merge | (c) 워크플로만 · /api/gate = K2 계약 후 B | `.github/workflows/k1-auto-selfcheck-merge.yml` |
| Q6 clone | (b) 독립 clone · 원 폴더 `.git` 미접근 | `env-clone.mjs cloneUrl` = https 직접 |
| C1 preview-start 관계 | (a) 병존 · runPreviewFlow 재사용 | `/env/open` 은 상위 레이어 · 기존 `/preview-start` 유지 |
| C2 화이트리스트 | (a) `ENV_ALLOWED_HOSTS` 신설 · `/open` 유지 | `whitelist.mjs` |
| R1 실 실행 | (b)+(c) 절충 = todoboss 1리포 K1 실 · grownest·agilo Kyu 실기 | `docs/audits/K1-0915-A-todoboss-pr23-run.log` 정본 |
| D1~D5 | 전량 채택 | SSE · jobId · lockfile 해시 · orphan 청소 · env-recipes.md 5절 |

## 2. 착지 정본 요약

### A1 · kyu-bridge `POST /env/open` (SSE 스트림)

- `tools/kyu-bridge/src/env.mjs` = orchestrator (worktree → install → migrate? → seed? → start → health → browser → autologin)
- `tools/kyu-bridge/src/env-clone.mjs` = 독립 clone (`~/projects/.kyu-env/<repo>/pr-<n>` · Q6 (b) 정본 · CLT git `/Library/Developer/CommandLineTools/usr/bin/git`)
- `tools/kyu-bridge/src/env-lockfile.mjs` = SHA-256 해시 감지 · pnpm/yarn/npm 3종 · `.k1-last-lock-hash` 저장 (D3)
- `GET /env/status?jobId=...` · `DELETE /env/stop` (jobId · D2)
- IPv4/IPv6 dual-stack 프로브 (`waitForPort` = `127.0.0.1` + `::1` 병행 · vite ::1 회수 · § 5.17 gotcha 신설)

### A2 · config/projects.json v4 env 필드

4+1 프로젝트 편입:
| slug | type | autologin | port | cwd |
| --- | --- | --- | ---: | --- |
| todoboss | web | url-query (test=1 · autologin=admin) | 4321 | web-admin |
| grownest | web | none (N0 회부) | 3000 | . |
| storeport | web | none (M0 회부) | 3010 | apps/anchor |
| test-portal | deployed | cf-access-otp | — | — |
| agilo-medusa-pos-fork | expo | url-query (autologin=admin) | 8081 | . |

### A3 · env-browser.mjs 깨끗한 브라우저

- Chrome: `open -na "Google Chrome" --args --user-data-dir=/tmp/kyu-chrome-<uuid> --new-window <URL>` · `-n` 정본 (기존 창 재사용 금지)
- Safari: `safariGuidance()` = 안내 배너만 (CLI 사생활 창 미지원)
- `cleanupOrphanProfiles()` = 데몬 기동 시 6시간 이상 stale rm (D4 · 프로세스 폴링 없음)

### A4 · env-autologin.mjs URL 쿼리 조립

- 3 method (`url-query` · `none` · `cf-access-otp`)
- deep_link > home_screen > deployed_url 폴백
- exp:// 등 non-standard scheme = 수동 조립
- `autologinBadge()` = 사람말 배지 ("자동 로그인" · "수동 로그인" · "Cloudflare Access OTP")

### A5 · `.github/workflows/k1-auto-selfcheck-merge.yml`

**test-portal 리포 한정** · 4 조건 만족 시 squash --delete-branch:
1. PR body `round: K0-*|K1-*` frontmatter 감지
2. `outcome: 자기 검증 통과*` (or `## 자기 검증` or `자기 검증 통과` 정규식)
3. Workers Builds SUCCESS
4. regression matrix (matrix-run fail 개수 = 0 · fail 잔존 시 note 코멘트 · 향후 K2 어설션 정리 후 tighten)

실패 시 = 진단 코멘트 (round/outcome/Workers/regression 4 항 원문 · 수동 머지 안내).

**/api/gate 연결 = K2 계약 후 B** (Kyu Q5 (c) 정본).

### A6 · todoboss PR#23 실 실행 정본

**로그 파일**: `docs/audits/K1-0915-A-todoboss-pr23-run.log` (25 라인)

원문 발췌:
```
{"step":"start","message":"slug=todoboss pr=23 branch=feat/pcon-status-taxonomy"}
{"step":"recipe","type":"web","port":4321,"autologin":"url-query"}
{"step":"clone","message":"fetch-reset done","workdir":"/Users/.../.kyu-env/CuriocityDevAi__todoboss/pr-23"}
{"step":"lockfile","message":"pnpm-lock.yaml unchanged (skip install)"}
{"step":"start","message":"spawning pnpm dev (port=4321)"}
[server/stdout] VITE v6.4.3 ready in 300 ms
{"step":"health","message":"port 4321 listening"}
{"step":"target","message":"http://127.0.0.1:4321/?test=1&autologin=admin","source":"home_screen","autologinApplied":true}
{"step":"ready","message":"env/open done","elapsed_ms":2935,"workdir":"...","url":"...","server_pid":20760}
```

**검증**:
- HTTP body `<title>TODOBOSS Admin</title>` (config/projects.json.healthCheck.signatures 정합)
- Chrome 새 프로필 `/var/folders/.../kyu-chrome-1abf26baaa82` 열림 · **41 파일 생성** (fresh 사용 확증)
- `cleanProfile` 정본 = ok

**관찰 (트러블슈팅)**:
- 첫 실행 시 `pnpm install --frozen-lockfile` 실패 (PR 안 새 deps · lockfile 미갱신) → 레시피 `pnpm install` (no frozen) 로 정정
- 22일 stale vite 프로세스 (pid 21656 · K0-0824 orphan) port 4321 점유 → kill 후 재실행 성공
- vite 는 기본 `::1` (IPv6) 만 바인딩 · IPv4 프로브 만 시 fail → `waitForPort` dual-stack 프로브로 정정 (§ 5.17 gotcha)

### grownest / agilo (K1 실기 미실행 · Kyu 실기 대상)

- **grownest** = 코드+레시피만 (env.autologin.method = none · N0 회부). Kyu 실기 절차 = 포털 상세 [테스트 열기] → SSE → 새 Chrome → localhost:3000 → 수동 로그인.
- **agilo (Q2 정정)** = Expo tunnel · K1-0914-A 착지 (`startExpoTunnel`) 재사용 · 레시피만. Kyu 실기 = exp:// URL + Expo Go 로드.

## 3. DOC 편입

- `docs/SPEC.md § 11 v1.64` (§ K1 파일 경계 확장 · § K1-env-1~6 · § 5.17 gotcha 신설)
- `docs/env-recipes.md` 신설 (스키마 · 4+1 예시 · 5단계 등록 · 화이트리스트 · 트러블슈팅 6종 · API 참조)
- `EPIC-STATE.md § Active` K1 환경 열기 v2 편입
- `docs/requirements-tracking.md K72` 등재

## 4. BUILD 실측

```
$ pnpm test  →  Test Files 74 passed · Tests 987 passed (+27: env-lockfile 9 + env-autologin 11 + env-browser 7)
$ pnpm check →  0 errors · 57 warnings (K0-AW inherited CSS unused · legacy)
$ pnpm build →  ✔ done · @sveltejs/adapter-cloudflare
```

Origin/main 재병합 완료 (K0-0914-AW · v1.63 병존 · K1 = v1.64).

## 5. 결론

- **자기 검증 통과** = todoboss end-to-end 실 실행 로그 + 서명 확증 + 987 unit + check 0 err + build ✔ + docs 4종 편입
- **Kyu 프로덕션 실기 대기** = 7 kyu_checks 항목 (SSE 관측 · 새 Chrome · autologin URL · 수동 로그인 배지 · 환경 종료 · orphan 청소 · auto-merge)
- **PR** = https://github.com/CuriocityDevAi/test-portal/pull/97

## 6. 다음 라운드 인수

- **K2 계약 착지 후 B** = `/api/gate` API 연결 (auto-merge 워크플로 → API 승격)
- **grownest·storeport autologin 앱 편입** = N0·M0 회부 (오케 원장 등재)
- **레시피 port_offset 편입** = 여러 인스턴스 병행 (Kyu 동시 세션 vs K1 env-open 포트 충돌 회수) — K2 회부
- **Playwright e2e 편입** = env/open flow 실 브라우저 검증 (Kyu 실기 대체)

*K1-0915-A · 2026-09-15 · 환경 열기 v2 정본 · 배관 허브 2번째 라운드*
