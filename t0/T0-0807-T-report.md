# T0-0807-T · 리포트 (혼합 라운드 · fix 3 + 조사 인벤토리 별도)

## 스코프

**Kyu R 재실기 판정**: 시각 §12 R-1 **PASS** (엑셀 원문 그대로). 신규 판정 4건 반영.

**T 라운드 (혼합)**:
- **즉시 fix (구현)**: T-4 상태 전이 · T-5 로그 접기 컨트롤 · T-6 접힘 카드 디자인.
- **조사 (구현 금지)**: T-1 지각/야근 판정 인벤토리 · T-2 신 엔진 배선 설계안 · T-3 파리티 테스트 계획.
- **조사 인벤토리**: `relay/t0/T0-0807-T-inventory.md` 별도 게시 (Kyu 결정 게이트).

## T-4 · 상태 전이 엔진 정본 신설 (§14)

**정본 (재론 금지)**:
> 표시 상태는 화면 재생에 추종한다. **READY → IN_PROGRESS (로그 재생 중) → DONE (로그 재생 완료 + 좌측 결과 테이블 등장 후) → 오류 시 오류 로그 찍은 뒤 FAILED**.

**뿌리** (Kyu 실측):
- deriveScreen 이 pcon_step_run.status 물리값 그대로 반환.
- physical DONE = attempt 종결 시각 · 하지만 Pacer 로그 재생은 미완일 수 있음.
- 결과 = "로깅이 끝나기 전에 DONE으로 전환" 회귀.

**Fix** (`web-admin/src/pages/payroll/pcon-view/PconAttendanceContext.tsx`):
```ts
const displayStatusOf = useCallback((path: string): string => {
  const physical = derived.steps[path]?.status ?? 'READY';
  if (physical === 'FAILED' || physical === 'READY' || physical === 'ABANDONED' || physical === 'STALE') {
    return physical;
  }
  if (physical === 'IN_PROGRESS') return 'IN_PROGRESS';
  // physical = DONE 이라도 revealComplete=false 이면 IN_PROGRESS 로 표시.
  return isMinorRevealComplete(path) ? 'DONE' : 'IN_PROGRESS';
}, [derived, isMinorRevealComplete]);
```

**소비 (엔진급 · 재구현 금지)**:
- Rail 카드 배지 (STATUS_BADGE) · border 스타일 · `data-status` 속성.
- 브레드크럼 배지.
- `data-physical-status` 속성 추가 (감사 · 회귀 검증용).

## T-5 · 로그 접기 컨트롤 = 텍스트

**Fix** (`PconAttendanceRail.tsx`):
- 화살표 (▼/▶) 아이콘 폐기.
- `[data-testid=pcon-step-{path}-accordion-toggle-label]` 신설:
  - expanded=true → `"접기"` (text-text-tertiary).
  - expanded=false → `"펼치기"` (font-semibold text-accent).
- 구 화면 관례 정합.

## T-6 · 접힘 카드 디자인 개정

**Fix** (`PconAttendanceRail.tsx`):
```tsx
const cardCls = !expanded
  ? 'border-transparent bg-surface-tertiary'  // T-6 접힘 = 회색·테두리 X.
  : st === 'FAILED' ? 'border-error bg-error-light/30'
  : st === 'IN_PROGRESS' ? 'border-accent bg-surface'  // T-6 실행 중 = 파란 강조.
  : st === 'DONE' ? 'border-success bg-success-light/20'
  : gated ? 'border-border bg-surface opacity-60'
  : 'border-border bg-surface';
```
- `data-collapsed` 속성으로 접힘 여부 노출.
- 파란 border = 실행 중 전용 (Kyu 정본).
- STEP 타이틀 볼드 (기존 유지) · 우측 [펼치기] 텍스트 (T-5) · 요약 한 줄 (기존).

## 자동 테스트 (T-4~T-6)

**신설 3 assert** (`PconAttendanceImportView.smoke.test.tsx`):
- T-5: 아코디언 토글 라벨 = "펼치기" 또는 "접기" · 화살표 미포함 (▼/▶ 부재).
- T-6: 접힘 카드 `data-collapsed=true` + className 에 `border-transparent`, `bg-surface-tertiary` 포함.
- T-4: 초기 mount 시 `data-status=READY` · `data-physical-status=READY` (재생 미완인데 DONE 표기 X).

**Vitest 총합**: 344 pass (기존 341 → 신설 3).

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **344 pass** · 17 skip.
- **Jest (pcon-adapter)**: 15 pass.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.

## 조사 (T-1/T-2/T-3)

**별도 파일 게시**: `relay/t0/T0-0807-T-inventory.md`.

포함:
- T-1 구 화면 지각/야근 판정·예외처리 전수 인벤토리 (파일:줄 근거).
- T-2 신 엔진 배선 설계안 (판정 마이너 위치 vs 정리 내 병합 · pcon_override 소비 · shift_baseline·Work Rotation DB 실측).
- T-3 파리티 자동 테스트 계획 (판정 unit · 오버라이드 반영 unit · smoke).
- Kyu 질문 절 (self-contained · 결정 회부).

## 이연 순증감

**본 라운드 (T0-0807-T) 순증**:
- **Frontend 편입 2개**:
  - `PconAttendanceContext.tsx` (displayStatusOf 신설 · ctx export).
  - `PconAttendanceRail.tsx` (표시 status 소비 · cardCls 재작성 · 토글 텍스트).
- **Frontend 테스트 편입**: `__tests__/PconAttendanceImportView.smoke.test.tsx` (T-4/T-5/T-6 smoke 3 assert).
- **문서**: `pcon-engine-v1.md` §14 (상태 전이) + §6.구현-T · `requirements-tracking.md` §3-P (4 REQ 편입).
- **리포트**: relay `t0/T0-0807-T-report.md` (본 파일) + `t0/T0-0807-T-inventory.md` (조사 별도).
- **relay 순감**: `t0/T0-0807-R-report.md` 삭제.

**본 라운드 순감**:
- Frontend: Rail 카드 하드코딩 border 로직 (physical status only) → cardCls 헬퍼로 교체 (표시 status 기반).

**이연 (T 결정 대기)**:
- T-1/T-2/T-3 인벤토리 결정 후 U 라운드에서 판정 마이너 구현.

**이연 (G+6+)**:
- 지각/야근 실 계산 (shift_baseline · Work Rotation 배선 · pcon_override 실 소비).
- flag 제거 · 구 pos-import 삭제.

## [요약]

- **T-4 완료**: `displayStatusOf` 엔진 헬퍼 · Rail 카드/브레드크럼 소비 · §14 신설.
- **T-5 완료**: 화살표 폐기 → "펼치기 / 접기" 텍스트.
- **T-6 완료**: 접힘 = `border-transparent bg-surface-tertiary` · 파란 border = 실행 중 전용 · `data-collapsed`.
- **T-1/T-2/T-3 조사**: relay inventory 별도 파일 게시 · 구현 금지 · Kyu 결정 게이트.
- **회귀**: TS 0 · Vitest 344 pass · Jest 15 pass · Lint 0 · lint:hooks 0.
- **커밋**: T0-0807-T (본 커밋 SHA).
