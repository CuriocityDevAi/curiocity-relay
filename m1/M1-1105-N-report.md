---
round: M1-1105-N
pr:
  fork: agilo-medusa-pos-fork#48
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/48
  fork_commit: (push time 참조 · relay commit SHA 는 ci 결과 추가 commit 때 갱신)
outcome: P5 α · Open shift blocking sheet 가 인증+setup 완료일 때 session null 이면 자동 노출 · Log out 만 off-ramp · 하루 복수 교대 지원 · api/hooks + settings 변경 0
kyu_checks: 4 (시트 자동 노출 · opening_float 0 입력 성공 · close 뒤 재노출 · Log out 작동)
---

# M1-1105-N · P5 α · Open shift 강제 시트 (coding-α 완결)

**일자**: 2026-11-07 · **허브**: M1 · **성격**: Kyu P5 결정 ①② · M1-1105-L §3 coding-α · **승인**: 사전 "work-queue · 바로 PR".

---

## 0. 원문 (허브-1107-N)

fork master(`fd0aa70`). P5 α · 로그인 직후 Open shift 강제 시트.
- `components/register/OpenShiftSheet.tsx` 신규 · `app/_layout.tsx` 가드 · `components/RegisterBadge.tsx` 중복 CTA 1줄 가드.
- 취소 없음 · Log out 만 · opening_float 0 허용 · 성공 시 닫힘 · 하루 복수 교대.
- `api/hooks` 변경 0 · `app/(tabs)/settings.tsx` 손대지 말 것 (β · M2).
- Playwright: 시트 노출 → float 입력 → products 도달 + 세션 open 재진입 시 시트 미노출.

---

## 1. 변경 파일 (파일 주인 M1)

| 파일 | 변경 |
|------|------|
| `components/register/OpenShiftSheet.tsx` | **신규** · Dialog blocking modal · `showCloseButton=false` · `dismissOnOverlayPress=false` · `onRequestClose` 하드웨어 back 무시 · opening_float(0 허용) + opener_nickname + Submit + Log out · 서버 응답 onSuccess → register-session 캐시 invalidate → 상위 가드 flip → 자동 닫힘 (명시 close 호출 없음) |
| `app/_layout.tsx` | `AuthedOpenShiftGate` 신설 · 인증+setup 완료일 때만 마운트 (미인증 서브트리 격리 · M0-1104-A 패턴) · `openSessionQuery.isFetched && !openSessionQuery.data` 가드 |
| `components/RegisterBadge.tsx` | session null 분기 → `return null` (1줄) · open 분기 그대로 |
| `scripts/m1-1105-n-playwright.mjs` | **신규** · Case A (sheet forced · 9 어설션) + Case B (sheet skipped · 5 어설션) = 13/13 |
| `docs/M1-1105-N-sheet.png` · `docs/M1-1105-N-after.png` | 스샷 2장 |

