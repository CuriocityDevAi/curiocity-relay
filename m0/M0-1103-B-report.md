---
round: M0-1103-B
pr:
  fork: agilo-medusa-pos-fork#10
outcome: meros-rebranding + login-remember + stock-badge-number-real
kyu_checks: 5
---

# M0-1103-B · Meros 리브랜딩 + 로그인 기억 + 재고 배지 진짜 뿌리

**일자**: 2026-11-03 · **허브**: M0 · **라운드 안건**: 5건.

---

## 0. 라운드 안건 ↔ 상태

| # | 안건 | 상태 | 비고 |
|---|------|------|------|
| 1 | 리브랜딩 (Medusa/Agilo → Meros) | **완결** | app.json · package.json · splash/icon/favicon · login screen · 에러 문구 |
| 2 | MEROS 워드마크 3안 (OFL fonts) | **완결** | Orbitron Black (기본) · Michroma · Exo 2 Black · SVG path 내장 |
| 3 | 로그인 기억 (expo-secure-store · dropdown) | **완결** | URL+email · MRU · long-press 삭제 · 비밀번호 저장 안 함 |
| 4 | 재고 배지 진짜 뿌리 (hypothesis a 확진) | **완결** | /admin/products 는 wrap 안 함 · /admin/product-variants 2차 조회로 머지 |
| 5 | admin.storeport.app Railway+Cloudflare 3줄 | **완결** | runbook 신설 · meros.id 전환 1클릭 설계 |
| D | 소소 UX (품절 opacity 25% · 배지 강조) | **등재만** | 라운드 D 소소 마감 (구현 금지 · 지시 준수) |
| D | About → "Open source licenses" UI | **등재만** | 본 라운드 미구현 |
| D | Admin 웹 "Meros Admin" (storeport) | **등재만** | 별건 storeport PR |

---

## 1. 뿌리 확진 (hypothesis a 확정)

**읽은 소스**: `/Users/kyu.lee/projects/storeport/node_modules/.pnpm/@medusajs+medusa@2.17.2.../dist/api/utils/middlewares/products/variant-inventory-quantity.js`.

| route | wrap 적용 |
|-------|-----------|
| `admin/products/[id]/variants` | ✓ `wrapVariantsWithTotalInventoryQuantity` |
| `admin/product-variants` | ✓ `wrapVariantsWithTotalInventoryQuantity` |
| `store/products` | ✓ `wrapVariantsWithInventoryQuantityForSalesChannel` |
| **`admin/products` (list)** | **✗ 없음** ← POS 앱이 사용하는 경로! |
| `admin/products/[id]` | ✗ 없음 |

**결론**: Medusa 2.17.2 admin products list route 가 `inventory_quantity` 를 응답에 포함시키지 않음. `+variants.inventory_quantity` fields 요청해도 무시됨. → 이전 집계가 `Number(undefined ?? 0) = 0` 로 전부 Sold out 판정.

**해결 (api/hooks/products.ts)**: 2차 조회 `sdk.admin.productVariant.list({ id: [...], fields: 'id,inventory_quantity' })` (이 route 는 wrap 적용) · 응답을 각 variant 에 머지. 실패 시 fail-open (M0-1103-A 가 unknown 처리).

---

## 2. 산출물

### fork PR #10 (base master · 변경 최소 but 범위 큰 라운드)

