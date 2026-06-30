export function useClipboard() {
  const copy = async (text: string, clearAfterMs = 30_000) => {
    await navigator.clipboard.writeText(text);
    setTimeout(() => navigator.clipboard.writeText("").catch(() => {}), clearAfterMs);
  };
  return { copy };
}
