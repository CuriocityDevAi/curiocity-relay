# N0-0902-B · 리포트

**round**: `N0-0902-B`
**timestamp**: 2026-09-02
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `4c2174e9`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 요약

Kyu ×2 2026-09-02 실기 · A-2 재작업 (신규 카드 폐기 → 웨지 재사용) + 버그
2건 + 환경 1건.

## 착수 · 결정 정리

### B-1 · 신규 카드 폐기 · 기존 웨지 재사용 (A-2 정본 개정)

**Kyu 정본**:
> "휠이 1개일 때 당첨 조각(부채꼴 웨지)을 크게 띄우고 앞면·뒷면을 보여주는
> 기존 디자인 컴포넌트가 이미 있다. 멀티 스핀도 이 컴포넌트를 그대로 쓴다.
> 새로 만들지 마라. 배치만 바꾼다: 웨지 N개를 각 휠 위치에 동시에 띄운다."

**기존 웨지 컴포넌트 특정**:
- 파일: `src/components/Roulette/RouletteResultReveal.tsx`.
- 컴포넌트: `PieFace({ segment, face, hidden })` (line 163~214 · SVG 15° 슬라
  이스 · CanonicalSlice + BACK 라벨).
- 뒷면 파생: `backOpToSegment(backOp)` (line 126~150).

**폐기**: MultiSpinPositionalReveal 초기 구현 · 노란 gradient 사각 카드 · "#{i}
♥100" 배지 · "탭하여 공개 ↺" 텍스트 UI 전체.

**Fix**:
- `RouletteResultReveal.tsx:126` · `backOpToSegment` export 추가.
- `RouletteResultReveal.tsx:163` · `PieFace` export 추가.
- `MultiSpinPositionalReveal.tsx` 전면 재작성:
  - PieFace 앞·뒷면 rotateY 3D flip (기존 Reveal 로직 정합).
  - 웨지 크기 `wedgeH = min(wheelSize * 0.9, 260)` · `wedgeW = wedgeH * (1/2.06)` (slice aspect).
  - yOffset `-wedgeH * 0.3` (wheel 중심 약간 위).
  - 형태·색·연출 = 단일 스핀 웨지 동일.
- Modal `MultiSpinPositionalReveal` 호출 · `wheelSize={mainWheelSize}` prop
  추가 (autoScale 정합).

### B-2 · 단일 스핀도 수동 flip

**Kyu 정본**: "룰렛 1개일 때에도 자동이 아니라 클릭해서 수동으로 뒤집는".

**뿌리**: `RouletteResultReveal.tsx:381~393` `useEffect` phase transitions ·
`phase === "front"` 시 `FRONT_HOLD_MS (1800ms)` 자동 flipping.

**Fix**:
- `RouletteResultReveal.tsx:88` · `FRONT_HOLD_MS` 상수 삭제.
- useEffect 안 `phase === "front"` 자동 진행 로직 제거 · flipping → back →
  receipt 만 자동.
- `RouletteResultReveal.tsx:549~569` · 웨지 wrapper motion.div 에 `onClick=
  {phase === "front" ? () => setPhase("flipping") : undefined}` + `cursor:
  pointer` (front 시) + `role="button"` + aria-label 편입.
- 기존 웨지 디자인 훼손 없이 wrapper 만 클릭 유도 (별도 배지 신설 X · Kyu
  정본 준수).

### B-3 · 로그인 후 황금 코인 잔존 (버그)

**뿌리**:
- `src/stores/devGoldenStore.ts` · zustand `persist` middleware · **전체
  state (activityThreshold + bingo flags 포함) localStorage 유지**.
- 이전 세션에서 activityThreshold 활성 값 세팅 시 · 다음 로그인 세션 진입
  즉시 `GoldenDiscDevRunner` 감지 · 활동 개수 매칭 → 자동 트리거 → 룰렛
  modal open → GoldenDisc 좌하단.

**Fix** (`devGoldenStore.ts:70~85`):
```typescript
persist(..., {
  name: "dev-golden-store",
  // B-3 · 트리거 조건 (activityThreshold + bingo flags) persist 제외.
  partialize: (state) => ({
    difficulty: state.difficulty,
    customSegments: state.customSegments,
    customBackopPool: state.customBackopPool,
  }),
});
```

`difficulty · customSegments · customBackopPool` 만 유지 (dev 편의) · 트리거
조건은 매 세션 default (Off/false) 로 시작.

### B-4 · dev 포트 정본

**조사**:
- `vite.config.ts:49~51` · `server.port: 3000` · `strictPort` 미설정.
- Vite default = 지정 포트 점유 시 다음 포트 자동 fallback (3001 · 3002 · ...).
- Kyu 실측 3001 = 3000 점유 시 자동 fallback.
- N0-0902-A 리포트 5173 기재 = Vite 기본 default (5173) 오해 · 잘못.
- 실행 결과 = 3000 정본 (vite.config 명시).

**Fix** (`vite.config.ts:50`):
```typescript
server: {
  port: 3000,
  strictPort: true, // B-4 · 점유 시 실패 · fallback 안 함.
  host: true,
  ...
}
```

