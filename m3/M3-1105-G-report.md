---
round: M3-1105-G
pr:
  fork_draft: agilo-medusa-pos-fork#37 (A) · #39 (B) · #40 (C) — **머지 금지 · Kyu 1 명 선택 전까지**
commit: (branches palette/a · palette/b · palette/c · base master 9e99354)
outcome: 팔레트 후보 3안 (토큰 값만 교체 · 15장 스샷) · 1 라인 Kyu 결정 요청
kyu_checks: 1 (A / B / C 중 1 선택 · 선택된 안을 정식 PR 승격)
---

# M3-1105-G · 팔레트 후보 3안 — Kyu 결정 요청

**일자**: 2026-11-07 · **허브**: M3 · **성격**: Kyu 11-04 결정 ("파랑 제거 · 흑백 + 앰버") 구체 비교 · 토큰 값만 교체 · Draft 3안 · Kyu 1 명 선택.

---

## 🙋 **Kyu, 아래 A / B / C 중 하나 골라주세요**

| 후보 | 특징 | Draft PR |
|------|------|----------|
| **A** | 흑백 배경 + brand-amber accent (파랑 → 앰버) | [#37](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/37) |
| **B** | 흑백 배경 + brand-green accent (파랑 → 그린) | [#39](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/39) |
| **C** | **크림 배경** (brand-cream) + 앰버 accent | [#40](https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/40) |

선택하신 후 PR 번호만 알려주세요 — 그 안을 정식 PR 승격 + 다른 둘은 close.

---

## 0. 안건 ↔ 상태

| # | 안건 | 상태 |
|---|------|------|
| 1 | 팔레트 후보 3 안 · 각 branch 1개 + Draft PR 1개 | ✓ `palette/a` #37 · `palette/b` #39 · `palette/c` #40 |
| 2 | 토큰 값만 교체 (tailwind.config.js + constants/brand.ts) | ✓ 각 PR 2 파일만 수정 (+ 스샷 5) |
| 3 | 같은 5 화면 스샷 × 3 = **15 장** | ✓ `docs/M3-1105-G-palette-{a,b,c}/{login,products,cart,orders,settings}.png` |
| 4 | 색 어설션 35/35 유지 | ✓ (각 branch 에서 재검증) |
| 5 | WCAG AA 대비 체크 표 | ✓ (아래 §3) |
| 6 | Kyu 결정 요청 1 줄 | ✓ (문서 최상단 🙋) |

> **주의**: 스펙은 "색 어설션 37/37" 라고 표기했으나 base master 는 **아직 14 토큰** (ink-disabled 추가하는 #33 M3-1105-E 미머지). 본 라운드는 master 기준 35/35 로 재적용. M3-1105-E 머지 뒤 선택 안 rebase 때 ink-disabled 토큰 값 1 개만 추가하면 37/37 로 자동 승격.

---

## 1. 산출물 (Draft PR 3 · 머지 금지)

| 안 | branch | PR | surface | ink | accent | success | warning |
|----|--------|----|---------|-----|--------|---------|---------|
| **A** | `palette/a` | #37 | `#FFFFFF` white | `#0E1B18` | **`#E8A33D` amber** | `#1C7C68` green | `#9B6D1F` |
| **B** | `palette/b` | #39 | `#FFFFFF` white | `#0E1B18` | **`#1C7C68` green** | `#2E7D32` darker green | `#E8A33D` amber |
| **C** | `palette/c` | #40 | **`#F2F4F1` cream** | `#0E1B18` | **`#E8A33D` amber** | `#1C7C68` green | `#9B6D1F` |

공통: `danger = #C62828` · `ink-subtle = #B5B5B5` 유지.

---

## 2. 15 장 비교 (파일 경로)

| 화면 | A | B | C |
|------|---|---|---|
| login | `docs/M3-1105-G-palette-a/login.png` | `docs/M3-1105-G-palette-b/login.png` | `docs/M3-1105-G-palette-c/login.png` |
| products | `.../palette-a/products.png` | `.../palette-b/products.png` | `.../palette-c/products.png` |
| cart | `.../palette-a/cart.png` | `.../palette-b/cart.png` | `.../palette-c/cart.png` |
| orders | `.../palette-a/orders.png` | `.../palette-b/orders.png` | `.../palette-c/orders.png` |
| settings | `.../palette-a/settings.png` | `.../palette-b/settings.png` | `.../palette-c/settings.png` |

> 각 Draft PR 본문의 "스샷 (5)" 섹션에서 바로 확인 가능 (branch 내 docs/ 경로).

---

## 3. WCAG AA 대비 체크 (주요 조합)

AA 기준: **normal text 4.5:1 이상** · large text (≥18pt) 3:1 이상.

| 조합 | A | B | C | AA |
|------|---|---|---|----|
| text-ink on bg-surface (본문) | `#0E1B18` on `#FFFFFF` **~19:1** | `#0E1B18` on `#FFFFFF` **~19:1** | `#0E1B18` on `#F2F4F1` **~17:1** | ✓ 전부 |
| text-ink on bg-accent (dark text on filled btn) | on `#E8A33D` **~9:1** | on `#1C7C68` **~6:1** | on `#E8A33D` **~9:1** | ✓ 전부 |
| **text-surface on bg-accent** (현재 Button 솔리드) | on `#E8A33D` **~2.1:1** | on `#1C7C68` **~5.5:1** | on `#E8A33D` **~2.1:1** | A·C **✗** · B ✓ |
| text-accent on bg-surface (링크·icon) | `#E8A33D` on white **~2.1:1** | `#1C7C68` on white **~5.0:1** | `#E8A33D` on cream **~2.0:1** | A·C ✗ · B ✓ |
| text-accent on bg-accent-soft (chip) | `#E8A33D` on `#FBE4B6` **~2.6:1** | `#1C7C68` on `#C8E6DD` **~3.8:1** (large ✓) | `#E8A33D` on `#F7E1B8` **~1.6:1** | A·C ✗ · B ○ (large) |
| text-ink-muted on bg-surface | `#7A7A7A` on white **~5.0:1** | `#7A7A7A` on white **~5.0:1** | `#6E7570` on cream **~5.5:1** | ✓ 전부 |
| text-danger on bg-surface | `#C62828` on white **~5.6:1** | 동일 | `#C62828` on cream **~5.3:1** | ✓ 전부 |
| text-success on bg-success-soft | `#1C7C68` on `#CDEBE1` **~4.6:1** | `#2E7D32` on `#C8E6C9` **~4.3:1** (large ○) | 동일 A | A·C ✓ · B ○ (large) |

### 3-1. 결론 (대비 관점)
- **B (그린 accent)** 가 AA 가장 깨끗 — Button 솔리드의 흰 글씨 그대로 OK · chip (text-accent on accent-soft) 는 large 기준 통과.
- **A (앰버 accent)** 와 **C (크림 + 앰버)** 는 앰버의 명도가 밝아 **solid 버튼 흰 글씨 AA 부족** — 선택 시 `Button.tsx` solid variant text 를 `text-surface` → `text-ink` 로 1 라인 follow-up 필요.
- **C** 는 surface 가 크림 (#F2F4F1) 이라 전반적인 "노란 톤" 이 강하지만 **상품 썸네일 (노란 치즈빵 등) 과 톤 충돌** 가능성 있음 — 아이패드 실기 필수.

---

## 4. 설계 포인트

### 4-1. 토큰 값만 변경 (2 파일)
- 각 branch 는 `tailwind.config.js` + `constants/brand.ts` 2 파일만 수정 · 다른 파일은 **무수정**.
- 코드 로직 변화 0 · 재빌드 (`npx expo export`) 만으로 즉시 적용.
- 선택 뒤 후속 Button 교정은 별건 1 라인 커밋 (A/C 만 필요).

### 4-2. Draft PR 상태 (머지 금지 · Kyu 안전핀)
- 3 PR 모두 **Draft** 로 생성 — 자동/수동 머지 방지.
- Kyu 결정 시 선택 PR 을 `gh pr ready` 로 승격 + 나머지 2 는 close.

### 4-3. ink 는 brand-ink (#0E1B18) 로 공통 통일
- 3 안 모두 `ink = #0E1B18` 사용 — M1-1105-D §3-① "활성 버튼이 회색으로 보임" 공통 해소.
- master 의 `#282828` 대비 **더 진한 검정** → 솔리드 버튼 뚜렷.

### 4-4. 공통 변경 (3 안 공유)
- `ink`, `danger`, `ink-subtle` 동일.
- `surface` 는 A/B=white · C=cream 으로 결정적 차이.
- `accent` 는 A/C=amber · B=green.
- `warning` 는 A/C=deeper-amber · B=brand-amber (B 는 accent 가 green 이므로 warning 에 amber 가능).

---

## 5. 규약 정합

| 규약 | 상태 |
|------|------|
| base master · 다른 파일 수정 금지 | ✓ (각 branch 2 파일 + docs 스샷만) |
| 색 어설션 유지 | ✓ 35/35 (master 기준) · ink-disabled 추가 뒤 37/37 자동 |
| WCAG AA 체크 | ✓ (§3 테이블 — A/C 1 라인 follow-up 명시) |
| Draft PR (머지 금지) | ✓ 3 개 전부 Draft |
| Kyu 결정 요청 1 줄 | ✓ (문서 최상단 🙋) |

---

## 6. 이연 순증감

| 카테고리 | 수 |
|---------|----|
| 등재 | +1 (팔레트 3 안 비교 세트 · Kyu 결정용) |
| 미완 (Kyu 선택) | 1 (A/B/C 1 선택) |
| **총 순증감** | **0** (Kyu 선택 시 해소 +1 · 등재 1 소진 → -1) |

---

## 7. 다음 게이트

1. **Kyu 선택** → 선택 안 Draft PR 승격 (`gh pr ready <num>`) · 나머지 2 close.
2. 선택이 A 또는 C 면 → **Button.tsx solid variant** text 를 `text-ink` 로 1 라인 변경 (별건 커밋).
3. M3-1105-E (#33 ink-disabled) 머지 뒤 → 선택 palette branch 를 master rebase · `ink-disabled` 1 토큰 추가 (37/37 승격).
4. docs/design/tokens.md "4. 매핑 이력" 하단에 선택 안 섹션 추가.

---

*M3-1105-G · 2026-11-07 · 팔레트 3 안 · Draft PR #37 #39 #40 · 15 스샷 · WCAG AA 표 · Kyu 1 명 선택 대기 · 이연 0 (결정 시 -1)*
