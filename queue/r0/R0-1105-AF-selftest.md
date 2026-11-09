R0-1105-AF-selftest (M1-1105-Y · v3 러너 셀프테스트 · dry-run 전용 · claude 실제 호출 금지)

이 파일은 M1-1105-Y 의 v3 러너 셀프테스트용. `--dry-run` 전용이라 claude 호출 안 됨.
러너 v3 가 R0 허브에 대해 `model: sonnet` 로 헤더를 쓰고 claim 을 `done` 으로 마킹하는지 확인.

확인 포인트:
1. `~/.hub-runner/r0/R0-1105-AF-selftest.log` 헤더에 `model: sonnet`
2. `[dry-run] skipping claude spawn · item=R0-1105-AF-selftest model=sonnet`
3. `status/claims/R0-1105-AF-selftest.json` state=done

실제 코드 변경 없음. 완료 후 러너가 이 파일과 claim 을 유지 (M1-1105-X-selftest 선례처럼).
