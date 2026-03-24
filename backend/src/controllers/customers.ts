import { NextFunction, Request, Response } from 'express'
import { FilterQuery } from 'mongoose'
import sanitizeHtml from 'sanitize-html'
import escapeStringRegexp from 'escape-string-regexp'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order from '../models/order'
import User, { IUser } from '../models/user'
import { sanitizeObject } from '../utils/sanitize'
import ForbiddenError from '../errors/forbidden-error'

export const getCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!res.locals.user || !res.locals.user.roles.includes('admin')) {
            return next(new ForbiddenError('Доступ запрещен'))
        }
        const {
            page = 1,
            limit = 10,
            sortField = 'createdAt',
            sortOrder = 'desc',
            registrationDateFrom,
            registrationDateTo,
            lastOrderDateFrom,
            lastOrderDateTo,
            totalAmountFrom,
            totalAmountTo,
            orderCountFrom,
            orderCountTo,
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

        if (search && typeof search !== 'string') {
            return next(new BadRequestError('Некорректный поиск'))
        }

        const filters: FilterQuery<Partial<IUser>> = {}

        if (registrationDateFrom) {
            filters.createdAt = {
                ...filters.createdAt,
                $gte: new Date(registrationDateFrom as string),
            }
        }

        if (registrationDateTo) {
            const endOfDay = new Date(registrationDateTo as string)
            endOfDay.setHours(23, 59, 59, 999)
            filters.createdAt = {
                ...filters.createdAt,
                $lte: endOfDay,
            }
        }

        if (lastOrderDateFrom) {
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $gte: new Date(lastOrderDateFrom as string),
            }
        }

        if (lastOrderDateTo) {
            const endOfDay = new Date(lastOrderDateTo as string)
            endOfDay.setHours(23, 59, 59, 999)
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $lte: endOfDay,
            }
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

        if (orderCountFrom) {
            filters.orderCount = {
                ...filters.orderCount,
                $gte: Number(orderCountFrom),
            }
        }

        if (orderCountTo) {
            filters.orderCount = {
                ...filters.orderCount,
                $lte: Number(orderCountTo),
            }
        }

        if (search) {
            const safeSearch = escapeStringRegexp(search as string)
            const searchRegex = new RegExp(safeSearch, 'i')

            const orders = await Order.find(
                {
                    $or: [{ deliveryAddress: searchRegex }],
                },
                '_id'
            )

            const orderIds = orders.map((order) => order._id)

            filters.$or = [
                { name: searchRegex },
                { lastOrder: { $in: orderIds } },
            ]
        }

        const allowedSortFields = [
            'createdAt',
            'totalAmount',
            'orderCount',
            'lastOrderDate',
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

        const options = {
            sort,
            skip: (pageNumber - 1) * limitNumber,
            limit: limitNumber,
        }

        const users = await User.find(filters, null, options).populate([
            'orders',
            {
                path: 'lastOrder',
                populate: {
                    path: 'products',
                },
            },
            {
                path: 'lastOrder',
                populate: {
                    path: 'customer',
                },
            },
        ])

        const totalUsers = await User.countDocuments(filters)
        const totalPages = Math.ceil(totalUsers / limitNumber)

        res.status(200).json({
            customers: sanitizeObject(users),
            pagination: {
                totalUsers,
                totalPages,
                currentPage: pageNumber,
                pageSize: limitNumber,
            },
        })
    } catch (error) {
        next(error)
    }
}

export const getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await User.findById(req.params.id)
            .populate(['orders', 'lastOrder'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )

        res.status(200).json(sanitizeObject(user))
    } catch (error) {
        next(error)
    }
}

export const updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { name, email, phone } = req.body

        const cleanName = name ? sanitizeHtml(name) : undefined
        const cleanEmail = email
            ? sanitizeHtml(email).toLowerCase().trim()
            : undefined
        const cleanPhone = phone ? sanitizeHtml(phone) : undefined

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            {
                ...(cleanName && { name: cleanName }),
                ...(cleanEmail && { email: cleanEmail }),
                ...(cleanPhone && { phone: cleanPhone }),
            },
            {
                new: true,
                runValidators: true,
            }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )
            .populate(['orders', 'lastOrder'])

        res.status(200).json(sanitizeObject(updatedUser))
    } catch (error) {
        next(error)
    }
}

export const deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )

        res.status(200).json(sanitizeObject(deletedUser))
    } catch (error) {
        next(error)
    }
}
