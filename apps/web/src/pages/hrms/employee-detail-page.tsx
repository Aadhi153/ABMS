import { useParams } from "react-router-dom";
import { FormPage } from "../products/form-page";
import { usePageTransition } from "../products/form-motion";
import { EmployeeEditContent } from "./employee-edit-content";

const EMPLOYEES_ROUTE = "/hrms/employees";

export default function EmployeeDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { leaving, goWithExit } = usePageTransition();

  return (
    <div className="-m-3 min-h-full bg-background p-3 sm:-m-5 sm:p-5">
      <FormPage leaving={leaving}>
        <div className="mx-auto w-full max-w-5xl">
          <EmployeeEditContent
            id={id}
            onBack={() => goWithExit(EMPLOYEES_ROUTE)}
            backLabel="Back"
            breadcrumbBase={[{ label: "HRMS", to: EMPLOYEES_ROUTE }, { label: "Employee Management", to: EMPLOYEES_ROUTE }]}
            onNavigateBreadcrumb={goWithExit}
          />
        </div>
      </FormPage>
    </div>
  );
}
