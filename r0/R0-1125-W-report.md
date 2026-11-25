#261 APPROVE · #435 APPROVE

## 검증 표

| 항목 | #261 (M3-1125-J/K) | #435 (M1-1125-M) |
|------|:------------------:|:----------------:|
| CI 전체 초록 | ✅ 전부 pass | ⚠ heavy-mac queued (러너 대기) |
| unit-tests job 이름 `unit-tests` | ✅ | — |
| runs_on_light · timeout 5분 | ✅ | — |
| `npx vitest run` | ✅ | — |
| playwright 플래키 수정 | ✅ waitFor visible | — |
| isVisible timeout 무시 동작 확인 | ✅ 1.64.x 문서 일치 | — |
| Base 브랜치 | ✅ master | ✅ main |
| Customer Display 6번째 탭 | — | ✅ |
| ?tab=customer-display URL | — | ✅ |
| General 블록 제거 | — | ✅ |
| 위치 모드 BrandHint | — | ✅ |
| format.ts 항상 하이픈 | — | ✅ |
| e2e 신규 테스트 3개 | — | ✅ |
| 스태킹 (#433 미머지) | — | ⚠ rebase 필요 |

## #261 세부

- CI: assertions ✅ · flow-tests ✅ · heavy-cloud ✅ · lint ✅ · playwright ✅ · route ✅ · unit-tests ✅ (47s)
- `unit-tests` job: `runs_on_light` (fork-light → ubuntu fallback) · `timeout-minutes: 5` · `npx vitest run` — 로컬 wall 3.8s · 79파일 · 1011테스트
- playwright 수정: `payBar.isVisible({timeout:12000})` → `payBar.waitFor({state:'visible',timeout:12000})`. Playwright 1.64.x 에서 `isVisible({timeout})` 은 locator resolution timeout 에만 사용되며 visibility 재시도 없음 — `waitFor({state:'visible'})` 만이 올바르게 대기. `if(payBarVisible)` 블록 내 나머지 `isVisible()` 호출은 pay-bar 로드 후 snapshot 체크이므로 허용.
- 커밋 2개: M3-1125-J(ci job) · M3-1125-K(playwright fix) — master 위 clean

## #435 세부

- CI: changes-filter ✅ · check(tsc) ✅ · markers-and-forbidden ✅ · route ✅ · heavy-mac ⏳ queued(러너 가용성 대기, 코드 무관)
- page.tsx: TABS에 `"customer-display"` 추가(6번째) · `normalizeTab` 처리 · Tabs.Trigger testid `pos-settings-tab-customer-display` · General에서 `customer-display-settings-link` 완전 제거 · 위치모드 BrandHint + 편집불가 · showSaveFooter customer-display 미포함
- format.ts(M1-1125-L): `formatOrderNumber` 하드코딩 하이픈 · `needsOrderNumberHyphen` @deprecated 항상 true(#431 compat) · 단위테스트 전건 갱신
- e2e: 신규 3테스트(CD탭 클릭→버튼·General블록없음·URL직접진입) + 탭5개→6개 갱신 + 알약탭 구조테스트 갱신(border-t-0·after: 제거·rounded-full 추가)
- 스태킹: #433(74bd7f7) 포함 — #433 머지 후 rebase 필요(PR본문 명시)
- 로컬 playwright smoke 10개 통과(PR본문) + tsc pass 로 코드 품질 확인

## 액션

- 두 PR 모두 GitHub 코멘트 제출 완료 (self-PR APPROVE 제한으로 COMMENT 대체)
- #261: `unit-tests` 브랜치 보호 필수 체크 등록 → Kyu 직접 Settings 필요
- #435: #433 머지 후 feat/M1-1125-M rebase · heavy-mac 통과 확인 후 머지
