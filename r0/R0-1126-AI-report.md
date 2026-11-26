#457 APPROVE
#458 APPROVE

## 대상 커밋

| PR | 커밋 | 내용 |
|---|---|---|
| #457 | 74fdf0a | V4-6/CD-1 회귀 수정 · cdFallbackMain |
| #458 | 0947e88 | cashier.id CD payload 제거 · 로고 onError 줄 숨김 |

---

## REQ 1 — cdFallbackMain 3경로 V4-6/CD-1 보존 여부

### 경로 1: stalePaid → `{ cdSnapshot: null, cdFallbackMain: true }`
```
stalePaid = phase === "paid"
         && (settled || !phoneEntryOpen)
         && paidAgeMs > 30_000
```

**V4-7 (phone_entry_open paid) 보호**
- `snapshot.phone_entry_open=true` → `phoneEntryOpen=true` → `!phoneEntryOpen=false`
- `settled` = `flowState ∈ {confirmed, skipped, unconfirmed}`. phone_entry_open 주문은 아직 번호 미입력이므로 flowState가 confirmed/skipped가 아님 → `settled=false`
- 따라서 `stalePaid=false` → 대기화면으로 밀리지 않음 ✅

**stale paid+skipped (오래된 60초 초과)**
- `settled=true` (skipped), `paidAgeMs>30s` → `stalePaid=true` → MainScreen 강제 ✅

### 경로 2: skippedDismissed+paid → `{ cdSnapshot: null, cdFallbackMain: true }`
```
if (skippedDismissed && flowState === "skipped" && phase === "paid")
  return { cdSnapshot: null, cdFallbackMain: true }
```
- `phase === "building" | "tendering"` (결제 진행 중): 조건 불충족 → 계속 진행
- 이후 `flowForView = { ...effectiveFlow, state: "none" }` → cdSnapshot 반환 (cdFallbackMain=false)
- CD가 `customer_flow.state="none"` → order-list/qris 복귀 ✅
- **V4-6 "결제 진행 중이면 결제 화면 복귀, paid 면 대기" 완전 준수** ✅

### 경로 3: empty building → `{ cdSnapshot: null, cdFallbackMain: true }`
```
phase === "building" && flowState === "none" && items.length === 0
```
- 아이템 없는 building = "아직 손님이 안 시작한 상태" → MainScreen 적절 ✅

### 렌더 순서 확인 (index.tsx:654)
```tsx
} else if (cdFallbackMain) {   // ← 구 XState 경로보다 앞에 삽입
  screenNode = <MainScreen .../>
} else if (screen === "cart" && snapshot) {  // 구 XState 경로
```
구 XState의 `snapshot_state=paid → screen=receipt` 경로를 cdFallbackMain이 덮어씀. ✅

---

## REQ 2 — 로컬 1-worker 통과/CI 4-worker 실패 원인 설명 타당성 · 결정론 확인

### 원인 설명 검토
커밋 메시지 설명: "React 18 초기 렌더와 첫 TICK가 함께 commit 되면서 MainScreen이 DOM에 안 보이는 창이 생긴다. 뒤이어 구 XState가 snapshot_state=paid로 screen=receipt를 돌려 ReceiptScreen이 눌러앉고 테스트가 15s 타임아웃."

- 1-worker: 순차 실행 → React 초기 렌더가 toBeVisible에 잡히는 타이밍 확보 가능
- 4-worker: 병렬 실행 → React 18 batching이 초기 렌더 + 첫 TICK을 같이 commit → MainScreen 순간 사라짐
- **설명 타당**: cdFallbackMain 추가 전에는 XState paid→receipt가 cdSnapshot=null 상태를 덮어쓸 수 있었음. 수정 후 cdFallbackMain 경로가 명시적으로 XState 앞에서 MainScreen을 고정.

### 로컬 --workers=4 3회 실행 결과
```
실행 1: 139 passed (21.9s)   skipped: 8
실행 2: 139 passed (20.8s)   skipped: 8
실행 3: 139 passed (20.7s)   skipped: 8
```
3회 모두 139/139 통과. **결정론 확인** ✅

