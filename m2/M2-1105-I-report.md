---
round: M2-1105-I
pr:
  fork: agilo-medusa-pos-fork#42
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/42
  fork_commit: 6f8d0e8
outcome: lint CI green · prettier 위반 3건(2 파일) 자동 포맷 · 로직·JSX 구조 변경 0
kyu_checks: 0 (CI-only · 포맷만)
---

# M2-1105-I · lint CI 빨강 해소 (prettier 자동 포맷)

**일자**: 2026-11-07 · **허브**: M2 · **성격**: chore (CI 복구) · **승인**: 사전 "허브-1107-I · work-queue #7b".

---

## 0. 원문 (work-queue #7b)

fork master(`fcf99db`) 의 lint CI 가 `components/**/PrinterRow*` prettier 위반 2건 (M1-1105-I 리포트 §NOTE 에 M2 후속 과제로 등재돼 있던 2건) 때문에 빨강. 포맷만 고쳐 lint green 으로.
- `npx prettier --write` 해당 파일만.
- 다른 파일에 prettier 위반이 더 있으면 같은 PR 에 포함 + 리포트에 목록.
- CI 전 job green 확인.

---

## 1. 산출물 (PR #42)

### 변경 파일 목록

| 파일:줄 | 위반 | 소유 라운드 |
|---------|------|-------------|
| `components/printer/PrinterRow.tsx:10` | import block 1 줄 수용 (최대 폭 안) | **M2-1105-C** (#26) · pre-existing (M1-1105-I §NOTE 명시) |
| `components/printer/PrinterRow.tsx:51` | 삼항 연산자 inline | **M2-1105-C** (#26) · pre-existing |
| `components/setup-wizard/StockLocationSelectionStep.tsx:88` | `<Text>` 문자열 1줄 수용 | **M1-1105-H** (#35) · 신규 pre-existing (Retry UI 안내 Text) |

### 변경 diff (요지)
```diff
--- a/components/printer/PrinterRow.tsx
-import {
-  bleAvailability,
-  getRememberedPrinterId,
-  printTestReceipt,
-  type BleAvailability,
-} from '@/lib/printer';
+import { bleAvailability, getRememberedPrinterId, printTestReceipt, type BleAvailability } from '@/lib/printer';

-      ok
-        ? 'Test receipt sent to printer.'
-        : 'Could not reach printer. Make sure it is on and paired.',
+      ok ? 'Test receipt sent to printer.' : 'Could not reach printer. Make sure it is on and paired.',

--- a/components/setup-wizard/StockLocationSelectionStep.tsx
-          <Text className="text-center text-ink-subtle">
-            Your store is saved. Tap Retry to open Meros POS.
-          </Text>
+          <Text className="text-center text-ink-subtle">Your store is saved. Tap Retry to open Meros POS.</Text>
```

**로직·JSX 구조·문자열 변경 0** — 순수 포맷만 (prettier `--write`).

---

## 2. 검증 (로컬 + CI)

### 로컬
```
$ npx prettier --write components/printer/PrinterRow.tsx components/setup-wizard/StockLocationSelectionStep.tsx
components/printer/PrinterRow.tsx 309ms
components/setup-wizard/StockLocationSelectionStep.tsx 21ms

$ npm run lint
✖ 30 problems (0 errors, 30 warnings)   ← errors 0 · green
```

**전**: ✖ 33 problems (3 errors, 30 warnings) · 3 errors auto-fixable
**후**: ✖ 30 problems (**0 errors**, 30 warnings) · warnings 는 lint CI fail 기준 외

### CI (fork PR #42)
| Job | 결과 | 소요 | 링크 |
|-----|-----|------|------|
| `lint` | **pass** | **56s** | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42306752651/job/128197915729 |
| `assertions + playwright` | **pass** | **4m 26s** | https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42306752379/job/128197915156 |

**전 job green 확인** (task 명시 요구 달성).

---

## 3. 규약 정합

| 규약 | 정합 |
|------|------|
| `npx prettier --write` 해당 파일만 | ✓ |
| 로직·JSX 구조 변경 0 | ✓ (diff 는 전부 whitespace/line-wrap) |
| 다른 파일 prettier 위반 포함 + 리포트에 목록 | ✓ (StockLocationSelectionStep 1건 포함 · §1 표) |
| CI 전 job green | ✓ (lint 56s + playwright 4m26s 둘 다 pass) |
| m2 규약 (최신 리포트 1 개만 유지) | ✓ (M2-1104-E ~ M2-1105-H 9건 청소) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 4. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (work-queue #7b 테스트 인프라 · lint CI 빨강) |
| 해소 | +1 (M1-1105-I §NOTE 등재 M2 후속 과제 · PrinterRow prettier 2건) |
| 미완 (Kyu 도장) | 0 (CI-only · 포맷만) |
| **총 순증감** | **+2 해소** |

---

## 5. 다음 게이트

1. **PR #42 머지** — lint CI green 확인 · 다른 열린 PR 들 (예: #29 · #33 · #35 · #38) 의 lint 체크에도 기여.
2. React Hook 경고 (`react-hooks/set-state-in-effect` 30건) 는 **warnings** → 별건 개선 과제 (lint CI pass 기준에는 포함되지 않음).

---

*M2-1105-I · 2026-11-07 · prettier 자동 포맷 · fork PR #42 · lint green (56s) + playwright green (4m26s) · 로직 변경 0 · 2 파일 3 위반 해소*
