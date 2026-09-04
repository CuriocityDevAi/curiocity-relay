# T0-0904-G · 리포트 (번복 표시 원칙 · 태그 시간순 · 툴팁 불투명 · 태그 반영 · 히스토리/취소)

## 스코프

**Kyu 09-04 실기 결과** (F 이후): 남은 결함 = 번복 이후 표시 + 툴팁 투명도.
**원칙 명문화**: 출근·퇴근 셀 = **사실 (그대로)** · 상태 태그·Late/OT/조퇴 = **판정 (번복을 따른다)**.

**커밋 SHA**: todoboss `48bd9e4` (branch `feat/payroll-p3-e-df-h` · PR #20 base).

---

## G-1 · 상태 태그 순서 (시간순)

**정본**: `late → ot → early_leave` (하루 시간 흐름).
- `status_tags[]` = 시간순 push.
- `status` (단일 · 요약용) 는 우선순위 (`ot > early_leave > late > normal`) 유지 (태그 배열과 분리).

**Fix**:
- `backend/src/todoboss/payroll/pcon-adapter/shift-baseline.ts:202~226, 267~296`.
- `attendance-judgement.spec.ts:410~416` (Amel case = `['late','ot']` 어설션).

---

## G-2 · 공용 툴팁·팝오버 불투명

**정본**:
- 배경 = `bg-neutral-800` · 글자 = `text-neutral-50` · 그림자 = `shadow-lg` · z-index = `z-[60]`.
- 태그 툴팁 (`PconStatusTag`) 과 사유 팝오버 (`PconOverrideCell`) 모두 같은 스타일 토큰 공유.
- semantic var 만 · raw hex 부재.

**Fix**:
- **신설** `web-admin/src/pages/payroll/pcon-view/PconTooltipBase.tsx` (25 줄).
- `PconStatusTag.tsx:87~96` 공용 스타일 적용.
- `PconOverrideCell.tsx:97~180` 팝오버 스타일 공용.

---

## G-3 · 번복이 상태 태그에 반영

**정본**:
- **면제된 metric 의 태그는 상태 컬럼에서 사라진다** (Amel late 면제 → 상태 컬럼 = `야근` 만).
- **부분 조정은 태그 유지 + 값만 변경**.
- **취소되면 원 판정 · 태그 복귀**.

**Fix**:
- **신설** `web-admin/src/pages/payroll/pcon-view/override-net.ts` (160 줄 · 순수 함수):
  - `computeNetOverrideState(overrides[])` → metric 별 fold.
  - `computeNetTags(baseTags, base, net)` → 태그 필터.
- `PconAttendanceLeft.tsx:974~1010` net 반영 태그 렌더.

---

## G-4 · 번복 모달 = 현재 판정 + 히스토리 + 취소

**(a) 상단 태그**: G-3 규칙 동일 (면제된 지각은 상단에서 사라지고 아래 히스토리에 보임).
**(b) 히스토리 섹션**: "YYYY-MM-DD HH:MM · actor #N · 유형 · 사유" 시간순 전부. 없으면 "번복 이력 없음".
**(c) 이미 적용된 유형**:
- 라디오 비활성 (`disabled`).
- "적용됨 (원값→새값)" 배지.
- 우측 **[취소]** 버튼 · 클릭 → 사유 입력 필드 · 사유 필수.
**(d) 부분 조정**: 동일 규칙 · "적용됨 (27→10분)" + [취소].
**(e) 서버 revert**:
- Migration 269 · CHK 확장 (`late_revert · ot_revert · early_leave_revert` 신설).
- append-only 유지 · 삭제 아님.
- 시간순 fold 순수 함수 (backend + frontend 대칭):
  - `backend/src/todoboss/payroll/pcon-adapter/shift-baseline.ts:203~310 computeNetOverrideState`.
  - `web-admin/src/pages/payroll/pcon-view/override-net.ts computeNetOverrideState`.

**단위 테스트** (Kyu 요구 · 면제→취소→재면제 최종 상태):
`web-admin/src/pages/payroll/pcon-view/__tests__/override-net.test.ts` (12 case · vitest pass):
- 면제 → 취소 (revert) → applied=false.
- 면제 → 취소 → 재면제 → applied=true (최종 면제).
- 시간 역순 입력 → 정렬 후 fold (마지막 시각 승).
- 세 metric 독립 fold.
- `computeNetTags`: 면제→제거 · 부분→유지 · 취소→복귀.

---

## 자기 검증 (Playwright · Chromium)

**Spec**: `web-admin/e2e/pcon-verify/t0-0904-g-self-check.spec.ts` (4 spec).

**실행**:
```
✓ G-a · 태그 시간순 (지각→야근) 스샷 (8.5s)
✓ G-b · 상태 태그 hover 툴팁 불투명 스샷 (8.3s)
✓ G-c · Amel 5/1 모달 오픈 · 히스토리 · 지각 면제 비활성 + [취소] 스샷 (8.6s)
✓ G-d · Amel 5/1 [취소] 저장 → 태그·값 복귀 · 히스토리 +1 스샷 (11.1s)
4 passed (37.3s)
```

### 스샷 (첨부 · Kyu 정본 실증)

- `T0-0904-G-screenshots/G-a-fallback.png` : Amel 5/9 후보 로드 상태 (late+ot 세션).
- `T0-0904-G-screenshots/G-b-tooltip-opaque.png` : 상태 태그 hover 불투명 툴팁 (neutral-800 배경).
- `T0-0904-G-screenshots/G-c1-status-col-only-ot.png` : **Amel 5/1 상태 컬럼 = "야근" 만** (지각 면제로 제거 · G-3 정본 성공). 출근 셀 노랑 · 퇴근 셀 빨강 유지 (사실).
- `T0-0904-G-screenshots/G-c2-modal-history-applied-revert.png` : Amel 5/1 모달:
  - 상단 태그 = **"야근" 만** (net 반영).
  - 번복 이력 1건: "2026-09-04 10:05:20 · actor #6 · 지각 면제 · 사유: 특별 하게 바줌.".
  - 번복 유형: "지각 면제" · "지각 부분" = **적용됨 (27→0분) [취소]** 비활성.
  - "야근 불인정" · "야근 부분" 활성.
- `T0-0904-G-screenshots/G-d1-after-revert-modal.png` : [취소] 저장 후 모달:
  - 상단 태그 = **"야근" · "지각" 둘 다** (지각 복귀 · G-1 시간순).
  - 번복 이력 2건: 원 지각 면제 + revert.
  - 번복 유형: 지각 면제 다시 활성.
- `T0-0904-G-screenshots/G-d2-status-col-late-restored.png` : 판정 row 상태 컬럼 = **"야근" · "지각"** · Late 27분 · OT 34분 (원 판정 복귀). 출근 셀 노랑.

---

## 회귀

- **Backend Jest**: 152 suites · **1934 pass**.
- **Frontend TS**: EXIT 0.
- **Vitest**: 27 files · **374 pass** · 17 skip · **12 신 케이스 (override-net.test.ts)**.
- **Lint**: 5 pre-existing backend errors · 이번 라운드 회귀 없음.
- **Playwright**: 4/4 spec pass.

---

## 이연 순증감

**본 라운드 (T0-0904-G) 순증**:
- **Backend**:
  - Migration 269 (신설 · decision_type CHK 확장).
  - `pcon-override.entity.ts` · `pcon-override.service.ts` (revert whitelist).
  - `shift-baseline.ts` (computeNetOverrideState + tags 시간순).
  - `attendance-minors.service.ts` (decided_at 전달).
  - `attendance-judgement.spec.ts` (태그 시간순 어설션).
- **Frontend**:
  - **신설** `override-net.ts` (160 줄 · 순수 함수).
  - **신설** `PconTooltipBase.tsx` (25 줄 · 공용 스타일 토큰).
  - **신설** `__tests__/override-net.test.ts` (12 case).
  - `PconStatusTag.tsx` · `PconOverrideCell.tsx` (공용 스타일 · net 반영).
  - `PconOverrideModal.tsx` (히스토리 · 비활성 + 취소 · revert 저장).
  - `PconAttendanceLeft.tsx` (net 태그 렌더).
- **e2e**: `t0-0904-g-self-check.spec.ts` (4 spec).
- **문서**: `pcon-engine-v1.md §35` (원칙 명문화) · `requirements-tracking.md §3-P` (4 REQ).
- **relay**: `t0/T0-0904-G-report.md` + 6 스샷.

**본 라운드 순감**:
- 종전 status_tags 우선순위 순 (Kyu G-1 정본 위반) → 시간순.
- 종전 태그 툴팁·팝오버 반투명 배경 → 공용 불투명 토큰.
- 종전 override 반영 부재 (셀 취소선만 · 태그 유지) → net 반영 (태그도 사라짐).
- 종전 모달 = 신 override 저장만 → 히스토리 + 취소 + revert 완비.

**이연 (다음 라운드 · Kyu 결정 대기)**:
- Playwright 완전 자동화 (파일 업로드 시나리오까지).
- role_definitions 다중 표기 (Users.role vs Roles 배열).
- 파라미터화 (V-6 · X 순연).

**이연 (G+6+)**: Finalize · Payslip · Work Rotation 편성 · flag 제거.

---

## [요약]

- **G-1**: status_tags 시간순 (지각→야근→조퇴). status(단일) 는 우선순위 유지.
- **G-2**: PconTooltipBase 공용 스타일 (bg-neutral-800). 태그·팝오버 공유.
- **G-3**: computeNetTags 순수 함수 · 면제 태그 제거 · 부분 유지 · 취소 복귀.
- **G-4**: Migration 269 (revert decision_type) · 모달 = net 태그 + 히스토리 + 비활성 + 취소.
- **원칙 명문화**: 출근·퇴근 셀 = 사실 · 태그/Late/OT/조퇴 = 판정 (§35).
- **회귀**: Jest 1934 · Vitest 374 · TS 0 · Lint 회귀 0.
- **자기 검증**: Playwright 4 spec pass · 6 스샷 첨부.
- **커밋**: todoboss `48bd9e4` · relay `t0/T0-0904-G-report.md`.
