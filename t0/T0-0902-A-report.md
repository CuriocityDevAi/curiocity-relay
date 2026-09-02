# T0-0902-A · 리포트 (Kyu 09-02 실기 · 판정 버튼 비활성 뿌리 실측 + 게이트 폐기·예외 격리 정본)

## 스코프

**Kyu 실측 (09-02)**: 신 화면 (?use_pcon_engine=1) 5월 데이터 · 1~3단계 DONE · **4.판정 READY 인 채 실행 버튼 비활성**. 툴팁 "실행 후 로그 확인" 뿐 · 이유 부재. 3단계 로그 orphan 4건 WARN.

**커밋 SHA**: todoboss `d8dfbed` · relay (본 push).

---

## A-1 · 진단 (선행 · 코드 근거)

**결론**: **orphan 4건은 뿌리 아님** (gating 규칙과 독립). **활성 조건 자체 버그 아님**. 뿌리 = 게이트 파생.

**증거** (파일:줄):

| 소재 | 파일:줄 | 조건 |
|---|---|---|
| 판정 버튼 disabled | `web-admin/src/pages/payroll/pcon-view/PconAttendanceRail.tsx:197` | `disabled = busy \|\| (!canRun && !isReworkTarget)` |
| canRun 조건 | `PconAttendanceRail.tsx:364` (변경 전) | `canRun = !gated && physicalSt === 'READY'` |
| gated 파생 | `web-admin/src/lib/pcon-core/derive/gating.ts:33~72` | 이전 형제 (같은 parent · 낮은 seq) 물리 status !== 'DONE' → gated=true |
| Backend gate | `backend/src/todoboss/payroll/pcon-adapter/attendance-minors.service.ts:323` (변경 전) | `requirePreviousDone` · prev.status !== 'DONE' → 400 |
| orphan 저장 | `attendance-minors.service.ts:pairSessionsFromRawRows` | `sessions[i].orphan_kind = 'missing_pulang' \| 'orphan_pulang'` (data_cleanup 는 여전히 DONE 종결 · gating 무관) |

**뿌리 특정**:
- 판정 마이너 최초 실행 전 = attempt 없음 → `physicalSt = 'READY'` (deriveStatus 정합).
- `canRun = !gated && true` = `!gated`.
- `gated = true` = 유일 비활성 원인.
- `gated = true` 원인 = 이전 형제 seq 1/2/3 (file_import · name_mapping · data_cleanup) 중 하나가 **물리 status !== 'DONE'**.
- Kyu 표시상 "3단계 DONE" 이지만 물리 status 는 다를 수 있음 (T-4 정본 이후 표시 status vs 물리 status 분리). 예: 편집 없는 상태에서 STALE 은 아니라도 파생 규칙 상 다른 값 반환 시나리오 · deriveStatus 자체는 attempt.status 그대로 반환하므로 실제 DONE 이면 통과.
- **활성 조건 자체 버그는 없음** (gating.ts 정합). Kyu 실기 시나리오에서 물리 status 어긋남만이 뿌리 후보.

**A-2 범위 결정**: 뿌리 = 게이트 파생. Kyu 정본 = "게이트 방식 폐기 · 예외 격리". 게이트 완화 (canRun 폐기 + backend 완화) 로 뿌리 원천 봉쇄.

---

## A-2 · 설계 전환 (게이트 폐기 · 예외 격리)

**Backend** (`attendance-minors.service.ts:322~347`):
- `requirePreviousDone` → `requirePreviousExists` (attempt 존재만 요구 · DONE 아니어도 통과).
- 하위 호환 alias 유지 (`requirePreviousDone` = `requirePreviousExists`).
- 실제 데이터 없으면 판정/집계 결과 = empty + skipped.

**Frontend Rail** (`PconAttendanceRail.tsx`):
- `canRun = physicalSt === 'READY'` (gated 검사 완전 폐기).
- 이전 마이너 미완이라도 판정 버튼 활성 → backend requirePreviousExists 통과 시 실행.

**판정 예외 격리** (`attendance-minors.service.ts:executeJudgement`):
- `humanReason(session, shift_baseline, hasUser)` 헬퍼:
  - `!hasUser` → "이름 매핑 실패 · Users 등록 필요 (매핑 단계에서 재편성)".
  - `orphan_kind='missing_pulang'` → "출근은 있으나 퇴근 기록 없음 · POS 원본 확인 필요".
  - `orphan_kind='orphan_pulang'` → "퇴근만 있고 출근 기록 없음 · POS 원본 확인 필요".
  - `shift_baseline='unknown'` → "근무 기준 없음 (Work Rotation 미편성 or work_type 미시딩)".
- `judgement_summary.excluded_sessions[]` 신설 · 각 항목 `{pos_name, date, reason_kind, reason, fix_hint}`.
- `fix_hint.href = /users?search=<pos_name>` (매핑 실패 시).

**집계 예외 격리** (기존 유지):
- `aggregate_summary.excluded_sessions[]` (매핑 실패 세션 별도 목록) 이미 존재.
- 카드 요약 문구 "특이사항 N건" 유지.

