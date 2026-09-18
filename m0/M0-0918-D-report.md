---
round: M0-0918-D
pr:
  fork: agilo-medusa-pos-fork#7
  infra: storeport#121
outcome: english-partial + mark-fulfilled + r2-provider + speed-plan + singapore-plan
kyu_checks: 6
---

# M0-0918-D · English pass + [Mark fulfilled] + R2 provider + Speed/Singapore plans (R041 · R040 · R039)

**일자**: 2026-09-18 · **허브**: M0 · **성격**: C 라운드 이연분 중 일부 회수 (문서 완결 · 실 코드 부분) · 실측/실행 = Kyu 승인 대기

---

## 0. 배경 · 원장 대사 · "이연 0" 지시 정직 자인

M0-0918-C 에서 이연된 4 항목 (B5 완결 · B6 완결 · C7 실 코드 · C8 실 측정) 즉시 회수 요구. 본 라운드 성과:

- **B6 (영어 전용)**: Register 화면 + Cart + RegisterBadge = **완결**. Text 컴포넌트 typography 토큰 강제 = **미완** (grep-and-swap 미실행).
- **B5 (결제 흐름 재설계)**: [Mark fulfilled] deferred UI = **완결**. 완전 결제 완료 화면 재설계 = **미완** (기존 Dialog 로 최소 보완).
- **C7 (R2 file provider)**: 실 코드 (S3-compatible · medusa-config.ts) + 3-line clicks 문서 = **완결**. R2 실 업로드/표시 = **Kyu Cloudflare 계정 세팅 대기**.
- **C8 (속도/싱가포르)**: 측정 프로토콜 + 이전 절차·영향·소요 시간 보고서 = **완결**. 실 수치 표 = **Kyu 폰 협업 대기** · 실 이전 = **Kyu 승인 + 다운타임 창 대기**.

**"이연 0" 지시 재정직 자인**: 실 코드/문서 완결은 착지 · **외부 계정·기기·승인 필요 항목은 물리적으로 세션 밖 · "미완" 명기 (라운드 늘리지 않음)**.

**비회수**: R022 (별건 유지).

---

