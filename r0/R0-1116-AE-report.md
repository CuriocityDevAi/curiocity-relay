#317 APPROVE · fork #159 APPROVE

## storeport #317 (fix/m3-1116-s · 0088390) — APPROVE

- diff 범위: Migration20261116000001.ts 단 1파일 (1 insertion, 17 deletions). 마이그레이션 파일 외 변경 없음 ✅
- up() DROP COLUMN 완전 제거: step 3 (drop index + drop column device_token_hash) 삭제됨 ✅
- down() 테이블 drop만: add column 복원 구문도 제거, 인덱스 drop + customer_display_device 테이블 drop만 ✅
- 멱등성: IF NOT EXISTS / ON CONFLICT DO UPDATE / IF EXISTS 모두 사용 중 ✅
- 모델 호환성: register-session.ts에 device_token_hash 필드 없음, MikroORM extra column 오류 없음 ✅
- tsc --noEmit: 오류 없음 ✅
- jest register_session: 32 tests PASS ✅
- GitHub: 셀프-approve 차단으로 --comment 이벤트로 LGTM 제출 완료

## fork #159 (M2-1116-W) — APPROVE

- 키패드 기본 숨김: useState(false) + 조건부 렌더 정확히 구현 ✅
- 빠른 버튼 3종: exact(항상) / nextRound(50k 올림, total 초과 시) / show100k(dedup 포함) 경계값 모두 올바름 ✅
- 다른 금액 토글: 열 때 input='', received=0 초기화, 버튼 탭/total 변경 시 자동 닫힘 ✅
- 거스름돈 경계: exact(0), 큰 지폐(>0), 0원(insufficient=true→disabled), allowPartial 모두 정상 ✅
- NumericKeypad (#155) 재사용: bottomLeftKey="00" 포함 그대로 재사용 ✅
- 타 화면 영향 없음: CardTenderPanel 등 기존 cashQuickButtons() export 유지 ✅
- 테스트: cash-tender-panel 17/17 + cash-quick-buttons 6/6 / 전체 376 ALL GREEN ✅
- 미소 관찰(블로커 아님): 버튼 레이블 한국어(딱 맞게/다른 금액) — 의도적이면 무방
- GitHub: 셀프-approve 차단으로 --comment 이벤트로 LGTM 제출 완료 (PRR_kwDOTtbGC88AAAABYPu8EQ)
