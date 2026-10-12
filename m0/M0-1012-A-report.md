---
round: M0-1012-A
pr:
  storeport: storeport#151
  fork: agilo-medusa-pos-fork#8
outcome: z-root + cart-reset + band + inventory + partial-provider + promotion
kyu_checks: 8
---

# M0-1012-A · Z 뿌리 + 카트 초기화 + 띠 + 재고 배지 + 프로모션 + 결제수단(스텁) (R021 · R042 · R039)

**일자**: 2026-10-12 · **허브**: M0 · **성격**: Kyu iPad 실기 재현 7 항목 (10-12 16:3x · LAN · Expo Go) 중 코드 가능 항목 전부 착지 + 미완 명기.

**착지 조건**: 아이패드 실기 재현 항목 전부 프로덕션 서버 대상 실측 스샷. 본 라운드는 **코드 착지 완결 · 프로덕션 실측 Kyu 도장 대기**.

---

## 0. R2 Kyu 클릭 3줄 (리포트 맨 위 · 반복 게시)

1. **Cloudflare Dashboard → R2 → Create bucket** (`storeport-images` · Location Hint APAC · Public Access 활성화).
2. **R2 → API Tokens → Create** (Object Read & Write · bucket scope) → copy `Access Key ID` · `Secret Access Key` · `Endpoint URL` (`https://<account_id>.r2.cloudflarestorage.com`) · Public URL (`https://pub-<hash>.r2.dev`).
3. **Railway → storeport-production → Variables** → env 5 개 편입 → Deploy SUCCESS → Admin → Product edit → Upload image → 앱 상품 카드에 이미지 뜨면 완결.

```
R2_ACCESS_KEY_ID=<step 2>
R2_SECRET_ACCESS_KEY=<step 2>
R2_BUCKET=storeport-images
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-<hash>.r2.dev
```

정본: `storeport/docs/runbooks/r2-setup.md` (M0-0918-D) · R2 provider guard = M0-0918-G.

---

## 1. 상태 실측 (M0-1012-A tip)

| 리포 | 브랜치 | tip | 상태 |
|------|--------|-----|------|
| storeport main | main | `4ad11b4` (M0-0918-I) · prod `/health` version=9d9d82b3 | - |
| storeport 작업 | `feat/m0-1012-a-pos-core` | `d72ccd0` | **PR #151 OPEN** |
| fork master | master | `dc38ea8` (M0-0918-C/D/E/F squash) | - |
| fork 작업 | `feat/m0-1012-a-app` | `de68d5d` | **PR #8 OPEN** |
| curiocity-relay main | main | 본 리포트 push 대상 | - |

---

## 2. [REQ] 7 항목 회수 매트릭스 (정직 자인)

