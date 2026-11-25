PASS

## feature-map 체크 로그

```
Feature-map v2 · round=M0-0917-A · project=storeport
  L3 areas=8  L2 processes=83 (children=4)  L1 total=11
  leaf status: live=67 planned=22 deprecated=1
  scanned: 1341 files → matched=1341 unmatched=0 (0.0%)
```

`customer-display.cd-sync-flow` → `status: planned → live` 승격 완료.

## e2e-admin-loyalty main/PR 비교 로그

| | run ID | branch | 실패 수 |
|---|---|---|---|
| main (M1-1125-M 머지 직후) | 45605306871 | main | 24 |
| PR #444 | 45605358493 | feat/M1-1125-T | 24 |

**동일 실패 목록 (10개 발췌):**
```
1) admin-smoke.spec.ts:98:3   · Screen 1 POS Orders List · 테이블 8칸 · 검색창 · 행 존재
2) admin-smoke.spec.ts:132:3  · Screen 1 POS Orders List · 검색 디바운스
3) admin-smoke.spec.ts:212:3  · Screen 3 CD Admin · ThemeGrid 20종
4) admin-smoke.spec.ts:247:3  · Screen 3 CD Admin · 테마 선택 → CHANGED 배지
5) admin-smoke.spec.ts:348:3  · Screen 4 POS Settings · 탭 6개 · Receipt 활성
6) admin-smoke.spec.ts:400:3  · Screen 4 POS Settings · General 탭 · nickname 편집기
7) admin-smoke.spec.ts:426:3  · Screen 4 POS Settings · Receipt 탭 트리거
8) admin-smoke.spec.ts:444:3  · Screen 4 POS Settings · R1' 알약 탭
9) admin-smoke.spec.ts:487:3  · Screen 4 POS Settings · R1 폴더 탭
10) admin-smoke.spec.ts:500:3 · Screen 4 POS Settings · R2 닉네임 영숫자
```
(이하 14건 동일 — PR 이 원인 아님, 사전 버그. PR #444 본문에 증거 첨부 완료.)

## #444 · #446 head SHA

- **#444** `feat/M1-1125-T` → `3d974eee3fc4eeeb2818d45c1bf592d595a7f161`
- **#446** `feat/M1-1125-U` → `23218350fdad649e8cefe799167678907140c079`

## 작업 요약

1. **#445 main 머지 후 rebase**: `feat/M1-1125-T` → `origin/main` rebase 완료 (dc64eba M1-1125-L skip)
2. **feature-map 등록 (planned → live)**: `customer-display.cd-sync-flow` status `planned → live` 변경, unmatched=0 확인, push
3. **e2e-admin-loyalty 사전 버그 확인**: main CI run 45605306871 에서도 24건 동일 실패 → PR #444 본문에 비교표 첨부
4. **#446 rebase + source 타입 수정**: `feat/M1-1125-U` → `origin/feat/M1-1125-T` rebase 후, `CustomerFlow.source: "cd" | "pos" → "cd" | "pos" | null` (계약서 v1.1), push
