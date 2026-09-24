import { Calendar, ChevronDown } from 'lucide-react';

const pillClassName =
  'inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 text-[12px] font-medium text-gray-600';

const interactivePillClassName =
  `${pillClassName} transition hover:border-[#7c3aed] hover:text-[#7c3aed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/40`;

/**
 * Small pill shown next to the "Revenue Summary" title with the dates behind the
 * active period. Only an applied Custom range is interactive: clicking it reopens
 * the custom range modal.
 */
export function RangeLabelPill({ label, interactive, onClick }: { label: string; interactive?: boolean; onClick?: () => void }) {
  const content = (
    <>
      <Calendar className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
      <span className="truncate">{label}</span>
      {interactive && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />}
    </>
  );

  if (!interactive) {
    return <span className={pillClassName}>{content}</span>;
  }

  return (
    <button type="button" onClick={onClick} className={interactivePillClassName}>
      {content}
    </button>
  );
}
