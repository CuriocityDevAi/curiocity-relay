---
round: M3-1105-I
pr:
  fork: agilo-medusa-pos-fork#44
commit: (branch fix/m3-1105-i-ci-assertions · base master c03c254)
outcome: fork master CI 빨강 (스테일 어설션) 해소 · m3-1104-a + m3-1105-d 2 assertions 현 코드 정렬 · 어설션 13/13 + Playwright 13/13 로컬 PASS · palette draft PR 3개 close
kyu_checks: 0 (CI 그린 확인 뒤 자동 해소 · Kyu 실기 없음)
---

# M3-1105-I · fork master CI 빨강 해소 (스테일 어설션)

**일자**: 2026-11-07 · **허브**: M3 · **성격**: work-queue.md #2c · M1-1105-K 리포트 수렴 · 어설션 기울기 교정 (제품 코드 무수정 · intent 유지).

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | fork master (c03c254) CI `assertions + playwright` job 빨강 원인 분석 | ✓ `m3-1104-a-assertions.mjs` (5 FAIL · M3-1105-C 미반영) + `m3-1105-d-assertions.mjs` (2 FAIL · M3-1105-H 미반영) |
| 2 | 어설션만 현 코드 shape 에 맞춰 갱신 (intent 유지 · 지워서 통과 금지) | ✓ 각 check 갱신 + "옛 기대 → 새 기대 · 이유" 주석 |
| 3 | 제품 코드 수정 0 | ✓ (어설션 2 파일만) |
| 4 | 로컬 전수 실행 CI 포맷 동일 | ✓ `node scripts/run-all.mjs assertions` 13/13 · `playwright` 13/13 |
| 5 | CI 전 job 그린 확인 | **진행 중** · PR #44 CI run 42316693613 대기 |
| 6 | palette draft PR 3개 (#37 A · #39 B · #40 C) close | ✓ (Kyu 결정 폐기 · comment 로 근거) |

---

## 1. 산출물 (PR #44 · base master `c03c254`)

| 파일 | 변경 | 라인 |
|------|------|------|
| `scripts/m3-1104-a-assertions.mjs` | check 5개 교체 + header 주석 | +23 / -15 |
| `scripts/m3-1105-d-assertions.mjs` | check 2개 교체 (labels + receipt 경로) | +27 / -5 |
| **총** | **2 파일** | **+50 / -20** |

**제품 코드 (app/ · components/ · api/ · lib/) 무수정** · Playwright 스크립트 무수정.

---

## 2. "옛 기대 → 새 기대 · 이유" 표

### 2-1. `scripts/m3-1104-a-assertions.mjs` (5건 교체)

| # | 옛 기대 (stale) | **새 기대 (현행)** | 이유 |
|---|----|----|----|
| 1 | 배지 문구 한글 `'품절'` | 배지 문구 영어 `'Sold out'` | **M3-1105-C (#29 · af629c1)** 가 Kyu 결정 (a) + ADDENDUM §2 로 영어 전환 |
| 2 | `'Sold out'` 잔존 없음 (한글 유지 가드) | **한글 `'품절'` 미등장** (영어 전용 가드) | 가드 방향 반전 (한글 regression 방지) |
| 3 | `import Toast from 'react-native-toast-message'` 존재 | **`Toast.show({ text1: '품절' })` 호출 미존재** | M3-1105-C 가 sold-out 탭 토스트 제거 |
| 4 | `Toast.show({ text1: '품절' })` | **sold-out 탭 → `handleProductPress(item)` 호출** | 상세 시트가 가드 (M3-1105-C 핵심 동작 · sold-out 도 탭 → 상세) |
| 5 | `visibilityTime: 1500~2500` 범위 | (삭제 · check #3 과 중복) | Toast 자체 제거 — 별도 visibilityTime 체크 불필요 |

### 2-2. `scripts/m3-1105-d-assertions.mjs` (2건 교체)

| # | 옛 기대 (stale) | **새 기대 (현행)** | 이유 |
|---|----|----|----|
| 1 | `TOTAL`/`Received`/`Change` **리터럴 grep** | `snap.labels.total|received|change` **참조** + `types/receipt.ts` 의 `ReceiptLabels` 3 키 존재 | **M3-1105-H (#31 · 607bc37)** 가 ReceiptCard 를 서버 snapshot 소비형으로 전환 · 라벨 리터럴은 `ReceiptLabels` 변수 · intent 유지 ("영수증이 3 라벨을 실제로 렌더") |
| 2 | `GET /admin/pos/orders/:id/receipts/:receiptId` (잘못된 경로) | **`GET /admin/pos/receipts/:id`** (단건 · M3-1105-H 경로 교정) | R0-1105-L Mismatch #1 교정 (storeport 서버 정본 = 단건 경로) |

**모든 교체는 original intent 보존** — "sold-out 카드 가드 가시", "receipt 라벨 렌더", "receipt API 호출" — 검사 의미가 사라진 check 는 없음.

---

## 3. 검증 (로컬 · CI 와 동일 명령)

### 3-1. 전 어설션 (`run-all.mjs assertions`)

```
$ node scripts/run-all.mjs assertions
==== ASSERTIONS · 13개 ====
  · m0-1103-a-assertions.mjs ... PASS · 0.0s
  · m0-1103-c-assertions.mjs ... PASS · 0.3s
  · m0-1103-d-assertions.mjs ... PASS · 0.0s
  · m0-1104-a-assertions.mjs ... PASS · 0.0s
  · m1-1104-a-assertions.mjs ... PASS · 0.0s
  · m1-1104-b-assertions.mjs ... PASS · 0.0s
  · m1-1105-a-assertions.mjs ... PASS · 0.0s
  · m1-1105-h-assertions.mjs ... PASS · 0.0s
  · m2-1104-d-escpos-assertions.mjs ... PASS · 0.5s
  · m3-1104-a-assertions.mjs ... PASS · 0.0s   (이전 FAIL · 15/15 현행)
  · m3-1105-a-color-assertions.mjs ... PASS · 0.1s
  · m3-1105-c-english-assertions.mjs ... PASS · 0.0s
  · m3-1105-d-assertions.mjs ... PASS · 0.0s   (이전 FAIL · 27/27 현행)

총 13 개 · 13 PASS · 0 FAIL · 1.1s
```

### 3-2. 전 Playwright (`run-all.mjs playwright`)

```
$ node scripts/run-all.mjs playwright
==== PLAYWRIGHT · 13개 ====
  · m0-1104-a-playwright.mjs ... PASS · 4.8s
  · m1-1104-a-playwright.mjs ... PASS · 4.5s
  · m1-1104-b-playwright.mjs ... PASS · 4.5s
  · m1-1105-b-playwright.mjs ... PASS · 7.2s
  · m1-1105-h-playwright.mjs ... PASS · 8.1s
  · m2-1104-a-playwright.mjs ... PASS · 4.5s
  · m2-1105-b-inventory-playwright.mjs ... PASS · 4.4s
  · m2-1105-c-settings-playwright.mjs ... PASS · 9.6s
  · m3-1104-a-playwright.mjs ... PASS · 4.9s
  · m3-1105-a-playwright.mjs ... PASS · 4.5s
  · m3-1105-b-playwright.mjs ... PASS · 36.1s
  · m3-1105-d-playwright.mjs ... PASS · 34.3s
  · m3-1105-f-playwright.mjs ... PASS · 21.3s

총 13 개 · 13 PASS · 0 FAIL · 148.6s
```

### 3-3. CI (fork)
- PR #44: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/44
- CI run (`assertions + playwright`): https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42316693613
- Lint run: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/42316693628
- Green 확인 뒤 머지 가능.

---

## 4. 설계 포인트

### 4-1. "어설션 지워 통과 금지" 준수
- 5 + 2 = 7 check 는 모두 **대체 check 로 교체** (삭제 1건은 중복 제거).
- 각 교체는 "옛 기대 · 새 기대 · 이유" 주석 1줄 → 스펙 요구 포맷 (리포트 §2 표) 과 일치.
- 원본 intent ("sold-out 카드 가드가 살아있음", "영수증 라벨 렌더", "올바른 경로 호출") 는 **대체 check 로 재확인**.

### 4-2. Playwright 스크립트 무수정
- M1-1105-K 리포트는 `m3-1105-d-playwright.mjs` 도 지적.
- 로컬 전수 실행 (148.6s) → **13/13 PASS**.
- M3-1105-H 가 `scripts/_harness.mjs` + `fixtures/pos-*.json` 로 통합한 뒤 selector/strings 가 자동 정렬 — Playwright 측은 이미 그린.
- 본 PR 에서 Playwright 변경 **불요**. (제품 코드 수정 없음 원칙 준수.)

### 4-3. palette draft (#37 #39 #40) close
- M3-1105-G 에서 Kyu 선택용 Draft 3개.
- Kyu 결정 "폐기" → 본 라운드에서 close + comment 로 근거.
- 3 PR 모두 **Closed** · merge 안 됨 · branch 는 origin 에 남겨둠 (후속 참고용).

### 4-4. CI green 뒤 머지 · 머지 뒤 효과
- master 는 c03c254 이후 2 assertions 가 FAIL 로 push/PR 가드 역할 X.
- 본 PR 머지 → master CI 그린 → 모든 PR branch 가 다시 **검사 받는 상태** 로 복귀.
- 다음 M3 라운드 PR 들 (e.g. P3 카드, P4 QRIS) 이 정상 CI 를 받을 수 있음.

---

## 5. 규약 정합

| 규약 | 상태 |
|------|------|
| 주인 파일 = `scripts/m3-1104-a-assertions.mjs` · `scripts/m3-1105-d-assertions.mjs` | ✓ |
| 제품 코드 (app/ · components/ · api/ · lib/) 무수정 | ✓ (어설션 2 파일만) |
| 검사 intent 유지 (지워서 통과 금지) | ✓ 7 check 교체 + 1 삭제 (중복 사유) · 원본 intent 는 교체 check 로 보존 |
| "옛 기대 → 새 기대 · 이유" 표 (리포트 §2) | ✓ |
| CI 전 job 그린 확인 | **진행 중** (PR #44) |
| palette draft (#37 #39 #40) close | ✓ (Kyu 결정 폐기 · comment 남김) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (work-queue.md #2c · fork master CI 빨강) |
| 등재 | 0 (assertion 유지보수 · 신규 등재 없음) |
| 미완 (Kyu 실기) | 0 (어설션 교정 · Kyu 터치 없음) |
| **총 순증감** | **-1** (해소 1 · 등재/미완 0) |

**별건 소모 (palette 3 PR close)**: Kyu 결정 폐기 반영 — work-queue.md 다음 업데이트에 반영.

---

## 7. 다음 게이트

1. **CI 그린 확인** (자동 · 수 분 내) → merge.
2. 머지 뒤 master 가 그린 상태 복귀 → 모든 PR branch CI 재개.
3. **별건 M3 라운드** — P3 카드 tender · P4 QRIS tender (M3-1104-B 계획서 §7-2 · §7-3).
4. **별건 M3-1105-K / L** — 추후 어설션 파일 유지보수 (서버 contract 변경 시 자동 반영 체계는 fixture 규약 M3-1105-H 로 커버).

---

*M3-1105-I · 2026-11-07 · fork master CI 빨강 해소 · m3-1104-a/m3-1105-d 2 assertions 7 check 교체 · 제품 코드 무수정 · 어설션 13/13 + Playwright 13/13 로컬 PASS · palette #37/#39/#40 close · fork PR #44 · 이연 -1*
