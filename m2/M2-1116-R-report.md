#308 naming-check 예외 name 줄 한정 · 구멍 테스트 FAIL 확인

## 변경 내용

`scripts/naming-check.sh` 1줄:

```bash
# Before
| grep -v -E '/apps/customer-display/app\.config\.ts:' \

# After
| grep -v -E '/apps/customer-display/app\.config\.ts:[0-9]+:[[:space:]]*name:' \
```

## 검증 결과

| 케이스 | 결과 |
|--------|------|
| 현재 저장소 그대로 | ✅ PASS |
| `app.config.ts` `name:` 줄 (line 17) — `"MEROS HP Point"` | ✅ PASS (예외 적용) |
| `app.config.ts` 다른 줄 (slug 줄 주석)에 임시 "meros" 추가 | ✅ FAIL (구멍 차단 확인) |

grep은 `-n` 플래그로 `파일:줄번호:내용` 형식 출력 → `[0-9]+` 패턴으로 줄번호 필터 적용.

## 커밋

`315d05f` — feat/m2-1116-p pushed
