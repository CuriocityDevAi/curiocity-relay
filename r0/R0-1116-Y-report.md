#155 A/C · #312 A/C · #308 A/C

## fork #155 — M2-1116-S NumericKeypad (APPROVE)

**단위 테스트 (로컬)**: vitest 351 passed | 6 xfail | 2 todo ✅ · numeric-keypad.test.ts 16/16 ✅  
**타입**: PR 변경 파일에 신규 TS 에러 없음 ✅

### 7곳 체크 ✅
| 위치 | 처리 |
|---|---|
| LinkCustomerSheet 전화번호 | TextInput → View + NumericKeypad |
| CashTenderPanel 금액 | TextInput → NumericKeypad (`00` 단축키) |
| CardTenderPanel 승인번호 | shared NumericKeypad · 6자리 완성 시 last4 자동 전환 |
| CardTenderPanel 끝4 | (위와 공유) |
| VoidRefundSheet 승인번호 | TextInput → View + NumericKeypad |
| orders.tsx 재시도 승인번호 | TextInput → View + NumericKeypad |
| split-tender 1차금액 | TextInput → View + NumericKeypad (`00`) |
| QuantityPicker | `showSoftInputOnFocus={false}` |

- **시스템 키보드 비활성 ✅** 숫자 필드 모두 TextInput → View 교체
- **3열 배열 ✅** NUM_ROWS 3×3 + 마지막 행 `[X]-0-⌫`
- **테마 토큰 ✅** bg-surface-muted · text-ink · text-ink-subtle — raw hex 없음
- **#154 회귀 주의**: LinkCustomerSheet NumericKeypad 추가로 BottomSheet 높이 증가 → Kyu 실기 체크 권장

---

## storeport #312 — M1-1116-R expo-env.d.ts gitignore (APPROVE)

- **expo-env.d.ts ✅** Expo 공식 권장 완전 일치 (`.gitignore` 추가 + `git rm --cached`)
- **tsconfig.json ✅** Expo-generated form으로 커밋됨. dev-refresh 필터는 편의 목적 · git 자체는 여전히 추적
- **실기 권장**: `expo start` 후 tsconfig.json clean 여부 확인 (Expo가 계속 수정 시 사람 편집분도 silently 통과)

---

## storeport #308 — M2-1116-Q 최종 (APPROVE)

**ci-summary** (216ddae): pos-integration ✅ · customer-display ✅ (R0-1116-W 기확인)  
**naming-check 로컬**: PASS ✅

### app.config.ts 필드 전부 ✅
- `name`: "MEROS HP Point" · `icon`: top-level + ios.icon · `splash`: expo-splash-screen 플러그인
- `extra.eas.projectId`: EAS_PROJECT_ID · `extra.apiUrl`: CUSTOMER_DISPLAY_API_URL
- `experiments.baseUrl`: `/customer-display-web` (!isNativeBuild 조건부)
- top-level `splash` 블록 제거 → SDK 58 TS 타입 에러 수정 ✅

### naming-check 예외 범위 ✅
- **name: 줄 한정** `[0-9]+:[[:space:]]*name:` — name: 필드 줄만 필터링, 다른 줄 "meros" 여전히 차단
- **CUSTOMER_DISPLAY_API_URL 예외** `.*CUSTOMER_DISPLAY_API_URL` — `"https://admin.meros.id"` 포함 줄만 허용
