import api from '../../../services/api'; // Adjust the path to where your axios instance is
 
/**
* Fetches dashboard data from the backend API
*/
export async function fetchDashboard() {
  try {
    const response = await api.get('/api/dashboard');
    return response.data; // This returns the payload from your backend
  } catch (error) {
    console.error('Failed to fetch dashboard:', error);
    throw error;
  }
}
 
/**
* Adapter: unwraps and normalizes dashboard data
*/
export function adaptDashboard(payload) {
  const d = payload?.data ?? {};
  const ov = d.overview ?? {};
  const rev = ov.revenue ?? {};
  const subs = ov.subscriptions ?? {};
  const traf = ov.traffic ?? {};
  const charts = d.charts ?? {};
 
  const toNumber = (v, def = 0) => {
    if (v === null || v === undefined) return def;
    const n = Number(v);
    return Number.isNaN(n) ? def : n;
  };
 
  return {
    overview: {
      users: {
        total: toNumber(ov.users?.total),
        newThisMonth: toNumber(ov.users?.newThisMonth),
      },
      subscriptions: {
        total: toNumber(subs.total),
        active: toNumber(subs.active),
        trialing: toNumber(subs.trialing),
        pastDue: toNumber(subs.pastDue),
        canceled: toNumber(subs.canceled),
        incomplete: toNumber(subs.incomplete),
      },
      revenue: {
        amountCents: rev.amountCents ?? null,
        count: toNumber(rev.count),
        period: rev.period || "month",
        growth: {
          currentMonth: toNumber(rev.growth?.currentMonth, null),
          lastMonth: toNumber(rev.growth?.lastMonth, null),
          growthPercent: toNumber(rev.growth?.growthPercent, 0),
        },
      },
      premiumCustomers: {
        total: toNumber(ov.premiumCustomers?.total),
        new: toNumber(ov.premiumCustomers?.new),
        churn: toNumber(ov.premiumCustomers?.churn),
      },
      proCustomers: {
        total: toNumber(ov.proCustomers?.total),
        new: toNumber(ov.proCustomers?.new),
        churn: toNumber(ov.proCustomers?.churn),
      },
      traffic: {
        today: traf.today ?? null,
        monthly: traf.monthly ?? null,
        quarterly: traf.quarterly ?? null,
      },
    },
    charts: {
      revenueTrend: (charts.revenueTrend ?? []).map(p => ({
        month: p.month || "",
        revenue: toNumber(p.revenue),
      })),
      trafficTrend: (charts.trafficTrend ?? []).map(p => ({
        month: p.month || "",
        traffic: toNumber(p.traffic),
      })),
    },
    recentSubscriptions: d.recentSubscriptions ?? [],
  };
}