# T0-0807-Q · 인벤토리 · Kyu 결정용 체크리스트 (구현 금지 · 조사 only)

> **Kyu O+P 통합 실기 판정 (08-10)**: 구 화면 = 엔진 결함 · 부가기능 풍부 / 신 화면 = 엔진 완성 · 부가기능 빈곤. 이번 라운드 = **조사·인벤토리 only** · 구현 금지 · Kyu 최종 결정 게이트.
>
> **심사 소스 3**: ① 구 화면 소스 전수 (payroll/PayrollRunPage.tsx · 관련 컴포넌트) ② 요구사항 문서 (docs/epics/·docs/requirements-tracking.md·docs/design/) ③ 신 화면 현행 (pcon-view/*).
>
> **원칙**: "기록됨 ≠ 반영됨" (requirements-tracking.md:186).

---

## §Q-1 · Kyu 지목 회귀 6 (근거 · 뿌리 · 이식안)

### ① 로그→결과 싱크 잔존 (O-1 게이트 불완전)

**Kyu 관찰**: 로그 재생 중 결과 테이블이 잠깐 나왔다 사라지고 재생 끝나면 재표시 (총 2회).

**근거 파일:줄**:
- `web-admin/src/pages/payroll/pcon-view/PconAttendanceContext.tsx:449~475` (`isMinorRevealComplete` · O-1 fix).
- `PconAttendanceContext.tsx:270` (`setLogsFetchedForRun(runId)` · 첫 poll 성공 시 세팅).
- `PconAttendanceLeft.tsx:doneAndRevealed(path)` (섹션 render 게이트).

**뿌리 실측 (추정)**:
- O-1 fix 는 "run 첫 poll 완료 전 차단". 하지만 **`revealedByStepRun[srid]` 이 최초에 0** 이라도 `logsFetchedForRun === runId` 세팅 후 → `all.length === 0` (아직 log 응답 미도착) → `return true` 조건 발화 → 결과 노출.
- 후속 log 도착 (`setLogs` 반영) → `all.length > 0`, `revealed = 0` → `revealed >= all.length` false → 사라짐.
- Pacer 순차 노출 → 마지막 line revealed → true → 재등장.
- **재현 조건**: 실행 → API 응답 (state) 도착 → poll tick 1회 성공 (log 아직 0) → 결과 카드 1회 노출 → poll tick 2회 log 도착 → 결과 사라짐 → Pacer 완료 → 재등장.

**이식안**:
- `isMinorRevealComplete` 강화 조건 추가: `logsFetchedForRun === runId && (log tick 2회 이상 성공 OR attempt.ended_at 이후 500ms 경과)` — attempt 종결 후 poll tick 이 log 를 잡을 시간 부여.
- 대안: attempt 종결 시각 (ended_at) 을 시간 하한으로 사용 — `now - attempt.ended_at > 800ms` 만 완료 판정 허용.
- 대안 (간결): `pollCountRef.current >= 2` 조건 추가.
- **자동 테스트 병기 (Q-4)**: mount smoke — attempt DONE 상태로 loadState 도착 후 log poll 아직 0 인 시점에서 `[data-testid=pcon-result-*]` 미노출 확인 (500ms 대기 후 확인).

---

### ② 시각 변환 회귀 (중대 · WIB → GMT+0 왜곡)

**Kyu 관찰**: 구 화면은 엑셀 시각 그대로 (예 08:15:00 WIB) · 신 화면은 GMT+0 변환 (08:15 → 01:15 등 왜곡) → 출퇴근 시각·날짜 왜곡.

**근거 파일:줄 (구 화면 · 관례 정본)**:
- `backend/src/todoboss/payroll/pos-import/pos-import.service.ts:82~93` (**Kyu 정본 주석**): "WIB 저장 관행 = 저장된 값의 UTC 필드가 실 WIB 시각. `getUTCHours()` 로 얻는 값 = WIB 시각".
- 그러나 line 91 재판정: **"실제 저장은 UTC 이므로 +7 offset 필요"** → `WIB_OFFSET_HOURS = 7`.
- `pos-import.service.ts:97~104` `toWibParts()`: `(getUTCHours + WIB_OFFSET_HOURS) % 24`.
- `pos-import.service.ts:113~116` `toWibHmsString()`: getUTCHours+7 → padStart HH:MM:SS.
- `pos-import.service.ts:119~123` `toWibDateStr()`: `d.getTime() + 7h`, `.toISOString().slice(0,10)`.
- `pos-import/parser/pos-xlsx.parser.ts:65~85` `parseTime()`: `new Date(\`${dateStr}T${timeStr}\`)` — **서버 로컬 (UTC 서버) 해석**. Kyu 주석: "저장이 UTC 라벨 아래 WIB 값" (즉 파싱된 Date 는 실제로 WIB 값을 UTC 라벨로 저장).

**근거 파일:줄 (신 화면 · 오류 코드)**:
- `web-admin/src/pages/payroll/pcon-view/PconAttendanceLeft.tsx:74~85` `formatIsoHms(iso)`: `new Date(iso).getUTCHours()` 만 사용 → **+7 offset 미적용**.
- `PconAttendanceLeft.tsx:88~95` `formatWorkDuration()`: 두 iso Date 차 (min 계산 · duration 은 OK).
- `PconCalendarModal.tsx:32~42` `formatHm()`: 동일하게 `getUTCHours()` 만.
- `backend/src/todoboss/payroll/pcon-adapter/attendance-minors.service.ts:82~90` `pairSessionsFromRawRows()` → `parseTime(dateStr, checkInRaw)` → 반환 Date 를 `.toISOString()` 로 저장 (`sessions[].check_in`).

**뿌리**:
- pos-import 관례: **엑셀 시각 (WIB) → 파싱된 Date 는 서버 로컬 UTC 로 저장 → `getUTCHours()` 로 읽어야 WIB 값**.
  - 예: 엑셀 08:15:00 → parseTime → `Date(2026-05-01T08:15:00 서버 로컬)` → UTC 저장 = 다르지만 관례상 "UTC 필드 = WIB 값" 취급.
- 구 화면 (pos-import.service:82~104): 초기 관례 = `getUTCHours()` 만 → Kyu 실측에서 -7 오류 발견 → 재판정 후 `+ WIB_OFFSET_HOURS` 추가.
- 신 화면 (pcon-adapter): `pairSessionsFromRawRows` 는 파싱된 Date 를 `.toISOString()` 로 JSON 저장 → 프론트에서 `getUTCHours()` (구 관례) 로 읽는데 **+7 offset 미적용** → WIB 값이 그대로 나와야 하는데 GMT+0 처럼 -7 오독.

**핵심 판단**:
- 구 화면 `WIB_OFFSET_HOURS = 7` (`getUTCHours + 7`) 은 **파싱 방향** (parseTime 이 서버 UTC 해석 → UTC 저장 · +7 로 WIB 복원) 을 전제로 함.
- 신 화면 parseTime 은 동일 함수 사용 · Date → `.toISOString()` 는 UTC 로 직렬화. 프론트 `new Date(iso).getUTCHours()` = 서버 UTC 시각 재현. **구 관례대로면 +7 offset 필요**.
- **또는** 정본을 "엑셀 시각 무변환" 으로 재정의 → parseTime 자체를 offset 없이 (WIB 라벨 그대로) 사용.

**이식안 (Kyu 정본 조항 신설 제안)**:

**A안 (offset 정정 · 최소 변경)**:
- `formatIsoHms` · `formatHm` (프론트) 에 `+ 7h` offset 추가 (`getUTCHours() + 7`) → 구 화면 `toWibHmsString` 관례와 정합.
- 근무시간 계산은 무영향 (diff 는 offset 무관).

**B안 (엔진 정본 조항 · Kyu 지시 정본)**:
> **정본 §12 (신설)**: "엑셀 시각 무변환 · WIB 원문 그대로 저장·표시. UTC 변환·offset 조작 금지 (파싱된 값의 UTC 필드 = 원본 WIB 시각 · 표시도 UTC 필드 그대로)."
- `parseTime` 반환 Date 저장 시 `.toISOString()` 대신 `date+"T"+time` 문자열 그대로 저장 (예: `"2026-05-01T08:15:00"` · Z 없음).
- 프론트 `formatHm` = 문자열 slice (`iso.slice(11, 16)`) 사용.
- 시각 조작 없음 → 왜곡 원천 봉쇄.

**추천**: B안 (더 명료 · Kyu 정본 조항 신설과 정합).

**고정 unit 테스트 제안**:
- `pcon-adapter/attendance-minors.pairing.spec.ts` 신설:
  - `parseTime` 로 파싱된 세션의 `check_in` 이 엑셀 원문 `"08:15:00"` 을 정확히 담고 있는지 assert (문자열 매치).
  - `formatHm(session.check_in)` = `"08:15"` (엑셀 원문 · 무변환).
- `PconCalendarModal.spec.tsx` (mount smoke):
  - 세션 `{check_in: "2026-05-01T08:15:00"}` → 셀 렌더 → `"08:15"` 표시 (WIB 무변환).
- 회귀 방지: 특정 GMT+9 서버·GMT+0 서버 어디서 실행해도 결과 동일.

---

### ③ RAW/세션 원본 = 급여 반영대상 · 상세내역 사유 · 하이퍼링크

**Kyu 관찰**: 구 화면의 "급여 반영대상" 컬럼 + 상세내역 사유 + 하이퍼링크 (Scheduling · Users 딥링크) → 신 화면 누락.

**근거 파일:줄 (구 화면)**:
- `web-admin/src/pages/payroll/PayrollRunPage.tsx:3613~3628` 급여반영대상 셀 (`payroll-run-attendance-raw-payroll-scope-{i}`):
  - 대상 = `대상` 텍스트.
  - Excluded = `비포함(Excluded)` 라벨 + `title={excludedReason}` (사유 툴팁).
- `PayrollRunPage.tsx:3629~3679` 상세내역 셀 (`title={renderSessionStatusTooltip}`):
  - `late` = `bg-warning-light` 라벨 + `renderSessionStatusLabel(s, status)` (예: "지각 3h 55m · 08:00 baseline+10 grace").
  - `ot` = `bg-error-light` 라벨.
  - `unknown` = `기준 없음` 라벨 + **"Workforce > Scheduling 편성 →"** 하이퍼링크 (`schedulingHref`).
  - Excluded reason + **"Users > 급여 설정에서 등록 →"** 하이퍼링크 (`/users?id={user_id}`).
  - `editedSessionIds.has(s.id)` → `✎ 수정됨` 배지 → 클릭 시 `AttendanceHistoryModal` 오픈.
  - `overriddenSessionIds.has(s.id)` → `⚠ 오버라이드` 배지.
- `PayrollRunPage.tsx:3453~3462` 헤더 소스 정보 + `payroll-run-name-match-open` 버튼 → `NameMatchDialog` 오픈.

**근거 파일:줄 (신 화면 부분 이식)**:
- `PconAttendanceLeft.tsx:855~875` 급여반영대상 셀 (P-1 에서 이식 · Excluded 라벨 + title tooltip).
- **누락**:
  - 상세내역 "기준 없음" + Scheduling 하이퍼링크.
  - 상세내역 지각/야근 라벨 (미배선 · shift_baseline 없음 · G+6+).
  - "Users 등록" 하이퍼링크.
  - AttendanceHistoryModal 진입 (session id 없음 · pcon-adapter 는 stepRun/rowEdit 이력만).
  - 오버라이드 배지 (pcon 은 편집만 · override 개념 없음).

**뿌리**:
- 신 화면은 데이터 모델 상 session id · shift_baseline · override 개념 없음 → 완전 이식 불가.
- 상세내역 라벨 (기준 없음 · Scheduling 링크) 은 shift_baseline 배선 (G+6+) 후 가능.
- Users 등록 하이퍼링크는 즉시 이식 가능 (미매핑 = pos_name 확실 · Users 페이지 진입).

**이식안**:
- **즉시 이식**: 상세내역 셀에 Users 하이퍼링크 (`<a href="/users?search={pos_name}">Users → 급여 설정에서 등록 →</a>`).
- **G+6+ 이연**: shift_baseline 배선 후 지각/야근/기준 없음 라벨 · Scheduling 하이퍼링크.
- **재검토 필요 (Kyu 질문)**: 오버라이드 배지 (pcon 은 append-only 편집만 · override 개념 재도입 여부).

**자동 테스트 병기**:
- `PconAttendanceLeft.spec.tsx` mount smoke: 미매핑 세션 row → `<a href^="/users"]` 존재 확인.

---

### ④ 마이너 상태 4종 (READY/IN_PROGRESS/DONE/FAILED) 색상·표기

**Kyu 관찰**: 구 콘솔 v2 상태 표기 (색·아이콘 뚜렷) vs 신 콘솔 미흡.

**근거 파일:줄 (구 화면 · 정본)**:
- `web-admin/src/pages/payroll/console-v2/PacedConsole.tsx:456~461` `STATUS_BADGE`:
  ```ts
  READY:       { cls: 'bg-surface-tertiary text-text-tertiary', icon: '○' },
  'IN PROGRESS':{ cls: 'bg-accent-light text-accent',           icon: '▶' },
  DONE:        { cls: 'bg-success-light text-success',          icon: '✓' },
  FAILED:      { cls: 'bg-error-light text-error',              icon: '✕' },
  ```
- `PacedConsole.tsx:319~325` 배지 렌더: `${badge.icon} ${status}` + cls.

**근거 파일:줄 (신 화면 · 부분 표기)**:
- `PconAttendanceRail.tsx:250~270` (신 카드):
  - `data-status={st}` · 카드 border: FAILED = `border-error`, DONE = `border-success`, gated = `opacity-60`, else = `border-border`.
  - Status badge `[data-testid=pcon-step-{path}-status-badge]` = 단순 텍스트 (`{st}` uppercase) · **아이콘 없음** · **cls 는 bg-surface-tertiary 단일 색**.
- 상태별 색·아이콘 완전 일관성 없음 · 배지 색이 항상 gray.

**뿌리**:
- 신 콘솔 배지 = 정보만 표시 (data-status attr) · **시각적 대비 결여**.
- 아이콘 (○ ▶ ✓ ✕) 미사용.

**이식안**:
- `PconAttendanceRail.tsx` 배지 STATUS_BADGE 헬퍼 함수 신설 (구 `PacedConsole.STATUS_BADGE` 이식 · 도메인 중립).
- READY / IN_PROGRESS / DONE / FAILED / ABANDONED / STALE 각각 아이콘 + cls 지정.
- 배지 렌더: `<span className={badge.cls}>{badge.icon} {st}</span>`.

**자동 테스트 병기**:
- `PconAttendanceRail.spec.tsx`: 각 status 별 render → `data-testid=pcon-step-{path}-status-badge` innerText 에 `○|▶|✓|✕` 아이콘 포함 assert.

---

### ⑤ AI-감 퇴행 = 대기/뿌리 속도/리듬 장치 전수

**Kyu 관찰**: 구 화면의 "..." 연출 · 데이터 뿌리는 속도 · 리듬 장치 → 신 화면 대비 빈곤.

**근거 파일:줄 (구 화면 · 리듬 장치 전수)**:
| 장치 | 파일:줄 |
|---|---|
| `Pacer.ThinkingDots` (●●● 애니메이션) | `console-v2/pacer.ts` (docs/design/ai-work-ui-skeleton.md:164) |
| `Pacer.StreamingText` (타이핑 애니) | `console-v2/pacer.ts` |
| `GradientRevealLine` (왼→오 clip/gradient) | `console-v2/pacer.ts` |
| `pacerRevealSlide` keyframe | `web-admin/src/index.css:151` |
| `pacerShimmer` (IN_PROGRESS caret + shimmer) | `console-v2/pacer.ts` |
| `pacedActionPulse` (버튼 attraction) | `index.css:181~199` |
| `paced-card-collapsible` (숨쉬는 카드 · grid-template-rows) | `index.css:156~169` |
| `pacedTableSkeleton` (스켈레톤 pulse) | `index.css:209~215` |
| `pacedTableRowFade` (행 fade-in stagger) | `index.css:218~230` |
| `pacedTableEmphasize` (합계 반짝) | `index.css:233~239` |
| `usePacedReveal` (청크 순차 노출) | `console-v2/pacer.ts` (docs:163) |
| `useFollowScroll` (자동 스크롤) | `console-v2/PacedConsole.tsx:311` |

**근거 파일:줄 (신 화면 · 부분 이식)**:
- `PconAttendanceContext.tsx:387~410` Pacer (600ms/줄 · O-2b).
- `index.css:pconFadeIn` · `pconLogLine` (T0-0807-K 신설 · fade in).
- **누락**:
  - ThinkingDots · StreamingText · GradientRevealLine (구 캐럿·shimmer).
  - `paced-action-pulse` (재작업 버튼에만 O-N 에서 부분 사용).
  - `paced-table-skeleton` (테이블 스켈레톤 pulse · Pacer M-1 로 대체됐지만 시각 결여).
  - `paced-table-row-fade` (신 정리본/집계 테이블 이식 시 stagger delay 60ms · P 라운드에서 이식됨).
  - `paced-table-emphasize` (합계 반짝).
  - `useFollowScroll`.

**뿌리**: 신 엔진 정본 = "3사분면 로그 재생" (Pacer 로그 라인만) · 구 화면 = 콘솔 + 테이블 + 카드 3중 리듬. 신은 카드 자체를 정본으로 승격 (표는 즉시 렌더 · Pacer 는 로그만).

**이식안**:
- **캐럿 + shimmer**: IN_PROGRESS 상태 카드에 마지막 log line 뒤 caret ▍ + `pacerShimmer` 애니메이션 (`PconAttendanceRail.tsx`).
- **paced-table-row-fade**: 이미 P 라운드 이식 (정리본 · 집계 stagger).
- **paced-action-pulse**: 이미 O-4 이식 (재작업 버튼).
- **paced-table-skeleton**: 실행 중 (`running === path`) 결과 테이블 자리에 스켈레톤 pulse 표시 (Pacer 진행 중 = skeleton · 완료 = fade-in).
- **useFollowScroll**: 카드 안 log ol 에 적용 (신 log 도착 시 자동 스크롤).
- **GradientRevealLine**: 신 log line 렌더 시 왼→오 clip 마스크 (기존 `animate-pcon-log-line` 을 GradientReveal 로 교체).

**자동 테스트 병기**:
- 시각 테스트는 자동화 어렵. mount smoke 로 CSS class 존재만 assert (`querySelector('.pacerShimmer')`).

---

### ⑥ 집계 = 지각일수·야근시간·특이사항·계획·차이 컬럼 누락

**Kyu 관찰**: 신 집계표에 컬럼은 있지만 데이터 "-" fallback (미배선).

**근거 파일:줄 (구 화면)**:
- `PayrollRunPage.tsx:2969~2999` 헤더 정의 (년/월/이름/근무일수/**지각일수/야근시간/특이사항/계획/차이**/반영·제외).
- `PayrollRunPage.tsx:3040~3070` 계산 소스: `row.late_days` · `row.ot_minutes` · `planByUserId?.get(row.user_id)` (Work Rotation 편성).
- Backend `pos-import.service.ts:1381~1391` per_user_rows 필드: `late_days` · `ot_minutes` · `late_minutes`.
- `pos-import.service.ts:1250~1290` shift_baseline · OT_GRACE_MINUTES · SHIFT_TIMES 로직.

