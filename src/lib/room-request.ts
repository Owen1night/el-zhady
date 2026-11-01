export type RoomRequest = { id: string; title: string; roomId?: string };
const key = (userId: string) => `el-zhady:room-request:${userId}`;
export function readRoomRequest(storage: Pick<Storage, 'getItem'>, userId: string): RoomRequest | null {
  const raw = storage.getItem(key(userId));
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (typeof value.id !== 'string' || typeof value.title !== 'string') throw new Error('Invalid pending room request');
  return value;
}
export function writeRoomRequest(storage: Pick<Storage, 'setItem'>, userId: string, request: RoomRequest) { storage.setItem(key(userId), JSON.stringify(request)); }
export function clearRoomRequest(storage: Pick<Storage, 'removeItem'>, userId: string) { storage.removeItem(key(userId)); }
