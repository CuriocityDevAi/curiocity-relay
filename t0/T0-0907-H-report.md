# T0-0907-H · 리포트 (조정 유형 통합 · 취소 후 링크 부재 · 용어 정정)

## 스코프

**Kyu 09-07 실기 결과** (G 이후): 태그 순서·불투명 툴팁·revert 이력 = 통과. 결함 2 + 용어 정정 요구.

**커밋 SHA**: todoboss `fb64428` (branch `feat/payroll-p3-e-df-h` · PR #20 base).

---

## H-1 · 조정 유형 metric 당 하나 통합 (Kyu 결정)

### 뿌리 (G 실기)

"지각 면제" · "지각 부분" 라디오가 별개 · 서버 net fold 는 late 하나. 둘 다 "적용됨" 표시 + [취소] 입력창이 두 줄에 동시 열림 · 취소 사유 복제.

### 정본 (재론 금지)

- metric 당 유형 하나: **지각 강제 조정 · 야근 강제 조정 · 조퇴 강제 조정**.
- 분 입력 필드 하나 · 기본값 0 · "N → [ M ] 분" 형태.
- **입력 0 = excused (면제) · 입력 >0 = partial (부분)** — UI 파생.
- decision_type 은 whitelist (기존) 재사용 · **마이그 불필요**.
- 조퇴는 whitelist 에 partial 부재 → UI 에서 >0 저장 방어 (BadRequest).
- 적용된 metric 은 "적용됨 (원값→새값)" + [취소] **한 줄만**.

### Fix (파일:줄)

- `web-admin/src/pages/payroll/pcon-view/PconOverrideModal.tsx:59~103` (ADJUST_OPTIONS 3개).
- `PconOverrideModal.tsx:143~200` (분 입력 · 파생 로직 · early_leave partial 방어).
- `PconOverrideModal.tsx:353~465` (라디오 그룹 · 미적용 metric 만 선택 가능 · 분 입력).

---

## H-2 · 조정 취소 후 셀 링크 부재

### 뿌리

Kyu 실측: 조정 취소 후 원값 복귀 · Late 셀의 밑줄 "사유" 눌러도 팝오버 안 뜸.

### 정본

- **net.applied=false → 셀에 취소선·화살표·조정사유 링크 전부 부재** · 원값만.
- 이력은 모달에서만 열람.

### Fix

- `web-admin/src/pages/payroll/pcon-view/PconOverrideCell.tsx:97~112`:
  ```tsx
  if (!metricNet.applied) {
    return (
      <span data-net-applied="false">
        {baseValue > 0 ? formatMinutes(baseValue) : '-'}
      </span>
    );
  }
  ```
  (종전: `relevant.length === 0 || !metricNet.applied` 인데 `relevant.length > 0` 이면 링크 그림 → applied=false 여도 링크가 남아있던 버그. 단순화 = applied 검사만.)

---

## H-3 · 전역 용어 정정 (번복 → 조정)

| 종전 | 정본 |
|---|---|
| 번복 | 조정 |
| 번복 이력 | 조정 이력 |
| 번복 유형 | 조정 유형 |
| ⚠ 번복 (버튼/컬럼) | ⚠ 조정 |
| 판정 번복 (모달 제목) | 판정 조정 |
| 사유 (셀 링크) | 조정사유 |

### 실측 grep

```bash
$ grep -rln "번복" backend/src web-admin/src web-admin/e2e docs tools 2>/dev/null | wc -l
0
```

**전역 0건** (감사 로그 · 마이그 주석 · 문서 · 테스트 문자열 포함).

---

## 자기 검증 (Playwright · Chromium · 4/4 pass)

**Spec**: `web-admin/e2e/pcon-verify/t0-0907-h-self-check.spec.ts`.

```
✓ H-a · 모달 조정 유형 3개 + 분 입력 스샷 (9.4s)
✓ H-b · 지각 0분 저장 → 셀 "~~27분~~ → 0분 조정사유" (9.6s)
✓ H-c · 15분 저장 → "~~27분~~ → 15분" · 태그 지각 유지 (11.0s)
✓ H-d · [취소] → 원값 27분 · 링크 부재 (10.5s)
4 passed (41.3s)
```

### 스크린샷 (첨부 · Kyu 정본 실증)

- `T0-0907-H-screenshots/H-a-modal-3-metric-inputs.png` : 모달 조정 유형 = "지각 강제 조정" + "야근 강제 조정" (Amel 5/1 은 early_leave 부재 → 2개). 지각 metric 선택 시 아래 분 입력 `27 → [0] 분 (0 = 면제)`. 상단 태그 = [지각, 야근]. 조정 이력 4건.
- `T0-0907-H-screenshots/H-b-late-cell-0min.png` : 지각 셀 = **"~~27분~~ → 0분 조정사유"** (사유 링크 = "조정사유" 라벨 · 취소선 + 새값).
- `T0-0907-H-screenshots/H-c-late-cell-15min-tag-late-kept.png` : Amel row 판정 · 지각 셀 = **"~~27분~~ → 15분 조정사유"** · 상태 태그 = **"지각" · "야근"** 유지 (H-3 정본 · partial 은 태그 유지). 출근 셀 노랑 유지 (사실).
- `T0-0907-H-screenshots/H-d-late-cell-restored-no-link.png` : 취소 후 지각 셀 = **"27분"** 만 (취소선·화살표·조정사유 링크 전부 부재 · H-2 정본).

### expect 어설션 (spec 안)

- H-a: `[pcon-override-metric-late]` · `[pcon-override-metric-ot]` 라디오 visible.
- H-c: 셀 hover 시 `data-tags` 에 `"late"` 포함 확증.
- H-d: 셀 `data-net-applied="false"` 확증.

---

## 회귀

- **Backend Jest**: 152 suites · **1934 pass**.
- **Frontend TS**: EXIT 0.
- **Vitest**: 27 files · **374 pass** · 17 skip.
- **Lint**: 5 pre-existing backend errors (F/E 이전) · 이번 라운드 회귀 없음.
- **Playwright**: 4/4 pass.
- **Grep 번복**: 0건.

---

## 이연 순증감

**본 라운드 (T0-0907-H) 순증**:
- **Backend** (주석만):
  - `shift-baseline.ts` (조정 취소 주석).
  - `pcon-override.service.ts` (조정 취소 주석).
  - `pcon-override.entity.ts` (조정 취소 주석).
  - `1700000000269-...ts` (조정 취소 주석).
- **Frontend**:
  - `PconOverrideModal.tsx` (ADJUST_OPTIONS · 분 입력 · 파생 로직 · 라디오 통합).
  - `PconOverrideCell.tsx` (H-2 net.applied=false 원값만 · 조정사유 라벨).
  - `PconAttendanceLeft.tsx` (컬럼 헤더 "조정" · 버튼 "⚠ 조정" · 툴팁 라벨).
  - `PconAttendanceContext.tsx` (주석 조정).
- **e2e**: `t0-0907-h-self-check.spec.ts` (신설 · 4 spec).
- **문서**: `pcon-engine-v1.md §36` (원칙 명문화) · `requirements-tracking.md §3-P` (3 REQ).
- **relay**: `t0/T0-0907-H-report.md` + 4 스샷.

**본 라운드 순감**:
- 종전 DECISION_OPTIONS 5개 (면제/부분 분리) · isPartial · partialValue → 통합 ADJUST_OPTIONS 3개.
- 종전 셀 링크 (applied=false 여도 relevant.length>0 이면 표시) → applied 만 검사.
- 종전 "번복" 용어 (감사/UI/docs/코드 전역) → "조정" 통합.

**이연 (다음 라운드 · Kyu 결정 대기)**:
- Playwright 완전 시나리오 (파일 업로드부터 5클릭까지 자동화).
- Users.role vs Roles 배열 다중 표기.
- 파라미터화 (V-6 · X 순연).

**이연 (G+6+)**: Finalize · Payslip · Work Rotation 편성 · flag 제거.

---

## [요약]

- **H-1**: 조정 유형 metric 당 하나 · 분 입력 · 0=면제 · >0=부분 UI 파생 (whitelist 재사용 · 마이그 불필요).
- **H-2**: net.applied=false → 셀 원값만 (링크·팝오버 부재) · 이력은 모달에서만.
- **H-3**: 번복→조정 전역 정정 · grep 0건 · 셀 링크 "사유"→"조정사유".
- **회귀**: Jest 1934 · Vitest 374 · TS 0 · Lint 회귀 0.
- **자기 검증**: Playwright 4 spec pass · 4 스샷 (a~d).
- **커밋**: todoboss `fb64428` · relay `t0/T0-0907-H-report.md`.
