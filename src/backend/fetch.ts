/** AbortController works on mobile Safari versions without AbortSignal.any. */
export async function fetchWithDeadline(input: RequestInfo | URL, init?: RequestInit, ms = 12000, fetcher: typeof fetch = fetch): Promise<Response> {
  const controller = new AbortController();
  const external = init?.signal;
  const cancel = () => controller.abort();
  if (external?.aborted) cancel();
  else external?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, ms);
  try { return await fetcher(input, { ...init, signal: controller.signal }); }
  finally { clearTimeout(timer); external?.removeEventListener('abort', cancel); }
}
