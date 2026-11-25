PASS

## M0-1125-E — main merge · 충돌 해소 · 테스트 통과 · push

### 작업 내용

**브랜치**: `feat/M0-1125-C-cd-receipt-same` (PR #427)
**HEAD push**: `e6f1e5a`

#### 1. main merge (커밋 `65b160d`)
- `git merge origin/main` — #424(store_image_url/islamic_dates) · #425(loyalty new_balance) · #426(CD 아이콘) 포함
- 충돌 파일 1개: `apps/customer-display/src/mocks/adapter.ts`
  - HEAD `tendersRaw = readSearch("tenders")` + origin/main `imageUrlRaw = readSearch("imageUrl")` → **양쪽 선언 모두 보존**
- `docs/feature-map.yaml` → 자동 머지 완료

#### 2. 추가 버그 수정 (커밋 `e6f1e5a`)

**overlap 버그**: `ReceiptScreen`에 `PosChipBadge` (#7, fontSize:22)를 추가하면서 `GlobeMenu`(right:24)와 겹침 발생 → `cd-flow-overlap.spec.ts` 2 케이스 실패 (receipt@split-500 / split-834)
- **수정**: `ReceiptScreen.tsx` — `PosChipBadge` 제거 (receipt 용지에 주문번호 이미 표시됨)
- **추가**: `app/mirror.tsx` — `StoreConfig.store_image_url` 필드 누락 보완 (TS2741, #424 머지 후 발생)

#### 3. 테스트 결과 (로컬)

| 항목 | 결과 |
|------|------|
| customer-display vitest | ✅ 243 passed |
| customer-display e2e (전체) | ✅ 113 passed · 0 failed |
| customer-display e2e receipt-same-as-pos | ✅ 포함 |
| commerce-core unit | ✅ 646 passed (59 suites) |
| customer-display typecheck | ✅ 에러 0 |

#### 4. CI (PR #427 · HEAD e6f1e5a)

| job | 결과 |
|-----|------|
| heavy-cloud | ✅ pass (16m32s) |
| check | ✅ pass |
| changes-filter | ✅ pass |
| markers-and-forbidden | ✅ pass |
| route | ✅ pass |
| heavy-mac | skipping |

#### 5. 리뷰 스레드

미해결 스레드 0건.
