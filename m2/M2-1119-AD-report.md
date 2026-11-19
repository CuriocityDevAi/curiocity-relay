fork #207 assertions 47/47 · flow 177 pass+6xfail · lint 0 · checks #207 all pass · #208 all pass

## 작업 내용
- 파일: `scripts/m3-1105-aa-assertions.mjs` line 116
- 변경: `<View className="flex-row gap-2"` → inline style `flexDirection:'row', flexWrap:'wrap'` 검사식
- Prettier 줄 길이 초과 → `.test(\n    successSrc,\n  )` 포맷 수정

## 검증 로그

### assertions (node scripts/run-all.mjs assertions)
```
총 47 개 · 47 PASS · 0 FAIL · 40.8s
```

### flow-tests (npx vitest run tests/flows)
```
Test Files  11 passed (11)
Tests  177 passed | 6 expected fail (183)
```

### lint (npx eslint scripts/m3-1105-aa-assertions.mjs)
```
(no output = 0 errors)
```

### PR #207 CI checks
| job | 결과 | 시간 |
|-----|------|------|
| assertions | pass | 3m31s |
| flow-tests | pass | 1m8s |
| lint | pass | 1m22s |

### PR #208 CI checks
| job | 결과 | 시간 |
|-----|------|------|
| assertions | pass | 3m7s |
| flow-tests | pass | 1m22s |
| lint | pass | 1m47s |
| playwright | pass | 15m38s |

## 커밋
- #207: `3d0315b fix(assertions): M2-1119-AD #207 — success-actions-secondary 검사식 inline style 로 갱신`
- #208: merge commit `f569448` (origin/fix/M2-1119-S-pos-slip-nextcustomer 머지)
