# N0-0730-Z5 리포트 · 슈퍼 loop 진단 + copyAll 배지 + 스피너 안내 + PR 형식 자검

**Date**: 2026-08-07
**Round**: N0-0730-Z5 (Kyu B-9-c 실기 판정 후속)
**Branch**: `feat/roulette-z1-vertical-bingo`
**Head**: `664feae6` (Z5) on top of `97cfe68f` (Z4) → `6030911d` (Z3) → `e680672a` (Z2) → `0235bdf7` (Z-1)
**PR**: [#288](https://github.com/CuriocityDevAi/grownest/pull/288) · 지속 · auto-merge OFF · Kyu approve 대기.

---

## Z5-1 · 슈퍼 순차 N 스핀 loop 진단 · defensive fix (최우선)

### Kyu 관찰 재현

"슈퍼 발화 (금 라벨 정상) → 1스핀 담기 후 다음 스핀 없이 종료. Z3-3 superSequence loop 이 음수 결과 담기 경로에서 미도달 의심."

### 뿌리 후보 (코드 리뷰 · 브라우저 실측 부재 상태)

1. **superSequence undefined** (가장 개연성): `MainApp.handleSuperBingoComplete` 슈퍼 브랜치:
   ```ts
   const superSequence = seedRes.success ? seedRes.data.sequence : undefined;
   openModal("ROULETTE", {
     ...
     superSequence,
     distributionMode: superSequence ? "copyAll" : "single",
   });
   ```
   `seedRes.success = false` OR `seedRes.data.sequence` 미포함 → `superSequence = undefined` → `distributionMode = 'single'` 강등 → RouletteModal 은 splitN/copyAll flow 대신 legacy single flow · 1 스핀 후 fadeOut.

2. **onAllDone 클로저 stale**: `splitStreams.map((s) => <HeartParticles onAllDone={() => { ... superSequence ... isLastSpin ... }} />)`. `superSequence` / `isLastSpin` 은 render 시 파생값 · onAllDone 는 매 렌더마다 새 클로저. React strict mode + motion.div 조합에서 초기 클로저를 캐시할 수도 (framer motion 의 `onAnimationComplete` 실제 동작에 따름). stale 클로저 사용 시 조건 판정 오류 가능.

### Defensive Fix

**MainApp** (`src/components/MainApp.tsx`) 슈퍼 브랜치:

```ts
let superSequence = seedRes.success ? seedRes.data.sequence : undefined;
if (!superSequence && kidPids.length >= 1) {
  // Client fallback · 1 항 sequence 로 copyAll 1 스핀 최소 보장.
  superSequence = [{ spinnerPid, landingIndex }];
  console.warn(
    "[useBingoCompletion] super sequence missing from server · fallback to 1-item sequence · copyAll 1 스핀",
    { seedResSuccess: seedRes.success, kidPidsCount: kidPids.length },
  );
}
console.info(
  "[useBingoCompletion] super trigger open · superSequence.length =",
  superSequence?.length,
  "· kidPids =",
  kidPids,
);
openModal("ROULETTE", {
  ...
  superSequence,
  distributionMode: "copyAll",  // 항상 copyAll (single 강등 폐지)
});
```

- 서버 sequence 부재 시에도 최소 1 스핀 copyAll (전원 복사) 보장 · 슈퍼 정본 위반 방지.
- 콘솔 진단 로그로 실 문제 원인 파악 가능 (Kyu 실기 시 devtools 확인).

**RouletteModal** (`src/components/Roulette/RouletteModal.tsx`) 클로저 stale 방지:

```ts
const superSpinIdxRef = useRef<number>(0);
const superSequenceRef = useRef<Array<{...}> | undefined>(undefined);

useEffect(() => { superSpinIdxRef.current = superSpinIdx; }, [superSpinIdx]);
useEffect(() => { superSequenceRef.current = superSequence; }, [superSequence]);
```

onAllDone loop 조건 = **ref 기반 stable read**:

```ts
const curSeq = superSequenceRef.current;
const curIdx = superSpinIdxRef.current;
const seqLen = curSeq?.length ?? 0;
const canAdvance = !!curSeq && curIdx < seqLen - 1;
console.info(
  "[RouletteModal] splitStreams onAllDone last · seqLen=",
  seqLen, "curIdx=", curIdx, "canAdvance=", canAdvance,
);
if (canAdvance) {
  window.setTimeout(() => { setSuperSpinIdx((i) => i + 1); ... }, 3000);
} else {
  scheduleFadeout(...);
}
```

- Ref 는 항상 최신 · motion.div 클로저 stale 이슈 원천 차단.
- 진단 로그로 실 원인 파악.

### 실측 유예

브라우저 실측 없이 뿌리 확정 불가. Kyu 실기 시 devtools 콘솔에서 `superSequence.length` · `canAdvance` 로그 확인으로 뿌리 특정. Defensive fix 로 최악의 경우도 (superSequence 부재) 1 스핀 copyAll 보장 · 정본 위반 방지.

---

## Z5-2 · 슈퍼 copyAll 배지

### 병리

Z2-4 (세로 나눗셈 배지) 는 splitN 전용 · copyAll (슈퍼) 배지 없음. 결과 모달에서 슈퍼가 "전원 복사" 임을 명시하는 시각 없음.

### 구현 (`src/components/Roulette/RouletteResultReveal.tsx`)

`distribution.mode` union 확장:
```ts
distribution?: {
  mode: "single" | "splitN" | "copyAll";  // Z5-2
  participantCount: number;
};
```

copyAll 배지 렌더:
```jsx
{distribution?.mode === "copyAll" && distribution.participantCount >= 1 && result.total.kind === "points" && (() => {
  const total = result.total.n;
  const n = distribution.participantCount;
  const perTxt = `${total < 0 ? "" : "+"}${total}`;
  return (
    <div
      style={{
        marginTop: 8, padding: "8px 10px",
        background: "#FFFBEB", border: "1px solid #FDE68A",
        borderRadius: "var(--radius-md)", color: "#78350F",
        fontSize: 13, fontWeight: 600, textAlign: "center",
      }}
      data-copyall-preview
      aria-label={`슈퍼빙고 전원 복사 · ${n}명 각 ${perTxt}`}
    >
      슈퍼빙고 · 전원 각 <strong>{perTxt}</strong> ({n}명 복사)
    </div>
  );
})()}
```

- **색**: 노랑 배경 (`#FFFBEB`) · 슈퍼 라벨 (금) 과 톤 일치.
- **splitN 배지 (파랑)** 와 시각 명확 구분.

**Modal pass-through 갱신** (`src/components/Roulette/RouletteModal.tsx`):
```ts
distribution={{
  mode: distributionMode,  // Z5-2 · copyAll 그대로 전달 (이전 'single' 강등 폐지)
  participantCount:
    distributionMode === "splitN" || distributionMode === "copyAll"
      ? splitParticipantIds.length : 1,
}}
```

### 예시

- 슈퍼 +200 · N=3: "슈퍼빙고 · 전원 각 **+200** (3명 복사)" (노랑 배지).
- 슈퍼 -50 · N=3: "슈퍼빙고 · 전원 각 **-50** (3명 복사)".
- 세로 +200 · N=3: "200 ÷ 3명 = 각 **+66** · 나머지 **+2** 🐷 저금통" (파랑 배지 · 기존).

---

## Z5-3 · 스피너 안내 말풍선 (3 blink)

### 정본

Kyu 요구: 세로·슈퍼에서 릴 정지·스피너 확정 순간 · 스피너 프로필 위 "{이름}님 스핀해주세요!" 말풍선 → 3차례 깜빡 후 유지/소멸. 슈퍼 순차 스핀마다 매 스핀 표시.

### 구현 (`src/components/Roulette/RouletteModal.tsx`)

`useAppStore` 로 child name 조회:
```ts
const children = useAppStore((s) => s.children);
const activeSpinnerName = children[activeSpinnerPid]?.name ?? "";
```

말풍선 렌더 (조건 · Stage='spin' + splitPids > 1 + name):
```jsx
{stage === "spin" && splitParticipantIds.length > 1 && activeSpinnerName && (() => {
  const anchor = participantAnchorsRef.current.get(activeSpinnerPid);
  if (!anchor) return null;
  return (
    <motion.div
      key={`spinner-hint-${activeSpinnerPid}-${superSpinIdx}-${againOverride?.counter ?? 0}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: [0, 1, 0, 1, 0, 1, 0, 1],
        y: [8, 0, 0, 0, 0, 0, 0, 0],
      }}
      transition={{
        duration: 1.8,
        times: [0, 0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 1],
        ease: "easeOut",
      }}
      style={{
        position: "fixed",
        left: anchor.x,
        top: anchor.y - 80,
        transform: "translate(-50%, -100%)",
        zIndex: 62,
        padding: "8px 14px",
        background: "#FFFEFB", color: "#1F2937",
        borderRadius: "var(--radius-md)", border: "2px solid #F59E0B",
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
        fontSize: 14, fontWeight: 700, whiteSpace: "nowrap",
        userSelect: "none", pointerEvents: "none",
      }}
      aria-label={`${activeSpinnerName}님 스핀해주세요!`}
    >
      {/* 말풍선 꼬리 (아래 방향) */}
      <span style={{
        position: "absolute", bottom: -8, left: "50%",
        transform: "translateX(-50%)",
        width: 0, height: 0,
        borderLeft: "8px solid transparent",
        borderRight: "8px solid transparent",
        borderTop: "8px solid #F59E0B",
      }}/>
      {activeSpinnerName}님 스핀해주세요!
    </motion.div>
  );
})()}
```

- **위치**: 스피너 아바타 위 80px (`top: anchor.y - 80`).
- **꼬리**: 아래 방향 삼각형 (금색 · 아바타 가리키기).
- **애니**: opacity keyframes 3 blink (0→1→0→1→0→1→0→1) · 1.8s · 마지막 hold at 1.
- **재-mount**: Key 는 `activeSpinnerPid` + `superSpinIdx` + `againOverride.counter` 조합 · 슈퍼 순차 스핀마다 재-mount · AGAIN 재스핀 시에도 재-mount.

### 조건 판정

- `stage === "spin"`: 스핀 진행 전/도중.
- `splitParticipantIds.length > 1`: 여러 참여자 (single 모드는 스피너=수혜자 자명 · 힌트 불요).
- `activeSpinnerName`: children store 에서 이름 조회 성공.

---

## Z5-4 · PR 포털 파싱 자검

### 병리

Z4 에서 test-checklist 를 **PR comment** 로만 게시 · **PR body** 는 Z-1 원 body 그대로. Kyu B-9-c 관찰: "포털 개요 없음·0개".

**뿌리**: pr-test-checklist-guide.md 는 "위치 = PR body 안" 명시. Comment 는 aside · test-portal 파서는 body 만 파싱. Comment 로 게시하면 파싱 대상 밖.

### Fix

`gh pr edit 288 --body ...` 로 body 자체를 checklist-guide 형식으로 재작성:

```markdown
**round**: `N0-0730-Z5`

