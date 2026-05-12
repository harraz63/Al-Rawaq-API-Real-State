import User from "../models/User";

import { Request, Response } from "express";
import { Property } from "../models/property";

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // عدد المستخدمين
        const usersCount = await User.countDocuments();

        // إجمالي العقارات
        const propertiesCount = await Property.countDocuments();

        // العقارات المتاحة
        const availableProperties = await Property.countDocuments({ status: "available" });

        // العقارات غير المتاحة (مباعة/مؤجرة)
        const soldOrRented = await Property.countDocuments({
            status: { $in: ["sold", "rented"] }
        });

        // عدد البلاغات
        // const reportsCount = await Report.countDocuments();

        // عقارات آخر 6 شهور (Analytics)
        const propertiesPerMonth = await Property.aggregate([
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // مستخدمين آخر 6 شهور
        const usersPerMonth = await User.aggregate([
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        return res.status(200).json({
            success: true,
            data: {
                usersCount,
                propertiesCount,
                availableProperties,
                soldOrRented,
                // reportsCount,
                propertiesPerMonth,
                usersPerMonth,
            },
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تحميل البيانات"
        });
    }
};


export const getAllUsers = async (req: Request, res: Response) => {
    try {
        // pagination
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // search
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

        return res.status(200).json({
            success: true,
            data: users,
            pagination: {
                totalUsers,
                page,
                totalPages: Math.ceil(totalUsers / limit),
            },
        });
    } catch (error) {
        console.error("Get Users Error:", error);
        return res.status(500).json({
            success: false,
            message: "حدث خطأ أثناء تحميل المستخدمين",
        });
    }
};




export const getAllPropertiesAdmin = async (req: Request, res: Response) => {
    try {
        const { search = "", page = 1, limit = 10 } = req.query;

        const skip = (Number(page) - 1) * Number(limit);

        const query: any = {};

        // لو عايز تبحث باسم المعلن أو العنوان أو المدينة
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: "i" } },
                { "location.city": { $regex: search, $options: "i" } },
                { "location.governorate": { $regex: search, $options: "i" } }
            ];
        }

        const total = await Property.countDocuments(query);

        const properties = await Property.find(query)
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: properties,
            pagination: {
                total,
                page: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
            }
        });

    } catch (err: any) {
        return res.status(500).json({ message: err.message });
    }
};
