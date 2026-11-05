// Coalesce transaction bursts into one refresh and avoid refreshing hidden tabs.
export function createRealtimeRefresh(refresh: () => void, delay = 500) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;
  const flush = () => {
    timer = undefined;
    if (document.hidden) return;
    if (pending) { pending = false; refresh(); }
  };
  const visibility = () => { if (!document.hidden && pending && !timer) flush(); };
  document.addEventListener('visibilitychange', visibility);
  return {
    schedule() {
      pending = true;
      if (!timer) timer = setTimeout(flush, delay);
    },
    dispose() {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
