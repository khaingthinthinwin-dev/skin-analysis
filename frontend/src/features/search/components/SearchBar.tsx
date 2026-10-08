import { useState, useRef, useCallback, useEffect, useId } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
}

const DEBOUNCE_MS = 300;

export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder,
}: SearchBarProps) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gradientId = `search-icon-gradient-${useId().replace(/:/g, "")}`;

  const displayValue = focused ? draft : value;

  const cancelDebounce = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    cancelDebounce();
    onChange(draft);
    onSubmit(draft);
    setDraft(draft);
    setFocused(false);
  }, [cancelDebounce, draft, onChange, onSubmit]);

  const handleTyping = useCallback(
    (text: string) => {
      setDraft(text);
      cancelDebounce();
      timerRef.current = setTimeout(() => {
        onChange(text);
      }, DEBOUNCE_MS);
    },
    [cancelDebounce, onChange],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    flush();
  };

  const handleClear = () => {
    cancelDebounce();
    setDraft("");
    onChange("");
    onSubmit("");
    setFocused(false);
  };

  const handleBlur = () => {
    cancelDebounce();
    setFocused(false);
    setDraft(value);
  };

  useEffect(() => cancelDebounce, [cancelDebounce]);

  return (
    <form
      role="search"
      aria-label="Product search"
      onSubmit={handleSubmit}
      className="flex w-full gap-2"
    >
      <div className="search-box-glow min-w-0 flex-1 rounded-md p-[1.5px]">
        <div className="relative rounded-[calc(var(--radius)-1.5px)] bg-purple-50 dark:bg-[#181028]">
          <svg
            className="pointer-events-none absolute h-0 w-0"
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="100%" stopColor="#EC4899" />
              </linearGradient>
            </defs>
          </svg>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            stroke={`url(#${gradientId})`}
          />
          <Input
            type="text"
            value={displayValue}
            onChange={(e) => handleTyping(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={handleBlur}
            placeholder={
              placeholder ?? "Search by product name, ingredient, or concern..."
            }
            aria-label="Search by product name, ingredient, or concern"
            className="border-0 bg-transparent pl-9 pr-9 text-slate-800 placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 dark:text-white dark:placeholder:text-gray-400"
          />
          {displayValue && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute right-11 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <Button
        type="submit"
        size="icon"
        variant="default"
        aria-label="Search products"
        className="bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white shadow-md shadow-purple-500/20 transition-all duration-200 hover:from-[#7C3AED] hover:to-[#DB2777] hover:shadow-lg hover:shadow-pink-500/25 active:scale-95 active:from-[#6D28D9] active:to-[#BE185D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6] focus-visible:ring-offset-2"
      >
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
}
