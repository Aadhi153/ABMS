import { useState, type FormEvent } from "react";
import { gql, useMutation } from "@apollo/client";
import { Receipt } from "lucide-react";
import { Input, Label, toast } from "@abms/ui";
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

const EXPENSES_LIST_ROUTE = "/accounts/expenses";

const CREATE_EXPENSE = gql`
  mutation CreateExpense($input: CreateExpenseInput!) {
    createExpense(input: $input) {
      id
    }
  }
`;

function emptyForm() {
  return { category: "", amount: "", date: new Date().toISOString().slice(0, 10), notes: "" };
}

export default function NewExpensePage() {
  const [createExpense] = useMutation(CREATE_EXPENSE, { refetchQueries: ["AccountsPageData"] });

  const [form, setForm] = useState(emptyForm);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const dirty = JSON.stringify(form) !== JSON.stringify(emptyForm());
  const { goBack, requestNavigate, leaving, exitTo, discardDialog } = useDiscardGuard(
    EXPENSES_LIST_ROUTE,
    dirty,
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const categoryInvalid = !form.category.trim();
    const amountInvalid = form.amount === "" || Number(form.amount) <= 0;
    setCategoryError(categoryInvalid ? "Category is required" : null);
    setAmountError(amountInvalid ? "Amount must be greater than 0" : null);
    if (categoryInvalid || amountInvalid) return;

    setSubmitError(null);
    setStatus("submitting");
    try {
      await createExpense({
        variables: {
          input: {
            category: form.category,
            amount: Number(form.amount),
            date: form.date,
            notes: form.notes || undefined,
          },
        },
      });
      toast.success("Expense recorded");
      setStatus("success");
      holdSuccessThen(() => exitTo(EXPENSES_LIST_ROUTE));
    } catch (err) {
      setStatus("idle");
      const message = err instanceof Error ? err.message : "Failed to record expense";
      setSubmitError(message);
      toast.error(message);
    }
  }

  return (
    <FormPage leaving={leaving}>
      <FormScrollArea>
        <FormPageHeader
          breadcrumb={[{ label: "Accounts", to: "/accounts" }, { label: "Expenses", to: EXPENSES_LIST_ROUTE }, { label: "New Expense" }]}
          title="Record Expense"
          subtitle="Add a manual expense entry — posted to the ledger automatically"
          backLabel="Back to Expenses"
          onBack={goBack}
          onNavigate={requestNavigate}
        />
        <FormErrorBanner message={submitError} />
        <form id="expense-form" onSubmit={handleSubmit} noValidate className="space-y-6">
          <FormSection
            title="Expense"
            description="What was spent, how much, and when"
            icon={<Receipt className="h-5 w-5" />}
            index={0}
          >
            <FormSubsection title="Details" description="Category and amount">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ex-category">
                  Category
                  <RequiredMark />
                </Label>
                <Input
                  id="ex-category"
                  required
                  placeholder="e.g. Rent, Utilities, Software"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={categoryError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-amount">
                  Amount
                  <RequiredMark />
                </Label>
                <Input
                  id="ex-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className={FOCUS_GLOW}
                />
                <FieldError message={amountError} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ex-date">
                  Date
                  <RequiredMark />
                </Label>
                <Input
                  id="ex-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className={FOCUS_GLOW}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ex-notes">Notes</Label>
                <Input
                  id="ex-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className={FOCUS_GLOW}
                />
              </div>
            </FormSubsection>
          </FormSection>
        </form>
      </FormScrollArea>

      <FormFooter>
        <FormCancelButton onClick={goBack} disabled={status !== "idle" || leaving} size="xs" />
        <FormSubmitButton
          formId="expense-form"
          status={status}
          idleLabel="Record Expense"
          loadingLabel="Recording…"
          successLabel="Expense recorded"
          disabled={leaving}
          size="xs"
        />
      </FormFooter>
      {discardDialog}
    </FormPage>
  );
}
