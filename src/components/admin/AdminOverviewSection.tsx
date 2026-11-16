import { AlertTriangle, CheckCircle2, Clock, FolderTree, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import type { AdminDashboardStats, Order } from '../../types/store';
import { ORDER_STATUS_META } from '../../utils/adminLogic';
import { formatEGP } from '../../utils/storeLogic';

interface AdminOverviewSectionProps {
  stats: AdminDashboardStats;
  onGoToOrders: () => void;
  onGoToInventory: () => void;
}

export function AdminOverviewSection({
  stats,
  onGoToOrders,
  onGoToInventory,
}: AdminOverviewSectionProps) {
  const maxSold = Math.max(
    1,
    ...stats.bestSellingProducts.map((p) => p.totalQuantity)
  );

  const kpiCards = [
    {
      label: 'إجمالي المبيعات',
      value: formatEGP(stats.totalRevenue, 'ar'),
      icon: TrendingUp,
      tone: 'text-[#0F5E36] bg-[#EEF5EE]',
    },
    {
      label: 'إجمالي الطلبات',
      value: String(stats.totalOrders),
      icon: ShoppingCart,
      tone: 'text-[#1E40AF] bg-[#DBEAFE]',
    },
    {
      label: 'طلبات قيد الانتظار',
      value: String(stats.pendingOrders),
      icon: Clock,
      tone: 'text-[#92400E] bg-[#FEF3C7]',
    },
    {
      label: 'الطلبات المكتملة',
      value: String(stats.completedOrders),
      icon: CheckCircle2,
      tone: 'text-[#166534] bg-[#DCFCE7]',
    },
    {
      label: 'إجمالي المنتجات',
      value: String(stats.totalProducts),
      icon: Package,
      tone: 'text-[#142218] bg-[#F1F4F0]',
    },
    {
      label: 'الأقسام المتاحة',
      value: String(stats.totalCategories),
      icon: FolderTree,
      tone: 'text-[#142218] bg-[#F1F4F0]',
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-[#E2E7E0] rounded-xl p-5 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-xs font-medium text-[#526056]">{card.label}</p>
                <p className="text-2xl font-bold text-[#142218] mt-1 tabular-nums">
                  {card.value}
                </p>
              </div>
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${card.tone}`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Best Selling + Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Best Selling Chart */}
        <div className="lg:col-span-7 bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#142218]">
              المنتجات الأكثر مبيعاً
            </h2>
            <span className="text-xs text-[#526056]">حسب الطلبات المؤكدة</span>
          </div>

          {stats.bestSellingProducts.length === 0 ? (
            <p className="text-sm text-[#526056] py-8 text-center">
              ستظهر إحصائيات المنتجات الأكثر مبيعاً تلقائياً عند وصول طلبات العملاء.
            </p>
          ) : (
            <div className="space-y-3.5">
              {stats.bestSellingProducts.map((item) => {
                const widthPct = Math.round((item.totalQuantity / maxSold) * 100);
                return (
                  <div key={item.productId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-[#142218] truncate">
                        {item.nameAr}
                      </span>
                      <span className="text-xs font-semibold text-[#526056] tabular-nums shrink-0">
                        {item.totalQuantity} وحدة · {formatEGP(item.totalSales, 'ar')}
                      </span>
                    </div>
                    <div className="h-2 bg-[#EEF2ED] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0F5E36] rounded-full"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Low Stock Alert Panel */}
        <div className="lg:col-span-5 bg-white border border-[#E2E7E0] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" aria-hidden="true" />
              <h2 className="font-display text-lg font-bold text-[#142218]">
                تنبيهات المخزون المنخفض
              </h2>
            </div>
            <button
              type="button"
              onClick={onGoToInventory}
              className="text-xs font-semibold text-[#0F5E36] hover:underline cursor-pointer"
            >
              إدارة المخزون
            </button>
          </div>

          {stats.lowStockProducts.length === 0 ? (
            <p className="text-sm text-[#0F5E36] py-8 text-center">
              جميع المنتجات متوفرة بكميات كافية حالياً.
            </p>
          ) : (
            <ul className="divide-y divide-[#EEF2ED] max-h-64 overflow-y-auto">
              {stats.lowStockProducts.slice(0, 8).map((prod) => (
                <li
                  key={prod.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-medium text-[#142218] truncate">
                    {prod.nameAr}
                  </span>
                  <span
                    className={`text-xs font-bold tabular-nums shrink-0 ${
                      prod.stock <= 0 ? 'text-[#B91C1C]' : 'text-[#B45309]'
                    }`}
                  >
                    {prod.stock <= 0 ? 'نفذت الكمية (0)' : `متبقي ${prod.stock}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white border border-[#E2E7E0] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E7E0] flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[#142218]">
            أحدث الطلبات الواردة
          </h2>
          <button
            type="button"
            onClick={onGoToOrders}
            className="text-xs font-semibold text-[#0F5E36] hover:underline cursor-pointer"
          >
            عرض كل الطلبات
          </button>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#526056]">
            لا توجد طلبات مسجلة حتى الآن.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-[#F9FAF8] text-xs text-[#526056] border-b border-[#E2E7E0]">
                <tr>
                  <th className="py-3 px-4 text-start font-semibold">رقم الطلب</th>
                  <th className="py-3 px-4 text-start font-semibold">العميل</th>
                  <th className="py-3 px-4 text-start font-semibold">الهاتف</th>
                  <th className="py-3 px-4 text-start font-semibold">الإجمالي</th>
                  <th className="py-3 px-4 text-start font-semibold">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2ED]">
                {stats.recentOrders.map((order: Order) => {
                  const meta = ORDER_STATUS_META[order.status];
                  return (
                    <tr key={order.orderNumber} className="hover:bg-[#F9FAF8]">
                      <td className="py-3 px-4 font-semibold tabular-nums" dir="ltr">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4">{order.customer.fullName}</td>
                      <td className="py-3 px-4 tabular-nums" dir="ltr">
                        {order.customer.phone}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0F5E36] tabular-nums">
                        {formatEGP(order.totalAmount, 'ar')}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-xs font-semibold px-2.5 py-1 rounded border ${meta.badgeClass}`}
                        >
                          {meta.ar}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