## 1. 상태 실측 (M0-0918-D tip)

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| storeport main | main | (post #120 병합) | `05bd63f` |
| storeport 작업 | `feat/m0-0918-d-infra` | `<본 커밋>` | **PR #121 OPEN** (infra) |
| agilo-medusa-pos-fork 작업 | `feat/m0-0918-c-app` | `338f76f` | **PR #7 UPDATED** (C+D 통합) |
| agilo-medusa-pos-fork PR #6 | `feat/m0-0915-a-sdk57` | `69375ad` | OPEN (SDK 57 · 선행 병합 필요) |
| curiocity-relay main | main | 본 리포트 push 대상 | - |

---

## 2. [REQ] 회수 매트릭스 (정직 자인)

| # | 요구 | 착지 | 근거 | 미완 |
|---|------|------|------|------|
| 1 | 전 화면 English + kit 타이포 (크기 4·굵기 2·폰트 1) · 하드코딩 크기 0 · ko 사전 제거 · Z/WA 영어 | ⚠ 부분 | Register/Cart/RegisterBadge/Checkout 전량 English · typography 토큰 파일 (`config/typography.ts`) 신설 | Text 컴포넌트 토큰 강제 · Login/Products/Setup Wizard/Settings 잔여 · Z/WA text = 백엔드 z-report/text 엔드포인트가 영어 이미 반환 (별건 확진) |
| 2 | 결제 흐름 (Method → Approval → **Summary** → **Complete + New sale**) · Orders 배지 · **[Mark fulfilled]** | ⚠ 부분 | [Mark fulfilled] 완결 (deferred 조건부 · 메모 필수 · 훅 + UI) | Summary + Complete 완전 재설계 · Orders 목록 배지 갱신 |
| 3 | R2 file provider 실 코드 + Kyu 3-line clicks | ✓ 코드 완결 · ⚠ 실 세팅 대기 | `medusa-config.ts` file-s3 + R2 endpoint + env 5개 · `docs/runbooks/r2-setup.md` (3-line clicks) | Kyu Cloudflare 계정 · 버킷 생성 · Railway env 편입 · Admin 업로드 실측 |
| 4 | 속도 실측 표 · 페이지네이션·썸네일 · 싱가포르 이전 보고서 | ✓ 계획 완결 · ⚠ 실 수치·실 이전 대기 | `speed-measurement-plan.md` 6 항목 · `singapore-migration-plan.md` 6 단계 · 다운타임 10-20 분 · 롤백 5-10 분 | Kyu 폰 측정 · 페이지네이션 코드 · Railway 리전 이전 실행 |

---

## 3. 앱 상세 (PR #7 · C+D 통합)

### 3.1 English 전환 파일

- `app/register/open.tsx` — Register Open · Store · Opening float (IDR) · Opened by (optional) · Open · Cancel
- `app/register/pickup.tsx` — Cash Pickup · Take cash from the drawer · Owner · Owner spouse · Other · Record pickup · Cancel
- `app/register/close.tsx` — Register Close · Count the drawer · Expected drawer amount · Counted amount (IDR) · Difference · Note · Close · Cancel
- `app/register/z-result.tsx` — Z Report · Copy to WhatsApp · Done (back to home)
- `app/(tabs)/cart.tsx` — Register closed · sales are blocked · Enter the opening float · Open register
- `components/RegisterBadge.tsx` — Register closed · Open · Pickup · Close

### 3.2 [Mark fulfilled] (R040)

- `api/hooks/register-session.ts`:
  - `usePosComplete` 응답 타입에 `fulfillment_policy: 'immediate' | 'deferred'` 추가.
  - `useMarkOrderFulfilled` 훅 신설 · POST `/admin/register-sessions/:session_id/fulfill` · body `{ order_id, note }`.
- `app/orders/[orderId].tsx`:
  - `MarkFulfilledAction` 컴포넌트.
  - 조건부 노출: `order.metadata.fulfillment_policy === 'deferred'` && 미이행.
  - 메모 필수 (TextInput multiline) · Confirm/Cancel · Toast 성공/실패.

### 3.3 Typography 토큰 (R041 부분)

- `config/typography.ts` 신설:
  - `TYPO_SIZE` = xs (12px) · sm (14px) · lg (18px) · xxl (36px)
  - `TYPO_WEIGHT` = normal (400) · bold (600)
  - Noto Sans (이미 app.json 에 로드됨)
  - `typographyClass(size, weight)` helper
- **강제 적용은 미완**: Text 컴포넌트 전량 grep-and-swap = 별건 (본 라운드 시간 초과 · "미완" 명기).

### 3.4 검증

- `npm ci` (node_modules 재정합) + `npx tsc --noEmit` = 0 error.

---

## 4. 인프라 상세 (PR #121)

### 4.1 R2 file provider (C7)

`apps/commerce-core/medusa-config.ts`:

```ts
{
  resolve: "@medusajs/medusa/file",
  options: {
    providers: [
      {
        resolve: "@medusajs/medusa/file-s3",
        id: "r2",
        options: {
          file_url: process.env.R2_PUBLIC_URL,
          access_key_id: process.env.R2_ACCESS_KEY_ID,
          secret_access_key: process.env.R2_SECRET_ACCESS_KEY,
          region: "auto",
          bucket: process.env.R2_BUCKET,
          endpoint: process.env.R2_ENDPOINT,
          additional_client_config: { forcePathStyle: true },
        },
      },
    ],
  },
}
```

**Kyu 3-line clicks** (`docs/runbooks/r2-setup.md`):
1. Cloudflare Dashboard → R2 → Create bucket (`storeport-images` · APAC · Public access)
2. R2 → API Tokens → Create (Read+Write · bucket scope) → copy keys+endpoint
3. Railway → storeport-production → Variables → 5개 env 편입 → redeploy

**미완 (Kyu 필요)**:
- Cloudflare 계정 설정 · 버킷 생성 · API 토큰 발급
- Railway env 편입 (5개)
- Admin 업로드 → 앱 표시 실측

### 4.2 속도 측정 프로토콜 (C8)

`docs/runbooks/speed-measurement-plan.md`:

| 항목 | 방법 | 목표 |
|------|------|------|
| Expo bundle (tunnel) | Metro 로드 시각 | 5s |
| Expo bundle (LAN) | Metro 로드 시각 | 2s |
| `/admin/products?limit=50` | fetch 응답 | 500ms |
| `/admin/orders?limit=20` | fetch 응답 | 500ms |
| 이미지 (200x200) | waterfall | 200ms |
| `/pos-complete` | 결제 응답 | 800ms |

측정 절차: (1) 터널 vs LAN 대조 · (2) `curl -w '@curl-format.txt'` · (3) console.time · (4) Chrome DevTools waterfall.

개선 후보: pagination · thumbnail (Cloudflare Image Resizing) · `expo-image` cache · gzip.

**미완**: 실 수치 수집 = Kyu 폰 협업 별건.

### 4.3 싱가포르 이전 절차 (C8)

`docs/runbooks/singapore-migration-plan.md`:

**절차 6단계** · **총 예상 다운타임 10-20 분** · **롤백 5-10 분**.

| 단계 | 소요 |
|------|------|
| Postgres 새 리전 생성 | 5-10 분 |
| DB dump | 1-3 분 |
| DB restore | 3-5 분 |
| commerce-core 리전 변경 + redeploy | 3-8 분 (다운타임) |
| DNS propagation | 1-2 분 |
| 앱 확진 | 즉시 |

**리스크·완화**: 한산 시간대 (Jakarta 새벽 03:00-06:00) · env 오타 롤백 · pg_trgm 재설치 · R2 리전 무관.

**미완**: 실 이전 실행 = Kyu 승인 + 다운타임 창 확정 + 사장 부부 사전 공지.

---

## 5. K1~K6 실기 (kyu_checks 6)

C 라운드 K1~K8 8건 → D 라운드 축약 6건 (K1~K6 · K7/K8 은 상태 유지 · WA 텍스트 서버 반환은 별건 확진):

- **K1** Login (SDK 57 + SVG · fork PR #6 병합 후)
- **K2** 개점 (담당 닉네임 필드 신규 · 세션 자정 넘김 auto-close)
- **K3** Card 판매 · 6자리 승인번호 (본 라운드 UI 완결 · 예: 123456)
- **K4** QRIS 판매 · 6자리 승인번호 (예: 654321)
- **K5** 수금 · Owner spouse · 100000
- **K6** 마감 · Difference · Note · Close · Z 리포트 이동

**Deferred 정책 케이스** (별건 · 시간 있으면):
- Admin 에서 상품 하나 `product.metadata.fulfillment_policy=deferred` 편집.
- 앱 결제 완료 → Orders 상세 진입 → **Deferred fulfillment** 섹션 · **Mark fulfilled** 버튼 · 메모 입력 후 Confirm → 성공.

`checks/m0/M0-0918-D.md` 참조.

---

## 6. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| 커밋 메시지 `!` 미사용 | ✓ |
| PR 본문 `processes:` 필드 | ✓ (#7 comment · #121) |
| relay push (main) | ✓ |
| kyu_checks: 6 | ✓ |
| 실측 표 (speed-measurement-plan.md) | ✓ 계획만 · 실 수치 별건 |
| 이연 0 지시 대응 | ⚠ 미완 명기 (계정·기기·승인 필요 항목) · **라운드 늘리지 않음** |

---

## 7. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+4** | R041 부분 (Register English 완결) + R040 UI ([Mark fulfilled]) + R039 계획 (R2 + speed + Singapore) + typography 토큰 파일 |
| **부분 해소** | +2 | 결제 완료 화면 재설계 · Orders 배지 = 미완 명기 · 다음 미니 커밋에서 마무리 가능 |
| **신설 별건** | +3 | R2 실 세팅 · 속도 실 수치 · Singapore 실 이전 (계정·기기·승인 대기) |
| **총 순증감** | **+1 (해소 4 - 신설 3)** | 병합 후 -3 (Kyu 확진 시) · **"이연 0" 물리 미달성 자인 유지** |

---

## 8. 다음 게이트

1. **fork PR #6 병합** (SDK 57) → **PR #7 병합** (C+D 앱)
2. **storeport PR #121 병합** → Railway 자동 배포 (R2 env 없이 file-local 유지 · 신 코드 무영향)
3. **Kyu 3-line clicks** (Cloudflare Dashboard → Railway env) → R2 실 업로드 실측
4. **Kyu 폰 speed 실측** (§speed-measurement-plan.md 6 항목 표 실 수치 채우기)
5. **Singapore 이전 실행 판정** (다운타임 창 확정 · 사장 부부 사전 공지)
6. **미완 별건 미니 커밋** (본 세션 밖): Text 컴포넌트 typography 강제 · Login/Products/Setup Wizard/Settings English · Orders 목록 배지 · 결제 완료 screen 재설계

---

*M0-0918-D · 2026-09-18 · English 부분 + [Mark fulfilled] + R2 provider + Speed/Singapore plans · fork PR #7 (C+D) + storeport PR #121 · kyu_checks 6 · 이연 -1 (병합 후 -3 · "이연 0" 미달성 자인)*
