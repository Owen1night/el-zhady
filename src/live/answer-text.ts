/** Admin review must distinguish a saved permutation from an unanswered task. */
export function answerText(options: readonly {id:string;text:string}[], value: string | null): string {
  if (!value) return 'Жауап жоқ';
  const names=value.split('>').map(id=>options.find(option=>option.id===id)?.text);
  return names.every(Boolean) ? names.join(' → ') : 'Жауап мәтіні қолжетімсіз';
}
