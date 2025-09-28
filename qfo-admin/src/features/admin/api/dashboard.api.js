// // src/features/admin/api/dashboard.api.js

// // ---- TEMP MOCK: returns your dashboard payload without needing a backend ----
// export async function fetchDashboard() {
//     // simulate a small network delay so loading states show
//     await new Promise(r => setTimeout(r, 300));
  
//     return {
//       success: true,
//       message: "Mocked dashboard data",
//       statusCode: 200,
//       data: {
//         overview: {
//           users: { total: 42, newThisMonth: 5 },
//           subscriptions: {
//             total: 10, active: 7, trialing: 2, pastDue: 1, canceled: 0, incomplete: 0,
//           },
//           revenue: {
//             amountCents: 8240000, // $82,400
//             count: 12,
//             period: "month",
//             growth: { currentMonth: 8240000, lastMonth: 7000000, growthPercent: 12.4 },
//           },
//           premiumCustomers: { total: 3, new: 1, churn: 0 },
//           traffic: { today: 1280, monthly: 32140, quarterly: 91520 },
//         },
//         charts: {
//           revenueTrend: [
//             { month: "Apr", revenue: 7000 },
//             { month: "May", revenue: 8000 },
//             { month: "Jun", revenue: 10000 },
//             { month: "Jul", revenue: 12000 },
//             { month: "Aug", revenue: 14000 },
//             { month: "Sep", revenue: 15000 },
//           ],
//           trafficTrend: [
//             { month: "Apr", traffic: 5000 },
//             { month: "May", traffic: 10000 },
//             { month: "Jun", traffic: 15000 },
//             { month: "Jul", traffic: 20000 },
//             { month: "Aug", traffic: 25000 },
//             { month: "Sep", traffic: 30000 },
//           ],
//         },
//         recentSubscriptions: [
//           { id: "SUB-0012", userName: "Olivia Rhye", tier: "Premium", period: "Monthly", amountCents: 2900, status: "active" },
//           { id: "SUB-0013", userName: "James Doe", tier: "Standard", period: "Quarterly", amountCents: 5900, status: "past_due" },
//         ],
//       },
//     };
//   }
  
//   // ---- Adapter used by the hook; for now, just unwrap .data (keeps your UI API stable) ----
//   export function adaptDashboard(payload) {
//     return payload?.data ?? { overview: {}, charts: { revenueTrend: [], trafficTrend: [] }, recentSubscriptions: [] };
//   }
  

// If you have no backend yet, you can keep fetchDashboard mocked.
// When backend is ready, switch fetchDashboard to axios.get(...) and keep adaptDashboard as-is.

export async function fetchDashboard() {
    // Return the payload you pasted (or call your API and return res.data)
    return {
      success: true,
      message: "Dashboard data retrieved successfully",
      statusCode: 200,
      data: {
        overview: {
          users: { total: 0, newThisMonth: 0 },
          subscriptions: { total: 0, active: 0, trialing: 0, pastDue: 0, canceled: 0, incomplete: 0 },
          revenue: {
            amount: 0,
            amountCents: 0,
            count: 0,
            period: "month",
            growth: { currentMonth: 0, lastMonth: 0, growthPercent: "0.0" }
          },
          premiumCustomers: { total: 0, new: 0, churn: 0 },
          traffic: { today: 5, monthly: 6, quarterly: 6 }
        },
        charts: {
          revenueTrend: [
            { month: "Apr", revenue: 0 },
            { month: "May", revenue: 0 },
            { month: "June", revenue: 0 },
            { month: "July", revenue: 0 },
            { month: "Aug", revenue: 0 },
            { month: "Sept", revenue: 0 }
          ],
          trafficTrend: [
            { month: "Apr", traffic: 0 },
            { month: "May", traffic: 0 },
            { month: "June", traffic: 0 },
            { month: "July", traffic: 0 },
            { month: "Aug", traffic: 0 },
            { month: "Sept", traffic: 6 }
          ]
        },
        recentSubscriptions: []
      }
    };
  }
  
  // Adapter: unwraps and normalizes a few fields (e.g., growthPercent to number)
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
          amountCents: rev.amountCents ?? null,      // UI formats from cents
          count: toNumber(rev.count),
          period: rev.period || "month",
          growth: {
            currentMonth: toNumber(rev.growth?.currentMonth, null),
            lastMonth: toNumber(rev.growth?.lastMonth, null),
            growthPercent: toNumber(rev.growth?.growthPercent, 0), // "0.0" -> 0
          },
        },
        premiumCustomers: {
          total: toNumber(ov.premiumCustomers?.total),
          new: toNumber(ov.premiumCustomers?.new),
          churn: toNumber(ov.premiumCustomers?.churn),
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
  