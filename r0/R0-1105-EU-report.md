# R0-1105-EU 리뷰 보고서 — storeport #263 G1 전체 (G1a + G1b)

**판정: APPROVE · CI ALL PASS (단 customer-display CI 미등록 — 후속 권장)**

PR comment 초안은 본 보고서 하단 §PR-COMMENT 참조.

---

## REQ 1 · 모노레포 Expo 설정 & CI

| 항목 | 결과 |
|------|------|
| 기존 앱 영향 | ✅ NONE — 변경 범위 `apps/customer-display/**` + `docs/feature-map.yaml` + `pnpm-lock.yaml` 만. `anchor`/`wing`/`commerce-core` 미수정 |
| pnpm-lock 충돌 | ✅ 없음 — customer-display 전용 deps(+4685/-396줄) 추가 · 기존 앱 dep 버전 불변 |
| CI 기존 job 통과 | ✅ pos-integration PASS / markers-and-forbidden PASS / unit-commerce-core PASS |
| **customer-display CI 등록** | ⚠️ **미등록** — `ci.yml` 에 typecheck/unit/e2e job 없음. PR 테스트는 로컬 실행만 |

**후속 권장(1줄)**: `ci.yml` 에 `unit-customer-display` job 추가 — `pnpm -F customer-display typecheck && pnpm -F customer-display test && pnpm -F customer-display e2e` (dorny paths-filter `apps/customer-display/**` 조건부).

---

## REQ 2 · 토큰 diff (스크립트 실행 결과)

```
=== COLOR THEME DIFF ===
mint.primary: relay=#0F8A5F  ts=#0F7A55     ← WCAG AA 보정 (4.36→5.34:1)

=== EVENT THEME DIFF (hex only) ===
All 7 event themes MATCH
```

| 항목 | 결과 |
|------|------|
| 컬러 테마 20종 | ✅ 19종 완전 일치 · mint.primary 1건 의도적 차이 |
| mint.primary 차이 | ⚠️ relay 스펙 `#0F8A5F` → PR `#0F7A55` — PR 본문에 문서화(WCAG AA 4.36→5.34:1). **relay 스펙 갱신 필요** |
| 이벤트 테마 7종 | ✅ 완전 일치 |
| 화면 코드 raw hex | ✅ **0건** — MainScreen/CartScreen/KeypadScreen/KeypadAfterScreen/ConsentScreen 전부 `t.xxx` 토큰만 참조 |
| 5개 언어 문구 (Main·Cart·Keypad·Consent) | ✅ 완전 일치 (node diff 스크립트: 0 diffs) |

---

## REQ 3 · 화면 1·2·3·3'·4 Playwright 직접 확인

**빌드**: `pnpm run build:web` 성공 (7 라우트: / · /cart · /keypad · /keypad-after · /consent · /_sitemap · /+not-found)  
**E2E**: `pnpm run e2e` → **12/12 PASS** (11.5s)

### 화면 1 — Main (대기) · Butter Cream

![screen1-default](screen1-default.png)

- ✅ 2컬럼: 왼쪽 hero 패널(노란 배경 + 큰 헤드라인) + 오른쪽 "HOW TO EARN POINTS" 3단계
- ✅ 지구본 아이콘(우상단) · 언어 메뉴 "English"
- ✅ 적립률 "{r}% of your purchase..." 렌더링 (5% mock)

### 화면 1 — Midnight 테마

![screen1-midnight](screen1-midnight.png)

- ✅ 다크 배경(`#15171C`) + 노란 primary(`#FFD54F`) 대비 정상

### 화면 2 — Cart (결제 중)

![screen2-checkout](screen2-checkout.png)

- ✅ 주문 목록(Croissant 2× Rp 70.000 + Latte 1× Rp 45.000) · Subtotal · PB1 10% · Total
- ✅ 오른쪽 적립 예상 "Rp 6.325" + CTA "Enter phone number →" 가운데 정렬 ← CD-11 반영
- ✅ 세율 0 숨김 로직 존재(CartScreen taxRate=0 조건)

### 화면 3 — Keypad (결제 전 번호 입력)

![screen3-keypad](keypad-ok-on.png)

- ✅ **08 고정 프리픽스** 정적 표시 — digits는 이후 자릿수만 추적
- ✅ **자동 하이픈**: `formatTrailing` → `08 | 12-3456-78` 형식 렌더링
- ✅ **OK 활성**: `valid = digits.length >= 8` (08+8=10자리 최소) · 최대 11 trailing → 13자리 총
- ✅ **길게 지우기**: `onLongPress={delAll}` — 테스트 `keypad-del-long clears the field` 커버

### 화면 3' — KeypadAfter (결제 후 번호 입력)

![screen3p-keypad-after](keypad-after-timer.png)

- ✅ **"Payment complete" 뱃지** (좌상단 pill)
- ✅ **건너뛰기(Skip) 버튼** — `backLabel = keypad.skip`
- ✅ **30초 타이머**: `startMs = snapshot?.server_now ? new Date(server_now) : Date.now()` — server_now 기준 앵커
- ✅ 화면: `08 |` (입력 전) + "Closes automatically in 30 s · 10s" (clock.fastForward(20000) 후)
- ✅ OK 비활성 상태(gray) 확인

### 화면 4 — Consent (첫 방문 동의)