| 파일군 | 변경 |
|--------|------|
| app.json · package.json | Meros POS · com.curiocity.meros.pos |
| assets/images/*.png | AGILO → MEROS Orbitron 재생성 |
| assets/wordmark/*.{svg,png} | 신규 3 variant · SVG path 내장 |
| components/MerosWordmark.tsx | 신규 · variant switch |
| app/login.tsx | 로고 · RememberedLoginsButton · "Meros shop URL" |
| utils/loginRemember.ts | 신규 · SecureStore |
| contexts/auth.tsx | 로그인 성공 시 saveRememberedLogin |
| api/hooks/products.ts | enrichProductsWithInventory 2차 조회 머지 |
| scripts/m0-1103-b-assertions.mjs | 신규 31건 |
| docs/M0-1103-B-branding-guide.md | 1쪽 지침 |
| docs/runbooks/custom-domain-admin.md | 3줄 클릭 런북 |

**M0-1103-A 포함**: fail-open 커밋 cherry-pick (PR #9 중복 · 본 PR 머지 시 #9 close 가능).

**storeport PR 없음** · 서버 변경 미필요.

---

## 3. 검증 (실행 로그)

### 어설션 44건 pass
```
$ node scripts/m0-1103-a-assertions.mjs
13/13 passed · 0 failed

$ node scripts/m0-1103-b-assertions.mjs
--- (1) loginRemember ---              ✓ 12건
--- (2) Wordmark SVG integrity ---     ✓ 14건
--- (3) enrichProductsWithInventory --- ✓  5건
31/31 passed · 0 failed
```

### TypeScript 0 error
```
$ npx tsc --noEmit
(exit 0)
```

### Expo web 번들 + 스플래시 실측 (Chrome headless)
```
$ npx expo export --platform web   # 29 routes · 6MB JS · OK
$ chrome --headless --screenshot login.html
→ docs/M0-1103-B-splash-screenshot.png: MEROS POS 로고 확인
```

### 미실행 (명기)
- 실 iPad 네이티브 빌드 (EAS/Xcode 없음) → **미검증**. 홈 화면 라벨 "Meros POS" + 재고 숫자 실측은 Kyu iPad.
- 실 서버 `/admin/product-variants` 호출 (Admin 자격 없음) → **미검증**. 로직은 완결.
- Expo React 로그인 폼 완전 렌더링 (web splash 가 앞에 있어 React 트리 눈으로 확인 불가) · 소스 레벨 검증은 어설션으로 보완.

---

## 4. Kyu 아이패드 재실기 체크 (쉬운 말)

- **no-oss-name**: 홈 라벨 "Meros POS" · 어디에도 Medusa/Agilo 글자 없음 (About 라이선스 1곳 제외).
- **wordmark**: 로그인 상단 두껍고 둥근 **MEROS** (Variant 1 Orbitron Black 기본).
- **login-remember**: 1회 로그인 성공 → 로그아웃 → "Recent:" 칩 → URL 탭 → 이메일 자동.
- **stock-badge-number**: Admin 재고 15 → 앱 Products "15 left" 초록 배지.
- **admin-title**: 브라우저 탭 "Meros Admin" (storeport 별건 PR 이후).

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 변경 최소 | ✓ 라운드 안건 5건 ↔ 최소 수정 |
| TypeScript 0 error | ✓ |
| 어설션 44건 | ✓ (A 13 + B 31) |
| Expo 실 번들 + 스플래시 스크린샷 | ✓ |
| 미실행 = 미검증 명시 | ✓ (iPad · curl · React 로그인 폼) |
| D 라운드 등재만 · 구현 금지 | ✓ (UX 소소 · About · Admin 로고) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +5 (rebrand · wordmark · login-remember · stock-badge-number · admin-cname) |
| 등재만 | +3 (About UI · Admin 로고 · UX 소소 D) |
| 미완 (Kyu 실기 대기) | 1 |
| 선행 PR 중복 (M0-1103-A #9) | -1 (본 PR 머지 시 #9 close) |
| **총 순증감** | **-4** (Kyu 도장 5건 시 -5) |

---

## 7. 다음 게이트

1. **fork PR #10 Kyu 리뷰** → Wordmark 1안 선택 (기본 Variant 1 Orbitron) → 머지.
2. **M0-1103-A PR #9 자동 superseded** → close.
3. **Kyu iPad 실측** · kyu_checks 5건 확진.
4. **별건 라운드 M0-1104+ 후보**:
   - storeport PR · "Meros Admin" (브라우저 탭 title · favicon · 로그인 로고)
   - 라운드 D 소소 마감 (About UI · 품절 카드 UX)
   - meros.id 구매 완료 시 CNAME 교체 (런북 §B/C/D)
   - 유령 예약 해제 (M0-1103-A A/B/C 중 Kyu 결정)

---

*M0-1103-B · 2026-11-03 · Meros 리브랜딩 + 로그인 기억 + 재고 배지 진짜 뿌리 · fork PR #10 · 어설션 44/44 pass · kyu_checks 5 · 이연 -4 (Kyu 도장 시 -5)*
