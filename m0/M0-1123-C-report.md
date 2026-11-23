# M0-1123-C · 보고

**판정**: **R0-1123-C CHANGES 2건 + 미러 서버 영구 패치 완료 · PR #413 머지 대기**. 커밋 3개 push 됨. 단위 554/554 · IT cd-parallel-pay 10/10(신규 3건 포함) · 회귀 cd-full-flow 8/8 · cd-pos-screen-sync 5/5 · customer-display vitest 231/231(신규 4건 포함). 라운드 상한 45분 안.

## 핵심 숫자

- **PR**: https://github.com/CuriocityDevAi/storeport/pull/413
- **브랜치**: `feat/M0-1123-B-pos-multi-customer-r1-server`
- **신규 커밋 3개**:
  - `e761a0f` feat(commerce-core): M0-1123-C — cdwResolveFile <path>.html fallback
  - `9fd4d7f` feat(customer-display): M0-1123-C — skip-phone 엔드포인트 + CD 복귀
  - `a7e2f8e` feat(commerce-core): M0-1123-C — nextCustomerForOrder (주문 단위 종료)

## 변경 요약

### 1. 미러 서버 영구 패치 (`e761a0f`)

| 파일 | 변경 |
| --- | --- |
| `apps/commerce-core/src/api/middlewares.ts::cdwResolveFile` | 확장자 없는 경로에서 index.html SPA fallback 로 돌기 전에 `<path>.html` 변형을 먼저 시도. Expo static export 가 생성하는 mirror.html · keypad-after.html 등 route-당 html 파일이 올바로 제공된다. |

POS 는 `M1-1123-B` fork#227 에서 이미 `/mirror.html` 로 명시했으므로 **멱등** (서버 패치 적용 후 fork 쪽은 그대로 작동).

### 2. CHANGES 1 — skip-phone 엔드포인트 + CD 복귀 (`9fd4d7f`)

| 구성 | 변경 |
| --- | --- |
| `apps/commerce-core/src/api/customer-display/snapshots/[id]/skip-phone/route.ts` (신규) | `POST /customer-display/snapshots/:id/skip-phone` 엔드포인트. 디바이스 토큰 인증 + register scope 403. 내부는 `svc.skipSnapshot(id)` 호출(snapshot.skipped_at 만 기록 · state/link_open_until 보존). 응답은 직렬화된 snapshot. |
| `apps/commerce-core/src/modules/register_session/lifecycle.ts::isPhoneEntryOpen` | 조건에 `skipped_at` 검사 추가 — 세팅되어 있으면 즉시 false. `LifecycleCandidate` 인터페이스에도 필드 추가. |
| `apps/customer-display/src/lib/snapshot-api.ts::skipPhoneOnServer` (신규) | 새 엔드포인트 POST 호출. 기존 `skipSnapshotOnServer` 와 `_sent` 멱등 세트 공유. |
| `apps/customer-display/app/index.tsx` | `handleSkip` · `handleTimeout` 양쪽이 새 `skipPhoneOnServer` 로 전환. **handleTimeout 이 이전엔 서버 알림 없이 로컬 전이만 하던 버그 고정** (R0 CHANGES 1 뿌리). |

**효과**: paid snapshot 에 `skipped_at` 이 세팅되면 `isPhoneEntryOpen=false` → `pickBestSnapshot` 이 rank 1 에서 내려와 다른 active snapshot(진행 중 결제 화면)을 선택 → CD 자동 복귀 (v3 §8-② 성립). `link_open_until` (EOB) 은 그대로 → 캐셔 LateLink 로 소급 적립 가능.

### 3. CHANGES 2 — nextCustomerForOrder (주문 단위 종료) (`a7e2f8e`)

| 구성 | 변경 |
| --- | --- |
| `apps/commerce-core/src/modules/register_session/service.ts::nextCustomerForOrder` (신규) | 입력 `order_id` 의 snapshot(들) 만 expire. 다른 주문의 `link_open_until` (EOB) 은 그대로. idle snapshot 은 심지 않음 — `pickBestSnapshot` 이 남은 active/paid 선택해 CD 자동 복귀. |
| `apps/commerce-core/src/api/admin/pos/orders/[id]/next-customer/route.ts` (신규) | `POST /admin/pos/orders/:id/next-customer`. POS success page "Next customer" 서버 액션. 응답 `{ ok, expired_ids }`. |
| `nextCustomerForRegister` + `POST /admin/pos/registers/:id/next-customer` | 그대로 유지 (하위호환) · 주석에 멀티 카트 간섭 경고 추가. |

