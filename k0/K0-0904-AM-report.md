# K0-0904-AM · 리포트 (정보 구조 재편 · Motion Grammar v1 · PR 상세 개편)

**round**: `K0-0904-AM`
**hub**: k0 (test-portal)
**PR**: https://github.com/CuriocityDevAi/test-portal/pull/87
**branch**: `feat/k0-0904-am-motion-grammar-home` (AL 위에 이어)
**commit**: `e09f340`
**grownest 원본 SHA**: `ce1f38b8` (@curiocitydevai/motion@0.1.0-alpha.0)
**timestamp**: 2026-09-04

---

## 요약

Kyu 09-04 결정: **탭 3개 → 홈 단일 스크롤** · **GrowNest Motion Grammar v1 전 계층**.

**범위 통제** (Kyu 명시 · 그대로 준수):
- 이번: AM-1 홈 3구역 + AM-2 (값·로직 복사 + Svelte 뷰 재구현) + AM-3 auto-merge 토글/scrollIntoView
- 다음 라운드: PopMenu · DirtyGuard · 중첩 푸시 (PR 상세 → 케이스 확대) · AM-4 이모지 → octicon 완결
- AN 별건: curiocity-kit 추출

**값·로직 복사는 이번에 전부** (Kyu 명시 · 뷰만 이연 가능).

---

## AM-1 · 정보 구조 (홈 단일 스크롤)

### 라우트

- `/` = 홈 (단일 스크롤 · 3구역)
- `/prs` = 전체 PR 목록
- `/pr/<owner>/<repo>/<n>` = PR 상세 (**URL 유지 필수** · 새로고침 복원)

**하단 탭 바 폐지**. 페이지 이동 = 링크 · history back = Safari 스와이프 / Android 뒤로 / [←].

### 홈 3구역

**① 할 일** — 액션 있는 항목만 (최대 5 · 초과 시 `더보기 →`).
- 승인: [다시 시도] [멈춰두기]
- 실기: [환경 열기]
- 항목 탭 → 계층 3 PR 상세
- 0건 = "지금 할 일이 없습니다" 20px 문구

**② 최근 활동** — 시간 역순 (최대 10 · ①과 중복 배제 · Set 필터).
- 예: "GrowNest #290 자동 승인 · 2h"
- 하단 `전체 PR →` = `/prs`

**③ 허브** — 접힌 한 줄 "허브 4개 · 모두 정상 ▸".
- 이상 시 자동 펼침 + 빨간 점.
- 탭 → 계층 2 시트 (허브 상세).

### 상단 크롬

- 큰 제목 "test-portal" + 우측 둥근 [⚙] only. 🔍 없음.
- 설정 = 계층 2 시트 (BottomSheet).

**정본 파일**:
- `src/routes/+layout.svelte` (재작성 · 하단 탭 폐지 · scroll-area only)
- `src/routes/+page.svelte` (재작성 · 홈 3구역)

---

## AM-2 · Motion Grammar v1 (값·로직 복사 + Svelte 뷰)

### 값·순수 로직 복사 (grownest@ce1f38b8)

**정본 파일**: `src/lib/kit-motion.ts` (확장 · MICRO 유지 + SHEET/POP/CHROME 편입)

파일 헤더 표기: `copied from grownest@ce1f38b8 (@curiocitydevai/motion@0.1.0-alpha.0)`

편입 상수:
- **sheetMotion** = SHEET_PRESENT_MS 420 · SHEET_DISMISS_MS 320 · PUSH_MS 360 · SHEET_EASE · SHEET_SWIPE_DOWN_CLOSE_THRESHOLD 80 · SHEET_SWIPE_DOWN_VELOCITY_THRESHOLD 600 · SHEET_TOP_INSET · SHEET_TOP_RADIUS 16 · SHEET_BACKDROP_PRESENT/DISMISS_MS
- **popMotion** = POP_SPRING TANGY {stiffness:480, damping:16, mass:0.55} · POP_SCALE_FROM 0.9 · POP_STAGGER_MS 40 · POP_DISMISS_MS 120 · POP_DISMISS_EASE · POP_SCALE_TO_ON_EXIT 0.95 · POP_ANCHOR_GAP 6 · POP_MIN_WIDTH 180
- **Chrome** = HEADER_H 60 · SLOT_H 56 · DISC_H 48 · TOUCH 44

