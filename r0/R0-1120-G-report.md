R0-1120-G-report
2026-11-20 · reviewer: CuriocityDevAi (R0)

#215 APPROVE · 7건 반영 7/7 · lint 0 error · vitest 신규 실패 0 · playwright 4/4

---

## 검증 커밋

860d823 · feat/M3-1120-B-cd-preview-r1

---

## 7건 반영 확인

### 필수 5건

1. `app/(tabs)/_layout.tsx:26` — prettier: CdStatusBadge 멀티라인 JSX → 인라인 ✓
2. `app/(tabs)/settings.tsx:52` — prettier: `{labels[opt]}` 인라인 + badge 레이블 `Small/Medium/Large` 영어화 ✓
3. `components/cd-preview/CdPreviewWindow.tsx` — raw hex 5건 → 시맨틱 토큰 ✓
   - `#000` → `TOKEN_INK` · `#E3E3E3` → `TOKEN_LINE` · `#6F6F6F` → `TOKEN_INK_MUTED`
   - `#F2F2F0` → `TOKEN_SURFACE_MUTED` · `#B5B5B5` → `TOKEN_INK_SUBTLE`
4. `components/cd-preview/CdStatusBadge.tsx:19-21` — 영어화: `Offline` · `Entering` · `Connected` ✓
5. `components/cd-preview/CdPreviewWindow.tsx:118` — placeholder 영어: `'Customer display mirror\n(next round)'` ✓

### Non-blocking 2건

6. PanResponder posRef drift — `dragging` ref 추가 + `if (!dragging.current)` useEffect 가드 ✓ (ref 단일 출처)
7. 회전 후 드래그 경계 — `dimsRef` 추가 + PanResponder 콜백이 `dimsRef.current` 에서 최신 screenW/H/winW/H 읽음 + 회전 시 `posRef.current` clamp 재계산 ✓

---

## 검증 결과

| 항목 | 결과 |
|------|------|
| `npm run lint` | 0 error (63 warnings — 기존 동일) |
| `npx vitest run` | 신규 실패 0 (pre-existing 2건 그대로: `m1-1117-e-slip-flow` + `docs/plans`) |
| `cd-preview` 단위 테스트 (3파일) | 23/23 ✓ |
| `playwright cd-preview` (로컬 4개) | 4/4 ✓ |
| master (a6a2c15) 충돌 | 없음 ✓ |

---

## 판정

**APPROVE** — 7건 전부 반영, 신규 실패 없음, 충돌 없음.
