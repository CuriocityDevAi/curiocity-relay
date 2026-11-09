---
round: M3-1105-T
pr:
  fork: agilo-medusa-pos-fork#62 (ongoing · head 9faa4a5 · base master 6375e05)
commits:
  - 6cd5bf6 feat(m3-1105-s/①): 공용 OptionChip + Tabs/OrderType 적용 (규칙 ⑨) · rebased
  - a997d8f feat(m3-1105-s/②): Pickup date/time 피커 + 빠른 칩 + 15분 단위 · rebased
  - bf642a1 feat(m3-1105-s/③): 영수증 로고 높이 60 → 110 (1.8배) · rebased
  - e9b34f1 feat(m3-1105-s): 스크린샷 3장 (OptionChip 선택 상태 + Pickup 빠른 칩) · rebased
  - 9faa4a5 feat(m3-1105-t): ReceiptCard 로고 → lib/receipt-layout.LOGO 공용 상수 치환 · M3-1105-T 신규
base: master 6375e05 (#63 M2-1105-R `lib/receipt-layout.ts` · #64 M3-1105-Q ShiftCloseGate 흡수)
base_before: a0bfcd6
head_before: 10f93aa
outcome: PR #62 마무리. feat/m3-1105-p-payment-tabs 를 master a0bfcd6 → 6375e05 로 rebase (5개 커밋 재적용 · 충돌 0) 하여 #63/#64 를 흡수하고, ReceiptCard 의 로컬 리터럴 `height: 110` / `maxWidth: '80%'` 를 `lib/receipt-layout.LOGO` 공용 상수 import 로 치환, M3-1105-S TODO 주석을 제거. 화면(CSS px) ↔ 프린터(ESC/POS dot) 1:1 D1 단일 소스 확립. 어설션 색 37/37 · S 28/28 · D 27/27 · m3-1105-q 25/25 · logo-bitmap 37/37 · 번들 가드 (node:* import 0) 전부 PASS. 금지 영역(lib/printer · app/_layout.tsx · components/shift/ShiftCloseGate* · api/hooks) 미수정. PR #62 본문에 "M3-1105-T (마무리 · base 올림 + receipt-layout 치환)" 섹션 2줄 추가.
kyu_checks: 0 (M3-1105-S 체크 4건 유지 · 본 라운드는 base 흡수 + 상수 치환 뿐 UI 변경 없음)
---

# M3-1105-T · PR #62 rebase 흡수 + ReceiptCard 로고 공용 상수 치환 (마무리)

**일자**: 2026-11-09 · **허브**: M3 · **성격**: 허브-1109-T (작음). master 6375e05 (#63 #64) 를 feat/m3-1105-p-payment-tabs 로 rebase 하여 PR #62 를 머지 가능 상태로 정리하고, M3-1105-S 가 남긴 TODO (`#63 머지 뒤 공용 상수로 치환`) 를 해결.

---

## §0 변경 전후 (D1 단일 소스)

**변경 전** (`components/receipt/ReceiptCard.tsx:137-141`):
```tsx
<Image
  source={{ uri: snap.store.logo_url }}
  style={{ maxWidth: '80%', width: '100%', height: 110, resizeMode: 'contain' }}
  ...
/>
```
+ TODO 주석 3줄 (M3-1105-S 가 남긴 placeholder).

**변경 후** (`components/receipt/ReceiptCard.tsx:138-146` · base 6375e05 · `@/lib/receipt-layout.LOGO` import 추가):
```tsx
<Image
  source={{ uri: snap.store.logo_url }}
  style={{
    maxWidth: `${LOGO.maxWidthRatio * 100}%`,
    width: '100%',
    height: LOGO.maxHeightPx,
    resizeMode: 'contain',
  }}
  ...
/>
```
+ `import { LOGO } from '@/lib/receipt-layout'` (1줄) · TODO 주석 제거.

**효과**: `lib/receipt-layout.ts` 는 이미 `LOGO.maxHeightPx = 110` · `LOGO.maxWidthRatio = 0.8` 을 export 하고 프린터 측(`lib/printer/receipt-escpos.ts`) 이 이를 소비 중. 이 치환으로 화면 Image CSS px 와 ESC/POS dot (`logoMaxHeightDots = LOGO.maxHeightPx`) 가 **동일한 단일 소스** 를 참조. Kyu 결정 D1 (로고 1.8배, open-requirements.md:18) 는 이제 `lib/receipt-layout.LOGO.maxHeightPx` 수치 하나만 바꾸면 화면/프린터 양쪽 동기화.

---

## §1 Rebase (충돌 0)

```
fork · feat/m3-1105-p-payment-tabs
  base_before = master a0bfcd6
  head_before = 10f93aa (M3-1105-S 종점)
  → git rebase 6375e05
    → Rebasing (5/5) Successfully rebased
  base_after  = master 6375e05 (#63 + #64 포함)
  head_after  = 9faa4a5 (+ M3-1105-T 치환 커밋 1개)
```

**재적용된 5개 커밋 (모두 파일 교집합 없이 clean apply)**:

| before | after | title |
|--------|-------|-------|
| 37e5412 | 03e532e | feat(m3-1105-p): tender Cash/Card/QRIS 탭 + EDC + Hand over |
| 16ee128 | 6cd5bf6 | feat(m3-1105-s/①): OptionChip + Tabs/OrderType |
| 5263787 | a997d8f | feat(m3-1105-s/②): Pickup picker + 빠른 칩 + 15분 |
| 966fa70 | bf642a1 | feat(m3-1105-s/③): 영수증 로고 60 → 110 |
| 10f93aa | e9b34f1 | feat(m3-1105-s): 스샷 3장 |

**충돌 목록**: **0 건**. 교집합을 보면 아귀가 맞음:
- `#63` 은 `lib/receipt-layout.ts` **신규** + `lib/printer/*` + `scripts/m2-1105-p-logo-bitmap-assertions.mjs` + `docs/testing/*.png` — PR #62 범위와 **교집합 ∅**.
- `#64` 는 `components/shift/ShiftCloseGate.tsx` **신규** + `app/_layout.tsx` + `scripts/m3-1105-q-playwright.mjs` — PR #62 범위와 **교집합 ∅** (파일 주인 금지선 그대로).
- PR #62 가 손댄 `components/receipt/ReceiptCard.tsx` (966fa70 로고 수정) 은 `#63` 이 안 건드린 파일이라 **그대로 fast-apply**.

---

## §2 Rebase + T 치환 결과

```
git log --oneline -6
9faa4a5 (HEAD -> feat/m3-1105-p-payment-tabs) feat(m3-1105-t): ReceiptCard 로고 → lib/receipt-layout.LOGO 공용 상수 치환
e9b34f1 feat(m3-1105-s): 스크린샷 3장
bf642a1 feat(m3-1105-s/③): 영수증 로고 60 → 110 (1.8배)
a997d8f feat(m3-1105-s/②): Pickup date/time 피커 + 빠른 칩 + 15분 단위
6cd5bf6 feat(m3-1105-s/①): 공용 OptionChip + Tabs/OrderType 적용
03e532e feat(m3-1105-p): tender Cash/Card/QRIS 탭 + EDC 시트 + Hand over 토스트 영문화
6375e05 (origin/master) fix(shift-gate): sticky closingShift latch (#64)
47acbdc feat(printer): shared receipt-layout + logo ~1.83× bigger (#63)
```

`git push --force-with-lease=feat/m3-1105-p-payment-tabs:10f93aa` → `+ 10f93aa...9faa4a5 ... (forced update)` 성공. 이전 head (10f93aa) 를 lease 로 두어 다른 pusher 와의 race 를 방지.

---

## §3 어설션 전부 PASS

| scope | script | result |
|---|---|---|
| 색 (accent token) | `scripts/m3-1105-a-color-assertions.mjs` | **37/37 PASS** |
| OptionChip + Pickup + 로고 | `scripts/m3-1105-s-option-chip-assertions.mjs` | **28/28 PASS** ✶ |
| 영수증 labels | `scripts/m3-1105-d-assertions.mjs` | **27/27 PASS** |
| ShiftCloseGate (#64) | `scripts/m3-1105-q-playwright.mjs` | **25/25 PASS** |
| 로고 bitmap (#63) | `scripts/m2-1105-p-logo-bitmap-assertions.mjs` | **37/37 PASS** |
| RN 번들 가드 (⑦) | `scripts/m2-1105-q-bundle-guard.mjs` | **PASS** (node:* import 0 · Metro iOS export 7.7s) |

✶ **S 어설션 섹션 (5) 전이**: 치환 후에도 28/28 유지. 기존 3 체크 (literal `height: 110` · literal `maxWidth: '80%'` · `resizeMode contain`) 를 **의미동치 3 체크** (LOGO import + `height: LOGO.maxHeightPx` + `maxWidth: \`${LOGO.maxWidthRatio * 100}%\``; `LOGO.maxHeightPx: 110` + `maxWidthRatio: 0.8` in lib/receipt-layout; `resizeMode contain`) 로 교체. 로고 수치 의미는 보존 · 검증 소스는 치환 후 코드로 이동.

**금지 영역 확인 (`git diff --stat 10f93aa..9faa4a5`)**:
```
 components/receipt/ReceiptCard.tsx           | 11 ++++++++---
 scripts/m3-1105-s-option-chip-assertions.mjs | 15 ++++++++++++---
```
= `lib/printer` 0 · `app/_layout.tsx` 0 · `components/shift/ShiftCloseGate*` 0 · `api/hooks` 0 — **전부 touch 0**.

---

## §4 PR #62 본문 2줄 추가

PR #62 Summary 상단에 섹션 추가 (via `gh pr edit --body-file`):

```
**M3-1105-T (마무리 · base 올림 + receipt-layout 치환)**:
- **Rebase onto master `6375e05`** — #63(M2-1105-R `lib/receipt-layout.ts`) · #64(M3-1105-Q sticky ShiftCloseGate) 흡수. 충돌 0 건.
- **ReceiptCard 로고 공용 상수 치환** — 로컬 리터럴 `height: 110` / `maxWidth: '80%'` → `LOGO.maxHeightPx` / `LOGO.maxWidthRatio * 100%` import. TODO 주석 제거. 화면 ↔ ESC/POS 1:1 동기화 D1 단일 소스 확립.
```

Test plan 도 갱신 — `m3-1105-q-playwright` 25/25 · `m2-1105-p-logo-bitmap-assertions` 37/37 · `m2-1105-q-bundle-guard` 를 명시적으로 추가. 금지 영역 목록에 `components/shift/ShiftCloseGate*` 포함.

---

## §5 Kyu 체크

M3-1105-T 자체는 UI 변경 0 · 수치 보존 (110 / 0.8) — Kyu 실기 재검증 **불필요**. M3-1105-S 가 남긴 체크 4건은 그대로 유효.

---

## §6 원장 정리

- `open-requirements.md` 🔴 Kyu "영수증 로고 1.8배 (화면·프린터 같은 크기)" — #63 + M3-1105-T 치환으로 **단일 소스(`lib/receipt-layout.LOGO`) 에서 공유**. 🔴 해제 조건은 Kyu iPad 실기 확인 (M3-1105-S 체크 ③) 과 함께.
- `m3/M3-1105-S-report.md` §TODO "#63 머지 뒤 receipt-layout 공용 상수로 치환" — **본 라운드에서 완료** (commit 9faa4a5).

---

## §7 다음

- CI (fork actions) 트리거 대기 — assertions + playwright 자동 돌림.
- Kyu iPad 실기 (PR #62 Test plan 하단 체크박스 4건 · M3-1105-S 설정).
- 머지 승인 뒤 PR #62 squash/merge → master.
