import { FILTER_ORDER_MAP } from '@constants'
import { OrderDataFromServer, OrderDataList } from '@slices/orders/type'
import { format } from 'date-fns'

export function adapterOrdersFromServer(
    orderData: OrderDataFromServer[]
): OrderDataList[] {
    return orderData.map((orderFromServer) => {
        const date = orderFromServer.createdAt
            ? new Date(orderFromServer.createdAt)
            : null

        return {
            key: orderFromServer._id,
            orderNumber: {
                title: `${orderFromServer.orderNumber}`,
                value: orderFromServer.orderNumber,
            },
            orderDate: {
                title:
                    date && !isNaN(date.getTime())
                        ? format(date, 'dd.MM.yyyy')
                        : '-',
                value: orderFromServer.createdAt,
            },
            status: {
                title: FILTER_ORDER_MAP[orderFromServer.status],
                value: orderFromServer.status,
            },
            totalAmount: {
                title: `${orderFromServer.totalAmount} синапсов`,
                value: orderFromServer.totalAmount,
            },
            productNames: orderFromServer.products.map(
                (product) => product.title
            ),
        }
    })
}
