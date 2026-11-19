storeport #399 · splash 원복 O · POS 기준 512px · CD M 384px(75%) · 외부경로 제거 O · 빌드 e0630517-1474-4ae6-adaf-93d2aa8314c8 queued · 설치 URL https://expo.dev/accounts/curiocity/projects/customer-display/builds/e0630517-1474-4ae6-adaf-93d2aa8314c8

## 수행 내역

### REQ 1 — splash.png · receipt-anim.png 원복
- `git checkout origin/main -- apps/customer-display/assets/splash.png apps/customer-display/assets/receipt-anim.png`
- splash.png: 624×18 stub (177B) 복원
- receipt-anim.png: 272×296 (5781B) 복원
- gen-icons.mjs 에서 두 파일 재생성 섹션 완전 제거

### REQ 2 — POS 기준값 정정 + 외부경로 제거
- POS 아이콘 실측: pos-m0 (agilo-medusa-pos-fork@9216605) icon.png M trimmed 512px
  - SVG 근거: y=38~118 (80/160 canvas) × 1024/160 = 512.0px
- `POS_M_PX = 480` → `POS_M_PX = 512` (주석에 fork SHA 포함)
- CD M = Math.round(512 × 75 / 100) = **384px** (37.5% of 1024)
- 외부경로 `../../../../agilo-medusa-pos-fork/assets/images/icon.png` 제거
  → `assets/brand/pos-icon-ref.png` (리포 내 복사본, fork@9216605)

### REQ 3 — 비교 이미지
- `apps/customer-display/assets/brand/M2-1119-V-icon-compare.png` 생성
  (레이블 + 1024px 행 + 76px 행 + 60px 행 · POS vs CD 75%)
- relay 복사: `~/projects/curiocity-relay/m2/M2-1119-V-icon-compare.png`

### REQ 4 — iOS development 빌드
- `eas build --platform ios --profile development --non-interactive --no-wait`
- 빌드 ID: e0630517-1474-4ae6-adaf-93d2aa8314c8
- 상태: queued (CI runner 대기 중)
- 설치 URL: https://expo.dev/accounts/curiocity/projects/customer-display/builds/e0630517-1474-4ae6-adaf-93d2aa8314c8

### 커밋 · Push
- 커밋: 7f06ba98 on fix/M3-1119-N-cd-icon-scale
- push: origin/fix/M3-1119-N-cd-icon-scale ✅
- PR #399 본문 업데이트 ✅
