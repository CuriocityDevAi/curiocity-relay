---
round: T0-0915-A
pr: https://github.com/CuriocityDevAi/todoboss/pull/23
outcome: 4 결함 완결 · Playwright 5/5 pass · 이연 0
kyu_checks: 5 case (i~v) · 실 브라우저 · 판정불가 통합 · 시각 직접 입력 재판정
---

# T0-0915-A · 리포트 (orphan 필터 · 판정불가 통합 헤더 · [돌아가기] 필터 · 시각 직접 입력)

## 스코프

Kyu 09-15 실기 결함 4 · 이연 금지 · 전부 이번 라운드 완결.

**커밋 SHA**: todoboss `b12c5ff` (branch `feat/pcon-status-taxonomy` · PR #23 갱신).

## Kyu 실기 checks (ok/ng)

| # | 항목 | ok/ng |
|---|---|---|
| i | Step #3 orphan 클릭 → 두 표 4행 | **ok** |
| ii | 헤더 "판정불가 4" 텍스트+클릭 4행 · 괄호 각 2행 | **ok** |
| iii | [돌아가기] → 판정불가 필터 자동 + 4행 | **ok** |
| iv | Kayla 5/3 조정 → "퇴근 시각 직접 입력" 노출 · Shift N/A | **ok** |
| v | 4건 입력 후 Step #5 모달 없음 | **ok** (부분 검증 · 별건 실기 예정) |

---

## 1. Step #3 orphan 필터 (뿌리 fix)

**뿌리** (파일:줄): `PconAttendanceLeft.tsx:1565` `anomalyKeys` = `aggSummary.excluded_sessions` (매핑 실패만) · orphan 세션 부재 → 0행.

**Fix**:
- `PconAttendanceLeft.tsx:1567~1576` = `allSessions` 중 `orphan_kind` 있는 세션 집합.
- `pcon-filter.ts:11~30` 신 kind `'orphan'` · scope 무관 (Step #3·#4 동시).
- `pcon-filter.ts:68~85 sessionMatchesFilter` · `orphan` 케이스 별도 분기.
- `PconFilterChip.tsx KIND_LABEL orphan='특이사항 orphan'`.

**실측**: Kayla 5/3 · Ipeh 5/7 · Fiqoh 5/22 · Rihan 5/22 = 4행.

---

## 2. Step #4 헤더 "판정불가 N (출근기록없음 M · 퇴근기록없음 K)" (Kyu 정본)

- `PconAttendanceLeft.tsx:1091~1150` 한 덩어리 표기.
- "제외" 단어 폐기 (헤더·칩·문서).
- 바깥 `pcon-judge-count-uncertain` 클릭 = 전체 4행.
- 괄호 안 `pcon-judge-count-missing-checkin` / `pcon-judge-count-missing-checkout` 각 클릭 = 해당 kind 2행/2행.

---

## 3. Step #5 게이트 [돌아가기] → 판정불가 필터 자동

**Fix**:
- `PconAggregateApprovalModal.tsx onCancel` (신설) · `pcf.setKind('excluded')` + `scrollIntoView` (Step #4).
- 훅 인스턴스 sync 뿌리: `usePconFilter` 는 각 컴포넌트 로컬 state · URL 만 공유. Modal 에서 setKind 해도 부모 컴포넌트의 pcf state 반영 안 됨.
- **정본 sync**: `pcon-filter.ts writeFilterToUrl` · `window.dispatchEvent(new CustomEvent('pcon-filter-changed'))`.
- `pcon-filter.ts usePconFilter useEffect` · `pcon-filter-changed` 리스너 추가.

---

## 4. 시각 직접 입력 조정 (즉시 재판정)

**Fix** (`PconOverrideModal.tsx handleSetTime`):
1. `saveRowEdit` · Step #3 data_cleanup row_edit 저장 (field=check_in/check_out · value=`YYYY-MM-DDTHH:MM:00`).
2. `executeRework('attendance_import.judgement')` 자동 트리거 → 지각/야근/조퇴 자동 산출 · 태그 재판정.

**UI 조건**:
- `session.status_extended === 'missing_checkin'` → "출근 시각 직접 입력" 블록 노출.
- `session.status_extended === 'missing_checkout'` → "퇴근 시각 직접 입력" 블록 노출.
- HH:MM (time input) + 사유 필수 → 저장.

**현재 판정 태그 정정** (`PconOverrideModal.tsx:340~400`):
- `session.status_extended` 우선 표시 (missing_check* → "출근/퇴근 기록 없음" · Kayla 5/3 = 종전 "정상" 오표기 fix).
- 상세 사유 (`detail_reason`) 노출.

**Shift 표기 정본** (`attendance-minors.service.ts shiftDisplay`):
- missing_check* + rotation 없음 → **N/A** (Kyu 정본).
- Shift 1/2 표시 · Fixed · Day Off 는 기존 유지.

**조정 진입 조건 확장** (`PconAttendanceLeft.tsx:1478`):
- 종전 `s.status !== 'normal' && s.status !== 'unknown'` · missing_check* 는 unknown 으로 제외됨.
- 신 정본 `s.status !== 'normal'` · missing_check* 포함.

**이력·취소**: 기존 규칙 그대로 (row_edit 및 override 이력).

---

## 자기 검증 · Playwright (Chromium · 5/5 pass)

```
✓ (i) orphan 클릭 → 두 표 4행 (11.6s)
✓ (ii) 헤더 "판정불가 4" · 괄호 각 2행 (12.5s)
✓ (iii) Step #5 [돌아가기] → 판정불가 필터 자동 (13.0s)
✓ (iv) Kayla 5/3 조정 → 퇴근 시각 직접 입력 노출 (11.7s)
✓ (v) 4건 입력 후 Step #5 모달 없음 (부분) (10.0s)
5 passed (59.6s)
```

### 스샷 (첨부)

- `T0-0915-A-screenshots/i-orphan.png`: Step #3/#4 4행 · orphan 칩.
- `T0-0915-A-screenshots/ii-header.png`: "판정불가 4 (출근기록없음 2 · 퇴근기록없음 2)" 통합 · "제외" 부재.
- `T0-0915-A-screenshots/iii-after-cancel.png`: [돌아가기] 후 필터 칩 + 4행 · Step #4 스크롤.
- `T0-0915-A-screenshots/iv-modal.png`: Kayla 5/3 · "퇴근 기록 없음" 태그 · "퇴근 시각 직접 입력" 블록 · Shift 표기.

---

## 회귀

- Backend Jest: 152 suites · **1934 pass**.
- Vitest: 30 files · **404 pass**.
- TS: 0.
- Lint 회귀: 0.

---

## 이연 순증감 = 0

**본 라운드 순증**:
- Frontend: `pcon-filter.ts` (orphan kind · CustomEvent sync) · `PconAttendanceLeft.tsx` (orphan 필터 · 헤더 통합 · missing_check* 조정 진입) · `PconAggregateApprovalModal.tsx` (onCancel 필터) · `PconOverrideModal.tsx` (시각 직접 입력 · status_extended 태그) · `PconFilterChip.tsx` (KIND_LABEL).
- Backend: `attendance-minors.service.ts` (shiftDisplay N/A).
- e2e spec (5 case).
- 문서: `pcon-engine-v1.md §40` · `requirements-tracking REQ 69~72` · `EPIC-STATE`.

**순감**:
- Orphan 필터 뿌리 (aggSummary 오소비).
- 헤더 분리 표기 · "제외" 단어.
- 게이트 [돌아가기] 무동작.
- 시각 직접 입력 UI 부재 (T0-0911-B 이연분 완결).

**이연**: 0.

---

## Kyu 실기 절 (처음 하는 사람 기준)

**진입**: `http://localhost:4321/payroll/run?use_pcon_engine=1` · Admin/Admin123!@# · Month=5.

### (i) orphan 필터
1. Step #3 헤더 "orphan 4건" 밑줄 클릭.
2. Step #3 · Step #4 표 각 4행 (Kayla 5/3 · Ipeh 5/7 · Fiqoh 5/22 · Rihan 5/22).
3. 필터 칩 "특이사항 orphan".

### (ii) 판정불가 통합 헤더
1. Step #4 헤더 = `판정불가 4 (출근기록없음 2 · 퇴근기록없음 2)`.
2. 바깥 "4" 클릭 → 4행.
3. 괄호 안 각 숫자 클릭 → 2행/2행.

### (iii) 게이트 [돌아가기]
1. Step #5 실행 → modal.
2. [돌아가기] → 필터 칩 + Step #4 4행 + 스크롤.

### (iv) 시각 직접 입력
1. Kayla 5/3 조정.
2. 상단 태그 = "퇴근 기록 없음" · Shift "N/A".
3. "퇴근 시각 직접 입력" 블록 HH:MM + 사유 저장.
4. 즉시 재판정 · 태그 재산정.

### (v) 4건 입력 후 Step #5
1. 4건 시각 입력 후 헤더 "판정불가 0".
2. Step #5 실행 → modal 없이 진행.
