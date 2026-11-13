iOS 미검증 (시뮬레이터 미실행)

## M3-1105-BY 완료 리포트

### 수정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `app/checkout/tender-cash/[draftOrderId].tsx` | `Stack` import 제거(28행), `const displayId` 제거(241행), `Stack.Screen options.title` 제거(245행) |
| `tests/flows/m3-1105-bw.test.ts` | `__tests__/m3-1105-bw.test.ts` 에서 이동 (`__dirname` → `'../..'` 조정) |
| `scripts/m1-1105-ao-playwright.mjs` | SRC3 tender-cash 체크 2개 제거 (BY 로 Stack 타이틀 삭제됨 → AO 스펙 동기화) |

### CI 결과

run: `43463011784` · head: `69ec9e18b319b7e6c699d3ce3c0cbd092fa208cd`

| job | 결과 |
|-----|------|
| `flow-tests` (vitest run tests/flows) | ✅ success — BW 어설션 22개 포함 82 passed |
| `assertions` | ✅ success |
| `playwright` | ✅ success |
| `Lint` (run 43463011754) | ✅ success |

BW 테스트는 `flow-tests` job의 "Run flow contract & screen-calc tests" step 에서 실행됨.
