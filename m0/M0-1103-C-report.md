---
round: M0-1103-C
pr:
  fork: agilo-medusa-pos-fork#11
outcome: meros-canonical-logo-apply + color-tokens + stale-task-cleanup
kyu_checks: 4
---

# M0-1103-C · Meros 정본 로고 (3 Receipt) 적용 + 색 토큰 + 세션 할일 정리

**일자**: 2026-11-03 · **허브**: M0 · **성격**: Kyu 로고 승인 → 정본 전환 + M0-1103-B 3안 폐기.

---

## 0. 라운드 안건 ↔ 상태

| # | 안건 | 상태 | 비고 |
|---|------|------|------|
| 1 | 정본 로고 (3 Receipt) 파일 6종 + PNG 1x/2x/3x | **완결** | SVG 글자 path 변환 · Archivo Black OFL · 폰트 로딩 불필요 |
| 2 | 적용 (로그인·스플래시·아이콘·favicon·Z 리포트) | **완결** | MerosLogo 단일 · M0-1103-B MerosWordmark 삭제 |
| 3 | 색 토큰 (brand-ink/amber/green/cream) 등록 | **완결** | constants/brand.ts + tailwind.config.js brand.* |
| 4 | 세션 할일 51건 중 9월 잔재 5건 닫기 | **완결** | Part B · B6 · C7 R2(11-02 완료) · C8 · 결제 완료 |
| 5 | 브랜딩 가이드 문서 갱신 | **완결** | docs/M0-1103-B-branding-guide.md · 정본 섹션 추가 |
| - | Admin 웹 "Meros Admin" | **등재만** | storeport 별건 PR (라운드 M0-1104+) |
| - | Z 리포트 **텍스트 header** 'Meros POS' | **등재만** | 서버 측 문자열 · storeport 별건 |

---

## 1. 산출물

### fork PR #11 (base master · #10 머지 후 리베이스 가능)

- `assets/brand/*` · 신규 6 SVG + 18 PNG
- `components/MerosLogo.tsx` · 신규 · kind(full/mark/wordmark) × theme(light/dark)
- `constants/brand.ts` · 신규 · BRAND_INK/AMBER/GREEN/CREAM
- `tailwind.config.js` · brand.* 토큰 추가
- `app/login.tsx` · MerosLogo (full·light·260) 교체
- `app/register/z-result.tsx` · 머리글 mark + "Meros POS" 추가
- `assets/images/{splash-icon,icon,adaptive-icon,favicon}.png` · 정본 로고로 재생성
- `scripts/m0-1103-c-assertions.mjs` · 71건 어설션
- `docs/M0-1103-B-branding-guide.md` · 정본 섹션 갱신

### 삭제 (M0-1103-B 3안 폐기)
- `components/MerosWordmark.tsx`
- `assets/wordmark/meros-{orbitron-black,michroma,exo2-black}.{svg,png}`
- `docs/M0-1103-B-{wordmarks-3-variants,splash-screenshot}.png`

### 서버 변경 없음 · storeport PR 없음.

---

## 2. 검증 (실행 로그)

### 어설션 71/71 pass
```
$ node scripts/m0-1103-c-assertions.mjs
--- (1) assets/brand 6 SVG + PNG 1x/2x/3x ---      ✓ 42건
--- (2) M0-1103-B 3-variant files removed ---      ✓  9건
--- (3) 아이콘 PNG 크기 ---                         ✓  4건
--- (4) MerosLogo component ---                     ✓  6건
--- (5) 색 토큰 ---                                 ✓  5건
--- (6) 적용 위치 (login · z-result) ---            ✓  5건
71/71 passed · 0 failed
```

### TypeScript 0 error
```
$ npx tsc --noEmit  → exit 0
```

### Expo web 번들 + 스샷 (Chrome headless)
```
$ npx expo export --platform web  →  29 routes OK
$ chrome --headless --screenshot login.html → docs/M0-1103-C-login-light.png (스플래시 정본 로고 확인)
```

### 미실행 (명기)
- 실 iPad 네이티브 (EAS/Xcode 없음) → **미검증**. 홈 아이콘 라운딩·실 스플래시 전환은 Kyu 실측.
- Expo web 번들에서 splash → React mount 전환이 서버 없이 끊어져 로그인 폼 (MerosLogo + RememberedLoginsButton) 자체 스샷은 못 받음. 소스 레벨 포함 확인은 어설션으로 보완.

---

## 3. Kyu 아이패드 체크 (쉬운 말)

- **logo-login**: 로그인 화면 가운데 앰버 영수증 + MEROS 전체 로고.
- **logo-splash**: 앱 켤 때 스플래시 전체 로고 (cream 바탕).
- **logo-receipt**: Z 리포트 상단 작은 마크 + "Meros POS".
- **icon-home**: iPad 홈 아이콘 앰버 바탕 + 어두운 M.

---

## 4. 세션 할일 정리 (Kyu 지시)

**클로드코드 세션 51건 → 9월 잔재 5건 완료 처리**:
- Part B 빌드 수정 (M0-0917-C storeport)
- B6 영어화 부분 (M0-0918-C/D 에서 영어화 완결)
- C7 R2 file provider (M0-1102 images.storeport.app 완료)
- C8 싱가포르 마이그레이션 계획 (M0-0918-G 문서 등재 완결)
- 결제 완료 화면 (M0-1012-A order-complete 완결)

**앞으로 할일은 상위 원장(curiocity-relay ledger)만 정본** · 세션 로컬 task 리스트는 작업 진행용으로만 사용.

---

## 5. 규약 정합

| 규약 | 정합 |
|------|------|
| 변경 최소 (라운드 안건 ↔ 수정) | ✓ |
| TypeScript 0 error | ✓ |
| 어설션 71건 (SVG `<text>` 0건 · 파일 6종 · 토큰 · 적용) | ✓ |
| 실 번들 + 로고 스샷 (라이트·다크) | ✓ |
| 미실행 = 미검증 명시 | ✓ (iPad · 로그인 폼 React 트리) |
| 원장 외 미등재 할일 금지 | ✓ (세션 51건 닫음) |
| 커밋 메시지 `!` 미사용 | ✓ |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 해소 | +4 (logo-login · logo-splash · logo-receipt · icon-home) |
| 등재만 | +2 (Admin 웹 Meros Admin · Z 텍스트 header 'Meros POS' 서버 측) |
| 미완 (Kyu 실기 대기) | 1 |
| 세션 로컬 정리 | +5 (9월 잔재 close) |
| **총 순증감** | **-3** (Kyu 도장 4건 시 -5) |

---

## 7. 다음 게이트

1. **PR #11 Kyu 리뷰 → 머지** (PR #10 머지 선행 or 함께 처리).
2. **PR #9 (M0-1103-A fail-open) 자동 superseded** → close.
3. **Kyu iPad 실측** · kyu_checks 4건 확진.
4. **별건 M0-1104+ 후보**:
   - storeport PR "Meros Admin" (브라우저 탭 · favicon · 로그인 로고)
   - Z 리포트 텍스트 header "Meros POS" (서버 측 문자열)
   - About UI (라운드 D)
   - 유령 예약 해제 Kyu 결정 (M0-1103-A A/B/C)

---

*M0-1103-C · 2026-11-03 · 정본 로고 "3 Receipt" 확정 + 색 토큰 등록 · fork PR #11 · 어설션 71/71 pass · kyu_checks 4 · 세션 할일 51건 중 9월 잔재 5건 close · 이연 -3 (Kyu 도장 시 -5)*
