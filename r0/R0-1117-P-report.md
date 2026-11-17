#176 CHANGES · M1-G #N 없음

## #176 M3-1117-J CustomerLinkSheet

### FAIL — 금지 파일 위반 (REQUEST_CHANGES 사유)

| 파일 | 변경 내용 | 판단 |
|------|-----------|------|
| `app/(tabs)/cart.tsx` | CustomerBadge에 `maskE164` import + 마스킹 번호 표시 + DEV 타이밍 로그 2개 + 스켈레톤 조건 수정(M3-1117-C 태그) | **금지 파일** — 1라운드는 부품만, 화면 교체는 다음 라운드 |
| `app/customer-lookup.tsx` | `PhoneNumpadField` 컴포넌트 추가 + 전화번호 zod validation + `phone_display` 목록 표시 + 오류 처리 | **금지 파일** — 1라운드는 부품만, 화면 교체는 다음 라운드 |

### FAIL — 신규 TypeScript 오류 (master 대비 +5)

```
app/_layout.tsx(8,8): error TS2882: Cannot find module or type declarations for side-effect import of '../global.css'.
e2e/flows/09-cart-instant-display.spec.ts(165,58): error TS2559 — Playwright test(title, fn, timeout) 3인자 형식 불가
e2e/flows/09-cart-instant-display.spec.ts(165,67): error TS7031 — implicit any
e2e/flows/09-cart-instant-display.spec.ts(196,41): error TS2559
e2e/flows/09-cart-instant-display.spec.ts(196,50): error TS7031
```

> `09-cart-instant-display.spec.ts`는 `test(title, fn, 20_000)` 3인자 형식 사용 → 최신 Playwright에서 `TestDetails` 타입 불일치.  
> `test.setTimeout(20_000)` 으로 수정 필요.  
> `_layout.tsx` 오류는 worktree 환경 이슈로 추정 (master에서 동일 파일·동일 임포트 오류 없음) — 본 PR의 직접 원인 불명확, 확인 필요.

### PASS 항목

| REQ | 결과 |
|-----|------|
| `formatPhoneDisplay62` — 0813/62813/620813/+62(0)813 → `(+62) 813-…` | ✅ `lib/phone-id.ts` 구현 정확 |
| 디바운스 300ms | ✅ `setTimeout(…, 300)` |
| `loyalty_consent_at` 조건 — 없을 때만 체크박스 | ✅ `needsConsent = !foundCustomer \|\| foundCustomer.loyalty_consent_at == null` |
| `useLinkOrderCustomer` POST | ✅ |
| `useChangeOrderCustomer` PATCH + 404 → "아직 지원 안 됨" 토스트 | ✅ |
| `useUnlinkOrderCustomer` DELETE + 404 → "아직 지원 안 됨" 토스트 | ✅ |
| `app/checkout/success/[orderId].tsx` 미변경 | ✅ |
| `app/orders/[orderId].tsx` 미변경 | ✅ |
| 단위 테스트 557개 전통과 (`vitest run`) | ✅ |

### 기타 관찰

- `app/(tabs)/orders.tsx` 에 M3-1117-B 검색 모드(`usePosOrdersList`) 추가 — 금지 파일 아님, 기능 추가 범위이나 J 명세에 없음.  
- `api/hooks/draft-orders.tsx` 에 M3-1117-I·C 픽스 포함 (addToDraftOrder onMutate 순서 변경, isAddingToCart enabled gate) — OK.
- `e2e/flows/M1-1117-D-measure.spec.ts` TypeScript 오류 없음.

---

## M1-G PR

M1-1117-G PR 없음 (열린 PR 목록 확인: #176, #169, #153, #151, #1 — M1-1117-G 없음).
