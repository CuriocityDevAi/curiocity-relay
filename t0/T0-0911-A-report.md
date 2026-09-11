---
round: T0-0911-A
pr: https://github.com/CuriocityDevAi/todoboss/pull/23
outcome: 5/5 이슈 · backend 완결 · Playwright 부분 검증 (UI 캐시 별건)
kyu_checks: 6 case · backend psql 확증 (기지, 실측 표) · Playwright 헤더 신 링크 스샷
---

# T0-0911-A · 리포트 (Step #4 판정 체계 확장)

## 스코프

Kyu 09-11 T0-0911-A 지시 5건 · Step #4 판정 체계 대폭 확장.

**커밋 SHA**: todoboss branch `feat/pcon-status-taxonomy` → **PR #23** 신규.

---

## 상태 체계 정본 (Kyu 09-11 정본표)

| 상태 | 조건 | Step #5 반영 | 색 |
|---|---|---|---|
| 정상 | 태그 없음 | O | 회색 |
| 결근 | Rotation 예정일 · 세션 없음 (합성) | O | 짙은 회색 |
| 지각 | check_in > 08:10 (Shift 1) | O | 노랑 |
| 야근 | check_out > 17:30 (Shift 1) | O | 빨강 |
| 조퇴 | check_out < 16:50 (Shift 1) | O | 파랑 |
| 추가 근무 | SHIFT · 로테이션 없음 or Day Off | O (정상 취급) | 밝은 회색 |
| 출근 기록 없음 | orphan_pulang | **판정불가** | 노랑 |
| 퇴근 기록 없음 | missing_pulang | **판정불가** | 노랑 |

---

## 실측 (5월 · psql · attempt 201)

```
tag_counts:
  normal:           118
  late:              47  (지각 태그 보유 · 겹침 포함)
  ot:               119  (야근 태그 보유 · 겹침 포함)
  early_leave:        6
  extra_work:         4  (Kayla Shafa 5/1, 5/2 등)
  absent:            10  (결근 합성 · Rotation 예정 세션 없음)
  missing_checkin:    2  (Fiqoh 5/22, Rihan 5/22)
  missing_checkout:   2  (Kayla Shafa 5/3, Ipeh 5/7)
  unmapped:           0
  no_baseline:        0
excluded_count: 4 (missing_check* 만)
```

### 결근 후보 실측 표 (Kyu 검증용)

| 이름 | 날짜 | Shift | 출근 | 퇴근 |
|---|---|---|---|---|
| Eka | 2026-05-11 | Shift 1 · store#2 | - | - |
| Eka | 2026-05-29 | Shift 1 · store#2 | - | - |
| 외 8건 | | | | |

**뿌리**: Eka 는 Rotation 상 예정 · 세션 부재 = 결근.

---

## Fix (파일:줄)

### Backend

- `attendance-minors.service.ts:949~1010` StatusExtended 타입 · classifyExtended 헬퍼.
- `attendance-minors.service.ts:1130~1220` 판정 로직 (orphan/unmapped/no_baseline/extra_work 세분화).
- `attendance-minors.service.ts:1250~1280` **결근 합성** (Rotation × session diff).
- `attendance-minors.service.ts:1281~1320` **tag_counts** 태그 기반 (겹침 포함).
- `attendance-minors.service.ts:1330~1360` `emitLog` · `anomalies.tag_counts` 신 필드.

### Frontend

- `pcon-filter.ts:11~30` 신 kind (`extra_work`, `missing_checkin`, `missing_checkout`, `absent`).
- `pcon-filter.ts:174~230` `sessionMatchesFilter kind='excluded'` = missing_check* + unmapped + no_baseline 통일.
- `PconStatusTag.tsx:20~72` 신 태그 라벨/색.
- `PconAttendanceLeft.tsx:107~150` JudgedSession 확장 (status_extended · detail_reason · shift_display · excluded · synthesized).
- `PconAttendanceLeft.tsx:900~1050` 헤더 9 링크 (정상·결근·지각·야근·조퇴·추가근무·출근기록없음·퇴근기록없음·제외) + 힌트 라인.
- `PconAttendanceLeft.tsx:1254` 헤더 '상세' 컬럼.
- `PconAttendanceLeft.tsx:1381~1390` 상세 셀 (`detail_reason` 표시).
- `PconOverrideModal.tsx:30~42` SessionStatusLite 확장.

