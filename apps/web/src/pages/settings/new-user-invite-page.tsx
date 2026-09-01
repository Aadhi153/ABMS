import { useState, type FormEvent } from "react";
import { gql, useMutation } from "@apollo/client";
import { UserPlus } from "lucide-react";
import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, toast } from "@abms/ui";
import { ALL_ROLES, ROLE_LABELS, Role } from "@abms/shared";
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
} from "../products/form-page";
import { FOCUS_GLOW, holdSuccessThen } from "../products/form-motion";

const USERS_LIST_ROUTE = "/settings/users";

const INVITE_USER_MUTATION = gql`
  mutation InviteUser($input: InviteUserInput!) {
    inviteUser(input: $input) {
      id
      email
      role
    }
  }
`;

const EMPTY_FORM = { email: "", role: Role.SALES };

export default function NewUserInvitePage() {
  const [inviteUser] = useMutation(INVITE_USER_MUTATION, { refetchQueries: ["PendingInvites"] });

  const [form, setForm] = useState(EMPTY_FORM);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    USERS_LIST_ROUTE,
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const emailInvalid = !form.email.trim();
    setEmailError(emailInvalid ? "Email is required" : null);
    if (emailInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await inviteUser({ variables: { input: form } });
      toast.success(`Invite sent to ${form.email}`);
      setStatus("success");
      holdSuccessThen(() => exitTo(USERS_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to send invite";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Settings", to: "/settings" }, { label: "Users & Teams", to: USERS_LIST_ROUTE }, { label: "Invite User" }]}
          title="Invite User"
          subtitle="Send an email invite — they set their own password"
          backLabel="Back to Users"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="invite-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Invite"
            description="Who to invite and what access they should have"
            icon={<UserPlus className="h-5 w-5" />}
            index={0}
          >
            <FormSubsection title="Details" description="Email and role">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="invite-email">
                  Email
                  <RequiredMark />
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={emailError} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(role) => setForm((f) => ({ ...f, role: role as Role }))}>
                  <SelectTrigger className={FOCUS_GLOW}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="invite-form"
          status={status}
          idleLabel="Send Invite"
          loadingLabel="Sending…"
          successLabel="Invite sent"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
