import { useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
  cn,
  toast,
} from "@abms/ui";
import { BrandFormDialog, type BrandFormBrand, type BrandFormValues } from "./brand-form-dialog";
import { BUTTON_PRESS, DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "./dialog-motion";
import { LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";

const BRANDS_QUERY = gql`
  query Brands {
    brands {
      id
      name
      description
      logoUrl
      active
    }
  }
`;

const UPDATE_BRAND_MUTATION = gql`
  mutation UpdateBrand($id: String!, $input: UpdateBrandInput!) {
    updateBrand(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_BRAND_MUTATION = gql`
  mutation DeleteBrand($id: String!) {
    deleteBrand(id: $id)
  }
`;

interface BrandRow {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  active: boolean;
}

const ROW_GRID = "grid grid-cols-[48px_1.2fr_1.6fr_100px_88px] items-center gap-3";
const ROW_COLLAPSE_MS = 200;

export default function BrandsTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ brands: BrandRow[] }>(BRANDS_QUERY);
  const [updateBrand] = useMutation(UPDATE_BRAND_MUTATION);
  const [deleteBrand] = useMutation(DELETE_BRAND_MUTATION);

  const [editing, setEditing] = useState<BrandFormBrand | null>(null);
  const [deleting, setDeleting] = useState<BrandRow | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function openCreate() {
    goWithExit("/products/brands/new");
  }

  function openEdit(brand: BrandRow) {
    setEditing(brand);
  }

  async function handleUpdate(values: BrandFormValues, id: string) {
    const input = {
      name: values.name,
      description: values.description.trim() || undefined,
      logoUrl: values.logoUrl || undefined,
      active: values.active,
    };
    await updateBrand({ variables: { id, input } });
    toast.success(`${values.name} updated`);
    await refetch();
  }

  function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    setRemovingId(target.id);
    setTimeout(async () => {
      try {
        await deleteBrand({ variables: { id: target.id } });
        toast.success(`${target.name} deleted`);
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete brand");
      } finally {
        setRemovingId(null);
      }
    }, ROW_COLLAPSE_MS);
  }

  const brands = data?.brands ?? [];

  return (
    <Card className={leaving ? LIST_EXIT : LIST_ENTER}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>All Brands</CardTitle>
          <CardDescription>Manage the brands products can be tagged with.</CardDescription>
        </div>
        <Button size="sm" onClick={openCreate} disabled={leaving} className={BUTTON_PRESS}>
          <Plus className="h-4 w-4" />
          New Brand
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <BrandsSkeleton />
        ) : brands.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <div role="table" className="w-full text-sm">
            <div role="row" className={cn(ROW_GRID, "border-b border-border px-2 pb-2 text-left text-muted-foreground")}>
              <span />
              <span className="font-medium">Name</span>
              <span className="font-medium">Description</span>
              <span className="font-medium">Status</span>
              <span className="font-medium text-right">Actions</span>
            </div>
            <div>
              {brands.map((b) => (
                <BrandRowItem key={b.id} brand={b} leaving={removingId === b.id} onEdit={() => openEdit(b)} onDelete={() => setDeleting(b)} />
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <BrandFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        brand={editing}
        onSave={(values, id) => handleUpdate(values, id!)}
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Delete brand</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deleting?.name}</span>? Products keep their other
            fields but lose this brand.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} className={BUTTON_PRESS}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function BrandRowItem({
  brand,
  leaving,
  onEdit,
  onDelete,
}: {
  brand: BrandRow;
  leaving: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="row"
      className={cn(
        ROW_GRID,
        "group overflow-hidden border-b border-border px-2 transition-all duration-200 ease-out last:border-0 motion-reduce:transition-none",
        "animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none",
        leaving ? "h-0 border-b-0 py-0 opacity-0" : "h-16 py-2 opacity-100 hover:bg-muted/40",
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-muted">
        {brand.logoUrl ? (
          <img src={brand.logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Tags className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <span className="truncate font-medium">{brand.name}</span>
      <span className="truncate text-muted-foreground">{brand.description || "—"}</span>
      <span>
        <Badge tone={brand.active ? "success" : "muted"}>{brand.active ? "Active" : "Inactive"}</Badge>
      </span>
      <div className="flex justify-end gap-1 opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${brand.name}`}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} aria-label={`Delete ${brand.name}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function BrandsSkeleton() {
  return (
    <div className="space-y-3 py-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={cn(ROW_GRID, "px-2")}>
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="ml-auto h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in zoom-in-95 duration-300 ease-out motion-reduce:animate-none">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Tags className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No brands yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first brand.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}>
        <Plus className="h-4 w-4" />
        Add your first brand
      </Button>
    </div>
  );
}
