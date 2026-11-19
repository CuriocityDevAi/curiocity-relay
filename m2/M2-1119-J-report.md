PR #394 · heavy job 6→1 O · 소요 전 병렬~20m→후 sequential~60-70m(실측 대기) · required check 변경 필요 X(브랜치 보호 미설정) · 닫힌 PR 취소 O · 멈춤 감지 O(relay 기록 X: RELAY_PUSH_TOKEN+RELAY_REPO secret 미설정)

## 요약

- ci.yml: build-commerce-core · unit-commerce-core · pos-integration · customer-display · e2e-admin-loyalty · wrangler-check-care-agent → heavy 단일 job. checkout+install 1회. continue-on-error per step + Check step results 집계.
- cancel-on-close.yml: PR closed → queued/in_progress run 자동 취소.
- runner-watch.yml: 10분 schedule · heavy job 15분 초과 queued → stall 감지 · GITHUB_STEP_SUMMARY 기록.
- relay 기록 방법 필요: RELAY_PUSH_TOKEN + RELAY_REPO secret 미설정.
- ci-summary.yml: heavy 실패 시 실패 단계 소표 추가.

## 채택 결정

- continue-on-error: 채택. 여러 앱 동시 PR 에서 한 실패로 나머지 결과 손실 방지.
- relay push: RELAY_PUSH_TOKEN+RELAY_REPO secret 없음 → 로그+step summary만.
