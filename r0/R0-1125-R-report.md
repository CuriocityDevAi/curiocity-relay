#431 CHANGES

## 검증 표

| 항목 | 세부 | 결과 |
|------|------|------|
| **C1** rebase | 0 commits behind main | ✓ |
| **C1** docs/epics | main(#429) 내용 존재 | ✓ |
| **C1** docs/epics | 붉은 박스 규칙 §4-7 존재 | ✓ |
| **C1** mergeable | `mergeable: true`, `mergeable_state: blocked` (미해결 스레드 3건) | — |
| **C2** previewSnapshot | `needsOrderNumberHyphen` 올바르게 사용 | ✓ |
| **C2** 26B 코드 | 2026-11 → "26B" 정확 (오늘 2026-11-25 기준 OK) | ✓ |
| **C2** `formatOrderNumber` 여부 | `needsOrderNumberHyphen` + 고정 ISO 사용 — 샘플 고정이므로 OK | NOTE |
| **C3** 타이핑 → 오른쪽 반영 | `onDraftChange` + `nicknameDraft` lift-up 완료 | ✓ |
| **C3** 저장 후 왼쪽 갱신 | `NicknameEditor.onSave` → `onDraftChange(nick)` 만 호출, `locNickname` 미갱신 → savedValue stale | **✗** |
| **C4** store_address savedValue | `inLocationMode ? currAddressOverride : brandSettings.store_address` | ✓ |
| **feature-map** | `packages/receipt-view-model/**` → `admin-customization` 등록 | ✓ |
| **customer-display** | `receipt-view.ts` re-export shim + `workspace:*` dep | ✓ |
| **CI** markers-and-forbidden | SUCCESS | ✓ |
| **CI** feature-map-check | SUCCESS | ✓ |
| **CI** changes-filter / route | SUCCESS | ✓ |
| **CI** heavy-mac | SUCCESS | ✓ |

## CHANGES 사항

### C3 — 닉네임 저장 후 savedValue(왼쪽 패널) stale

**현상**: `NicknameEditor.onSave` 성공 후 `load()` 에서 `onDraftChange(nick)` 만 호출.  
→ `nicknameDraft` 갱신 ✓, `locNickname` 미갱신 ✗.

```tsx
// page.tsx · SettingImpactChips (store_nickname)
savedValue={locNickname}    // save 후에도 구 닉네임 그대로 (stale)
draftValue={nicknameDraft}  // save 후 새 값으로 갱신됨
```

사용자가 닉네임 저장 후 chip 모달을 열면 왼쪽(저장값)이 구 값 표시.

**수정 방법**:
```tsx
// NicknameEditor.tsx
type Props = {
  stockLocationId: string;
  onDraftChange?: (v: string) => void;
  onSaved?: (v: string) => void;   // ← 추가
};

// onSave 내부 — await load() 뒤
toast.success("Nickname saved");
await load();
onSaved?.(nick);  // ← 추가
```

```tsx
// page.tsx
<NicknameEditor
  stockLocationId={selectedLocationId}
  onDraftChange={setNicknameDraft}
  onSaved={setLocNickname}   // ← 추가
/>
```

## 비고

- **C2 NOTE**: `formatOrderNumber(nickname, new Date(ISO), 1001)` 직접 사용 시 규칙 변경 자동 반영 가능. 현재는 고정 샘플(2026-11-25 ISO)이므로 기능상 문제 없음.
- **mergeable_state: blocked** 는 3건의 미해결 스레드 때문. C3 fix 후 스레드 resolve + approve 시 CLEAN 예상.
- Playwright 테스트: 타이핑 → 오른쪽(draft) 검증 ✓, 저장 후 왼쪽(saved) 검증 없음.

## CI 로그 요약

| check | 결과 | 완료 시각 |
|-------|------|-----------|
| markers-and-forbidden | SUCCESS | 05:33:07 |
| feature-map-check | SUCCESS | 05:32:28 |
| changes-filter | SUCCESS | 05:33:45 |
| route | SUCCESS | 05:33:26 |
| heavy-mac | SUCCESS | 05:53:24 |
| heavy-cloud | SKIPPED | — |
