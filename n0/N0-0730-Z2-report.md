# N0-0730-Z2 리포트 · 세로빙고 정정 + 잭팟 payout

**Date**: 2026-08-07
**Round**: N0-0730-Z2 (Kyu B-9 실기 판정 후속 정정)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `e680672a` (Z2) on top of `0235bdf7` (Z-1)
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · 지속 · auto-merge OFF · Kyu approve 대기.

---

## Z2-1 · spin-seed 404 뿌리 실측 + 수리 (최우선)

### 실측 로그 (Kyu B-9 재현)

Kyu B-9 실기 관찰: "우상단 POST /bingo/spin-seed HTTP 404 실측 → 결과가 매번 동일 (고정 스피너=이채은)".

**재현 시나리오**:

1. `npm run dev:all` → Vite dev 서버 (localhost:5173) + backend (localhost:3002) 기동.
2. dev trigger 로 세로빙고 (vbingo) 발화 → `useBingoCompletion` 콜백 → `MainApp.handleSuperBingoComplete` → `bingoSpinSeedService.fetchSeed({bingoPatternId, participantIds, segmentCount})` 호출.
3. `apiClient.post("/bingo/spin-seed", ...)` → 요청은 Vite dev 서버로 감.
4. Vite dev 서버가 `/bingo/spin-seed` 프록시 규칙을 못 찾아 **SPA fallback (`index.html` 반환)** → 응답 body 는 HTML.
5. `response.json()` → **HTML parse 실패** or 404 status.
6. `bingoSpinSeedService.fetchSeed` = `{success: false}` 반환.
7. `MainApp` fallback: `spinnerPid = kidPids[0]` (정렬 후 첫 pid) → **매 스핀 동일** (Kyu 관찰 "이채은 고정").

### 뿌리 특정

`vite.config.ts` L55-113 `server.proxy` 는 **exact-prefix** 매칭:

```
"/heart": backend,
"/tickets": backend,
"/jackpot-pool": backend,
...
```

Z-1 에서 신설한 3 라우트 (`/bingo/spin-seed`, `/savings-pool`, `/heart-delta/split`) 는 vite proxy 에 **미등록**. 프록시 규칙 없으면 Vite 는 요청을 SPA fallback 으로 흘려 `index.html` 반환.

**동일 병리 사례** (vite.config.ts 안 주석에 명시):
- L84-86 `/heart`: "누락 시 POST /heart/apply 가 vite SPA fallback 못 받아 404".
- L88-91 `/tickets`: 동일.
- L93-95 `/jackpot-pool`: "누락 시 GET → Vite SPA fallback index.html → JSON 파싱 `Unexpected token '<'`".

### 수리 (Z2-1 · `vite.config.ts`)

```
"/jackpot-pool": backend,
// N0-0730-Z Z-1 (Kyu Z2-1 뿌리 fix · 2026-08-07) — 3 신 라우트 누락 시
// Vite SPA fallback 404 (Kyu B-9 실기 실측 · POST /bingo/spin-seed).
"/savings-pool": backend,
"/bingo": backend,
"/heart-delta": backend,
```

**재기동 필수**: `vite.config.ts` 변경은 dev 서버 재기동 필요 (`Ctrl-C` → `npm run dev:all`).

### 검증

- Backend `POST /bingo/spin-seed` 는 정상 등록됨 (`server.cjs` L8105 · `server/routes/bingoSpinSeed.cjs.registerBingoSpinSeedRoutes`).
- 라우트 코드는 이미 `Z-1` 에 편입 · Vite proxy 만 누락이 뿌리 · 404 = 프록시 미매칭.
- 수리 후 `POST /bingo/spin-seed` 응답 = `{success:true, data:{spinnerPid, landingIndex, participantIds}}` (HMAC 결정적 · 매 스핀 다른 pid).

---

## Z2-2 · 스피너 선정 정책 (정본 변경)

Kyu 판정 (2026-08-07):

| 빙고 종류 | 스피너 결정 | 릴 회전 | 분배 |
|---|---|---|---|
| 가로 | 입력자 = 수혜자 1명 (지목 자명) | **skip** (즉시 결과) | single |
| 세로 | 서버 seed 랜덤 (kid pids) | 있음 | splitN |
| 슈퍼 | 서버 seed 랜덤 (K-1 폐기) | 있음 | single (Z-3 에서 전원 적립) |

### 구현

