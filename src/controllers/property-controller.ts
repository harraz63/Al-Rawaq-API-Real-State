import { Request, Response } from "express";
import { Property } from "../models/property";
import { Types } from "mongoose";
import cloudinary from "../utils/upload";

// إنشاء عقار جديد
export const createProperty = async (req: any, res: Response) => {
    try {
        console.log("req.body:", req.body); // لازم تشوف الحقول هنا
        console.log("req.files:", req.files); // الصور
        // ✅ السماح فقط لـ seller أو admin
        if (!["seller", "admin"].includes(req.user.role)) {
            return res.status(403).json({ message: "Access denied" });
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



        const uploadedImages = [];
        for (const file of req.files as Express.Multer.File[]) {
            const b64 = Buffer.from(file.buffer).toString("base64");
            const dataURI = `data:${file.mimetype};base64,${b64}`;
            const result = await cloudinary.uploader.upload(dataURI, { folder: "properties" });

            // احفظ ككائن
            uploadedImages.push({
                path: result.secure_url,         // URL النهائي
                relativePath: file.originalname  // أو أي قيمة تناسبك
            });
        }

        const parsedLocation = typeof req.body.location === "string" ? JSON.parse(req.body.location) : req.body.location;
        const parsedDetails = details ? JSON.parse(details) : undefined;





        // ✅ إنشاء العقار
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

                }
            }, // لو بتبعتها كـ string
            images: uploadedImages,
            bedrooms,
            bathrooms,
            areaSize,
            amenities,
            details: parsedDetails,
            listedBy,
            advertiserType,
        });

        return res.status(201).json({
            message: "Property created successfully",
            property,
        });
    } catch (error: any) {
        console.error("Error creating property:", error);
        return res.status(500).json({ message: error.message });
    }
};



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

export const getAllProperties = async (req: Request, res: Response) => {
    try {
        const query: PropertyQuery = {};

        if (typeof req.query.location === "string" && req.query.location.trim() !== "") {
            const parts = req.query.location.split(",").map((p) => p.trim());

            if (parts[0]) query["location.governorate"] = parts[0];
            if (parts[1]) query["location.city"] = parts[1];
            if (parts[2]) query["location.street"] = parts[2];
        }

        // if (req.query.location) {
        //     let locations: { governorate?: string; city?: string; street?: string }[] = [];

        //     if (typeof req.query.location === "string") {
        //         // محاولة تحويل الـ string ل JSON
        //         try {
        //             locations = JSON.parse(req.query.location);
        //         } catch {
        //             // fallback لو مش JSON
        //             const parts = req.query.location.split(",").map((p) => p.trim());
        //             locations = [{
        //                 governorate: parts[0],
        //                 city: parts[1],
        //                 street: parts[2],
        //             }];
        //         }
        //     } else if (Array.isArray(req.query.location)) {
        //         locations = req.query.location.map((loc) => JSON.parse(loc));
        //     }

        //     // إنشاء شرط $or لكل location
        //     if (locations.length > 0) {
        //         query.$or = locations.map((loc) => {
        //             const locQuery: any = {};
        //             if (loc.governorate) locQuery["location.governorate"] = loc.governorate;
        //             if (loc.city) locQuery["location.city"] = loc.city;
        //             if (loc.street) locQuery["location.street"] = loc.street;
        //             return locQuery;
        //         });
        //     }
        // }

        // purpose
        if (typeof req.query.purpose === "string") {
            query.purpose = req.query.purpose;
        }

        // type
        if (typeof req.query.type === "string") {
            query.type = req.query.type;
        }

        // price range
        if (typeof req.query.minPrice === "string" && req.query.minPrice.trim() !== "") {
            query.price = {
                ...query.price,
                $gte: Number(req.query.minPrice),
            };
        }

        if (typeof req.query.maxPrice === "string" && req.query.maxPrice.trim() !== "") {
            query.price = {
                ...query.price,
                $lte: Number(req.query.maxPrice),
            };
        }



        // Fetch properties
        const properties = await Property.find(query);
        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate, proxy-revalidate"
        );
        return res.status(200).json(properties);

    } catch (error) {
        return res.status(500).json({ message: (error as Error).message });
    }
};


// جلب عقار واحد حسب الـ ID
export const getPropertyById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid property ID" });

        const property = await Property.findById(id)
        if (!property) return res.status(404).json({ message: "Property not found" });

        res.status(200).json(property);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

