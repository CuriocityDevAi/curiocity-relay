---
name: R0-1105-R · 허브-1107-R 재리뷰 relay
description: fork #48 (M1-1105-N · Open shift blocking sheet) APPROVE · 가드 3 케이스 + 재진입 · 취소 경로 전수 차단 · opening_float 검증 전수 · D1 머지 뒤 충돌 0
author: R0
dated: 2026-11-07
---

# R0-1105-R · fork #48 리뷰 relay

**스코프**: fork PR #48 (M1-1105-N · Open shift blocking sheet on authenticated boot).
**정본**: `agilo-medusa-pos-fork@bc3c0e4` (master · #46 · #47 · #49 머지 후) · `storeport@946d31c`.
**금지**: 코드 수정 · 커밋.

## 판정

| 항목 | 결과 |
| --- | --- |
| 판정 | **APPROVE** |
| merge-tree vs master | **clean** (`eb92cff` · 충돌 0 · D1 머지 뒤 무영향) |
| 브랜치 고유 diff | 7 files +325/-12: `app/_layout.tsx` +16 · `components/RegisterBadge.tsx` -12/+6 · 신규 `components/register/OpenShiftSheet.tsx` +117 · `scripts/_harness.mjs` +29 · `scripts/m3-1105-b-playwright.mjs` +17 · 신규 `scripts/m1-1105-n-playwright.mjs` +164 · docs PNG 2장 |
| `settings.tsx` / `api/hooks/**` 수정 | **0** (브랜치 고유 diff 범위 밖) |
| 영어 전용 UI | ✓ 전수 영어 (한/인니/일 0건) |
| 토큰 (D1 머지 뒤 충돌) | ✓ `text-ink-muted` + 공용 Dialog/Button/TextField · raw color 0 · primitive class 0 · merge clean |

## 4 체크포인트

### ① `_layout` 가드 조건 + 3 케이스

`app/_layout.tsx` 에 격리 서브컴포넌트 신설 (미인증 `useMedusaSdk` throw 회피 · M0-1104-A 와 동일 사유):

```jsx
const AuthedOpenShiftGate: React.FC<{ stockLocationId?: string }> = ({ stockLocationId }) => {
  const openSessionQuery = useCurrentOpenSession(stockLocationId);
  const shouldPrompt = openSessionQuery.isFetched && !openSessionQuery.data;
  return <OpenShiftSheet visible={shouldPrompt} />;
};

// App() 본체
{auth.state.status === 'authenticated' && isSetupComplete && (
  <AuthedOpenShiftGate stockLocationId={settings.data?.stock_location?.id} />
)}
```

**가드 = "authenticated + isSetupComplete + (isFetched && data === null)"**.

| 케이스 | 가드 평가 | 시트 노출 |
| --- | --- | --- |
| **로그인 직후** (returning user · setup 완료 · 어제/오늘 세션 없음) | auth=on · setup=on · fetch 후 `.data === null` → shouldPrompt=true | ✓ 노출 |
| **앱 재시작** (persisted auth+setup · 세션 미생성/closed) | 동일 가드 · 동일 평가 | ✓ 노출 |
| **세션 close 뒤** (close mutation 이 `REGISTER_QK` 캐시 invalidate · refetch 결과 세션 없음) | isFetched=true · data=null → shouldPrompt=true | ✓ 노출 |
| **세션 open 중 재진입** (useCurrentOpenSession.data = session row) | shouldPrompt=false (data truthy) | ✗ 미노출 |

Playwright **Case A** (sheet forced · 세션 없음) + **Case B** (sheet skipped · 세션 open) 로 두 끝 검증. "앱 재시작"·"세션 close 뒤" 는 동일 가드 분기 재진입이므로 Case A 안에 포괄.

보호:
- `AuthedOpenShiftGate` 를 서브컴포넌트로 격리 → 미인증 render 에서 `useMedusaSdk` throw 회피 ✓
- `isFetched` 체크 → 초기 로딩 중 (data=undefined) 시트 flash 방지 ✓

### ② 취소 경로 전수 — Log out 만

`components/register/OpenShiftSheet.tsx`:

```tsx
<Dialog
  visible={visible}
  showCloseButton={false}
  dismissOnOverlayPress={false}
  onRequestClose={(event) => event.preventDefault()}
  onOverlayPress={(event) => event.preventDefault()}
  title="Open shift"
>
```

| off-ramp | 상태 |
| --- | --- |
| X (close) 아이콘 | **없음** (`showCloseButton={false}`) |
| 바깥 탭 (overlay press) | **무시** (`dismissOnOverlayPress={false}` + `onOverlayPress preventDefault`) |
| Android back (하드웨어 뒤로가기) | **무시** (`onRequestClose preventDefault`) |
| swipe-down / drag | Dialog 기본 비활성 + overlay 이벤트 preventDefault · 차단 |
| **Log out 버튼** | `<Button variant="outline" onPress={handleLogout}>Log out</Button>` · **유일한 off-ramp** |

Playwright 자동 검증:
- A2: `[data-testid="open-shift-logout"]` 존재
- A3: `aria-label*="close" i` 셀렉터 0개

### ③ opening_float 검증 + 서버 body 일치 + 409

**Zod schema**:
```typescript
opening_float: z
  .string()
  .min(1, 'Enter opening float')
  .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, 'Must be a non-negative number')
```

| 입력 | 평가 | 결과 |
| --- | --- | --- |
| `"0"` | Number(0)=0 · !isNaN(0) · 0>=0 | **허용** ✓ |
| `"100000"` | !isNaN · >=0 | 허용 ✓ |
| `"-500"` | -500 < 0 | **차단** (`Must be a non-negative number`) ✓ |
| `"abc"` | Number(NaN) · isNaN(NaN)=true · !isNaN=false | **차단** ✓ |
| `""` | `.min(1)` 위배 | 차단 (`Enter opening float`) ✓ |

추가 방어: `<TextField keyboardType="number-pad">` · iOS/Android 숫자 키패드만 노출.

**서버 POST `/admin/register-sessions` body 일치** (storeport@946d31c `src/api/admin/register-sessions/route.ts`):

```typescript
openSession.mutateAsync({
  stock_location_id: stockLocation.id,
  opening_float: Number(data.opening_float),
  sales_channel_id: salesChannel?.id,
  opener_nickname: data.opener_nickname?.trim() || undefined,
} as any);
```

| body field | 서버 수용 | fork 전송 | ✓ |
| --- | --- | --- | --- |
| `stock_location_id` | required | required | ✓ |
| `opening_float` | required (non-neg number) | zod refine 보장 | ✓ |
| `sales_channel_id` | optional | `salesChannel?.id` | ✓ |
| `opener_nickname` | optional | `trim() || undefined` | ✓ |

**409 Conflict** (오늘 세션 이미 open):
- 서버 body: `{type: "conflict", message: "Open session already exists ..."}`
- SDK non-2xx throw → catch 에서 message Toast 로 표시
- react-query refocus / onSettled refetch 시 세션 1개 반환 → sheet 자동 닫힘

### ④ 교차 조건

| 축 | 결과 |
| --- | --- |
| `RegisterBadge` 중복 CTA 가드 | `if (!session.data) return null;` (기존 "Tap to open" CTA 제거) · sheet 가 blocking modal 로 떠있는 동안 badge 숨김 · 시트 닫힘 = 세션 생성 = 이 분기 미진입 | ✓ |
| `settings.tsx` 수정 | 0 (β · M2 소유 유지) | ✓ |
| `api/hooks/**` 수정 | 0 (`opener_nickname` 은 `as any` cast 로 호출부 전송 · 서버 optional 수용) | ✓ (관찰 ⑥-1) |
| **영어 전용** | OpenShiftSheet 전수: "Open shift" · "Count the cash drawer and enter the opening float." · "Opening float (IDR · 0 allowed)" · "Opened by (nickname, optional)" · "Log out" · "Register opened" · "Open failed" · "Stock location is not set" · "Enter opening float" · "Must be a non-negative number" | ✓ |
| **토큰 (D1 머지 뒤 충돌)** | `git merge-tree origin/master origin/feat/m1-1105-n-open-shift-sheet` 결과 clean (`eb92cff`) · OpenShiftSheet 는 `text-ink-muted` + 공용 Dialog/Button/TextField 만 사용 · raw color 0 · primitive color class 0 | ✓ |

### ⑤ Playwright 어설션 매핑

| 어설션 | 검증 축 |
| --- | --- |
| A1 sheet visible | 가드 조건 ① |
| A2 Log out 존재 | off-ramp ② |
| A3 close icon 없음 | off-ramp ② |
| A4 POST 1회 | opening_float=0 성공 ③ |
| A5 sheet auto-close | 가드 flip ① |
| A6 /products 유지 | 미 네비게이션 |
| B1 sheet 미노출 (세션 open) | 가드 조건 ① (재진입) |
| B2 POST 미호출 | 가드 ① |
| B3 /products 유지 | 미 네비게이션 |
| Case A/B err | console.error 0 · pageerror 0 |

로컬 로그 (PR body): m1-1105-n **13/13** · m3-1105-b 30/30 · m3-1105-d 22/22 · m3-1105-f 18/18 · m2-1105-c 8/8 전부 pass.

### ⑥ 비차단 관찰 (follow-up)

1. **`opener_nickname` `as any` cast** — R0-1105-O ④ P3 권고 ("`useOpenRegisterSession` body 에 `opener_nickname` 지원") 를 다음 M1 라운드에 타입 보강 가능. 현 상태 서버 수용으로 기능상 문제 없음.
2. **409 cache sync** — 응답 body 에 `register_session: existing` 포함되나 fork 는 Toast message 만 처리 · cache 수동 업데이트 안 함. refocus/onSettled 가 자연 복구. 미세 sub-optimal · 비차단.
3. **`isSetupComplete=false` + 세션 없음** — Sheet · Badge 모두 숨김. wizard 진행 중이므로 UX 적절 · 의도된 설계.

## 환경 보조

- fork master 로컬: `git fetch origin && git reset --hard origin/master` → `bc3c0e4` (#46 · #47 · #49 포함)
- #48 로컬 재현: `git checkout origin/feat/m1-1105-n-open-shift-sheet` → `577ffca`
- storeport main 참조: `/Users/kyu.lee/projects/storeport@origin/main = 946d31c` (register-sessions POST route body contract 확인)
- 브랜치 고유 commits: `git log origin/feat/m1-1105-n-open-shift-sheet ^fd0aa70` → 3 commits (1fe567f feat + 6321e05 prettier + 577ffca harness-fix)

## 참조

- 직전 리뷰: `r0/R0-1105-Q-report.md` (fork #46 · #47 둘 다 APPROVE)
- fork master HEAD: `bc3c0e4` (#49 ws override 머지 후)
- storeport main HEAD: `946d31cdd9eadd42c149d81639044eaf02d41fad`
- GitHub review 제출: [#48](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/48) · APPROVE (COMMENT event · self-authored 제약)