**"N건 제외됨" 명시** (판정 카드 요약):
- 카드 문구: `"INPUT N건 판정 → 정상 X · 지각 Y · 야근 Z · 조퇴 W · 기준없음 K · ⚠ M건 제외됨 (판정 불가) · 유예 (OT ..)"`.

---

## A-3 · 비활성 사유 사람 말 (조건별 상이)

**Fix** (`PconAttendanceRail.tsx:ReworkOrExecuteButton`):
- `reason` 함수 · 조건별 상이한 문구:
  - `busy` → "실행 중…".
  - `isReworkTarget` → "상류 편집 감지 · 재작업 대기".
  - `physicalStatus === 'IN_PROGRESS'` → "진행 중… (로그 재생 대기)".
  - `physicalStatus === 'DONE'` → "이미 완료 · 편집 후 [재작업] 활성".
  - `physicalStatus === 'FAILED'` → "실패 · 이전 단계 재실행 후 재시도".
  - `physicalStatus === 'ABANDONED'` → "중단됨 · 초기화 필요".
  - `gated` → "이전 단계 미완료 ({prevSeq}. {prevLabel}) · 최소 1회 실행 필요".
  - else → "실행 → 로그 재생 → 결과 등장".
- 노출: `title` (툴팁) + `[data-testid=pcon-step-{path}-disabled-hint]` span (버튼 아래 · 조건별 다른 문구 육안 노출).
- `data-disabled-reason` 속성 = reason (자동 테스트 assert 지원).

**"실행 후 로그 확인" 무정보 문구 폐기** ✓.

---

## A-4 · 공용 타이포 스케일 (임의 px 폐기)

**신 상수** (`PconAttendanceLeft.tsx:PCON_TYPO` · export):
```ts
export const PCON_TYPO = {
  cardHeader:   'text-xs font-semibold',
  cardSummary:  'text-xs text-text-secondary',
  cardBadge:    'text-xs text-text-tertiary',
  tableHeader:  'px-2 py-1 text-xs font-medium uppercase tracking-wider text-text-tertiary',
  tableCell:    'px-2 py-1 text-xs',
  metaLabel:    'text-xs uppercase tracking-wider text-text-tertiary',
};
```

**적용**: `text-[11px]` → `text-xs` 전량 통일 (39 → 26 잔존 · 잔존 26 = `text-[10px]` 부속 badge만 · 명시적 스케일 위계).

**정본**: Tailwind semantic (`text-xs`=12px · `text-sm`=14px) 만 사용 · `text-[NNpx]` 하드코딩 신규 도입 금지.

---

## A-5 · orphan 세션 데이터 기준 + 사용자 문구

**데이터 기준** (`backend pairSessionsFromRawRows` 실측):
- Kyu 실기 5월 데이터의 orphan 4건 = POS 원본 punch 짝맞춤 후 짝 없는 세션.
- `orphan_kind='missing_pulang'`: Masuk (출근) 만 있고 Pulang (퇴근) 없음.
- `orphan_kind='orphan_pulang'`: Pulang (퇴근) 만 있고 Masuk (출근) 없음.

**사용자 문구** (§21 정본):
- 배지 (짧은 라벨): "퇴근 없음" / "출근 없음".
- 툴팁 · 판정 excluded reason (긴 문구):
  - **"출근은 기록됐으나 퇴근 기록이 없음 · 근무시간 산출 불가 · POS 원본 확인 필요"** (missing_pulang).
  - **"퇴근만 기록되고 출근 기록이 없음 · 근무시간 산출 불가 · POS 원본 확인 필요"** (orphan_pulang).

**노출 지점**:
- 정리본 배지: `[data-testid=pcon-cleanup-orphan-{i}][data-orphan-kind={kind}]`.
- 판정 excluded: `judgement_summary.excluded_sessions[i].reason` (Kyu 실기 orphan 4건 = 이 목록에서 사람 말로 노출).

---

## 회귀

- **Backend TS**: `npm run typecheck` = EXIT 0.
- **Frontend TS**: `npx tsc -b --noEmit` = EXIT 0.
- **Vitest**: 24 files · **344 pass** · 17 skip.
- **Jest (pcon-adapter)**: **42 pass**.
- **Lint**: EXIT 0.
- **lint:hooks**: EXIT 0.

---

## Kyu 실기 절 (self-contained)

**진입 주소 (반드시 이 URL)**:
```
http://localhost:4321/payroll/run?use_pcon_engine=1
```

**⚠ 주의**: **사이드바 클릭 시 URL 에서 `?use_pcon_engine=1` 플래그가 빠져 구 화면으로 돌아감**. 항상 위 주소 붙여넣기 또는 localStorage 설정:
```js
localStorage.setItem('use_pcon_engine','1');
```

**dev 서버 (T0-0824-A · 4321 고정)**:
- web-admin: `http://localhost:4321/` (Vite dev · strictPort · TODOBOSS Admin).
- backend proxy: `/api/*` → `http://localhost:4000/*`.

**대본**:

