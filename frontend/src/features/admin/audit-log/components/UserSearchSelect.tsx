import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, LoaderCircle, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/useDebounce';
import { useSearchUsers } from '../hooks/useAuditLogs';
import type { UserSearchResult } from '../services/auditLog.service';

interface UserSearchSelectProps {
  id?: string;
  /** Applied actor UUID, or undefined when the filter is inactive. */
  value?: string;
  /** Receives the resolved UUID, or undefined when the selection is cleared. */
  onChange: (userId: string | undefined) => void;
  label: string;
  placeholder: string;
  testId?: string;
  /** Bumped by the parent when Clear Filters must also reset this field's draft. */
  resetSignal?: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 画面項目設計書 AL-20: searches start once the actor term reaches 2 characters. */
const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;

const userLabel = (user: UserSearchResult): string =>
  user.name?.trim() || user.email;

/**
 * AL-20 (`txtUserFilter`): actor filter as a search/autocomplete input. The user
 * searches by name or email and the picked result is resolved to a UUID, because
 * the audit list API only accepts `userId=<UUID>`.
 */
export function UserSearchSelect({
  id,
  value,
  onChange,
  label,
  placeholder,
  testId,
  resetSignal,
}: UserSearchSelectProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState(value ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Actor UUID this field last applied, so typing free text clears the filter once.
  const appliedId = useRef<string | null>(value ?? null);
  // Last `value` prop seen, so an external change (Clear Filters, drill-down, URL)
  // can be told apart from an echo of this field's own selection.
  const lastValue = useRef<string | undefined>(value);
  // Labels learned from searches, used to re-hydrate the input text when the UUID
  // arrives from outside this field.
  const knownLabels = useRef<Map<string, string>>(new Map());
  const lastResetSignal = useRef(resetSignal);
  const listId = useId();

  const term = inputValue.trim();
  const isFullUuid = UUID_PATTERN.test(term);
  const canSearch = term.length >= MIN_SEARCH_LENGTH && !isFullUuid;
  const debouncedTerm = useDebounce(canSearch ? term : '', SEARCH_DEBOUNCE_MS);
  const usersQuery = useSearchUsers(debouncedTerm);
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const searching = canSearch && usersQuery.isFetching;

  // Remember search hits so an actor UUID applied from outside can be shown by
  // name instead of a raw UUID.
  useEffect(() => {
    for (const user of users) {
      knownLabels.current.set(user.id, userLabel(user));
    }
  }, [users]);

  // Mirror an actor UUID that changed outside this field into the input text.
  useEffect(() => {
    const previous = lastValue.current;
    lastValue.current = value;
    if (value === previous) return;
    appliedId.current = value ?? null;
    setInputValue(value ? knownLabels.current.get(value) ?? value : '');
  }, [value]);

  // Clear Filters also resets the draft this field holds.
  useEffect(() => {
    if (
      resetSignal === undefined ||
      resetSignal === lastResetSignal.current
    ) {
      return;
    }
    lastResetSignal.current = resetSignal;
    setInputValue('');
    setOpen(false);
    setActiveIndex(-1);
    appliedId.current = null;
  }, [resetSignal]);

  const publish = (userId: string | undefined) => {
    appliedId.current = userId ?? null;
    // Our own change: mark it as known so the `value` effect does not wipe the
    // text the user is still editing.
    lastValue.current = userId;
    onChange(userId);
  };

  const clearSelection = () => {
    setInputValue('');
    setOpen(false);
    setActiveIndex(-1);
    if (appliedId.current || value) publish(undefined);
  };

  const selectUser = (user: UserSearchResult) => {
    knownLabels.current.set(user.id, userLabel(user));
    setInputValue(userLabel(user));
    setOpen(false);
    setActiveIndex(-1);
    publish(user.id);
  };

  const handleInputChange = (next: string) => {
    setInputValue(next);
    setOpen(true);
    setActiveIndex(-1);
    const trimmed = next.trim();
    if (trimmed === '') {
      if (appliedId.current || value) publish(undefined);
      return;
    }
    // A pasted UUID is applied directly (deep links / support workflow).
    if (UUID_PATTERN.test(trimmed)) {
      if (trimmed !== value) publish(trimmed);
      return;
    }
    // Free text replaces any previous selection; only a picked user filters.
    if (appliedId.current) publish(undefined);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (users.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        const next = event.key === 'ArrowDown' ? current + 1 : current - 1;
        if (next < 0) return users.length - 1;
        if (next >= users.length) return 0;
        return next;
      });
      return;
    }
    if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      selectUser(users[activeIndex]);
    }
  };

  const showHint = open && term.length > 0 && term.length < MIN_SEARCH_LENGTH;
  const showNoResults =
    open && canSearch && !searching && !usersQuery.isError && users.length === 0;

  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={id}
        data-testid={testId}
        className="pl-9 pr-9"
        value={inputValue}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        maxLength={255}
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        }
      />
      {value && (
        <button
          type="button"
          onClick={clearSelection}
          aria-label={t('audit.clearSelection')}
          data-testid="user-filter-clear"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
      {!value && searching && (
        <LoaderCircle
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      )}

      {open && (showHint || canSearch) && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-full z-40 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-background shadow-md"
        >
          {showHint && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {t('audit.filterByUserHint', { min: MIN_SEARCH_LENGTH })}
            </p>
          )}
          {searching && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {t('audit.loading')}
            </p>
          )}
          {usersQuery.isError && (
            <p className="px-3 py-2 text-sm text-destructive" role="alert">
              {t('audit.filterByUserSearchFailed')}
            </p>
          )}
          {showNoResults && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              {t('audit.filterByUserNoResults')}
            </p>
          )}
          {users.map((user, index) => {
            const selected = user.id === value;
            return (
              <div
                key={user.id}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={selected}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-secondary',
                  index === activeIndex && 'bg-secondary/70',
                  selected && 'bg-secondary/70',
                )}
                onMouseDown={(event) => {
                  // Keep focus on the input so onBlur does not close the list first.
                  event.preventDefault();
                  selectUser(user);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="min-w-0">
                  <span className={cn('block truncate', selected && 'font-medium')}>
                    {userLabel(user)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </span>
                {selected && (
                  <Check
                    className="h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

