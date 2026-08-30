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
import NewCategoryPage from "./new-category-page";
import NewBrandPage from "./new-brand-page";
import NewPriceListPage from "./new-price-list-page";
import NewPricingTierPage from "./new-pricing-tier-page";
import NewDiscountPage from "./new-discount-page";
import NewTaxRatePage from "./new-tax-rate-page";

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
      <Route path="categories/new" element={<NewCategoryPage />} />
      <Route path="brands/new" element={<NewBrandPage />} />
      <Route path="price-lists/new" element={<NewPriceListPage />} />
      <Route path="pricing-tiers/new" element={<NewPricingTierPage />} />
      <Route path="discounts/new" element={<NewDiscountPage />} />
      <Route path="tax-rates/new" element={<NewTaxRatePage />} />
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
