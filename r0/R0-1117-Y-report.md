#182 APPROVE · #183 APPROVE

---

## #182 fix(cart): M1-1117-L — customer select 400 / 새 손님 번호 프리필

**판정: APPROVE**

### 원인 설명 ✓
PR body와 커밋 메시지 모두 정확. `beginEdit → update → confirmEdit` 패턴에서 `update()`는 편집 세션과 무관한 직접 엔드포인트이므로 활성 편집 세션 중 호출 시 서버가 400 반환. 추가로 phone-only 손님의 `email: null`을 body에 전송하면 `AdminUpdateDraftOrder.email?: string` 타입 위반.

### 수정 검증

**편집 세션 열려있을 때/없을 때 (api/hooks/draft-orders.tsx:769)**
- `beginEdit` / `confirmEdit` 완전 제거, `sdk.admin.draftOrder.update()` 직접 호출
- 편집 세션 상태와 무관 → 양쪽 모두 성공 ✓

**이메일 없는 손님 (draft-orders.tsx:775)**
```ts
...(data?.email ? { email: data.email } : {})
```
null/undefined email 조건부 포함 → 타입 위반 해소 ✓

**장바구니 아이템 유실 없음**
- `update()` payload는 `customer_id` + `email` 만 포함 → line items 건드리지 않음 ✓

**프리필 정규화 (app/customer-lookup.tsx:360)**
```ts
initialPhone={searchQuery.replace(/[^\d]/g, '') || undefined}
```
숫자 추출 inline 정규식 (하이픈·공백 제거) → `initialPhone` prop으로 Form `defaultValues` 전달 ✓  
phone-id.ts 별도 함수 없이 inline 처리 — 단순 용도에 적합.

**실패 토스트에 이유 표시 (draft-orders.tsx onError)**
`showErrorToast(error)` 호출 확인 ✓

**테스트 (vitest run)**
```
Test Files  1 passed (1)
     Tests  7 passed (7)
```
7개 모두 통과 ✓ (body 스냅샷 2개 + phone prefill 4개 + email undefined)

---

## #183 fix(payment): M3-1117-O — 나눠결제 slip merge anim 1.5× · sleek 업그레이드

**판정: APPROVE**

### 타이밍 상수 diff 0
```
const SLIDE_MS = 420;   // 불변
const FADE_MS = 300;    // 불변
const TOTAL_MS = SLIDE_MS + FADE_MS + 20;  // 불변
```
3개 모두 원본과 동일 ✓

### 색 하드코딩 없음
기존 하드코딩 (#fff, #f3f4f6, #d1d5db, #9ca3af, #374151) 전면 제거.
슬립 카드: `TOKEN_SURFACE / TOKEN_LINE / TOKEN_INK` 사용 ✓  
잔존 `rgba(0,0,0,0.65)` (backdrop), `rgba(255,255,255,0.7)` (hint) → pre-existing, 슬립 카드 외부 ✓

### reduced-motion
`AccessibilityInfo.isReduceMotionEnabled()` 체크 유지.  
`scale1.value = withTiming(0.96, ...)` 은 `reduced=false` 브랜치에만 적용 ✓  
reduced=true 시 페이드만 (slide/scale 없음) ✓

### scheduleOnRN 0
파일 전체에 `scheduleOnRN` 호출 없음. setTimeout → JS-thread safe ✓

### tsc 신규 0
`Platform.select` + `|| 'monospace'` + `const MONO: string` 명시 타입 선언 → null/undefined 처리 완전. 나머지 TOKEN_ import, `scale` transform 추가, `SlipPlaceholder` 컴포넌트 모두 타입 문제 없음 ✓

### 슬립 치수
72×100 → 108×152 (약 1.5×), borderRadius 6→12, borderWidth 1.5→1 ✓  
slip1 `scale 1.0→0.96` withTiming(SLIDE_MS) — 깊이감 연출, 타이밍과 무관 ✓
