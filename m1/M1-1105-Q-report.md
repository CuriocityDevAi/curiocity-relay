---
round: M1-1105-Q
pr:
  fork: agilo-medusa-pos-fork#55
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/55
  fork_commit: 98b9c87
outcome: P5 결정 ⑤ · 영수증 cashier 이름 (snapshot → /admin/users fallback) + TendersTable cashier 컬럼/shift caption props
kyu_checks: 4 (snapshot full · first_name fallback · email@ 앞 · 둘 다 없으면 생략)
---

# M1-1105-Q · P5 결정 ⑤ · Cashier 표기

**일자**: 2026-11-07 · **허브**: M1 · **성격**: P5 ⑤ (영수증 캐셔 이름) · M1-1105-L §2 화면 3.

---

## 0. 원문 (허브-1107-Q)

1. 영수증: `components/receipt/ReceiptCard.tsx` 에 "Cashier: <name>" — snapshot.cashier?.name → 없으면 /admin/users/:id · first_name → email @ 앞. 둘 다 없으면 생략.
2. 주문 상세: `app/orders/[orderId].tsx` 는 **M3-1105-M** 소유 → 수정 금지. `components/orders/TendersTable.tsx` 에만 Cashier 컬럼 + 교대 시작 (WIB) props 추가 (M3 가 나중에 wiring).
3. ESC/POS (`lib/printer` · M2) 미수정 — "Cashier 줄 필요" 만 리포트.

---

## 1. 변경 파일 (주인 M1 · 이번 라운드 한정)

| 파일 | 변경 |
|------|------|
| `api/hooks/users.ts` | **신규** · `useAdminUser` + `pickCashierDisplayName` (first_name → email @ 앞) |
| `components/receipt/ReceiptCard.tsx` | snapshot.cashier.name → `/admin/users/:id` fallback · 둘 다 없으면 Cashier 줄 생략 · `testID="receipt-cashier"` |
| `components/orders/TendersTable.tsx` | `cashierName?` · `shiftOpenedAt?` optional props · 컬럼 + WIB caption 분기 (props 미주입 시 기존 shape 유지) |
| `scripts/m1-1105-q-playwright.mjs` | **신규** · 4 case × 31/31 pass |
| `docs/M1-1105-Q-case-a.png` · `docs/M1-1105-Q-case-d.png` | 스샷 2장 |

**미수정**: `app/orders/[orderId].tsx` (M3-1105-M 잔금 버튼 작업 중) · `lib/printer/**` (M2 소유).

### 핵심 로직 — ReceiptCard
```tsx
const snapCashierName = snap.cashier?.name?.trim();
const fallbackUserId = !snapCashierName ? (receipt.cashier_user_id ?? undefined) : undefined;
const userQ = useAdminUser(fallbackUserId);
const cashierDisplay = snapCashierName || pickCashierDisplayName(userQ.data);
// ...
{cashierDisplay ? (
  <Text style={{ fontFamily: MONO }} testID="receipt-cashier">
    Cashier: {cashierDisplay}
  </Text>
) : null}
```

### 핵심 로직 — TendersTable (props)
```tsx
type Props = {
  rows: PosTenderRow[];
  testID?: string;
  cashierName?: string;    // M1-1105-Q · M3 가 나중에 wiring
  shiftOpenedAt?: string;  //            미지정이면 컬럼/캡션 생략
};
```

### 실측 (서버 snapshot shape)
`fixtures/pos-receipt-response.json` (storeport integration-test 정본) → `snapshot.cashier: { id: "usr_01", name: "Kyu Lee" }` 가 **이미 채워져** 있음.
→ **happy path 에서는 /admin/users/:id 조회 0회** (Case A 어설션으로 확인). 레거시 영수증 · snapshot 변경 시에만 fallback 가동.

### ESC/POS (리포트만)
`lib/printer/escpos.ts` (M2) 는 현재 cashier 줄을 렌더하지 않음.
→ **M2 라운드 발부 요구**: `buildReceiptLines` 가 ReceiptCard 와 동일 규칙으로 "Cashier: <name>" 라인을 추가해야 영수증 출력과 UI 일관. 서버 snapshot.cashier.name 이 정본이므로 ESC/POS 렌더러는 **조회 없이 snapshot 소비** 만 하면 됨.

---

## 2. 스샷 2장

### Case A (snapshot full) · `docs/M1-1105-Q-case-a.png`
- Order detail: ReceiptCard 상단에 "Cashier: Kyu Lee" 노출 (modal/overlay 없음)
- 네트워크 로그 상 `/admin/users/:id` 호출 0건

### Case D (둘 다 없음) · `docs/M1-1105-Q-case-d.png`
- Order detail: ReceiptCard 에서 Cashier 줄 **완전 생략** — Order # 바로 아래 구분선
- `/admin/users/:id` 호출 0건

