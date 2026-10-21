import { Input } from "@/components/ui/input";

export function DataToolbar({
  pageSize,
  onPageSizeChange,
  search,
  onSearchChange,
}: {
  pageSize: number;
  onPageSizeChange: (n: number) => void;
  search: string;
  onSearchChange: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-primary">
        Show
        <select
          className="rounded-md border border-input bg-card px-2 py-1 text-sm text-foreground"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        entries
      </label>
      <label className="flex items-center gap-2 text-sm font-semibold text-primary">
        Search:
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-56"
        />
      </label>
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  from,
  to,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (p: number) => void;
}) {
  const btn =
    "rounded-md border border-border px-3 py-1 text-sm text-foreground disabled:opacity-40 hover:bg-accent";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-muted-foreground">
      <span>
        Showing {total === 0 ? 0 : from} to {to} of {total} entries
      </span>
      <div className="flex items-center gap-2">
        <button className={btn} onClick={() => onPageChange(1)} disabled={page <= 1}>
          First
        </button>
        <button className={btn} onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          Previous
        </button>
        <span className="rounded-md bg-secondary px-3 py-1 font-semibold text-secondary-foreground">
          {page}
        </span>
        <button
          className={btn}
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
        >
          Next
        </button>
        <button
          className={btn}
          onClick={() => onPageChange(pageCount)}
          disabled={page >= pageCount}
        >
          Last
        </button>
      </div>
    </div>
  );
}
