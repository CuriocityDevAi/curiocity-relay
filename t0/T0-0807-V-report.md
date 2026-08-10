# T0-0807-V · 리포트 (U 실기 판정 6건 · V-1~5 구현 + V-6 심문 별도)

## 스코프

**Kyu U 실기 판정 반영**:
- STEP1·2 결과 테이블 편집 부재 → **V-1/V-2 구현**.
- STEP1 C열 파란 테두리 → **V-3 폐기 · 헤더 배지 대체**.
- 접힘 카드 T-6 재위반 → **V-4 fix**.
- 정리본 지각/야근 표기·원인 강조 부재 → **V-5 구현**.
- 판정 파라미터화 → **V-6 심문** (구현 금지 · 별도 게시).

## V-1 · 전 결과 테이블 편집 (엔진 정본 §16)

**정본** (재론 금지):
> 모든 마이너의 결과 테이블 = 전 row 편집 가능. 편집 = pcon_row_edit 이력 필수 (STEP1 RAW 포함). 원본 보존 + 정정 이력 append-only. **Payroll 특례 아님 · 엔진 계약**.

**적용 대상 (5 마이너)**:
| 마이너 | row_key | fields | 구현 |
|---|---|---|---|
| STEP1 RAW | `raw:{excelRow}` | header_columns (앞 6개) | 데이터 행 hover [✎] · `[data-testid=pcon-raw-edit-{excelRow}]` · `PconRowEditModal` 재사용 |
| STEP2 매핑 | `mapping:{pos_name}` | user_id (검색) | 인라인 검색 드롭다운 · `PconNameMappingEditModal` (V-2) |
| STEP3 정리 | `session:{pos_name}:{date}` | check_in / check_out | 기존 유지 |
| STEP4 판정 | (오버라이드 · pcon_override) | (append-only 판정 조정) | 배지 + 별도 · 편집 아님 |
| STEP5 집계 | `user:{user_id}` | work_days | 기존 유지 |

## V-2 · 매핑 편집 UI (신설 modal)

**Backend** (`backend/src/todoboss/payroll/pcon-adapter/attendance-users.controller.ts` 신설):
- `GET /api/admin/pcon/attendance/users?q=<키워드>` → `{items: [{id, name, full_name}]}`.
- store users 필터 · 이름/full_name/id 부분매치 · 최대 50.
- pcon-adapter.module.ts 편입.

**Frontend** (`web-admin/src/pages/payroll/pcon-view/PconNameMappingEditModal.tsx` 신설):
- Modal open 시 users lookup (query 변경마다 재조회).
- 드롭다운 · 각 user 옆에 [현재] · [⚠ 이미 매핑됨: {pos_name}] 배지.
- 선택 즉시 `duplicateWith` 감지 (mapped_pairs 에서 동일 user_id 다른 pos_name).
- 중복 시 저장 차단 (`disabled`) · 대신 **[⇅ 맞바꾸기]** 액션 = 양쪽 스왑 (2 개 pcon_row_edit 저장).
- 저장 = `saveRowEdit(row_key='mapping:{pos_name}', field='user_id', after_value=selected.id, reason 필수)`.
- 캐스케이드 = 자동 (hasEditsUpstream 로 judgement/aggregate STALE).

**Table row 시각화** (`PconAttendanceLeft.tsx`):
- 편집된 row: `data-edited=true` · `border-l-4 border-l-accent bg-accent-light/10`.
- 중복 row: `data-duplicate=true` · `bg-warning-light/20` · 배지 "⚠ 중복 #{id}".
- Overlay: `user_id` 변경 후 displayed_user_id 재계산 · `✎ 수정됨 (재매핑)` 배지.

## V-3 · RAW C열 파란 테두리 폐기 · 헤더 배지 대체

**Fix** (`PconAttendanceLeft.tsx`):
- 이전: name 컬럼 헤더 셀 + 데이터 셀에 `border-l-2 border-r-2 border-t-2 border-accent` 감쌈 (강자극).
- 정본 (V-3): border 완전 제거.
  - 헤더 셀: 라벨 옆 `<span data-testid=pcon-raw-header-name-badge>매핑</span>` (bg-accent-light · 저자극 badge).
  - 데이터 셀: `bg-accent-light/10` (subtle · 강조 없음).
