# M1-1105-AE Report — fulfilled=false → throw, not success toast (hooks only)

**날짜**: 2026-11-10  
**브랜치**: fix/m1-1105-ae-fulfill-honest  
**PR**: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/74  
**커밋**: 41bb783

---

## 변경 내역

### 1. `api/hooks/pos-payments.ts` — `useFulfillOrder`

- `PosFulfillResponse` 타입에 `fulfilled?: boolean` · `fulfillment_warning?: string` · `already_fulfilled?: boolean` 추가
- `mutationFn` 내 `fulfilled === false && already_fulfilled !== true` → `throw new Error('Not fulfilled — please try again.')`
- `fulfillment_warning` 는 `console.warn('[fulfill]', ...)` 만 (토스트 교체는 M3-1105-AB 몫)
- `fulfilled === undefined` (옛 서버 응답) → throw 없음 · 하위 호환 유지
- `already_fulfilled === true` → throw 없음 · 성공 처리
- `onSuccess` → `onSettled` 로 변경 → 성공·실패 모두 `['orders']` invalidate
- dead `['order']` 키 제거 (R0-AP §1.3)

### 2. `api/hooks/pos-orders.ts` — `useHandOver`

- `PosHandOverResponse` 타입에 동일 세 필드 추가
- `mutationFn` 내 동일 `fulfilled === false` 체크 · throw
- `fulfillment_warning` → `console.warn('[hand-over]', ...)`
- `onSettled` 로 `['orders']` invalidate

### 3. Fixtures × 3

| 파일 | 내용 |
|------|------|
| `fixtures/pos-fulfill-fulfilled-true.json` | `fulfilled: true` → 성공 경로 |
| `fixtures/pos-fulfill-fulfilled-false-warning.json` | `fulfilled: false` + `fulfillment_warning` → throw |
| `fixtures/pos-fulfill-no-fulfilled-field.json` | 필드 없음 (옛 서버 · 하위 호환) → 성공 |

### 4. Scripts

- `scripts/m1-1105-ae-assertions.mjs` — 28개 어설션 (타입 필드 · throw 조건 · fixture 검증)
- `scripts/m1-1105-ae-playwright.mjs` — E2E: fulfilled:false mock → 성공 토스트 없음 · 실패 경로 진입

---

## 어설션 로그

```
--- §1–§4 pos-payments.ts ---
  ✓ §1 PosFulfillResponse 에 fulfilled? 추가
  ✓ §1 PosFulfillResponse 에 fulfillment_warning? 추가
  ✓ §1 PosFulfillResponse 에 already_fulfilled? 추가
  ✓ §2 useFulfillOrder · fulfilled === false 체크
  ✓ §2 useFulfillOrder · "Not fulfilled — please try again." throw
  ✓ §2 useFulfillOrder · fulfillment_warning console.warn
  ✓ §3 useFulfillOrder · already_fulfilled !== true 조건
  ✓ §4 useFulfillOrder · onSettled 사용
  ✓ §4 useFulfillOrder · ['order'] 키 없음 (dead key 제거)

--- §5–§8 pos-orders.ts ---
  ✓ §5 PosHandOverResponse 에 fulfilled? 추가
  ✓ §5 PosHandOverResponse 에 fulfillment_warning? 추가
  ✓ §5 PosHandOverResponse 에 already_fulfilled? 추가
  ✓ §6 useHandOver · fulfilled === false 체크
  ✓ §6 useHandOver · "Not fulfilled — please try again." throw
  ✓ §6 useHandOver · fulfillment_warning console.warn
  ✓ §7 useHandOver · already_fulfilled !== true 조건
  ✓ §8 useHandOver · onSettled 사용
  ✓ §8 useHandOver · ['order'] 키 없음 (dead key 제거)

--- §9–§11 fixtures ---
  ✓ §9 fulfilled-true: status 200, body.fulfilled===true, fulfillment_id 존재
  ✓ §10 fulfilled-false-warning: status 200, fulfilled===false, fulfillment_warning 존재
  ✓ §11 no-fulfilled-field: status 200, fulfilled 필드 없음, fulfillment_id 존재

28/28 passed · 0 failed
```

### run-all assertions 결과

```
==== ASSERTIONS · 24개 ====
  · m1-1105-ae-assertions.mjs ... PASS · 0.1s
  · m2-1105-q-bundle-guard.mjs ... PASS · 15.9s
  (기타 22개 모두 PASS)

총 24 개 · 24 PASS · 0 FAIL · 19.5s
```

---

## 호출부 catch 확인

모든 호출부에 catch 있음 — 다음 라운드 M3 작업 불필요.

| 파일 | 라인 | catch 여부 |
|------|------|-----------|
| `app/checkout/success/[orderId].tsx` | :45 | ✓ catch (e) → Toast error |
| `app/orders/[orderId].tsx` | :529 | ✓ catch (e) → Toast 'Hand over failed' |
| `components/orders/FulfillSheet.tsx` | :89 | ✓ catch (e) → Toast 'Fulfill failed' |

catch 없는 호출부: **없음**

---

## PR 본문 확인 항목

- [ ] `fulfilled === false` 응답 시 성공 토스트 없음
- [ ] `fulfilled === true` or `undefined` 는 기존처럼 성공
- [ ] `already_fulfilled === true` 는 성공 (중복 hand over 허용)
- [ ] 실패 후에도 `['orders']` invalidate → 화면 서버 상태로 재그림
- [ ] run-all assertions 24/24 PASS
- [ ] 번들 가드 (m2-1105-q-bundle-guard) PASS
