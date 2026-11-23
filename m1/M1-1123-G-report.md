완료 — PR #231 생성 · CI 2 jobs 시작 · #230 close

## 새 PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/231

- 브랜치: `fix/M1-1123-G-mirror-url` (origin/master HEAD 기준)
- cherry-pick: `0dde0d0` 1건만
- diff: `components/cd-preview/CdPreviewWindow.tsx` + `e2e/flows/M1-1123-F-mirror.spec.ts` (2파일)

## mergeable 상태

새 브랜치는 origin/master 위에 직접 cherry-pick → 충돌 없음 (clean).

## CI 시작 여부

PR 생성 직후 2 jobs pending 확인:
- route job #1: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45167654889/job/137668680191
- route job #2: https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/actions/runs/45167654931/job/137668680694

## #230 조치

코멘트 첨부 후 close — "#231로 대체. squash-merge된 커밋 중복 포함으로 인한 충돌(dirty) 해소."

## e2e spec 재실행 로그

운영 mirror 주소: `https://admin.meros.id/customer-display-web/mirror?mock=1`

```
Running 2 tests using 1 worker

[1/2] [chromium] › e2e/flows/M1-1123-F-mirror.spec.ts:28:3 › M1-1123-F · mirror URL "Route Page" 버그 검증 › /mirror — Route Page 없이 카트 항목 텍스트 렌더
[2/2] [chromium] › e2e/flows/M1-1123-F-mirror.spec.ts:59:3 › M1-1123-F · mirror URL "Route Page" 버그 검증 › /mirror.html — 열었을 때 Route Page 표시 여부 기록 (회귀 방지)
  2 passed (5.4s)
```
