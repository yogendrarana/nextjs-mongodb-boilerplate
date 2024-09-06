import React from 'react'
import { OrderSchemaType } from '@/constants/types'
import OrderTable from '@/components/table/order/order-table'

const data: OrderSchemaType[] = [
  {
    id: "12345",
    customerName: "John Doe",
    email: "john.doe@example.com",
    orderDate: "2024-09-01T10:30:00.000Z",
    amount: 99.99,
    paymentMethod: "credit_card",
    status: "processing",
    items: 3,
    trackingNumber: "1Z999AA10123456784",
  },
  {
    id: "12346",
    customerName: "Jane Smith",
    email: "jane.smith@example.com",
    orderDate: "2024-09-02T14:45:00.000Z",
    amount: 249.49,
    paymentMethod: "paypal",
    status: "pending",
    items: 2,
    trackingNumber: null,
  },
  {
    id: "12347",
    customerName: "Alice Johnson",
    email: "alice.johnson@example.com",
    orderDate: "2024-09-03T09:15:00.000Z",
    amount: 159.75,
    paymentMethod: "bank_transfer",
    status: "success",
    items: 1,
    trackingNumber: "1Z999BB20234567890",
  },
  {
    id: "12348",
    customerName: "Bob Brown",
    email: "bob.brown@example.com",
    orderDate: "2024-09-04T11:00:00.000Z",
    amount: 89.99,
    paymentMethod: "cash_on_delivery",
    status: "failed",
    items: 4,
    trackingNumber: null,
  }

]

const OrdersPage = () => {
  return (
    <OrderTable data={data} />
  )
}

export default OrdersPage;