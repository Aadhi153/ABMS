import { Module } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { ProductsResolver } from "./products.resolver";
import { CategoriesService } from "./categories.service";
import { CategoriesResolver } from "./categories.resolver";
import { BrandsService } from "./brands.service";
import { BrandsResolver } from "./brands.resolver";
import { PricingTiersService } from "./pricing-tiers.service";
import { PricingTiersResolver } from "./pricing-tiers.resolver";
import { DiscountsService } from "./discounts.service";
import { DiscountsResolver } from "./discounts.resolver";
import { TaxRatesService } from "./tax-rates.service";
import { TaxRatesResolver } from "./tax-rates.resolver";
import { TaxGroupsService } from "./tax-groups.service";
import { TaxGroupsResolver } from "./tax-groups.resolver";
import { PriceListsService } from "./price-lists.service";
import { PriceListsResolver } from "./price-lists.resolver";

@Module({
  providers: [
    ProductsService,
    ProductsResolver,
    CategoriesService,
    CategoriesResolver,
    BrandsService,
    BrandsResolver,
    PricingTiersService,
    PricingTiersResolver,
    DiscountsService,
    DiscountsResolver,
    TaxRatesService,
    TaxRatesResolver,
    TaxGroupsService,
    TaxGroupsResolver,
    PriceListsService,
    PriceListsResolver,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
