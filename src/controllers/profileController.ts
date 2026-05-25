import { Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { AppError } from "../errors/app-error";
import { successResponse } from "../utils/api-response";
import User from "../models/User";
import cloudinary from "../utils/upload";

const getUserId = (req: any) => req.user?._id ?? req.user?.userId;

export const getMyProfile = asyncHandler(async (req: any, res: Response) => {
    const user = await User.findById(getUserId(req)).select(
        "-password -twoFAOtp -twoFAOtpExpires",
    );

    if (!user) {
        throw new AppError("User not found", 404);
    }

    return successResponse(res, 200, "Profile fetched successfully", user);
});

export const updateMyProfile = asyncHandler(async (req: any, res: Response) => {
    const allowedUpdates = {
        name: req.body.name,
        phoneNumber: req.body.phoneNumber,
        address: req.body.address,
    };

    const updates = Object.fromEntries(
        Object.entries(allowedUpdates).filter(([, value]) => value !== undefined),
    );

    const updatedUser = await User.findByIdAndUpdate(
        getUserId(req),
        updates,
        { new: true, runValidators: true },
    ).select("-password -twoFAOtp -twoFAOtpExpires");

    if (!updatedUser) {
        throw new AppError("User not found", 404);
    }

    return successResponse(res, 200, "Profile updated successfully", updatedUser);
});

export const updateMyProfilePicture = asyncHandler(async (req: any, res: Response) => {
    if (!req.file) {
        throw new AppError("No image uploaded", 400);
    }

    let url = req.file.path;

    if (!url) {
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = `data:${req.file.mimetype};base64,${b64}`;
        const result = await cloudinary.uploader.upload(dataURI, {
            folder: "profiles",
        });
        url = result.secure_url;
    }

    const updatedUser = await User.findByIdAndUpdate(
        getUserId(req),
        { profilePicture: url },
        { new: true },
    );

    if (!updatedUser) {
        throw new AppError("User not found", 404);
    }

    return successResponse(
        res,
        200,
        "Profile picture updated successfully",
        { profilePicture: url },
    );
});

export const changeMyPassword = asyncHandler(async (req: any, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(getUserId(req)).select("+password");
    if (!user) {
        throw new AppError("User not found", 404);
    }

    if (user.isGoogleUser) {
        throw new AppError("Google users cannot change password", 400);
    }

    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
        throw new AppError("Current password is incorrect", 400);
    }

    user.password = newPassword;
    await user.save();

    return successResponse(res, 200, "Password changed successfully", null);
});
