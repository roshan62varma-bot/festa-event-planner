import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** How long the "copied" tick stays visible. */
export const COPIED_FEEDBACK_MS = 2000;

/**
 * Copies text to the clipboard and confirms with a tick and an updated label.
 * @param {{ text: string, label: string }} props `label` names what is copied, for screen readers.
 */
export function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const id = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(id);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard access can be denied (insecure context, permissions); the text stays selectable.
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      className="icon-button"
      onClick={copy}
      aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
    >
      {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
    </button>
  );
}