- 재-mapping 대상 명확 + 시각 부담 최소.

## V-4 · 접힘 카드 T-6 정본 결과 테이블 확장 (재위반 fix)

**뿌리** (Kyu 재지목): T-6 정본 = 파란 border = 실행 중 전용 · 접힘 = 회색 배경 · 테두리 X. 하지만 결과 카드 (aggregate/judgement/cleanup/name_mapping/file_import) 는 여전히 `border-2 border-accent` 로 접힘 표시.

**Fix** (`PconAttendanceLeft.tsx` · 5 sections 전량):
```tsx
className={`animate-pcon-fade-in rounded border p-4 ${
  collapsed
    ? 'border-transparent bg-surface-tertiary'  // T-6 정본.
    : 'border-border bg-surface'
}`}
```
- 접힘 시각 = T-6 정본 그대로 (파란 border 완전 제거).
- 실행 중 강조는 Rail 카드 전용 (Left 결과 카드는 접힘/펼침만).

**실 DOM 지표**:
- `[data-testid=pcon-result-*][data-collapsed=true]` className 에 `border-transparent bg-surface-tertiary` 포함 확증.
- 신 smoke 자동 테스트 후속 라운드 예약 (스크린샷 증적 = Kyu 실기 대비).

## V-5 · 판정 원인 셀 하이라이트

**정본 (§17 신설)**:
- 정리본 (session) row 에서 판정 결과 (`judgement_summary.sessions[]`) lookup:
  - key = `${pos_name.toLowerCase()}|${date}`.
- 지각 (`status='late'`) → **출근 시간 셀** `bg-warning-light/60 text-warning font-semibold`.
- 야근 (`status='ot'`) → **퇴근 시간 셀** `bg-error-light/60 text-error font-semibold`.
- 미입력 (값 없음) → **빈 셀** `bg-error-light/40 text-error`.
- hover title: "지각 · N분 (baseline_label 기준)" / "야근 · N분" / "출근 미입력".

**Fix** (`PconAttendanceLeft.tsx` 정리본 in/out 셀):
- `[data-testid=pcon-cleanup-in-{i}][data-late=true]`.
- `[data-testid=pcon-cleanup-out-{i}][data-ot=true]`.
- 판정 미실행 시 = 색 없음 (판정 후 자동 반영 · 캐스케이드 정합).

## V-6 · 판정 파라미터화 설계 (심문 · 구현 금지)

**별도 게시**: `relay/t0/T0-0807-V-inquiry.md`.

포함:
- 파라미터 전수 (T-1 인벤토리 + 신설 4종).
- payroll_policy 정식 스키마 · 파라미터 관리 화면 설계.
- 레코드 더블클릭 = drill-down (실측 vs 기준).
- 시뮬레이션 프리뷰 (적용 전 판정 diff).
- 정책 버전 저장 (감사 type=policy_change) + 판정 재작업 캐스케이드.
- OverrideModal(개별 예외) vs 파라미터(일괄 기준) 화면 관계.
- Kyu 질문 절.

## 회귀

- **Backend TS**: EXIT 0.
- **Frontend TS**: EXIT 0.
- **Vitest**: 24 files · **344 pass** · 17 skip.
- **Jest (pcon-adapter)**: **38 pass**.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## Kyu 실기 절 (self-contained)

**대본**:
1. Reset → IMPORT → 매핑 → 정리 → 판정 → 집계 (5-클릭 완주).
2. **접힘 카드 재-시각 확증 (V-4)**:
   - Left 5 결과 카드 각각 눈 아이콘 클릭 → `[data-collapsed=true]`.
   - className 에 `border-transparent bg-surface-tertiary` 포함 · 파란 border 부재.
3. **RAW 헤더 배지 (V-3)**:
   - `[data-testid=pcon-raw-header-name-badge]` = "매핑" (bg-accent-light · 저자극).
   - Name 컬럼 셀에 파란 border 부재.
