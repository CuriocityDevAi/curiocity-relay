# R0-1105-DW — 판정 리포트

**대상 PR**: CuriocityDevAi/agilo-medusa-pos-fork#131  
**head SHA**: `4e73ad32855b09cae8e75e3b8a1837ba4bcc3068`  
**판정**: **CHANGES_REQUESTED**

---

## REQ 1 — tender-cash 테스트 2건 적정성

`__tests__/m3-1105-bw.test.ts` section 4 (`checkout/tender-cash/[draftOrderId].tsx: headerLargeTitle 없음`) 에 assertion 3개:

| # | 설명 | 결과 |
|---|------|------|
| 4-1 | `headerLargeTitle 없음` | ✅ PASS — Stack.Screen options에서 제거 확인 |
| 4-2 | `Stack import 없음 (Stack.Screen 제거 후)` | ❌ **FAIL** — 실제 코드와 불일치 |
| 4-3 | `useHeaderHeight 로 콘텐츠 오프셋 적용` | ✅ PASS |

**4-2 근거**: `tender-cash/[draftOrderId].tsx:27` 에  
`import { Stack, router, useLocalSearchParams } from 'expo-router';` 가 존재하며,  
`:244` 에서 `<Stack.Screen options={{ title: displayId ? \`Order #${displayId}\` : '' }} />` 로 여전히 Stack.Screen 사용 중.  
테스트 regex `/import\s+\{[^}]*\bStack\b[^}]*\}\s+from\s+'expo-router'/` 가 이 줄에 매치 → `.not.toMatch` 실패.

**테스트는 느슨해진 게 아니라 애초에 커밋된 코드와 어긋나는 거짓 주장**:  
PR 설명은 "tender-cash: Stack.Screen + headerLargeTitle 런타임 오버라이드 제거"라고 했지만  
실제 diff 에서 Stack.Screen 은 제거되지 않았고 headerLargeTitle 만 제거됨.

---

## REQ 2 — BX 이후 Stack/headerLargeTitle 재활성화 여부

- **Stack import**: 이미 M3-1105-P(dbc7bae) 단계부터 존재. BX 도 BW 도 제거 안 함.  
- **headerLargeTitle**: BW 에서 `_layout.tsx` 전체 checkout 계열 + `tender-cash/Stack.Screen` options 모두에서 제거 ✅  
- **중복 네이티브 대형 타이틀**: 없음 ✅ — `Stack.Screen.title` 은 헤더 pill 텍스트, 콘텐츠 `{heading}` 은 화면 본문 텍스트. 두 가지 렌더가 혼재하지만 headerLargeTitle 이 없으므로 "콘텐츠 위 대형 제목 + 헤더 대형 제목" 이중 렌더는 발생하지 않음.

---

## REQ 3 — 추가 발견: CI 미검증

`m3-1105-bw.test.ts` 는 **CI에서 실행되지 않음**:
- `flow-tests` CI job = `vitest run tests/flows` → `__tests__/` 디렉터리 제외
- `assertions` CI job = `node scripts/run-all.mjs assertions` → `*-(assertions|guard).mjs` 스크립트만 실행

PR 설명 "전체 vitest 217 passed 0 failed" 는 CI 비보증 로컬 주장이며,  
4-2 assertion은 로컬 실행 시에도 FAIL해야 하므로 해당 주장 자체가 의심스러움.

---

## 수정 요청

**Option A (권장)**: tender-cash 에서 Stack.Screen 제거 → `_layout.tsx` 에서 static/dynamic title 처리.  
테스트 4-2 는 현행 그대로 유지 가능.

**Option B**: 테스트 4-2 를 현실에 맞게 수정 — "Stack import 없음" 주장 제거, headerLargeTitle 없음(4-1)이 이미 커버하므로 중복 assertion 삭제. Stack.Screen 존치 이유 주석 명시.

어느 쪽이든: `__tests__/*.test.ts` 를 CI `flow-tests` 에 포함시키거나 별도 vitest CI step 추가 필요.
