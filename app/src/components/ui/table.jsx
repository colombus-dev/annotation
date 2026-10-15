import { ChevronDownIcon, ChevronUpIcon, ChevronsUpDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Table({ className, ...props }) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-sm", className)}
        {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
      {...props} />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props} />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b border-border transition-colors hover:bg-muted/50",
        className
      )}
      {...props} />
  );
}

function TableHead({ className, sortDirection, onSort, children, ...props }) {
  if (!onSort) {
    return (
      <th
        data-slot="table-head"
        className={cn(
          "h-9 px-3 text-left align-middle text-xs font-medium text-muted-foreground",
          className
        )}
        {...props}
      >
        {children}
      </th>
    );
  }

  const Icon =
    sortDirection === "asc"
      ? ChevronUpIcon
      : sortDirection === "desc"
        ? ChevronDownIcon
        : ChevronsUpDownIcon

  return (
    <th
      data-slot="table-head"
      className={cn("h-9 px-3 text-left align-middle", className)}
      {...props}
    >
      <button
        type="button"
        onClick={onSort}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
      >
        {children}
        <Icon size={12} className={sortDirection ? "text-foreground" : undefined} />
      </button>
    </th>
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn("px-3 py-2 align-middle", className)}
      {...props} />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
