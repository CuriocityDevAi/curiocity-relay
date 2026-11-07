허브-1107-W selftest (M1-1105-W-selftest · 러너 가시화 라이브 검증)
원장 대사: 방법론 ⑯ 자동 투입 · M1-1105-W 코드 반영 후 러너가 stream-json 을 사람 한 줄 로그로 즉시 flush 하고 cmux 탭에서 흐르는지 확인.
상시: 시작·완료 시 relay status/claims/M1-1105-W-selftest.json (러너 자동).

[절대 금지]
- `security` · macOS 키체인 · ~/Library/Keychains · Keychain Access · 자격증명 조회 금지. 필요하면 멈추고 claim blocked(blocked_by kyu) 한 줄.
- `~/Documents` · 허브 폴더(`~/projects/*` relay 제외) · `~/.hub-runner` 쓰기 금지.
- 금지: 제품 리포 · 네트워크 호출 · 시크릿 · 명령 블록 `#`.

[REQ]
relay 안 파일 2개만 읽고 두 줄 요약을 stdout 으로 내보낸 뒤 종료 (총 Read 2회 · stream 이벤트가 로그에 흘러야 함).
1. `~/projects/curiocity-relay/docs/hub-runner.md` 를 읽고 **첫 번째 "## " 섹션 제목과 1-줄 요지** 출력.
2. `~/projects/curiocity-relay/status/runner-config.json` 을 읽고 **claude_bin · model · display 세 값** 한 줄로 출력.
3. 끝에 `[selftest ok]` 한 줄 — 더 이상 도구 호출 없이 종료.

[REPORT]
이 selftest 는 보고서 없음. 완료 시 러너가 claim done 자동.
