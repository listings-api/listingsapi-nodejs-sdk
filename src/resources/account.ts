import type { HttpCore } from '../types/common.js';
import type {
  PlanSite,
  Country,
  Subscription,
  TemporaryCloseInput,
} from '../types/account.js';

export function createAccountMethods(http: HttpCore) {
  return {
    /**
     * Get supported directories and site details for your plan.
     */
    async fetchPlanSites(): Promise<PlanSite[]> {
      const data = await http.apiGet('plan-sites');
      return (data as any)?.data?.planSites ?? [];
    },

    /**
     * Get supported countries and states. Each country carries `hasCity`,
     * `stateRequired` and `hasPostalCode`, which tell you which address
     * fields a location in that country needs.
     */
    async fetchCountries(): Promise<Country[]> {
      const data = await http.apiGet('countries');
      return (data as any)?.data?.supportedCountries ?? [];
    },

    /**
     * Get active subscriptions for the account.
     */
    async fetchSubscriptions(): Promise<Subscription[]> {
      const data = await http.apiGet('subscriptions');
      return (data as any)?.data?.activeSubscriptions ?? [];
    },

    /**
     * Get business subcategories. Use the databaseId as subCategoryId when
     * creating locations.
     */
    async fetchSubcategories(): Promise<any[]> {
      const data = await http.apiGet('sub-categories');
      return (data as any)?.data?.subcategories ?? [];
    },

  };
}
