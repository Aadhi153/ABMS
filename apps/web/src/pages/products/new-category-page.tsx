import { useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
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
  description: "",
  color: "",
  parentId: "",
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
          breadcrumb={[
            { label: "Products", to: "/products/all" },
            { label: "All Categories", to: "/products/categories" },
            { label: "New Category" },
          ]}
          title="Create Category"
          subtitle="Add a new category to organize your products"
          backLabel="Back to Categories"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="category-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Category Information"
            description="Enter the core details for this category"
            index={0}
          >
            <FormSubsection
              title="Basic Information"
              description="Name and description"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-name">
                  Name
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  placeholder="Optional short description"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>

          <FormSection
            title="Organization"
            description="Control where this category appears and how it's visually tagged"
            index={1}
          >
            <FormSubsection
              title="Hierarchy & Color"
              description="Optional parent category and color tag"
            >
              <div className="space-y-1.5">
                <Label>Parent category</Label>
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
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Choose color ${c}`}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          color: f.color === c ? "" : c,
                        }))
                      }
                      className={`h-6 w-6 rounded-full ${BUTTON_PRESS} ${form.color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} />
        <FormSubmitButton
          formId="category-form"
          status={status}
          idleLabel="Create Category"
          loadingLabel="Creating category…"
          successLabel="Category created"
          disabled={leaving}
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
