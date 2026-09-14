---
round: K0-0914-AU
pr: https://github.com/CuriocityDevAi/test-portal/pull/92
outcome: 자기 검증 통과 (Playwright 25 pass · 파일 경계 준수) · Kyu 실기 확증 대기 (홈 v2 · 상세 v2 · 소리 · 3 뷰포트)
kyu_checks:
  - 폰 (390): 홈 = 지금 내 차례 파란 테두리 + 초록 점 + "기계 N 통과 · 내 확인 N건 · 약 N분" + 기기 태그 + 큰 실기 시작 버튼
  - 폰 (390): 상세 = 기계 판정 띠 (초록/빨강/회색) · 빨강 시 [성공] disabled · 실패 시 사유 자동 삽입
  - 폰 (390): 판정 3버튼 52px · 큰 [테스트 열기] 56px + 로그인까지 자동 + 시드 문구
  - 아이패드 (820): 사이드바 미노출 · 2단 · 상세 [테스트 열기 · 이 태블릿에서]
  - 맥 (1280): 3단 · 사이드바 [내 차례] 배지 + 미니 허브 (N0/T0/M0/K0)
  - 착지 모달 노출 시 "띵" 1회 · 설정 시트 소리 ON/OFF · 같은 PR 재알림 없음
  - checks/k0/K0-0914-AU.md 상세 화면에서 렌더 (index 갱신 후)
date: 2026-09-14
hub: K0 (test-portal)
base: main@bad1634 (K0-0914-AR squash 착지 · 2026-09-14 08:48 UTC · kyu-gate App)
branch: feat/k0-0914-au-portal-v2
head: a828061
---

# K0-0914-AU 리포트 · 포털 v2 화면 정본 (Kyu 와이어프레임 09-14 확정)

## 라운드 흐름

