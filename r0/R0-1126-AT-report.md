relay#57 CHANGES · relay#60 CHANGES · storeport#467 APPROVE

## relay#57 (M1-1126-R) — CHANGES

### PASS
- 출처(결정 파일·날짜·Kyu 원문): order-number.md · loyalty-points.md · tax-pb1.md 세 파일 모든 규칙에 출처 달림 ✅
- PB1 10%: `decision-kyu-4q-20261126.md:7` 출처 · tax-pb1.md 반영 ✅
- A→B 포인트 이동: `decision-kyu-4q-20261126.md:8` · loyalty-points.md § 3 반영 ✅
- 긴 번호 PIM-26B1001: order-number.md § 1 반영 ✅
- 짧은 번호 #1~99 매장별 순환: order-number.md § 2.2 반영 · "진행 중 M0-1126-Q" 꼬리 ✅
- 결제 완료 화면 버튼 하나 (`decision-success-single-phone-button-20261126`): PR#57 생성(22:29 WIB) **이후** 결정(23:07 WIB) → 누락 맞음 · 지적만 ✅
- CD-RECEIPT-FORMAT "해결" (b22c2ed) · PB1 미결 → "해결" · 1~99 "진행 중" 모두 정확 ✅

### CHANGES — 1건
**`specs/domain/order-number.md § 2.2` 충돌 미표기**

현재: `날짜와 무관하게 이어감` 을 사실로 단정.

근거 충돌:
- 11-23 17:06 Kyu "매일 영업 시작(레지스터 오픈) 때 #1부터 … 이렇게 하자" (`queue/m3/M3-1123-G.md:10`) = 날짜별 리셋
- 11-26 22:13 Kyu "Square 처럼 1부터 99까지만" (`decision-kyu-4q-20261126.md:6`) = M0-1126-Q가 "날짜 무관 이어감"으로 해석

11-26 발언은 최대값(99)을 정한 것이지 11-23 "매일 #1부터"를 취소한 발언 아님. 오케가 아침에 Kyu에게 확인 예정이므로 "Kyu 확인 대기"로 표기해야 정답.

수정 필요: `order-number.md § 2.2` 첫 항목에 "⚠ Kyu 확인 대기: 날짜별 리셋 vs 이어감" 추가 · `specs/INDEX.md` 짧은 번호 행에도 꼬리 추가.

---

## relay#60 (M2-1126-T) — CHANGES

### PASS
- ALL_HEARTBEAT · MEM_LOG_FILE → `~/.hub-runner/status-wt/` 이동 ✅
- ci-watch.mjs `PATHS.allJson` → `~/.hub-runner/status-wt/all.json` 업데이트 → `readAllJson()` 정상 ✅
- RUNNER_SCOPE_PREFIXES에서 `status/runners/` 삭제 ✅
- selftest: REPO_ROOT 임시 `status/runners/all.json` 경로 유지 ✅
- ensureStatusWorktree() 호출 주입 · orphan force push 경로 올바름 ✅
- setup.sh heavy2 슬롯 2개 · 실측 후 활성화 조건 명시 ✅

**읽기 측 전수 grep 결과**:
- 배포 중 ci-watch.mjs(v1.16): `readAllJson()` → `PATHS.allJson` = 업데이트됨 ✅
- v2 실험 모듈(ci-watch.mjs 미import): `sources-local.mjs:38` · `sources-git.mjs:185,303` 아직 `status/runners/all.json` 참조 — pipeline-view/collect-view 전용(현재 배포 경로 외) → 위험 없음 · v2 배포 시 갱신 필요.

### CHANGES — 1건 (PR 본문 인지)
**ci-watch 버전 충돌**

PR#59 (M2-1126-S) 2026-11-26T17:10:58Z 머지 완료 → main의 ci-watch.mjs = 1.16.
본 PR base `73e181ef` (PR#59 머지 전) → `1.15 → 1.16` diff가 main과 충돌.

필요: `origin/main` rebase → `CI_WATCH_VERSION = '1.17'` · 버전 이력에 `· 1.17 M2-1126-T(all.json 경로 → status-wt)` 추가.
(PR 본문에서 "rebase 후 1.17" 이미 명시 — R0 확인 완료)

---

## storeport#467 (M2-1126-U) — APPROVE

- `playwright.config.ts`: `const PORT = Number(process.env.CI_VITE_PORT ?? 5173)` · 로컬 기본값 5173 불변 ✅
- webServer command `--port ${PORT}` · url · baseURL 모두 PORT 변수 사용 ✅
- cli `--port` 플래그가 vite.config.ts `server.port:5173` 오버라이드 → vite.config.ts 수정 불필요 ✅
- ci.yml heavy-mac: `CI_VITE_PORT: ${{ 5173 + (github.run_id % 1000) }}` · run별 포트 5173~6172 · GitHub Actions 산술 표현식 지원 ✅
- Customer Display E2E(port 4173): `CD_E2E_PORT ?? 4173` 이미 파라미터화 → 영향 없음 ✅
- 범위 2파일만 · pnpm test 877 pass · typecheck clean ✅