**`src/components/Roulette/ParticipantCarousel.tsx`**:
- `skipRotation?: boolean` prop 신설.
- true 면 초기 `rotationOffsetDeg = 0` (스피너 중앙 정지) · useEffect 안 raf skip.

**`src/components/Roulette/RouletteModal.tsx`**:
- `skipCarouselRotation?: boolean` prop 신설 · ParticipantCarousel 로 pass-through.

**`src/stores/modalStore.ts`** + **`ModalHost.tsx`**:
- `ROULETTE` payload 에 `skipCarouselRotation` 필드 추가.

**`src/components/MainApp.tsx`** `handleSuperBingoComplete` 재작성:
- **가로**: `openModal("ROULETTE", { ..., skipCarouselRotation: true })` · 릴 정적.
- **세로**: 기존 splitN 유지 · `bingoSpinSeedService.fetchSeed` → splitN 모드 open.
- **슈퍼**: 서버 seed fetch 로 spinnerPid 결정 · single 모드 · **K-1 입력자 귀속 (`triggeringParticipantId`) 폐기** · Z-3 에서 "전원 동일 적립" 도입 예정.

### K-1 유지·폐기 명확화

- **유지**: super 트리거 감지 로직 (`useBingoCompletion.ts` · `triggeringParticipantId = lastKidPid`). 트리거 자체가 발화하는 이유가 "입력자가 슈퍼 조건 완성" 이라 감지는 그대로.
- **폐기**: 슈퍼 스피너 = 입력자 라는 가정. Kyu 형평성 판정 · 서버 seed 로 랜덤 지목.

---

## Z2-3 · 하이라이트 2단 (기존 구현으로 충족)

Kyu 요구:
- 스피너 선정 순간 = 중앙(스피너) 1명만 하이라이트.
- 담기 클릭 순간 = 참여 3명 전원 하이라이트.

### 재검증

**스피너 선정 순간**:
- `ParticipantCarousel` L149-151 `isSpinnerNow = rotationOffsetDeg < 3 && pid === spinnerPid` · 릴 회전 종료 근처에서만 스피너 활성.
- `CarouselParticipant` `isSpinner` prop true 시 `scale ×1.15` + glow (S-1 정본).

**담기 클릭 순간**:
- `RouletteModal` L787-792 `risingPids={stage === "depositing" ? distributionMode === "splitN" ? splitParticipantIds : [childId] : []}` · splitN 시 전원 배열.
- `CarouselParticipant` `isRising` prop true 시 `translateY(-30)` + `scale ×1.3` + 강한 glow (T-1 완화).

**결론**: 기존 구현이 Z2-3 요구 충족 · 추가 변경 없음.

---

## Z2-4 · 결과 모달 나눗셈 선표시

### 구현

**`src/components/Roulette/RouletteResultReveal.tsx`**:
- `distribution?: {mode, participantCount}` prop 신설.
- 담기 버튼 앞에 배지 삽입 (splitN + N ≥ 2 + `result.total.kind==='points'`):

```
<total> ÷ <N>명 = 각 <±perChild> · 나머지 <±absRem> 🐷 저금통
```

절대값 대칭 계산:
```
sign = total < 0 ? -1 : 1
absTotal = Math.abs(total)
absPer = Math.floor(absTotal / N)
absRem = absTotal - absPer * N
perTxt = `${sign < 0 ? "-" : "+"}${absPer}`
remTxt = `${sign < 0 ? "-" : "+"}${absRem}`
```

**예시**:
- `+200 ÷ 3 = 각 +66 · 나머지 +2 🐷 저금통`.
- `-100 ÷ 3 = 각 -33 · 나머지 -1 🐷 저금통`.
- `+150 ÷ 3 = 각 +50` (나머지 0 시 저금통 부분 생략).

**`src/components/Roulette/RouletteModal.tsx`** L910-914:
- Reveal 렌더 시 `distribution={{mode: distributionMode, participantCount: distributionMode === "splitN" ? splitParticipantIds.length : 1}}` pass-through.

---

## Z2-5 · 순차 담기 시퀀스 (stagger)

### 구현

**`src/components/Roulette/RouletteModal.tsx`** `handleAcceptToWallet` splitN 분기:

