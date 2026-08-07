export function register() {
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    try {
      delete (globalThis as any).localStorage;
    } catch (e) {
      // Ignore if deletion fails
    }
  }
}