**효과**: 2번 success page Next customer → 2번 snapshot 만 expire → 1번 paid `link_open_until` (EOB) 불변 → 1번 소급 적립 창 보존.

## 테스트 로그

| 수트 | 결과 | 비고 |
| --- | --- | --- |
| `pnpm test` (commerce-core unit) | **554 passed / 47 suites** | 신규 3건: `skipped_at + phone_entry_open=false` · `skipped+active → active` · `skipped+paid → unskipped paid` |
| `pnpm test` (customer-display vitest) | **231 passed / 12 files** | 신규 4건: `skipPhoneOnServer` POST · 실패 무시 · 멱등 공유 · AbortSignal |
| `bash scripts/it.sh cd-parallel-pay` | **10 passed** | 신규 3건: skip-phone 정상 흐름 · skip-phone 멱등 · next-customer 주문 단위 |
| `bash scripts/it.sh cd-full-flow` | **8 passed** | 회귀 — CD 기존 흐름 변동 없음 |
| `bash scripts/it.sh cd-pos-screen-sync` | **5 passed** | 회귀 — M0-1118-J · 1번 paid + 2번 cart_building 보존 유지 |
| `pnpm --filter commerce-core typecheck` | PASS | TypeScript 에러 0 |
| `pnpm --filter customer-display typecheck` | PASS | TypeScript 에러 0 |
| `bash scripts/naming-check.sh` | PASS | meros 0 · 모듈 규격 정합 |
| `node scripts/feature-map-check.mjs` | PASS | 1241 files · unmatched 0 |
| pre-push hook | PASS | push 시 554 유닛 재실행 통과 |

## CD 앱 변경 파일

- `apps/customer-display/app/index.tsx` — `handleSkip` · `handleTimeout` 양쪽이 새 `/skip-phone` 엔드포인트 호출.
- `apps/customer-display/src/lib/snapshot-api.ts` — `skipPhoneOnServer` 추가.
- `apps/customer-display/src/lib/__tests__/skip-patch.test.ts` — 신규 4 테스트.

`apps/customer-display/app/keypad-after.tsx` (standalone mock 전용 route) 는 `readInitialMockState()` 만 쓰고 live deviceToken 없음 → 수정 불요 (프로덕션 CD 라우팅은 `index.tsx` 가 KeypadAfterScreen 를 inline 렌더). R0 리포트가 `keypad-after.tsx:onSkip/onTimeout` 로 가리킨 실질 지점은 `index.tsx` 의 `handleSkip/handleTimeout` 이었음.

## POS 쪽 영향

- `POS fork #228` (진행 중) 이 Next customer 버튼을 session 바 → success page 주문 단위로 옮기면서 **session-level 호출자는 사라졌음**. 세션 단위 서버 경로 (`/admin/pos/registers/:id/next-customer`) 는 하위호환으로 그대로 유지 · POS 는 신규 `/admin/pos/orders/:id/next-customer` 로 전환 필요(fork 라운드 소관).
- 운영 POS 가 현재 바라보는 route 는 `storeport#413` 브랜치 머지 후 두 route 모두 제공 — fork 가 따라오기 전까지는 기존 `registers/:id/next-customer` 가 동작(session 전체 expire 지만, POS 가 이 버튼을 더 안 누른다면 cross-order 간섭 발화 없음).

## Kyu 실기 체크리스트

- [ ] PR #413 리뷰 → 머지 (T0 에 "착지" 지시).
- [ ] 머지 후 운영 재배포 → 손님 CD 실기:
  - 1번 결제 → CD keypad → No thanks 또는 30초 대기 → CD 가 메인/카트로 자동 복귀 확인.
  - 1번 keypad 중 2번 담기 → 2번 결제 → 2번 success page Next customer → CD 가 1번 keypad 로 다시 가거나 그 외 적절한 화면(1번이 이미 skipped 였으면 메인) 로 전환 · 1번 LateLink 영업 마감까지 가능.
- [ ] fork R2 (POS 앱) 라운드에서 success page Next customer 를 `/admin/pos/orders/:id/next-customer` 로 전환 (M3-1123 등).

## 운영 접근 · 범위 밖

- 운영 SSH · railway CLI · 운영 DB · 키체인 전부 **미접근**.
- **머지 · 운영 반영 · 스모크 QC 는 Kyu/T0 소관**.
- fork 레포는 건드리지 않음 (M3 #228 진행 중).

---

_생성 시각: 2026-11-23 15:xx WIB · 모델: Opus · 라운드 상한 45분 안._