**정본 포트**:
- Frontend Vite = **3000** (strictPort · 점유 시 실패).
- Backend Express = **3002** (vite proxy target).
- `npm run dev:all` = concurrently frontend + backend.

### B-5 (유지)

- A-1 라쳇 독립화 · A-3 암막 상시 · A-4a 합체 스케일업 · A-4b 적립음 순서 ·
  A-4c ×2 스트림. 이번 실기 미확인 · 회귀 X · 파일 변경 없음.

## [DOC] 정본 문서 반영

- `docs/epics/roulette-final-redesign.md` · § N0-0902-B 정본 편입 (B-1 웨지
  재사용 · B-2 수동 flip · B-3 persist partialize · B-4 strictPort). A-2 정본
  "신규 카드" → "기존 웨지 재사용" 개정.
- `EPIC-STATE.md` · 룰렛 EPIC 라인 갱신:
  - `last_touched=2026-09-02 · last_verified=2026-09-02`.
  - `γ Z-1~Z29 + N0-0902-A/B PR #288 (auto-merge OFF · Kyu N0-0902-B 웨지
    재사용 + 단일 수동 flip + 황금 잔존 + 포트 정본)`.

## 증적 (파일경로+줄수+커밋해시)

- 커밋 · `4c2174e9`.
- `src/components/Roulette/RouletteResultReveal.tsx:88` · FRONT_HOLD_MS 삭제.
- `src/components/Roulette/RouletteResultReveal.tsx:126` · backOpToSegment export.
- `src/components/Roulette/RouletteResultReveal.tsx:163` · PieFace export.
- `src/components/Roulette/RouletteResultReveal.tsx:381~397` · useEffect
  자동 flipping 진행 로직 제거.
- `src/components/Roulette/RouletteResultReveal.tsx:549~572` · 웨지 wrapper
  onClick + cursor + role + aria-label.
- `src/components/Roulette/MultiSpinPositionalReveal.tsx:1~245` · 전면 재작성
  (신규 카드 폐기 · PieFace 재사용).
- `src/components/Roulette/RouletteModal.tsx:2054` · wheelSize prop 추가.
- `src/stores/devGoldenStore.ts:70~85` · persist partialize (트리거 조건
  제외).
- `vite.config.ts:50~55` · strictPort true.

## QC

- **typecheck**: `tsc --noEmit` · 에러 0.
- **lint**: baseline +1 warning (PieFace export · fast-refresh · runtime 무관)
  · 신규 error 0.
- **test**: `jest` · 83 suites · 1102 pass · 5 skip · 0 fail · 12.5s.

## Kyu 실기 절차 (self-contained)

**최신화·기동**:
```bash
git checkout feat/roulette-z1-vertical-bingo && git pull
npm install
npm run dev:all
```

- Frontend: **http://localhost:3000** (strictPort · 점유 시 실패).
- Backend: http://localhost:3002.
- APP_ENV=development · DB_NAME=grownest_dev · STORAGE_ROOT=uploads-dev.

**Dev Controller 진입**:
- 브라우저 http://localhost:3000 → 로그인 → 빙고 완성 or dev controller
  `[가로/세로 재발화]` 로 룰렛 modal.
- Modal 우측 `[DEV] 룰렛 컨트롤러`.

**정상 판정**:

1. **B-1**: SPIN×2/×3 후 각 wheel 위치 위에 기존 웨지 (SVG 15° 슬라이스 ·
   무지개 gradient · BACK 라벨) 동시 표시. 신규 카드 UI 완전 소멸. 크기
   자동 축소 (겹침 X).
2. **B-2**: 단일 스핀 · 웨지 앞면 표시 후 자동 뒤집힘 없음. 웨지 클릭 → flip
   → 뒷면. cursor pointer + glow pulse. 멀티도 각 웨지 개별 클릭.
3. **B-3**: 재로그인 후 홈 화면 · 좌하단 황금 코인 자동 등장 없음.
4. **B-4**: `npm run dev:all` 시 · http://localhost:3000 접속. 3000 점유 시
   에러 (조용히 fallback 안 함).
5. **유지 (A)**: 라쳇·암막·스케일업·적립음 순서·×2 스트림 (변경 X).

## 착지 상태

- PR #288 body 갱신 · `**round**: \`N0-0902-B\`` 첫 줄 · Kyu 실기 절차
  self-contained · QC · EPIC-STATE 갱신.
- Kyu 실기 대기 · approve 후 auto-merge.

## 이연 순증감

- **이연 신설**: 없음 (B-1·B-2·B-3·B-4 4 항 전부 concrete + [DOC] 착지).
- **이연 해소**:
  - **A-2 초기 구현** (신규 카드 UI) → 웨지 재사용 · Kyu 정본 정합.
  - **자동 flip** (단일 · 멀티 공통) → 수동 flip.
  - **로그인 후 황금 잔존** (persist 부작용) → partialize.
  - **dev 포트 3 값 불일치** → strictPort 3000 정본.