4. **RAW row 편집 (V-1)**:
   - 데이터 row hover → `[data-testid=pcon-raw-edit-{excelRow}]` 등장.
   - 클릭 → `PconRowEditModal` open · fields = header_columns 앞 6개.
5. **매핑 편집 (V-2)**:
   - 매핑 row hover → `[data-testid=pcon-name-mapping-edit-{pos_name}]` 등장.
   - 클릭 → `[data-testid=pcon-name-mapping-edit-modal]` open.
   - 검색 인풋 · 드롭다운 · 사용자 클릭.
   - 중복 시: 저장 비활성 + `[data-testid=pcon-name-mapping-duplicate-warning]` + `[data-testid=pcon-name-mapping-swap]` [⇅ 맞바꾸기].
   - 저장 후 row `[data-edited=true]` · overlay 반영.
6. **판정 원인 색 (V-5)**:
   - 판정 실행 후 정리본 row 에서 지각 세션: `[data-testid=pcon-cleanup-in-{i}][data-late=true]` · `bg-warning-light/60`.
   - 야근 세션: `[data-testid=pcon-cleanup-out-{i}][data-ot=true]` · `bg-error-light/60`.

## 이연 순증감

**본 라운드 (T0-0807-V) 순증**:
- **Backend 신설 1**: `attendance-users.controller.ts` (users lookup).
- **Backend 편입**: `pcon-adapter.module.ts` (신 컨트롤러).
- **Frontend 신설 1**: `PconNameMappingEditModal.tsx` (인라인 검색 · 중복 감지 · 스왑).
- **Frontend 편입**:
  - `api/pcon-engine.ts` (getPconUsersLookup).
  - `PconAttendanceLeft.tsx` (V-1 RAW [✎] · V-2 매핑 row [✎] + overlay · V-3 헤더 배지 · V-4 접힘 5 sections · V-5 판정 원인 색 · mappingEditModal state).
- **문서**: `pcon-engine-v1.md` §16 (전 편집) · §17 (원인 색) · `requirements-tracking.md` §3-P (4 신규 REQ).
- **relay**: `t0/T0-0807-V-report.md` (본) + `t0/T0-0807-V-inquiry.md` (V-6 심문 별도).

**본 라운드 순감**:
- Frontend: RAW Name 컬럼 border-l/r/t-2 border-accent (V-3 폐기).
- Frontend: 결과 5 카드 `border-2 border-accent` collapsed 스타일 (V-4 T-6 정본으로 교체).

**이연 (Kyu 결정 후 W 라운드)**:
- V-6 심문 결과 → 파라미터 관리 화면 구현 · 시뮬레이션 프리뷰.
- OverrideModal UI 진입 (Q-T-7 미구현 · Kyu 재판정).

**이연 (G+6+)**: Finalize/Payslip · Work Rotation 편성/계획 · flag 제거.

## [요약]

- **V-1** 완료 (엔진 정본 §16): 전 마이너 결과 테이블 편집. STEP1 RAW row [✎] + STEP2 매핑 row [✎] 신설.
- **V-2** 완료: `PconNameMappingEditModal` (인라인 검색 · 중복 감지 · [⇅ 맞바꾸기] 스왑) · backend `attendance-users.controller`.
- **V-3** 완료: RAW C열 파란 테두리 폐기 · 헤더 `매핑` 배지 저자극.
- **V-4** 완료: 접힘 카드 T-6 정본 5 sections 전량 확장 · `border-transparent bg-surface-tertiary` · 재위반 fix.
- **V-5** 완료 (§17 신설): 판정 원인 셀 색 (지각=출근 warning · 야근=퇴근 error · 미입력=빈 셀 error).
- **V-6** 별도: `t0/T0-0807-V-inquiry.md` 심문 게시 (구현 금지).
- **회귀**: TS 0 · Vitest 344 pass · Jest 38 pass · Lint 0 · lint:hooks 0.
- **커밋**: T0-0807-V (본 커밋 SHA).
