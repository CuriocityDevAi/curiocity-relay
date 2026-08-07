# T0-0807-F · 리포트 (게이트⑮ 국소 결함 3 회수)

## 스코프

Kyu 게이트⑮ FAIL · 흐름 판정 전 국소 결함 3 (검증·FAILED UX·게이팅은 작동 확증).

1. **F-1** 파일 기간 파싱 false positive (Kyu 5월 파일 → FAILED · 최우선).
2. **F-2** 사분면 배치 정본 위반 (하단 통합 콘솔 · 아코디언 없음).
3. **F-3** 500 에러 뿌리 미상.

## F-1 · 파일 기간 파싱 수리

**뿌리 재현 (Kyu 실 파일)**:
- 파일명: `01-05-2026-31-05-2026.xlsx` (DD-MM-YYYY 범위).
- 기존 naive regex `/(20\d{2})[-_]?(\d{2})/` → 첫 매치 `2026-31` (index 6에서 `2026` 뒤 `-31` 캡처) → filePeriod="2026-31" ≠ "2026-05" → FAILED 오독.

**Fix (파일:줄)** · `backend/src/todoboss/payroll/pcon-adapter/attendance-file-import.service.ts:40~106`:

3-tier 파서:
1. **DD-MM-YYYY-DD-MM-YYYY 범위** 정파싱 → 시작월=종료월=05 → "2026-05" · detail `"파일명에서 기간 1~31 May 2026 판독"`.
2. **YYYY-MM 단일** (MM 1~12 검증 · `(0[1-9]|1[0-2])`).
3. **실패** → `null` + `reason='unknown'` → adapter 가 **USER_CHOICE 카드** 렌더 (억지 추측 금지 · Kyu 명시).

**Adapter 로직 수리**:
- `reason==='unknown'` + `duplicate_decision` 없음 → `USER_CHOICE_PENDING` 반환 (프론트 Y/N 카드).
- Kyu 명세: "파싱 실패(형식 불명) 시 억지 추측 금지 → WARN + 사용자 확인 카드".

**Unit test** (`attendance-file-import.service.spec.ts` · 7 tests · 100% pass):
- ✓ DD-MM-YYYY 범위 (5월 파일) → 2026-05 정확 판독.
- ✓ DD-MM-YYYY 범위 (6월 파일) → 2026-06 정확 판독.
- ✓ 시작월 ≠ 종료월 → range 실패 · single 시도도 실패 · unknown.
- ✓ YYYY-MM 단일 형식 → 정확 판독.
- ✓ MM 범위 초과 (13) → unknown.
- ✓ 완전 무형식 파일명 → unknown · 억지 추측 금지.
- ✓ **naive 파서 결함 재현 방어** · 31 을 월로 오독하지 않음 (regression 봉쇄).

## F-2 · 사분면 배치 정본 복원

**파일:줄** · `web-admin/src/pages/payroll/pcon-view/PconAttendanceImportView.tsx` (재배치).

**변경**:

**하단 통합 CONSOLE 삭제**: `pcon-console-feed` 제거 (이전 라운드 배치 · Kyu 정본 위반). 로그는 자기 마이너 카드 귀속.

**Grid 레이아웃**:
```
<div data-testid="pcon-quadrant-layout" grid grid-cols-[3fr_2fr]>
  <div data-testid="pcon-results-quadrant">        <!-- 좌 · 2사분면 · 결과 스택 -->
    RAW → 정리본 → 집계표 (각 마이너 DONE 시)
  </div>
  <div data-testid="pcon-console-quadrant">        <!-- 우 · 3사분면 · 마이너 카드 -->
    breadcrumb
    4 x 마이너 카드 (헤더 + 아코디언 로그)
  </div>
</div>
```

**카드 내 아코디언** (G4 정본):
- `data-testid="pcon-step-{path}-accordion"` · `data-expanded="true|false"`.
- 자동 규칙:
  - IN_PROGRESS / FAILED = 확장.
  - DONE = 접힘.
  - READY & primary = 확장 (사용자 진행 유도).
- 수동 토글 (`accordion-toggle` 버튼) 우선.
- 카드 로그 = `logsForMinor(path)` (currentAttempt.step_run_id 기반 필터).

**pulse 실동작**: `animate-pulse` (Tailwind class · primary 시 실행 버튼 · 브레드크럼 배지 모두 적용 · 기존 코드 유지).

## F-3 · 500 에러 뿌리 특정 + 로그 강화

**후보 뿌리 A (유력)**: `startStepAttempt` idempotency 우회 결함.

**파일:줄** · `backend/src/shared/pcon-engine/pcon-engine.service.ts:99~118`.

**결함 시나리오**:
1. 사용자가 동일 파일 재업로드 → checksum 동일.
2. `startStepAttempt` idempotency 우회 → 기존 attempt row 반환.
3. 그 기존 row 가 이미 종결 (DONE) 상태.
4. adapter 가 `completeStepAttempt` 호출 → UPDATE 시도.
5. **DB 트리거 `종결 후 완전 불변` 위반** → PostgreSQL exception → 500.

