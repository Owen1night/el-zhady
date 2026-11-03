import { playerTag } from '../lib/player-label';
/** A compact, stable identity hint is visibly labelled ID, never #1. */
export function PlayerName({ name, id }: { name: string; id: string }) {
  return <span className="player-name">{name}<small className="identity-tag" title={playerTag(id)} aria-label={playerTag(id)}>ID · {id.replaceAll('-', '').toUpperCase()}</small></span>;
}
