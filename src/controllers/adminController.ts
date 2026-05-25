import User from "../models/User";

import { Request, Response } from "express";
import { Types } from "mongoose";
import type { UpdateManyModel, UpdateOneModel } from "mongoose";
import { Property } from "../models/property";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../errors/app-error";
import { successResponse } from "../utils/api-response";

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
    const usersCount = await User.countDocuments();
    const propertiesCount = await Property.countDocuments();
    const availableProperties = await Property.countDocuments({ status: "available" });
    const soldOrRented = await Property.countDocuments({
        status: { $in: ["sold", "rented"] },
    });

    const propertiesPerMonth = await Property.aggregate([
        {
            $group: {
                _id: { $month: "$createdAt" },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    const usersPerMonth = await User.aggregate([
        {
            $group: {
                _id: { $month: "$createdAt" },
                count: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return successResponse(res, 200, "Dashboard stats fetched successfully", {
        usersCount,
        propertiesCount,
        availableProperties,
        soldOrRented,
        propertiesPerMonth,
        usersPerMonth,
    });
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";

    const query = search
        ? {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } },
            ],
        }
        : {};

    const totalUsers = await User.countDocuments(query);

    const users = await User.find(query)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    return successResponse(
        res,
        200,
        "Users fetched successfully",
        users,
        {
            totalUsers,
            page,
            totalPages: Math.ceil(totalUsers / limit),
        },
    );
});

export const getAllPropertiesAdmin = asyncHandler(async (req: Request, res: Response) => {
    const { search = "", page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const query: Record<string, unknown> = {};

    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { "location.city": { $regex: search, $options: "i" } },
            { "location.governorate": { $regex: search, $options: "i" } },
        ];
    }

    const total = await Property.countDocuments(query);

    const properties = await Property.find(query)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

    return successResponse(
        res,
        200,
        "Properties fetched successfully",
        properties,
        {
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit)),
        },
    );
});

export const updatePropertyStatus = asyncHandler(async (req: Request, res: Response) => {
    const property = await Property.findById(req.params.id);

    if (!property) {
        throw new AppError("Property not found", 404);
    }

    property.status = req.body.status;
    const updatedProperty = await property.save();

    return successResponse(
        res,
        200,
        "Property status updated successfully",
        updatedProperty,
    );
});

export const setFeaturedProperties = asyncHandler(async (req: Request, res: Response) => {
    const { propertyIds } = req.body as { propertyIds: string[] };

    if (!Array.isArray(propertyIds) || propertyIds.length === 0) {
        throw new AppError("propertyIds must be a non-empty array", 400);
    }

    if (propertyIds.length > 8) {
        throw new AppError("You can feature at most 8 properties", 400);
    }

    const uniqueIds = [...new Set(propertyIds)];
    if (uniqueIds.length !== propertyIds.length) {
        throw new AppError("Duplicate property IDs are not allowed", 400);
    }

    const invalidId = uniqueIds.find((id) => !Types.ObjectId.isValid(id));
    if (invalidId) {
        throw new AppError(`Invalid property ID: ${invalidId}`, 400);
    }

    const existingProperties = await Property.find({
        _id: { $in: uniqueIds },
    }).select("_id status");

    if (existingProperties.length !== uniqueIds.length) {
        throw new AppError("One or more properties were not found", 404);
    }

    const unavailablePropertyIds = existingProperties
        .filter((property) => property.status !== "available")
        .map((property) => property._id.toString());

    if (unavailablePropertyIds.length > 0) {
        throw new AppError(
            `Only available properties can be featured. Invalid property IDs: ${unavailablePropertyIds.join(", ")}`,
            400,
        );
    }

    const unsetFeaturedOrdersOperation: { updateMany: UpdateManyModel } = {
        updateMany: {
            filter: { featuredOrder: { $ne: null } },
            update: { $unset: { featuredOrder: 1 } },
        },
    };

    const setFeaturedOrderOperations: Array<{ updateOne: UpdateOneModel }> = uniqueIds.map(
        (propertyId, index) => ({
            updateOne: {
                filter: { _id: propertyId },
                update: { $set: { featuredOrder: index + 1 } },
            },
        }),
    );

    await Property.bulkWrite([
        unsetFeaturedOrdersOperation,
        ...setFeaturedOrderOperations,
    ]);

    const properties = await Property.find({
        featuredOrder: { $ne: null },
    })
        .sort({ featuredOrder: 1 })
        .limit(8);

    return successResponse(
        res,
        200,
        "Featured properties updated successfully",
        properties,
        { count: properties.length },
    );
});
