import { useTranslation } from 'react-i18next';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { copyTextToClipboard } from '../utils/clipboard';

interface CopyButtonProps {
  /** The plain value to copy — never decorated with labels or extra text. */
  value: string;
  /** Accessible name, e.g. "Copy order number". */
  label: string;
  className?: string;
}

/**
 * Small icon button that copies `value` to the clipboard and confirms with a
 * brief toast. A real `<button>` so it is keyboard accessible; clipboard
 * failures surface an error toast instead of throwing.
 */
export function CopyButton({ value, label, className = '' }: CopyButtonProps) {
  const { t } = useTranslation();

  const handleCopy = async () => {
    const copied = await copyTextToClipboard(value);
    if (copied) toast.success(t('common.copied', 'Copied'));
    else toast.error(t('common.copyFailed', 'Could not copy to the clipboard.'));
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => void handleCopy()}
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 ${className}`}
    >
      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}