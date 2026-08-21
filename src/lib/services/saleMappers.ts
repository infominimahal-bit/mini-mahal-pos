import {
  Sale,
} from '../../types';

export const mapSale = (item: any): Sale => ({
  ...item,
  invoiceNumber: item.invoice_number ?? item.invoiceNumber,
  customerId: item.customer_id ?? item.customerId,
  customerName: item.customer_name ?? item.customerName,
  customerPhone: item.customer_phone ?? item.customerPhone,
  discountAmount: item.discount_amount ?? item.discountAmount,
  taxAmount: item.tax_amount ?? item.taxAmount,
  billDiscountValue: item.bill_discount_value ?? item.billDiscountValue,
  billDiscountType: item.bill_discount_type ?? item.billDiscountType,
  paymentMethod: item.payment_method ?? item.paymentMethod,
  cardDetails: item.card_details ?? item.cardDetails,
  receiptNumber: item.receipt_number ?? item.receiptNumber,
  receivedAmount: item.received_amount ?? item.receivedAmount,
  changeAmount: item.change_amount ?? item.changeAmount,
  salesmanId: item.salesman_id ?? item.salesmanId,
  salesmanName: item.salesman_name ?? item.salesmanName,
  appliedDiscounts: item.applied_discounts ?? item.appliedDiscounts,
  freeGifts: item.free_gifts ?? item.freeGifts,
  saleDate: item.sale_date ?? item.saleDate,
  saleType: item.sale_type ?? item.saleType,
  extraCharges: item.extra_charges ?? item.extraCharges,
  splitPayments: item.split_payments ?? item.splitPayments,
  deletedAt: item.deleted_at ?? item.deletedAt,
  total: item.total ? Number(item.total) : 0,
  subtotal: item.subtotal ? Number(item.subtotal) : 0,
  deliveryAddress: item.delivery_address ?? item.deliveryAddress,
  deliveryFee: item.delivery_fee ? Number(item.delivery_fee) : (item.deliveryFee ? Number(item.deliveryFee) : 0),
  deliveryLocationLat: item.delivery_location_lat ?? item.deliveryLocationLat,
  deliveryLocationLng: item.delivery_location_lng ?? item.deliveryLocationLng,
  customerNotes: item.customer_notes ?? item.customerNotes,
  timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
  createdAt: item.created_at ? new Date(item.created_at) : new Date(item.createdAt),
  updatedAt: item.updated_at ? new Date(item.updated_at) : new Date(item.updatedAt)
});

// P26/P27: derive the PAYMENT_STATUS state machine from sale totals + status.
export const toRemoteSale = (s: Partial<Sale>) => {
  const remote: any = { ...s };
  if ('paymentStatus' in s) { remote.payment_status = s.paymentStatus; delete remote.paymentStatus; }
  if ('invoiceNumber' in s) { remote.invoice_number = s.invoiceNumber; delete remote.invoiceNumber; }
  if ('customerId' in s) { remote.customer_id = s.customerId; delete remote.customerId; }
  if ('customerName' in s) { remote.customer_name = s.customerName; delete remote.customerName; }
  if ('customerPhone' in s) { remote.customer_phone = s.customerPhone; delete remote.customerPhone; }
  if ('discountAmount' in s) { remote.discount_amount = s.discountAmount; delete remote.discountAmount; }
  if ('taxAmount' in s) { remote.tax_amount = s.taxAmount; delete remote.taxAmount; }
  if ('paymentMethod' in s) { remote.payment_method = s.paymentMethod; delete remote.paymentMethod; }
  if ('cardDetails' in s) { remote.card_details = s.cardDetails; delete remote.cardDetails; }
  if ('receiptNumber' in s) { remote.receipt_number = s.receiptNumber; delete remote.receiptNumber; }
  if ('receivedAmount' in s) { remote.received_amount = s.receivedAmount; delete remote.receivedAmount; }
  if ('changeAmount' in s) { remote.change_amount = s.changeAmount; delete remote.changeAmount; }
  if ('salesmanId' in s) { remote.salesman_id = s.salesmanId; delete remote.salesmanId; }
  if ('salesmanName' in s) { remote.salesman_name = s.salesmanName; delete remote.salesmanName; }
  if ('appliedDiscounts' in s) { remote.applied_discounts = s.appliedDiscounts; delete remote.appliedDiscounts; }
  if ('freeGifts' in s) { remote.free_gifts = s.freeGifts; delete remote.freeGifts; }
  if ('saleDate' in s) { remote.sale_date = s.saleDate; delete remote.saleDate; }
  if ('saleType' in s) { remote.sale_type = s.saleType; delete remote.saleType; }
  if ('billDiscountValue' in s) { remote.bill_discount_value = s.billDiscountValue; delete remote.billDiscountValue; }
  if ('billDiscountType' in s) { remote.bill_discount_type = s.billDiscountType; delete remote.billDiscountType; }
  if ('extraCharges' in s) { remote.extra_charges = s.extraCharges; delete remote.extraCharges; }
  if ('splitPayments' in s) { remote.split_payments = s.splitPayments; delete remote.splitPayments; }
  if ('deletedAt' in s) { remote.deleted_at = s.deletedAt; delete remote.deletedAt; }
  if ('deliveryAddress' in s) { remote.delivery_address = s.deliveryAddress; delete remote.deliveryAddress; }
  if ('deliveryFee' in s) { remote.delivery_fee = s.deliveryFee; delete remote.deliveryFee; }
  if ('deliveryLocationLat' in s) { remote.delivery_location_lat = s.deliveryLocationLat; delete remote.deliveryLocationLat; }
  if ('deliveryLocationLng' in s) { remote.delivery_location_lng = s.deliveryLocationLng; delete remote.deliveryLocationLng; }
  if ('customerNotes' in s) { remote.customer_notes = s.customerNotes; delete remote.customerNotes; }
  if ('deviceId' in s) { remote.device_id = s.deviceId; delete remote.deviceId; }
  if ('syncedAt' in s) { remote.synced_at = s.syncedAt instanceof Date ? s.syncedAt.toISOString() : s.syncedAt; delete remote.syncedAt; }
  if ('lastEditedBy' in s) { remote.last_edited_by = s.lastEditedBy || null; delete remote.lastEditedBy; }
  if ('lastEditedAt' in s) { remote.last_edited_at = s.lastEditedAt instanceof Date ? s.lastEditedAt.toISOString() : s.lastEditedAt; delete remote.lastEditedAt; }
  if ('editCount' in s) { remote.edit_count = s.editCount || 0; delete remote.editCount; }
  if ('salesmanId' in s) { remote.salesman_id = s.salesmanId; delete remote.salesmanId; }
  if ('salesmanName' in s) { remote.salesman_name = s.salesmanName; delete remote.salesmanName; }
  if ('cashierRole' in s) { remote.cashier_role = s.cashierRole; delete remote.cashierRole; }
  if (s.editedFromInvoice !== undefined) { remote.edited_from_invoice = s.editedFromInvoice; delete remote.editedFromInvoice; }
  if ('createdAt' in s) { remote.created_at = s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt; delete remote.createdAt; }
  if ('updatedAt' in s) { remote.updated_at = s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt; delete remote.updatedAt; }
  if ('timestamp' in s) {
    remote.timestamp = s.timestamp instanceof Date ? s.timestamp.toISOString() : s.timestamp;
  }
  return remote;
};
