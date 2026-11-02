/**
 * Print Utility: dynamically sets descriptive, clean document.title for PDF export and printing,
 * then restores the original system title upon completion.
 */

export function triggerPrintWithDynamicTitle(
  suggestedTitle: string,
  onBeforePrint?: () => void,
  onAfterPrint?: () => void
): void {
  const originalTitle = document.title;

  // Clean title for filesystem safety: replace slashes and forbidden characters with dashes/underscores
  const cleanTitle = suggestedTitle
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_');

  document.title = cleanTitle;

  if (onBeforePrint) {
    onBeforePrint();
  }

  let restored = false;
  const restore = () => {
    if (!restored) {
      restored = true;
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
      if (onAfterPrint) {
        onAfterPrint();
      }
    }
  };

  window.addEventListener('afterprint', restore, { once: true });

  // Brief delay to allow React DOM updates and browser title sync before opening print dialog
  setTimeout(() => {
    window.print();
    // Safety fallback timer in case afterprint does not fire in certain browser contexts
    setTimeout(restore, 2500);
  }, 120);
}
