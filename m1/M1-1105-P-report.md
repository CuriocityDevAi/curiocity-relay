---
round: M1-1105-P
pr:
  fork: agilo-medusa-pos-fork#53
  fork_url: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/53
  fork_commit: (push time 참조 · CI 결과 추가 commit 때 갱신)
outcome: P5 β · Settings "Close shift" 행 (Reset 바로 위) · 세션 open 일 때만 활성 · 하루 복수 교대 ② 재노출 검증
kyu_checks: 4 (활성 노출 · 라우팅 · 비활성 문구 · close 뒤 sheet 재노출)
---

# M1-1105-P · P5 β · Settings Close shift 행 (coding-β 완결)

**일자**: 2026-11-07 · **허브**: M1 · **성격**: Kyu P5 결정 ④ · M1-1105-L §3 coding-β · **승인**: 사전 "허브-1107-P · 바로 PR".

---

## 0. 원문 (허브-1107-P)

`app/(tabs)/settings.tsx` 에 "Close shift" 행: 현재 open 세션 있을 때만 활성 · 서브텍스트 "Opened since <HH:mm WIB> · <nickname or cashier>" · 탭 → `/register/close` (기존) · 세션 없으면 비활성(text-ink-disabled) + "No open shift". 위치 = Reset 섹션 바로 위.
close 완료 뒤 돌아오면 `_layout` 의 Open shift 시트 (#48) 가 다시 뜨는지 Playwright 확인 (하루 복수 교대 ②). 영어 전용 · D1 토큰만 · 색 어설션 · CI.
파일 주인: `app/(tabs)/settings.tsx` (이번 라운드 한정 M1) · `components/register/**` · PrinterRow 등 M2 컴포넌트 수정 금지.

---

## 1. 변경 파일 (주인 M1 · 이번 라운드 한정)

| 파일 | 변경 |
|------|------|
| `app/(tabs)/settings.tsx` | `useCurrentOpenSession` import + `formatOpenedHM` (UTC → WIB +7) helper + Shift 섹션 조건부 UI 신설 (Reset 바로 위) |
| `scripts/m1-1105-p-playwright.mjs` | **신규** · 3 case × 어설션 16/16 pass |
| `docs/M1-1105-P-active.png` · `docs/M1-1105-P-disabled.png` | 스샷 2장 |

**미수정**: `components/register/**` · `components/printer/PrinterRow.tsx` · `api/hooks/**` — 모두 이번 scope 외.

### 핵심 로직

```tsx
const openSession = useCurrentOpenSession(settings.data?.stock_location?.id);
// ... Reset 섹션 바로 위에 Shift 섹션 신설:
<Text className="mb-4 text-2xl">Shift</Text>
{openSession.data ? (
  <View testID="settings-close-shift-row">
    <Button
      onPress={() => router.push('/register/close')}
      variant="outline"
      testID="settings-close-shift-button"
    >Close shift</Button>
    <Text className="mt-2 text-sm text-ink-muted" testID="settings-close-shift-subtext">
      Opened since {formatOpenedHM(openSession.data.opened_at)} · {openSession.data.opener_nickname?.trim() || openSession.data.opened_by_user_id}
    </Text>
  </View>
) : (
  <View testID="settings-close-shift-row">
    <Button variant="outline" disabled testID="settings-close-shift-button-disabled">Close shift</Button>
    <Text className="mt-2 text-sm text-ink-disabled" testID="settings-close-shift-subtext-empty">
      No open shift
    </Text>
  </View>
)}
```

**영어 전용** · **D1 토큰만** (`text-ink-muted`, `text-ink-disabled`).

---

## 2. 스샷 2장

### Active (open session) · `docs/M1-1105-P-active.png`
- 상단 Open badge "● Open · Jakarta 본점 · since 2026.11.07 16:30 by Kyu"
- Settings 섹션: Sales Channel · Region · Stock location · Printer · **Shift** (신규 · Reset 바로 위) · Reset · Account
- Shift 섹션: "Close shift" outline 버튼 활성 + "Opened since 16:30 WIB · Kyu" (ink-muted)

### Disabled (no session) · `docs/M1-1105-P-disabled.png`
- Settings 페이지가 뒷배경 (OpenShiftSheet overlay 적용)
- Shift 섹션의 "Close shift" 버튼 disabled + "No open shift" (ink-disabled · rgb(200,200,200))
- 전면에 **Open shift** blocking modal (M1-1105-N · #48)

---

## 3. 어설션 (Playwright 16/16 pass)

```
=== RUN · Case A (open · active) ===
  ✓ (A1) Close shift 행 노출
  ✓ (A2) Close shift 버튼 활성 (testID settings-close-shift-button)
  ✓ (A3) 서브텍스트 "Opened since 16:30 WIB · Kyu"
  ✓ pageerror 0 · console.error 0

=== RUN · Case B (none · disabled) ===
  ✓ (B1) Close shift 행 노출 (disabled)
  ✓ (B2) Close shift 버튼 disabled
  ✓ (B3) 서브텍스트 "No open shift"
  ✓ (B4) 비활성 텍스트 색상 = text-ink-disabled (rgb(200, 200, 200))
  ✓ (B5) Open shift blocking sheet 노출 (M1-1105-N 가드)
  ✓ pageerror 0 · console.error 0

=== RUN · Case C (close → sheet) ===
  ✓ (C1) /register/close 라우팅
  ✓ (C2) Close 완료 후 OpenShiftSheet 재노출 (하루 복수 교대 ②)
  ✓ pageerror 0 · console.error 0

16/16 passed · 0 failed
```

### 회귀 (전원 pass · 로컬)
```
npx tsc --noEmit                             → exit 1 (잔존 global.css · pre-existing)
m3-1105-a-color-assertions.mjs                → 37/37
m3-1105-c-english-assertions.mjs              →  5/5
m1-1104-a-assertions.mjs                      → 44/44
m1-1104-b-assertions.mjs                      → 26/26
m1-1105-a-assertions.mjs                      → 33/33
m1-1105-h-assertions.mjs                      → 27/27
m1-1105-b-playwright.mjs                      →  6/6
m1-1105-n-playwright.mjs                      → 13/13
```

---

## 4. CI 링크 (fork PR #53)

- (push 직후 pending · 리포트 작성 시점 기준)
- CI 그린 확정 후 PR body / 본 리포트 하단에 추가 반영.

---

## 5. Kyu 아이패드 실기 체크 (4건)

| # | 체크 |
|---|------|
| 1 | Settings 탭 열기 → Reset 바로 위 **Shift** 섹션 노출 · Close shift 버튼 활성 |
| 2 | 서브텍스트 "Opened since <HH:mm WIB> · <nickname>" 정확 표기 |
| 3 | Close shift 탭 → `/register/close` 화면 (기존) |
| 4 | Close 완료 → Open shift blocking modal (#48) 자동 노출 |
| 참고 | (대조) 세션 없음 상태로 Settings → "No open shift" + disabled 버튼 (ink-disabled) |

---

## 6. 규약 정합

| 규약 | 정합 |
|------|------|
| fork master(`cf78d22` · #48 머지됨) 위 작업 | ✓ |
| `app/(tabs)/settings.tsx` 수정 (이번 라운드 한정 M1) | ✓ |
| `components/register/**` · PrinterRow · api/hooks 미수정 | ✓ |
| 세션 open 일 때만 활성 · 서브텍스트 "Opened since HH:mm WIB · nickname or cashier" | ✓ |
| 세션 없으면 비활성 + "No open shift" + text-ink-disabled | ✓ |
| 위치 Reset 섹션 바로 위 | ✓ |
| 하루 복수 교대 ② Playwright 검증 | ✓ (Case C) |
| 영어 전용 · D1 토큰만 | ✓ |
| 색 어설션 · CI | ✓ (37/37) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 7. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +1 (M1-1105-L §3 coding-β 완결 · Kyu 결정 ④) |
| 미완 (Kyu 도장) | 4 |
| **총 순증감** | **+1 해소** |

---

## 8. 다음 게이트

1. **PR #53 CI** 확인 → 머지.
2. Kyu 아이패드 실기 (4건) 체크.
3. **M3-coding** (ReceiptCard cashier/session 표기) 는 M3 소유 발부 대기.

---

*M1-1105-P · 2026-11-07 · Close shift row · fork PR #53 · 4 파일 (modified 1 · new 3) · Playwright 16/16 pass · 회귀 전원 pass · 영어 전용 · D1 토큰*
