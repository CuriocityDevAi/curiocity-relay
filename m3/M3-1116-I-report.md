#301 MERGEABLE · diff 4파일 · E2E 3/3 · pos-integration ❌(Build commerce-core 오류, CD 무관)

## 충돌 해결 경위

PR #301 브랜치(`feat/m3-1116-h`)가 #295 머지 전 상태에서 갈라져 `_layout.tsx`·`index.tsx` 등 16개 파일이 diff에 포함되어 CONFLICTING 상태였음.
`git reset --hard origin/main` 후 대상 4파일만 재적용하여 force-push → 즉시 MERGEABLE.

## 적용 내용

### 1. `app/pair.tsx` — 테마 토큰 + 완전 개편

| raw hex | 토큰 |
|---------|------|
| `#f8f8f6` | `t.bg` |
| `#1a1a1a` | `t.ink` |
| `#555`, `#888` | `t.muted` |
| `#ddd` | `t.border` |
| `#fff` | `t.mark` |
| `#f0f0ee` | `t.soft` |
| `#c0392b` (에러) | `t.accent` |

기능 추가:
- `useTheme()` + `useLang()` 추가 (i18n 힌트 5개 언어)
- 3열 전화패드: 중첩 row + `flex:1` key → `1 2 3 / 4 5 6 / 7 8 9 / [blank] 0 ⌫`
- 6자리 자동 제출: `useEffect([digits])` → `doSubmit(digits)`
- 입력 잠금: `loading` 중 모든 키 `disabled` + `opacity: 0.5`
- 흔들기 애니메이션: `Animated.sequence` (실패 시)

### 2. `src/i18n/strings.ts` — PairStrings 추가

`PairStrings` 인터페이스 (title·subtitle·hint·error) + `PAIR_STRINGS` (en/id/ko/ja/zh) 추가.

### 3. `src/i18n/context.tsx` — pair 필드 노출

`LangContextValue.pair: PairStrings` + `PAIR_STRINGS[lang]` useMemo에 추가.

### 4. `e2e/pair-screen.spec.ts` — 3개 테스트

- ✅ 렌더 확인 (1180×820 iPad 가로)
- ✅ 6자리 자동 제출 → mock POST → 대기화면 이동 + `code:"123456"` 검증
- ✅ 실패 → `pair-error` 표시 + 칸 비워짐

## 로컬 검증

```
TypeScript: tsc --noEmit → 에러 없음
Vitest: 123 passed (customer-display)
E2E pair-screen: 3 passed (1180×820)
  ✓ no device token → /pair screen renders (iPad landscape) (285ms)
  ✓ 6-digit auto-submit → pair POST called → navigates to waiting screen (1.3s)
  ✓ failed pair → error message shown · digits cleared (1.2s)
E2E 전체: 27 passed, 8 skipped
```

## Playwright 스크린샷 확인

1180×820 iPad 가로 — 3열 배열(`1 2 3 / 4 5 6 / 7 8 9 / [blank] 0 ⌫`) 정상 렌더 확인.
에러 화면: `t.accent` 토큰(pastel 테마 = #A0522D) 적용 — 테마 전환 시 pair 화면도 따라감.

## CI 결과 (pr #301 / run 43806966380)

| 체크 | 결과 |
|------|------|
| check | ✅ |
| markers-and-forbidden | ✅ |
| changes-filter | ✅ |
| unit-commerce-core | ✅ |
| e2e-admin-loyalty | ✅ |
| customer-display | ✅ |
| pos-integration | ❌ Build commerce-core 단계 실패 — customer-display 파일 변경 무관 |
| docker-smoke-commerce-core | pending(실행 중) |
