PASS

## M3-1125-E — PR #257 충돌 해소 보고서

### 충돌 파일
- `app/checkout/tender-qris/[draftOrderId].tsx` (1건)

### 충돌 원인
M3-1125-D(이 PR)와 #255 M3-1125-C(master) 양쪽이 `Stack.Screen` headerRight 주석 같은 줄을 동시에 수정.

### 해소 방식
주석만 충돌 — M3-1125-C 설명과 M3-1125-D 설명을 한 블록에 병합(양쪽 보존).  
기능 코드(배너 `qris-scan-here-banner` · 수동 토글 `qris-show-here-toggle` · CD 판정 로직)는 M3-1125-D 그대로 유지.  
master 의 #255-C/G 변경(test 갱신 등)은 auto-merge 로 함께 반영.

### 머지 커밋
`66531ad` merge(qris): M3-1125-E — origin/master 충돌 해소 (tender-qris 주석 양쪽 보존)

### 테스트 로그
```
scripts/m3-1125-d-qris-qr-on-pos-playwright.mjs
  27 passed · 0 failed
  (A 정상 · B busy · C offline · D 수동 토글 · SRC1-4 소스 어설션)

scripts/run-all.mjs
  총 80 개 · 80 PASS · 0 FAIL · wall 302.9s
```

### CI 상태 (push 후)
| job | 결과 |
|---|---|
| assertions | pass (1m12s) |
| flow-tests | pass (56s) |
| lint | pass (1m5s) |
| playwright | pass (5m35s) |
| route | pass (×2) |
| heavy-cloud | skipping |

**전체 green.**

### PR
https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/257
