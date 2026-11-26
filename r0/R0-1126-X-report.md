#274 CHANGES

## 판정 근거

### V4-2 — `tabBarStyle.backgroundColor` = 탭바 **전체** 배경 변경 (범위 초과)

**확인**: `tabBarStyle`은 탭바 컨테이너 전체에 적용되는 스타일. 선택된 탭만이 아닌 **탭바 전체 배경**이 TOKEN_SELECTED(#3F3F3F 차콜)로 고정됨.

- **원본(master)**: `tabBarStyle` 없음 → 시스템 테마 색 (`DarkTheme`: 어두운 배경, `DefaultTheme`: 흰 배경)
- **이 PR**: 시스템 테마와 무관하게 항상 차콜 고정 → 라이트 모드에서도 차콜 탭바 강제

Kyu 요구("선택 시 Sell 글자 가시성")를 충족하려면 `tabBarActiveTintColor`만 바꾸면 됨. `tabBarStyle.backgroundColor` 추가는 범위 초과.

**수정 방향**: `tabBarStyle` 블록 제거 + `useColorScheme()`으로 모드별 활성 색만 분기:
```tsx
tabBarActiveTintColor: colorScheme === 'dark' ? TOKEN_ON_SELECTED : TOKEN_INK,
// tabBarStyle 없음 → 시스템 테마 배경 유지
```

토큰 사용(TOKEN_SELECTED, TOKEN_ON_SELECTED, TOKEN_INK_SUBTLE) 모두 시맨틱 ✓
선택(#FFF on #3F3F3F) · 비선택(#B5B5B5 on #3F3F3F) 대비 OK ✓

---

### V4-3 — 상품 시트 이미지 `contain` ✓

- `resizeMode="contain"` → 세로(400×600) · 가로(800×400) 사진 모두 잘림 없이 전체 표시 ✓
- `bg-surface-muted` 여백 → TOKEN_SURFACE_MUTED(#F2F2F0) 시맨틱 ✓
- 상품 목록 카드 썸네일(`sell.tsx:186`): `object-cover` 그대로 (변경 없음) ✓

---

## 테스트 결과

### vitest (`npm test`)

```
Test Files  89 passed (89)
      Tests  1158 passed | 6 expected fail | 3 todo
   Duration  1.95s
```
※ upng-js 미설치(기존 문제) → `npm install upng-js` 후 전체 통과. PR 변경과 무관.

### lint (`npm run lint`)

```
✖ 71 problems (0 errors, 71 warnings)
```
PR 수정 파일(`_layout.tsx`, `product-details.tsx`) 관련 에러 없음. 경고 71건 모두 기존 파일.

### playwright (`npx expo export -p web && npx playwright test M3-1126-H-tabbar-product-image.spec.ts`)

```
4 passed (20.0s)
  ✓ V4-2 탭바 선택 가시성 › 선택 라벨 색 ≠ 탭바 배경색 — portrait
  ✓ V4-2 탭바 선택 가시성 › 선택 라벨 색 ≠ 탭바 배경색 — landscape
  ✓ V4-3 상품 시트 이미지 contain · 세로/가로 사진 — portrait
  ✓ V4-3 상품 시트 이미지 contain · 세로/가로 사진 — landscape
```

---

## 스크린샷

첨부: `M3-1126-H-tabbar-sell-portrait.png`, `M3-1126-H-tabbar-sell-landscape.png`
→ 탭바 전체 배경이 차콜(#3F3F3F)로 고정됨 확인. 선택 라벨 흰색 ✓, 비선택 라벨 회색 ✓.

첨부: `M3-1126-H-product-sheet-portrait.png`, `M3-1126-H-product-sheet-landscape.png`
→ 세로/가로 사진 모두 contain 적용, 여백은 bg-surface-muted 색상 ✓.
