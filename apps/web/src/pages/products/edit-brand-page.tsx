import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Input, Label, Switch, cn, toast } from "@abms/ui";
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
import { BUTTON_PRESS, FOCUS_GLOW, holdSuccessThen } from "./form-motion";
import { ImageDropzone } from "./image-dropzone";

const BRANDS_LIST_ROUTE = "/products/brands";

const EDIT_BRAND_QUERY = gql`
  query EditBrandData($id: String!) {
    brand(id: $id) {
      id
      name
      code
      description
      websiteUrl
      logoUrl
      active
      productsCount
      createdAt
    }
    brands {
      id
      code
    }
  }
`;

const UPDATE_BRAND_MUTATION = gql`
  mutation UpdateBrandFull($id: String!, $input: UpdateBrandInput!) {
    updateBrand(id: $id, input: $input) {
      id
    }
  }
`;

const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[a-z]{2,}(:\d+)?(\/[^\s]*)?$/i;

function isValidUrl(value: string) {
  return URL_PATTERN.test(value.trim());
}

/** Derives a short unique-identifier-style code from a brand name, e.g. "Acme Corp" -> "ACME-CORP". */
function slugifyCode(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

interface FormState {
  name: string;
  code: string;
  description: string;
  websiteUrl: string;
  logoUrl: string;
  active: boolean;
}

interface BrandRecord {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  active: boolean;
  productsCount: number;
  createdAt: string;
}

function brandToFormState(b: BrandRecord): FormState {
  return {
    name: b.name,
    code: b.code ?? "",
    description: b.description ?? "",
    websiteUrl: b.websiteUrl ?? "",
    logoUrl: b.logoUrl ?? "",
    active: b.active,
  };
}

export default function EditBrandPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useQuery<{ brand: BrandRecord | null; brands: Array<{ id: string; code: string | null }> }>(
    EDIT_BRAND_QUERY,
    { variables: { id }, skip: !id },
  );
  const [updateBrand] = useMutation(UPDATE_BRAND_MUTATION, { refetchQueries: ["Brands"] });

  const [form, setForm] = useState<FormState | null>(null);
  const [initialForm, setInitialForm] = useState<FormState | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  useEffect(() => {
    if (data?.brand && !form) {
      const hydrated = brandToFormState(data.brand);
      setForm(hydrated);
      setInitialForm(hydrated);
    }
  }, [data, form]);

  const existingCodes = useMemo(
    () =>
      new Set(
        (data?.brands ?? [])
          .filter((b) => b.id !== id)
          .map((b) => b.code?.trim().toLowerCase())
          .filter((c): c is string => !!c),
      ),
    [data, id],
  );

  const dirty = !!form && !!initialForm && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(BRANDS_LIST_ROUTE, dirty);

  function validateUrlField() {
    if (!form) return;
    const trimmed = form.websiteUrl.trim();
    if (trimmed && !isValidUrl(trimmed)) {
      setUrlError("Enter a valid URL, e.g. https://example.com");
    } else {
      setUrlError(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !id) return;
    const trimmedName = form.name.trim();
    const trimmedCode = form.code.trim();
    const trimmedUrl = form.websiteUrl.trim();

    const nameInvalid = !trimmedName;
    const codeInvalid = !!trimmedCode && existingCodes.has(trimmedCode.toLowerCase());
    const urlInvalid = !!trimmedUrl && !isValidUrl(trimmedUrl);

    setNameError(nameInvalid ? "Brand name is required" : null);
    setCodeError(codeInvalid ? "A brand with this code already exists" : null);
    setUrlError(urlInvalid ? "Enter a valid URL, e.g. https://example.com" : null);
    if (nameInvalid || codeInvalid || urlInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await updateBrand({
        variables: {
          id,
          input: {
            name: trimmedName,
            code: trimmedCode || undefined,
            description: form.description.trim() || undefined,
            websiteUrl: trimmedUrl || undefined,
            logoUrl: form.logoUrl || undefined,
            active: form.active,
          },
        },
      });
      toast.success(`${trimmedName} updated`);
      setStatus("success");
      holdSuccessThen(() => exitTo(BRANDS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to update brand";
      if (/code/i.test(message)) setCodeError(message);
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

  if (!loading && !data?.brand) {
    return (
      <FormPage>
        <FormScrollArea>
          <FormPageHeader
            breadcrumb={[{ label: "Brands", to: BRANDS_LIST_ROUTE }, { label: "Not found" }]}
            title="Brand not found"
            backLabel="Back to Brands"
            onBack={goBack}
          />
        </FormScrollArea>
      </FormPage>
    );
  }

  if (!form || !data?.brand) return null;

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Brands", to: BRANDS_LIST_ROUTE }, { label: `Edit ${form.name}` }]}
          title="Edit Brand"
          subtitle="Update the brand details and logo"
          backLabel="Back to Brands"
          backPosition="right"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <FormSection title="Overview" description="Read-only summary for this brand" index={0}>
          <FormSubsection title="Stats" className="sm:grid-cols-3">
            <FormStat label="Products" value={data.brand.productsCount} />
            <FormStat label="Status" value={data.brand.active ? "Active" : "Inactive"} />
            <FormStat label="Created" value={new Date(data.brand.createdAt).toLocaleString()} />
          </FormSubsection>
        </FormSection>
        <form id="brand-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Brand Information"
            description="Update the core details and basic information"
            index={1}
          >
            <FormSubsection
              title="Basic Information"
              description="Enter the basic details and required information"
            >
              <div className="space-y-1.5">
                <Label htmlFor="brand-name">
                  Brand name
                  <RequiredMark />
                </Label>
                <Input
                  id="brand-name"
                  required
                  placeholder="Enter brand name"
                  value={form.name}
                  onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
                  className={FOCUS_GLOW}
                />
                {nameError ? (
                  <FieldError message={nameError} />
                ) : (
                  <p className="text-xs text-muted-foreground">The display name for your brand</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="brand-code">
                  Brand code
                  <RequiredMark />
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="brand-code"
                    placeholder="Enter brand code"
                    value={form.code}
                    onChange={(e) => setForm((f) => (f ? { ...f, code: e.target.value.toUpperCase() } : f))}
                    className={cn(FOCUS_GLOW, "flex-1")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setForm((f) => (f ? { ...f, code: slugifyCode(f.name) } : f))}
                    disabled={!form.name.trim()}
                    className={cn("shrink-0", BUTTON_PRESS)}
                  >
                    Auto
                  </Button>
                </div>
                {codeError ? (
                  <FieldError message={codeError} />
                ) : (
                  <p className="text-xs text-muted-foreground">A short unique identifier for this brand</p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="brand-website">Website URL</Label>
                <Input
                  id="brand-website"
                  type="url"
                  placeholder="https://example.com"
                  value={form.websiteUrl}
                  onChange={(e) => setForm((f) => (f ? { ...f, websiteUrl: e.target.value } : f))}
                  onBlur={validateUrlField}
                  className={FOCUS_GLOW}
                />
                <FieldError message={urlError} />
              </div>
            </FormSubsection>

            <FormSubsection title="Brand Logo" className="sm:grid-cols-1">
              <div className="max-w-md">
                <ImageDropzone
                  value={form.logoUrl}
                  onChange={(logoUrl) => setForm((f) => (f ? { ...f, logoUrl: logoUrl as string } : f))}
                  accept="image/png,image/jpeg"
                  maxBytes={5 * 1024 * 1024}
                  helpText="PNG or JPG, up to 5MB"
                  invalidTypeMessage="Please choose a PNG or JPG image"
                />
              </div>
            </FormSubsection>

            <div className="flex items-center gap-3">
              <Switch
                id="brand-active"
                checked={form.active}
                onCheckedChange={(active) => setForm((f) => (f ? { ...f, active } : f))}
              />
              <div className="space-y-0.5">
                <Label htmlFor="brand-active" className="text-sm font-medium">
                  Active
                </Label>
                <p className="text-xs text-muted-foreground">Inactive brands won't be visible in product listings</p>
              </div>
            </div>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="brand-form"
          status={status}
          idleLabel="Save changes"
          loadingLabel="Saving…"
          successLabel="Brand updated"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
