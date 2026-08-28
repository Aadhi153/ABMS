import { ApolloProvider } from "@apollo/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@abms/ui";
import { apolloClient } from "./lib/apollo-client";
import { AuthProvider } from "./providers/auth-provider";
import { ThemeProvider } from "./providers/theme-provider";
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
import SalesPage from "./pages/sales";
import PurchasePage from "./pages/purchase";
import CustomersPage from "./pages/customers";
import SuppliersPage from "./pages/suppliers";
import AccountsPage from "./pages/accounts";
import HrmsPage from "./pages/hrms";
import ReportsPage from "./pages/reports";
import SettingsPage from "./pages/settings";

export function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider>
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
                  path="/inventory/*"
                  element={
                    <ModuleRoute module="inventory">
                      <InventoryPage />
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
                  path="/purchase/*"
                  element={
                    <ModuleRoute module="purchase">
                      <PurchasePage />
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
                  path="/suppliers/*"
                  element={
                    <ModuleRoute module="suppliers">
                      <SuppliersPage />
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
      </ThemeProvider>
    </ApolloProvider>
  );
}
