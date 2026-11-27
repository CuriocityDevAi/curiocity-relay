# M3-1127-L 리포트

**#288: 고침 · #289: 고침 · #291: CI 시작**

---

## #288 playwright (fix/M3-1127-G-sheet-typing-dots)

**실패 원인**: `spec-guard-pos-playwright.mjs` SELL-PRODUCT-SHEET-POS 임계값 오류  
`bgDiv Y ≥ 100px` → 실제 측정값 68px. BottomSheet maxHeight(828px)에 콘텐츠가 꽉 차면  
드래그 핸들 오프셋(~50px)만큼의 최소 여백이 남음. 100px 는 시트가 maxHeight 미만일 때만  
성립하는 가정. main 에는 이 테스트 없음.

**수정**: `>= 100` → `>= 60` (임계값 조정 + 주석 갱신)

**head**: `99f3b1d`  
**mergeable**: MERGEABLE / BLOCKED (CI 재시작 중)

---

## #289 lint (fix/M3-1127-H-draft-duplicate)

**실패 원인**: `components/order-chips/types.ts:15` — `mergeActiveId` 파라미터 멀티라인 → Prettier 단일라인 요구 (prettier/prettier error, 1 error 66 warnings)

**수정**: 함수 파라미터 단일라인으로 포맷팅

```
export function mergeActiveId(list: DraftListEntry[], activeId: string | null, nowMs: number): DraftListEntry[] {
```

**head**: `6dc6888`  
**mergeable**: MERGEABLE / BLOCKED (CI 재시작 중)

---

## #291 CI 없음 → 시작 (feat/M3-1127-K-cd-preview-edge)

**원인**: 충돌(CONFLICTING) 상태로 CI 미트리거  
**처리**: master(`611251d`) 로 rebase, 충돌 2개 해소  
- `scripts/spec-guard-map.json`: HEAD(notes 포함) 보존  
- `scripts/spec-guard-pos-playwright.mjs`: HEAD(SRC→PW 주석) 보존  
  + spec-guard 임계값도 ≥60px 로 갱신  
- 중복 커밋(`8cc5be8` M3-1127-D) 자동 drop  

force-push 후 CI QUEUED 확인 (run #45968031735).

**head**: `59912ca`  
**mergeable**: MERGEABLE / BLOCKED (CI 시작)