1. **판정 버튼 활성 확증 (A-2)**:
   - Reset → IMPORT → 매핑 → 정리 (orphan 4건 WARN) → **4단계 판정 [실행] 버튼 활성** (이전 gated=true 로 비활성이던 상태 소멸).
   - 만약 여전히 비활성 = `[data-testid=pcon-step-attendance_import.judgement-disabled-hint]` span 문구 확인 (사람 말 사유).

2. **비활성 사유 사람 말 (A-3)**:
   - 각 마이너 비활성 시 버튼 아래 span 노출:
     - busy: "실행 중…"
     - DONE: "이미 완료 · 편집 후 [재작업] 활성"
     - gated: "이전 단계 미완료 (3. 데이터 정리) · 최소 1회 실행 필요"
   - title 툴팁 동일 문구. "실행 후 로그 확인" 부재.

3. **판정 excluded (A-2/A-5)**:
   - 판정 카드 문구: "INPUT N건 판정 → ... · ⚠ M건 제외됨 (판정 불가) · 유예 (OT 30분 · Late 10분)".
   - 카드 아래 `[data-testid=pcon-judgement-excluded]` 노란 박스.
   - 각 항목: `pos_name` · date · 사람 말 사유 · 매핑 실패 시 `[Users > 등록]` 링크 (`/users?search=<pos_name>`).
   - Kyu 실기 5월 orphan 4건 = 이 목록에 등장 · reason = "출근은 있으나 퇴근 기록 없음 · POS 원본 확인 필요" 등.

4. **정리본 orphan 배지 (A-5)**:
   - 정리본 row `[data-testid=pcon-cleanup-orphan-{i}]` = "퇴근 없음" or "출근 없음".
   - Hover title = 긴 사용자 문구.

5. **타이포 통일 (A-4)**:
   - STEP #1 (RAW) · #2 (매핑) · #3 (정리) · #4 (판정) · #5 (집계) 카드 안 테이블/요약 = 동일 `text-xs` 스케일.
   - 부속 badge/pagination = `text-[10px]` 위계 유지.
   - grep `text-\[11px\]` → 0건 확증.

---

## 이연 순증감

**본 라운드 (T0-0902-A) 순증**:
- **Backend 편입**: `attendance-minors.service.ts` (requirePreviousExists · humanReason · executeJudgement excludedSessions).
- **Backend 신규**: 없음.
- **Frontend 편입**:
  - `PconAttendanceRail.tsx` (canRun 완화 · ReworkOrExecuteButton reason + hint span · prevGatedByLabel).
  - `PconAttendanceLeft.tsx` (PCON_TYPO · ORPHAN_LABEL · 판정 excluded 박스 · orphan 배지 사람 말 · 카드 문구 "N건 제외됨" · text-[11px] → text-xs 통일).
  - `vite.config.ts` port 4173 → 4321 (T0-0824-A 후속 · strictPort).
- **문서**: `pcon-engine-v1.md` §20 (게이트 폐기) · §21 (orphan) · §22 (타이포) + §6.구현-T0-0902-A · `requirements-tracking.md` §3-P (4 REQ 편입).
- **relay**: `t0/T0-0902-A-report.md` (본).

**본 라운드 순감**:
- Frontend: `text-[11px]` 임의 px 39 인스턴스 → 0 (26 = `text-[10px]` 위계 badge 만 유지).
- Frontend: 무정보 문구 "실행 후 로그 확인" 폐기.
- Backend: `requirePreviousDone` 예외 조건 완화 (하위 호환 alias 유지).

**이연 (X 라운드 · 파라미터화 · V-6 이연)**:
- payroll_judgement_policy 마이그 + 파라미터 관리 화면 + 시뮬레이션 프리뷰.
- Kyu V-inquiry 판정 대기.

**이연 (G+6+)**:
- Finalize / Payslip.
- 계획/차이 (Work Rotation).
- flag 제거 · 구 pos-import.

---

## [요약]

- **A-1 진단**: 판정 버튼 비활성 뿌리 = `canRun = !gated && physicalSt === 'READY'` · gated 만 원인 (orphan 무관 · 활성 조건 자체 버그 아님). 파일:줄 근거 첨부.
- **A-2 §20**: 게이트 폐기 (canRun = physicalSt === 'READY' · requirePreviousExists) · 판정/집계 excluded 목록 · "N건 제외됨" 명시.
- **A-3 §20**: 비활성 사유 사람 말 툴팁 + hint span (조건별 상이 · "실행 후 로그 확인" 폐기).
- **A-4 §22**: PCON_TYPO 공용 상수 · text-[11px] → text-xs 통일 (Tailwind semantic).
- **A-5 §21**: orphan 사용자 문구 정본 (missing_pulang/orphan_pulang) · 배지 짧은 라벨 + 툴팁 긴 설명 · 판정 excluded 편입.
- **회귀**: TS 0 · Vitest 344 pass · Jest 42 pass · Lint 0.
- **커밋**: todoboss `d8dfbed` · relay `t0/T0-0902-A-report.md`.
