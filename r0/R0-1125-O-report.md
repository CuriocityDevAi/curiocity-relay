#431 CHANGES

## 검증 표

| 항목 | 결과 | 비고 |
|------|------|------|
| #430 머지 여부 | ✅ 머지됨 (`2026-11-25T04:52:57Z`) | 베이스 조건 충족 |
| Rebase 필요 여부 | ❌ DIRTY — 충돌 있음 | `docs/epics/admin-settings-impact-preview.md` add/add |
| 붉은 박스 · semantic token | ✅ `border-ui-fg-error` / `bg-ui-fg-error` raw hex 없음 | `ReceiptPreview.tsx` |
| Store address → 주소 줄 강조 | ✅ `highlightLineKeys: ["storeAddress"]` | |
| Store nickname → 주문번호 줄 강조 | ✅ `highlightLineKeys: ["bottomOrderNumber"]` | |
| FocusModal 2칸 (저장값/입력 중) | ✅ `grid-cols-2 gap-x-4` | |
| 주소 입력 → 오른쪽 실시간 갱신 | ✅ draftValue 연결됨 | Playwright test 통과 |
| 닉네임 미리보기 하이픈 규칙 | ❌ **버그** `previewSnapshot.ts:15` | `PIM3` → `PIM326B1001` (올바른 값: `PIM3-26B1001`) |
| nickname chip draftValue 갱신 | ❌ **버그** `page.tsx:703` | `draftValue={locNickname}` — NicknameEditor 타이핑 미반영 |
| store_address savedValue (location mode) | ❌ **버그** `page.tsx:635` | brand 주소 표시 (location override 아님) |
| receipt-view-model 공용화 | ✅ `workspace:*` 의존 · 재수출 확인 | `customer-display/src/screens/receipt-view.ts` |
| metro watchFolders | ✅ `watchFolders: [workspaceRoot]` + `nodeModulesPaths` | `metro.config.js` |
| EAS/metro 실제 빌드 | ⚠ **미검증** | 로컬 빌드 환경 없음 |
| settingImpactRegistry 한 줄 등록 | ✅ 2개 키 · 한 줄 패턴 | |
| CI (GitHub Actions) | ⚠ no checks reported | DIRTY 상태로 미실행 |

## 직접 실행한 테스트 로그

### commerce-core unit (jest)
```
Test Suites: 61 passed, 61 total
Tests:       681 passed, 681 total
Time:        28.456 s
```

### receipt-view-model vitest
```
Test Files  1 passed (1)
     Tests  3 passed (3)
  Duration  494ms
```

### customer-display vitest
```
Test Files  14 passed (14)
     Tests  243 passed (243)
  Duration  397ms
```

### commerce-core typecheck
```
tsc --noEmit  → 오류 없음
```

### Playwright admin-smoke
```
18 passed, 1 skipped (기존 skip · Screen 2 미머지)
  ✓ Screen 6 · Store address 옆 영향 chip 존재
  ✓ Screen 6 · chip 클릭 → 미리보기 모달 · 두 칸 · 붉은 박스 storeAddress 존재
  ✓ Screen 6 · 주소 입력 변경 → 오른쪽 미리보기 실시간 갱신
  ✓ Screen 6 · 매장 선택 후 nickname chip → 주문번호 줄 붉은 박스
```

## CHANGES 사유 (4건)

### C1 · Rebase 필요
- `mergeStateStatus: DIRTY`
- 브랜치에 `19c3fe3`(M0-1125-F) 중복 포함, `docs/epics/admin-settings-impact-preview.md` add/add 충돌
- `git rebase origin/main` → 충돌 해소 → force-with-lease push 필요

### C2 · 닉네임 하이픈 미적용 (`previewSnapshot.ts:15`)
- `${opts.nickname}26B1001` — `needsOrderNumberHyphen()` 미사용
- `PIM3` 입력 시 미리보기 `PIM326B1001`, 올바른 값 `PIM3-26B1001` (#430 규칙 위반)
- `format.ts`의 `needsOrderNumberHyphen` import + `sep` 변수 적용
- 단위 테스트에 `PIM3` 케이스 추가 필요

### C3 · Store nickname chip draftValue 미갱신 (`page.tsx:703`)
- `draftValue={locNickname}` — NicknameEditor 내부 state가 chip에 전달 안 됨
- 오른쪽 패널(입력 중 값)이 항상 왼쪽과 동일 (§8-① "입력하면 오른쪽 즉시 갱신" 위반)
- NicknameEditor에 `onDraftChange` prop 추가, page에서 draft state lift-up 필요

### C4 · Store address savedValue 오류 in location mode (`page.tsx:635`)
- `savedValue={String(brandSettings?.store_address ?? "")}` — location mode에서도 brand 주소 표시
- "저장된 값" 패널에 현재 매장 override 주소가 아닌 brand 주소가 나옴
- `inLocationMode ? currAddressOverride : ...` 로 수정 필요

## PR 코멘트
https://github.com/CuriocityDevAi/storeport/pull/431 에 COMMENT 리뷰 + 3건 라인 코멘트 작성 완료.
(자신의 PR → REQUEST_CHANGES API 불가 → COMMENT로 대체)