**근거 파일:줄 (신 화면 · 이식 상태)**:
- `PconAttendanceLeft.tsx:aggregate table` 컬럼 라벨 이식 · 값 = "-" fallback.
- `attendance-minors.service.ts:executeAggregate` per_user_rows: `work_days · session_count · total_minutes` 만 계산 · **`late_days · ot_minutes · plan · diff` 미배선**.

**뿌리**:
- shift_baseline · Work Rotation (편성) 연결 미배선.
- 신 엔진은 아직 "출퇴근 병합 · 세션 집계" 만 · OT/Late 판정은 다음 파이프라인 (G+6+).

**이식안**:
- **백엔드**:
  - `pcon-adapter/attendance-minors.service.ts` `executeAggregate` 에 shift_baseline 배선.
  - `SHIFT_TIMES` · `OT_GRACE_MINUTES` 상수 이식 (pos-import.service:150~160).
  - Work Rotation 편성 조회 (기존 backend 재사용 or 신 pcon 마이너 추가).
- **프론트**: 이미 컬럼 자리 확보 (P 라운드) · anomalies.per_user_rows 확장 시 자동 렌더.

**우선순위**: **G+6+ (Kyu 스코프 밖 이연 항목)**.

**자동 테스트 병기**:
- `attendance-minors.aggregate.spec.ts` (backend): sessions 입력 → per_user_rows 에 late_days > 0 · ot_minutes > 0 assert (shift_baseline 있을 때).

