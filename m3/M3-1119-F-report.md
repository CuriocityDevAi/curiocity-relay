#392 타이머 16 O · orientation 원복 O · fork PR #205 짧은 창 Cancel 닿음 O · 넓은 창 변화 0 O · spec 건너뛰기 제거 O

## storeport PR #392 (feat/M1-1119-F-cd-responsive)

### ① 타이머 폰트 16 원복
- `bpFs(bp, 20→16, 16, 14)` 수정 완료 — 넓은 창에서 의도치 않게 20 으로 커진 타이머 글자를 16 으로 되돌림
- 파일: `apps/customer-display/src/screens/KeypadAfterScreen.tsx`

### ② orientation landscape 원복
- `orientation: "default"` → `orientation: "landscape"` 되돌림 (주석 제거)
- **원복 이유**: `"default"` 는 iPad Split View 허용 여부와 무관(`UIRequiresFullScreen` 은 Info.plist 에서 별도 제어) — Android/iPhone 가로 고정 해제 부작용만 발생함
- 파일: `apps/customer-display/app.config.ts`

### Push & PR 업데이트
- 커밋: `3038d33` push → `feat/M1-1119-F-cd-responsive`
- PR #392 본문에 "orientation 원복 이유" 1줄 추가 완료
- pre-commit hook: 195 unit tests passed, 47 test suites

---

## fork (agilo-medusa-pos-fork) PR #205

### ② QRIS 짧은 창 ScrollView
- `View className="flex-1 items-center justify-center gap-6"` → `ScrollView(contentContainerStyle: flexGrow:1, alignItems:center, justifyContent:center, gap:24, paddingVertical:24)`
- 파일: `app/checkout/tender-qris/[draftOrderId].tsx`
- 507×500: Cancel 버튼 scrollIntoView 후 뷰포트 하단에 도달 O (스크린샷: `e2e/screenshots/M3-1119-F-qris-507x500-cancel.png`)
- 1194×834: 넓은 창 레이아웃 변화 없음 (스크린샷: `e2e/screenshots/M3-1119-E-qris-1194w-full.png`)

### ③ spec 가드 제거 + 507×500 케이스
- `if (svgBox) {}` → `expect(svgBox, 'qris-qr-svg not found in DOM').not.toBeNull()` 으로 교체
- 507×500 케이스 추가: `cancelBtn.scrollIntoViewIfNeeded()` → boundingBox y+h ≤ 500 → `cancelBtn.click()`
- 파일: `e2e/flows/M3-1119-E-qris-width.spec.ts`

### Playwright 실행 결과
```
4 passed (9.5s)
  ✓ M3-1119-F · Cancel 버튼 — 507×500 짧은 창 스크롤
  ✓ M3-1119-E · 1194w-full (1194×834)
  ✓ M3-1119-E · 507w-split (507×834)
  ✓ M3-1119-E · 400w-narrow (400×834)
```

### PR URL
- storeport #392: https://github.com/CuriocityDevAi/storeport/pull/392
- fork #205: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/205
