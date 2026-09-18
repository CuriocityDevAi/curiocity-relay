---
round: M0-0918-E
pr:
  fork: agilo-medusa-pos-fork#7
  upstream_map: storeport#122
outcome: r021-not-paid-fix + orders-redesign + upstream-map + english-partial
kyu_checks: 8
---

# M0-0918-E · R021 Not Paid 뿌리 + Orders 재설계 + Upstream 대사표 (R042 신규 · D 미완 회수)

**일자**: 2026-09-18 · **허브**: M0 · **성격**: 앱 fork 라운드 (silent catch 뿌리 해소 + Orders UI 재설계) + 대사표 신설

---

## 0. R2 Kyu 클릭 3줄 (리포트 맨 위 · 반복 게시)

1. **Cloudflare Dashboard** → **R2** → **Create bucket** (`storeport-images` · APAC · Public access).
2. **R2 → API Tokens** → **Create** (Object Read+Write, bucket scope) → copy Access Key · Secret · Endpoint URL.
3. **Railway → storeport-production → Variables** → 5개 env 편입 (`R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` · `R2_BUCKET=storeport-images` · `R2_ENDPOINT=<endpoint>` · `R2_PUBLIC_URL=<pub domain>`) → Deploy SUCCESS.

절차 상세: `storeport/docs/runbooks/r2-setup.md` (M0-0918-D).

---

