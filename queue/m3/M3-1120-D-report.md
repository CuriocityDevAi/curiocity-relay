M3-1120-D-report
R2 방식 A(WebView) · 미러 O · 배지 실연결 O · native 변경 O/X → X · PR #218(pos) + #409(storeport) · tests 37/37

## 방식 결정

| 후보 | 채택 | 근거 |
|------|------|------|
| A WebView | ✅ | 픽셀 동일(실 CD 컴포넌트) · native 변경 없음 · `react-native-webview` 기존 설치분 |
| B snapshot 렌더 | — | POS snapshot sparse(items/totals 없음) · 별도 UI 재구현 필요 |

## 구현 내용

### POS PR #218 (`feat/M3-1120-B-cd-preview-r1`)

| 파일 | 변경 |
|------|------|
| `constants/api.ts` | `MEROS_CD_WEB_URL` 추가 (`https://admin.meros.id/customer-display-web`) |
| `components/cd-preview/CdPreviewWindow.tsx` | placeholder → WebView(mirror URL) + injectJavaScript snapshot 주입 + 오프라인 표시(`Xs ago`/`Offline`/`No CD`) + 터치 차단 오버레이 |
| `components/cd-preview/CdPreviewOverlay.tsx` | `useCustomerDisplaySnapshot` 추가 → snapshot + `dataUpdatedAt` → Window 전달 |
| `app/(tabs)/_layout.tsx` | `state="offline"` 고정 제거 → `classifyCustomerDisplay(snapshot)` 실연결 |
| `__tests__/CdPreviewWindow.test.ts` | 비율계산(S/M/L) + `ageText` 테스트 추가 |
| `__tests__/CdStatusBadge.test.ts` | `kindToBadgeState` 매핑 테스트 추가 |
| `e2e/flows/cd-preview.spec.ts` | `waitForFunction` → `waitForURL` 수정 + R2 mirror/크기 테스트 추가 |

### storeport PR #409 (`feat/M3-1120-D-cd-mirror`)

| 파일 | 변경 |
|------|------|
| `apps/customer-display/app/mirror.tsx` | 신규 라우트: `'pos-mirror'` CustomEvent 수신 → `posScreenToDisplay(pos_screen)` → CartScreen/QrisScreen/KeypadScreen/ReceiptScreen/DoneScreen/MainScreen read-only 렌더 |

## 미러 데이터 흐름

```
POS useCustomerDisplaySnapshot (10s poll, GET /admin/pos/registers/:id/snapshot)
  → snapshot (서버 snapshotToDTO = full CD 데이터, items/totals 포함)
  → CdPreviewOverlay → CdPreviewWindow.webViewRef.injectJavaScript
  → window.dispatchEvent(new CustomEvent('pos-mirror', {detail: snapshot}))
  → storeport /mirror → posScreenToDisplay(pos_screen) → 화면 컴포넌트
```

## 테스트 결과

- vitest: **37/37 pass** (`npx vitest run components/cd-preview/__tests__`)
- TypeScript: cd-preview 관련 신규 에러 없음 (기존 pre-existing 에러 별도)
- ESLint: 에러 없음 (warning 2개는 PanResponder ref 기존 패턴)
- Playwright: 실 브라우저 미실행 (storeport#409 미배포 → `/mirror` 미접속)

## 미검증 항목

- iPad/OPPO 실기 스샷: WebView가 실 CD 화면을 렌더하려면 storeport#409 배포 필요
- storeport#409 미배포 시: WebView → `/mirror` 404 → "Loading…" 상태 유지 (우아한 실패)
- Playwright Web: RN Web에서 WebView는 `<iframe>` → CD web 실 접속 없이는 내용 검증 불가