### CI
- PR #457 `74fdf0a`: heavy-cloud ✅ / heavy-mac ⏭ (스킵)
- PR #458 `0947e88`: heavy-mac ✅ 13m 52s (4-worker e2e 포함, #457 fix 포함)

---

## REQ 3 — #458 cashier.id 완전 제거 · 로고 onError 처리

### cashier.id 네트워크 payload 완전 제거

변경 경로 전수 확인:

| 파일 | 변경 |
|---|---|
| `types/customer-display.ts` | `cashier?: { id?; name? }` → `cashier?: { name? }` |
| `receipt-view-model/order-snapshot.ts` | 동일 |
| `tenders/route.ts` | `name ? { name } : undefined` (id 분기 삭제) |
| `order-snapshot-paid.ts` | `cashierName ? { name: cashierName } : (omit)` |
| integration test | `expect(r?.cashier?.id).toBeUndefined()` ✅ |

CD polling 응답 JSON에 Medusa 내부 user UUID 불포함 확인. ✅

### 로고 onError → 줄 숨김 · URL 변경 시 재시도

```tsx
const [logoLoadFailed, setLogoLoadFailed] = useState(false);
useEffect(() => { setLogoLoadFailed(false); }, [view.storeLogoUrl]);
{view.storeLogoUrl && !logoLoadFailed
  ? <Image ... onError={() => setLogoLoadFailed(true)} />
  : null}
```
- 로드 실패: `setLogoLoadFailed(true)` → 행 숨김 (깨진 아이콘 없음) ✅
- URL 변경: useEffect → `setLogoLoadFailed(false)` → 재시도 ✅
- 영수증 머리 "값 없으면 줄 숨김" 원칙 일관 ✅

---

## 테스트 실행 로그

### #457 74fdf0a 기준

```
customer-display vitest run
  Test Files  16 passed (16)
  Tests       328 passed (328)

npx playwright test --workers=4 (1회):  139 passed (21.9s)
npx playwright test --workers=4 (2회):  139 passed (20.8s)
npx playwright test --workers=4 (3회):  139 passed (20.7s)

bash scripts/it.sh cd-pos-sync-v4-next-customer
  ✓ V4-1 · Next customer 60초 CD 대기화면 유지             (580ms)
  ✓ V4-5 · QRIS receipt = payment_method(qris) · PB1 · store 머리  (682ms)
  ✓ V4-5-K · QRIS end-to-end cashier_user_id → cashier.name    (642ms)
  ✓ V4-6 · skip → state=skipped + actions=['ask_again']        (429ms)
  → 4/4 PASS

bash scripts/it.sh cd-pos-sync-v4
  ✓ V4-8 · Ask → 입력 → Re-enter                          (824ms)
  ✓ V4-8 · Skipped → Ask again (start_entry allowed)       (633ms)
  ✓ V4-7 · 결제완료 phone entry eligible · new_cart_started  (408ms)
  ✓ V4-8 · lock — phone_entry_busy                        (487ms)
  → 4/4 PASS

bash scripts/it.sh cd-full-flow  → 8/8 PASS
```

### #458 0947e88 기준

```
pnpm -F @storeport/receipt-view-model test
  Tests  10 passed (10)

pnpm -F commerce-core typecheck  → clean (exit 0)
```

---

## PR 코멘트

- #457: https://github.com/CuriocityDevAi/storeport/pull/457#issuecomment-7193590892
- #458: https://github.com/CuriocityDevAi/storeport/pull/458#issuecomment-7193595938

---

## 최종 판정

| PR | 커밋 | 판정 | 근거 |
|---|---|---|---|
| #457 | 74fdf0a | **APPROVE** | cdFallbackMain 3경로 V4-6 보존 · phone_entry_open(V4-7) 보호 · 4-worker 결정론 해소 |
| #458 | 0947e88 | **APPROVE** | cashier.id 타입·라우트·subscriber 전경로 완전 제거 · 로고 onError+재시도 올바름 · CI heavy-mac ✅ |
