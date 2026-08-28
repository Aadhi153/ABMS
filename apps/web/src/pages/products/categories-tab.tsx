import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Layers, Plus, Trash2 } from "lucide-react";
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

const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      id
      name
    }
  }
`;

const CREATE_CATEGORY_MUTATION = gql`
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
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
}

export default function CategoriesTab() {
  const { data, loading, refetch } = useQuery<{ categories: CategoryRow[] }>(CATEGORIES_QUERY);
  const [createCategory] = useMutation(CREATE_CATEGORY_MUTATION);
  const [deleteCategory] = useMutation(DELETE_CATEGORY_MUTATION);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCategory({ variables: { input: { name } } });
      toast.success(`${name} added`);
      setOpen(false);
      setName("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  }

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

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>Group products into categories for browsing and reporting.</CardDescription>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.categories.length === 0 ? (
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
              {data?.categories.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setDeleting(c)}>
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
            <DialogTitle>New category</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deleting?.name}</span>? Products keep their other
            fields but lose this category.
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
        <Layers className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No categories yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first category.</p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first category
      </Button>
    </div>
  );
}