---

## §Q-2 · 요구사항 문서 대조 (사유 → 이력 조회 사상)

### 정본 소스

- `docs/design/run-ui.md:33` 정본: **"이중 장부 = 확정본 (숫자 + 사유) + audit trail (전 이력)"**.
- `docs/design/run-ui.md:19~20`: "예외 결재 = 시스템 제안 위에 사람 결정 셀 존재 (**사유 필수**)".
- `docs/design/kyu-ux-principles.md P4·P5·P6`: 사유 필수 · audit trail · 감사 표시.
- `docs/requirements-tracking.md:87` REQ-P1-FN-4 "이중 장부 (스냅샷 + audit trail append-only)".
- `docs/epics/df-deferred-audit-AC-round.md`: attendance-edit `emit` 훅 · `AttendanceHistoryModal`.

### 신 화면 심사

**사유 = 받음 ✓**:
- `PconRowEditModal.tsx` reason 필수 (trim 검증 · save 게이트).
- `PconAttendanceContext.tsx` resetRun reason (기본 "사용자 강제 초기화").

**이력 조회 표면 = 부재 △**:
- `pcon_row_edit` 은 DB append 되지만 UI 는 **hover 툴팁** 만 (편집된 셀·배지 hover title).
- 통합 이력 뷰 (누가/언제/무엇/왜) **없음**.
- 구 화면: `AttendanceHistoryModal.tsx` (audit_id 로 조회) · `AuditTrailView.tsx` (스냅샷 재작업 이력).
- 신 화면: run 전체의 감사 타임라인 (편집 + 재작업 + reset + IMPORT + minor 실행) 없음.

