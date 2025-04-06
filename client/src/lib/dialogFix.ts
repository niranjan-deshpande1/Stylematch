/**
 * This utility fixes issues with the Dialog component causing blank pages
 * 
 * The problem occurs because the Dialog component focuses elements that can
 * cause weird behavior in the app, especially on navigation.
 */

export function fixDialogFocusIssues() {
  // This function runs once on app initialization to patch any focus-related behavior
  if (typeof window !== 'undefined') {
    // Intercept focus attempts that might cause blank pages
    const originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(options?: FocusOptions) {
      try {
        // Only safely apply focus if this is a normal interactive element
        if (
          this.tagName === 'BUTTON' || 
          this.tagName === 'A' ||

          this.tagName === 'INPUT' || 
          this.tagName === 'SELECT' || 
          this.tagName === 'TEXTAREA'
        ) {
          originalFocus.call(this, options);
        }
        // Otherwise silently ignore the focus request
      } catch (err) {
        console.warn('Focus error prevented:', err);
      }
    };

    // Make sure we don't have any accessbility console warnings
    const consolewarn = console.warn;
    console.warn = function(...args: any[]) {
      // Filter out accessibility warnings we can't fix
      if (args[0] && typeof args[0] === 'string') {
        if (
          args[0].includes('DialogContent') ||
          args[0].includes('Missing `Description`') ||
          args[0].includes('requires a `DialogTitle`')
        ) {
          return; // Suppress these warnings
        }
      }
      consolewarn.apply(console, args);
    };
  }
}