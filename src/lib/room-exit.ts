const noticeKey = 'el-zhady:room-exit';
export function readRoomNotice() { try { return sessionStorage.getItem(noticeKey) || ''; } catch { return ''; } }
export function clearRoomNotice() { try { sessionStorage.removeItem(noticeKey); } catch { /* cosmetic notice only */ } }
export function reportRoomExit(code: string) {
  const message = code === 'ROOM_NOT_FOUND' ? 'Бөлме табылмады.' : 'Жүргізуші бөлмені жапты';
  try { sessionStorage.setItem(noticeKey, message); } catch { /* still show in this tab */ }
  window.dispatchEvent(new CustomEvent('el-zhady:room-exit', { detail: message }));
}