1. **AR 착지 확증** (main@bad1634 · 2026-09-14 08:48 UTC · PR#91 kyu-gate App auto-merge)
2. **fetch + main merge** · base 명기
3. **파일 경계 준수** (Kyu 원문 09-14) = K0 = `src/routes/**` · `src/lib/ui/**` 만
4. **AU-B (홈 v2) · AU-C (상세 v2) · AU-D (checks 렌더) · AU-E (다기기) · AU-G (소리)** 소화

## 스코프 봉인 (Kyu 원문)

**파일 경계**:
- **K0 소유**: `src/routes/**` · `src/lib/ui/**`
- **K1 소유** (침범 금지): `api/push` · `tools/kyu-bridge` · `.github` · relay 리포

**AU 스코프**: B (홈 v2) · C (상세 v2) · D (checks 렌더 · K1 규약 합의) · E (다기기) · G (소리 클라이언트).

## B · 홈 v2

**정본** (`src/routes/+page.svelte`):
- L406-458: `myTurnItems` `$derived` = 착지 리포트 + 기계 판정 초록 (fail=0) + 실기 항목 > 0 필터. 기계 빨강 = 미노출.
- L502-544: 지금 내 차례 카드 (`data-testid="section-my-turn"`) · 파란 테두리 (`.card.my-turn` = border 2px accent)
- 각 줄 (`my-turn-row`) = 초록 점 (`mt-dot` var(--pass)) + 제목 (PR #N or round) + "기계 N 통과 · 내 확인 N건 · 약 N분" + 기기 태그
- 맨 아래 큰 [실기 시작 · <첫 항목>] (`btn-primary big my-turn-start`) → `myTurnStart(first)` = `goto(prPath)`
- "약 N분" = `myCount × EST_MIN_PER_ITEM (3분 · 임시 상수)`

**데스크톱 사이드바 v2** (`src/routes/+page.svelte:709-773`):
- `nav-my-turn` (배지 = myTurnItems.length · var(--accent) 배경)
- `nav-prs` · `nav-projects` · `nav-settings`
- **미니 허브** (`.sidebar-mini-hub` · `<ul>` = hubStates 4행 · dot + hub + state)

## C · PR 상세 v2

**정본** (`src/routes/pr/[owner]/[repo]/[id]/+page.svelte`):

### ① 기계 판정 띠 (L1173-1197)

```
.machine-band { border · surface-2 · empty (회색)
  .pass { color-mix pass 15% · border pass · color pass }
  .fail { color-mix fail 15% · border fail · color fail }
}
```

- 회색 (empty): `!checksFetched || checksItems.length === 0` = "🔘 기계 확인 없음"
- 초록 (pass): `machineFailCount === 0` = "✓ 기계 확인 N건 모두 통과"
- 빨강 (fail): `machineFailCount > 0` = "✗ N건 실패" + `<ul>` 깨진 기준 문장

### ② 큰 [테스트 열기 · 이 <기기>에서]

- `.open-test-btn` = full-width · min-height 56px · font 17px 600
- `deviceLabel(currentDevice)` 삽입 ("폰" / "태블릿" / "데스크톱" / "모든 기기")
- "로그인까지 자동 · <시드>로 준비됨" (`pr.head_sha.slice(0, 7)` or "기본 시드")
- onclick = 첫 미판정 item.deep_link 있으면 `window.open(deep_link, '_blank')`

### ③ 내가 확인할 것 · <기기> N건

- `myDeviceItems` = `checksItems.filter(currentDevice or any)`
- 렌더 = ul.my-checks-list · li.my-checks-item · `<a href={deep_link}>›</a>` + `<span>{title}</span>`
- 폴백 = "체크리스트는 아래 케이스 목록 참조 (PR 본문 test-checklist 폴백)"

### ④ 접힘 · 다른 기기 · 기계 확인

- `<details class="folded-checks">` = "다른 기기 {n}건 · 기계가 이미 확인한 {m}건"
- otherDeviceItems 리스트 + 기계 통과 안내

### ⑤ 판정 3버튼 52px + 빨강 시 [성공] disabled + 실패 시 사유 자동 삽입

- `.seg min-height 52px` (Kyu 09-14 갱신 · 기존 56 → 52)
- `passDisabledByMachine` = `machineFailCount > 0`
- L1804-1809: hint "⚠ 기계 실패 N건 → [성공] 판정 비활성. 실패 사유 = 자동 삽입"
- L1815-1821: `<button disabled={passDisabledByMachine}>`
- L470-478 `setVerdict`:
  - `v === 'pass' && passDisabledByMachine` = return (봉인)
  - `draft.verdict === 'fail' && machineFailedItems.length > 0 && verdict_reason 비어있음` = `verdict_reason = machineFailedItems.map(i => '✗ ' + i.title).join('\n')` (자동 삽입)

### ⑥ 접힘 · 개발 확인 항목 / 스샷 / 이력

- `<details class="overview-fold">` = "개발 확인 항목 · 스샷 · 이력 (접힘)"
- 기존 overview section 을 이 안으로 이관 (요약 · cases 개수 · repo#id)

## D · checks 렌더 (index.json 1순위)

**스키마** (K1 relay 규약 합의 · Kyu 원문 정본):

```yaml
---
id: K0-0914-AU
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/92
issued_at: 2026-09-14T09:00:00Z
items:
  - '{"device":"phone","title":"...","pass":false,"fail":false,"est_min":2}'
  # 각 원소 = JSON 문자열 (frontmatter YAML 안 nested 회피)
---
```

**정본 소비**:
- `src/lib/relay.ts` = `CheckDevice` · `CheckItem` · `ChecksFrontmatter` type + `parseChecksFrontmatter` 파서 신설
- `/api/relay/prompts` GET 응답 = `{ prompts, reports, checks }` · `checks` 필드 편입 (index.json.checks 배열)
- 상세 `fetchChecks()` = `pr === thisUrl` 매칭 · items 확정
- 없으면 = PR body test-checklist 파서 폴백 (기존 정본 정합)

**checks 초안** (K0 첨부 · relay push = K1):

파일 = `checks/k0/K0-0914-AU.md`

내용 (아래 embedded):

<details><summary>K0-0914-AU-checks.md 초안</summary>

```markdown
---
id: K0-0914-AU
hub: k0
pr: https://github.com/CuriocityDevAi/test-portal/pull/92
issued_at: 2026-09-14T09:00:00Z
items:
  - '{"device":"phone","title":"홈 화면에 내 차례 카드가 파란 테두리로 보이는가","pass":false,"fail":false,"est_min":2}'
  - '{"device":"phone","title":"내 차례 카드 아래 큰 실기 시작 버튼이 있는가","pass":false,"fail":false,"est_min":1}'
  - '{"device":"phone","title":"상세 화면 위쪽에 기계 판정 띠가 있는가","pass":false,"fail":false,"est_min":2}'
  - '{"device":"phone","title":"큰 테스트 열기 버튼과 로그인까지 자동 문구가 보이는가","pass":false,"fail":false,"est_min":2}'
  - '{"device":"phone","title":"내가 확인할 것 목록이 폰 기준으로 정렬되는가","pass":false,"fail":false,"est_min":3}'
  - '{"device":"phone","title":"판정 세 버튼이 세로로 크게 보이는가","pass":false,"fail":false,"est_min":1}'
  - '{"device":"tablet","title":"태블릿에서 사이드바 없이 두 열이 보이는가","pass":false,"fail":false,"est_min":2}'
  - '{"device":"desktop","title":"사이드바 내 차례 링크에 배지가 보이는가","pass":false,"fail":false,"est_min":2}'
  - '{"device":"desktop","title":"사이드바 아래 미니 허브가 보이는가","pass":false,"fail":false,"est_min":2}'
  - '{"device":"any","title":"착지 모달이 뜰 때 소리가 한 번 나는가","pass":false,"fail":false,"est_min":1}'
  - '{"device":"any","title":"설정에서 소리 켜기 끄기를 바꿀 수 있는가","pass":false,"fail":false,"est_min":1}'
---

## 요지

K0-0914-AU 자기 검증 · Kyu 실기 항목 초안 (규약: 화면에 보이는 단어만 · 약어 금지 · Kyu 원문 정본).
```

</details>

## E · 다기기 (UA + 뷰포트)

**정본** (`src/lib/ui/device.ts`):
- `detectDevice()`:
  - `viewport.width < 768` or `UA /iPhone|Android.*Mobile/` = 'phone'
  - `768 ≤ width < 1024` or `UA /iPad|Android(?!.*Mobile)|Tablet/` = 'tablet'
  - else = 'desktop'
  - SSR 폴백 = 'desktop' (window 없음)
- `deviceLabel(d)` = "폰" / "태블릿" / "데스크톱" / "모든 기기"

**상세 정렬**:
- `myDeviceItems` = `checksItems.filter(i => i.device === currentDevice || i.device === 'any')`
- `otherDeviceItems` = 나머지 (접힘)

**case_state 이어 찍기**: 기존 D1 저장 정합 (K0-0902-AD-3 정본 소비 · pr_id+repo+case_id PK).

**종합 판정 1회**: `draft.verdict` 하나 (기존 정본).

## G · 알림 클라이언트 (Web Audio)

**정본** (`src/lib/ui/sound.ts`):
- `loadSoundEnabled()` · `saveSoundEnabled(on)` = localStorage `test-portal:au-g:sound-on:v1` (기본 켜짐)
- `loadBeepedRounds()` · `markBeeped(round)` = sessionStorage `test-portal:au-g:beeped-rounds:v1`
- `playDingOnce(round)`:
  - 소리 OFF = return
  - beeped 이미 있음 = return
  - AudioContext 생성 · sine 880Hz · gain 0 → 0.15 (0.02s ramp) → 0.001 (0.25s exp ramp)
  - stop 0.28s · markBeeped(round)

**홈 트리거** (`src/routes/+page.svelte:loadAll` 안): `newLanding` 감지 시 `playDingOnce(newLanding.round)`.

**설정 스위치** (`src/lib/SettingsSheet.svelte`): `<input type="checkbox" data-testid="sound-toggle">` + "소리 알림 ON/OFF" 라벨.

**푸시 서버·SW 발송은 K1 소유** (파일 경계 준수 · 침범 없음).

## 자기 검증

### QC 전량

```
pnpm check         → 1025 files · 0 err · 0 warn
pnpm test          → 69 files · 948 passed
pnpm build         → adapter-cloudflare · done
```

### Playwright 3 viewport (Kyu 원문 = "390/820/1280")

- **chromium-phone (390×844)**: 12 pass · 2 skip (mock 링크 부재)
- **chromium-desktop (1280×800)**: 6 pass (d1 nav-my-turn 갱신 · d5/d6 view 교체)
- **chromium-tablet (820×1180)** 신설: 2 pass (t1 홈 v2 · t2 상세 v2)
- **AQ spec 확장**: au-b1 · au-g1 · au-c1 3 pass
- **Total = 25 pass · 2 skip** (2 skip = mock recent-item 부재 · Kyu 폰 실기 정본)

### 미실행 · 미검증 명시

- **프로덕션 스샷** = Kyu Access OTP 필요 · K0 curl 미접근 · **Kyu 폰 실기 정본**
- **실 기계 판정** (초록/빨강 실 데이터) = `/api/pr-checks` (GitHub PR checks/status API) 미구현 · **K0 별건 이월** (checks index.json 안 mock 데이터로 검증 후 실 구현)
- **checks/k0/K0-0914-AU.md relay push** = K1 소유 · 오케 push (파일 경계 준수)

## Kyu 실기 (처음 하는 사람 기준 · 폰/아이패드/맥)

### 폰 (아이폰 · PWA 홈 설치 후)

1. `git ls-remote origin feat/k0-0914-au-portal-v2` = `a828061` 확인 · auto-deploy 대기 (1-3분)
2. 아이폰 test-portal 앱 열기 (또는 Safari 접속)
3. **홈 화면** 관찰:
    - 파란 테두리 카드 = **지금 내 차례** (실기 대상 PR)
    - 각 줄 = 초록 점 · "PR #N" 또는 round · "기계 N 통과 · 내 확인 N건 · 약 N분" · 기기 태그 (📱 폰 · 💻 데스크톱 등)
    - 맨 아래 큰 [실기 시작 · <첫 항목>] 버튼
4. **[실기 시작] 탭** → 상세 페이지 진입
5. **상세 상단** = 기계 판정 띠 (초록 통과 or 빨강 실패 or 회색 미확정)
6. **큰 [테스트 열기 · 이 폰에서]** 56px 노출 · "로그인까지 자동 · <시드>로 준비됨"
7. **"내가 확인할 것 · 폰 N건"** 목록 = 폰 대상 항목만 노출 · 다른 기기는 접힘
8. **판정 3버튼** = 세로 크게 (52px). 기계 빨강이면 [성공] 회색 (disabled)
9. **[실패] 탭** → 사유 자동 삽입 = "✗ <깨진 항목>" 목록
10. 우상단 [⚙] → **[소리 알림 ON/OFF] 스위치**
11. 새 착지 리포트 감지 시 = **"띵" 소리 1회** (같은 PR 재알림 없음)

### 아이패드 (Safari · 820 폭)

1. Safari 접속 → Access OTP 로그인
2. 홈 = **사이드바 미노출** · 2단 (목록 + 상세)
3. 상세 = [테스트 열기 · 이 **태블릿**에서]

### 맥 (브라우저 · 1280 폭)

1. 브라우저 접속 → Access OTP
2. 홈 = **3단** (사이드바 + 목록 + 상세)
3. 사이드바 = 🎯 **내 차례** (배지 = myTurnItems.length) · 🔀 PR 전체 · 📦 프로젝트 · ⚙ 설정
4. 사이드바 아래 = **미니 허브** (N0/T0/M0/K0 4행 · dot + hub + state)
5. 상세 = [테스트 열기 · 이 **데스크톱**에서]

## 이연 순증감

### AU 이연 회수 (포털 v2 화면 정본)
- 홈 v2 (지금 내 차례 · 미니 허브 · 사이드바 배지)
- 상세 v2 (기계 판정 띠 · 큰 [테스트 열기] · 52px · passDisabledByMachine · 사유 자동 삽입)
- checks 스키마 확장
- 다기기 (detectDevice + 정렬)
- Web Audio 알림 + 소리 스위치

### AU 신규 이연 → K1 병행 (파일 경계 밖 · K1 소유)
- relay README index 규약 갱신 (checks 필드 명시)
- checks/k0/K0-0914-AU.md relay push
- build-index.mjs = checks 파일 집계
- Web Push 실 발송 (Workers 호환 라이브러리)
- kyu-bridge Expo 확장

### AU 잔여 이연 (원장 유지 · K0 소유)
- GitHub PR checks/status API 소비 (`/api/pr-checks` · 기계 판정 실 데이터 소스)
- PopMenu · octicon 잔여 · 중첩 푸시 마무리 (AS 이월 계속)

### 원장 총 (K1 병행 + K0 별건) = relay checks 규약 + build-index 확장 + Web Push 실 발송 + kyu-bridge Expo + PR checks API + PopMenu

## 커밋 · PR · 초안

- 커밋: `a828061` (K0-0914-AU · 20 파일 · +859/-31)
- 브랜치: `feat/k0-0914-au-portal-v2`
- PR: [#92](https://github.com/CuriocityDevAi/test-portal/pull/92)
- body 첫 줄: `**round**: \`K0-0914-AU\``
- checks 초안 = 이 리포트 § D 안 embedded (K1 relay push 대상)

---

*정본 · K0-0914-AU-report · Kyu 실기 확증 대기 · K0 다음 = /api/pr-checks (GitHub PR checks 실 데이터 소스) · K1 병행 = relay README + checks push + build-index + Web Push 실 발송 + kyu-bridge Expo.*