### [오케 제안] Run별 감사 이력 패널 (Kyu 판정 회부)

**설계안 요약**:
- 우측 Rail 하단 or 별도 탭 `[data-testid=pcon-audit-timeline]`.
- 데이터 소스: `pcon_step_run` (실행 이력) + `pcon_row_edit` (편집 이력) + `pcon_log` (rework/reset 로그).
- 통합 타임라인 (시각 asc 정렬):
  - `2026-08-10 15:23:00 · 사용자 #12 · IMPORT 실행 · file=attendance_01-05.xlsx`.
  - `15:24:00 · 사용자 #12 · name_mapping 실행 · matched=15, unmapped=2`.
  - `15:25:00 · 사용자 #12 · row 편집 (정리본:session:Aris:2026-05-03 · check_out: 17:30 → 17:45 · 사유: 오타 정정)`.
  - `15:26:00 · 사용자 #12 · aggregate 재작업 (편집 반영)`.
- 필터: 시각 범위 · actor · type (실행/편집/재작업/reset).
- 정렬: 시각 asc / desc 토글.
- 각 항목 클릭 → 관련 결과 카드로 스크롤 이동 + 강조.

**엔진 API 신설 필요**:
- Backend: `GET /api/admin/pcon/audit-timeline?run_id=...` → `{items: [{ts, actor, type, summary, ref}]}`.
- Service: `PconAuditService` — pcon_step_run + pcon_row_edit + pcon_log 를 join · type/ts 정규화.

