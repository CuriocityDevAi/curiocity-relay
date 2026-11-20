R0-1120-E-report
2026-11-20 · reviewer: CuriocityDevAi (R0)

#215 CHANGES · #217 CHANGES · lint/assertion/EAS 실패 · vitest 44+17 pass

---

## #215 M3-1120-B · CD Preview R1 — CHANGES

### CI (bb3c06d)
- lint ❌ : 신규 2 error (prettier — _layout.tsx:26, settings.tsx:52)
- assertions ❌ : 신규 2 failure (color + english) + 1 pre-existing (m3-1105-aa = master 동일)
- flow-tests ✅ : vitest 17/17
- playwright ⏭ skipping (CI 미실행 · 직접 미검증)

### 필수 수정 5건
1. `app/(tabs)/_layout.tsx:26` — prettier: CdStatusBadge 멀티라인 JSX → 한 줄 인라인
2. `app/(tabs)/settings.tsx:52` — prettier: `{labels[opt]}` 개행 → 인라인
3. `components/cd-preview/CdPreviewWindow.tsx` — raw hex 5건 (#000, #E3E3E3, #6F6F6F, #F2F2F0, #B5B5B5) → brand token 교체
4. `components/cd-preview/CdStatusBadge.tsx:19-21` — 한국어 → 영어 ('오프라인'→'Offline', '번호 입력 중'→'Entering', '연결됨'→'Connected')
5. `components/cd-preview/CdPreviewWindow.tsx:118` — 한국어 placeholder → 영어 ('손님 화면 미러\n다음 라운드'→'Customer display mirror\n(next round)')

### 요건 대조 결과
- 버튼 위치(headerRight) ✓ · toggle 열기/닫기 ✓ · absolute overlay ✓ · PanResponder 드래그+clamp ✓
- 정보량 3단계(small/medium/large) + 창 크기 3단계(S/M/L) + @cd_preview_v1 저장 ✓
- master(#212·#213) 충돌 없음 ✓

### Non-blocking 의견
- PanResponder posRef drift: useEffect 비동기 덮어쓰기로 빠른 드래그 시 위치 drift 가능 → R2 전 수정 권장
- 회전 후 drag 범위: PanResponder.create 클로저에 screenW/H 고정 → 회전 후 드래그 경계 오류 → R2 전 수정 권장
- playwright CI skipping: headerShown 다른 탭 영향 등 UI 미검증

### PR 코멘트
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/215#issuecomment-7035193060

---

## #217 M0-1120-C · Android Classic SPP (BT-58D) — CHANGES

### CI (3043146)
- lint ❌ : 신규 2 error (prettier — printer.tsx:167, printer.tsx:189)
- assertions ❌ : 1 failure — pre-existing (m3-1105-aa = master 동일)
- flow-tests ✅ : vitest 44/44
- EAS Android build ❌ errored : e5af2c3d — 25초 만에 error (APK 미생성)

### 필수 수정 3건
1. `app/settings/printer.tsx:167` — prettier: 줄바꿈 위치 오류 (npm run lint -- --fix)
2. `app/settings/printer.tsx:189` — prettier: 클래스 순서 `text-xs text-ink-link` → `text-ink-link text-xs`
3. EAS 빌드 오류 로그 확인 + 성공 빌드 URL PR 업데이트 필요

### 체크리스트 결과
- iOS 동작 무변경 ✓ (classicAvailability reason='ios' 차단 + loadClassicModule null)
- BLE 경로 회귀 없음 ✓ (ble.ts exports 보존 · PrinterCandidate re-export 하위 호환)
- 하위 호환 저장 키 ✓ (미지정 → 'ble' 기본값)
- 결제 성공 자동 인쇄 dispatch 경유 ✓ (printReceipt → dispatchPrintBytes → getStoredTransportKind)
- Android 12+ BLUETOOTH_CONNECT 런타임 요청 ✓ (apiLevel >= 31 조건)
- neverForLocation ✓ (BLUETOOTH_CONNECT 에 불필요 · BLUETOOTH_SCAN 에만 적용)
- #215 파일 충돌 없음 ✓ (cd-preview/** · _layout.tsx · (tabs)/settings.tsx 미수정)
- rc 버전 리스크 완화됨 (try/catch graceful null fallback) — EAS 빌드 성공 미확인 상태

### PR 코멘트
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/217#issuecomment-7035196904

---

## 미검증 항목
- playwright: CI skipping 으로 UI 직접 미실행 (#215 버튼 1024w·600w 스샷 CI 없음)
- EAS 빌드 오류 원인: expo.dev 로그 접근 불가 (authenticated URL)
- Kyu 실기 항목 전체: 실기 기기 미보유
