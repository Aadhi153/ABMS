import { useState, type FormEvent } from "react";
import { Folder, Plus } from "lucide-react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Button,
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
import { ImageDropzone } from "./image-dropzone";
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
  RequiredMark,
  useDiscardGuard,
  type SubmitStatus,
} from "./form-page";
import { BUTTON_PRESS, FOCUS_GLOW, holdSuccessThen } from "./form-motion";

const CATEGORIES_QUERY = gql`
  query CategoriesForParentPicker {
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

const EMPTY_FORM = {
  name: "",
  code: "",
  description: "",
  image: null as File | null,
  sortOrder: 0,
  active: true,
  parentId: "",
  color: "",
};

const COLOR_SWATCHES = [
  "#f59e0b",
  "#3b82f6",
  "#22c55e",
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#ec4899",
  "#64748b",
];

export default function NewCategoryPage() {
  const { data } = useQuery<{
    categories: Array<{ id: string; name: string }>;
  }>(CATEGORIES_QUERY);
  const [createCategory] = useMutation(CREATE_CATEGORY_MUTATION, {
    refetchQueries: ["Categories"],
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    "/products/categories",
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setSubmitError(null);
    setStatus("submitting");
    try {
      await createCategory({
        variables: {
          input: {
            name: form.name,
            description: form.description || undefined,
            color: form.color || undefined,
            parentId: form.parentId || undefined,
          },
        },
      });
      toast.success(`${form.name} added`);
      setStatus("success");
      holdSuccessThen(() => exitTo("/products/categories"));
    } catch (err) {
      setStatus("idle");
      const message =
        err instanceof Error ? err.message : "Failed to create category";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[]}
          title="Add New Category"
          subtitle="Create a new product category for your inventory"
          icon={<Folder className="h-5 w-5" />}
          backLabel="Back to Categories"
          backPosition="right"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="category-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Category Information"
            description="Fill in the details below to create a new category"
            icon={<Plus className="h-5 w-5" />}
            index={0}
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
                <FieldError message={error} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-code">
                  Category Code
                  <RequiredMark />
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="cat-code"
                    required
                    placeholder="ENTER CATEGORY CODE"
                    value={form.code}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, code: e.target.value }))
                    }
                    className={cn(FOCUS_GLOW, "uppercase")}
                  />
                  <Button type="button" variant="outline" className={BUTTON_PRESS}>Auto</Button>
                </div>
                <p className="text-[11px] text-muted-foreground">Code will be auto-generated from name if left empty</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  placeholder="Enter category description"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>

            <FormSubsection title="Category Image" className="sm:grid-cols-1">
              <div className="max-w-md">
                <ImageDropzone
                  value={form.image}
                  onChange={(file) => setForm((f) => ({ ...f, image: file }))}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>{form.image ? "1/1 images uploaded" : "0/1 images uploaded"}</p>
                  <p className="mt-0.5">Upload an image for this category (max 5MB)</p>
                </div>
              </div>
            </FormSubsection>

            <FormSubsection title="Sort Order" className="sm:grid-cols-1 border-0 p-0 pb-2">
              <div className="space-y-1.5 max-w-sm">
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className={FOCUS_GLOW}
                />
                <p className="text-[11px] text-muted-foreground">Lower numbers appear first</p>
              </div>
            </FormSubsection>

            <div className="flex items-center gap-3">
              <Switch
                id="cat-active"
                checked={form.active}
                onCheckedChange={(c) => setForm((f) => ({ ...f, active: c }))}
              />
              <div className="space-y-0.5">
                <Label htmlFor="cat-active" className="text-sm font-medium">Active</Label>
                <p className="text-xs text-muted-foreground">Inactive categories won't be visible in product listings</p>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Hierarchy Settings"
            description="Configure the category hierarchy and parent-child relationships"
            index={1}
          >
            <div className="space-y-1.5 max-w-xl">
              <Label>Parent Category</Label>
                <Select
                  value={form.parentId}
                  onValueChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
                >
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue placeholder="None (top-level)" />
                  </SelectTrigger>
                  <SelectContent>
                    {(data?.categories ?? []).map((c) => (
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
          idleLabel="Create Category"
          loadingLabel="Creating category…"
          successLabel="Category created"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
