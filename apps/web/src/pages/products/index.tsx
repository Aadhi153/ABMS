import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AllProductsTab from "./all-products-tab";
import CategoriesTab from "./categories-tab";
import BrandsTab from "./brands-tab";
import PriceListsTab from "./price-lists-tab";
import PricingTiersTab from "./pricing-tiers-tab";
import DiscountsTab from "./discounts-tab";
import TaxRatesTab from "./tax-rates-tab";
import TaxGroupsTab from "./tax-groups-tab";
import NewProductPage from "./new-product-page";
import EditProductPage from "./edit-product-page";
import NewCategoryPage from "./new-category-page";
import EditCategoryPage from "./edit-category-page";
import NewBrandPage from "./new-brand-page";
import EditBrandPage from "./edit-brand-page";
import NewDiscountPage from "./new-discount-page";
import EditDiscountPage from "./edit-discount-page";
import NewTaxRatePage from "./new-tax-rate-page";
import EditTaxRatePage from "./edit-tax-rate-page";
import NewPriceListPage from "./new-price-list-page";
import EditPriceListPage from "./edit-price-list-page";
import NewTaxGroupPage from "./new-tax-group-page";
import EditTaxGroupPage from "./edit-tax-group-page";
import ProductDetailPage from "./product-detail-page";

const TABS = [
  { key: "all" },
  { key: "categories" },
  { key: "brands" },
  { key: "pricelist" },
  { key: "pricingtiers" },
  { key: "discounts" },
  { key: "taxrates" },
  { key: "taxgroups" },
] as const;

export default function ProductsPage() {
  return (
    <Routes>
      <Route path="new" element={<NewProductPage />} />
      <Route path="edit/:id" element={<EditProductPage />} />
      <Route path="categories/new" element={<NewCategoryPage />} />
      <Route path="categories/edit/:id" element={<EditCategoryPage />} />
      <Route path="brands/new" element={<NewBrandPage />} />
      <Route path="brands/edit/:id" element={<EditBrandPage />} />
      <Route path="discounts/new" element={<NewDiscountPage />} />
      <Route path="discounts/edit/:id" element={<EditDiscountPage />} />
      <Route path="tax-rates/new" element={<NewTaxRatePage />} />
      <Route path="tax-rates/edit/:id" element={<EditTaxRatePage />} />
      <Route path="pricelist/new" element={<NewPriceListPage />} />
      <Route path="pricelist/edit/:id" element={<EditPriceListPage />} />
      <Route path="taxgroups/new" element={<NewTaxGroupPage />} />
      <Route path="taxgroups/edit/:id" element={<EditTaxGroupPage />} />
      <Route path="view/:id" element={<ProductDetailPage />} />
      <Route path="*" element={<ProductsTabsShell />} />
    </Routes>
  );
}

function ProductsTabsShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const segment = location.pathname.split("/")[2];
  const tab = TABS.find((t) => t.key === segment)?.key ?? "all";

  useEffect(() => {
    if (!TABS.some((t) => t.key === segment)) {
      navigate(`/products/${tab}`, { replace: true });
    }
  }, [segment, tab, navigate]);

  return (
    <div className="space-y-6">
      {tab === "all" && <AllProductsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "brands" && <BrandsTab />}
      {tab === "pricelist" && <PriceListsTab />}
      {tab === "pricingtiers" && <PricingTiersTab />}
      {tab === "discounts" && <DiscountsTab />}
      {tab === "taxrates" && <TaxRatesTab />}
      {tab === "taxgroups" && <TaxGroupsTab />}
    </div>
  );
}
