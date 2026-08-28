import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Plus, Tags, Trash2 } from "lucide-react";
import {
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
  Input,
  Label,
  toast,
} from "@abms/ui";

const BRANDS_QUERY = gql`
  query Brands {
    brands {
      id
      name
    }
  }
`;

const CREATE_BRAND_MUTATION = gql`
  mutation CreateBrand($input: CreateBrandInput!) {
    createBrand(input: $input) {
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
}

export default function BrandsTab() {
  const { data, loading, refetch } = useQuery<{ brands: BrandRow[] }>(BRANDS_QUERY);
  const [createBrand] = useMutation(CREATE_BRAND_MUTATION);
  const [deleteBrand] = useMutation(DELETE_BRAND_MUTATION);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<BrandRow | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createBrand({ variables: { input: { name } } });
      toast.success(`${name} added`);
      setOpen(false);
      setName("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create brand");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await deleteBrand({ variables: { id: deleting.id } });
      toast.success(`${deleting.name} deleted`);
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete brand");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>All Brands</CardTitle>
          <CardDescription>Manage the brands products can be tagged with.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Brand
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.brands.length === 0 ? (
          <EmptyState onAdd={() => setOpen(true)} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.brands.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="py-2">{b.name}</td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(b)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New brand</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="brand-name">Name</Label>
              <Input id="brand-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create brand"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete brand</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deleting?.name}</span>? Products keep their other
            fields but lose this brand.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Tags className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No brands yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first brand.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first brand
      </Button>
    </div>
  );
}
