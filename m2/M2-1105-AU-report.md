# M2-1105-AU Report

## 사용법

```
cd ~/projects/agilo-fork-test && bash scripts/dev-refresh.sh
```

## 항목 표

| 파일 | 줄 | 커밋 |
|------|----|------|
| `scripts/dev-refresh.sh` | 1–51 (신규) | 09acb78 |
| `package.json` | `"refresh": "bash scripts/dev-refresh.sh"` 추가 | 09acb78 |
| `README.md` | Quickstart 아래 "Dev refresh" 섹션 추가 | 09acb78 |

## 자기 검증 로그

**Case 1 — package.json 변경 pull → npm install 실행**
```
--- git pull --ff-only ---
From /tmp/au-test/upstream  245e6f5..0defd75  master -> origin/master
최신 커밋: 0defd75
--- package.json / package-lock.json 변경 감지 → npm install ---
up to date, audited 1 package in 341ms
--- dry-run: Metro 시작 건너뜀 ---
```
→ PASS

**Case 2 — README만 변경 pull → npm install 건너뜀**
```
--- git pull --ff-only ---
Updating 0defd75..64646e3  README.md 1 file changed
최신 커밋: 64646e3
--- 패키지 변경 없음, npm install 건너뜀 ---
--- dry-run: Metro 시작 건너뜀 ---
```
→ PASS

**Case 3 — 더러운 작업 트리 → 멈춤**
```
ERROR: 저장되지 않은 변경이 있습니다. 먼저 커밋하거나 stash 하세요.
 M package.json
exit: 1
```
→ PASS

## PR

https://github.com/CuriocityDevAi/agilo-medusa-pos-fork/pull/104

## 이연 순증감

0

## 착지 명령

cp /tmp/M2-1105-AU-report.md ~/projects/curiocity-relay/m2/ && cd ~/projects/curiocity-relay && git add m2/M2-1105-AU-report.md && git commit -m "m2: M2-1105-AU" && git pull --rebase --autostash origin main && git push && node scripts/claim.mjs M2-1105-AU done "dev-refresh.sh 신규: pull·install·Metro 명령 하나로 (#104)"
