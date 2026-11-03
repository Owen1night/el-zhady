/** Opaque identity tag, never a join ordinal or an earned place. Full UUID avoids
 * collisions from truncation. Only its compact hexadecimal groups are displayed.
 * Names are never used to link identities or infer rank. */
export function playerTag(id: string): string {
  return `ID ${id.replaceAll('-', '').toUpperCase()}`;
}
export function earnedPlace(rank: number | null | undefined): string {
  return rank && Number.isInteger(rank) && rank > 0 ? `${rank}-орын` : 'Орын жарияланбаған';
}
