PASS — CI 스킵 · 타임아웃 · 주석 번역 완료. 커밋 92ca3bf push → #231 playwright 체크 재시작.

## 커밋
`92ca3bf` fix(e2e): M1-1123-H — mirror spec CI 스킵 · 테스트 타임아웃 · 일본어 주석 한국어 번역
브랜치: `fix/M1-1123-G-mirror-url` → `CuriocityDevAi/agilo-medusa-pos-fork` push 완료.

## 변경 내역
- `e2e/flows/M1-1123-F-mirror.spec.ts`
  - `test.describe` 블록 최상단에 `test.skip(!!process.env.CI, '운영 URL 의존 — 로컬 수동 검증용')` 추가
  - 각 테스트 첫 줄에 `test.setTimeout(30_000)` 추가 (외부 URL 지연 시 잡 전체 블록 방지)
- `components/cd-preview/CdPreviewWindow.tsx`
  - `MIRROR_URL` 상수 위 4줄 일본어 주석 → 한국어 번역

## 로컬 실행 로그
```
# CI 없이 (로컬)
$ npx playwright test e2e/flows/M1-1123-F-mirror.spec.ts --reporter=list
  ✓  1 ... /mirror — Route Page 없이 카트 항목 텍스트 렌더 (3.7s)
  ✓  2 ... /mirror.html — 열었을 때 Route Page 표시 여부 기록 (회귀 방지) (3.6s)
  2 passed (9.2s)

# CI=1
$ CI=1 npx playwright test e2e/flows/M1-1123-F-mirror.spec.ts --reporter=list
  -  1 ... /mirror — Route Page 없이 카트 항목 텍스트 렌더
  -  2 ... /mirror.html — 열었을 때 Route Page 표시 여부 기록 (회귀 방지)
  2 skipped
```

## CI 재시작
push 후 #231 의 playwright CI 체크가 새로 트리거됨 (GitHub Actions 자동 재시작).
코드 동작(`MIRROR_URL = .../mirror`) 변경 없음.
