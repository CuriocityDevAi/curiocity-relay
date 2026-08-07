# K0-0807-A · β 승격 · kyu-bridge 로컬 데몬 착지 + relay 정본 게시

**허브**: K0 · test-portal
**일자**: 2026-08-07
**상태**: **완료** (Track 1 PR #55 + Track 2 relay orphan reset + pr-test-checklist-guide.md 게시)

---

## [실기] · Kyu 검증 항목 (배포 완료 후 · 최우선)

**test-portal 배포 확인 (auto-deploy 1-3 분 · CLAUDE.md § 9.5)**:
- SHA `ed596da` main 반영 후 실기 진입

### 실기 A · 데몬 설치 (한 번만 · Kyu 클릭 3-5 분)

**절차 원문**: `docs/kyu-clicks/K0-0807-A-kyu-bridge-install.md` (쉬운 말)

```bash
# 1. 설치 (config 생성 + launchd 등록 + 즉시 서빙)
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge install

# 2. 상태 점검
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge status
# → config OK · launchd loaded · http://127.0.0.1:9876 listening ✅

# 3. 토큰 조회 (64자 hex · 복사)
node ~/projects/test-portal/tools/kyu-bridge/bin/kyu-bridge print-token
```

### 실기 B · 포털 토큰 입력

- 상세 화면 → 🔌 kyu-bridge 설정 박스 → 토큰 붙여넣기 → [토큰 저장]
- "🔌 브리지 토큰 저장됨" 안내 확인

### 실기 C · 원클릭 (Safari · Chrome 각각 실측)

- 상세 화면 · 딥링크 파라미터 (screen · autologin · seed · 선택)
- **[🚀 준비 + 열기 · Safari]** → 3 단계 badge (① 브리지 확인 → ② 기동 확증 → ③ 브라우저 열림) → Safari 자동 열림
- **[🚀 준비 + 열기 · Chrome]** 동일

### 실기 D · ⚠ Mixed Content 실측 (SPEC 편입 대상)

- Safari devtools 콘솔 · fetch 관련 warning/error 회신
- Chrome devtools 콘솔 · 동일 확인
- 한쪽 막힘 = 다음 K0 별건 라운드 = v0.2 GitHub bus poll 우회 설계 착수

### 실기 E · 폴백 자동 노출 (γ 재사용)

- 토큰 잘못 입력 → 원클릭 시도 → "⚠ 브리지 꺼짐" + fallback details 자동 열림
- 기존 Copy CTA (γ) 정상 동작

### 실기 F · 재설정 · 완전 제거

- [브리지 재설정] · 온보드 재표시
- `kyu-bridge uninstall` · launchd 해제
- `kyu-bridge uninstall --purge` · config/logs 삭제

---

## 완료 요약

### Track 1 · test-portal β 승격 (PR #55)

- **브랜치**: `feat/k0-0807-a-kyu-bridge-daemon` · **커밋**: `ed596da`
- **PR**: https://github.com/CuriocityDevAi/test-portal/pull/55
- **범위**: 20 파일 (신설 kyu-bridge 데몬 · 클라이언트 · 문서) · 2329+ / 49-
- **QC**: pnpm check 950 파일 0 err 0 warn · pnpm test 399 pass (신설 49) · pnpm build ✔

**kyu-bridge 데몬 (tools/kyu-bridge · deps 0 · Node 22 stdlib)**:
- HTTP 127.0.0.1:9876 · CORS · Bearer · endpoints (`/health` · `/start` · `/open`)
- 보안 3중: 127.0.0.1 전용 · Bearer 32-byte · 화이트리스트 (slug/browser/URL host)
- launchd `com.curiocity.kyu-bridge.plist` · 로그인 시 자동 시작
- CLI: install / uninstall [--purge] / serve / print-token / status
- 34 vitest 케이스 pass (config 5 · whitelist 16 · server 13)

**포털 배선 (src/lib/kyu-bridge-client.ts + 상세 화면)**:
- BridgeClient + runOneClick 3단계 (health → start → open)
- OneClickStep phase state · localStorage 토큰 관리
- UI: [🚀 준비 + 열기 · Safari/Chrome] · 3단계 progress · 🔌 온보드 · γ 폴백 자동
- 15 vitest 케이스 pass (Bearer · 오류 매핑 · phase 순서)

### Track 2 · relay 정본 게시

- **초기 (K0-0806-A)**: da918df (Report v1)
- **orphan reset (K0-0807-A · 오늘 첫 조작)**: 히스토리 초기화 · 신설 스캐폴드
- **최신 (이 push)**:
  · `pr-test-checklist-guide.md` (루트 · **정본 · 오케 형식 강제 근거 문서**)
  · `k0/K0-0807-A-report.md` (이 리포트 · 이전 K0-0806-A-report.md 삭제)
  · 5 폴더 (n0/t0/m0/k0/prompts) 유지

**pr-test-checklist-guide.md 요지** (신설 정본):
- 개요 (`## 요지` · 필수 · 최상단)
- test-checklist 블록 (` ```yaml ` · 필드: id/title/description/deep_link/area/tags/req_ref)
- 회귀 5 항목 중 ① 추적성 필드 (`req_round_id`/`req_text` 등)
- 잘못된 예 · 회피 규약
- 이후 오케가 전 허브 [REPORT] 에 이 형식 강제 근거

---

## Safari / Chrome Mixed Content · 실측 대상 (Kyu 회수)

**설계 근거**:
- 포털 (https://test.curiocity.company) → 브리지 (http://127.0.0.1:9876) fetch
- W3C Fetch spec **secure context 예외** = localhost/127.0.0.1 (2021+ 브라우저)
- Chrome 94+ · Safari 최근 = 예외 허용 **예상**

**실측 미완결** (K0 직접 실기 불가 · Kyu 실기 필요):
- Kyu 실기 후 로그 회신
- **한쪽이라도 막히면 v0.2 GitHub bus poll 우회 설계 착수** (Kyu 원문 정합)
- 폴백 = γ Copy CTA (이미 배선 · UX 안 죽음)

**폴백 경로 요지 (구현은 후속 · Kyu 원문 정합)**:
- v0.2 = kyu-bridge 가 GitHub 특정 위치 poll (예: `curiocity-relay/prompts/*.json` or issue label)
- 포털이 GitHub Contents API PUT 로 명령 게시 (Workers 에서 실행 가능)
- 브리지 poll → 실행 → 결과 comment append
- 챗 클로드 ↔ Claude Code 통합 시 동일 데몬 재사용 (오케 허브 정본)

---

## 이연 순증감

**implemented (K0-0807-A)**:
- kyu-bridge v0.1 (β 데몬 · 원클릭 · γ 폴백 자동)
- pr-test-checklist-guide.md (relay 정본 · 오케 형식 강제 근거)

**implemented (K0-0806-A · 이전 라운드)**:
- W-Core γ MVP · 스키마 · 4단계 UX

**신설 이연 (별건 라운드 대기)**:
- kyu-bridge **v0.2** (GitHub bus poll · relay 감시 · W-오케 몸통 확장) — Kyu 사인 대기 or Mixed content 실기 실패 시 즉시 착수
- kyu-bridge **v0.3** (챗 클로드 ↔ Claude Code 통합)
- kyu-bridge **v0.4** (dispatch v2 pickup)
- Mixed content 실측 결과 SPEC 편입
- W-Store live 라운드 (STORE_MODE='live' · Contents:W)
- W-Area 라운드 (각 리포 area-map.json)

**병합 순서 · 미결 PR**:
- **PR #55 (K0-0807-A · β)** = 이 라운드 · Kyu 실기 대기
- **PR #54 (K0-0806-A · γ)** = 이미 병합 (main HEAD 222cb71 상위 bf73fb0 상태)
- **PR #52/51 (V/U)** = 병합 순서 무관

---

## 다음 대기 (Kyu 회신 후)

1. **Kyu 실기 A-F 회수** → PR #55 검토
2. **Mixed content 실측 결과 회신** → SPEC 편입 or v0.2 GitHub bus poll 착수 판정
3. **PR #55 병합** = β 착지 확증
4. **후속**: v0.2 (Kyu 사인 후) · pr-test-checklist-guide 오케 강제 배포

---

*K0-0807-A · 2026-08-07 · β 승격 · kyu-bridge · Track 1 PR #55 · Track 2 relay orphan reset · 챗 회신 = 한 줄*
