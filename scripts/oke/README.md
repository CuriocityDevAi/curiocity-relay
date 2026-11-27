# oke — 오케 규칙 검사기 (MP-014)

오케(오케스트레이터)가 큐 발부·머지·리포트 수거 단계에서 사용하는 규칙 린터.

## 사용법

① **발부 전** — 큐 프롬프트가 필수 항목을 갖추고 있는지:
```
node scripts/oke/check-queue-prompt.mjs queue/m2/M2-1127-X.md
```

② **머지 전** — CI 완료·R0 승인 여부 확인(결과를 R0 리포트에 첨부):
```
node scripts/oke/merge-gate.mjs --repo CuriocityDevAi/storeport --pr 123
node scripts/oke/merge-gate.mjs --repo CuriocityDevAi/storeport --pr 123 --json
```

③ **리포트 수거 시** — 판정·증거·혼재 경고 검사:
```
node scripts/oke/check-report.mjs r0/R0-1127-F-report.md
```

종료 코드 0 = PASS, 1 = FAIL. 실패 시 무엇이 없고 어떻게 고치는지 한 줄씩 출력.
