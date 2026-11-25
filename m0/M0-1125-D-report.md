RESOLVED

## M0-1125-D 원장 대사 결과

실행일시: 2026-11-25

---

## PR #424 — feat/M2-1125-C-cd-store-image-islamic

### 현재 head 코드 확인 (M2-1125-E · fb167b7)

| 항목 | 요청값 | head 실값 | 일치 |
|------|--------|-----------|------|
| ramadan.start | 2026-02-19 | 2026-02-19 | ✅ |
| ramadan.end | 2026-03-20 | 2026-03-20 | ✅ |
| lebaran.start | 2026-03-21 | 2026-03-21 | ✅ |
| lebaran.end | 2026-03-30 | 2026-03-30 | ✅ |
| 주석 2026/27-28 구분 | 명시 필요 | isbat 확정값 vs 계산값 구분 완료 | ✅ |

### 스레드 처리

| 스레드 ID | 내용 | isOutdated | 처리 |
|-----------|------|-----------|------|
| PRRT_kwDOTe-UYs67sLXa | [CHANGES] 2026 Kemenag 날짜 수정 요청 | true | reply + resolved ✅ |
| PRRT_kwDOTe-UYs67sLkD | 테스트 기대값 동반 갱신 요청 | true | reply + resolved ✅ |

두 스레드 모두 M2-1125-E 커밋에서 수정 반영됐고 isOutdated=true 상태 → 해소 처리.

### CI 상태 (#424)

| 잡 | 상태 |
|----|------|
| changes-filter | ✅ pass (15s) |
| check | ✅ pass (26s) |
| markers-and-forbidden | ✅ pass (21s) |
| route | ✅ pass (16s) |
| heavy-cloud | ⏭ skipping |
| heavy-mac | ⏳ pending |

`heavy-mac` 1건 아직 pending. 나머지 모두 초록. 머지 차단 요인: 미해결 스레드 → 금번 resolve 완료. `heavy-mac` 완료 후 머지 가능.

---

## PR #425 — fix/M0-1125-B-cd-balance

### 스레드 처리

| 스레드 ID | 내용 | isOutdated | 처리 |
|-----------|------|-----------|------|
| PRRT_kwDOTe-UYs67seVR | 이중 적립 불가 · 소멸 엣지케이스 관찰 | false | reply + resolved ✅ |
| PRRT_kwDOTe-UYs67seh5 | Idempotent self-heal 관찰 | false | reply + resolved ✅ |

두 스레드 모두 코멘트성 관찰 (변경 요청 없음) → 분석 확인 reply 후 해소 처리.

---

## 최종 상태

| PR | 미해결 스레드 | resolve 처리 |
|----|-------------|-------------|
| #424 | 2 → 0 | ✅ |
| #425 | 2 → 0 | ✅ |

"A conversation must be resolved" 머지 차단 요인 해소 완료.
#424는 `heavy-mac` CI 완료 대기 후 머지 가능. #425는 CI 미확인 (task 범위 외).