**Kyu 질문 절 (필수 회부)**:
- Q-audit-1: 감사 이력 = **별도 탭** vs **Rail 하단 항상 노출** vs **모달 진입 (버튼 클릭)** — 어느 것?
- Q-audit-2: `pcon_log` 도 감사 타임라인에 포함? (로그는 이미 Rail 카드에 재생됨 · 중복 가능성.)
- Q-audit-3: **모든 수정 = 사유 입력** 원칙 확장 범위 — Reset도 사유 필수? IMPORT 도 사유? (현재 편집·재작업·reset 만 사유 필수)

### 요구사항 문서 · 신 화면 미반영 항목 인벤토리

| REQ ID | Kyu 원문 요약 | 출처 라운드/문서 | 신 화면 반영 여부 | 사유 |
|---|---|---|---|---|
| REQ-P1-AI-4 | 매장 (Outlet) 필터 | docs/epics/payroll.md §3-1 · req-tracking:62 | ✗ | UI 노출 없음 (backend 스코프만) |
| REQ-P1-AI-5 | 파일 헤더 기간 vs 요청월 불일치 경고 | req-tracking:63 | △ | file_import 에서 파일명 기간 검증 · 헤더 기간 (엑셀 메타) 미읽음 |
| REQ-P1-AI-7 | 미매핑 이름 처리 (자동 등록 금지 · 확인 필요 목록) | req-tracking:65 | ✓ | name_mapping unmapped_names + Users 링크 (Q-1 ③ 이식안 병기) |
| REQ-P1-OT-1 | Late 컬럼 · 결정 셀 편집 | req-tracking:72 | ✗ | G+6+ (OT/Late 마이너 미신설) |
| REQ-P1-OT-2 | OT 30분 그레이스 · HR 오버라이드 · 사유 필수 | req-tracking:73 | ✗ | G+6+ |
| REQ-P1-OT-6 | 결정 사유 필수 · 미기입 UI 차단 | req-tracking:77 | ✓ (편집만) | `PconRowEditModal` reason 필수 · OT 판정 조정은 미배선 (G+6+) |
| REQ-P1-FN-1 | 급여표 확정 = 버전 스냅샷 · 불변 | req-tracking:84 | ✗ | Finalize 마이너 미신설 (G+6+) |
| REQ-P1-FN-2 | 확정 사유 필수 | req-tracking:85 | ✗ | Finalize 미신설 |
| REQ-P1-FN-3 | 확정 = 잠금 · 재작업 액션으로만 해제 | req-tracking:86 | △ | 재작업 개념 이식 (row 편집 → 재작업 파생) · 확정 잠금 개념 없음 |
| REQ-P1-FN-4 | 이중 장부 (스냅샷 + audit trail append-only) | req-tracking:87 | △ | append-only 이행 (pcon_step_run · pcon_log · pcon_row_edit 모두 트리거 봉쇄) · **이력 조회 표면 부재** (Q-2 주제) |
| REQ-P1-PD-1~7 | Payslip Dispatch (PDF · WhatsApp · 이메일 · 체크리스트 · ZIP) | req-tracking:95~101 | ✗ | 전량 미착수 (G+6+ · P4/P5) |
| REQ-P1-SYS-1 | 4단계 상태 머신 UX (미시작→진행중→확정→재작업중) | req-tracking:107 | △ | pcon-engine status 4종 (READY/IN_PROGRESS/DONE/FAILED) + ABANDONED/STALE · 표기는 Q-1 ④ 이식안 |
| REQ-P1-SYS-2 | 결정 셀 3상태 (일반·제안·확정) | req-tracking:108 | ✗ | 결정 셀 개념 미도입 (OT/Late 결정) |
| REQ-P1-SYS-3 | 과정 레일 3요소 + 스포트라이트 | req-tracking:109 | △ | Rail 카드 primary highlight (deriveScreen is_primary) 존재 · 스포트라이트 정본 · 확장 필요 |

