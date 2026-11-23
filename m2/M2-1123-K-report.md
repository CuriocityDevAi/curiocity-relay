판정: PASS — empty commit push 로 CI 재실행 성공. check run 6건 생성 확인.

새 HEAD: 6aba763 (ci: M2-1123-K 재실행 트리거)
이전 HEAD: a211819

생성된 체크 목록:
- lint        → fail    (1m20s)
- assertions  → pending
- heavy-cloud → skipping
- flow-tests  → pending
- route       → pass    (9s)
- route       → pass    (5s)

비고: close→reopen 불필요. lint fail 은 기존 코드 문제로 CI 재실행 범위 외.