**정본 파일**: `src/lib/nav-stack.ts` (신설)

- `pushLayer(kind, onClose): NavStackHandle` = `history.pushState` + 스택 push
- popstate 발화 시 스택 최상위 `onClose()` 실행 (LIFO)
- `handle.close()` = history.back → popstate → onClose 동일 경로
- Kyu 원문: "Safari 스와이프 · Android 뒤로 · [←] 한 경로"

### Svelte 뷰 재구현

**`src/lib/PushPage.svelte`** (계층 3)
- 우→좌 슬라이드 · PUSH_MS · SHEET_EASE
- **백드롭 없음** (AF-3 정본 정정)
- Safari 스와이프 뒤로 (좌 24px edge zone · ratio 0.35 · velocity 500)
- ESC 키 → onclose

**`src/lib/BottomSheet.svelte`** (계층 2)
- 95vh · 아래→위 · SHEET_PRESENT_MS 등장 · SHEET_DISMISS_MS 퇴장
- **3-way dismiss** = 백드롭 탭 / 아래 스와이프 (threshold 80 / 속도 600) / [X]
- SHEET_TOP_INSET safe-area · title header
- 배경 스크롤 잠금 (body overflow hidden)

### SPEC § 5.4 정정 (AF-3 재정의)

이전 AF-3 = SheetPush backdrop click 제거 (부분).
이번 **AM-2 정본**:
- **계층 3** = 백드롭 없음 · [←]/스와이프만 (SPEC § 22.2)
- **계층 2** = 백드롭 탭 닫기 (BottomSheet 3-way 정본)

---

## AM-3 · PR 상세 개편

### SheetPush 폐지 · 페이지 자체가 계층 3

- SheetPush wrap 제거 · 페이지 자체가 계층 3
- URL 기반 (`/pr/<owner>/<repo>/<n>`) · **새로고침 복원 정합**
- `goBack()` = history.back (기존 유지)

### auto-merge 체크박스 → 전체 폭 토글

- `data-testid="auto-merge-toggle"` · `role="button"` · `aria-pressed`
- **기본 ON** (Kyu 결정 · verdict=pass 시만 노출)
- 종합 판정 버튼 크기 동일 (44px 터치 · 전체 폭 · 좌 라벨 · 우 ON/OFF pill)

### 제출 후 scrollIntoView

```typescript
await tick();
const el = document.querySelector('section.submit-result') as HTMLElement | null;
if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
```

sticky 제출 바 아래 결과 가려짐 방지.

---

## 자기 검증 (Kyu 승인 규약 A · 필수)

### Playwright smoke 7 tests ✅

**정본 파일**: `e2e/portal-smoke.spec.ts` (재작성 · 7 tests)

```
✓ (a) 홈 3구역 · 할 일 / 최근 활동 / 허브 (694ms)
✓ (b) 상세 push in-frame (807ms)
✓ (c) 상세 하단 sticky (2.5s)
✓ (d) 설정 시트 열림 [계층 2 BottomSheet] (985ms)
✓ (e) history.back → 홈 복귀 (801ms)
✓ (f) auto-merge 토글 노출 (162ms)
✓ (g) 상세 URL 새로고침 복원 (191ms)

  7 passed (9.8s)
```

### 폰 스샷 7장 (K0-0904-AM-screenshots/)

- `a-home-3sections.png` — 홈 3구역 (h1 · [⚙] · 큰 문구)
- `b-detail-push.png` — 상세 push in-frame
- `c-detail-sticky.png` — 상세 하단 sticky
- `d-sheet-open.png` — 설정 시트 열림 (계층 2 backdrop)
- `e-home-back.png` — history.back → 홈 복귀
- `f-auto-merge-toggle.png` — auto-merge 토글 노출
- `g-detail-reload.png` — 상세 URL 새로고침 복원

