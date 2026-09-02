# T0-0902-C · 리포트 (A 잔여 2건 · 타이포 1종 통일 · 판정 로그 오표기 fix)

## 스코프

**Kyu 09-02 실기 결과**: A 라운드 4항 중 3항 통과. 잔여 2건:
- A-4 타이포 통일 미흡 → **C-1 재작업** (1종 통일).
- 판정 카드 로그 "OUTPUT 0" 오표기 → **C-2 뿌리 fix**.

**커밋 SHA**: todoboss `d88800a` (T0-0902-A branch force-update to d88800a · PR #20 갱신) · relay 본 push.

**Kyu 실기 판정 분포 (성공 확증 · 전부 정상 아님)**:
- 정상 82 · 지각 5 · 야근 161 · 조퇴 9 · 기준없음 2 · 2건 제외 = 총 259 (A-2 성공).

---

## C-1 · 타이포 재작업 (좌측 영역 1종 통일)

### Kyu 판정 (재해석 금지)

> 마이너 프로세스마다 적절한 크기를 고르는 방식 자체를 폐기. 좌측 결과 영역 전체를 **가장 작은 폰트 하나**로 통일. 위계는 **굵기와 색으로만** 구분 · 크기로 구분 금지. 배지·pagination 등 부속도 같은 크기.

### 뿌리

A-4 정본 (T0-0902-A) 은 semantic 다단계 (text-xs · text-[10px] · text-sm) 허용 · 위계 표현. Kyu 실측 = 카드마다 크기 편차로 결과 표현이 제각각 · 읽기 나쁨.

### Fix

**적용** (`web-admin/src/pages/payroll/pcon-view/PconAttendanceLeft.tsx`):
- `text-[10px]` (26) → `text-xs` 전량 치환.
- `text-sm` (4) → `text-xs`.
- `text-[9px]` (1) → `text-xs`.

**PCON_TYPO 상수 재정의** (`PconAttendanceLeft.tsx:23~34`):
```ts
export const PCON_TYPO = {
  cardHeader: 'text-xs font-semibold',    // 위계 = 굵기.
  cardSummary: 'text-xs text-text-secondary',  // 위계 = 색.
  cardBadge: 'text-xs text-text-tertiary',
  tableHeader: 'px-2 py-1 text-xs font-medium uppercase tracking-wider text-text-tertiary',
  tableCell: 'px-2 py-1 text-xs',
  metaLabel: 'text-xs uppercase tracking-wider text-text-tertiary',
};
```

### 실측 결과 (Kyu 요구 · 몇 종 남았는지)

```bash
$ grep -o 'text-\[[0-9]*px\]\|text-xs\|text-sm\|text-base\|text-lg' \
    web-admin/src/pages/payroll/pcon-view/PconAttendanceLeft.tsx | sort -u
text-xs
```

**결과 = 좌측 영역 폰트 크기 1종 (`text-xs` 12px) · 66 인스턴스 전량 통일** (목표 1종 달성).

---

## C-2 · 판정 로그 오표기 fix

### Kyu 관찰

우측 4.판정 카드 로그 = `"완료 · INPUT 259 → OUTPUT 0 + 검증실패 0"`. 실제 259건 판정 · 좌측 카드에는 정상 82·지각 5·야근 161·조퇴 9·기준없음 2 정확 표기. OUTPUT 0 = 오표기.

### 뿌리 특정 (파일:줄)

**`web-admin/src/pages/payroll/pcon-view/PconAttendanceRail.tsx:59~69` `renderLogText` case `'step_completed'`**:

```ts
case 'step_completed':
  if (typeof p.rows === 'number') { ... }           // aggregate 형식.
  if (typeof p.paired_count === 'number') { ... }   // data_cleanup 형식.
  if (typeof p.unmapped === 'number') { ... }       // name_mapping 형식.
  return `완료 · INPUT ${p.input ?? 0} → OUTPUT ${p.output ?? 0} + 검증실패 ${p.skipped ?? 0}`;  // 기본 fallback.
```

**backend 판정 서비스** (`attendance-minors.service.ts:executeJudgement`) log emit:
```ts
params: {
  input: sessions.length,
  normal: normalCount,
  late: lateCount,
  ot: otCount,
  early_leave: earlyLeaveCount,
  unknown: unknownCount,
}
```
- `output` · `skipped` · `rows` · `paired_count` · `unmapped` 어느 필드도 없음.
- 프론트 분기 중 `rows`/`paired_count`/`unmapped` 매치 안 됨 → **기본 fallback** → `OUTPUT ${p.output ?? 0}` = 0.

**결론**: 판정 마이너 params 는 실제 정보를 담고 있으나 프론트가 인식 못함 · 오표기.

### 다른 마이너 점검 (Kyu 요구)

| 마이너 | emit params | 프론트 분기 | 문구 정합 |
|---|---|---|---|
| file_import | `{input, output, skipped}` | fallback | "INPUT xx → OUTPUT xx + 검증실패 xx" **OK** |
| name_mapping | `{input, output, unmapped}` | `p.unmapped` | "매핑 X건 · 미매핑 X" **OK** |
| data_cleanup | `{raw_count, paired_count, orphan_count}` | `p.paired_count` | "정리 X행 · orphan X" **OK** |
| judgement | `{input, normal, late, ot, early_leave, unknown}` | (없음 · fallback) | **오표기** |
| aggregate | `{input, rows, warnings}` | `p.rows` | "집계 X행 · 경고 X" **OK** |

**결론**: **judgement 만 오표기 · 다른 마이너 이상 없음**.

### Fix (`PconAttendanceRail.tsx:59~69`)

신 분기 (최우선 감지):
```ts
if (
  typeof p.normal === 'number' ||
  typeof p.late === 'number' ||
  typeof p.ot === 'number' ||
  typeof p.early_leave === 'number'
) {
  const total = (p.input as number | undefined) ?? 0;
  return `완료 · ${total}건 판정 · 정상 ${p.normal ?? 0} · 지각 ${p.late ?? 0} · 야근 ${p.ot ?? 0} · 조퇴 ${p.early_leave ?? 0} · 기준없음 ${p.unknown ?? 0}`;
}
```

Kyu 실기 예상 로그:
```
완료 · 259건 판정 · 정상 82 · 지각 5 · 야근 161 · 조퇴 9 · 기준없음 2
```

---

## 회귀

- **Backend TS**: EXIT 0.
- **Frontend TS**: EXIT 0.
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

⚠ 사이드바 클릭 시 URL 에서 `?use_pcon_engine=1` 플래그가 빠져 **구 화면으로 돌아감**. 항상 위 주소 붙여넣기 또는 `localStorage.setItem('use_pcon_engine','1')`.

### Case C-1 · 폰트 1종 통일

- [ ] 좌측 STEP #1~#5 카드 안 모든 텍스트 (헤더·요약·테이블 셀·배지·pagination) 크기 동일 (12px = `text-xs`).
- [ ] DevTools: `getComputedStyle(document.querySelector('[data-testid=pcon-attendance-left]')).fontSize` 하위 요소 관찰 = 12px 만.
- [ ] grep 실측: `document.querySelectorAll('[class*="text-[10px]"]').length === 0`.
- [ ] 위계 구분 = 굵기/색 (예: STEP 헤더는 굵고 진한 색 · 셀은 얇고 tertiary 색).

### Case C-2 · 판정 로그 실 분포 표기

- [ ] 우측 4.판정 카드 아코디언 로그 = "완료 · 259건 판정 · 정상 82 · 지각 5 · 야근 161 · 조퇴 9 · 기준없음 2" (Kyu 실기 수치).
- [ ] "OUTPUT 0" · "검증실패 0" 문구 부재.
- [ ] 다른 마이너 로그 (file_import · name_mapping · data_cleanup · aggregate) 문구 정합 유지 (기존 형식 그대로).

---

## 이연 순증감

**본 라운드 (T0-0902-C) 순증**:
- **Frontend 편입**:
  - `PconAttendanceLeft.tsx` (PCON_TYPO 재정의 · text-[10px]/text-sm/text-[9px] → text-xs 전량 치환).
  - `PconAttendanceRail.tsx` (renderLogText step_completed · judgement 분기 신설).
- **문서**: `pcon-engine-v1.md §22-C` (폰트 1종 통일) · `§23` (판정 로그) · `requirements-tracking.md §3-P` (2 REQ 편입).
- **relay**: `t0/T0-0902-C-report.md` (본).

**본 라운드 순감**:
- Frontend: `text-[10px]` · `text-sm` · `text-[9px]` 31 인스턴스 (좌측 전량 소멸).
- Frontend: 판정 마이너 로그 "OUTPUT 0" 오표기 (기본 fallback 미매치 → 신 분기).

**이연 (다음 라운드 · Kyu 결정 대기)**:
- 파라미터화 (V-6 · X 순연 유지).
- Kyu W 판정 잔여 (있으면).

**이연 (G+6+)**: Finalize · Payslip · Work Rotation 편성 · flag 제거.

---

## [요약]

- **C-1**: 좌측 영역 폰트 4종 (text-xs / text-[10px] / text-sm / text-[9px]) → **1종 (text-xs 12px)** 통일. 위계 = 굵기+색만. 실측 66 인스턴스 전량.
- **C-2**: 판정 로그 뿌리 = `PconAttendanceRail.tsx:59~69 renderLogText step_completed` 기본 fallback 이 judgement params (normal/late/ot/…) 미인식 → OUTPUT 0. Fix = 신 분기 최우선 감지 → 실 분포 문구. 다른 마이너 오표기 없음.
- **회귀**: TS 0 · Vitest 344 · Jest 42 · Lint 0.
- **커밋**: todoboss `d88800a` (T0-0902-A branch 갱신 = PR #20) · relay `t0/T0-0902-C-report.md`.
