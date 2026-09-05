import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@abms/ui";
import { apolloClient } from "./lib/apollo-client";
import { AuthProvider } from "./providers/auth-provider";
import { ThemeProvider } from "./providers/theme-provider";
import { LanguageProvider } from "./providers/language-provider";
import { ProtectedRoute } from "./routes/protected-route";
import { ModuleRoute } from "./routes/module-route";
import { RootRoute } from "./routes/root-route";
import { AppShell } from "./components/layout/app-shell";
import LoginPage from "./pages/login";
import SignupPage from "./pages/signup";
import InvitePage from "./pages/invite";
import ForgotPasswordPage from "./pages/forgot-password";
import ResetPasswordPage from "./pages/reset-password";
import CrmPage from "./pages/crm";
import CrmNewPage from "./pages/crm/new";
import ProductsPage from "./pages/products";
import InventoryPage from "./pages/inventory";
import NewAdjustmentPage from "./pages/inventory/new-adjustment-page";
import NewTransferPage from "./pages/inventory/new-transfer-page";
import SalesPage from "./pages/sales";
import NewSalesOrderPage from "./pages/sales/new-sales-order-page";
import NewQuotePage from "./pages/sales/new-quote-page";
import EditQuotePage from "./pages/sales/edit-quote-page";
import OrderDetailPage from "./pages/sales/order-detail-page";
import InvoiceDetailPage from "./pages/sales/invoice-detail-page";
import PurchasePage from "./pages/purchase";
import NewPurchaseOrderPage from "./pages/purchase/new-purchase-order-page";
import NewGrnPage from "./pages/purchase/new-grn-page";
import NewSupplierBillPage from "./pages/purchase/new-supplier-bill-page";
import NewDebitNotePage from "./pages/purchase/new-debit-note-page";
import CustomersPage from "./pages/customers";
import NewCustomerPage from "./pages/customers/new-customer-page";
import EditCustomerPage from "./pages/customers/edit-customer-page";
import SuppliersPage from "./pages/suppliers";
import NewSupplierPage from "./pages/suppliers/new-supplier-page";
import EditSupplierPage from "./pages/suppliers/edit-supplier-page";
import AccountsPage from "./pages/accounts";
import NewExpensePage from "./pages/accounts/new-expense-page";
import HrmsPage from "./pages/hrms";
import ReportsPage from "./pages/reports";
import SettingsPage from "./pages/settings";
import NewWarehousePage from "./pages/settings/new-warehouse-page";
import NewUserInvitePage from "./pages/settings/new-user-invite-page";
import ProfilePage from "./pages/profile";

export function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <AuthProvider>
              <Toaster richColors position="top-right" />
              <Routes>
                <Route path="/" element={<RootRoute />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/invite/:token" element={<InvitePage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route
                    path="/crm/new"
                    element={
                      <ModuleRoute module="crm">
                        <CrmNewPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/crm/*"
                    element={
                      <ModuleRoute module="crm">
                        <CrmPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/products/*"
                    element={
                      <ModuleRoute module="products">
                        <ProductsPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/inventory/adjustments/new"
                    element={
                      <ModuleRoute module="inventory">
                        <NewAdjustmentPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/inventory/transfers/new"
                    element={
                      <ModuleRoute module="inventory">
                        <NewTransferPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/inventory/*"
                    element={
                      <ModuleRoute module="inventory">
                        <InventoryPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/sales/new"
                    element={
                      <ModuleRoute module="sales">
                        <NewSalesOrderPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/sales/quotes/new"
                    element={
                      <ModuleRoute module="sales">
                        <NewQuotePage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/sales/quotes/edit/:id"
                    element={
                      <ModuleRoute module="sales">
                        <EditQuotePage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/sales/orders/:id"
                    element={
                      <ModuleRoute module="sales">
                        <OrderDetailPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/sales/invoices/:id"
                    element={
                      <ModuleRoute module="sales">
                        <InvoiceDetailPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/sales/*"
                    element={
                      <ModuleRoute module="sales">
                        <SalesPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/purchase/new"
                    element={
                      <ModuleRoute module="purchase">
                        <NewPurchaseOrderPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/purchase/orders/:id/receive"
                    element={
                      <ModuleRoute module="purchase">
                        <NewGrnPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/purchase/bills/new"
                    element={
                      <ModuleRoute module="purchase">
                        <NewSupplierBillPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/purchase/debitnotes/new"
                    element={
                      <ModuleRoute module="purchase">
                        <NewDebitNotePage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/purchase/*"
                    element={
                      <ModuleRoute module="purchase">
                        <PurchasePage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/customers/new"
                    element={
                      <ModuleRoute module="customers">
                        <NewCustomerPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/customers/edit/:id"
                    element={
                      <ModuleRoute module="customers">
                        <EditCustomerPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/customers/*"
                    element={
                      <ModuleRoute module="customers">
                        <CustomersPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/suppliers/new"
                    element={
                      <ModuleRoute module="suppliers">
                        <NewSupplierPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/suppliers/edit/:id"
                    element={
                      <ModuleRoute module="suppliers">
                        <EditSupplierPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/suppliers/*"
                    element={
                      <ModuleRoute module="suppliers">
                        <SuppliersPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/accounts/new"
                    element={
                      <ModuleRoute module="accounts">
                        <NewExpensePage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/accounts/*"
                    element={
                      <ModuleRoute module="accounts">
                        <AccountsPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/hrms/*"
                    element={
                      <ModuleRoute module="hrms">
                        <HrmsPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/reports/*"
                    element={
                      <ModuleRoute module="reports">
                        <ReportsPage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/settings/warehouses/new"
                    element={
                      <ModuleRoute module="settings">
                        <NewWarehousePage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/settings/users/invite"
                    element={
                      <ModuleRoute module="settings">
                        <NewUserInvitePage />
                      </ModuleRoute>
                    }
                  />
                  <Route
                    path="/settings/*"
                    element={
                      <ModuleRoute module="settings">
                        <SettingsPage />
                      </ModuleRoute>
                    }
                  />
                </Route>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}
