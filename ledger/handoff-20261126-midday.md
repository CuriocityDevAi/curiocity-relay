# Handoff 2026-11-26 낮 (13:40 WIB · 오케)

## 오늘 머지 (오전~13:00 WIB)
- storeport: #448 · #450 · #451 · **#452**(CD-1~5 + customer_flow.phone=phone_partial) · **#453**(통합 테스트 포트 = cksum(RUNNER_NAME))
- fork: #269 · **#270**(POS-1~6) · **#271**(로그인 로고 톱니 · favicon · 입력칸 1줄) · **#272**(대기 칩 경과시간 Nm/Nh Mm/Nd)
- relay: #39~#43 · **#44**(heartbeat launchd 거짓 bad) · **#45**(ci-watch v1.9) · **#46**(아이맥 netspeed curl 폴백) · **#47**(계약서 v1.3)

## Kyu 실기 상태
- Case 2 (결제 중 번호): 2-A ✅ · 2-B ✅ (11:49) · 2-C(QRIS) ⏸ Kyu "QR 고쳐진 다음" — **QR 문제 내용 미확인(Kyu 에게 물어둠)** → decision-cd-pos-sync-case2-20261126.md
- Case 1 재실기 (CD-1~5 · POS-1~6): **대기** — 안내 완료(0 POS 최신화 → 1 대기화면 … 9 Next customer)
- 로그인 화면(LG-1~3): Case 1 재실기 0단계에서 같이 확인 요청

## Kyu 대기 할 일
1. Case 1 재실기 0~9 + 로그인 화면
2. ci-watch 재기동: `cd ~/projects/curiocity-relay && git pull --ff-only && node ~/.hub-runner/bin/ci-watch.mjs`
3. 아이맥 pull: `ssh imac 'git -C ~/projects/curiocity-relay-heartbeat pull --ff-only'` (ssh 키·`imac` 별칭 11-26 설정 완료)
4. 답: 2-C QR 문제 내용 · 13일 묵은 대기 draft order(11-12 생성) 처리(버리기/자동 정리 규칙)

## 인프라
- 아이맥 CI 박스 health=ok (메모리 55% free · 러너 4 · 디스크 109GB) · netspeed 는 Kyu pull 후 채워짐
- 맥북 메모리 빠듯 → 아이맥 안정 확인되면 맥북 CI 러너 끄기 제안 예정
- ci-watch 러너 로그 줄 끼어듦은 v1.9 에서도 다음 렌더 때 지워지는 수준(완전 차단 아님)

## 다음 ID
M0-1126-F · M1-1126-M · M2-1126-F · M3-1126-G · R0-1126-R

## 감시
Kyu "감시 꺼" 전까지 계속 (Kyu 11-26 지시 · 30분 자동 꺼짐 무시)