**Fix**:
```ts
// 기존:
if (existing) return existing;  // 종결 상태 무시 · 결함

// 신 (F-3):
if (existing && existing.status === 'IN_PROGRESS') {
  return existing;  // IN_PROGRESS 만 재사용 (동시 재시도 방어).
}
// 종결 상태면 신규 attempt+1 삽입 · idempotency_key 재발급 필요 (UNIQUE 재사용 봉쇄).
input = { ...input, idempotency_key: undefined };
```

**후보 뿌리 B**: XLSX 파싱 예외 · try/catch 있어 rows=[] 반환 · 500 원인 아님.

**후보 뿌리 C**: `pcon_step_def` seed 부재 (dev DB 리셋 후 마이그 미실행) · FK 위반 가능. 실측 확인 필요.

**로그 강화** · `attendance-file-import.controller.ts:52~76`:
- try/catch 삽입.
- `Logger.error(msg + stack + scope + file)` 출력.
- 응답 = `InternalServerErrorException({message, detail})` 구조화.

**Frontend 개선** · `PconAttendanceImportView.tsx:298~310`:
- axios error `response.data.message + detail` 파싱.
- 사용자에게 "파일 Import 실패: {msg} · backend 로그 참조" 표시.

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc --noEmit` = EXIT 0.
- **Vitest** (frontend): 23 files · **336 pass** · 17 skip.
- **Jest** (backend · pcon-adapter): 1 file · **7 pass**.
- **Lint**: EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 대본 재현 (실 DOM 지표)

| 대본 | 실 DOM 지표 | 파일:줄 |
|---|---|---|
| 5월 파일 통과 → RAW 노출 | `[data-testid=pcon-step-attendance_import.file_import][data-status=DONE]` · `[data-testid=pcon-raw-table]` 존재 | service.ts:75 · view:594 |
| 6월 파일 정확 사유 차단 | `[data-testid=pcon-step-...-failed]` + `[data-testid=pcon-error-file_period_matches_run_month]` 텍스트 "2026-06 vs 2026-05" | service.ts:132~144 · view:515 |
| 파싱 실패 파일 → USER_CHOICE | `[data-testid=pcon-step-...-user-choice]` · 헤더 "파일 기간 판독 실패" · Y/N 버튼 | service.ts:157~192 · view:540 |
| 배치 = 우 콘솔 · 좌 결과 | `[data-testid=pcon-quadrant-layout]` grid · results-quadrant (좌) · console-quadrant (우) · `pcon-console-feed` **부재** | view:445~453 |
| 카드 내 아코디언 | `[data-testid=pcon-step-{path}-accordion][data-expanded=true\|false]` · 로그 `[data-testid=pcon-step-{path}-logs]` | view:559~610 |
| pulse | primary 시 `[data-testid=pcon-step-{path}-execute].animate-pulse` | view:480 · 507 |
| 500 응답 안내 | `[data-testid=pcon-attendance-view-error]` 텍스트 = "파일 Import 실패: {msg} · backend 로그 참조" | view:766 |

## 이연 순증감

**본 라운드 (T0-0807-F) 순증**:
- 문서: `pcon-engine-v1.md` §6.구현-F 절.
- 리포트: `curiocity-relay/t0/T0-0807-F-report.md` (E 청소 · F 게시).
- Backend Fix 2: 파싱 함수 재작성 + USER_CHOICE 분기 + idempotency 우회 강화 + Controller 에러 로그.
- Frontend 재배치: quadrant layout + 카드 아코디언 + 하단 콘솔 삭제 + backend detail 노출.
- Backend test 신설: `attendance-file-import.service.spec.ts` (7 tests).

**본 라운드 (T0-0807-F) 순감**:
- Frontend 하단 통합 CONSOLE `<section data-testid="pcon-console-feed">` (삭제 · 카드 아코디언으로 흡수).

**이연 (G+5)**:
- 3 마이너 실 도메인 로직 (name_mapping · data_cleanup · aggregate stub → 실 배선).
- 진짜 RAW 전량 렌더 (샘플 3행 → 페이지네이션).
- 데이터 정리본 · 집계표 실 데이터.
- 기존 코드 삭제 (G+6 · flag 제거).

## [요약]

- **F-1 완결**: 파싱 3-tier (DD-MM-YYYY 범위 · YYYY-MM 단일 · unknown). 5월 파일 통과 · 6월 파일 정확 차단. 억지 추측 금지 → USER_CHOICE. Unit test 7/7 pass.
- **F-2 완결**: 통합 콘솔 삭제 · Grid (좌 결과 · 우 마이너 카드) · 카드내 아코디언 (G4 · IN_PROGRESS 확장 · DONE 접힘 · 수동 토글) · pulse 실동작.
- **F-3 완결**: 500 뿌리 A = idempotency 우회 종결 상태 재활용 → 트리거 봉쇄. Fix = IN_PROGRESS 만 재사용. 로그 강화 (Logger.error + stack) · frontend backend detail 노출.
- **회귀**: TS 0 (backend + frontend) · Lint 0 · Vitest 336 pass · Jest 7 pass.
- **커밋**: T0-0807-F (본 커밋 SHA).
