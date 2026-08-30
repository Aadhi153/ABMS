import { useState } from "react";
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
  toast,
} from "@abms/ui";
import { DIALOG_CONTENT_MOTION, DIALOG_OVERLAY_MOTION } from "./dialog-motion";
import { BUTTON_PRESS, LIST_ENTER, LIST_EXIT, usePageTransition } from "./form-motion";

const CATEGORIES_QUERY = gql`
  query Categories {
    categories {
      id
      name
      description
      color
      parent {
        id
        name
      }
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
  description: string | null;
  color: string | null;
  parent: { id: string; name: string } | null;
}

export default function CategoriesTab() {
  const { leaving, goWithExit } = usePageTransition();
  const { data, loading, refetch } = useQuery<{ categories: CategoryRow[] }>(CATEGORIES_QUERY);
  const [deleteCategory] = useMutation(DELETE_CATEGORY_MUTATION);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

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
    <Card className={leaving ? LIST_EXIT : LIST_ENTER}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>All Categories</CardTitle>
          <CardDescription>Group products into categories for browsing and reporting.</CardDescription>
        </div>
        <Button size="sm" onClick={() => goWithExit("/products/categories/new")} disabled={leaving} className={BUTTON_PRESS}>
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : data?.categories.length === 0 ? (
          <EmptyState onAdd={() => goWithExit("/products/categories/new")} />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Description</th>
                <th className="py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.categories.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-border last:border-0 animate-in fade-in slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"
                >
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      {c.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} />}
                      <span>
                        {c.parent && <span className="text-muted-foreground">{c.parent.name} › </span>}
                        {c.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-muted-foreground">{c.description || "—"}</td>
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
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className={DIALOG_CONTENT_MOTION} overlayClassName={DIALOG_OVERLAY_MOTION}>
          <DialogHeader>
            <DialogTitle>Delete category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete <span className="font-medium text-foreground">{deleting?.name}</span>? Products keep their other
            fields but lose this category.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} className={BUTTON_PRESS}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} className={BUTTON_PRESS}>
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
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center animate-in fade-in zoom-in-95 duration-300 ease-out motion-reduce:animate-none">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Layers className="h-5 w-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">No categories yet</p>
        <p className="text-sm text-muted-foreground">Get started by adding your first category.</p>
      </div>
      <Button size="sm" onClick={onAdd} className={BUTTON_PRESS}>
        <Plus className="h-4 w-4" />
        Add your first category
      </Button>
    </div>
  );
}
