relay#74: CHANGES · 필수 1

직접 실행:
```
node scripts/hub-runner-v8.3.mjs --selftest-ci-health-recover  → PASS
node scripts/hub-runner-v8.3.mjs --selftest-auto-recover       → PASS
node scripts/hub-runner-v8.3.mjs --selftest-human-files        → PASS
node --test scripts/test/hub-runner-recovery.test.mjs          → 8/8 PASS
```

REQ1 (사람 파일 보호) ✅ — autoRecoverDivergence() humanFiles 분류 + selftest-human-files PASS 직접 확인. pushHeartbeatIfDue squash도 every() 체크로 보호.
REQ2 (all.json 갱신) ✅ — 메인 레포 쓰기 없음(status-wt 이전). readAllJson() 양쪽 읽고 최신 반환 → 모니터링 단절 없음.
REQ3 (self-update 루프) ✅ — 버전 bump만, lib/self-update.mjs 무변경. 업데이트 후 SHA 일치 → 루프 없음.

CHANGES 필수 1건: 파일 끝 `// TEST` 주석 제거 (hub-runner-v8.3.mjs 마지막 줄).

PR 코멘트: https://github.com/CuriocityDevAi/curiocity-relay/pull/74#issuecomment-7220617995
