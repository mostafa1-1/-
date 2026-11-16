import { useEffect, useState } from 'react';
import { Download, Eye, Mail, MessageCircle, Printer, Search, X } from 'lucide-react';
import type { Order, OrderNotificationRecord, OrderStatus } from '../../types/store';
import { adminApi } from '../../utils/adminApi';
import { formatOrdersCsv, ORDER_STATUS_META } from '../../utils/adminLogic';
import { formatEGP } from '../../utils/storeLogic';

interface AdminOrdersSectionProps {
  orders: Order[];
  notifications?: OrderNotificationRecord[];
  initialOrderNumber?: string | null;
  onClearInitialOrder?: () => void;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string, isError?: boolean) => void;
}

const ALL_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

export function AdminOrdersSection({
  orders,
  notifications = [],
  initialOrderNumber = null,
  onClearInitialOrder,
  onRefresh,
  onNotify,
}: AdminOrdersSectionProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrderNumber) {
      const match = orders.find((o) => o.orderNumber === initialOrderNumber);
      if (match) {
        setSelectedOrder(match);
      }
      onClearInitialOrder?.();
    }
  }, [initialOrderNumber, orders, onClearInitialOrder]);

  const filtered = orders.filter((o) => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customer.fullName.toLowerCase().includes(q) ||
        o.customer.phone.includes(q) ||
        o.customer.neighborhood.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStatusChange = async (orderNumber: string, status: OrderStatus) => {
    setUpdatingId(orderNumber);
    try {
      const updated = await adminApi.updateOrderStatus(orderNumber, status);
      if (selectedOrder?.orderNumber === orderNumber) {
        setSelectedOrder(updated);
      }
      await onRefresh();
      onNotify(`تم تحديث حالة الطلب ${orderNumber}`);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : 'تعذر تحديث الحالة', true);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCsv = () => {
    const csv = formatOrdersCsv(filtered, 'ar');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `andalus-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-[#526056] absolute top-1/2 -translate-y-1/2 start-3" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث برقم الطلب أو اسم العميل أو الهاتف..."
              className="w-full h-10 ps-9 pe-3 rounded-lg border border-[#D4DDD1] bg-white text-sm focus:outline-none focus:border-[#0F5E36]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-lg border border-[#D4DDD1] bg-white text-sm"
          >
            <option value="all">كل الحالات ({orders.length})</option>
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {ORDER_STATUS_META[st].ar}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#D4DDD1] bg-white hover:border-[#0F5E36] text-sm font-semibold text-[#142218] disabled:opacity-50 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#0F5E36]" />
          <span>تصدير CSV / Excel</span>
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white border border-[#E2E7E0] rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#526056]">
            لا توجد طلبات مطابقة للبحث الحالي.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
              <thead className="bg-[#F9FAF8] text-xs text-[#526056] border-b border-[#E2E7E0]">
                <tr>
                  <th className="py-3 px-4 text-start font-semibold">رقم الطلب</th>
                  <th className="py-3 px-4 text-start font-semibold">العميل</th>
                  <th className="py-3 px-4 text-start font-semibold">الهاتف والعنوان</th>
                  <th className="py-3 px-4 text-start font-semibold">الأصناف</th>
                  <th className="py-3 px-4 text-start font-semibold">الإجمالي</th>
                  <th className="py-3 px-4 text-start font-semibold">تحديث الحالة</th>
                  <th className="py-3 px-4 text-start font-semibold">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF2ED]">
                {filtered.map((order) => (
                  <tr key={order.orderNumber} className="hover:bg-[#F9FAF8]">
                    <td className="py-3 px-4 font-semibold tabular-nums" dir="ltr">
                      <div>{order.orderNumber}</div>
                      <div className="text-[11px] font-normal text-[#526056]">
                        {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-[#142218]">
                      {order.customer.fullName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="tabular-nums font-medium" dir="ltr">
                        {order.customer.phone}
                      </div>
                      <div className="text-xs text-[#526056] truncate max-w-[200px]">
                        {order.customer.neighborhood} — {order.customer.address}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[#526056] tabular-nums">
                      {order.items.reduce((sum, i) => sum + i.quantity, 0)} قطعة (
                      {order.items.length} صنف)
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0F5E36] tabular-nums">
                      {formatEGP(order.totalAmount, 'ar')}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={order.status}
                        disabled={updatingId === order.orderNumber}
                        onChange={(e) =>
                          handleStatusChange(
                            order.orderNumber,
                            e.target.value as OrderStatus
                          )
                        }
                        aria-label={`حالة الطلب ${order.orderNumber}`}
                        className={`h-9 px-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                          ORDER_STATUS_META[order.status].badgeClass
                        }`}
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-white text-[#142218]">
                            {ORDER_STATUS_META[st].ar} ({ORDER_STATUS_META[st].en})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#E2E7E0] hover:border-[#0F5E36] text-xs font-semibold text-[#142218] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>فاتورة</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 bg-[#142218]/45 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-[#E2E7E0] rounded-2xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E7E0] pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#142218]">
                  فاتورة الطلب{' '}
                  <span dir="ltr" className="tabular-nums">
                    {selectedOrder.orderNumber}
                  </span>
                </h3>
                <p className="text-xs text-[#526056]">
                  {new Date(selectedOrder.createdAt).toLocaleString('ar-EG')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="no-print p-2 rounded-lg hover:bg-[#F1F4F0] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-[#F9FAF8] border border-[#E2E7E0] rounded-xl p-4 text-sm space-y-1">
              <p>
                <strong>العميل:</strong> {selectedOrder.customer.fullName}
              </p>
              <p>
                <strong>الهاتف:</strong>{' '}
                <span dir="ltr">{selectedOrder.customer.phone}</span>
              </p>
              <p>
                <strong>العنوان:</strong> {selectedOrder.customer.neighborhood} —{' '}
                {selectedOrder.customer.address}
              </p>
              {selectedOrder.customer.instructions && (
                <p>
                  <strong>ملاحظات:</strong> {selectedOrder.customer.instructions}
                </p>
              )}
            </div>

            <div className="border border-[#E2E7E0] rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-[#F9FAF8] text-xs text-[#526056] border-b border-[#E2E7E0]">
                  <tr>
                    <th className="py-2.5 px-3 text-start">المنتج</th>
                    <th className="py-2.5 px-3 text-start">الكمية</th>
                    <th className="py-2.5 px-3 text-start">السعر</th>
                    <th className="py-2.5 px-3 text-start">الإجمالي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF2ED]">
                  {selectedOrder.items.map((item) => (
                    <tr key={item.productId}>
                      <td className="py-2.5 px-3 font-medium">{item.nameAr}</td>
                      <td className="py-2.5 px-3 tabular-nums">{item.quantity}</td>
                      <td className="py-2.5 px-3 tabular-nums">
                        {formatEGP(item.unitPrice, 'ar')}
                      </td>
                      <td className="py-2.5 px-3 font-semibold tabular-nums">
                        {formatEGP(item.lineTotal, 'ar')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-[#F9FAF8] p-4 border-t border-[#E2E7E0] space-y-1 text-sm">
                <div className="flex justify-between text-[#526056]">
                  <span>المجموع الفرعي</span>
                  <span className="tabular-nums">
                    {formatEGP(selectedOrder.subtotal, 'ar')}
                  </span>
                </div>
                <div className="flex justify-between text-[#526056]">
                  <span>رسوم التوصيل</span>
                  <span className="tabular-nums">
                    {formatEGP(selectedOrder.deliveryFee, 'ar')}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base text-[#0F5E36] pt-1 border-t border-[#E2E7E0]">
                  <span>الإجمالي المستحق عند الاستلام</span>
                  <span className="tabular-nums">
                    {formatEGP(selectedOrder.totalAmount, 'ar')}
                  </span>
                </div>
              </div>
            </div>

            {/* Notification delivery status for this order */}
            {notifications.filter((n) => n.orderNumber === selectedOrder.orderNumber).length >
              0 && (
              <div className="no-print bg-[#F9FAF8] border border-[#E2E7E0] rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-[#142218]">سجل إشعارات هذا الطلب</p>
                <div className="space-y-1.5 text-xs">
                  {notifications
                    .filter((n) => n.orderNumber === selectedOrder.orderNumber)
                    .map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start justify-between gap-2 text-[#526056]"
                      >
                        <span className="inline-flex items-center gap-1.5 font-medium text-[#142218]">
                          {n.channel === 'email' ? (
                            <Mail className="w-3.5 h-3.5 text-[#0F5E36]" />
                          ) : n.channel === 'whatsapp_cloud' ? (
                            <MessageCircle className="w-3.5 h-3.5 text-[#0F5E36]" />
                          ) : null}
                          {n.channel === 'in_app'
                            ? 'لوحة الإدارة الفورية'
                            : n.channel === 'email'
                            ? 'البريد الإلكتروني'
                            : 'WhatsApp Cloud API'}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            n.status === 'sent'
                              ? 'bg-[#DCFCE7] text-[#166534]'
                              : n.status === 'failed'
                              ? 'bg-[#FEE2E2] text-[#991B1B]'
                              : 'bg-[#FEF3C7] text-[#92400E]'
                          }`}
                        >
                          {n.status === 'sent'
                            ? 'تم الإرسال'
                            : n.status === 'failed'
                            ? 'فشل الإرسال'
                            : 'غير مفعّل بعد'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="no-print flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0F5E36] text-white text-sm font-semibold cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة الفاتورة</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
