# ci-watch 웹 디자인 — Kyu 승인 (2026-11-28 10:13 WIB)

## Kyu 원문
- 09:36 "웹이기 때문에 제약도 있지만 더 유연한 장점도 있잖아 그것을 잘 활용해보고 싶어 … 디자인을 제안해줘"
- 09:48 "폰화면에서 클릭하면 세부 내역을 볼수 있게 … 데스크탑 화면은 일단 괜찮아"
- 10:04 "폰 전체 조망을 다시 바꿔서 현재 데스크톱 버젼을 그냥 정보를 줄여서 첫 화면에서 보여주었으면해. 보여주는 컴포넌트는 그대로 이면서 정보의 양만 줄여서 레이아웃이 깨지지 않을 정도로만. 그리고 클릭하면 더 자세한 내용을 보여주도록"
- 10:04 핀 artifact / Tailscale 웹 → "둘다"
- 10:13 "응 지금 디자인으로 승인할게"

## 승인된 시안
- 오케 캔버스 https://claude.ai/artifact/D3zcojjvd4UW82dYQAgBL6 (데스크톱 관제 화면 · 폰 축소판 → 눌러서 상세)
- 구현 명세 정본 = queue/m2/M2-1128-D.md [화면 명세] → 착지 뒤 specs/screens/ci-watch.md CW-WEB-*
- 같은 ui.js 로 Tailscale 웹 + 핀 artifact(relay `ci-watch-state` 브랜치 state.json 읽기 · GitHub 커넥터) 둘 다
