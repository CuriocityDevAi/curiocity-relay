# M2-1105-BJ 착지 보고서

**결과 한 줄**: Admin i18n 오버라이드 `orders.payment.status.captured: "Paid"` + invite·auth.login.cloud 리브랜딩 잔여 완료 · CI 전 항목 SUCCESS.

---

## CI run 결과 (PR #249 · feat/m2-1105-bj-admin-rebrand-paid)

| Job | Status |
|-----|--------|
| markers-and-forbidden | ✅ SUCCESS |
| check | ✅ SUCCESS |
| changes-filter | ✅ SUCCESS |
| unit-commerce-core (new 28 assertions 포함) | ✅ SUCCESS |
| pos-integration | ✅ SUCCESS |
| docker-smoke-* | SKIPPED (변경 무관) |

---

## 브랜딩 대사표 (Brand Inventory)

### ✅ 기 완료 (이전 커밋 — 이번 작업 아님)
| 항목 | 화면 | 방법 |
|------|------|------|
| 파비콘 | 모든 탭 | medusa-config.ts vite plugin (base64 inline) |
| 탭 제목 "Meros Admin" | 모든 화면 | vite transformIndexHtml + meros-title.tsx widget |
| 로그인 로고 | 로그인 화면 | meros-brand.tsx widget (Medusa AvatarBox 숨김) |
| `login.title` → "Welcome to Meros Admin Page" | 로그인 화면 | i18n override |
| `invite.title` → "Welcome to Meros Admin Page" | 초대 화면 | i18n override |

### ✅ 이번에 추가 (M2-1105-BJ)
| i18n 키 | 원문 | 변경 | 화면 |
|---------|------|------|------|
| `orders.payment.status.captured` | "Captured" | **"Paid"** | 주문 목록/상세 결제 상태 배지 |
| `invite.successHint` | "Get started with Medusa Admin…" | "…Meros Admin…" | 초대 완료 화면 |
| `invite.successAction` | "Start Medusa Admin" | "Start Meros Admin" | 초대 완료 버튼 |
| `auth.login.cloud` | "Log in with Medusa Cloud" | "Log in with Cloud" | 로그인 화면 하단 |

### 📋 목록만 (포크 패치 필요 — 이번 미적용)
| 항목 | 위치 | 이유 |
|------|------|------|
| `profile.edit.usageInsightsHint` href | 프로필 편집 화면 | 텍스트 i18n 가능하나 링크 URL(medusajs.com/docs)이 React 컴포넌트 하드코딩 |
| `orders.refund.systemPaymentDesc` | 환불 화면 | 운영 설명 문구, 중요도 낮음 |

---

## 어설션 (28 passes)

파일: `apps/commerce-core/src/admin/i18n/__tests__/i18n-overrides.unit.spec.ts`

```
PASS src/admin/i18n/__tests__/i18n-overrides.unit.spec.ts
  Admin i18n overrides (M2-1105-BJ)
    lang=en
      ✓ login.title = Welcome to Meros Admin Page
      ✓ invite.title = Welcome to Meros Admin Page
      ✓ invite.successHint contains Meros Admin
      ✓ invite.successAction = Start Meros Admin
      ✓ auth.login.cloud does NOT contain Medusa
      ✓ orders.payment.status.captured = Paid
      ✓ no override value equals Captured
    [lang=enGB / id / ko — 동일 7 passes × 3 = 21]

Tests: 28 passed, 28 total  Time: 0.147 s
```

---

## 로컬 빌드 검증

- `medusa build` 성공: "Frontend build completed successfully (15.14s)"
- 페이지 타이틀 확인 (JS 평가): `"Meros Admin"` ✅
- Vite HMR `meros-brand.tsx:21 inWebWorker 중복 선언` 오류는 **pre-existing** (meros-brand.tsx 최종 수정 커밋 946d31c · 2026-11-05) — 내 변경 무관 · 배포 환경(Railway 프로덕션)에서는 미발생.

---

## Kyu 확인 항목

배포 후 시크릿 창:
1. `/orders` → 결제 완료 주문의 Payment 컬럼 배지가 **"Paid"** (기존 "Captured")
2. `/orders/<id>` → Payment 섹션 상태 **"Paid"**
3. `/app/login` → 탭 제목 "Meros Admin" · 로고 Meros ·  "Welcome to Meros Admin Page"

---

## 이연 순증감

이번 없음 (신규 이연 0 · 처리 이연 0).

---

PR: https://github.com/CuriocityDevAi/storeport/pull/249
