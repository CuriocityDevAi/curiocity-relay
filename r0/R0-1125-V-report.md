#431 APPROVE · #433 CHANGES

## 검증 표

| PR | 항목 | 결과 |
|----|------|------|
| #431 | C3 — `onSaved={setLocNickname}` 반영 | ✅ |
| #431 | previewSnapshot → `formatOrderNumber` 사용 | ✅ |
| #431 | 스레드 3건 `isResolved: true` (GraphQL 확인) | ✅ |
| #431 | CI — heavy-cloud SUCCESS · heavy-mac SKIPPED | ✅ |
| #433 | format.ts 항상 하이픈 (`PIM-26B1001`) | ✅ |
| #433 | `needsOrderNumberHyphen` deprecated+always-true 유지 | ✅ |
| #433 | format.unit.spec.ts · OrderNumbersSection 업데이트 | ✅ |
| #433 | admin-smoke `preview_next: "PIM-26B1001"` 업데이트 | ✅ |
| #433 | **C1 탭 border-t-2 on rounded-full → 곡선** | ❌ |
| #433 | **C2 integration test regex 미업데이트 (CI fail)** | ❌ |

## #431 — APPROVE (commit 6d5a658)

R0-1125-R CHANGES 3건 모두 반영 확인.

- **C3**: `NicknameEditor`에 `onSaved={setLocNickname}` prop 연결 → 저장 후 왼쪽 savedValue 실시간 갱신.
- **previewSnapshot**: `formatOrderNumber(nickname, SAMPLE_DATE, 1001)` 호출로 교체 — 형식 규칙 변경 시 미리보기도 자동 추적.
- **스레드 3건**: `previewSnapshot.ts` / `page.tsx` (draftValue) / `page.tsx` (currAddressOverride) 모두 `isResolved: true`.
- **CI**: heavy-cloud SUCCESS, heavy-mac SKIPPED, 나머지 전부 SUCCESS (ci-summary `6d5a658` 기준).

## #433 — CHANGES (commit 74bd7f7)

### C1 — 알약 `border-t-2` 곡선 문제

`rounded-full`에 `border-t-2`를 주면 border가 border-radius를 따라 휘어집니다.  
탭 높이 ≈ 36 px → 유효 반지름 18 px → 양끝 18 px 구간에서 선이 안쪽으로 굽어 "아치" 형태.  
Kyu가 폴더 탭 R1' 때 반원 모양을 싫어해서 되돌린 것과 동일한 CSS 현상.

**수정 방법** (`page.tsx` `TAB_TRIGGER_CLASS`):

```tsx
// 제거
"data-[state=active]:border-t-2",
"data-[state=active]:border-t-ui-fg-interactive",

// 추가 — 알약 중앙 60% 직선 막대 2 px
"after:content-[''] after:absolute after:top-0 after:left-[20%] after:right-[20%] after:h-0.5",
"after:hidden data-[state=active]:after:block",
"after:bg-ui-fg-interactive",
```

e2e `toHaveClass(/data-\[state=active\]:border-t-/)` 체크도 `after:` 클래스 체크로 교체 필요.

### C2 — Integration test regex 미업데이트 (CI pos-integration 실패 원인)

`format.ts`가 항상 하이픈을 붙이도록 변경됐으나 integration test 2파일의 regex가 구 포맷 그대로.

```
Expected: /^PIM\d{2}[1-9ABC]\d{4,}$/
Received: "PIM-26B1000"
```

수정 위치:

| 파일 | 줄 | 변경 |
|------|----|------|
| `integration-tests/pos/order-number.spec.ts` | 71 | regex → `/^PIM-\d{2}[1-9ABC]\d{4,}$/` |
| `integration-tests/pos/order-number.spec.ts` | 177 | 제목 `PIM26B1000 형태` → `PIM-26B1000 형태` |
| `integration-tests/pos/order-number.spec.ts` | 196 | 주석 `= PIM26B1000` → `= PIM-26B1000` |
| `integration-tests/pos/order-number.spec.ts` | 197 | 동일 regex 교체 |
| `integration-tests/pos/order-number-receipt.spec.ts` | 96 | 동일 regex 교체 |

### Info — e2e-admin-loyalty port 5174 충돌

admin-smoke Playwright 종료 후 포트 5174 프로세스가 남아 loyalty e2e 시작 실패. 코드 버그 아님 — CI 러너 상태 문제. C1·C2 수정 후 CI 재실행 시 재확인.

### 탭 스크린샷

#433 e2e admin-smoke가 `e2e/screenshots/admin-smoke/04d-pos-settings-pill-tab-structure.png` 경로로 CI 실행 중 저장하지만 브랜치에 커밋되지 않음 — C1 수정 후 실 렌더 확인 필요.

### #431 머지 후 Rebase

#431(`page.tsx` 중단 state·컴포넌트)과 #433(`page.tsx` 상단 55–80행 스타일 상수)은 변경 구역이 달라 충돌 없을 것으로 예상. rebase 후 `pnpm tsc --noEmit` 확인 권장.
