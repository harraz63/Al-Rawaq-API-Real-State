import { Request, Response } from "express";
import { Property } from "../models/property";
import { Types } from "mongoose";
import cloudinary from "../utils/upload";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../errors/app-error";
import { successResponse } from "../utils/api-response";

export const fetchRelatedProperties = async (
    currentId: Types.ObjectId,
    governorate: string,
    city: string,
    price: number,
    limit = 4,
) => {
    return Property.find({
        _id: { $ne: currentId },
        status: "available",
        $or: [
            { "location.governorate": governorate },
            { "location.city": city },
        ],
        price: {
            $gte: price * 0.7,
            $lte: price * 1.3,
        },
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate("listedBy", "name email profilePicture role")
        .lean();
};

export const createProperty = asyncHandler(async (req: any, res: Response) => {
    if (!["seller", "admin"].includes(req.user.role)) {
        throw new AppError("Access denied", 403);
    }

    const {
        title,
        description,
        price,
        type,
        purpose,
        location,
        bedrooms,
        bathrooms,
        areaSize,
        amenities,
        details,
        listedBy,
        advertiserType,
        status,
        area,
    } = req.body;

    console.log(req.body)

    console.log("listedBy========>", listedBy)

    const uploadedImages = [];
    for (const file of req.files as Express.Multer.File[]) {
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const result = await cloudinary.uploader.upload(dataURI, { folder: "properties" });

        uploadedImages.push({
            path: result.secure_url,
            relativePath: file.originalname,
        });
    }

    const parsedLocation =
        typeof location === "string" ? JSON.parse(location) : location;
    const parsedDetails =
        details
            ? typeof details === "string"
                ? JSON.parse(details)
                : details
            : undefined;

    const property = await Property.create({
        title,
        description,
        price,
        type,
        status,
        area,
        purpose,
        location: {
            governorate: parsedLocation.governorate,
            city: parsedLocation.city,
            street: parsedLocation.street,
            coordinates: {
                lat: parsedLocation.coordinates.lat,
                lng: parsedLocation.coordinates.lng,
            },
        },
        images: uploadedImages,
        bedrooms,
        bathrooms,
        areaSize,
        amenities,
        details: parsedDetails,
        listedBy,
        advertiserType,
    });

    return successResponse(res, 201, "Property created successfully", { property });
});

interface PropertyQuery {
    purpose?: string;
    type?: string;
    price?: {
        $gte?: number;
        $lte?: number;
    };
    "location.governorate"?: string;
    "location.city"?: string;
    "location.street"?: string;
    rooms?: string;
}

export const getFeaturedProperties = asyncHandler(async (_req: Request, res: Response) => {
    const properties = await Property.find({
        featuredOrder: { $ne: null },
        status: "available",
    })
        .sort({ featuredOrder: 1 })
        .limit(8)
        .populate("listedBy", "name email profilePicture role");

    return successResponse(
        res,
        200,
        "Featured properties fetched successfully",
        properties,
        { count: properties.length },
    );
});

export const getAllProperties = asyncHandler(async (req: Request, res: Response) => {
    const query: PropertyQuery = {};

    if (typeof req.query.location === "string" && req.query.location.trim() !== "") {
        const parts = req.query.location.split(",").map((p) => p.trim());
        if (parts[0]) query["location.governorate"] = parts[0];
        if (parts[1]) query["location.city"] = parts[1];
        if (parts[2]) query["location.street"] = parts[2];
    }

    if (typeof req.query.purpose === "string") {
        query.purpose = req.query.purpose;
    }

    if (typeof req.query.type === "string") {
        query.type = req.query.type;
    }

    if (typeof req.query.minPrice === "string" && req.query.minPrice.trim() !== "") {
        query.price = { ...query.price, $gte: Number(req.query.minPrice) };
    }
    if (typeof req.query.maxPrice === "string" && req.query.maxPrice.trim() !== "") {
        query.price = { ...query.price, $lte: Number(req.query.maxPrice) };
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const itemsPerPage = Math.min(50, Math.max(1, Number(req.query.limit) || 8));
    const skip = (page - 1) * itemsPerPage;

    const [totalItems, properties] = await Promise.all([
        Property.countDocuments(query),
        Property.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(itemsPerPage)
            .populate("listedBy", "name email profilePicture role"),
    ]);

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    return successResponse(
        res,
        200,
        "Properties fetched successfully",
        properties,
        {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
        },
    );
});

export const getPropertyById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!Types.ObjectId.isValid(id)) {
        throw new AppError("Invalid property ID", 400);
    }

    const property = await Property.findById(id).populate(
        "listedBy",
        "name email profilePicture role",
    );

    if (!property) {
        throw new AppError("Property not found", 404);
    }

    const relatedProperties = await fetchRelatedProperties(
        property._id as Types.ObjectId,
        property.location?.governorate ?? "",
        property.location?.city ?? "",
        property.price,
        4,
    );

    return successResponse(res, 200, "Property fetched successfully", {
        property,
        relatedProperties,
    });
});

