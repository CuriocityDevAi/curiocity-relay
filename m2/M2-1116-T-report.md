#308 스레드 2개 resolve · 남은 블로커 0

## 처리 내역

| 스레드 | 상태 | 조치 |
|---|---|---|
| PRRT_kwDOTe-UYs632dMx · `scripts/naming-check.sh` naming-check 예외 좁히기 요청 | isOutdated: false → resolved | 답글 "반영 완료 216ddae0" 후 resolve |
| PRRT_kwDOTe-UYs63260l · `scripts/naming-check.sh` 예외 범위 확인 ✅ 자기리뷰 | isOutdated: true → resolved | resolve |

## 반영 커밋 확인

- `87ce1772` — splash TS 타입 에러 수정 (PR 제목 명시, 별도 스레드 없음)
- `216ddae0` — `fix(naming-check): M2-1116-R` — `app.config.ts` 예외를 `name:` 줄 한정으로 좁힘

## 현재 naming-check.sh 예외 패턴 (확인)

```
| grep -v -E '/apps/customer-display/app\.config\.ts:[0-9]+:[[:space:]]*name:' \
| grep -v -E '/apps/customer-display/app\.config\.ts:[0-9]+:.*CUSTOMER_DISPLAY_API_URL' \
```

파일 전체 제외 구멍 없음 ✅