![screen4-consent](consent-default.png)

- ✅ "New number · 0812-\*\*\*\*-7890" 마스킹 표시
- ✅ WHAT WE KEEP / NOT KEPT 2컬럼 카드 (760px 중앙 카드)
- ✅ "Agree & get points" 기본 버튼 + "No, thanks" + "Privacy policy" 링크

---

## REQ 4 · 번호 정규화 — phone-id.ts 비교

| 규칙 | commerce-core | customer-display | 일치 |
|------|--------------|-----------------|------|
| `0/62/+62` → local `0xxx` | ✅ | ✅ | ✅ |
| 시작 `08` 필수 | ✅ | ✅ | ✅ |
| 길이 10~13 로컬 자릿수 | ✅ | ✅ | ✅ |
| E.164 → `+62xxxxxxxxx` | ✅ | ✅ | ✅ |
| 마스킹 `0812-****-7890` | ✅ | ✅ | ✅ |

✅ **로직 동일** — PR 커밋 메시지 "replicated from apps/commerce-core/src/lib/phone-id.ts" · 14 단위 테스트 커버 (`src/lib/__tests__/phone-id.test.ts`).

---

## REQ 5 · 스냅샷 타입 vs #262

#262 머지된 `apps/commerce-core/src/types/customer-display.ts` 대비 PR의 `apps/customer-display/src/types/order-snapshot.ts` 차이:

| # | 항목 | #262 | PR #263 | 비고 |
|---|------|------|---------|------|
| 1 | `receipt.phone_masked` | `string \| null` | `string` (non-nullable) | **의미 불일치** — G2 Done(5) 화면 구현 전 fix 필요 |
| 2 | Named type aliases | `SnapshotStatus`, `SnapshotLifecycle`, `SnapshotPaymentMethod`, `SnapshotLoyalty`, `SnapshotReceipt` | 없음 (inline) | 임시 타입이므로 허용 |
| 3 | 상수 | `SNAPSHOT_TTL_MS` · `SNAPSHOT_POLLED_STALE_MS` | 없음 | G2 연동 시 필요 |
| 4 | `maskPhoneE164` 함수 | 있음 | 없음 | phone-id.ts 로 대체 가능 |
| 5 | TODO 주석 | — | `// TODO: replace with shared @storeport/event-contracts type` | 명시적 임시 사본 |

**필드 구조(OrderSnapshot 본체)**: 완전 일치 ✅  
**핵심 위험**: `receipt.phone_masked` nullability — `null` 반환 시 Done 화면에서 런타임 오류 가능. G2 개발 전 `string | null` 로 정렬 필요.

---

## REQ 6 · CI checks

```
pos-integration            PASS   6m15s
markers-and-forbidden      PASS   7s
unit-commerce-core         PASS   1m7s
check                      PASS   13s
changes-filter             PASS   5s
docker-smoke-*             skip   (경로 무관)
wrangler-check-care-agent  skip   (경로 무관)
```

✅ 전체 필수 job PASS. customer-display 전용 job 없음(REQ 1 항목).

---

## 종합 판정

| 범주 | 판정 |
|------|------|
| 기존 앱 CI 안정성 | ✅ 영향 없음 |
| 토큰 정확도 | ✅ (mint.primary 1건 WCAG 보정 · 문서화) |
| 화면 렌더링 (12/12) | ✅ 시안 대비 이상 없음 |
| 키패드 요구사항 | ✅ 08 고정·하이픈·길게 지우기·OK 10~13자리·Skip·30s server_now |
| phone-id 규칙 | ✅ commerce-core와 동일 |
| 스냅샷 타입 | ⚠️ 임시 사본 (receipt.phone_masked nullability 차이 1건) |
| CI 등록 | ⚠️ customer-display job 없음 (후속 권장) |

**→ APPROVE** (블로커 없음 · 2개 후속 작업 권장)

---

## §PR-COMMENT

```
**리뷰 완료 · APPROVE**

Playwright 12/12 로컬 직접 실행 확인. 화면 1·2·3·3'·4 시안 대비 이상 없음.

**발견 사항 (블로커 없음)**

1. `mint.primary` diff — relay 스펙 `#0F8A5F` → PR `#0F7A55` (WCAG AA 보정, PR 본문에 문서화). relay `tokens-and-strings.json` 갱신 후속 필요.

2. `receipt.phone_masked` nullability — `apps/customer-display/src/types/order-snapshot.ts` 의 `receipt.phone_masked` 가 `string` (non-nullable) 인데, #262 머지된 `customer-display.ts` 는 `string | null`. Done(5) 화면 구현 전 `string | null` 로 정렬 필요.

3. CI 미등록 — `ci.yml` 에 customer-display typecheck/unit/e2e job 없음. 후속 task 권장: `pnpm -F customer-display typecheck && test && e2e` (paths-filter 조건부).

**확인 완료 항목**
- 토큰 20 컬러 + 7 이벤트: mint.primary 1건 외 전부 relay 일치
- 화면 코드 raw hex: 0건 (전부 `t.xxx` 참조)
- 5개 언어 문구 (Main·Cart·Keypad·Consent): 완전 일치
- phone-id.ts: commerce-core와 동일 규칙 (14 unit tests)
- 스냅샷 타입 필드 구조: 일치 (named alias/상수 차이는 임시 사본으로 허용)
```
