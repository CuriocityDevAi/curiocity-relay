---
round: T0-0909-A
pr: https://github.com/CuriocityDevAi/todoboss/pull/21
outcome: 5/5 fix + 재발 방지 3장치 + Playwright 4/4 pass
kyu_checks: 5 case (a~e) · 실 브라우저 · 데이터 검증
---

# T0-0909-A · 리포트 (TZ · aggregate net · 4col · calendar · modal UX)

## 스코프

Kyu 09-09 T0-0909-A 지시 5건.

**커밋 SHA**: todoboss `272d9db` (branch `feat/pcon-tz-adjust-agg` · **PR #21** 신규).

---

## 1. 타임존 (최우선 · 재발 방지)

### 뿌리 경로 (파일:줄)

| 층 | 위치 | 상태 |
|---|---|---|
| DB | `pcon_override.decided_at = timestamptz` | 정상 (UTC 저장) |
| API | `pcon-override.controller.ts:70` | 정상 (Date → ISO 8601 UTC) |
| **프론트** | `PconOverrideModal.tsx:115~117 formatWhen` | **결함**: `iso.slice(0,19).replace('T', ' ')` = UTC 자름 |
| 프론트 | `PconOverrideCell.tsx:51~53` | 결함 (동일) |
| 프론트 | `PconAuditModal.tsx:30~36 formatTs` | 결함 (`toLocaleString` = 브라우저 TZ) |
| 프론트 | `PconAttendanceLeft.tsx:212, 1246` | 결함 |
| 프론트 | `PconAttendanceRail.tsx:27~38 formatHms` | 결함 (`getHours/getMinutes`) |

### Fix

- **신설** `web-admin/src/lib/store-time.ts` (`formatStoreTime`/`Date`/`Hm`/`Hms` · **date-fns-tz** · `DEFAULT_STORE_TZ = 'Asia/Jakarta'`).
- 5 파일 이관 (formatWhen alias · toLocaleString/getHours 폐기).
- 저장 = UTC 유지 · 표시 = 매장 로컬 시간 정본.

### 재발 방지 3장치 (증거)

1. **공용 포매터**: `src/lib/store-time.ts` · 단위 테스트 8 case (`store-time.test.ts`).
2. **grep 기반 lint 테스트**: `src/lib/__tests__/no-raw-time-format.test.ts`. 표시 층 (pcon-view) `toLocaleString`/`getHours`/`toISOString().slice(0,19)` 사용 시 test fail. CI 통과 조건 = 위반 0건.
3. **ADR**: `docs/decisions/ADR-2026-09-09-store-timezone.md` (재론 금지 · 전수 grep 표 · 뿌리 경로 파일:줄 명세).

### 전수 grep 이연 표

| 파일 | 조치 |
|---|---|
| PayrollRunPage.tsx:4617 등 (IDR 숫자 toLocaleString) | 유지 (숫자 · TZ 무관) |
| planning-input/DemandTabContent.tsx:12 (date input) | 별건 라운드 |
| production-dashboard/TransparencyTabContent.tsx:29 | 별건 라운드 |

---

## 2. 조정 모달 취소 모드 UX

`PconOverrideModal.tsx:476~525` · `Object.keys(revertReasonByMetric).length > 0` 시 하단 사유 * 블록 숨김. Save 버튼도 disable (revert 저장으로만 진행).

---

## 3. Step #5 집계 조정 미반영 · 뿌리 fix

**뿌리** (파일:줄): `attendance-minors.service.ts:1206` `executeAggregate` 가 `judgement_summary.sessions[]` 을 소비 · 이 sessions 는 판정 attempt 시점 late/ot_minutes. 이후 저장된 override 는 미반영 · 재집계 = no-op.

**Fix** (`attendance-minors.service.ts:1206~1257`):
- aggregate 시작 시 `overrideSvc.listOverridesForRun` 최신 조회.
- session 별 subject_id 로 `computeNetOverrideState` fold.
- `net.late.applied/net.ot.applied` 값으로 in-place 대체 후 집계.

**실측**: Amel late_excused 26번 저장 → aggregate rework → `late_days=8 · ot_days=11` (기존 판정 attempt 값 상관없이 최신 net 반영).

---

## 4. Step #5 4컬럼 분리

**Kyu 정본** = `[지각횟수][지각시간][야근횟수][야근시간]` 4컬럼 · 총계 헤더 동시.

- Backend: `ot_dates: Set<string>` · `ot_days` 필드 신설.
- Frontend: 헤더 라벨 신설 + 4 셀 (`late-days` · `late-minutes` · `ot-days` · `ot-minutes`).
- 총계 = `총 지각 N회 · XhYm` · `총 야근 M회 · XhYm`.

---

## 5. 이름 클릭 달력 판정 색상 배선 (이연 폐기)

**기존 로직 위치**: `attendance-minors.service.ts:executeJudgement` (`shift-baseline.ts`).

**재사용 방식**:
- `PconCalendarModal.tsx:20~200` · `judgedSessions?: CalendarJudgedSession[]` props 신설.
- Call site (`PconAttendanceLeft.tsx:2166~2225`): `latestDoneAnomaliesOf(PATH.judgement).sessions[]` → `computeNetOverrideState` fold → net 반영 값 (late/ot/early_leave_minutes).
- 셀 색상 = 지각 노랑 · 야근 빨강 · 조퇴 파랑 · 기준없음 회색 · 정상 흰색.
- 헤더 카운트 = Step #5 표와 일치.

---

## 자기 검증 (Playwright · Chromium · 4/4 pass)

**Spec**: `web-admin/e2e/pcon-verify/t0-0909-a-self-check.spec.ts`.

```
✓ (a) 조정 이력 시각 Jakarta (UTC → +7) (9.9s)
✓ (b) 취소 모드 열림 시 하단 사유 * 필드 숨김 (12.3s)
✓ (c) Step #5 4컬럼 (지각횟수·지각시간·야근횟수·야근시간) (9.1s)
✓ (d) 이름 클릭 달력 지각/야근 색 (9.5s)
4 passed (41.6s)
```

### 스크린샷 첨부

- `T0-0909-A-screenshots/A-history-time-jakarta.png` : 조정 이력 시각 = "15:57"/"16:29" 등 (UTC 08~09 → Jakarta 15~16 반영).
- `T0-0909-A-screenshots/B-revert-mode-no-bottom-reason.png` : 지각 [취소] 열림 · "취소 사유 (필수)" 인라인 · **하단 사유 * 부재**.
- `T0-0909-A-screenshots/C-aggregate-4col.png` : Step #5 헤더 `지각횟수/지각시간/야근횟수/야근시간` 4컬럼 · Amel row `9회/3h59m/-/6h54m`.
- `T0-0909-A-screenshots/D-calendar-colors.png` : amandha 5월 · 지각 1회/야근 7회 · 22 노랑 · 25/26/28/29/30/31 빨강.

### 어설션 파일 동봉

- `store-time.test.ts` (8 case).
- `no-raw-time-format.test.ts` (재발 방지 grep).
- `t0-0909-a-self-check.spec.ts` (4 spec).

---

## 회귀

- **Backend Jest**: 152 suites · **1934 pass**.
- **Vitest**: 29 files · **383 pass** (신 9).
- **TS**: 0.
- **Lint 회귀**: 0 (5 pre-existing errors 유지).

---

## 이연 순증감

**본 라운드 순증**:
- Backend: `attendance-minors.service.ts` (aggregate net fold · ot_days).
- Frontend 신설: `store-time.ts` · `store-time.test.ts` (8) · `no-raw-time-format.test.ts` · `t0-0909-a-self-check.spec.ts` (4 spec).
- Frontend 수정: 5 pcon-view 파일 (formatStoreTime 이관 · 4컬럼 · 달력 배선 · 취소 모드 사유 숨김).
- 문서: `ADR-2026-09-09-store-timezone.md` · `EPIC-STATE.md` · `pcon-engine-v1.md §37` · `requirements-tracking §3-P REQ 42~46`.

**본 라운드 순감**:
- 종전 formatWhen 인라인 로직 (2 파일) → 공용 alias.
- 종전 toLocaleString/getHours (5 지점) → 공용 포매터.
- 종전 aggregate no-op → net fold in-place.
- 종전 달력 이연 문구 → 배선 완료.
- 종전 Step #5 2컬럼 → 4컬럼.

**이연**: 전수 grep 확장 · Playwright 완전 자동화 · 다국가 매장 TZ.

---

## Kyu 실기 절 (처음 하는 사람 기준)

**진입 셋업**:
```bash
cd backend && npm run start:dev  # port 4000
cd web-admin && npm run dev      # port 4321
```

URL: `http://localhost:4321/payroll/run?use_pcon_engine=1` · Admin/Admin123!@# · Month = 5.

### Case (a) · 조정 이력 시각 Jakarta

1. 판정 표에서 Amel 5/1 [⚠ 조정] → 모달.
2. "조정 이력" 시각 = 로컬 저장 시각 (예: 15:58 저장 → 15:58 표시). 종전 08:58 (UTC) 재발 부재.

### Case (b) · 취소 모드 사유 * 숨김

1. 적용된 metric 옆 [취소] 클릭.
2. 인라인 "취소 사유 (필수)" 노출 · **하단 사유 * 부재**.

### Case (c) · Step #5 4컬럼

1. Step #5 집계 표 헤더 = 년/월/이름/근무일수/**지각횟수/지각시간/야근횟수/야근시간**/특이사항/계획/차이/반영·제외.
2. 총계 = `총 지각 N회 · XhYm` · `총 야근 M회 · XhYm`.

### Case (d) · 달력 색상

1. Step #5 에서 이름 클릭 → 달력 modal.
2. 지각 노랑 · 야근 빨강 · 조퇴 파랑.
3. 헤더 카운트 = Step #5 표와 일치.

### Case (e) · 집계 조정 반영

1. Amel [⚠ 조정] → 지각 강제 조정 → 0 저장.
2. Step #5 [재작업] → 지각횟수 -1 (실측 8 → 7 or 이력에 따라).
3. 종전 no-op 재발 부재.