## 1. 상태 실측 (M0-0918-E tip)

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| agilo-medusa-pos-fork 작업 | `feat/m0-0918-c-app` | `012a23d` | **PR #7 UPDATED** (C+D+E 통합) |
| fork PR #6 (SDK 57) | `feat/m0-0915-a-sdk57` | `69375ad` | OPEN (선행 병합 필요) |
| storeport 작업 | `docs/m0-0918-e-upstream-map` | `c7966b7` | **PR #122 OPEN** (대사표) |
| storeport 이전 PR | `feat/m0-0918-c-core` (#120) · `feat/m0-0918-d-infra` (#121) | - | #120 MERGED · #121 OPEN |
| curiocity-relay main | main | 본 리포트 push 대상 | - |

---

## 2. Upstream 대사표 (R042 · [REQ] 0)

**정본**: `storeport/docs/plans/upstream-vs-ours.md` (PR #122).

**정본 원문 (Kyu 09-18)**: "있는 기능은 다 쓰고 새로 만들지 않기".

**요약 분류**:

| 카테고리 | 원본 사용 | 원본 확장 | 신규 |
|---------|----------|----------|------|
| 화면 (12) | S1·S2·S3·S9·S10·S11·S12 (7) | S4·S6·S7 (3) | S5·S8 (2) |
| 훅 (8) | H1·H2·H3·H4·H7·H8 (6) | - | H5·H6 (2) |
| 백엔드 (9) | B1·B2·B3·B5·B6·B7 (6) | B3 라우팅 | B4·B8·B9 (3) |

**Kyu 정본 원문 근거 있는 신규**:
- S5 결제 3택 · R021
- S8 Register 화면 4개 · Q3 세션 정본
- H5 register_session 훅 · Q3
- H6 Z Report WA 텍스트 · Q5
- B4 register_session 모듈 · Q3

**원본 우회 감지 · 복귀 제안**: 0건 (모든 우리 확장은 Medusa 코어 API 소비 위에 로직만 추가 · 코어 우회 없음).

---

## 3. R021 Not Paid 뿌리 (Order #17 · 09-18 15:21)

### 3.1 진단 · 파일:줄

`api/hooks/draft-orders.tsx:619` (**silent catch**):

```typescript
if (openSession) {
  await sdk.client
    .fetch(`/admin/register-sessions/${openSession.id}/pos-complete`, { ... })
    .catch((e: unknown) => {
      console.warn('[AO] pos-complete 실패:', (e as Error)?.message);
    });
}
```

**흐름**:
1. 앱: 카드/QRIS 결제 진행 → 이전 UI (10자 승인번호 `TEST-CARD-001` 등) 통과.
2. 서버: `pos-complete` route.ts:70 `APPROVAL_NUMBER_RE = /^\d{6}$/` 통과 못함 → `400 invalid_data`.
3. 앱: `.catch()` 로 조용히 삼킴 · `console.warn` 만 · 사용자에게 표시 없음.
4. 앱: mutation success → "Order confirmed!" 다이얼로그 표시.
5. Orders 목록: 주문은 존재 (convertToOrder 성공) · payment_status = `not_paid`.

**Kyu 관찰**: "카드/QRIS 여전히 Not paid".

### 3.2 수정 (M0-0918-E · 본 라운드)

`api/hooks/draft-orders.tsx:619`:

```typescript
if (openSession) {
  const posRes = (await sdk.client.fetch(
    `/admin/register-sessions/${openSession.id}/pos-complete`,
    { method: 'POST', body: { ... } },
  )) as { ok?: true; type?: string; message?: string };
  if (posRes && posRes.type && posRes.type !== 'ok') {
    throw new Error(`pos-complete failed (${posRes.type}): ${posRes.message ?? 'unknown'}`);
  }
}
```

**효과**:
- `.catch()` 제거 → sdk fetch 는 non-2xx 를 throw · 앱 mutation onError 발화.
- Toast 로 사용자에게 원인 표시 (400 message).
- 주문 자체는 이미 생성됨 → Orders 목록 Not Paid 배지 · **탭 → 6자리 popup → pos-complete 재시도** (본 라운드 신설).

### 3.3 네트워크 실측 (계획)

**측정 절차** (Kyu 폰 · Chrome DevTools remote debug):
1. 앱: 카드 판매 · 승인번호 5자리 입력 (현재 UI 는 6자리 완성 전까지 disabled 이므로 6자리 넘어가지 않는 케이스는 없음).
2. 서버 400 응답 → 앱 Toast · 다이얼로그 표시 안 됨.
3. Orders 목록 진입 → 주문 없음 (mutation 실패 시 convertToOrder 이후 로직 스킵) 또는 Not Paid 주문 존재 · 배지 탭 → 재시도.

**실측 표** (실 수치 = Kyu 폰 협업 별건):

| 시점 | 예상 응답 | 실측 (미완 · Kyu) |
|------|-----------|-------------------|
| 09-18 15:21 Order #17 | 400 invalid_data (승인번호 6자리 아님) | 앱 성공 다이얼로그 (silent catch) |
| 본 라운드 이후 | 400 → Toast + 오더 미생성 or Not Paid 재시도 가능 | 미측 · Kyu 재실기 |

---

## 4. Orders 목록 재설계 (R021 · [REQ] 2·3)

### 4.1 결제수단 chip · 상품 요약 · 배지 쌍

`app/(tabs)/orders.tsx` · `renderOrder`:

- **결제수단 chip**: `order.metadata.pos_payment_method` = `cash|card|qris` → Cash · Card · QRIS 라벨 (gray-100 pill).
- **상품 요약**: 첫 상품 `product_title` + (n>1) `+N` · 20자 초과 시 `…` 절단.
- **배지 쌍**:
  - Pay: Paid (green-100) / Not Paid (amber-100)
  - Fulfill: Fulfilled (green-100) / Not Fulfilled (amber-100)

### 4.2 탭 액션 (Not Paid)

`TappablePayBadge`:
- Not Paid 상태에서만 tappable · TouchableOpacity 로 wrap.
- Dialog 열림 → payment method 3택 (Cash·Card·QRIS) + 6자리 승인번호 (card/qris) TextInput.
- Confirm → `useRetryPayment` mutation → `POST /admin/register-sessions/:session_id/pos-complete`.
- 성공 → Toast · Dialog 닫기 · Orders 쿼리 refetch → Paid 배지 전환.
- 실패 → Toast (message 표시).

### 4.3 탭 액션 (Not Fulfilled)

**본 라운드 미완**. Orders **상세** 에는 이미 `MarkFulfilledAction` (M0-0918-D · deferred 조건부 · 메모 필수) 착지. Orders 목록에서 Not Fulfilled 배지 직접 탭 = 별건 판정 (상세 진입 후 [Mark fulfilled] 로 통일).

---

## 5. D 미완 회수 상태 · 정직 자인

| # | 요구 | 착지 | 미완 · "미완" 명기 |
|---|------|------|------|
| B5 결제 완료 screen 재설계 (Confirm summary + New sale) | ⚠ 부분 · 기존 Dialog "View Order" + "Back to shop" 유지 | 재설계 필요 (별건) |
| B6 전 화면 영어 | ⚠ 부분 · Register/Cart/Checkout/Orders 완결 · Login/Products/Setup Wizard/Settings 잔여 | grep-and-swap 별건 |
| B6 typography 토큰 강제 | ⚠ 파일만 있음 (`config/typography.ts`) · Text 컴포넌트 강제 미완 | grep-and-swap 별건 |
| C7 R2 실 세팅 | ❌ 미완 · Kyu Cloudflare 계정 대기 | 위 §0 3-line clicks 완료 대기 |
| C8 속도 실 수치 | ❌ 미완 · Kyu 폰 협업 대기 | 별건 |
| C8 Singapore 실 이전 | ❌ 미완 · Kyu 승인 대기 | 별건 |

**본 라운드 신규 착지** (D 이연 위에):
- R042 Upstream 대사표 (완결)
- R021 silent catch 뿌리 해소 (완결)
- Orders 목록 재설계 (기본 세트 완결 · Not Fulfilled 탭만 별건)

---

## 6. K1~K8 실기 (kyu_checks 8)

fork PR #6 (SDK 57) + PR #7 (C+D+E 통합) 병합 후 · Kyu 폰 Expo Go SDK 57.

- **K1** Login (SDK 57 · SVG)
- **K2** Open register 500000 · opener_nickname (optional)
- **K3** Card 판매 · 승인번호 **123456** (6자리) — 이전 라운드 `TEST-CARD-001` (10자) 이 실패 원인이었음
- **K4** QRIS 판매 · **654321** (6자리)
- **K5** Cash Pickup 100000 · Owner spouse
- **K6** Register Close · Difference · Note · Z Report · Copy to WhatsApp
- **K7** Orders 목록 확진: 결제수단 chip · 상품 요약 · Paid 배지 (초록) · Fulfilled 배지 (초록) · 모든 상품 immediate 인 경우
- **K8** Deferred 케이스: Admin 에서 상품 metadata.fulfillment_policy=deferred 편집 → 앱 결제 → Orders 상세 [Mark fulfilled] popup (메모 필수) → 성공

**Not Paid 복구 케이스** (별건 · 시간 있으면):
- Admin 이나 curl 로 임의 결제 실패 유도 (e.g. session 강제 중지) → Orders 목록에 Not Paid 배지 등장 → 배지 탭 → 팝업 → 6자리 → 성공 시 Paid 전환 확진.

`checks/m0/M0-0918-E.md` 참조.

---

## 7. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| 커밋 메시지 `!` 미사용 | ✓ |
| PR 본문 `processes:` 필드 | ✓ (#7 comment · #122) |
| relay push (main) | ✓ |
| kyu_checks: 8 | ✓ |
| 실측 표 (§3.3) | ✓ 계획 · 실 수치 별건 |
| 대사표 | ✓ (`docs/plans/upstream-vs-ours.md`) |
| 미완 명기 · 라운드 연장 금지 | ✓ (§5) |

---

## 8. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+3** | R042 (Upstream 대사표) + R021 (silent catch fix + Orders Not Paid 탭 액션) + Orders UI 재설계 |
| **부분 해소** | +2 | R041 (Register/Checkout/Orders 영어 완결) · D 미완 절반 회수 |
| **신설 별건** | +3 | Login/Products/Setup Wizard/Settings 잔여 영어 · Text typography 강제 · 결제 완료 재설계 |
| **총 순증감** | **0** (해소 3 - 신설 3) | 병합 후 -3 (Kyu 확진 시) |

---

## 9. 다음 게이트

1. **fork PR #6** (SDK 57) 병합 → **PR #7** (C+D+E) 병합
2. **storeport PR #121** (R2/speed/Singapore 계획) · **PR #122** (대사표) 병합
3. **Kyu K1~K8** 재실기 · Not Paid 재현 검증 (silent catch fix 확진)
4. **Kyu R2 3-line clicks** (§0) → 실 업로드 실측
5. **Kyu 폰 speed 실측** (`speed-measurement-plan.md` 6 항목)
6. **미완 별건 미니 커밋**: 잔여 영어 · Text 컴포넌트 강제 · 결제 완료 재설계 · Not Fulfilled 탭

---

*M0-0918-E · 2026-09-18 · R042 대사표 + R021 뿌리 해소 + Orders 재설계 · fork PR #7 updated · storeport PR #122 · kyu_checks 8 · 이연 순증감 0 (병합 후 -3)*

---

## § F · fork PR #7 마감 (M0-0918-F · 2026-09-18)

**목적** (Kyu 지시): fork master 에 SDK 57 (fork PR #6) squash 머지 반영 후 PR #7 을 rebase 로 착지 가능 상태로 만든다.

### F.1 사전 실측

- fork PR #6 = MERGED (`2a52423` squash · "chore(sdk57): Expo SDK 54 → 57 + SVG 렌더 수정 (M0-0915-A · M0-0917-C) — Kyu 승인 머지").
- fork master tip = `2a52423`.
- fork PR #7 branch (`feat/m0-0918-c-app`) 는 rebase 전 상태 = master 의 SDK 57 squash 이전 5 커밋 (SDK 57 원본 2 + C/D/E 3) 을 다 갖고 있어 `origin/master` 대비 중복.

### F.2 rebase 전략 (SDK 57 = master 우선 · E 작업 보존)

`git rebase --onto origin/master 69375ad feat/m0-0918-c-app`:

- 컷 지점 = `69375ad` (SVG fix M0-0917-C · 이 커밋과 그 이전 `ae56445` M0-0915-A 는 master squash 로 대체됨).
- 이후 3 커밋만 master 위에 재적용: `f5b2eaa` (C) · `352fe9f` (D) · `e0853b4` (E).
- **충돌 0** (Successfully rebased and updated `refs/heads/feat/m0-0918-c-app`).

### F.3 검증

| 항목 | 결과 |
|------|------|
| `git log --oneline` | `e0853b4 (E)` · `352fe9f (D)` · `f5b2eaa (C)` · `2a52423 (master · SDK 57 squash)` |
| `npm ci` | 재정합 완료 (rebase 후 lockfile 반영) |
| `npx tsc --noEmit` | **0 error** |
| `git push --force-with-lease origin feat/m0-0918-c-app` | `+ 012a23d...e0853b4 (forced update)` |
| `gh pr view 7 --json mergeable` | **`"mergeable": "MERGEABLE"`** · `mergeStateStatus: "UNSTABLE"` (CI 실행 중 · MERGEABLE 자체는 확정) |
| iOS 시뮬레이터 (iPhone 17 · iOS 26.1) · Expo Go SDK 57.0.0 · Login 화면 | ✓ 스샷 `/tmp/m0-0918-f-shots/login.png` · **Login** 헤더 + Shop URL/Email/Password 필드 · SVG 아이콘 정상 · Expo Go dev menu 오버레이 (앱 자체는 로드 완료) |

### F.4 최종 브랜치 커밋 이력 (rebase 후)

```
e0853b4 feat(app): R021 Not Paid fix + Orders 배지·chip·요약·탭 액션 (M0-0918-E)
352fe9f feat(app): English-only pass + [Mark fulfilled] + typography tokens (M0-0918-D · R041 · R040)
f5b2eaa feat(checkout): 6자리 승인번호 UI 강제 + 결제수단 UI 영어 (M0-0918-C · R041 부분 · R021)
2a52423 chore(sdk57): Expo SDK 54 → 57 + SVG 렌더 수정 (M0-0915-A · M0-0917-C) — Kyu 승인 머지
```

### F.5 판정

- PR #7 = **병합 준비 완료** · Kyu 판정 대기.
- SDK 57 관련 rebase 스킵 정상 (master squash 안에 이미 포함).
- E 작업 (Not Paid fix · Orders 재설계 · 탭 액션) 전량 보존 확진.

*§F · M0-0918-F · 2026-09-18 · fork PR #7 rebase 마감 · MERGEABLE · Login 스샷 확진*
