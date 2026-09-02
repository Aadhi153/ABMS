import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { Folder } from "lucide-react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
  cn,
  toast,
} from "@abms/ui";
import {
  FormPage,
  FormScrollArea,
  FormPageHeader,
  FormSection,
  FormSubsection,
  FormFooter,
  FormErrorBanner,
  FormCancelButton,
  FormSubmitButton,
  FieldError,
  FormStat,
  RequiredMark,
  useDiscardGuard,
  type SubmitStatus,
} from "./form-page";
import { FOCUS_GLOW, holdSuccessThen } from "./form-motion";

const CATEGORIES_LIST_ROUTE = "/products/categories";

const EDIT_CATEGORY_QUERY = gql`
  query EditCategoryData($id: String!) {
    category(id: $id) {
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
    categories {
      id
      name
    }
  }
`;

const UPDATE_CATEGORY_MUTATION = gql`
  mutation UpdateCategoryFull($id: String!, $input: UpdateCategoryInput!) {
    updateCategory(id: $id, input: $input) {
      id
    }
  }
`;

interface FormState {
  name: string;
  code: string;
  description: string;
  color: string;
  parentId: string;
  active: boolean;
  sortOrder: number;
}

interface CategoryRecord {
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

function categoryToFormState(c: CategoryRecord): FormState {
  return {
    name: c.name,
    code: c.code ?? "",
    description: c.description ?? "",
    color: c.color ?? "",
    parentId: c.parentId ?? "",
    active: c.active,
    sortOrder: c.sortOrder,
  };
}

export default function EditCategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{
    category: CategoryRecord | null;
    categories: Array<{ id: string; name: string }>;
  }>(EDIT_CATEGORY_QUERY, { variables: { id }, skip: !id });
  const [updateCategory] = useMutation(UPDATE_CATEGORY_MUTATION, { refetchQueries: ["Categories"] });

  const [form, setForm] = useState<FormState | null>(null);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (data?.category && !form) {
      const hydrated = categoryToFormState(data.category);
      setForm(hydrated);
      setInitialForm(hydrated);
    }
  }, [data, form]);

  const dirty = !!form && !!initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(CATEGORIES_LIST_ROUTE, dirty);

  const parentOptions = (data?.categories ?? []).filter((c) => c.id !== id);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
    const nameInvalid = !form.name.trim();
    setNameError(nameInvalid ? "Category name is required" : null);
    if (nameInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await updateCategory({
        variables: {
          id,
          input: {
            name: form.name,
            code: form.code || undefined,
            description: form.description || undefined,
            color: form.color || undefined,
            parentId: form.parentId || undefined,
            active: form.active,
            sortOrder: form.sortOrder,
          },
        },
      });
      toast.success(`${form.name} updated`);
      setStatus("success");
      holdSuccessThen(() => exitTo(CATEGORIES_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to update category";
      setSubmitError(message);
      toast.error(message);
    }
  }

  if (loading && !form) {
    return (
      <FormPage>
        <FormScrollArea>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!loading && !data?.category) {
    return (
      <FormPage>
        <FormScrollArea>
          <FormPageHeader
            breadcrumb={[{ label: "Categories", to: CATEGORIES_LIST_ROUTE }, { label: "Not found" }]}
            title="Category not found"
            backLabel="Back to Categories"
            onBack={goBack}
          />
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!form || !data?.category) return null;

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Categories", to: CATEGORIES_LIST_ROUTE }, { label: `Edit ${form.name}` }]}
          title="Edit Category"
          subtitle="Update this product category's details"
          icon={<Folder className="h-5 w-5" />}
          backLabel="Back to Categories"
          backPosition="right"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <FormSection title="Overview" description="Read-only summary for this category" index={0}>
          <FormSubsection title="Stats" className="sm:grid-cols-3">
            <FormStat label="Hierarchy" value={data.category.parentId === null ? "Root" : data.category.parent?.name ?? "—"} />
            <FormStat label="Products" value={data.category.productsCount} />
            <FormStat label="Subcategories" value={data.category.subcategoriesCount} />
            <FormStat label="Created" value={new Date(data.category.createdAt).toLocaleString()} />
            <FormStat label="Updated" value={new Date(data.category.updatedAt).toLocaleString()} />
          </FormSubsection>
        </FormSection>
        <form id="category-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Category Information"
            description="Update the details for this category"
            index={1}
          >
            <FormSubsection
              title="Basic Information"
              description="Enter the basic details for this category"
            >
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">
                  Category Name
                  <RequiredMark />
                </Label>
                <Input
                  id="cat-name"
                  required
                  placeholder="Enter category name"
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={nameError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-code">Category Code</Label>
                <Input
                  id="cat-code"
                  placeholder="ENTER CATEGORY CODE"
                  value={form.code}
                  onChange={(e) => setForm((f) => (f ? { ...f, code: e.target.value } : f))}
                  className={cn(FOCUS_GLOW, "uppercase")}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  placeholder="Enter category description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>

            <FormSubsection title="Color" className="sm:grid-cols-1 border-0 p-0 pb-2">
              <div className="flex max-w-sm items-center gap-2">
                <Input
                  type="color"
                  value={form.color || "#64748b"}
                  onChange={(e) => setForm((f) => (f ? { ...f, color: e.target.value } : f))}
                  className={cn(FOCUS_GLOW, "h-9 w-12 p-1")}
                />
                <Input
                  aria-label="Color hex value"
                  placeholder="#64748b"
                  value={form.color}
                  onChange={(e) => setForm((f) => (f ? { ...f, color: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>

            <FormSubsection title="Sort Order" className="sm:grid-cols-1 border-0 p-0 pb-2">
              <div className="space-y-1.5 max-w-sm">
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => (f ? { ...f, sortOrder: parseInt(e.target.value) || 0 } : f))}
                  className={FOCUS_GLOW}
                />
                <p className="text-[11px] text-muted-foreground">Lower numbers appear first</p>
              </div>
            </FormSubsection>

            <div className="flex items-center gap-3">
              <Switch
                id="cat-active"
                checked={form.active}
                onCheckedChange={(c) => setForm((f) => (f ? { ...f, active: c } : f))}
              />
              <div className="space-y-0.5">
                <Label htmlFor="cat-active" className="text-sm font-medium">
                  Active
                </Label>
                <p className="text-xs text-muted-foreground">Inactive categories won't be visible in product listings</p>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Hierarchy Settings"
            description="Configure the category hierarchy and parent-child relationships"
            index={2}
          >
            <div className="space-y-1.5 max-w-xl">
              <Label>Parent Category</Label>
              <Select
                value={form.parentId}
                onValueChange={(v) => setForm((f) => (f ? { ...f, parentId: v } : f))}
              >
                <SelectTrigger className={FOCUS_GLOW}>
                  <SelectValue placeholder="None (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1.5">Select a parent to create a subcategory</p>
            </div>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="category-form"
          status={status}
          idleLabel="Save changes"
          loadingLabel="Saving…"
          successLabel="Category updated"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