export const getRecommendedProperties = async (req: Request, res: Response) => {
    try {
        const { propertyId } = req.params;

        // جلب العقار الحالي
        const currentProperty = await Property.findById(propertyId);

        if (!currentProperty) {
            return res.status(404).json({ message: "العقار غير موجود" });
        }

        const governorate = currentProperty.location?.governorate ?? null;
        const city = currentProperty.location?.city ?? null;


        // نظام النقاط (Scoring System)
        const recommendations = await Property.aggregate([
            {
                // استبعاد العقار الحالي
                $match: {
                    _id: { $ne: currentProperty._id },
                    status: "available" // فقط العقارات المتاحة
                }
            },
            {
                $addFields: {
                    score: {
                        $add: [
                            // 1. نفس الغرض (بيع/إيجار) - 30 نقطة
                            {
                                $cond: [
                                    { $eq: ["$purpose", currentProperty.purpose] },
                                    30,
                                    0
                                ]
                            },

                            // 2. نفس النوع (شقة/فيلا/محل) - 25 نقطة
                            {
                                $cond: [
                                    { $eq: ["$type", currentProperty.type] },
                                    25,
                                    0
                                ]
                            },

                            // 3. نفس المحافظة - 20 نقطة
                            {
                                $cond: [
                                    { $eq: ["$location.governorate", governorate] },
                                    20,
                                    0
                                ]
                            },

                            // 4. نفس المدينة - 15 نقطة إضافية
                            {
                                $cond: [
                                    { $eq: ["$location.city", city] },
                                    15,
                                    0
                                ]
                            },

                            // 5. السعر قريب (±30%) - حتى 20 نقطة
                            {
                                $cond: [
                                    {
                                        $and: [
                                            { $gte: ["$price", currentProperty.price * 0.7] },
                                            { $lte: ["$price", currentProperty.price * 1.3] }
                                        ]
                                    },
                                    20,
                                    {
                                        $cond: [
                                            {
                                                $and: [
                                                    { $gte: ["$price", currentProperty.price * 0.5] },
                                                    { $lte: ["$price", currentProperty.price * 1.5] }
                                                ]
                                            },
                                            10,
                                            0
                                        ]
                                    }
                                ]
                            },

                            // 6. المساحة قريبة (±30%) - حتى 15 نقطة
                            {
                                $cond: [
                                    {
                                        $and: [
                                            { $gte: ["$area", currentProperty.area * 0.7] },
                                            { $lte: ["$area", currentProperty.area * 1.3] }
                                        ]
                                    },
                                    15,
                                    0
                                ]
                            },

                            // 7. عدد الغرف متقارب - 10 نقاط
                            {
                                $cond: [
                                    {
                                        $lte: [
                                            { $abs: { $subtract: ["$bedrooms", currentProperty.bedrooms || 0] } },
                                            1
                                        ]
                                    },
                                    10,
                                    0
                                ]
                            },

                            // 8. نفس طريقة الدفع - 5 نقاط
                            {
                                $cond: [
                                    { $eq: ["$paymentMethod", currentProperty.paymentMethod] },
                                    5,
                                    0
                                ]
                            }
                        ]
                    }
                }
            },
            {
                // ترتيب حسب النقاط ثم عدد المشاهدات
                $sort: {
                    score: -1,
                    views: -1,
                    createdAt: -1
                }
            },
            {
                $limit: 4
            },
            {
                // Populate معلومات صاحب الإعلان
                $lookup: {
                    from: "users",
                    localField: "listedBy",
                    foreignField: "_id",
                    as: "seller"
                }
            },
            {
                $unwind: {
                    path: "$seller",
                    preserveNullAndEmptyArrays: true
                }
            }
        ]);



        return res.status(200).json(recommendations);

    } catch (error) {
        return res.status(500).json({ message: (error as Error).message });
    }
};

// تعديل عقار
export const updateProperty = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const property = await Property.findByIdAndUpdate(id, updates, { new: true });
        if (!property) return res.status(404).json({ message: "Property not found" });

        res.status(200).json({ message: "Property updated successfully", property });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// حذف عقار
export const deleteProperty = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const property = await Property.findByIdAndDelete(id);
        if (!property) return res.status(404).json({ message: "Property not found" });

        res.status(200).json({ message: "Property deleted successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
