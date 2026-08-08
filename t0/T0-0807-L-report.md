# T0-0807-L · 리포트 (K PASS · 잔여 stub 2개 실 로직 · 구 화면 이식 1호)

## 스코프

Kyu K 실기 = **PASS 판정** ("원했던 방향으로 동작 시작"). L 라운드 = 잔여 stub 2 개를 실 로직으로.

**Kyu 08-08 이식 정본 (1호 적용)**: 구 화면 (pos-import.service.ts) 기존 구현 그대로 이식 · 재발명 금지.

**L 라운드**:
1. **L-1** data_cleanup 실 로직 (출퇴근 병합 · 세션 페어링).
2. **L-2** aggregate 실 로직 (사람별 1행 집계).

## L-1 · data_cleanup (세션 페어링 · pos-import 이식)

**로직 이식 원본**: `backend/src/todoboss/payroll/pos-import/pos-import.service.ts:576~751`.

**정본 재현**:
- **row-based** (Name/Date/Check In/Check Out): 각 행이 이미 짝맞은 세션.
- **punch-based** (Name/Date/Type Absen[Masuk|Pulang]/Time): 사람×날짜 그룹핑 후 Masuk/Pulang 매칭.
- **orphan**: Pulang without Masuk (orphan_pulang) · Masuk without Pulang (missing_pulang).
- **multi-punch**: 다중 Masuk = earliest 채택 · 다중 Pulang = latest 채택 (WARN 로그).

**Fix**:
- `backend/src/todoboss/payroll/pcon-adapter/attendance-minors.service.ts:1~210` · `pairSessionsFromRawRows` (pure 함수 · DB 미쓰기).
- `attendance-minors.service.ts:275~400` · `executeDataCleanup` 정본.

**계보**: `input_ref = { name_mapping: {attempt_no: prev.attempt_no} }` (M 라운드 STALE 파생 전제).

**anomalies 저장**:
```ts
{
  id: 'cleanup_summary',
  raw_count, session_count, paired_count, orphan_count,
  detected_format: 'row_based' | 'punch_based',
  warnings: [...],
  sessions: [{pos_name, date, check_in, check_out, orphan_kind?}, ...]  // 전량
}
```

**집계카드 문구 정본 (Kyu)**:
```
INPUT: RAW 데이터 N건 (하루에 직원별 출/퇴근 각 1 ROW · 1쌍)
→ OUTPUT: 총 M건 (하루에 직원별 출퇴근 기록 1 ROW로 압축)
· 특이사항 K건 (orphan)
```

**렌더** (`PconAttendanceLeft.tsx:275~415`):
- `[data-testid=pcon-cleanup-table]` · 컬럼 = 이름 (POS) · 날짜 · 출근 (WIB) · 퇴근 (WIB) · 특이사항.
- orphan row: `bg-warning-light/20` + `data-orphan=true`.
- 페이지네이션 (50/page).
- Pacer fade-in (`animate-pcon-fade-in`) 적용.
- WIB 시각 표기: pos-import 정본 관행 (getUTCHours = 실 WIB 값).

## L-2 · aggregate (사람별 1행 집계 · pos-import 이식)

**로직 이식 원본**: `pos-import.service.ts:1364~1400` (per_user_rows 축약).

**정본 재현**:
- `sessions` (cleanup) + `mapped_pairs` (name_mapping) 소비.
- `pos_name` (normalized) → `{user_id, user_name}` lookup.
- per-user: `work_days` (distinct dates) · `session_count` · `total_minutes` (checkout - checkin).
- 매핑 실패 세션 → `excluded_sessions[]` (특이사항).
- 정렬: user_name locale-compare.

**Fix**:
- `attendance-minors.service.ts:420~580` · `executeAggregate` 정본.

**계보**: `input_ref = { data_cleanup: {attempt_no: prev.attempt_no} }`.

**anomalies 저장**:
```ts
{
  id: 'aggregate_summary',
  input_sessions, user_rows, excluded_count,
  per_user_rows: [{user_id, user_name, work_days, session_count, total_minutes}, ...],
  excluded_sessions: [{pos_name, date, reason}, ...]
}
```

**집계카드 문구 정본**:
```
INPUT 정리본 N건 → OUTPUT M명 집계 · 특이사항 K건 (매핑 실패 세션)
```

**렌더** (`PconAttendanceLeft.tsx:155~275`):
- `[data-testid=pcon-aggregate-table]` · 컬럼 = 직원 (Users) · 근무일수 · 세션수 · 총 근무시간.
- `total_minutes` → `Xh YYm` 포맷.
- 매핑 실패 세션: `[data-testid=pcon-aggregate-excluded]` (특이사항 노란 박스 · 최대 10건 표시 후 "…외 N건").

## 공통