---

## §Q-3 · 전수 인벤토리 (구 Payroll 전 탭 · 매트릭스)

### Tab 1 · Attendance Import (Kyu 정본 · 신 화면 = pcon-view)

**정리본 (구 AttendanceRawTable)**:

| 기능 | 파일:줄 (구) | 신 반영 | 상태 | 우선순위 | 오케 권고 |
|---|---|---|---|---|---|
| # 순서 컬럼 | PayrollRunPage.tsx:3599 | PconAttendanceLeft.tsx | ✓ | | 유지 |
| 이름 컬럼 (user_name) | :3600~3602 | ✓ | ✓ | | 유지 |
| 날짜 컬럼 | :3603 | ✓ | ✓ | | 유지 |
| 출근/퇴근 (WIB · font-mono) | :3604~3609 | △ (**Q-1 ②** 시각 왜곡) | 회귀 | **최우선** | Q-1 ② 이식안 B (엔진 §12) 채택 |
| 근무시간 | :3610~3612 | ✓ | ✓ | | overlay 반영 (편집 후 재계산) |
| 급여반영대상 (Excluded 라벨 + tooltip) | :3613~3628 | ✓ (P) | ✓ | | 유지 |
| 상세내역 · 정상/지각/야근 라벨 | :3629~3663 | ✗ (shift_baseline 미배선) | 이연 | G+6+ | shift_baseline 배선 후 |
| 상세내역 · "기준 없음" + Scheduling 링크 | :3644~3660 | ✗ | 누락 | G+6+ | shift_baseline 배선 후 |
| 상세내역 · 비포함 사유 + Users 링크 | :3664~3679 | △ (사유 title만) | 부분 | **높음** | Q-1 ③ 이식안 (Users 링크 즉시 이식) |
| ✎ 수정됨 배지 → AttendanceHistoryModal | :3680~3691 | △ (hover title만) | 부분 | **높음** | Q-2 감사 이력 패널 채택 시 대체 |
| ⚠ 오버라이드 배지 | :3692~3699 | ✗ | 대체 | 재검토 | pcon append-only만 · **Kyu 질문**: override 개념 pcon 재도입? |
| 조치 컬럼 · [✎ 편집] 진입 | :3554 | ✓ (hover [✎]) | 대체 | | 유지 (Kyu 정본 · 고정 버튼 폐지) |
| 재작업 컬럼 · [revert] | :3555 | ✗ (마이너 수준) | 대체 | 재검토 | 세션 수준 revert vs 마이너 수준 [재작업] · **Kyu 질문** |
| 필터 (name/late/ot/anomaly) | :3377~3380 | ✓ (P) | ✓ | | late/ot = shift_baseline 배선 후 활성 |
| 필터 라벨 + 해제 | :3499~3515 | ✓ | ✓ | | 유지 |
| '비포함만 보기' 토글 | :3375, :3378~3380 | ✗ | 누락 | 낮음 | excluded_sessions 별도 박스 대체 · **Kyu 질문** 재도입? |
| 소스 정보 헤더 (파일명·N sessions·시각) | :3417~3462 | ✓ (P · 파일명 = 파싱본으로 대체) | 부분 | 중 | file_import 로그 params.file_name 소비 |
| 이름 매핑 확인 버튼 | :3451~3460 | ✗ (name_mapping 마이너 대체) | 대체 | | 유지 |
| usePacedReveal (skeleton → chunk) | :3389~3402 | △ (Pacer M-1 대체) | 부분 | 중 | Q-1 ⑤ paced-table-skeleton 이식 |

**집계표 (구 AttendanceAggregationTable)**:

