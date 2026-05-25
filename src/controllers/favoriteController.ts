import { Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../errors/app-error";
import { successResponse } from "../utils/api-response";
import User from "../models/User";
import { Property } from "../models/property";

const getUserId = (req: any) => req.user?._id ?? req.user?.userId;

export const addToFavorites = asyncHandler(async (req: any, res: Response) => {
    const { propertyId } = req.params;
    const userId = getUserId(req);

    const property = await Property.findById(propertyId);
    if (!property) {
        throw new AppError("Property not found", 404);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError("User not found", 404);
    }

    const alreadyFavorited = user.favorites?.some(
        (favorite) => favorite.toString() === propertyId,
    );

    if (alreadyFavorited) {
        throw new AppError("Property already in favorites", 400);
    }

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $addToSet: { favorites: propertyId } },
        { new: true },
    );

    return successResponse(
        res,
        200,
        "Property added to favorites",
        updatedUser?.favorites ?? [],
    );
});

export const removeFromFavorites = asyncHandler(async (req: any, res: Response) => {
    const { propertyId } = req.params;
    const userId = getUserId(req);

    const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $pull: { favorites: propertyId } },
        { new: true },
    );

    if (!updatedUser) {
        throw new AppError("User not found", 404);
    }

    return successResponse(
        res,
        200,
        "Property removed from favorites",
        updatedUser.favorites ?? [],
    );
});

export const getFavorites = asyncHandler(async (req: any, res: Response) => {
    const userId = getUserId(req);

    const user = await User.findById(userId).populate("favorites");
    if (!user) {
        throw new AppError("User not found", 404);
    }

    const favorites = user.favorites ?? [];

    return successResponse(
        res,
        200,
        "Favorites fetched successfully",
        favorites,
        { count: favorites.length },
    );
});