- 각 단계 pcon_log 시나리오 = 실 데이터 기반 (Pacer 재생 · 700ms/줄 · 타임스탬프 체감 · K 라운드 정본 그대로).
- 계보 (`input_ref`) 정확 기록:
  - `name_mapping.input_ref` = `{file_import: {attempt_no}}` (J 라운드 유지).
  - `data_cleanup.input_ref` = `{name_mapping: {attempt_no}}` (신설).
  - `aggregate.input_ref` = `{data_cleanup: {attempt_no}}` (신설).
- 계보는 M 라운드 (row 편집·STALE 파생) 의 전제 (§8 정본).

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip.
- **Jest (pcon-adapter)**: 7 pass.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 대본 재현 (Kyu 재실기 대비 · 4클릭 완주)

**초기화 → IMPORT → 매핑 → 정리 → 집계** = 4클릭으로 실 데이터 관통:

1. `[data-testid=pcon-reset-run]` → confirm → 신규 run.
2. **IMPORT** 5월 파일:
   - Pacer 로그 순차 (700ms/줄) → file_import DONE.
   - 좌 RAW 표 (엑셀 A1 전량 · 페이지네이션).
   - 1.5s 여운 후 아코디언 접힘.
3. **name_mapping** [실행]:
   - Pacer 로그 · 매핑 카드 (mapped_pairs 테이블 · 미매핑 리스트).
   - RAW 데이터 구간 강조 박스.
4. **data_cleanup** [실행]:
   - Pacer 로그 (`cleanup_started` · `orphan_detected` · `step_completed`).
   - `[data-testid=pcon-result-attendance_import.data_cleanup]` = fade-in.
   - `[data-testid=pcon-aggregate-card-attendance_import.data_cleanup]`:
     ```
     INPUT: RAW 데이터 514건 (하루에 직원별 출/퇴근 각 1 ROW · 1쌍)
     → OUTPUT: 총 257건 (하루에 직원별 출퇴근 기록 1 ROW로 압축)
     ```
   - `[data-testid=pcon-cleanup-table][data-total-rows=257]` · 세션 리스트.
   - orphan 행: `data-orphan=true` · `bg-warning-light/20`.
5. **aggregate** [실행]:
   - Pacer 로그.
   - `[data-testid=pcon-result-attendance_import.aggregate]` = fade-in · **최신 스택 맨 위**.
   - `[data-testid=pcon-aggregate-card-attendance_import.aggregate]`:
     ```
     INPUT 정리본 257건 → OUTPUT 12명 집계 · 특이사항 0건
     ```
   - `[data-testid=pcon-aggregate-table][data-total-rows=12]` · 사람별 1행.

## 이연 순증감

**본 라운드 (T0-0807-L) 순증**:
- **Backend** 1개 파일:
  - `attendance-minors.service.ts` (pairSessionsFromRawRows pure · executeDataCleanup · executeAggregate 실 로직 3부).
- **Frontend** 1개 파일:
  - `PconAttendanceLeft.tsx` (정리본 테이블 + 집계표 + 페이지네이션 + orphan 강조).
- **문서**: `pcon-engine-v1.md` §6.구현-L (파일:줄:커밋).
- **리포트**: relay `t0/T0-0807-L-report.md` (K 청소 · L 게시).

**본 라운드 (T0-0807-L) 순감**:
- Backend: data_cleanup / aggregate stub 삭제 (실 로직 교체 · ~100 lines diff).
- Frontend: cleanup/aggregate placeholder 텍스트 삭제 (실 테이블 교체).

**이연 (T0-0807-M · row 편집 구현)**:
- pcon_row_edit migration + entity + service + controller (§8 정본).
- UI 편집 modal + hover 툴팁 + [재작업] 버튼 (paced-action-pulse).
- STALE 파생 규칙 (pcon-core deriveStaleness).

**이연 (G+6+)**:
- OT/Finalize 실 실행 · alias 자동 승격 · flag 제거 · 구 pos-import 삭제.

## [요약]

- **L-1** completion: `pairSessionsFromRawRows` (pure · pos-import 정본 이식) · `executeDataCleanup` 실 로직 · 좌 정리본 테이블 + orphan 강조 · 계보 name_mapping 참조.
- **L-2** completion: sessions + mapped_pairs 소비 · per-user 집계 (work_days · session_count · total_minutes) · 매핑 실패 excluded_sessions · 사람별 1행 집계표 · 계보 data_cleanup 참조.
- **4클릭 완주**: Reset → IMPORT → 매핑 → 정리 → 집계 · 전 마이너 실 데이터 관통.
- **회귀**: TS 0 (backend + frontend) · Lint 0 · lint:hooks 0 · Vitest 341 pass · Jest 7 pass.
- **커밋**: T0-0807-L (본 커밋 SHA).