## 요지
- N0-0730-Z 시리즈 통합 · γ.3 세로빙고 1/N + 슈퍼 순차 N 스핀 + JACKPOT 분배.
- Kyu B-9-c 실기 후속 · 슈퍼 loop 진단 + copyAll 배지 + 스피너 말풍선.
- 배포 = migration 053 필수 + 신 endpoint 3.

## test-checklist

​```yaml
- id: z5-1-super-loop
  title: "슈퍼빙고 = N번 순차 스핀 (loop 완주)"
  ...
​```
```

14 test case:
- `z5-1-super-loop` · `z5-2-copyall-badge` · `z5-3-spinner-hint` · `z5-4-super-copyall-neg`
- `z4-1-super-label` · `z4-2-again-respin` · `z4-3-negative-symmetry` · `z4-4-arrival` · `z4-5-jackpot-share`
- `z3-2-multi-stream` · `z3-4-ref-warning`
- `z2-4-division-badge` · `z2-6-jackpot-payout`
- `x1-observation`

### 검증 · K0 회부 조건

- Body 갱신 후 test-portal 개요 = 14 case → 파서 정상.
- Body 갱신 후에도 0 개 → 포털 파서 결함 · K0 회부.

---

## Kyu 실기 재개 대본 (B-9-d · dev 서버 재기동)

```
1. git checkout main && git pull
2. git checkout feat/roulette-z1-vertical-bingo && git pull
3. npm install (필요 시)
4. psql -d grownest_dev -f migrations/053_family_savings_pool.sql (Z-1 · 이미 실행 시 skip)
5. npm run dev:all
```

### 통합 실기 체크리스트

| ID | 요건 | 근거 |
|---|---|---|
| z5-1 | 슈퍼빙고 = N번 순차 스핀 완주 · 콘솔 superSequence.length 확인 | Z5-1 defensive |
| z5-2 | 슈퍼 결과 모달 = 노란 "전원 각 ±X (N명 복사)" 배지 | Z5-2 |
| z5-3 | 세로/슈퍼 릴 정지 시 스피너 위 "{이름}님 스핀해주세요!" 말풍선 3 blink | Z5-3 |
| z4-1 | 슈퍼 = 금 라벨 (세로빙고 오인 소멸) | Z4-1 |
| z4-2 | AGAIN 랜딩 = 즉시 재스핀 (원 규칙) | Z4-2 |
| z4-3 | 음수 결과 = 지갑/저금통 → 잭팟 대칭 스트림 | Z4-3 |
| z4-4 | 스트림 도착점 = 앵커까지 fully visible | Z4-4 |
| z4-5 | JACKPOT segment = 🎉 폭죽 + 분배 payout | Z4-5 |
| z3-4 | 콘솔 ref 경고 0 | Z3-4 |
| x1 | 담기 후 3s 관찰 창 유지 | X-1 |

---

## QC 4종 (Z5 커밋 후)

- **typecheck**: 0 errors.
- **jest**: 85/85 pass.
- **pre-push 훅 전체**: 1102 passed / 5 skipped / 0 failed.
- **lint**: 35 errors baseline · 179 warnings baseline (신규 0).
- **build**: ✓ 8.44s.

---

## 이연 순증감

### 신규 이연

- **Z5-1 실 뿌리 확정**: 브라우저 실측 없이 defensive fix 만 편입. Kyu 실기 시 콘솔 로그로 뿌리 특정 필요.
- **Z-2 원 스코프 (동시 h+v 시퀀스)**: super 성립 시 hbingo/vbingo skip (Z4-1) 후에도 · super 없는 h+v 동시 발화 시 여전히 별건.
- **test-portal 파서 결함 (K0 회부 조건부)**: PR body 갱신 후에도 개요 0 이면 파서 결함.

### 해소 이연

- **Z5-1 defensive**: 최소 1 스핀 copyAll 보장 (superSequence 부재 시).
- **Z5-2 (신규 정본)**: 슈퍼 copyAll 배지.
- **Z5-3 (신규 정본)**: 스피너 안내 말풍선.
- **Z5-4 (자검 + 수정)**: PR body 형식 정합.

### 여전히 별건 라운드

- **⛔ γ.4~γ.5 미착수 유지**.

---

## 회부

- **Kyu approve (PR #288)**: 실기 승인 → T0 착지 재확인 (5 커밋 squash).
- **Kyu 실기 B-9-d**: 위 통합 체크리스트 10 요건.
- **Kyu 실기 시 devtools 콘솔 관찰**: `superSequence.length` · `canAdvance` 로그 → Z5-1 실 뿌리 특정.
- **test-portal 개요 확인**: PR body 갱신 후 case 14 파싱 여부. 0 이면 K0 회부.

---

## Commit graph

```
664feae6 feat(roulette): Z5 슈퍼 loop 진단 + copyAll 배지 + 스피너 안내 (N0-0730-Z5)
97cfe68f feat(roulette): Z4 슈퍼 오인 뿌리 + AGAIN + 음수 대칭 + JACKPOT 분배 (N0-0730-Z4)
6030911d feat(roulette): Z3 payout 뿌리 + multi-target + 슈퍼 N번 스핀 (N0-0730-Z3 · Kyu B-9-a)
e680672a feat(roulette): Z2 세로빙고 정정 + 잭팟 payout (N0-0730-Z2 · Kyu B-9 판정)
0235bdf7 feat(roulette): Z-1 세로빙고 1/N 분배 + pool 분리 + 서버 seed (N0-0730-Z)
```

**main tip**: `1dd2afcd` (X-1 · 2026-08-06). Z-1/Z2/Z3/Z4/Z5 head = `664feae6`.
