import { NextFunction, Request, Response } from 'express'
import { FilterQuery, Error as MongooseError, Types } from 'mongoose'
import sanitizeHtml from 'sanitize-html'
import escapeStringRegexp from 'escape-string-regexp'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order, { IOrder } from '../models/order'
import Product, { IProduct } from '../models/product'
import { sanitizeObject } from '../utils/sanitize'

export const getOrders = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (JSON.stringify(req.query).includes('$')) {
        return next(new BadRequestError('Запрещенные операторы'))
    }
    try {
        const {
            page = 1,
            limit = 10,
            sortField = 'createdAt',
            sortOrder = 'desc',
            status,
            totalAmountFrom,
            totalAmountTo,
            orderDateFrom,
            orderDateTo,
            search,
        } = req.query

        const pageNumber = Number(page)

        let limitNumber = Number(limit)

        if (Number.isNaN(limitNumber) || limitNumber <= 0) {
            limitNumber = 10
        }

        limitNumber = Math.min(limitNumber, 10)

        if (Number.isNaN(pageNumber) || Number.isNaN(limitNumber)) {
            return next(new BadRequestError('Некорректные параметры пагинации'))
        }

        if (search && typeof search === 'string' && search.length > 100) {
            return next(new BadRequestError('Слишком длинный поисковый запрос'))
        }

        const filters: FilterQuery<Partial<IOrder>> = {}

        if (typeof status === 'string') {
            const allowedStatuses = [
                'new',
                'cancelled',
                'completed',
                'delivering',
            ]

            if (!allowedStatuses.includes(status)) {
                return next(new BadRequestError('Недопустимый статус'))
            }

            filters.status = status
        }

        if (totalAmountFrom) {
            filters.totalAmount = {
                ...filters.totalAmount,
                $gte: Number(totalAmountFrom),
            }
        }

        if (totalAmountTo) {
            filters.totalAmount = {
                ...filters.totalAmount,
                $lte: Number(totalAmountTo),
            }
        }

        if (orderDateFrom) {
            filters.createdAt = {
                ...filters.createdAt,
                $gte: new Date(orderDateFrom as string),
            }
        }

        if (orderDateTo) {
            filters.createdAt = {
                ...filters.createdAt,
                $lte: new Date(orderDateTo as string),
            }
        }

        const allowedSortFields = [
            'createdAt',
            'totalAmount',
            'status',
            'orderNumber',
        ]
        const allowedSortOrders = ['asc', 'desc']

        if (!allowedSortFields.includes(sortField as string)) {
            return next(new BadRequestError('Недопустимое поле сортировки'))
        }

        if (!allowedSortOrders.includes(sortOrder as string)) {
            return next(new BadRequestError('Недопустимый порядок сортировки'))
        }

        const sort: { [key: string]: any } = {}
        sort[sortField as string] = sortOrder === 'desc' ? -1 : 1

        const aggregatePipeline: any[] = [
            { $match: filters },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products',
                    foreignField: '_id',
                    as: 'products',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            { $unwind: '$customer' },
            { $unwind: '$products' },
        ]

        if (search && typeof search === 'string') {
            const safeSearch = escapeStringRegexp(search as string)
            const searchRegex = new RegExp(`^${safeSearch}`, 'i')
            const searchNumber = Number(search)

            const searchConditions: any[] = [{ 'products.title': searchRegex }]

            if (!Number.isNaN(searchNumber)) {
                searchConditions.push({ orderNumber: searchNumber })
            }

            aggregatePipeline.push({
                $match: {
                    $or: searchConditions,
                },
            })

            filters.$or = searchConditions
        }

        aggregatePipeline.push(
            { $sort: sort },
            { $skip: (pageNumber - 1) * limitNumber },
            { $limit: limitNumber },
            {
                $group: {
                    _id: '$_id',
                    orderNumber: { $first: '$orderNumber' },
                    status: { $first: '$status' },
                    totalAmount: { $first: '$totalAmount' },
                    products: { $push: '$products' },
                    customer: { $first: '$customer' },
                    createdAt: { $first: '$createdAt' },
                },
            }
        )

        const orders = await Order.aggregate(aggregatePipeline)
        const totalOrders = await Order.countDocuments(filters)
        const totalPages = Math.ceil(totalOrders / limitNumber)

        res.status(200).json({
            orders: sanitizeObject(orders),
            pagination: {
                totalOrders,
                totalPages,
                currentPage: pageNumber,
                pageSize: limitNumber,
            },
        })
    } catch (error) {
        next(error)
    }
}

