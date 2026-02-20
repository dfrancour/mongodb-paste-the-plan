import { Search } from "lucide-react";

interface SearchInputProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder?: string;
  readonly className?: string;
  readonly ariaLabel?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  ariaLabel,
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search
        className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-neutral-400"
        aria-hidden="true"
      />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel ?? placeholder}
        className="w-full rounded-lg border border-neutral-300 bg-white py-2 pr-4 pl-10 text-sm text-neutral-900 placeholder-neutral-500 focus:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:focus:border-neutral-400 dark:focus:ring-neutral-400"
      />
    </div>
  );
}
