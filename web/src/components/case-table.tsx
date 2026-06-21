"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  ChevronsUpDown,
  Search,
} from "lucide-react";
import {
  type Column,
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { StagePill } from "@/components/status-pill";
import { ConfidenceMeter } from "@/components/confidence-meter";
import {
  LANGUAGE_FLAGS,
  LANGUAGE_LABELS,
  formatRelativeTime,
  needsAttention,
  pipelineStage,
} from "@/lib/case-utils";
import { cn } from "@/lib/utils";
import type { Case, PipelineStage } from "@/lib/types";

// Stage ordering so the "Stage" column sorts along the real pipeline.
const STAGE_ORDER: PipelineStage[] = [
  "received",
  "parsed",
  "classified",
  "drafted",
  "awaiting_signoff",
  "approved",
  "calling",
  "booked",
  "rejected",
  "flagged",
];
const stageRank = (c: Case) => STAGE_ORDER.indexOf(pipelineStage(c));

function SortHeader({
  column,
  children,
  className,
}: {
  column: Column<Case, unknown>;
  children: React.ReactNode;
  className?: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn(
        "-ml-1 flex items-center gap-1 rounded px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        className,
      )}
    >
      {children}
      {sorted === "asc" ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === "desc" ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ChevronsUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

// Per-column responsive visibility, applied to both header and body cells.
const HIDE: Record<string, string> = {
  finding: "hidden sm:table-cell",
  guideline: "hidden md:table-cell",
  confidence: "hidden lg:table-cell",
  received: "hidden sm:table-cell",
};

const columns: ColumnDef<Case>[] = [
  {
    id: "patient",
    accessorFn: (c) => c.patient_name,
    header: ({ column }) => <SortHeader column={column}>Patient</SortHeader>,
    cell: ({ row }) => {
      const c = row.original;
      const attention = needsAttention(c);
      return (
        <Link
          href={`/cases/${c.id}`}
          className="flex items-center gap-2 font-medium after:absolute after:inset-0"
        >
          {attention && (
            <span
              className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-amber-500"
              aria-label="Needs attention"
            />
          )}
          <span>{c.patient_name}</span>
          <span title={LANGUAGE_LABELS[c.patient_language]} className="text-sm">
            {LANGUAGE_FLAGS[c.patient_language]}
          </span>
        </Link>
      );
    },
  },
  {
    id: "finding",
    accessorFn: (c) => c.parsed_findings?.findings[0]?.description ?? "",
    enableSorting: false,
    header: () => (
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Finding
      </span>
    ),
    cell: ({ row }) => {
      const f = row.original.parsed_findings?.findings[0];
      return (
        <span className="block max-w-[18rem] truncate text-muted-foreground">
          {f
            ? `${f.description}${f.measurement ? ` · ${f.measurement}` : ""}`
            : "Parsing…"}
        </span>
      );
    },
  },
  {
    id: "guideline",
    accessorFn: (c) => c.guideline_classification?.guideline_used ?? "",
    header: ({ column }) => <SortHeader column={column}>Guideline</SortHeader>,
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.guideline_classification?.guideline_used ?? "—"}
      </span>
    ),
  },
  {
    id: "stage",
    accessorFn: (c) => stageRank(c),
    header: ({ column }) => <SortHeader column={column}>Stage</SortHeader>,
    cell: ({ row }) => <StagePill case={row.original} />,
  },
  {
    id: "confidence",
    accessorFn: (c) => c.confidence ?? -1,
    header: ({ column }) => <SortHeader column={column}>Confidence</SortHeader>,
    cell: ({ row }) => <ConfidenceMeter value={row.original.confidence} />,
  },
  {
    id: "received",
    accessorFn: (c) => new Date(c.created_at).getTime(),
    header: ({ column }) => (
      <SortHeader column={column} className="ml-auto">
        Received
      </SortHeader>
    ),
    cell: ({ row }) => (
      <span className="block text-right text-sm text-muted-foreground">
        {formatRelativeTime(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "chevron",
    header: () => null,
    cell: () => (
      <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    ),
  },
];

export function CaseTable({ cases }: { cases: Case[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "received", desc: true },
  ]);
  const [filter, setFilter] = React.useState("");

  const table = useReactTable({
    data: cases,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    globalFilterFn: (row, _columnId, value) => {
      const c = row.original as Case;
      const hay = `${c.patient_name} ${c.guideline_classification?.guideline_used ?? ""} ${
        c.parsed_findings?.findings[0]?.description ?? ""
      }`.toLowerCase();
      return hay.includes(String(value).toLowerCase());
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search patient, finding, guideline…"
            className="bg-card pl-9"
            aria-label="Search cases"
          />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
          {rows.length} {rows.length === 1 ? "case" : "cases"}
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-muted/50 hover:bg-muted/50">
                {hg.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={cn(
                      HIDE[header.column.id],
                      header.column.id === "chevron" && "w-8",
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => {
                const attention = needsAttention(row.original);
                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "group relative cursor-pointer transition-colors hover:bg-accent/50",
                      attention &&
                        "bg-amber-500/[0.06] shadow-[inset_3px_0_0] shadow-amber-500 hover:bg-amber-500/10",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(HIDE[cell.column.id])}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No cases match “{filter}”.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