```
const STAGGER_MS = 400;
const balanceDelayMs = delta < 0 ? 100 : 1350;

heartsCopy.forEach((h, i) => {
  window.setTimeout(() => {
    useHeartBalanceStore.getState().setBalance(h.childId, h.balance);
  }, balanceDelayMs + i * STAGGER_MS);
});

const savingsDelayMs = balanceDelayMs + heartsCopy.length * STAGGER_MS;
if (savingsCopy) {
  window.setTimeout(() => {
    useSavingsPoolStore.getState().setBalance(savingsCopy.balance);
  }, savingsDelayMs);
}

const lastPushDelay = savingsCopy
  ? savingsDelayMs
  : balanceDelayMs + Math.max(0, heartsCopy.length - 1) * STAGGER_MS;
window.setTimeout(() => {
  scheduleFadeout(performance.now() + 500 + 3000);
}, lastPushDelay);
```

### 타임라인 (양수 · N=3 · total=+200 · 예: 각 66 · 나머지 2)

| t (ms) | 이벤트 |
|---|---|
| 0 | accept 클릭 · `setStage("depositing")` |
| 550 | particlesReady · Reveal 파티클 마운트 |
| 1350 | particles arrive spinner wallet · **1st child +66 카운트업 시작** |
| 1750 | **2nd child +66 카운트업 시작** |
| 2150 | **3rd child +66 카운트업 시작** |
| 2550 | 🐷 **savings +2 카운트업 시작** |
| 3050 | 마지막 tween 완료 (2550 + 500) |
| 6050 | **fadeOut** (2550 + 500 + 3000 · X-1 관찰 창) |

### 음수 (대칭)

`balanceDelayMs = 100` · 하트 즉시 count-down · savings 순차 후 fadeOut. 시각적으로 지갑에서 하나씩 빠져나가는 인지.

### 미완결 (defer to Z-3 · 이연)

- **하트 스트림 한 명씩 순차 전달** (multi-target HeartParticles): 현재 파티클은 spinner wallet 로만 단일 fly. 순차 stream 은 파티클 파이프 재작성 필요 · Z-3 스코프.
- 현 구현 = balance push stagger 로 CountUpNumber 순차 발화 · 인지상 "한 명씩" 이 근사됨.

---

## Z2-6 · 잭팟 payout endpoint + 이동 애니

### Backend (신 endpoint)

**`server/routes/jackpotPool.cjs.registerJackpotPayoutRoute`**:
- `POST /jackpot-pool/payout` · body `{childId, sourceId, reason?}`.
- 단일 트랜잭션:
  1. `family_jackpot_pool` balance FOR UPDATE (row lock).
  2. `family_jackpot_ledger` INSERT (`delta=-balance`, `source='jackpot_payout'`, `external_id=<sourceId>:jackpot_payout:pool`).
  3. `heart_balances` FOR UPDATE + UPDATE (student).
  4. `heart_ledger` INSERT (`delta=+balance`, `source='bingo_roulette'`, `metadata.kind='jackpot_payout'`, `external_id=<sourceId>:jackpot_payout:heart`).
- idempotent by 2 external_id UNIQUE · 재요청 시 원 entry 반환.
- balance=0 이면 early return · payout 없음.
- child role 은 write 불가 · parent/teacher 만.
- institution 소속 검증 (`student.institution_id === req.user.institutionId`).

**`server.cjs`** L8090~ · 두 번째 require 로 payout 라우트 등록 (기존 credit/get 라우트와 병렬).

### Client

**`src/services/jackpotPoolService.ts`**:
- `async payout({childId, sourceId, reason?})` 메서드 신설 · 응답 `{idempotent, paidAmount, poolBalance, heartBalance}`.

**`src/components/Roulette/RouletteResultReveal.tsx`**:
- `HeartParticles` export 편입 (기존 internal → 재사용 가능).

**`src/components/Roulette/RouletteModal.tsx`**:
- `jackpotPayoutActive: boolean` state 신설.
- `handleSpinEnd` 안 `front.kind === "jackpot"` 분기:
  - `setStage("depositing")` + `setJackpotPayoutActive(true)`.
  - `jackpotPoolService.payout` 호출.
  - 성공 시 `useJackpotPoolStore.setBalance(0)` + `useHeartBalanceStore.setBalance(spinner, newBalance)` (900ms 후 · 파티클 도착 동기).
  - fadeOut 스케줄 = 900 + 3000ms.
- 렌더: `jackpotPayoutActive && jackpotBoxAnchor` 시 `<HeartParticles sign="positive" origin={jackpotBoxAnchor} target={spinnerWalletAnchor} count={12} onAllDone={...}/>`.

### 타임라인

