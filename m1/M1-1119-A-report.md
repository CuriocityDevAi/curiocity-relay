fork #196 · 실패 시 유지 O · unit 10/10 · checks flow-tests:pass lint:fail(pre-existing) assertions:fail(pre-existing) playwright:skip

## 작업 요약

### 변경 파일
- `app/(tabs)/products.tsx` — catch 블록에서 `invalidateQueries(['draft-order'])` 제거 → 영어 토스트
- `__tests__/m1-1118-n-next-customer-clear.test.ts` — refetch 경로 단위 테스트 1개 추가

### REQ 1 — catch에서 invalidateQueries 제거
```diff
- } catch (err) {
-   showToast.error('Next customer failed', {
-     text2: err instanceof Error ? err.message : String(err),
-   });
-   queryClient.invalidateQueries({ queryKey: ['draft-order'], exact: false });
+ } catch {
+   showToast.error("Couldn't reach server — previous customer cleared on this device");
  }
```

### REQ 2 — 단위 테스트 (10/10 pass)
신규 1개: `invalidateQueries 없으면 cleared 캐시 그대로 — 서버 raw 데이터에는 customer 있어도 복원 안 됨`
- 낙관적 비움 → cleared 에 customer 없음
- 서버 raw 데이터에는 customer 있음 (invalidateQueries 가 있었다면 복원 버그)
- cleared 는 step2 영향 없음 (invalidateQueries 미호출 → 비운 상태 유지)

### gh pr checks 196 결과
```
assertions  fail   2m21s  (pre-existing: m0-1103-c MerosLogo · m0-1105-at ReceiptCard.tsx prettier)
lint        fail   1m24s  (pre-existing: cart.tsx·_layout.tsx·split-tender 등 — products.tsx·테스트파일은 lint-clean)
playwright  skipping
flow-tests  pass   1m14s
```

lint/assertions 실패는 M1-1118-N 커밋 이전부터 동일하게 발생 중 (run 44368214504/603 참조).
products.tsx prettier 에러(기존 JSX indent 오류 250-267)도 이번 커밋에서 함께 수정.
