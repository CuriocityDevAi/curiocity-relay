# K0-0807-B · 소결함 청소 3건 (auto-merge 가시성 · stop 배선 · grownest 뿌리 재확증)

**허브**: K0 · test-portal
**일자**: 2026-08-07
**상태**: **완료** (PR #56 · Kyu 실기 대기)

---

## [실기] · Kyu 검증 항목 (배포 완료 후 · 최우선)

**test-portal 배포 확인** (Cloudflare Workers Builds auto-deploy · 1-3 분 · CLAUDE.md § 9.5):
- SHA `8756eec` main 반영 후 실기 진입
- Cloudflare 대시보드 Deployments 새 버전 확인

### 실기 A · B-1 auto-merge 가시성 배지

kyu-gate check 실패 PR (예: `testportal_PR#59`) 상세 진입 → 판정 제출:
- **🚧 병합 대기 (kyu-gate check 실패)** 배지 표시 확인
- check 상세 링크 · hint ("Kyu 판정을 다시 성공으로 제출하거나...")
- 이미 병합된 PR 재방문 → **✅ 병합 완료** 배지
- 진행 중 = **⏳ auto-merge 진행** or **⏳ 수동 병합 대기**
- 아직 미기록 = **🕒 잠시 후 새로고침**
- **[↻ 새로고침]** 버튼 · 명시적 재조회

### 실기 B · B-2 [🛑 서버 종료]

- grownest/todoboss/storeport-anchor 상세 화면 (브리지 토큰 저장 상태) → [🛑 서버 종료 · <slug>]
- confirm 다이얼로그 승인 → "종료 요청 중…" → "✓ 종료 완료 · 포트 해제 (3000, 3002)"
- 잔존 프로세스 없음 확인 (`lsof -i :3000 :3002` = 비어있음)
- 실패 시 = "⚠ 종료 실패" + 원인 (잔존 포트 or 브리지 오류)

### 실기 C · B-3 grownest 매트릭스 sanity

```bash
node ~/projects/test-portal/tools/kyu-devenv/bin/kyu-devenv start grownest
```

로그에서 확인:
```
정본 포트 매트릭스 sanity check
  :3000 (web) = node · OK
  :3002 (backend) = node · OK
매트릭스 sanity = OK · 모든 정본 포트가 예상 command 로 LISTEN
```

이상 발생 시 (다른 command · 예: `:3000 (web) = 예상 밖 command: python`) = warn · Kyu 판정.

### 실기 D · 회귀 방지 (기존 UX 무변경 확인)

- SheetPush · [←목록] · 새로고침
- 케이스 판정 · 스크린샷 · 제출
- 원클릭 (K0-0807-A β) · Copy CTA 폴백 (γ)
- auto-merge M1 흐름
- 전부 무변경 확증

---

## 완료 요약

### PR #56 (fix/k0-0807-b-cleanup · `8756eec`)

- 11 파일 · 603+ / 4-
- pnpm check 952 파일 0 err 0 warn
- pnpm test 405 pass (신설 6: server /stop 2 · client stop 2 · matrix-sanity 2)
- pnpm build ✔

### B-1 · auto-merge 가시성 (오인 원천 차단)

**뿌리**: 제출 완료 안내 = 코멘트 게시 성공만 표시 → 사용자가 병합됐다고 착각 (Kyu testportal_PR#59 실기 회수).

**fix**:
- `src/routes/api/pr-status/[owner]/[repo]/[id]/+server.ts` 신설
  · GitHub `pulls.get` + `checks.listForRef('kyu-gate')` 실측
  · 응답 = { merged, mergeable, head_sha, kyu_gate: {conclusion, status, url}, source }
- 제출 성공 직후 자동 fetch → prStatus 상태
- 배지 4 상태 구분:
  · **✅ 병합 완료** (merged=true)
  · **🚧 병합 대기 (kyu-gate check 실패)** (conclusion=failure) + 상세 링크
  · **⏳ auto-merge 진행** or **수동 병합 대기** (status=in_progress/queued)
  · **🕒 잠시 후 새로고침** (미기록)
- [↻ 새로고침] 버튼 · 사용자 명시적 재조회

### B-2 · kyu-devenv stop 배선

**신설**:
- `kyu-bridge POST /stop` endpoint (server.mjs · 화이트리스트 동일 보안)
  · slug ∈ {grownest, todoboss, storeport-anchor}
  · kyu-devenv stop spawn + exit code + 포트 리스닝 재확인
  · 응답 = { ok, exit_code, ports_still_listening, log_path }
- `BridgeClient.stop(slug)` (kyu-bridge-client.ts)
- `stopDevenvServer()` + [🛑 서버 종료] 버튼 (상세 화면)
  · confirm 다이얼로그 · running/ok/error 상태 · stopMessage
- kyu-devenv 자체 stop 명령 = 이미 K0-0730-P 착지 · 재사용

### B-3 · grownest 포트 뿌리 재확증 + 매트릭스 방어

**실측 (~/projects/grownest 2026-08-07)**:
- package.json `"dev": "vite"` · `"server": "node server.cjs"`
- vite.config.ts `server.port: 3000` (frontend/web)
- server.cjs `port = process.env.PORT || 3002` (backend)
- ⇒ **web 3000 · backend 3002** = K0-0730-O 정본 정합 · 뿌리 이미 수정됨

**수정**:
- registry.mjs 이전 오기 주석 정정 (K0-0730-N 라인 "vite=3001 backend=3000" 회수)
- `tools/kyu-devenv/src/preflight/matrix-sanity.mjs` 신설 (재발 방지)
  · verifyPortMatrix · lsof command 확인 · 낯선 process 시 warn only
  · 화이트리스트 = node/vite/esbuild/nest/ts-node/pnpm/npm/concurrently
  · Kyu 수동 판정 · 자동 kill 없음
- start.mjs · all-ready 후 verifyPortMatrix 호출

### SPEC v1.23 편입

- § 5.3 B-1 가시성 강화 절 신설
- § 15.3 B-3 재확증 (K0-0730-O 정본 그대로 · 뿌리 정합 명시)
- § 15.3 K0-0807-B 재확증 라벨 변경

---

## 이연 순증감

**implemented (K0-0807-B)**:
- B-1 auto-merge 가시성 · B-2 stop 배선 · B-3 grownest 재확증

**신설 이연** = 없음 (기존 이연 유지)

**병합 순서**:
- PR #55 (K0-0807-A β) = 병합 (main HEAD 38d4ba8)
- PR #56 (이 라운드) = Kyu 실기 후 병합
- PR #50 (T-2nd auto-merge UX) = 이 라운드가 유사 스코프 커버 · Kyu 판정 대상

---

## 다음 대기 (Kyu 회신 후)

1. **실기 A-D 회수** → PR #56 검토
2. **Mixed content 실측 결과 회신** (K0-0807-A 잔존 · Safari/Chrome fetch)
3. **PR #56 병합**
4. **후속**: kyu-bridge v0.2 (GitHub bus poll · W-오케 몸통 확장) · Kyu 사인 대기

---

*K0-0807-B · 2026-08-07 · 소결함 청소 · Track 1 PR #56 · relay 사본 정합 유지*