| 기능 | 파일:줄 (구) | 신 반영 | 상태 | 우선순위 |
|---|---|---|---|---|
| 년·월 · 이름 · 근무일수 | :2969~2973 | ✓ (P) | ✓ | |
| 지각일수 · 야근시간 · 특이사항 · 계획 · 차이 | :2974~2986 | △ (컬럼만 · 값 "-") | 부분 | G+6+ (Q-1 ⑥) |
| 반영/제외 배지 | :2988 | ✓ (항상 "반영") | 부분 | Kyu 질문: excluded 를 배지로 회귀? |
| 이름 클릭 → 달력 팝업 | :3082~3100 | ✓ (P · PconCalendarModal) | ✓ | |
| 근무일수 클릭 → name 필터 | :3104~3118 | ✓ (P) | ✓ | |
| 지각/야근 셀 클릭 필터 | :3120~3151 | ✗ ("-" 이라 버튼 아님) | 이연 | G+6+ |
| 특이사항 클릭 → anomaly 필터 | :3154~3163 | ✗ | 대체 | excluded 박스 |
| 계획/차이 셀 tooltip + 부실 마커 | :3165~3242 | ✗ | 이연 | G+6+ (Work Rotation) |
| Skeleton pulse (usePacedReveal) | :3008~3037 | △ (Pacer M-1 대체) | 부분 | 중 |
| AggregateTotals (합계 1행 · 인원·근무·지각·야근·특이·제외) | :2802~2900 | ✓ (P · 지각/야근 "-") | 부분 | G+6+ |
| [초기화] 버튼 | (AggregateTotals) | ✗ | 대체 | Rail pcon-reset-run |

**AttendanceCalendarModal**:

| 기능 | 파일:줄 (구) | 신 반영 | 상태 |
|---|---|---|---|
| 월 그리드 · 요일 헤더 · padding | :2643~2660 | ✓ (P · PconCalendarModal) | ✓ |
| 헤더 요약 (근무·지각·야근) | :2670~2680 | △ (지각/야근 = 0) | 부분 |
| 셀 색상 (지각=노랑·야근=빨강) | :2698~2714 | ✗ (미배선) | 이연 |
| hover title (날짜·출근·퇴근·상태) | :2724~2730 | ✓ | ✓ |
| Dialog nonBlocking · draggable | :2662~2668 | ✓ | ✓ |

**콘솔 (구 ProcessConsolePanelV2 + PacedConsole)**:

| 기능 | 파일:줄 (구) | 신 반영 | 상태 | 우선순위 |
|---|---|---|---|---|
| STATUS_BADGE (READY/IN_PROGRESS/DONE/FAILED) 아이콘+cls | PacedConsole.tsx:456~461 | △ (아이콘 X · 단일 색) | 회귀 | **높음** (Q-1 ④) |
| Pacer ThinkingDots (●●●) | pacer.ts | ✗ | 누락 | 중 |
| Pacer StreamingText | pacer.ts | ✗ | 누락 | 낮음 |
| GradientRevealLine (왼→오 gradient) | pacer.ts | △ (fade-in 대체) | 부분 | 중 |
| pacerShimmer (IN_PROGRESS caret) | index.css:pacerRevealSlide + shimmer | ✗ | 누락 | 중 |
| paced-action-pulse | index.css:181 | ✓ (재작업 버튼만 · O-4) | 부분 | |
| paced-card-collapsible (grid transition) | index.css:156 | ✗ (즉시 접힘) | 부분 | 낮음 |
| paced-table-skeleton | index.css:209 | ✗ | 누락 | 중 |
| paced-table-row-fade (stagger delay) | index.css:218 | ✓ (P) | ✓ | |
| paced-table-emphasize (합계 반짝) | index.css:233 | ✗ | 누락 | 낮음 |
| useFollowScroll (자동 스크롤) | PacedConsole.tsx:311 | ✗ | 누락 | 중 |
| Step Registry (도메인 매핑) | console-v2/step-registry.ts | 대체 (pcon_step_def) | 대체 | |

### Tab 2 · OT/Late Adjust (전량 이연)

- **G+6+** (전 스코프 · pcon 아직 OT/Late 마이너 미신설).

### Tab 3 · Finalize

- **G+6+** (Finalize 마이너 미신설).

### Tab 4 · Payslip Dispatch

- **G+6+** (미착수 · REQ-P1-PD-1~7 전량).

### Kyu 질문 절 (별도)

- **Q-질문-1**: **시각 정본** — Q-1 ② A안 (offset 정정) vs B안 (§12 신설 · 무변환) · Kyu 판정 필요.
- **Q-질문-2**: **감사 이력 패널 배치** — 별도 탭 vs Rail 하단 vs 모달 (Q-audit-1).
- **Q-질문-3**: **모든 수정 사유** — Reset·IMPORT 도 사유 필수? 편집·재작업만? (Q-audit-3).
- **Q-질문-4**: **오버라이드 개념** — pcon 재도입 (session 수준) vs 편집만 (append-only 정합).
- **Q-질문-5**: **비포함만 보기 토글** — 재도입 vs 현재 excluded_sessions 박스 유지.
- **Q-질문-6**: **재작업 세분성** — 마이너 수준 [재작업] (현) vs 세션/user 수준 revert 추가.
- **Q-질문-7**: **STATUS_BADGE 아이콘** — 구 아이콘 (○▶✓✕) 채택 vs 신규 (Kyu 선호 이모지·기타).
- **Q-질문-8**: **AI-감 회복 우선순위** — Q-1 ⑤ 리듬 장치 12종 中 어느 것 즉시 이식? (Kyu 취향).

