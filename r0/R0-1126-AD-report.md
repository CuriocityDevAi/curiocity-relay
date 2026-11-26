#458 APPROVE

## 판정 근거

PR #458 (M0-1126-K — V4-5 cashier_name 서버 조회 · 매장 logo_url) 를 #457 대비 diff 기준으로 리뷰.  
모든 테스트 직접 실행 통과. 아래 3건은 non-blocking 의견으로 PR 코멘트 첨부.

---

## 리뷰 항목

### 1. 개인정보 — cashier.id CD payload 포함

- `tenders/route.ts`, `order-snapshot-paid.ts` 양쪽에서 `cashier: { id: cashierId, name: cashierName }` 형태로 Medusa 내부 user UUID가 CD snapshot JSON에 포함된다.
- PR 본문에서 "이메일 전체·내부 id는 손님 화면에 노출 금지"라고 명시했는데 id는 여전히 payload에 있어 모순.
- CD endpoint가 register device token 인증이라 외부 위험도는 낮음. 의도적 선택이면 주석으로 명시 권장. `name`만 전달하고 id 제거가 더 clean.
- 이메일 로컬 파트 폴백(`first_name/last_name` 없을 때): 손님에게 `rina.admin` 표시는 어색할 수 있음. PR에서 "중간안"으로 인정 — 현 선택 존중, 추후 UX 판단으로 null(줄 숨김) 이동 가능.
- **판정**: non-blocking. 위험도 낮음.

### 2. QRIS 경로

**subscriber 미검증**:
- V4-5-K 통합테스트가 webhook 호출 후 `resolveCashierName` + `markSnapshotPaidByOrder`를 직접 invoke → 실제 `order-snapshot-paid` subscriber가 event를 받아 실행되는 경로는 미검증.
- PR 본문에서 "통합테스트 환경은 derived payment_status가 retrieveOrder에 없어 subscriber가 조기 return"으로 명시, 범위 밖 인정.
- 로직 자체(resolution + markSnapshotPaidByOrder data shape)는 올바름. staging 확인 권장.
- **판정**: non-blocking. 알려진 한계로 문서화됨.

**나눠결제 cashier_user_id 덮어쓰기**:
- 1차·2차 모두 QRIS면 2차 캐셔로 덮어써짐. 현실적으로 QRIS+QRIS split는 드물고, "마지막 tender 캐셔" 동작은 허용 가능.
- 현금+QRIS, QRIS+현금 혼합 케이스에서는 충돌 없음 — 의도한 동작으로 판단.
- **판정**: non-blocking.

**심는 시점**: tenders 라우트(admin 호출)에서 `order.metadata.cashier_user_id` 세팅 → xendit webhook 도착 전 DB 커밋 완료 → subscriber가 읽는 시점에 값 존재. 타이밍 문제 없음.

### 3. logo_url 처리

**null 시 줄 숨김**:
- subscriber: `logo_url: storeLogoUrl` (null이면 그대로 null 전달) ✓
- `store: storeName || storeAddress || storeLogoUrl ? { ... } : undefined` — logo_url만 있을 때도 store 블록 렌더됨 ✓

**깨진 이미지 처리**:
- `LeftPaymentPanel.tsx`의 `<Image source={{ uri: view.storeLogoUrl }}>` 에 `onError` 핸들러 없음. URL 404/타임아웃 시 깨진 이미지 아이콘 가능.
- 이 파일은 M0-1126-J(#457) 범위 — 본 PR 범위 밖. 별도 라운드 권장.
- **판정**: 본 PR 범위 아님. pre-existing gap.

---

## 테스트 로그

```
tsc --noEmit (commerce-core)         → EXIT=0
pnpm test (commerce-core unit)       → 877 passed / 75 suites · snapshots 18 passed
vitest run (customer-display)        → 328 passed / 16 files
it.sh cd-pos-sync-v4-next-customer   → 4/4 PASS (V4-1 · V4-5 · V4-5-K · V4-6)  10.8s
it.sh cd-pos-sync-v4                 → 4/4 PASS  9.6s
it.sh cd-pos-sync-v3                 → 3/3 PASS  236.8s
it.sh cd-full-flow                   → 8/8 PASS  18.9s
```

worktree: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1126-K` (2395adb ≡ 1944852 — rebase로 SHA만 변경, 내용 동일 확인)

## PR 코멘트

GitHub PR #458에 COMMENT(자기 PR APPROVE 불가) + 라인 코멘트 2건 제출 완료.
- `resolve-cashier-name.ts:47` — cashier.id payload 포함 개인정보 의견
- `cd-pos-sync-v4-next-customer.spec.ts:339` — subscriber 직접 호출 미검증 명시
