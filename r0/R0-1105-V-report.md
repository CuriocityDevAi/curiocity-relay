---
name: R0-1105-V · 허브-1107-V 재리뷰 relay
description: storeport #197 (M0-1105-Q · SC+PB1 compound + 로고 + quote) · fork #55 (M1-1105-Q · cashier 3단 fallback + TendersTable props) 둘 다 APPROVE
author: R0
dated: 2026-11-07
---

# R0-1105-V · storeport #197 + fork #55 리뷰 relay

**스코프**: Kyu 세금 ⓐⓑⓒ 결정 + P5 ⑤.
**정본**: storeport `fe07858` (#196) · fork `5a35e23` (#53).
**금지**: 코드 수정 · 커밋.
**claim**: `status/claims/R0-1105-V.json` · in_progress → completed.

## 판정 요약

| PR | head | 판정 | 핵심 |
| --- | --- | --- | --- |
| **storeport #197** (M0-1105-Q) | `e38bc96` | **APPROVE** | §0 대사표 타당 (Medusa core 미건드림) · 공식 `sc=round(subtotal×sc%)` + `pb1=round((subtotal+sc)×pb1%)` · 통합 #14 `348000→403854` 자동검증 · quote/tenders 동일 블록 · 0%/0% 회귀 #15 통과 · pb1_pct>0 면 show_tax_label 무시 (#17) · pos_settings `location:<id>` scope 는 `getOrCreateStoreSettings` 보존 · 금지 영역 (medusa-config · providers · 재고 차감) 0 · 로컬 **17/17 PASS** |
| **fork #55** (M1-1105-Q) | `98b9c87` | **APPROVE** | ReceiptCard 3단 fallback (snapshot → /admin/users first_name → email@앞 → 생략) · `app/orders/[orderId].tsx` 수정 0 (M3-M 충돌 방지) · TendersTable은 optional props 만 (backward-compat) · D1 토큰 + 영어 전수 · Playwright 4 cases (A full · B first_name · C email · D missing) |

## §A · storeport #197 (M0-1105-Q)

### §A-1 §0 대사표

PR body 3줄: **Medusa 2.17 `tax_rate` = 단일 `subtotal × pct` 과세만** · SC 내장 없음 · compound 표현 불가 · POS 자체 계산 결정.

→ **타당** ✓ · Medusa core 를 건드리지 않고 pos_settings 에 신 필드 2개 (service_charge_pct · pb1_pct) 추가 · tenders 라우트 base 재계산 · providers·medusa-config 보전.

### §A-2 계산식 (실측)

| 축 | 공식 | Ta Wan (348,000) | 결과 |
| --- | --- | --- | --- |
| subtotal | `items 합산` or `order.subtotal` (0 fallback) | 348,000 | 348,000 |
| sc_amount | `sc_pct > 0 ? round(subtotal × sc_pct / 100) : 0` | `round(348000 × 0.055)` | **19,140** |
| pb1_amount | `pb1_pct > 0 ? round((subtotal + sc) × pb1_pct / 100) : 0` | `round(367140 × 0.10)` | **36,714** |
| grand_total | `subtotal + sc_amount + pb1_amount` | `348000 + 19140 + 36714` | **403,854** ✓ |

통합 #14 `expect(quote.data.grand_total).toBe(403854)` + `expect(res.data.amount).toBe(403854)` + `expect(snap.grand_total).toBe(403854)` · 로컬 재현 통과.

### §A-3 quote = tenders 산정

`quote/route.ts:80-108` 와 `tenders/route.ts:143-188` **동일 블록** (동일 `getForLocation` + itemsSum + Math.round + compound). 두 엔드포인트 **동일 금액 보장** ✓

### §A-4 0%/0% 회귀 (#15)

- `service_charge_pct:0 · pb1_pct:0 · show_tax_label:false` 설정
- `snap.service_charge` = **null** · `snap.tax = {show:false}` · `snap.grand_total = subtotal`
- quote.data.grand_total = 100000 (= subtotal) ✓
- 가드: `sc_pct > 0 ? ... : 0` · `pb1_pct > 0 ? ... : 0` 조건부 skip · snapshot null · grand_total = subtotal ✓

### §A-5 로고 업로드 2MB·이미지 제한

| 축 | 구현 |
| --- | --- |
| 서버 측 2MB·이미지 **직접** 제한 | **없음** (`settings/route.ts:95-106` 는 `logo_url` http(s)접두 검증만) |
| admin UI 파일 업로드 input | **없음** (`page.tsx:284-306` 은 URL 입력만) |
| 설계 의도 | `page.tsx:287` "Upload via Medusa file manager, then paste the URL here" · 업로드는 Medusa file 모듈에 위임 |

**⚠ 비차단 observation**: PR body "Medusa file 모듈 · 이미지만 · 2MB" 는 코드에서 URL 참조 방식으로 **대체** · 실제 제약은 medusa-config 기본 설정에 좌우. `logo_file_id` 필드는 저장 가능하나 입력 UI 는 없음 (future 용). **설계 선택은 유효** (URL paste 는 외부 파일 모듈과 분리 · 테스트 쉬움) 하나, 명시적 upload 엔드포인트 생길 때 서버-측 mime/size 검증 추가 필요.

### §A-6 pos_settings scope ↔ #187 충돌

- #187 (M0-1105-D): `scope="store"` 하나만 · `getOrCreateStoreSettings()` 메서드
- M0-1105-Q: `scope="location:<id>"` 추가 · 신 메서드 `getForLocation(id)` 신설
- `getOrCreateStoreSettings` 그대로 유지 · `getForLocation(null)` → store fallback · `getForLocation(id)` → store 머지 + location override
- **backward-compat 완전 보존** (`service.ts:36-74`) · 충돌 **0** ✓

### §A-7 receipt snapshot 신 필드

- `snap.service_charge`: `{ label: "Service charge", pct, amount } | null`
- `snap.tax`: `pb1_pct > 0` 이면 `{ label: "PB1", rate_pct, amount, show: true }` · **`show_tax_label` 토글 무시** (조리시설 매장 항상 노출 · 통합 #17 검증)
- `snap.store.logo_url`: 매장별 `s.logo_url` 그대로 미러링 · null 허용 · 통합 #16 검증
- `snap.labels.service_charge`: "Service charge" 영어 레이블 추가

### §A-8 금지 영역

| 축 | 결과 |
| --- | --- |
| medusa-config | **0** |
| providers/** | **0** |
| package.json | **0** |
| `fulfill/route.ts` (재고 차감) | **0** |
| `readFileSync` | **0** |

### §A-9 로컬 재현

- Build: Backend 4.36s · Frontend 18.18s · PASS
- Typecheck: 0 errors
- Integration: **17/17 PASS** (18.12s · Node 20.19 · #6 변환 + #14/#15/#16/#17 신규 4건 포함)

## §B · fork #55 (M1-1105-Q)

### §B-1 ReceiptCard 3단 fallback

```typescript
// components/receipt/ReceiptCard.tsx:96-99
const snapCashierName = snap.cashier?.name?.trim();
const fallbackUserId = !snapCashierName ? (receipt.cashier_user_id ?? undefined) : undefined;
const userQ = useAdminUser(fallbackUserId);
const cashierDisplay = snapCashierName || pickCashierDisplayName(userQ.data);
```

| 우선순위 | 소스 | 조건 | Playwright 어설션 |
| --- | --- | --- | --- |
| 1 | `snap.cashier.name` | 서버 buildSnapshot 이 이미 채움 | Case A: `"Cashier: Kyu Lee"` · userCalls=0 |
| 2 | `useAdminUser(receipt.cashier_user_id).first_name` | snapshot 비어 있고 cashier_user_id 있음 | Case B: `"Cashier: Kyu"` · userCalls=1 |
| 3 | `user.email.split('@')[0]` | first_name 없고 email 있음 | Case C: `"Cashier: cashier"` · userCalls=1 |
| 생략 | 둘 다 없음 | `cashierDisplay=undefined` | Case D: `null` · userCalls=0 · `<Text testID="receipt-cashier">` 미렌더 |

**조건부 enabled**: `useAdminUser(fallbackUserId)` 은 `enabled:!!userId` · snapshot 이 있으면 fetch 차단 · 네트워크 호출 0 ✓

### §B-2 `app/orders/[orderId].tsx` 미수정 (M3-1105-M 충돌 방지)

Diff file list: `api/hooks/users.ts` · `components/receipt/ReceiptCard.tsx` · `components/orders/TendersTable.tsx` · `scripts/m1-1105-q-playwright.mjs` · 2 PNG. **`app/orders/[orderId].tsx` 미포함** ✓

PR body 명시: "**props 로 전달 · M3-1105-M 이 app/orders/[orderId].tsx 에서 wiring 예정**". 책임 분리 명확.

### §B-3 TendersTable = props만

```typescript
type Props = {
  rows: PosTenderRow[];
  testID?: string;
  cashierName?: string;       // NEW · optional
  shiftOpenedAt?: string;     // NEW · optional
};
```

- 2 optional props 추가 · **기존 호출부 무영향** (backward-compat) ✓
- `showCashierCol = !!cashierName?.trim()` · `showShiftCaption = !!shiftOpenedAt?.trim()` 조건부 렌더
- 미지정 시 테이블 shape 동일
- `formatOpenedWIB(iso)`: UTC → UTC+7 shift · `HH:mm WIB` · iPad/웹 로컬 TZ 무관

### §B-4 D1 토큰 · 영어 전용

| 축 | 확인 |
| --- | --- |
| D1 토큰 | `text-ink-muted` · `bg-surface` · `border-line` · raw hex 0 · primitive color class 0 ✓ |
| 영어 전수 | "Cashier" · "Shift opened HH:mm WIB" · "Method" · "Amount" · "Reference" · "Status" · "Time" · "No payments yet." ✓ |

### §B-5 Playwright 4 cases

| Case | fixture | 기대 cashierText | userCalls |
| --- | --- | --- | --- |
| A (snapshot full) | `cashier:{id,name:'Kyu Lee'}` | `Cashier: Kyu Lee` | 0 |
| B (snapshot empty · first_name) | `cashier:null` + user `first_name:'Kyu'` | `Cashier: Kyu` | 1 |
| C (snapshot empty · email only) | `cashier:null` + user `email:'cashier@meros.id', first_name:null` | `Cashier: cashier` | 1 |
| D (both missing) | `cashier:null, cashier_user_id:null` | null · 줄 미렌더 | 0 |

각 case 별 pageerror 0 · console.error 0 어설션 포함 · 3단 fallback 전수 커버.

## §C · 머지 순서 (권장)

두 PR 간 파일 겹침 **0** · 서로 독립 · 어느 쪽부터 머지해도 무방.

- **권장 순서 1**: `#197` (M0 서버 · 통합 테스트 확장 큰 범위) → `#55` (M1 앱 · 서버 contract 영향 안 받음)
- 후속 M3-1105-M (`app/orders/[orderId].tsx` 에서 TendersTable `cashierName`/`shiftOpenedAt` props wiring) 는 **두 PR 머지 뒤** 진행 · M1-1105-Q 의 TendersTable 옵셔널 props 를 사용.

## §D · 환경 보조

- storeport main HEAD: `fe07858` (#196)
- storeport #197 head: `e38bc96`
- fork master HEAD: `5a35e23` (#53)
- fork #55 head: `98b9c87`
- 로컬 재현: Postgres 16-alpine · Node 20.19 · #197 integration 17/17 PASS
- claim: `status/claims/R0-1105-V.json` state=completed

## 참조

- 직전 리뷰: `r0/R0-1105-U-report.md` (Kyu iPad 2차 피드백 진단)
- GitHub reviews 제출 (COMMENT · self-authored 제약):
  - [storeport #197](https://github.com/CuriocityDevAi/storeport/pull/197) · APPROVE
  - [fork #55](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/55) · APPROVE
