import type { Source } from '../data/types';
/** Runtime gate for imported JSON as well as TypeScript-authored editorial data. */
export function validateContent(collections: Record<string, unknown[]>, sources: Source[]): string[] {
  const errors: string[] = [];
  const sourceMap = new Map(sources.map(source => [source.id, source]));
  if (sourceMap.size !== sources.length) errors.push('sources: duplicate ID');
  function visit(value: unknown, path: string) {
    if (Array.isArray(value)) { value.forEach((item, i) => visit(item, `${path}[${i}]`)); return; }
    if (!value || typeof value !== 'object') return;
    const entry = value as Record<string, unknown>;
    if ('status' in entry && ['draft', 'verified'].includes(String(entry.status))) {
      if (!Array.isArray(entry.sourceRefs)) errors.push(`${path}: sourceRefs must be an array`);
      if (entry.status === 'verified' && (!Array.isArray(entry.sourceRefs) || !entry.sourceRefs.length)) errors.push(`${path}: verified entry needs sources`);
      if (entry.status === 'verified' && (!entry.reviewedBy || !entry.reviewedOn)) errors.push(`${path}: missing review metadata`);
      if (entry.status === 'draft' && !entry.editorialNote) errors.push(`${path}: draft needs editorialNote`);
      if (Array.isArray(entry.sourceRefs)) for (const ref of entry.sourceRefs) {
        const source = sourceMap.get(ref?.sourceId);
        if (!source) errors.push(`${path}: unknown source ${ref?.sourceId}`);
        if (!ref?.locator?.trim()) errors.push(`${path}: reference needs a page, timestamp or archive locator`);
        if (entry.status === 'verified' && source?.status !== 'checked') errors.push(`${path}: verified reference must use a checked source`);
      }
    }
    for (const [key, child] of Object.entries(entry)) visit(child, `${path}.${key}`);
  }
  for (const [name, entries] of Object.entries(collections)) {
    const ids = entries.map(item => (item as { id?: string }).id);
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) errors.push(`${name}: missing or duplicate ID`);
    visit(entries, name);
  }
  return errors;
}
