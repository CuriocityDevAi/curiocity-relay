M3-1120-C-report
2026-11-20 · agent: CuriocityDevAi (M3)

#215 수정 7/7 · lint 0 · assertions 신규 0 · vitest 891/891 (신규 실패 0) · playwright 4/4

---

## 적용 커밋

860d823 · feat/M3-1120-B-cd-preview-r1

---

## 수정 7건

### 필수 5건 (R0-1120-E)

1. `app/(tabs)/_layout.tsx:26` — prettier: CdStatusBadge 멀티라인 JSX → 인라인
2. `app/(tabs)/settings.tsx:52` — prettier: `{labels[opt]}` 인라인
   - 추가: settings.tsx badge 레이블 한국어 → 영어 (`'작게'→'Small'`, `'중간'→'Medium'`, `'크게'→'Large'`)
   - 사유: m3-1105-c-english-assertions 가 `app/**` 코드 문자열 한글 0건 체크 → 필수 수정 범위
3. `components/cd-preview/CdPreviewWindow.tsx` — raw hex 5건 → 시맨틱 토큰
   - `#000` → `TOKEN_INK` · `#E3E3E3` → `TOKEN_LINE` · `#6F6F6F` → `TOKEN_INK_MUTED`
   - `#F2F2F0` → `TOKEN_SURFACE_MUTED` · `#B5B5B5` → `TOKEN_INK_SUBTLE`
4. `CdStatusBadge.tsx:19-21` — 영어화: `Offline` · `Entering` · `Connected`
5. `CdPreviewWindow.tsx:118` — placeholder 영어: `'Customer display mirror\n(next round)'`

### Non-blocking 2건 (R2 착수 전)

6. PanResponder posRef drift — `dragging` ref 추가 · useEffect `if (!dragging.current)` 로 드래그 중 비동기 prop 덮어쓰기 차단 · `onPanResponderGrant`에서 `dragging.current = true` 설정
7. 회전 후 드래그 경계 — `dimsRef` 추가 · PanResponder 콜백이 `dimsRef.current`에서 최신 `screenW/H/winW/H` 읽음 · `useEffect([screenW, screenH, winW, winH])`에서 `posRef.current` clamp 재계산

---

## 검증 결과

| 항목 | 결과 |
|------|------|
| `npm run lint` | 0 error (63 warnings — 기존 동일) |
| `m3-1105-a-color-assertions` | 37/37 ✓ |
| `m3-1105-c-english-assertions` | 10/10 ✓ |
| `npx vitest run` | 신규 실패 0 (pre-existing 2건 그대로: `m1-1117-e-slip-flow` + `docs/plans`) |
| `playwright cd-preview` (로컬 4개) | 4/4 ✓ |

---

## Playwright 스샷

- `e2e/screenshots/cd-preview-01-badge-1024w.png` — 1024w 배지 버튼
- `e2e/screenshots/cd-preview-02-window-open.png` — 창 열림
- `e2e/screenshots/cd-preview-03-window-closed.png` — 창 닫힘
- `e2e/screenshots/cd-preview-04-badge-600w.png` — 600w 배지 버튼

드래그 후/회전 후 스샷: 로컬 기기 미보유로 미검증 (로컬 Playwright = 헤드리스 Chromium 환경)

---

## 추가 파일

- `components/cd-preview/__tests__/CdPreviewWindow.test.ts` (신규) — 회전 clamp 단위 테스트 6개
- `components/cd-preview/__tests__/CdStatusBadge.test.ts` — 영어 레이블 반영
- `components/cd-preview/__tests__/useCdPreviewStore.test.ts` — prettier 수정

---

## PR 코멘트

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/215#issuecomment-7035999720

---

## 미검증 항목

- 실기 기기 드래그 drift 체감 (Fix 6) — 순수 로직 검증만
- 실기 기기 회전 후 드래그 경계 (Fix 7) — clamp 단위 테스트로 대체 검증
- Playwright CI: fork 실행기 미등록으로 queued 가능
