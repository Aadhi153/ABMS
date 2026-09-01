import { useMemo, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Download,
  Eye,
  Folder,
  Layers,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  PowerOff,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
  toast,
} from "@abms/ui";
import { DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "./dialog-motion";
import { BUTTON_PRESS, CARD_HOVER, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";
import { CategoryFormDialog, type CategoryFormRow, type CategoryFormValues } from "./category-form-dialog";

const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      id
      name
      code
      description
      color
      parentId
      parent {
        id
        name
      }
      active
      sortOrder
      productsCount
      subcategoriesCount
      createdAt
      updatedAt
    }
  }
`;

const CREATE_CATEGORY_MUTATION = gql`
  mutation CreateCategoryFromList($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      id
    }
  }
`;

const UPDATE_CATEGORY_MUTATION = gql`
  mutation UpdateCategoryFromList($id: String!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_CATEGORY_MUTATION = gql`
  mutation DeleteCategory($id: String!) {
    deleteCategory(id: $id)
  }
`;

interface CategoryRow {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  color: string | null;
  parentId: string | null;
  parent: { id: string; name: string } | null;
  active: boolean;
  sortOrder: number;
  productsCount: number;
  subcategoriesCount: number;
  createdAt: string;
  updatedAt: string;
}

type SortKey = "name" | "code" | "hierarchy" | "active" | "productsCount" | "subcategoriesCount" | "sortOrder";
type StatusFilter = "all" | "active" | "inactive";
type LevelFilter = "all" | "root" | "sub";

export default function CategoriesTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ categories: CategoryRow[] }>(CATEGORIES_QUERY);
  const [createCategory] = useMutation(CREATE_CATEGORY_MUTATION);
  const [updateCategory] = useMutation(UPDATE_CATEGORY_MUTATION);
  const [deleteCategory] = useMutation(DELETE_CATEGORY_MUTATION);

  const [deleting, setDeleting] = useState<CategoryRow | null>(null);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [viewing, setViewing] = useState<CategoryRow | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("sortOrder");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [visibleCols, setVisibleCols] = useState({ code: true, hierarchy: true, sortOrder: true });

  const categories = data?.categories ?? [];

  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter((c) => c.active).length;
    const inactive = categories.filter((c) => !c.active).length;
    const withProducts = categories.filter((c) => c.productsCount > 0).length;
    return { total, active, inactive, withProducts };
  }, [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return categories.filter((c) => {
      if (statusFilter === "active" && !c.active) return false;
      if (statusFilter === "inactive" && c.active) return false;
      if (levelFilter === "root" && c.parentId !== null) return false;
      if (levelFilter === "sub" && c.parentId === null) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.code?.toLowerCase().includes(q) ?? false) ||
        (c.description?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [categories, search, statusFilter, levelFilter]);

  const sorted = useMemo(() => {
    const dirMul = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dirMul;
        case "code":
          return (a.code ?? "").localeCompare(b.code ?? "") * dirMul;
        case "hierarchy": {
          const aVal = a.parentId === null ? "" : a.parent?.name ?? "";
          const bVal = b.parentId === null ? "" : b.parent?.name ?? "";
          return aVal.localeCompare(bVal) * dirMul;
        }
        case "active":
          return (Number(a.active) - Number(b.active)) * dirMul;
        case "productsCount":
          return (a.productsCount - b.productsCount) * dirMul;
        case "subcategoriesCount":
          return (a.subcategoriesCount - b.subcategoriesCount) * dirMul;
        case "sortOrder":
          return (a.sortOrder - b.sortOrder) * dirMul;
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteCategory({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeleting(null);
    }
  }

  async function handleSaveEdit(values: CategoryFormValues, id?: string) {
    const input = {
      name: values.name,
      code: values.code || undefined,
      description: values.description || undefined,
      color: values.color || undefined,
      parentId: values.parentId || undefined,
      active: values.active,
      sortOrder: values.sortOrder === "" ? undefined : Number(values.sortOrder),
    };
    if (id) {
      await updateCategory({ variables: { id, input } });
      toast.success(`${values.name} updated`);
    } else {
      await createCategory({ variables: { input } });
      toast.success(`${values.name} created`);
    }
    await refetch();
  }

  async function handleToggleActive(row: CategoryRow) {
    try {
      await updateCategory({ variables: { id: row.id, input: { active: !row.active } } });
      toast.success(`${row.name} ${row.active ? "deactivated" : "activated"}`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update category");
    }
  }

  const editingFormRow: CategoryFormRow | null = editing
    ? {
        id: editing.id,
        name: editing.name,
        code: editing.code,
        description: editing.description,
        color: editing.color,
        parentId: editing.parentId,
        active: editing.active,
        sortOrder: editing.sortOrder,
      }
    : null;

  return (
    <div className={cn("space-y-4", leaving ? LIST_EXIT : LIST_ENTER)}>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">Categories</h2>
          <p className="text-sm text-muted-foreground">Manage product categories and hierarchy</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSummary(!showSummary)} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            {showSummary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showSummary ? "Hide Summary" : "Show Summary"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 text-xs", BUTTON_PRESS)}
            onClick={() => {
              refetch();
              toast.success("Summary refreshed");
            }}
          >
            <BarChart3 className="h-3.5 w-3.5" /> Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 text-xs", BUTTON_PRESS)}
            onClick={() => toast.success("Importing categories from file… (Demo)")}
          >
            <Upload className="h-3.5 w-3.5" /> Import Categories
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 text-xs", BUTTON_PRESS)}
            onClick={() => toast.success("Exporting categories… (Demo)")}
          >
            <Download className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" onClick={() => goWithExit("/products/categories/new")} disabled={leaving} className={cn("gap-1.5 text-xs", BUTTON_PRESS)}>
            <Plus className="h-3.5 w-3.5" /> Add Category
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={cn("transition-all duration-300 ease-in-out origin-top", showSummary ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0 overflow-hidden pointer-events-none !mt-0")}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Total Categories", value: stats.total, icon: Layers, iconClass: "text-slate-500", footer: `${stats.total} categories` },
            { label: "Active", value: stats.active, icon: CheckCircle2, iconClass: "text-emerald-500", footer: "Active categories" },
            { label: "Inactive", value: stats.inactive, icon: XCircle, iconClass: "text-slate-400", footer: "Inactive categories" },
            { label: "With Products", value: stats.withProducts, icon: Package, iconClass: "text-blue-500", footer: "Have products" },
          ].map((s) => (
            <Card key={s.label} className={CARD_HOVER}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                  <s.icon className={cn("h-4 w-4", s.iconClass)} />
                </div>
                <div className="text-2xl font-bold tracking-tight text-foreground">{loading ? "—" : s.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{s.footer}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <Card>
        <div className="px-5 pt-5 pb-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Categories</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Browse and manage all product categories</p>
        </div>
        <div className="px-5 py-3 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-xs"
              placeholder="Search by name, code, or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setCurrentPage(1); }}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={levelFilter} onValueChange={(v) => { setLevelFilter(v as LevelFilter); setCurrentPage(1); }}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="All Levels" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="root">Root only</SelectItem>
              <SelectItem value="sub">Sub-categories only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground py-16 text-center">Loading…</p>
          ) : categories.length === 0 ? (
            <EmptyState onAdd={() => goWithExit("/products/categories/new")} />
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No categories match your search.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-left text-muted-foreground">
                      <SortHeader label="Name" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.code && <SortHeader label="Code" k="code" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      {visibleCols.hierarchy && <SortHeader label="Hierarchy" k="hierarchy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <SortHeader label="Status" k="active" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Products" k="productsCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      <SortHeader label="Subcategories" k="subcategoriesCount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                      {visibleCols.sortOrder && <SortHeader label="Sort Order" k="sortOrder" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />}
                      <th className="px-4 py-2.5 font-medium text-center w-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground transition-colors"><Settings2 className="h-3.5 w-3.5" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(["code", "hierarchy", "sortOrder"] as const).map((col) => (
                              <DropdownMenuItem key={col} onSelect={(e) => { e.preventDefault(); setVisibleCols((v) => ({ ...v, [col]: !v[col] })); }}>
                                <Check className={cn("h-3.5 w-3.5", !visibleCols[col] && "opacity-0")} />
                                {col === "code" ? "Code" : col === "hierarchy" ? "Hierarchy" : "Sort Order"}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((c) => (
                      <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors animate-in fade-in slide-in-from-top-1 duration-150 ease-out">
                        <td className="px-4 py-2.5">
                          <div className="flex items-start gap-2">
                            <Folder className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                            <div>
                              <p className="font-medium text-foreground">{c.name}</p>
                              {c.description && <p className="text-[11px] text-muted-foreground">{c.description}</p>}
                            </div>
                          </div>
                        </td>
                        {visibleCols.code && (
                          <td className="px-4 py-2.5">
                            {c.code ? (
                              <span className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">{c.code}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {visibleCols.hierarchy && (
                          <td className="px-4 py-2.5">
                            {c.parentId === null ? (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Root</span>
                            ) : (
                              <span className="text-muted-foreground">{c.parent?.name ?? "—"}</span>
                            )}
                          </td>
                        )}
                        <td className="px-4 py-2.5">
                          {c.active
                            ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">Active</span>
                            : <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Inactive</span>}
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" />{c.productsCount}</span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Folder className="h-3 w-3" />{c.subcategoriesCount}</span>
                        </td>
                        {visibleCols.sortOrder && <td className="px-4 py-2.5 text-muted-foreground">{c.sortOrder}</td>}
                        <td className="px-4 py-2.5 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setViewing(c)}><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5" /> Edit Category</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setViewing(c)}><BarChart3 className="h-3.5 w-3.5" /> View Summary</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(c)}>
                                {c.active ? <PowerOff className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {c.active ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleting(c)} className="text-danger focus:text-danger"><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Rows per page</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Page {currentPage} of {totalPages}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>«</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>‹</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>›</Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>»</Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <CategoryFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        category={editingFormRow}
        parentOptions={categories.map((c) => ({ id: c.id, name: c.name }))}
        onSave={handleSaveEdit}
      />

      {/* View Details / Summary Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Category details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Name", viewing.name],
                ["Code", viewing.code || "—"],
                ["Description", viewing.description || "—"],
                ["Hierarchy", viewing.parentId === null ? "Root" : viewing.parent?.name ?? "—"],
                ["Status", viewing.active ? "Active" : "Inactive"],
                ["Products", String(viewing.productsCount)],
                ["Subcategories", String(viewing.subcategoriesCount)],
                ["Sort Order", String(viewing.sortOrder)],
                ["Color", viewing.color || "—"],
                ["Created", new Date(viewing.createdAt).toLocaleString()],
                ["Updated", new Date(viewing.updatedAt).toLocaleString()],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border px-3 py-2">
                  <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><Button onClick={() => setViewing(null)} className={BUTTON_PRESS}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader><DialogTitle>Delete category</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Delete <span className="font-medium text-foreground">{deleting?.name}</span>? Products keep their other fields but lose this category.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} className={BUTTON_PRESS}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} className={BUTTON_PRESS}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey === k;
  return (
    <th className="px-4 py-2.5 font-medium">
      <button className={cn("flex items-center gap-1 hover:text-foreground transition-colors", active && "text-foreground")} onClick={() => onSort(k)}>
        {label}
        {active ? (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-60" />}
      </button>
    </th>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in zoom-in-95 duration-300 ease-out">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted"><Layers className="h-5 w-5 text-muted-foreground" /></div>
      <div>
        <p className="text-sm font-medium">No categories yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first category.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}><Plus className="h-4 w-4" />Add your first category</Button>
    </div>
  );
}
