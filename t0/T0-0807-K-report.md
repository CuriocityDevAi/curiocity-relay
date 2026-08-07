# T0-0807-K · 리포트 (게이트⑰ · J 실기 판정 · AI 연출 복원 + 정본 4 + row 편집 [DOC])

## 스코프

**Kyu J 실기 판정**: 기능 착지 ✓. 그러나 AI 연출 (Pacer) 전멸 + 정본 구체화 4 개 + row 편집 엔진 정본 신설.

**K 라운드**:
1. **K-1** Pacer 정본 복원 (최우선 · "AI스러움" 회복).
2. **K-2** RAW = 엑셀 A1 전량 (Kyu 정본 강화 · 상단 메타 절삭 금지).
3. **K-3** 결과 스택 최신 위 + 매핑 결과 정본.
4. **K-4** [DOC 전용] row 편집·재작업 엔진 정본 편입 (구현 = L).

## K-1 · Pacer 정본 복원 (최우선)

**뿌리 실측**:
- 로그 즉시 일괄 렌더 · DONE 즉시 접힘 · 카드 즉시 등장 → **"AI스러움" 소멸**.
- Kyu 판정: "human 템포 · 줄 간 의도적 간격 · 타임스탬프 체감" 회복 필요.

**Fix** (`web-admin/src/pages/payroll/pcon-view/PconAttendanceContext.tsx:250~340`):

**1. 로그 순차 노출 (`revealedByStepRun`)**:
```ts
const [revealedByStepRun, setRevealedByStepRun] = useState<Record<string, number>>({});
useEffect(() => {
  const timeouts: number[] = [];
  for (const [srid, arr] of Object.entries(logsByStepRunId)) {
    const revealed = revealedByStepRun[srid] ?? 0;
    if (revealed < arr.length) {
      const t = window.setTimeout(
        () => setRevealedByStepRun(prev => ({ ...prev, [srid]: Math.min(arr.length, (prev[srid] ?? 0) + 1) })),
        revealed === 0 ? 120 : 700,
      );
      timeouts.push(t);
    }
  }
  return () => timeouts.forEach(t => window.clearTimeout(t));
}, [logsByStepRunId, revealedByStepRun]);

const logsForMinor = (path) => {
  const cur = currentAttemptOf(path);
  const all = logsByStepRunId[cur.id] ?? [];
  const revealed = revealedByStepRun[cur.id] ?? 0;
  return all.slice(0, revealed);  // Pacer 소비.
};
```

**2. DONE 여운 (`holdOpen: Set<string>`)**:
- ANY→DONE 전이 감지 → holdOpen 에 즉시 추가.
- setTimeout 1500ms → holdOpen 삭제.
- `isCardExpanded` 최우선: `if (holdOpen.has(path)) return true` → 정본 DONE 접힘 정지.
- 1.5s 후: 부드러운 접힘 (아코디언 조건 miss).

**3. 카드 fade-in** (`web-admin/src/index.css:240~280`):
```css
@keyframes pconFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-pcon-fade-in { animation: pconFadeIn 500ms ease-out forwards; }

@keyframes pconLogLine {
  from { opacity: 0; transform: translateX(-3px); }
  to   { opacity: 1; transform: translateX(0); }
}
.animate-pcon-log-line { animation: pconLogLine 300ms ease-out forwards; }

@media (prefers-reduced-motion: reduce) {
  .animate-pcon-fade-in, .animate-pcon-log-line {
    animation: none !important; opacity: 1; transform: none;
  }
}
```

**4. Rail 로그 라인**: `<li className="animate-pcon-log-line">` (Pacer 순차 노출 시 각 라인 등장 애니메이션).

## K-2 · RAW = 엑셀 A1 전량 (상단 메타 절삭 금지)

**뿌리** (Kyu 판정): "진짜 RAW = A1부터 전 행 (회사명·제목·Period 포함) · # = 엑셀 row 번호 그대로 (8 vs 1 혼란 소멸)". J 판본은 헤더 이후 데이터만 렌더 → "8행 대상인데 좌 RAW 는 1부터" 인지 부조화.

**Backend Fix** (`backend/src/todoboss/payroll/pcon-adapter/attendance-file-import.service.ts:108~230`):
- `raw_matrix: string[][]` 저장 = **엑셀 A1부터 전 행** (`sheet_to_json({header:1})` 결과 그대로 stringify).
- `header_row_1based`: number 저장 (강조 기준).
- 파싱 (검증·매핑 산정) 은 `findHeaderRow` 기반 · 렌더와 완전 분리 (정본 원칙).

