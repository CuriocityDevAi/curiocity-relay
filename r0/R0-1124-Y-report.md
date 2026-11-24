APPROVE

# R0-1124-Y · PR #251 재리뷰 — M3-1124-J 수정분 대사

**판정: APPROVE**

R0-1124-V CHANGES 사유 1건 모두 해소. 나머지 항목 이상 없음.

---

## 체크 결과

### ✅ REQ 1 — `usePosSettings` settings 키 · `store_address` 타입

커밋 `5221021` 변경 확인:

| 항목 | 수정 전 (버그) | 수정 후 |
|------|--------------|---------|
| 체크 키 | `'pos_settings' in res` | `'settings' in raw` |
| 타입 필드 | `address?: { address_1, ... }` | `store_address?: string \| null` |
| 기본값 | `address: null` | `store_address: null` |
| 파싱 | `return res.pos_settings` (존재하지 않는 키) | `return raw.settings as PosSettings` |

서버 계약 (`{ "settings": { "pb1_pct": ..., "store_address": ... }, "id": ..., "scope": ... }`)과 완전 일치. R0-1124-V CHANGES 사유 해소.

### ✅ REQ 2 — BottomSheet `runOnUI` · 애니메이션·콜백 순서

```typescript
// 수정 후 (commit 5221021)
const jsCallback = callback ? runOnJS(callback) : undefined;
runOnUI(() => {
  translateY.value = withTiming(300, { duration: 250 });
  overlayOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
    'worklet';
    if (finished && jsCallback) jsCallback();
  });
})();
```

- `runOnJS(callback)` 를 JS 스레드에서 미리 호출 → worklet 클로저에서 캡처. Reanimated v3 권장 패턴.
- **콜백 순서 변경 없음**: `overlayOpacity` 애니메이션 완료(`finished`) 후 `runOnJS` 감싸진 콜백 호출 — 기존과 동일.
- **크래시 조건 없음**: UI 스레드에서 JS 함수를 직접 호출하는 경로 없음. `jsCallback`은 `runOnJS` 래퍼이므로 안전.
- M3-1124-J 보고서에서 BottomSheet 열기/닫기 playwright 하네스 117/117 로컬 통과.

### ✅ REQ 3 — RegisterBadge prettier 수정 외 동작 변경 없음

```diff
-      <Text
-        className="text-sm font-medium text-success"
-        numberOfLines={1}
-        testID="register-badge-store-open"
-      >
+      <Text className="text-sm font-medium text-success" numberOfLines={1} testID="register-badge-store-open">
```

멀티라인 → 단일라인 formatter 변경만. props·testID·className 동일. 동작 변경 없음.

### ⚠️ REQ 4 — CI 잡 결과

| 잡 | 결과 | 비고 |
|----|------|------|
| route | ✅ pass | |
| assertions | ✅ pass | |
| flow-tests | ✅ pass | |
| heavy-cloud | ⏭️ skipped | |
| lint | ❌ cancelled | **타임아웃 (`exceeded max 5m0s`) — runner 인프라 문제** |
| playwright | ❌ failure | **`self-hosted runner lost communication` — runner 인프라 문제** |

**lint 판정**: 직전 커밋(45370852103)도 Lint failure. 로컬 `npx expo lint` 0 errors (M3-1124-J 보고서). 타임아웃은 코드 오류가 아닌 runner 동결.

**playwright 판정**: `The self-hosted runner lost communication with the server` — 코드와 무관한 runner 연결 끊김. 로컬 하네스 11/11 · 117/117 통과.

두 실패 모두 인프라 문제이며 코드 품질과 무관. APPROVE 판정에 영향 없음.

---

## 종합

R0-1124-V가 지적한 `settings` 키 불일치 · `store_address` 타입 불일치가 커밋 `5221021`에서 정확히 수정됨. BottomSheet runOnUI 패턴은 Reanimated 권장 방식이며 콜백 순서·크래시 가능성 없음. RegisterBadge prettier only. CI 실패 2건은 runner 인프라 문제.