export const getOrdersCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const { search, page = 1, limit = 5 } = req.query

        if (search && typeof search === 'string' && search.length > 100) {
            return next(new BadRequestError('Слишком длинный поисковый запрос'))
        }

        const pageNumber = Number(page)
        const limitNumber = Number(limit)

        if (Number.isNaN(pageNumber) || Number.isNaN(limitNumber)) {
            return next(new BadRequestError('Некорректные параметры пагинации'))
        }

        const options = {
            skip: (pageNumber - 1) * limitNumber,
            limit: limitNumber,
        }

        const ordersRaw = await Order.find({
            customer: userId,
        })
            .populate(['products', 'customer'])
            .lean()

        let orders = ordersRaw

        if (search) {
            const safeSearch = escapeStringRegexp(search as string)
            const searchRegex = new RegExp(`^${safeSearch}`, 'i')
            const searchNumber = Number(search)

            const products = await Product.find({ title: searchRegex })
            const productIds = products.map((product) => product._id)

            orders = orders.filter((order) => {
                const matchesProduct = order.products.some((product) =>
                    productIds.some(
                        (id) => id.toString() === product._id.toString()
                    )
                )

                const matchesNumber =
                    !Number.isNaN(searchNumber) &&
                    order.orderNumber === searchNumber

                return matchesNumber || matchesProduct
            })
        }

        const totalOrders = orders.length
        const totalPages = Math.ceil(totalOrders / limitNumber)

        orders = orders.slice(options.skip, options.skip + options.limit)

        return res.send({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: pageNumber,
                pageSize: limitNumber,
            },
        })
    } catch (error) {
        next(error)
    }
}

export const getOrderByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const order = await Order.findOne({
            orderNumber: Number(req.params.orderNumber),
        })
            .populate(['customer', 'products'])
            .orFail(() => new NotFoundError('Заказ не найден'))

        return res.status(200).json(sanitizeObject(order))
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Невалидный ID заказа'))
        }
        return next(error)
    }
}

export const getOrderCurrentUserByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = res.locals.user._id
    try {
        const order = await Order.findOne({
            orderNumber: req.params.orderNumber,
        })
            .populate(['customer', 'products'])
            .orFail(() => new NotFoundError('Заказ не найден'))

        if (!order.customer._id.equals(userId)) {
            return next(new NotFoundError('Заказ не найден'))
        }

        return res.status(200).json(sanitizeObject(order))
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Невалидный ID заказа'))
        }
        return next(error)
    }
}

export const createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const basket: IProduct[] = []
        const products = await Product.find<IProduct>({})
        const userId = res.locals.user._id

        const { address, payment, phone, total, email, items, comment } =
            req.body

        const cleanAddress = sanitizeHtml(address || '')
        const cleanComment = sanitizeHtml(comment || '')
        const cleanEmail = sanitizeHtml(email || '')

        if (!cleanEmail) {
            return next(new BadRequestError('Некорректный email'))
        }

        if (!Array.isArray(items) || items.length === 0) {
            return next(new BadRequestError('Некорректный список товаров'))
        }

        items.forEach((id: Types.ObjectId) => {
            const product = products.find((p) => p._id.equals(id))
            if (!product) {
                throw new BadRequestError(`Товар с id ${id} не найден`)
            }
            if (product.price === null) {
                throw new BadRequestError(`Товар с id ${id} не продается`)
            }
            basket.push(product)
        })

        const totalBasket = basket.reduce((a, c) => a + c.price, 0)

        if (totalBasket !== total) {
            return next(new BadRequestError('Неверная сумма заказа'))
        }

        const newOrder = new Order({
            totalAmount: total,
            products: items,
            payment,
            phone,
            email: cleanEmail,
            comment: cleanComment,
            customer: userId,
            deliveryAddress: cleanAddress,
        })

        const populatedOrder = await newOrder.populate(['customer', 'products'])
        await populatedOrder.save()

        return res.status(200).json(sanitizeObject(populatedOrder))
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        return next(error)
    }
}

export const updateOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const allowedStatuses = ['new', 'cancelled', 'completed', 'delivering']
        const { status } = req.body

        if (!allowedStatuses.includes(status)) {
            return next(new BadRequestError('Недопустимый статус'))
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderNumber: req.params.orderNumber },
            { status },
            { new: true, runValidators: true }
        )
            .orFail(() => new NotFoundError('Заказ не найден'))
            .populate(['customer', 'products'])

        return res.status(200).json(sanitizeObject(updatedOrder))
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Невалидный ID заказа'))
        }
        return next(error)
    }
}

export const deleteOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedOrder = await Order.findByIdAndDelete(req.params.id)
            .orFail(() => new NotFoundError('Заказ не найден'))
            .populate(['customer', 'products'])

        return res.status(200).json(sanitizeObject(deletedOrder))
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Невалидный ID заказа'))
        }
        return next(error)
    }
}
