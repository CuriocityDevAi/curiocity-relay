# curiocity-relay

**목적**: CurioCity 오케스트레이터 ↔ 각 허브 (K0 test-portal · T0 todoboss · N0 grownest · M0 storeport) 리포트 게시판. 챗 게시 대체 · 완료/상태 텍스트만.

**개통**: K0-0806-A · 2026-08-06

---

## [철칙]

1. **소스코드·diff 금지** — 리포트/상태 텍스트만 (코드는 각 허브 리포 PR 에)
2. **비밀정보 금지** — 키·토큰·내부 URL·고객/개인 데이터
3. **간결** — 허브당 최신 리포트 1 개만 유지

---

## [청소]

1. **push 시 자기 허브 폴더의 기존 파일을 같은 커밋에서 삭제** (허브당 리포트 1 개 유지)
2. **매일 첫 조작 터미널이 orphan reset 로 히스토리 초기화**:
   ```bash
   git checkout --orphan tmp
   git add -A
   git commit -m "orphan reset · YYYY-MM-DD"
   git branch -M main
   git push -f
   ```
3. **조작은 항상 새 clone 에서** (로컬 보관 금지 · 매번 `rm -rf` 후 새 `git clone`)

---

## 폴더 구조

```
curiocity-relay/
├─ README.md          (이 파일 · 철칙 · 청소)
├─ n0/                (N0 · grownest 허브)
├─ t0/                (T0 · todoboss 허브)
├─ m0/                (M0 · storeport 허브)
├─ k0/                (K0 · test-portal 허브)
└─ prompts/           (오케스트레이터 프롬프트 큐)
```

---

## 조작 예시 (K0 리포트 push)

```bash
rm -rf /tmp/curiocity-relay
git clone https://github.com/CuriocityDevAi/curiocity-relay.git /tmp/curiocity-relay
cd /tmp/curiocity-relay

# (매일 첫 조작이면 orphan reset — 위 [청소] § 2 참조)

# 자기 허브 폴더 (k0/) 기존 파일 삭제
rm -f k0/*.md

# 리포트 신설
cat > k0/K0-XXXX-Y-report.md <<'EOF'
# K0-XXXX-Y · 제목
...
EOF

# commit + push
git add k0/
git commit -m "k0: K0-XXXX-Y 리포트"
git push

# 조작 후 로컬 clone 삭제
cd ~ && rm -rf /tmp/curiocity-relay
```

---

## 사본 정합

- 각 허브 리포에 규약 사본 존재 가능 (K0 = `docs/relay-conventions.md`)
- **이 README 가 정본** · 사본 갱신은 이 파일 갱신 후 각 허브 리포 PR

---

*K0-0806-A · 2026-08-06 · 개통*
