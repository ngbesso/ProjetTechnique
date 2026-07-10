import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import styles from "./DataTable.module.css";

interface DataTableProps<T> {
  columns: ColumnDef<T, any>[];
  data: T[];
  emptyMessage?: string;
  getRowId?: (row: T) => string | number;
  /** Active la pagination côté client avec ce nombre de lignes par page. */
  pageSize?: number;
  className?: string;
}

function cx(...parts: (string | false | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "Aucune donnée.",
  getRowId,
  pageSize,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(pageSize ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    initialState: pageSize ? { pagination: { pageSize } } : undefined,
    getRowId: getRowId ? (row) => String(getRowId(row)) : undefined,
  });

  if (data.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div className={styles.wrapper}>
      <table className={cx(styles.table, className)}>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const sortDir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    className={cx(styles.th, sortable && styles.thSortable)}
                    onClick={sortable ? header.column.getToggleSortingHandler() : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                    {sortable && (
                      <span className={cx(styles.sortIcon, !!sortDir && styles.sortIconActive)}>
                        {sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "↕"}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={styles.td}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {pageSize !== undefined && table.getPageCount() > 1 && (
        <div className={styles.pagination}>
          <span>
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Précédent
          </button>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}

export type { ColumnDef };
export { createColumnHelper } from "@tanstack/react-table";