| # | 요구 | 상태 | 파일/위치 · 미완 사유 |
|---|------|------|---------------------|
| 0 | Z 재실패 뿌리 (Order #order_01M4QPYQR3WMRFKHDAJ64PA7FJ) | **완결 (가설 기반)** | `fork/api/hooks/draft-orders.tsx:613` · `/admin/orders/:id/complete` 호출 제거. 서버 로그는 railway login 재인증 필요 → 못 봄 → 가설: Medusa v2 convertToOrder 가 완결시킴에도 추가 complete 호출 404/validation → mutation throw → pos-complete 미실행. 실측 확진은 Kyu 도장 (서버 로그 [M0-1012-A] prefix 확인) 후. |
| 1 | 완료 후 카트 초기화 (성공/실패 공통) | **완결** | `fork/api/hooks/draft-orders.tsx` · `SecureStore.deleteItemAsync` 를 convertToOrder 직후로 이동. |
| 2 | 상단 띠 포맷 | **완결** | `fork/components/RegisterBadge.tsx` · "● Open · <store> · since YYYY.MM.DD HH:mm by <nickname>" / "○ Closed · <store> · Tap to open". 세션 ID = Z 리포트 세션 절 전용. |
| 3 | 재고 배지 (N left · Sold out · 탭 차단) | **완결** | `fork/app/(tabs)/products.tsx` · `variant.inventory_quantity` + `manage_inventory` 집계. `utils/errors.ts` 재고부족 사람 문장. |
| 4 | 결제수단 정식 (3 provider · 수동 캡처) | **미완 (스텁 수준)** | metadata.pos_payment_method 로 chip/Z 집계는 작동 중 (M0-0918-A/E). 공식 3-provider 등록은 Medusa 모듈 개발 필요 → Phase 2 Midtrans/Xendit 과 동시 착수가 효율. 현재 UX 영향 zero. |
| 5 | 프로모션 UI (Cart Discount · 합계 반영) | **완결 (코드 기존)** | `fork/app/(tabs)/cart.tsx` · PromotionBadge + useAddPromotion 이미 존재 (M0-0729-AO). Admin 에서 Promotion 1개 생성 · 코드 실측 = Kyu 소관. |
| 6 | R2 이미지 (Kyu 클릭) | **미완 (Kyu Cloudflare 계정 세팅 대기)** | §0 3줄 반복. 설정 후 Admin 업로드 → 앱 표시 실측. |

---

## 3. 서버 로그 발췌 (미완 명기)

**railway CLI 재인증 필요** (`Unauthorized. Please run \`railway login\` again`). 세션 동안 자동 로그인 불가 → Kyu 가 Railway 대시보드 혹은 CLI 재인증 후 아래 명령:

```bash
railway login
railway environment production
railway logs --service <commerce-core> | grep "order_01M4QPYQR3WMRFKHDAJ64PA7FJ"
```

**본 라운드 추가 로그**:
- `pos-complete/route.ts` 의 3 실패 지점에 `[M0-1012-A]` prefix + order_id · session · method · total source 포함.
- storeport PR #151 병합 → 재배포 후 다음 재현 시 Railway 로그에서 즉시 뿌리 확인 가능.

---

## 4. iPad 재실기 체크 (kyu_checks 8 · 쉬운 말)

| K | 체크 | 기대 |
|---|------|------|
| K1 | 상단 띠 포맷 | "● Open · <store> · since YYYY.MM.DD HH:mm by <nick>" · 세션 ID 안 보임 |
| K2 | 재고 배지 | 카드 오른쪽 위 "N left" (초록) · N≤5 (앰버) · 0 "Sold out" (회색 opacity) |
| K3 | Sold out 탭 차단 | 0 상품 터치해도 안 열림 · 재고 1 짜리 2개 담기 시 토스트 "Sold out · Ask admin to restock" |
| K4 | Card → Paid+Fulfilled | Card 123456 → "Order confirmed" → Orders Paid+Fulfilled 초록 |
| K5 | 연속 주문 2건 | 결제 후 Back to shop → 상품 담기 → 다음 결제 성공 · "Not a draft order" 안 뜸 |
| K6 | 할인 적용 | Cart "Add Promotion" → 코드 → 할인 줄 + 총액 감소 |
| K7 | 수단 칩 | Orders 목록 카드 Cash/Card/QRIS 라벨 칩 |
| K8 | Z 3 라인 | 마감 → Z Report Cash/Card/QRIS 3 라인 + 건수 |

**새 clone 기준 스샷**: 아이패드 접근 없음 → **미완**. Kyu 폰/패드 실기 완결 후 Orders 상세 · 띠 · Z 리포트 각 1장 요청.

`checks/m0/M0-1012-A.md` 참조.

---

## 5. 규약 정합 점검

| 규약 | 정합 |
|------|------|
| 영어 전용 (사용자 가시 문자열) | ✓ (추가 변경분) |
| 하드코딩 색/크기 0 | ⚠ 기존 컴포넌트 유지 (본 라운드 변경분은 tailwind token 사용) |
| 커밋 메시지 `!` 미사용 | ✓ |
| 착지 직전 master/main 재병합 | ✓ (feat/m0-1012-a-* 양쪽 branch 모두 origin 최신에서 분기) |
| PR 본문 test-checklist (쉬운 말 · 아이패드 기준) | ✓ (fork PR #8) |
| 코드 변경 zero 라운드 아님 → 코드 + 문서 둘 다 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 | 근거 |
|---------|----|------|
| **해소** | **+4** | 뿌리 (Z 실패) · 카트 초기화 · 띠 포맷 · 재고 배지 |
| **부분 해소** | +2 | 프로모션 UI (코드 기존) · 결제수단 (스텁 작동) |
| **미완** | +2 | R2 (Kyu 세팅) · 아이패드 실측 스샷 (Kyu 접근) |
| **총 순증감** | **-4** (Kyu 도장 시 -6) | 병합 후 |

---

## 7. 다음 게이트

1. **PR #151 + #8 병합** → Railway 자동 배포 SUCCESS.
2. **Kyu iPad 재실기** (K1~K8) · 서버 로그 `[M0-1012-A]` prefix 확인 · 새 clone 기준 스샷.
3. **R2 Cloudflare 세팅 (3줄 · §0)** → Admin 업로드 → 앱 표시 실측.
4. **결제수단 공식 provider · Phase 2** (Midtrans/Xendit 과 동시 · K13 EDC 트리거 후).
5. **다음 라운드 M0-1013+**: RMA (라운드 B · M0-0918-I §5 유지) · 고객·알림·Scan (라운드 C).

---

*M0-1012-A · 2026-10-12 · iPad 7 항목 재현 중 4 완결 · 2 부분 · 2 미완 · storeport PR #151 + fork PR #8 · kyu_checks 8 · 이연 -4 (Kyu 도장 시 -6)*