export const getRecommendedProperties = asyncHandler(async (req: Request, res: Response) => {
    const { propertyId } = req.params;

    const currentProperty = await Property.findById(propertyId);

    if (!currentProperty) {
        throw new AppError("العقار غير موجود", 404);
    }

    const governorate = currentProperty.location?.governorate ?? null;
    const city = currentProperty.location?.city ?? null;

    const recommendations = await Property.aggregate([
        {
            $match: {
                _id: { $ne: currentProperty._id },
                status: "available",
            },
        },
        {
            $addFields: {
                score: {
                    $add: [
                        {
                            $cond: [
                                { $eq: ["$purpose", currentProperty.purpose] },
                                30,
                                0,
                            ],
                        },
                        {
                            $cond: [
                                { $eq: ["$type", currentProperty.type] },
                                25,
                                0,
                            ],
                        },
                        {
                            $cond: [
                                { $eq: ["$location.governorate", governorate] },
                                20,
                                0,
                            ],
                        },
                        {
                            $cond: [
                                { $eq: ["$location.city", city] },
                                15,
                                0,
                            ],
                        },
                        {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ["$price", currentProperty.price * 0.7] },
                                        { $lte: ["$price", currentProperty.price * 1.3] },
                                    ],
                                },
                                20,
                                {
                                    $cond: [
                                        {
                                            $and: [
                                                { $gte: ["$price", currentProperty.price * 0.5] },
                                                { $lte: ["$price", currentProperty.price * 1.5] },
                                            ],
                                        },
                                        10,
                                        0,
                                    ],
                                },
                            ],
                        },
                        {
                            $cond: [
                                {
                                    $and: [
                                        { $gte: ["$area", currentProperty.area * 0.7] },
                                        { $lte: ["$area", currentProperty.area * 1.3] },
                                    ],
                                },
                                15,
                                0,
                            ],
                        },
                        {
                            $cond: [
                                {
                                    $lte: [
                                        {
                                            $abs: {
                                                $subtract: [
                                                    "$bedrooms",
                                                    currentProperty.bedrooms || 0,
                                                ],
                                            },
                                        },
                                        1,
                                    ],
                                },
                                10,
                                0,
                            ],
                        },
                        {
                            $cond: [
                                { $eq: ["$paymentMethod", currentProperty.paymentMethod] },
                                5,
                                0,
                            ],
                        },
                    ],
                },
            },
        },
        {
            $sort: {
                score: -1,
                views: -1,
                createdAt: -1,
            },
        },
        {
            $limit: 4,
        },
        {
            $lookup: {
                from: "users",
                localField: "listedBy",
                foreignField: "_id",
                as: "seller",
            },
        },
        {
            $unwind: {
                path: "$seller",
                preserveNullAndEmptyArrays: true,
            },
        },
    ]);

    return successResponse(
        res,
        200,
        "Recommended properties fetched successfully",
        recommendations,
        { count: recommendations.length },
    );
});

export const updateProperty = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const property = await Property.findByIdAndUpdate(id, updates, { new: true });
    if (!property) {
        throw new AppError("Property not found", 404);
    }

    return successResponse(res, 200, "Property updated successfully", { property });
});

export const deleteProperty = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const property = await Property.findByIdAndDelete(id);
    if (!property) {
        throw new AppError("Property not found", 404);
    }

    return successResponse(res, 200, "Property deleted successfully");
});