---

## 3. 어설션 (Playwright 31/31 pass)

```
=== Case A (snapshot full) ===            snapshot.cashier.name = "Kyu Lee"
  ✓ ReceiptCard 노출
  ✓ Cashier 줄 노출 · 문자열 "Cashier: Kyu Lee"
  ✓ /admin/users/:id 호출 0회 (snapshot 소비)
  ✓ Tender row 노출 · Cashier 헤더 미노출 (props 미주입)
  ✓ pageerror 0 · console.error 0

=== Case B (snapshot empty · first_name) ===  cashier=null · user.first_name="Kyu"
  ✓ Cashier 줄 노출 · 문자열 "Cashier: Kyu"
  ✓ /admin/users/:id 호출 1회

=== Case C (snapshot empty · email only) ===  user.first_name=null · email="cashier@meros.id"
  ✓ Cashier 줄 노출 · 문자열 "Cashier: cashier"
  ✓ /admin/users/:id 호출 1회

=== Case D (both missing) ===                  cashier=null · cashier_user_id=null
  ✓ Cashier 줄 생략 (rowCount=0)
  ✓ /admin/users/:id 호출 0회

31/31 passed · 0 failed
```

### 회귀 (전원 pass · 로컬)
```
m3-1105-a-color-assertions.mjs    → 37/37
m3-1105-c-english-assertions.mjs  →  5/5
m3-1105-d-assertions.mjs          → 27/27
m3-1105-f-playwright.mjs          → 18/18  (ReceiptCard + TendersTable 기존 흐름)
m1-1104-a-assertions.mjs          → 44/44
m1-1105-a-assertions.mjs          → 33/33
m1-1105-p-playwright.mjs          → 16/16
npx tsc --noEmit                  → exit 1 (잔존 global.css · pre-existing)
```

---

## 4. CI 링크 (fork PR #55)

- (push 직후 pending · 리포트 작성 시점 기준)
- CI 그린 확정 후 PR body / 본 리포트 하단에 추가 반영.

---

## 5. Kyu 아이패드 실기 체크 (4건)

| # | 체크 |
|---|------|
| 1 | Paid 주문 상세 열기 → ReceiptCard 상단 "Cashier: Kyu Lee" 노출 (snapshot 정본) |
| 2 | (대조) 옛 영수증 (snapshot.cashier 비었음) 열면 /admin/users 조회로 first_name 표기 |
| 3 | (대조) first_name 비어 있고 email 만 있는 사용자는 "@" 앞 부분만 노출 |
| 4 | (대조) cashier_user_id 조차 없는 레거시 영수증은 Cashier 줄 자체 생략 |
| 참고 | TendersTable 쪽 Cashier 컬럼/Shift 캡션은 M3-1105-M 이 `app/orders/[orderId].tsx` 에서 props 로 연결 예정 — 이번 PR 은 schema + 렌더 분기만 |

---

## 6. 규약 정합

| 규약 | 정합 |
|------|------|
| fork master(`5a35e23`) 위 작업 | ✓ |
| `app/orders/[orderId].tsx` 미수정 (M3-1105-M 영역) | ✓ |
| `lib/printer/**` (M2) 미수정 — "Cashier 줄 필요" 만 리포트 | ✓ |
| snapshot.cashier.name 있으면 조회 없이 소비 (실측 + 어설션) | ✓ |
| first_name → email @ 앞 fallback | ✓ |
| 둘 다 없으면 Cashier 줄 생략 | ✓ |
| TendersTable 는 props 만 추가 · 기존 shape 유지 | ✓ |
| 영어 전용 · D1 토큰만 · 색 어설션 | ✓ (37/37) |
| fixture · Playwright · CI | ✓ (31/31) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (P5 ⑤ 영수증 cashier 표기 confirm · M1 몫) |
| 신규 M2 요구 | +1 (ESC/POS "Cashier 줄" 렌더링 — 리포트에 명시) |
| 신규 M3 요구 | +1 (TendersTable props wiring — `app/orders/[orderId].tsx`) |
| **총 순증감** | **+1 해소 · M2/M3 요구 각 +1** |

---

## 8. 다음 게이트

1. **PR #55 CI** 확인 → 머지.
2. Kyu 아이패드 실기 (4건) 체크.
3. **M2** 라운드: ESC/POS 렌더러에 "Cashier: <name>" 라인 추가 (snapshot.cashier.name 그대로 소비).
4. **M3-1105-M** 뒤: `app/orders/[orderId].tsx` 에서 `<TendersTable cashierName=... shiftOpenedAt=... />` wiring.

---

*M1-1105-Q · 2026-11-07 · Cashier display + TendersTable props · fork PR #55 · 5 파일 (new 3 · modified 2) · Playwright 31/31 pass · 회귀 전원 pass · 영어 전용 · D1 토큰*
