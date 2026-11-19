storeport PR #403 (#401 대체 close O) · 커밋 섞임 0 O · IT 98/98 · quote.tenders=snapshot O · POST at O · tsc 0

## 브랜치
feat/M1-1119-U-quote-header (origin/main 기반 · 커밋 2개: cherry-pick 3e250ff + 수정 dc8fe8e)

## 작업 요약

### 1. IT #72 approval_code 픽스
- `"APPR-001"` → `"112233"` (6자리 숫자)
- fixture + expect 양쪽 수정

### 2. 공통 tender 빌더 (tender-utils.ts)
```ts
export function buildTenderEntry(t: any): Record<string, unknown>
```
- quote/route.ts + tenders/route.ts snapshot rebuild 양쪽 재사용
- qris 항목에 `qris_receipt_id` 추가 (R0C-1119-AG 지적 반영)
- card 항목: brand·rrn·tid·mid 를 quote 에도 포함 (snapshot 과 동일)

### 3. tenders POST 응답 at 추가 (R0C-1119-AG)
- 결제 중 슬립에서 Ref/시각 즉시 표시 가능

### 4. IT #73 신규
- `quote.tenders[0]` === `snapshot.tenders[0]` 키·값 완전 일치
- POST at 포함 단언 포함

## 검증 결과
- tsc: 0 오류
- IT: 98/98 pass (기존 96/97 → 98/98 · #72 픽스 +1 · #73 추가 +1)
- 커밋 섞임: 0 (#400 커밋 f05495d·dfad959·45fd216 없음)

## PR
https://github.com/CuriocityDevAi/storeport/pull/403

## #401 close
코멘트 후 close 완료