**Frontend Fix** (`web-admin/src/pages/payroll/pcon-view/PconAttendanceLeft.tsx:210~340`):
- 컬럼 헤더 = 엑셀 A/B/C/AA/... (`colLetter(idx)` 헬퍼).
- Row `#` = Excel 1-based row number 그대로 (`data-testid=pcon-raw-row-{excelRow}`).
- 헤더 행 (row=header_row_1based): `bg-surface-secondary font-semibold`.
- 데이터 행 (row > header_row_1based): name_mapping IN_PROGRESS/DONE 시 `bg-accent-light/20`.
- **데이터 구간 박스**: name_mapping 활성 시 `border-2 border-accent/60` 로 감쌈.
- **레전드**: `[data-testid=pcon-raw-highlight-legend]` = "매핑 대상 = N행부터".

## K-3 · 결과 스택 최신 위 + 매핑 결과 정본

**뿌리** (Kyu 판정):
- 2사분면 스택 = 최신 결과가 맨 위 (스크롤 강요 금지).
- 매핑 카드 문구 정본화.
- 매핑 결과 테이블 (엑셀 이름 ↔ Users 직원) 신설 (구 화면 재사용 방향).

**Fix** (`PconAttendanceLeft.tsx:70~200`):
- **역순 스택**: `sections` 배열 순서 = aggregate → data_cleanup → name_mapping → file_import.
- **집계 카드 문구 정본**: "INPUT 514건에서 발견된 이름 12건을 직원원장(Users)과 매핑 → OUTPUT 12건 (매핑 12 · 미매핑 0)".
- **매핑 결과 테이블** (`[data-testid=pcon-name-mapping-table]`):
  - 컬럼: 엑셀 이름 (POS) · → · 직원원장 (Users · full_name/name #id) · 경로.
  - `mapped_pairs[]` = backend 신설 (`attendance-minors.service.ts:150~190`).
  - source: `alias` / `staff_master` / `user_full_name` / `user_name` 표시.

**Backend Fix** (`backend/src/todoboss/payroll/pcon-adapter/attendance-minors.service.ts:150~215`):
- 매칭 시 각 pair 를 `mapped_pairs.push({pos_name, user_id, user_name, source})`.
- `anomalies[0].mapped_pairs` 저장 (프론트 소비).
- 정렬: pos_name locale-compare · unmapped_names 도 sort.

## K-4 · [DOC 전용] row 편집·재작업 엔진 정본 편입

`docs/design/pcon-engine-v1.md` §8 신설. **구현 = T0-0807-L 라운드**.

### §8.1 원칙 · 5 계명
1. 모든 마이너 결과 테이블 row 는 편집 가능. RAW 는 파괴 금지 (append-only).
2. 수정 사유 필수 (`reason` 컬럼 · 공백 금지).
3. 수정 row 시각 표식 (background + 세로 라인 · hover 툴팁 `before → after · 수정자 · 사유`).
4. 수정 시 계보 파생 → 후속 DONE 마이너 STALE · [재작업] 버튼 깜빡 (후속 전부 READY 면 무영향).
5. 재작업 실행 = 재작업 로그 append + 아코디언 재생.

### §8.2 스키마 (신설 예정)

```sql
CREATE TABLE pcon_row_edit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_run_id UUID NOT NULL REFERENCES pcon_step_run(id),
  row_key TEXT NOT NULL,
  field TEXT NOT NULL,
  before_value JSONB,
  after_value JSONB NOT NULL,
  reason TEXT NOT NULL CHECK (char_length(reason) > 0),
  actor_id INT NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**append-only 트리거**로 UPDATE/DELETE 차단.

### §8.3 UI 계약
- row 우측 `[✎ 편집]` → modal · 필드 인라인 편집 + 사유 필수 텍스트 필드 + [저장]/[취소].
- 저장 → POST `/api/admin/pcon/row-edit` → row_edit 삽입 + pcon_log emit + STALE 파생 트리거.
- 수정된 row: `data-edited="true"` · `border-l-4 border-l-accent bg-accent-light/10`.

### §8.4 헌법 정합
- ①-1 상태 파생 · ①-2 append-only · ①-3 검증 1급 · ①-4 연출 = 로그 재생 · ①-5 선언 계약 정합.

### §8.5 이연 (T0-0807-L)
- migration + POST endpoint + STALE 파생 규칙 (pcon-core) + UI modal.

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **341 pass** · 17 skip.
- **Jest (pcon-adapter)**: 7 pass.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.
- **npm 고정** · **포트 backend:4000/admin:4173 무변경**.

## 대본 재현 (Kyu 재실기 대비)

**초기화 → IMPORT (Pacer · A1 전량 · 여운) → 매핑 (최신 위 · 신 문구 · 테이블 · 대상 박스)**:

1. `[data-testid=pcon-reset-run]` → confirm → 신규 run.
2. IMPORT 5월 파일:
   - **로그 순차 등장** (700ms 간격 · `[data-testid=pcon-log-*]` 각각 `animate-pcon-log-line`).
   - file_import DONE → **1.5s 여운 유지** (`isCardExpanded=true` 유지) → 부드러운 접힘.
   - 결과 카드 `[data-testid=pcon-result-attendance_import.file_import]` = `animate-pcon-fade-in` fade-in.
   - **RAW 테이블** `[data-testid=pcon-raw-table]`:
     - 컬럼 헤더 = A, B, C, ... (엑셀 문자).
     - Row # = 엑셀 1-based (`[data-testid=pcon-raw-row-1]` = 회사명 · `[data-testid=pcon-raw-row-8]` = 헤더).
     - `data-header-row=8` 속성 (예).
     - 헤더 행 `bg-surface-secondary font-semibold`.
3. name_mapping [실행] 클릭:
   - IN_PROGRESS 진입 → **RAW 데이터 구간 박스** `[data-testid=pcon-raw-band][data-highlight=true]` (border-2 border-accent) · 데이터 행 `bg-accent-light/20`.
   - 레전드 `[data-testid=pcon-raw-highlight-legend]` = "매핑 대상 = 9행부터".
   - name_mapping DONE → **결과 카드 맨 위로** (스택 역순).
   - **문구 정본**: `[data-testid=pcon-aggregate-card-attendance_import.name_mapping]` = "INPUT 514건에서 발견된 이름 12건을 직원원장(Users)과 매핑 → OUTPUT 12건 (매핑 12 · 미매핑 0)".
   - **매핑 테이블** `[data-testid=pcon-name-mapping-table]`: 엑셀 이름 · → · Users 직원 · 경로 (alias/staff_master/user_full_name/user_name).
   - name_mapping 아코디언 1.5s 여운 → 접힘.

## 이연 순증감

**본 라운드 (T0-0807-K) 순증**:
- **Backend** 2개 파일:
  - `attendance-file-import.service.ts` (raw_matrix + header_row_1based 저장).
  - `attendance-minors.service.ts` (mapped_pairs 배선).
- **Frontend** 3개 파일:
  - `PconAttendanceContext.tsx` (Pacer revealedByStepRun · holdOpen 여운).
  - `PconAttendanceLeft.tsx` (엑셀 A1 렌더 · 매핑 테이블 · 스택 역순).
  - `PconAttendanceRail.tsx` (로그 라인 fade-in class).
- **CSS**: `index.css` (@keyframes pconFadeIn/pconLogLine · prefers-reduced-motion).
- **문서**:
  - `pcon-engine-v1.md` §6.구현-K + §8 row 편집 정본.
- **리포트**: relay `t0/T0-0807-K-report.md` (J 청소 · K 게시).

**본 라운드 (T0-0807-K) 순감**:
- Frontend: `PconAttendanceLeft.tsx` J 판본 raw_rows_full 소비 코드 → raw_matrix 로 교체 (~40 lines diff).

**이연 (T0-0807-L · row 편집 구현)**:
- pcon_row_edit migration + entity + service + controller.
- UI 편집 modal + hover 툴팁.
- STALE 파생 규칙 (pcon-core deriveStaleness).
- 재작업 트리거 · [재작업] 버튼 (paced-action-pulse 재사용).

**이연 (G+5 2탄)**:
- data_cleanup 실 로직 · aggregate 실 로직.
- alias 자동 승격 · G+6 flag 제거.

## [요약]

- **K-1** Pacer 정본 복원: `revealedByStepRun` (700ms/줄) · `holdOpen` (1500ms 여운) · CSS fade-in.
- **K-2** RAW = 엑셀 A1 전량 (raw_matrix) · 데이터 구간 name_mapping 활성 시 강조 박스.
- **K-3** 결과 스택 역순 (최신 위) · 매핑 결과 테이블 (엑셀 이름 ↔ Users) · 문구 정본.
- **K-4** [DOC] pcon-engine-v1.md §8 row 편집·재작업 엔진 정본 (5 계명 · 스키마 · UI 계약 · 헌법 정합 · 구현 L).
- **회귀**: TS 0 (backend + frontend) · Lint 0 · lint:hooks 0 · Vitest 341 pass · Jest 7 pass.
- **커밋**: T0-0807-K (본 커밋 SHA).