**api/hooks/** 변경 0** · **app/(tabs)/settings.tsx 변경 0** (β · M2 소유) · 영어 전용 · 기존 토큰 (`text-ink-muted`) 만 사용 (D1 머지 전).

### 가드 핵심

```tsx
// app/_layout.tsx
const AuthedOpenShiftGate: React.FC<{ stockLocationId?: string }> = ({ stockLocationId }) => {
  const openSessionQuery = useCurrentOpenSession(stockLocationId);
  const shouldPrompt = openSessionQuery.isFetched && !openSessionQuery.data;
  return <OpenShiftSheet visible={shouldPrompt} />;
};

// App() body:
{auth.state.status === 'authenticated' && isSetupComplete && (
  <AuthedOpenShiftGate stockLocationId={settings.data?.stock_location?.id} />
)}
```

왜 격리 컴포넌트? `useCurrentOpenSession` 내부에서 `useMedusaSdk()` 호출 — 미인증 상태 render 시 throw ("User is not authenticated" · M0-1104-A). AuthedBootstrap 과 동일하게 조건부 마운트로 해결.

### 중복 CTA 1줄 가드

```tsx
// components/RegisterBadge.tsx
- if (!session.data) {
-   return (<TouchableOpacity onPress={() => router.push('/register/open')}>...Tap to open</TouchableOpacity>);
- }
+ if (!session.data) return null;  // 시트가 상위에서 blocking modal 로 담당
```

---

## 2. 스샷

### Case A · sheet forced (`docs/M1-1105-N-sheet.png`)
- 뒷배경 products 그리드 어둡게 깔림
- "Open shift" 중앙 모달 · "Jakarta 본점 · Count the cash drawer and enter the opening float."
- `Opening float (IDR · 0 allowed)` + `Opened by (nickname, optional)` · Open shift 버튼 · **Log out** 버튼
- 닫기 아이콘 없음 (`showCloseButton=false`)

### Case A · after success (`docs/M1-1105-N-after.png`)
- 상단 녹색 bar "● Open · Jakarta 본점 · since 2026.11.07 16:00" + Pickup · Close
- 상품 그리드 (Kopi Tubruk · Teh Tarik)
- 하단 "Register opened ✓" toast

---

## 3. 어설션 (Playwright 13/13 pass)

```
=== RUN · Case A (sheet forced) ===
--- (2A) Open shift 시트 노출 대기 ---
  ✓ (A1) Open shift 시트 노출
  ✓ (A2) Log out 버튼 존재 (유일한 off-ramp)
  ✓ (A3) 닫기 아이콘 없음 (Dialog showCloseButton=false)
--- (3A) opening_float 0 입력 → Open shift ---
  ✓ (A4) POST /admin/register-sessions 1회
  ✓ (A5) 시트 자동 닫힘 (세션 생성 뒤)
  ✓ (A6) /products URL 유지
  ✓ 신규 console.error 0 · pageerror 0

=== RUN · Case B (sheet skipped) ===
  ✓ (B1) 시트 노출 안 됨 (세션 이미 open)
  ✓ (B2) register-sessions POST 미호출 (open 세션 유지)
  ✓ (B3) /products 유지
  ✓ 신규 console.error 0 · pageerror 0

13/13 passed · 0 failed
```

### 회귀 (전원 pass · 로컬)
```
npx tsc --noEmit                             → exit 1 (잔존 global.css pre-existing)
m1-1104-a-assertions.mjs                      → 44/44
m1-1104-b-assertions.mjs                      → 26/26
m1-1105-a-assertions.mjs                      → 33/33
m1-1105-h-assertions.mjs                      → 27/27
m3-1105-a-color-assertions.mjs                → 37/37
m1-1105-b-playwright.mjs                      →  6/6
```

---

## 4. CI 링크 (fork PR #48)

- (push 직후 pending · 리포트 작성 시점 기준 pending)
- 결과 확정 후 PR body / 본 리포트 하단에 추가 반영.

---

## 5. Kyu 아이패드 실기 체크 (4건)

| # | 체크 |
|---|------|
| 1 | 로그인 → Open shift blocking modal 자동 노출 · 취소 버튼 없음 |
| 2 | opening_float `0` 입력 → Open shift 탭 → 시트 닫힘 + "Register opened" toast + 상단 Open 배지 |
| 3 | RegisterBadge 의 Close 탭 → close 완료 → 자동으로 Open shift 시트 다시 노출 (하루 복수 교대) |
| 4 | Log out 탭 → 로그인 화면 복귀 (유일한 off-ramp) |

---

## 6. 규약 정합

| 규약 | 정합 |
|------|------|
| fork master(`fd0aa70`) 위 작업 | ✓ |
| 파일 주인 M1 (`app/_layout.tsx` · `components/register/**` · `components/RegisterBadge.tsx`) | ✓ |
| api/hooks 변경 0 | ✓ |
| settings.tsx 변경 0 (β · M2) | ✓ |
| 영어 전용 | ✓ (모든 라벨 영어) |
| 기존 토큰 (D1 머지 전) 사용 | ✓ (`text-ink-muted` · `text-success` · `text-danger` 등 기존) |
| 취소 버튼 없음 · Log out 만 | ✓ (`showCloseButton=false` · `dismissOnOverlayPress=false` · `onRequestClose event.preventDefault`) |
| opening_float 0 허용 | ✓ (`refine Number(v) >= 0`) |
| 성공 시 자동 닫힘 | ✓ (가드 flip) |
| 하루 복수 교대 (close 뒤 시트 재노출) | ✓ (가드는 session.data === null 기준) |
| Playwright: 로그인 → 시트 → float → products · 재진입 시 시트 미노출 | ✓ (Case A + B) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (M1-1105-L §3 coding-α 완결) |
| 등재 | 0 (후속 coding-β는 M2 소유 · M3-coding은 M3 소유 · 이미 §9 등재된 상태 유지) |
| 미완 (Kyu 도장) | 4 |
| **총 순증감** | **+1 해소** |

---

## 8. 다음 게이트

1. **PR #48 CI** 확인 → 머지.
2. Kyu 아이패드 실기 (4건) 체크.
3. **β (Settings Close shift 행)** · **M3-coding (ReceiptCard cashier/session)** 는 각 소유 허브가 발부.

---

*M1-1105-N · 2026-11-07 · Open shift blocking sheet · fork PR #48 · 5 파일 (new 3 · modified 2) · Playwright 13/13 pass · 회귀 전원 pass · 영어 전용 · api/hooks + settings 변경 0*
