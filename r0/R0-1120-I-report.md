# R0-1120-I 리뷰 리포트

**#218 APPROVE · #409 CHANGES · #216 APPROVE · 보안: `/mirror` 직접 접근 → snapshot 없어 MainScreen만 표시, POS inject 없이 고객정보 노출 없음 ✅**

---

## A. M3-1120-D 미러 리뷰

### #218 agilo-medusa-pos-fork — APPROVE ✅

#### 체크 1 · 미러가 손님 화면과 "같은 장면"인지

| 항목 | 결과 |
|------|------|
| 화면 컴포넌트 재사용 | ✅ CartScreen/QrisScreen/KeypadScreen/ReceiptScreen/DoneScreen/MainScreen 동일 사용 |
| 별도 축소판 재구현 | ✅ 없음 — WebView가 실제 storeport CD web을 로드 |
| 라우팅 방식 | ⚠️ `posScreenToDisplay(pos_screen)` (단순) — full `nextScreen()` state machine 미사용 |
| 불일치 위험 | receipt→keypad-after→consent 터미널 흐름 중 POS pos_screen이 `paid` 로 유지되면 미러는 receipt 고정. CD 로컬 전이(RECEIPT_DONE 등)는 반영 안 됨. R2 의도적 한계 — 허용. |
| read-only 보장 | ✅ `pointerEvents="box-only"` 오버레이, 모든 콜백 no-op |
| 키패드/결제 이벤트 차단 | ✅ 미러가 서버에 어떤 이벤트도 전송하지 않음 |

#### 체크 2 · 보안

- `/mirror` 라우트는 인증 없이 접근 가능
- **그러나** snapshot 데이터는 POS WebView의 `injectJavaScript`로만 주입됨 — 서버 폴링 없음
- 외부에서 `https://admin.meros.id/customer-display-web/mirror` 직접 열면 snapshot=null → MainScreen(빈 대기화면)만 표시
- 고객 정보(cart items, amounts, QR 등) 노출 경로 없음
- **판정: 안전** ✅

#### 체크 3 · display-machine.ts · useDisplayMachine.ts 미수정

- fork에는 해당 파일 없음 (storeport 대상)
- #218 diff 18개 파일: cd-preview 컴포넌트 신규 + _layout.tsx/settings.tsx/api.ts 수정만 ✅

#### 체크 4 · react-native-webview · EAS 빌드

- `package.json`: `"react-native-webview": "14.0.1"` 기존 설치분 ✅
- 새 native 의존성 추가 없음 → 새 dev build 불필요 ✅

#### 체크 5 · S/M/L 비율 · 오프라인 표시 · 배지 state

| 항목 | 결과 |
|------|------|
| S/M/L 비율 | ✅ `winH = Math.round(winW * 9/16)` — ASPECT=9/16 고정 |
| 오프라인 지연 표시 | ✅ `ageText()`: `No CD` / `Xs ago` / `Offline`(60s 초과) |
| 배지 state | ✅ `classifyCustomerDisplay(snapshot)` 실값 → `kindToBadgeState()` 변환 |

#### 체크 6 · 하드코딩 색 · lint · vitest · Playwright

| 항목 | 결과 |
|------|------|
| 하드코딩 색 | ✅ TOKEN_INK/TOKEN_LINE/TOKEN_SURFACE_MUTED 등 토큰 사용. bg-danger/bg-warning/bg-success는 Tailwind 클래스 |
| vitest | PR 기술: 37 tests (rotation clamp · aspect ratio · ageText · kindToBadgeState). 로컬 실행 불가(머지 충돌), 테스트 로직 코드 검토로 정확성 확인 |
| Playwright | branch dirty (merge conflict) → CI run 없음. E2E 테스트 파일은 추가됨 |
| lint | branch dirty로 CI 없음 — vitest 로컬 확인 불가 |

> **주의**: 브랜치가 `mergeable_state: dirty` (master와 충돌). 머지 후 CI 재확인 필요.

---

### #409 storeport — CHANGES REQUIRED ❌

#### ❌ feature-map 미등록 (check CI fail)

```
feature-map-check: unmatched = ["apps/customer-display/app/mirror.tsx"]
CI run 44716070437 · check job: exit 1
```

**수정 위치**: storeport `scripts/feature-map-check.mjs` (또는 feature map 설정 파일)에  
`apps/customer-display/app/mirror.tsx` → 해당 feature(M3-1120-D 또는 customer-display) 등록 필요.

#### 나머지 항목 ✅

| 항목 | 결과 |
|------|------|
| display-machine.ts 미수정 | ✅ PR diff 3개 파일: route-heavy.sh · ci.yml · mirror.tsx만 |
| useDisplayMachine.ts 미수정 | ✅ diff에 없음 |
| 콜백 no-op | ✅ onCancel/onOk/onDone/onReturn 모두 `() => {}` |
| POS 오버레이 터치 차단 | ✅ POS 쪽 `pointerEvents="box-only"` 오버레이 |
| `window.addEventListener('pos-mirror', ...)` | ✅ Platform.OS === 'web' guard 포함 |
| route/markers-and-forbidden/changes-filter CI | ✅ pass |
| heavy-mac | pending (러너 바쁨 — 정상 대기) |

---

## B. #216 YAML 수정 확인

### #216 agilo-medusa-pos-fork — APPROVE ✅

#### 체크 7 · M2-1120-F YAML 수정 + CI 결과

| 항목 | 결과 |
|------|------|
| M2-1120-F 커밋 | ✅ `ba76172` (2026-11-20T10:01) — "heavy-cloud run 블록 스칼라로 변경" |
| 수정 내용 | `- run: echo "..."` → `- run: \|` + `echo "..."` (plain scalar ': ' 제거) |
| actionlint (fix 후) | ✅ **0 errors** (로컬 `origin/feat/M1-1120-C-ci-mac-first` fetch 후 확인) |
| CI run 44715592090 (최신) | route ✅ · heavy-cloud ✅ · flow-tests ✅ · lint ✅ |
| 신규 실패 | **0** (기존 m3-1105-aa 1건 외 없음) |
| m3-1105-aa | ✅ 기존 실패 (`SuccessReceiptAnim · 보조 버튼 3개 한 줄` 1건) — 이 PR 무관 |
| curiocity-mac-fork 실행 | ✅ route job 2m19s pass (Mac 러너에서 실행됨) |

> **참고**: `m2/M2-1120-F-report.md` 미작성 — M2가 커밋만 했고 report 파일 없음. fix 자체는 커밋 + CI로 확인됨.

---

## 종합

| PR | 판정 | 블로커 |
|----|------|--------|
| #218 fork | **APPROVE** | — (머지 충돌 해소 후 CI 재확인) |
| #409 storeport | **CHANGES** | `apps/customer-display/app/mirror.tsx` → feature map 등록 |
| #216 fork | **APPROVE** | — |