---

## QC

- **pnpm check** = 999/0/0 ✅
- **pnpm test** = 67 files · 904 pass ✅
- **pnpm build** = ✔ (adapter-cloudflare) ✅
- **Playwright** = 7 tests pass · 스샷 7장 ✅
- **git** = clean · commit `e09f340` · push 완료

---

## 정본 파일

### 신설
- `src/lib/nav-stack.ts` (grownest 정본 · popstate LIFO)
- `src/lib/PushPage.svelte` (계층 3)
- `src/lib/BottomSheet.svelte` (계층 2)

### 편입/재작성
- `src/lib/kit-motion.ts` (SHEET/POP/CHROME 확장)
- `src/routes/+layout.svelte` (재작성 · 하단 탭 폐지)
- `src/routes/+page.svelte` (재작성 · 홈 3구역)
- `src/routes/pr/[owner]/[repo]/[id]/+page.svelte` (SheetPush 폐지 · 토글 · scrollIntoView)
- `e2e/portal-smoke.spec.ts` (재작성 7 tests)
- `e2e/screenshots/{a-g}*.png` (7장 · 이전 AL 5장 회수)

### 문서
- `docs/SPEC.md` v1.54 + **§ 21 (정보 구조)** + **§ 22 (Motion Grammar 채택 · 3 계층 정본 · AF-3 정정)**
- `docs/design/kyu-orchestrator-v0.3.md` § 9.31
- `docs/requirements-tracking.md` K54 + AM 이연 순증감

---

## Kyu 실기 절 (폰 스샷 기준)

1. 홈 접속 → h1 "test-portal" + [⚙] + 3구역 (할 일 · 최근 활동 · 허브) · 하단 탭 없음
2. 최근 활동 항목 탭 → 상세 push (URL /pr/owner/repo/n)
3. [←] or Safari 스와이프 → 홈 복귀
4. 상세 URL 새로고침 → 상세 그대로 복원
5. 종합 판정 [성공] 클릭 → auto-merge 토글 (전체 폭 · 기본 ON)
6. [제출] → 결과 블록 자동 스크롤 (뷰포트 상단)
7. [⚙] → 시트 열림 → 백드롭 탭 or 아래 스와이프 or [X] 3-way 닫힘

---

## 이연 순증감

**AM 신규 이연** (Kyu 명시):
- `PopMenu.svelte` (계층 1 · 필터 칩 `▾`)
- DirtyGuard (사유·메모 입력 중 닫기 확인)
- 중첩 푸시 (PR 상세 → 케이스 확대)
- AM-4 이모지 → octicon 완결 · raw hex 잔여 정리 · al1 ALLOW_LIST 비우기
- AN 별건 = curiocity-kit 추출 (kit 승격 · GrowNest 역 import 검증)

**AM 이연 회수**:
- AL 하단 알약 바 · 필터 칩 [PR] 탭 = **폐기** (탭 폐지 정본)
- AF-3 SheetPush backdrop click 제거 = **SPEC § 22.2 정본 정정** (계층 3 백드롭 없음)

**원장 총** = AH-2 서버 fix · AI-2 러너 실행 · AI-3 카탈로그 승격 · AI-5 unverified · AK dedup-cleanup 실 실행 · **AM PopMenu · DirtyGuard · 중첩 푸시 · AM-4 · AN kit 승격**

---

## 다음 라운드 대비

Kyu AM 실기 회신 후:
- **AN (예상)** = curiocity-kit 추출 (값+로직 패키지화 · GrowNest 역 import 검증)
- 또는 **AN** = PopMenu · DirtyGuard 착지
- 또는 **AN** = 중첩 푸시 (상세 → 케이스 확대) · AH-4 잔여 완결
- 또는 **AN** = AM-4 이모지 → octicon 완결 · 다크 테마

Kyu 판정 대기.
