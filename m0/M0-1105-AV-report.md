# M0-1105-AV 리포트 — #100 rebase + #102 rebase

작성일: 2026-11-12  
대상: #100 (feat/m0-1105-as-order-qr-scan) · #102 (feat/m0-1105-at-receipt-qr)  
fork master: b37d128

---

## 작업 결과

### REQ 1: #100 → origin/master(b37d128) rebase ✅

| 항목 | 결과 |
|------|------|
| rebase 성공 | ✅ 자동 병합 (충돌 없음) |
| package.json `qrcode: "^1.5.4"` | ✅ |
| package.json `@types/qrcode: "^1.5.6"` | ✅ |
| package.json `prettier-plugin-tailwindcss: "^0.6.14"` | ✅ |
| package-lock.json `qrcode 1.5.4` | ✅ |
| package-lock.json `prettier-plugin-tailwindcss 0.6.14` | ✅ |
| npm install → lock 재생성 | ✅ (변경분 last commit에 amend) |
| push --force-with-lease | ✅ 72406e8 → a5bef73 |

**#100 최종 HEAD**: a5bef73  
**Base**: b37d128 (origin/master)

### REQ 2: #102 → 새 #100 위로 rebase ✅

| 항목 | 결과 |
|------|------|
| `git rebase --onto feat/m0-1105-as-order-qr-scan 72406e8` | ✅ 충돌 없음 |
| #102 commit on top of #100 | ✅ 3c462dd |
| assertion 하니스 fix (AV 추가 작업) — 46/46 PASS | ✅ 23b408f |
| push --force-with-lease | ✅ 8b48650 → 23b408f |

**#102 최종 HEAD**: 23b408f  
**Base**: a5bef73 (새 #100 HEAD)

---

## 충돌 파일 · 해소

| 파일 | 충돌 여부 | 해소 |
|------|----------|------|
| package.json | 없음 (git 자동 병합) | qrcode + prettier-plugin 0.6 모두 보존 |
| package-lock.json | npm install 후 차이 발생 | npm install 재실행 → amend |

---

## 추가 작업 (AV 범위 외 — #102 사전 버그)

#102 rebase 후 assertion 3개가 `MODULE_NOT_FOUND` 로 실패:  
`m1-1105-av` · `m2-1105-p` · `m3-1105-af` — receipt-escpos.ts 가 lib/qr.ts 를  
import 하는데 하니스가 lib/qr.ts 를 tsc 컴파일 미포함 + tmpDir 를 /tmp 하위로  
사용해 qrcode node_modules resolve 불가.

**수정 내용 (3파일, 각 2줄)**:
- `QR_TS = join(REPO_ROOT, 'lib/qr.ts')` 추가
- `tmpDir = join(REPO_ROOT, '.tsc-tmp-{name}')` 로 변경
- m2-1105-p (8b): QR raster(GS v 0)가 텍스트 모드에서도 존재하는 새 동작으로 갱신

---

## 검증 로그

### run-all.mjs assertions

```
총 46 개 · 46 PASS · 0 FAIL · 27.9s
```

### npx prettier --check (변경 파일)

```
All matched files use Prettier code style!
```

검사 파일: lib/qr.ts · lib/printer/receipt-escpos.ts · app/(tabs)/scan.tsx ·  
components/receipt/ReceiptCard.tsx · scripts/m1-1105-av-assertions.mjs ·  
scripts/m2-1105-p-logo-bitmap-assertions.mjs · scripts/m3-1105-af-assertions.mjs

### expo export -p web

```
Exported: dist
```

주요 번들 포함: scan-03f9e8294c021c26dca5fa621bc61148.js (30KB) ✅

---

## Mergeable

| PR | base | HEAD | 상태 |
|----|------|------|------|
| #100 | b37d128 (origin/master) | a5bef73 | ✅ mergeable |
| #102 | a5bef73 (#100 HEAD) | 23b408f | ✅ mergeable |

---

## 이연 순증감

| 항목 | 증감 |
|------|------|
| 신규 이연 | 없음 |
| assertion 하니스 버그 (lib/qr tmpDir) | 해소 |
