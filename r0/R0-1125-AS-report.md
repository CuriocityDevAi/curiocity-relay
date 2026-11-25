#449 APPROVE · #268 APPROVE

## #449 storeport — CD 기본 언어 영어 (M1-1125-AC)

**판정: APPROVE** (자기 PR — COMMENT 제출)

변경: `apps/customer-display/app/_layout.tsx:129` `langKey ?? "id"` → `langKey ?? "en"` (1줄)

| 항목 | 결과 |
|---|---|
| ① 네이티브·웹 동일 경로 | ✅ Platform 분기 없이 `mockState?.langKey ?? "en"` 동일 적용 |
| ② GlobeMenu 선택 우선 | ✅ 세션 중 `setLang` 우선. 재로드 후 "en" 복귀는 기존 동작(기존은 "id" 복귀)과 동일, PR 범위 외 |
| ③ display-config 충돌 없음 | ✅ 라이브 모드 `mockState === null` → display-config와 경로 분리 |
| ④ 영어 키 누락 없음 | ✅ Playwright id-ID 로케일에서 "Connect Device" 존재 확인 |
| ⑤ CI 초록 | ✅ heavy-mac · check · docker-build · markers-and-forbidden · route 전부 pass |

## #268 agilo-medusa-pos-fork — tailwind darkMode 'class' (M3-1125-W)

**판정: APPROVE** (자기 PR — COMMENT 제출)

변경: `tailwind.config.js` `darkMode: 'class'` 추가 (1줄) + e2e spec 추가

| 항목 | 결과 |
|---|---|
| ① dark 클래스 화면 무변화 | ✅ `useColorScheme.ts` 항상 'light', `.dark` 클래스 미부여 → dark 스타일 비활성 |
| ② unit-tests | ✅ pass |
| ② flow-tests | ✅ pass |
| ② assertions | ✅ pass |
| ② lint | ✅ pass |
| ② playwright(e2e) | ✅ pass — 콘솔 에러 "Cannot manually set color scheme" 0건 확인 |

## GitHub 리뷰 링크

- storeport #449: https://github.com/CuriocityDevAi/storeport/pull/449
- pos-fork #268: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/268