---

## §Q-4 · 파리티 회귀 방지 (자동 테스트 계획 · 오케)

### 원칙

인벤토리를 문서로 끝내지 말고 **이식 항목별 자동 테스트 (mount smoke · 실 DOM · 파싱 unit) 계획**을 병기 → 이식 후 재회귀 시 QC 검거.

### 이식 항목별 테스트 매트릭스

| 이식 항목 | 테스트 유형 | 위치 | 검증 대상 |
|---|---|---|---|
| Q-1 ① 결과 2회 노출 fix | mount smoke | `PconAttendanceLeft.spec.tsx` | attempt DONE 후 500ms 내 [data-testid=pcon-result-*] 미노출 · pollTick 2회 후 노출 |
| Q-1 ② 시각 변환 (§12) | 파싱 unit | `attendance-minors.pairing.spec.ts` (신설) | `pairSessionsFromRawRows` 결과 sessions[0].check_in === "2026-05-01T08:15:00" (Z 없음) |
| Q-1 ② 시각 변환 (렌더) | mount smoke | `PconAttendanceLeft.spec.tsx` | 세션 check_in="2026-05-01T08:15:00" → 표시 "08:15" (WIB 무변환) |
| Q-1 ③ Users 링크 | mount smoke | `PconAttendanceLeft.spec.tsx` | 미매핑 row → `<a href^="/users">` 존재 |
| Q-1 ④ STATUS_BADGE | mount smoke | `PconAttendanceRail.spec.tsx` | 각 status 별 배지 innerText 에 `○▶✓✕` 아이콘 포함 |
| Q-1 ⑤ paced-table-skeleton | 시각 (CSS class assert) | `PconAttendanceLeft.spec.tsx` | running === path 시 `.paced-table-skeleton` 존재 |
| Q-1 ⑥ 지각/야근 실 데이터 (G+6+) | backend unit | `attendance-minors.aggregate.spec.ts` (신설) | shift_baseline 있을 때 per_user_rows[0].late_days > 0 |
| Q-2 감사 이력 패널 | mount smoke + backend | `PconAuditTimeline.spec.tsx` + `pcon-audit.service.spec.ts` | run 별 이력 항목 정렬 · 필터 |
| P-1/P-2 기존 이식 회귀 | mount smoke | (기존 mount smoke 확장) | 컬럼·필터·달력·클릭 필터 동작 |

### 회귀 감사 절차 제안

- **매 라운드 실기 후**: `npm test` 통과가 필수 게이트 → 이식 항목이 테스트에 없으면 회귀 잡히지 않음 (구 화면 사례).
- **매 라운드 리포트**: `[테스트 추가]` 절 신설 → 신설 테스트 파일:줄:커밋 명기 (requirements-tracking 정본 준수).
- **회귀 발생 시**: 즉시 신설 unit/smoke → 다시 fix (test-first).

---

## 이연 순증감 (Q 라운드 · 조사 only)

**본 라운드 순증**:
- **문서**: relay `t0/T0-0807-Q-inventory.md` (본 문서).
- **코드**: 없음 (구현 금지).

**본 라운드 순감**: 없음.

**이연 (Kyu 결정 대기)**:
- Q-1 ①~⑤ 이식안 6종 (Kyu 승인 필요).
- Q-2 감사 이력 패널 (Kyu 배치 판정 후 R 라운드 착수).
- Q-3 전수 인벤토리 중 **최우선** 표기 항목 (시각 회귀 · STATUS_BADGE · Users 링크).
- Q-4 자동 테스트 계획 (이식 항목 발동 시 병기).

**이연 (G+6+)**:
- Q-1 ⑥ OT/Late/계획 데이터 배선 (Work Rotation · shift_baseline).
- Tab 2/3/4 (OT-Adjust · Finalize · Payslip Dispatch) 전량.
- REQ-P1-PD-1~7 전량.

---

## [요약]

- **Q-1** completion: Kyu 지목 회귀 6 (① 결과 2회 · ② 시각 왜곡 · ③ 급여반영대상/링크 · ④ STATUS_BADGE · ⑤ AI-감 리듬 · ⑥ 집계 컬럼) · 각각 근거 파일:줄 + 뿌리 실측 + 이식안.
- **Q-2** completion: "모든 수정 = 사유 → 이력 조회" 사상 심사 (사유 ✓ / 이력 조회 △) · Run별 감사 이력 패널 설계안 + **Kyu 질문 3** (배치·범위·확장).
- **Q-3** completion: Tab 1 (정리본·집계·달력·콘솔) 전 기능 매트릭스 (구 파일:줄 → 신 반영 여부/상태/우선순위/오케 권고) · Tab 2/3/4 = G+6+ 이연 · **Kyu 질문 절 8개** 분리.
- **Q-4** completion: 이식 항목별 자동 테스트 매트릭스 (mount smoke · 실 DOM · 파싱 unit · backend spec) · 회귀 감사 절차 제안.
- **구현 = 0** (Q 라운드 = 조사·인벤토리 only · Kyu 최종 결정 게이트).
- **커밋**: T0-0807-Q (본 relay 커밋 SHA · todoboss 코드 커밋 없음).
