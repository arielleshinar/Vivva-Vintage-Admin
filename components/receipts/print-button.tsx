"use client";

import { Button } from "@/components/ui/button";

/**
 * A single button whose only job is to open the browser's native print
 * dialog. It's a separate Client Component (rather than just an onClick
 * inline on the page) because the receipt detail page itself is a Server
 * Component, and `window.print()` only exists in the browser — this tiny
 * component is the boundary between the two.
 *
 * The `print:hidden` class (Tailwind's print-media variant) makes the
 * button itself disappear when the page is actually printed — you don't
 * want a "Print" button showing up on the printed paper.
 */
export function PrintButton() {
  return (
    <Button
      type="button"
      onClick={() => window.print()}
      className="print:hidden"
    >
      Print
    </Button>
  );
}