| t (ms) | 이벤트 |
|---|---|
| 0 | JACKPOT segment landing · `setStage("depositing")` + `setJackpotPayoutActive(true)` |
| 0 | `jackpotPoolService.payout` 호출 (async · ~100-300ms) |
| ~200 | payout 응답 · `jackpotPoolStore.setBalance(0)` (🎁 즉시 0) |
| ~200 | HeartParticles 마운트 · 잭팟 박스 → spinner 지갑 fly (900ms · 12 하트 · 40ms stagger) |
| 900 | 파티클 도착 · `heartBalanceStore.setBalance(spinner, newBalance)` |
| 1100 | `onAllDone` · `setJackpotPayoutActive(false)` |
| 3900 | **fadeOut** (0 + 900 + 3000 · X-1 관찰) |

---

## PR #288 본문 실기 절차 (변경 없음 · B-9 유지)

**필수 선행**:

```
1. git checkout main && git pull (필수)
2. git checkout feat/roulette-z1-vertical-bingo && git pull
3. npm install (필요 시)
4. psql -d grownest_dev -f migrations/053_family_savings_pool.sql (Z-1 · Z2 마이그 없음)
5. npm run dev:all
```

**Z2 신 실기 요건 (게이트 B-9-a)**:

⚠️ **`vite.config.ts` 변경으로 dev 서버 재기동 필수** (기존 세션은 old proxy 유지).

- ① **세로빙고**: 이전 = 404 폴백 · 고정 스피너 (이채은) · 매 스핀 동일 결과. Z2-1 fix 후 = spin-seed 200 응답 · 매 스핀 다른 스피너 (같은 bingoPatternId 재현 시 동일 pid · idempotent).
- ② **가로빙고**: 릴 회전 애니 없음 · 스피너 (입력자) 중앙 정지 상태에서 즉시 wheel 스핀 진입.
- ③ **슈퍼빙고**: 서버 seed 랜덤 스피너 · K-1 입력자 귀속 폐기 확인.
- ④ **결과 모달** (세로): "200 ÷ 3명 = 각 +66 · 나머지 +2 🐷 저금통" 배지 담기 앞 표시.
- ⑤ **담기** (세로): 각 아이 지갑 CountUpNumber 순차 발화 (400ms 간격 인지) · 마지막 아이 후 🐷 pop.
- ⑥ **JACKPOT 랜딩**: 🎁 balance 즉시 0 · 하트 12개 잭팟 → spinner 지갑 fly · spinner 지갑 카운트업.
- ⑦ 관찰 창 (X-1 · 3s) 유지.

---

## QC 4종 (Z2 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass (신 변경 없음 · 기존 커버 유지).
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 신규 0.
- **build**: ✓ 8.83s.

---

## 이연 순증감

### 신규 이연

- **Z2-5 하트 스트림 순차 (multi-target HeartParticles)**: 파티클 파이프 재작성 · Z-3 스코프.
- **JACKPOT payout 실패 처리 UX**: 현재는 toast · fadeOut 정상 진행. 재시도/롤백 UX 는 Z-3 이후.
- **Z2-6 JACKPOT 랜딩 시 payout=0 케이스** (pool 이미 0): 무애니로 즉시 fadeOut · 사용자 인지 어색할 수 있음 · defer.

### 해소 이연

- **Z-1 spin-seed 404 병리**: 뿌리 fix · 서버 지목 정상화.
- **슈퍼 스피너 형평성**: K-1 입력자 귀속 폐기 · 서버 seed 랜덤.
- **결과 모달 분배 예고 부재**: Z2-4 배지 편입.
- **잭팟 payout 미구현**: Z2-6 backend + client + 애니 완성.

### 여전히 별건 라운드

- **Z-2** (동시 가로+세로 · 연속 2회 · 진행 표기 · 라벨 전환).
- **Z-3** (슈퍼 · 연속 3회 · 전원 동일 적립).
- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인.
- **Kyu 실기 B-9-a**: 위 7 요건 · dev 서버 재기동 필수.
- **⛔ Z-2 / Z-3 착수 금지** · Z2 실기 PASS 후 순차.

---

## Commit graph

```
e680672a feat(roulette): Z2 세로빙고 정정 + 잭팟 payout (N0-0730-Z2 · Kyu B-9 판정)
0235bdf7 feat(roulette): Z-1 세로빙고 1/N 분배 + pool 분리 + 서버 seed (N0-0730-Z)
```

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1/Z2 head = `e680672a`.
