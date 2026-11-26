#448 APPROVE · relay#39 APPROVE

## #448 storeport (M1-1125-AD) — APPROVE
자기 PR → COMMENT 제출

### R0-1125-AR CHANGES 해소
- `window.location.replace("/cd-sync" + window.location.search)` → `router.replace(Platform.OS === "web" ? "/cd-sync" + window.location.search : "/cd-sync")`
- baseUrl(`/customer-display-web`) 우회 버그 제거. `/pair` 동일 패턴 정리 완료.

### router.replace + 쿼리스트링 params 보존 (Playwright ③)
- `base-url-fix.spec.ts` 테스트 ③: `/?mock=1&flow=cd-sync&payment_phase=building&customer_flow=none` 진입 후 최종 URL에 `/customer-display-web/cd-sync` 포함 여부 + 루트 `/cd-sync` 직접 착지 아님 역검증.
- expo-router는 href string의 `?...` 파싱 → params 보존 확인.

### CI
- check / route / docker-build / changes-filter: ✅ SUCCESS
- markers-and-forbidden: ⚠️ CANCELLED (실패 아님, 금지 마커 패턴 없음)
- heavy-mac / heavy-cloud: SKIPPED (CD-only 변경, 필터 정상)

---

## relay #39 (M2-1125-AC) — APPROVE
자기 PR → COMMENT 제출

### svc.sh 위임 확인
- 수동 plist XML 작성 제거 → `(cd "$dir" && ./svc.sh install)` + `(cd "$dir" && ./svc.sh start)` 로 대체.
- runsvc.sh 복사·plist 생성·로그 디렉토리 모두 공식 svc.sh 에 위임.

### verify_runner_pid 추가
- `launchctl list | awk '$3==label'` 로 PID 추출. 숫자 PID → OK, 아니면 빨간 경고 + stderr.log 꼬리 10줄.
- setup.sh 에서 4개 러너 전수 검증.

### 아이맥 idempotent 안전성
- `_install_launchd` 첫 줄: `launchctl list "$label"` 성공이면 `_skip` → 가동 중인 4개 러너에 대해 `svc.sh install` 호출 없음. **재실행 안전.**
- 중지 상태 러너 재설치 시: 공식 `svc.sh install` 은 기존 plist 덮어쓰기 허용.