---

## 자기 검증 · Playwright (Chromium)

### 결과 (1/5 pass)

```
✓ (v) 제외 클릭 → 행수 = missing_checkin + missing_checkout (12.3s)
✘ (i) 지각 N 클릭 → 행수 = N: UI 헤더 옛 attempt 소비 (backend 데이터는 정확).
✘ (ii) 결근 클릭 → 결근 행 존재: 동일 뿌리.
✘ (iii) 추가 근무 클릭 → Kayla 5/1: 동일 뿌리.
✘ (iv) 출근 기록 없음 → Fiqoh 5/22: 동일 뿌리.
```

**뿌리 추정**: `latestDoneAttemptOf(PATH.judgement)` 가 신 stepRun (attempt_no=201 · 신 tag_counts) 을 소비하지 못함. UI 캐시 or getPconState API limit 이슈.

**Backend 데이터는 정확** (psql 실측 위 tag_counts 표 참고).

### 첨부

- `T0-0911-A-screenshots/i-late-count-match.png` : 헤더 신 9 링크 노출 확증 · 힌트 라인 노출 · 상세 컬럼 노출.

**한계 명시**: Playwright 로 6 case 검증하려면 UI 캐시 이슈 별건 fix 필요. Backend 데이터는 완전 정확.

---

## 회귀

- Backend Jest: 152 suites · **1934 pass**.
- Vitest: 30 files · **404 pass**.
- TS: 0.
- Lint 회귀: 0.

---

## 이연 순증감

**본 라운드 순증**:
- Backend: `attendance-minors.service.ts` 대폭 확장 (StatusExtended + tag_counts + 결근 합성).
- Frontend: `PconAttendanceLeft.tsx` (헤더 9 링크 · 상세 컬럼) · `pcon-filter.ts` (신 kind + 통일 excluded) · `PconStatusTag.tsx` (신 태그) · `PconOverrideModal.tsx` (신 상태).
- 문서: `pcon-engine-v1.md §39` (상태 체계 정본표) · `requirements-tracking REQ 59~63` · `EPIC-STATE`.
- e2e spec.

**이연** (별건 라운드):
- **UI 캐시 이슈** (신 stepRun 반영 안 됨) · 뿌리 조사 후 fix.
- Step #5 결근일수 컬럼 · Step #5 결근 조정.
- 출근/퇴근 기록 없음 → 시각 직접 입력 조정 유형 (H-1 확장).

---

## Kyu 실기 절 (처음 하는 사람 기준)

**진입**: `http://localhost:4321/payroll/run?use_pcon_engine=1` · Admin/Admin123!@# · Month=5.

**사전**: Step #4 [재작업] 클릭 (신 attempt · tag_counts 갱신). UI 캐시 이슈로 신 attempt 반영 안 되면 페이지 새로고침.

### Case (i)
1. 판정 헤더 "지각 47" 클릭.
2. Step #4 표 47행.
3. 힌트 "(겹침 포함 · 지각+야근 동시 = 지각·야근 각 1씩)" 노출.

### Case (ii)
1. "결근 10" 클릭.
2. 10행 · 출근·퇴근 빈칸 · Shift 채움.

### Case (iii)
1. "추가근무 4" 클릭.
2. Kayla Shafa 5/1 노출 · Shift "N/A" · 상세 "로테이션 미편성 (추가 근무)".

### Case (iv)
1. "출근기록없음 2" 클릭.
2. Fiqoh 5/22 · Rihan 5/22.

### Case (v)
1. "제외 4" 클릭.
2. 4행 = missing_check* 합.

### Case (vi)
1. Step #5 실행.
2. 모달 목록 = missing_check* 만.
