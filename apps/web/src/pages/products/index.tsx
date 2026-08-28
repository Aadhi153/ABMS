import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Boxes, DollarSign, Layers, Package, Percent, Tags, Landmark, Group } from "lucide-react";
import AllProductsTab from "./all-products-tab";
import CategoriesTab from "./categories-tab";
import BrandsTab from "./brands-tab";
import PriceListsTab from "./price-lists-tab";
import PricingTiersTab from "./pricing-tiers-tab";
import DiscountsTab from "./discounts-tab";
import TaxRatesTab from "./tax-rates-tab";
import TaxGroupsTab from "./tax-groups-tab";

const TABS = [
  { key: "all", label: "All Products", icon: Package },
  { key: "categories", label: "All Categories", icon: Layers },
  { key: "brands", label: "All Brands", icon: Tags },
  { key: "pricelist", label: "Price List", icon: DollarSign },
  { key: "pricingtiers", label: "Pricing Tiers", icon: Boxes },
  { key: "discounts", label: "Discounts", icon: Percent },
  { key: "taxrates", label: "Tax Rates", icon: Landmark },
  { key: "taxgroups", label: "Tax Groups", icon: Group },
] as const;

export default function ProductsPage() {
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <p className="text-sm text-muted-foreground">Catalog, categories, brands, pricing, and tax configuration.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => navigate(`/products/${t.key}`)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

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
