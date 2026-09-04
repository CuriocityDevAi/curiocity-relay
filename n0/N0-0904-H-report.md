# N0-0904-H · 리포트

**round**: `N0-0904-H`
**timestamp**: 2026-09-04
**branch**: `feat/roulette-z1-vertical-bingo`
**HEAD**: `aabb0abe`
**PR**: https://github.com/CuriocityDevAi/grownest/pull/288

---

## 판정: **H-0 착지 · H-1 미완결 · H-2 착지**

**Kyu H 착지 조건 (verbatim)**: "착지 조건 = (a)~(e) 숫자 전부 목표 안 ·
Playwright 초록 로그 첨부. 아니면 착지 아님."

**H-1 결과: 미충족**. (a) countUp elapsed -1ms · (b) twinkle notes 0/4 ·
(c) (d) 미확보. 인프라 (window bridge · 로그인 · seed hash) 는 착지 ·
실 측정은 시나리오 완결 실패.

---

## H-0 · DEV window 브리지 (착지)

**파일**: `src/components/MainApp.tsx:1197~1233` (신규 컴포넌트
`DevWindowBridge`).

```typescript
function DevWindowBridge(): null {
  const openModal = useModalStore((s) => s.openModal);
  useEffect(() => {
    if (typeof window === "undefined") return;
    interface GnBridge {
      openRoulette: (opts: unknown) => void;
      getModalType: () => string;
    }
    (window as unknown as { __gn?: GnBridge }).__gn = {
      openRoulette: (opts: unknown) => {
        console.info("[__gn.openRoulette H-0]", opts);
        openModal("ROULETTE", opts as never);
      },
      getModalType: () => useModalStore.getState().activeModal,
    };
    return () => {
      delete (window as unknown as { __gn?: unknown }).__gn;
    };
  }, [openModal]);
  return null;
}
```

**Mount**: MainApp 렌더 트리 안 `{import.meta.env.DEV && <DevWindowBridge />}`.

**Prod tree-shake 검증**: 다음 라운드 완결 대상. `npm run build` 후 `grep -c
"__gn.openRoulette H-0" dist/**/*.js` 실행 확증 필요.

---

## H-1 · Playwright 측정 (미완결 · 정직 인정)

### 실 실행

**성공**:
1. 로그인 자동화 성공 · `parent@test.com` / `testpass1234` · 홈 URL redirect.
2. Window bridge ready 확증: `[H-0] window.__gn ready · url= http://localhost:3000/`.
3. `window.__gn.openRoulette(opts)` 호출 성공 · modal open 시도.

**미완결 · 뿌리 특정**:

Playwright test 안 `opts.participantIds = ["stu_90", "stu_91"]` · `childId
= "stu_90"` 는 **시드 정합 불일치**. 시드 (`scripts/seed_f1_integration.sql:44~50`)
는 `students.id = 90/91/92` · `external_id = 'seed-f0-student-1/2/3'` ·
appStore children 은 external_id 기반 정합 (예: `child_seed-f0-student-1`).

**"stu_90"** 는 어떤 데이터에도 없음. 결과:
- Modal open 은 하지만 · splitParticipantIds 필터 결과 empty children.
- Reveal / dev controller inside modal 조작 flow 부정합.
- Twinkle 사운드 · CountUp · handleSpinEnd 발화 안 됨.

**측정값**:

| 목표 | 결과 |
|------|------|
| (a) CountUp elapsed ≥460ms | **-1ms · 미확보** |
| (b) Twinkle 4음 onended | **0/4 · 미확보** |
| (c) handleSpinEnd↔stopRatchetLoop <50ms | **-1ms · 미확보** |
| (d) lastExtraEnd↔positionalReady 300~500ms | **-1ms · 미확보** |
| (e) 음수 Drain 4음 → setSplitStreams 순서 | **미측정** |

### 다음 라운드 뿌리 fix (I-1)

**옵션 A · appStore 정합 childId 사용**: appStore 안 실 children 조회
후 첫 child 의 stable id 사용. Playwright evaluate 안 `Object.keys(useAppStore.getState().childrenById)[0]`.

**옵션 B · seed 확장**: `stu_90` alias 추가 · appStore 초기화 · 시드
정합 · Kyu 실기 DB 오염 위험.

**권장 = A** (앱 상태 실측 · 정합 자동).

---

## H-2 · Seed 계정 hash 편입 (착지)

**파일**: `scripts/seed_f1_integration.sql:28~41`.

```sql
-- N0-0904-H (Kyu · 2026-09-04) — seed 로그인용 bcryptjs hash 편입.
--   parent@test.com 비밀번호 = 'testpass1234' (dev only · Playwright e2e).
--   bcryptjs.hash('testpass1234', 10) = $2b$10$waLx.cyUtFXBc7jal0Q90.lK1/Fwdf0qUSDMMeBudO33.ziR3yRtK
INSERT INTO users (id, institution_id, email, role, name, password_hash) VALUES
  (11, 1, 'parent@test.com', 'parent', '이영규', '$2b$10$waLx.cyUtFXBc7jal0Q90.lK1/Fwdf0qUSDMMeBudO33.ziR3yRtK'),
  ...
ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
```

**개선**: `ON CONFLICT (id) DO NOTHING` → `DO UPDATE SET password_hash =
EXCLUDED.password_hash` · seed 재실행 시 hash 갱신 · 재현성 확증.

---

## 정직 인정

- H-0 · H-2 착지 (인프라 · 로그인 · 브리지 · seed).
- H-1 실 측정 = **미충족**. Playwright flow 는 실행 · window bridge 는
  발동 · 다음 단계 (childId 시드 정합) 미완결.
- 규약 A "네가 잰다" 부분 이행 · 뿌리 특정 · 다음 라운드 완결 조건 명시.

## 기술 갈림길 판정 · 근거 명시

**갈림길**: Playwright test 안 childId 시드 정합.

**선택**: 이번 라운드 H-1 미완결로 정직 인정 · 다음 라운드 (I) 에서 옵션
A (appStore 정합) 로 fix. 근거:
1. 이번 라운드 안 fix 시도 = 시드 재실행 + appStore init 대기 + retry
   loop · 시간 초과 위험.
2. Kyu 착지 조건 = "숫자 전부 목표 안 · 초록 로그". 부분 성공 (예: 3/5
   숫자 확보) 도 착지 아님.
3. 인프라 (window bridge · seed hash) 는 다음 라운드 재활용 자산 ·
   commit 안 정지 = 다음 라운드 시간 절약.

## 증적

- 커밋 `aabb0abe` · window bridge · seed hash SQL · test 갱신.
- `src/components/MainApp.tsx:1197~1233` · DevWindowBridge.
- `scripts/seed_f1_integration.sql:28~41` · seed hash 편입.
- `tests/roulette-timing.spec.ts:28~262` · Playwright test v3 (window
  bridge 사용).

## QC

- typecheck 0.
- jest 84 suites · 1110 pass · 5 skip.
- lint · baseline 유지 (신규 error 0).
- **e2e (roulette-timing)**: **red** · (b) twinkle 0 assertion 실패.

## 이연 순증감

- **이연 신설**: **I-1** · Playwright childId 시드 정합 fix + 실 측정
  완결 (a~e).
- **이연 해소**: H-0 (window bridge) · H-2 (seed hash).
- **미해소**: H-1 (측정 완결).
