# M0-1124-D 보고 — Admin 사이드바 · POS Settings 탭 정리

**판정: OK (MERGE 대기 · Kyu 실기 QC 전)**

PR: https://github.com/CuriocityDevAi/storeport/pull/417
브랜치: `feat/M0-1124-D-admin-settings-tabs` (main 기준)
착지 SHA: `aaebf31`
작업 워크트리: `/Users/kyu.lee/curiocity-live/storeport-wts/M0-1124-D-wt`
원문 결정: `ledger/decision-admin-pos-settings-20261124.md` (Kyu 11-24 15:44)

## 결과 요약

| 결정 | 처리 | 확인 |
| --- | --- | --- |
| ① Order Numbers → POS Settings 안 탭 | `/order-numbers` 사이드바 제거 → POS Settings `Order numbers` 탭. 기존 URL `/order-numbers` 는 `/pos-settings?tab=order-numbers` 로 redirect. | 코드: `src/admin/routes/pos-settings/sections/OrderNumbersSection.tsx` (신규 · body 추출) · `src/admin/routes/order-numbers/page.tsx` (redirect 스텁 · defineRouteConfig 제거) |
| ② POS Settings = 탭 구조 (기존 항목 그룹핑) | @medusajs/ui `Tabs` 5개: `General` · `Tax` · `Payments` · `Pre-order` · `Order numbers`. 탭은 URL `?tab=` 에 반영 (새로고침·공유 유지). 색 하드코딩 0. | `src/admin/routes/pos-settings/page.tsx` 재작성 — 기존 필드·검증·Save 핸들러 전부 보존 |
| ③ Loyalty = 사이드바 1레벨 (Gift Cards 레벨) | `/pos-settings/loyalty` → `/loyalty` 로 승격 (git mv + 상대경로 조정). 이전 URL 은 redirect 스텁으로 유지. | 신규 `src/admin/routes/loyalty/page.tsx` · 구 경로 `src/admin/routes/pos-settings/loyalty/page.tsx` 는 `<Navigate to="/loyalty">` 역할 |
| ④ Gift Cards = 미사용 → 사이드바 숨김 (데이터 보존) | `nav-hide.tsx` CSS 블록 1개 추가 (`a[href="/app/gift-cards"]`). 데이터·API·모듈 미삭제. 되돌리기 = 블록 삭제 1줄. | `src/admin/widgets/nav-hide.tsx` |

## Gift Cards 용도·처리

**출처**: Medusa 코어 `@medusajs/dashboard@2.17.2` 가 등록하는 네이티브 메뉴 (`/gift-cards`). e-commerce 상품권 발급·만료일·고객 할당 UI.

**운영 참조 조사**: 운영 DB 조회 금지 조건을 지켜 코드에서 참조 여부만 확인.
```
grep -irn "gift[-_]?card\|giftCard" apps/commerce-core/src apps/anchor/src apps/wing/src
# → 자체 코드 결과 0건 (매치되는 건 @medusajs 모듈/번들 파일만)
```
POS·Wing·CareAgent·Loyalty 어느 쪽도 gift card 모듈·API 에 의존하지 않음. 베이커리/소상공인 실 운영에 상품권 발급이 필요 없음 (Kyu 판정).

**처리**: 사이드바에서만 CSS 로 숨김. Medusa 모듈·테이블·`/admin/gift-cards` API 는 그대로 유지 → 재활성화는 `nav-hide.tsx` 의 M0-1124-D 블록 삭제 한 줄.

## QC 결과

