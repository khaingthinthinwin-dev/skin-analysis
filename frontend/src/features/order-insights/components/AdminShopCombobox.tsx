'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Search, Store } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { useAdminMerchantOptions } from '../hooks/useAdminMerchantOptions';
import type { AdminMerchantOption } from '../types/adminOrderInsights.types';

interface AdminShopComboboxProps {
  /** Free text currently in the shop filter box. */
  value: string;
  /** Fired on every keystroke so the page can keep the URL in sync (already debounced upstream). */
  onValueChange: (value: string) => void;
  /** Fired when a suggestion is chosen — the page pins `merchantId` to that shop. */
  onSelect: (option: AdminMerchantOption) => void;
  placeholder: string;
  id?: string;
  className?: string;
}

/**
 * Admin shop / merchant filter.
 *
 * Typing keeps the existing free-text `shopSearch` filter (server-side substring
 * match, so a partial name still narrows the list). Choosing a suggestion pins
 * `merchantId`, which is the exact-match filter the design calls for — without
 * it a shop name that is a substring of another one returns both.
 *
 * Implemented as an ARIA combobox over the plain `Input` primitive so the
 * dropdown inherits the admin form styling; no new dependency is introduced.
 */
export function AdminShopCombobox({ value, onValueChange, onSelect, placeholder, id, className = '' }: AdminShopComboboxProps) {
  const { t } = useTranslation();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const blurTimeoutRef = useRef<number | undefined>(undefined);

  const optionsQuery = useAdminMerchantOptions(value);
  const options = optionsQuery.data ?? [];
  const showList = open && value.trim().length > 0;

  useEffect(() => () => window.clearTimeout(blurTimeoutRef.current), []);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const choose = (option: AdminMerchantOption) => {
    window.clearTimeout(blurTimeoutRef.current);
    setActiveIndex(0);
    setOpen(false);
    onSelect(option);
  };

  /** Every value change restarts the highlight, since the old one points at a stale list. */
  const handleValueChange = (next: string) => {
    setActiveIndex(0);
    setOpen(true);
    onValueChange(next);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setActiveIndex(0);
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!showList || options.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => {
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        return (index + delta + options.length) % options.length;
      });
      return;
    }
    if (event.key === 'Enter' && showList && options[activeIndex]) {
      event.preventDefault();
      choose(options[activeIndex]);
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0">
      <Store className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        id={inputId}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={showList && options[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        className={`pl-9 ${className}`}
        onChange={(event) => handleValueChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let a suggestion click land before the list is torn down.
          blurTimeoutRef.current = window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={handleKeyDown}
      />

      {showList && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t('admin.orders.filter.shop', 'Shop / Merchant')}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {optionsQuery.isFetching && (
            <li className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              {t('common.filters.searching', 'Searching...')}
            </li>
          )}

          {!optionsQuery.isFetching && options.length === 0 && (
            <li className="px-2 py-2 text-xs text-muted-foreground">
              {t('admin.orders.filter.noShops', 'No matching shops. Keep typing to filter by name.')}
            </li>
          )}

          {options.map((option, index) => (
            <li key={option.id} id={`${listboxId}-${index}`} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                tabIndex={-1}
                // Keep focus in the input while pressing an option: the blur
                // would arm the close timer below and, on a slower click
                // (remote desktop, careful press), unmount the list before
                // `click` fires — dropping the selection silently.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm ${
                  index === activeIndex ? 'bg-muted text-foreground' : 'text-muted-foreground'
                }`}
              >
                <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
                {/* Shop names are unique, so the merchant owner name is not shown. */}
                <span className="min-w-0 break-words font-medium text-foreground">{option.shopName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}