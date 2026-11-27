PASS · 커밋 05a5f48 · a700451 · CI 전체 초록

## CI 결과 (ci-summary, run 45934311409)

| Check | 결과 | 소요 |
|-------|:----:|-----:|
| Lint / lint | ✅ | 43s |
| CI / flow-tests | ✅ | 43s |
| CI / unit-tests | ✅ | 44s |
| CI / assertions | ✅ | 1m 8s |
| CI / heavy-cloud | ⏭ | — |
| CI / playwright | ✅ | 6m 57s |

---

## REQ 1 — Lint 실패 원인 및 수정

**판정: 이 PR이 도입한 오류** (master 최신 lint CI: success `45875019502`)

| 파일 | 위치 | 오류 |
|------|------|------|
| `app/checkout/[draftOrderId].tsx` | 364:40 | `testID="checkout-title"` 추가 후 Prettier 포맷 미준수 (인라인 → 멀티라인) |
| `app/checkout/split-tender/[draftOrderId].tsx` | 520:62, 628:62 | `Split payment` 텍스트 Prettier 개행 필요 |
| `app/checkout/tender-cash/[draftOrderId].tsx` | 426:65 | `{heading}` Prettier 개행 필요 |

`npx eslint --fix` 로 4건 자동 수정.

추가 발생 (테스트): `tests/flows/m3-1105-bw.test.ts:82` — Prettier 개행으로 `>Checkout<` 패턴이 `>\n  Checkout\n<` 로 바뀌어 `toContain('>Checkout<')` 실패 → `toMatch(/>[\s]*Checkout[\s]*</)` 로 교체.

### 로컬 lint 실행 로그
```
✖ 67 problems (0 errors, 67 warnings)
```

---

## REQ 2 — spec-guard maxTodo 상한 추가

- `scripts/spec-guard-map.json`: `"maxTodo": 9` 추가 (현재 todo 개수)
- `scripts/spec-guard-audit.mjs`:
  - `mapTodoCount` = map 전체 `todo:true` 항목 수 직접 집계 (spec 파싱 의존 없음)
  - `maxTodo` 키를 ID 순회에서 제외
  - `mapTodoCount > maxTodo` → exit 1

### audit 실행 로그 (통과)
```
총 36개 ID · ✅ OK: 32 · ❌ FAIL: 0 · ⚠️  WARN: 4
📋 todo(이번 라운드 미완): 9개 (spec 집계: 9개)
[audit] ✅ 통과 (경고는 위 표 참조)
```

### todo 1개 늘린 임시 상태 실패 로그
```
📋 todo(이번 라운드 미완): 10개 (spec 집계: 9개)
[audit] ❌ 실패 — todo 개수 10개가 maxTodo(9)를 초과함. todo 를 줄이거나 완료 처리하세요.
```

---

## 커밋 목록

| SHA | 메시지 |
|-----|--------|
| `05a5f48` | fix(lint): Prettier 오류 4건 수정 · spec-guard maxTodo 상한 추가 (M3-1127-B) |
| `a700451` | fix(test): m3-1105-bw Checkout 텍스트 어설션 → regex(Prettier 개행 대응) |

---

## 비고

- Vitest 5.1.0이 Node 20에서 에러 포맷 시 `Map.groupBy`(Node 21+ API) 사용 → 테스트 실패가 있으면 2차 `Unhandled Error` 발생. m3-1105-bw 테스트 수정으로 함께 해소됨.
- 머지는 R0 APPROVE 대기 중 (CI 초록 확인 완료).