- `pnpm --filter commerce-core typecheck` — **0 error**
- `pnpm --filter commerce-core lint` — **0 error** (pre-existing 9 warnings · 본 PR 파일 무관)
- `pnpm --filter commerce-core test` — **569/569 PASS**
- `bash scripts/naming-check.sh` — PASS (MEROS 문자열 코드 노출 0)
- `node scripts/feature-map-check.mjs` — matched 1260/1260 (admin/** 와일드카드가 신규 파일 커버)

## 범위 확약

- 서버 API · modules · migrations · workflows · subscribers · integration-tests: **변경 0**
- 저장/로드 로직: **변경 0** — 탭별 Save 는 기존 handler 재사용 (General/Tax/Pre-order 공유 Save · Payments 자체 Save · Order Numbers per-row Save)
- Manager PIN: Kyu 결정 범위 밖 → 변동 없음 (현재 top-level 유지). 결정 원문의 "매니저 PIN 이 POS Settings 안에 있으면 Staff PIN" 조건부 지시 — 지금은 안에 있지 않으므로 이동 안 함.
- Customer Display: 결정 범위 밖 → 변동 없음. POS Settings `General` 탭에 "Open Customer Display →" 링크 유지.

## 처리 금지 확인

- [x] `apps/commerce-core/src/api/**` 수정 0
- [x] `apps/commerce-core/src/modules/**` 수정 0
- [x] 마이그레이션 신규 0
- [x] 머지 금지 — PR 열림 상태 (Kyu 실기 QC 전)

## 변경 파일 (6 files · insertions=1794 · deletions=1696)

```
apps/commerce-core/src/admin/routes/loyalty/page.tsx                  (신규 · git mv)
apps/commerce-core/src/admin/routes/order-numbers/page.tsx            (redirect 스텁)
apps/commerce-core/src/admin/routes/pos-settings/loyalty/page.tsx     (redirect 스텁)
apps/commerce-core/src/admin/routes/pos-settings/page.tsx             (Tabs 재구성)
apps/commerce-core/src/admin/routes/pos-settings/sections/OrderNumbersSection.tsx  (신규 · body 추출)
apps/commerce-core/src/admin/widgets/nav-hide.tsx                     (Gift Cards 숨김 1블록 추가)
```

## Kyu 실기 (PR 본문에도 동일 수록)

- [ ] Admin 로그인 → 사이드바에서 **Gift Cards 보이지 않음**
- [ ] Admin 로그인 → 사이드바에서 **Order Numbers 1레벨 없음** · **Loyalty 는 1레벨로 보임**
- [ ] `POS Settings` 진입 → 탭 5개 (`General` · `Tax` · `Payments` · `Pre-order` · `Order numbers`) 확인
- [ ] 각 탭 클릭 → URL 에 `?tab=…` 반영 · 새로고침 시 해당 탭 유지
- [ ] `Tax` 탭에서 SC% / PB1% 값 바꾸고 Save → toast "POS Settings saved" · 새로고침 후 유지
- [ ] `Payments` 탭에서 Xendit expiry 바꾸고 Save Xendit settings → toast 확인
- [ ] `Order numbers` 탭에서 매장 nickname 저장 → toast 확인 (#415 와 동일 동작)
- [ ] `/order-numbers` 수동 진입 → `/pos-settings?tab=order-numbers` 리다이렉트
- [ ] `/pos-settings/loyalty` 수동 진입 → `/loyalty` 리다이렉트
- [ ] `/loyalty` 직접 진입 → 기존 Loyalty 화면 (settings · simulate · audit)
- [ ] 스샷 첨부 (사이드바 · 탭 5개 · Loyalty 상위 · Gift Cards 숨김)

## 미검증 / 유의

- CI e2e 미실행 — 로컬 Admin dev 서버 띄우지 않음 (Kyu 실기 회부로 대체). dev 서버 승인 기다리는 중.
- Medusa admin SPA 는 `/pos-settings/customer-display` 를 `defineRouteConfig` 없이도 파일-기반 라우팅으로 노출 — `General` 탭의 링크로 계속 접근 가능.
- `/app/gift-cards/:id` 같은 상세 URL 도 숨김 선택자 `a[href^="/app/gift-cards/"]` 로 블록.

processes: [commerce-core.admin-customization, commerce-core.order-number]
