import { useMemo, useState, type FormEvent } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Input, Label, Switch, Textarea, cn, toast } from "@abms/ui";
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
import { ImageDropzone } from "./image-dropzone";

const BRAND_CODES_QUERY = gql`
  query BrandCodesForNewBrand {
    brands {
      id
      code
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

const BRANDS_LIST_ROUTE = "/products/brands";

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

const EMPTY_FORM = {
  name: "",
  code: "",
  description: "",
  websiteUrl: "",
  logoUrl: "",
  active: true,
};

export default function NewBrandPage() {
  const { data } = useQuery<{
    brands: Array<{ id: string; code: string | null }>;
  }>(BRAND_CODES_QUERY);
  const [createBrand] = useMutation(CREATE_BRAND_MUTATION, {
    refetchQueries: ["Brands"],
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [nameError, setNameError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const existingCodes = useMemo(
    () =>
      new Set(
        (data?.brands ?? [])
          .map((b) => b.code?.trim().toLowerCase())
          .filter((c): c is string => !!c),
      ),
    [data],
  );

  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    BRANDS_LIST_ROUTE,
    dirty,
  );

  function validateUrlField() {
    const trimmed = form.websiteUrl.trim();
    if (trimmed && !isValidUrl(trimmed)) {
      setUrlError("Enter a valid URL, e.g. https://example.com");
    } else {
      setUrlError(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedCode = form.code.trim();
    const trimmedUrl = form.websiteUrl.trim();

    const nameInvalid = !trimmedName;
    const codeInvalid =
      !!trimmedCode && existingCodes.has(trimmedCode.toLowerCase());
    const urlInvalid = !!trimmedUrl && !isValidUrl(trimmedUrl);

    setNameError(nameInvalid ? "Brand name is required" : null);
    setCodeError(codeInvalid ? "A brand with this code already exists" : null);
    setUrlError(
      urlInvalid ? "Enter a valid URL, e.g. https://example.com" : null,
    );
    if (nameInvalid || codeInvalid || urlInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await createBrand({
        variables: {
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
      toast.success(`${trimmedName} created`);
      setStatus("success");
      holdSuccessThen(() => exitTo(BRANDS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message =
        err instanceof Error ? err.message : "Failed to create brand";
      if (/code/i.test(message)) setCodeError(message);
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
            { label: "All Brands", to: BRANDS_LIST_ROUTE },
            { label: "New Brand" },
          ]}
          title="Create Brand"
          subtitle="Add a new brand to organize your products"
          backLabel="Back to Brands"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="brand-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Brand Information"
            description="Enter the core details and basic information"
            index={0}
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
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className={FOCUS_GLOW}
                />
                {nameError ? (
                  <FieldError message={nameError} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    The display name for your brand
                  </p>
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
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        code: e.target.value.toUpperCase(),
                      }))
                    }
                    className={cn(FOCUS_GLOW, "flex-1")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((f) => ({ ...f, code: slugifyCode(f.name) }))
                    }
                    disabled={!form.name.trim()}
                    className={cn("shrink-0", BUTTON_PRESS)}
                  >
                    Auto
                  </Button>
                </div>
                {codeError ? (
                  <FieldError message={codeError} />
                ) : (
                  <p className="text-xs text-muted-foreground">
                    A short unique identifier for this brand
                  </p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="brand-description">Description</Label>
                <Textarea
                  id="brand-description"
                  placeholder="Optional short description"
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  className={cn(FOCUS_GLOW, "resize-none")}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 sm:col-span-2">
                <div>
                  <Label htmlFor="brand-active">Status</Label>
                  <p className="text-xs text-muted-foreground">
                    {form.active ? "Active" : "Inactive"}
                  </p>
                </div>
                <Switch
                  id="brand-active"
                  checked={form.active}
                  onCheckedChange={(active) =>
                    setForm((f) => ({ ...f, active }))
                  }
                />
              </div>
            </FormSubsection>
          </FormSection>

          <FormSection
            title="Branding"
            description="Customize the look and web presence for this brand"
            index={1}
          >
            <FormSubsection
              title="Brand Assets"
              description="Website and logo details"
            >
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="brand-website">Website URL</Label>
                <Input
                  id="brand-website"
                  type="url"
                  placeholder="https://example.com"
                  value={form.websiteUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, websiteUrl: e.target.value }))
                  }
                  onBlur={validateUrlField}
                  className={FOCUS_GLOW}
                />
                <FieldError message={urlError} />
              </div>
              <div className="sm:col-span-2">
                <ImageDropzone
                  label="Brand logo"
                  value={form.logoUrl}
                  onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))}
                  accept="image/png,image/jpeg"
                  maxBytes={5 * 1024 * 1024}
                  helpText="PNG or JPG, up to 5MB"
                  invalidTypeMessage="Please choose a PNG or JPG image"
                />
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} />
        <FormSubmitButton
          formId="brand-form"
          status={status}
          idleLabel="Create Brand"
          loadingLabel="Creating brand…"
          successLabel="Brand created"
          disabled={leaving}
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
