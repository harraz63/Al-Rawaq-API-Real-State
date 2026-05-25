import { Schema, model, Document, Types } from "mongoose";


export interface IProperty extends Document {
    title: string;
    description: string;
    price: number;
    type: "apartment" | "villa" | "house" | "land" | "office";
    status: "available" | "sold" | "rented" | "pending" | "rejected";
    purpose: "sale" | "rent";

    location: {
        city: string;
        area: string;
        address: string;
        coordinates?: {
            lat: number;
            lng: number;
        };
    };

    images: { url: string }[];

    bedrooms?: number;
    bathrooms?: number;
    areaSize?: number;
    amenities?: string[];

    seller: Types.ObjectId; // Reference to User (the seller)

    details?: {
        view?: string;
        paymentMethod?: "cash" | "installments";
        advertiserType?: "owner" | "broker" | "developer";
        pricePerMeter?: number;
        listingCode?: string;
    };

    viewsCount?: number;
    favoritesCount?: number;

    createdAt?: Date;
    updatedAt?: Date;
}



const propertySchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        pricePerMeter: { type: Number, default: 0 },
        area: { type: Number, required: true, min: 0 },

        location: {
            street: { type: String },
            city: { type: String, required: true },
            governorate: {
                type: String,
                enum: ["القاهرة",
                    "الجيزة",
                    "الإسكندرية",
                    "المنوفية",
                    "الفيوم",
                    "أسوان",
                    "سوهاج",
                    "الأقصر",
                    "أسيوط",
                    "دمياط",
                    "بورسعيد",
                    "الإسماعيلية",
                    "البحيرة",
                    "المنصورة",
                    "كفر الشيخ"],
                default: "الإسكندرية",
            },
            coordinates: {
                lat: { type: Number },
                lng: { type: Number },
            },
        },

        images: [
            {
                path: { type: String, required: true },
                relativePath: { type: String, required: true },
            },
        ],

        purpose: {
            type: String,
            enum: ["sale", "rent"],
            required: true,
        },

        type: {
            type: String,
            enum: ["apartment", "villa", "house", "land", "office", "store"],
            required: true,
        },

        paymentMethod: {
            type: String,
            enum: ["cash", "installments", "bank-financing"],
            default: "cash",
        },

        advertiserType: {
            type: String,
            enum: ["owner", "broker", "developer"],
            default: "owner",
        },

        bedrooms: { type: Number, default: 0 },
        bathrooms: { type: Number, default: 0 },
        amenities: [{ type: String }],

        details: {
            view: { type: String },
            pricePerMeter: { type: Number },
            listingCode: { type: String },
        },

        views: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["available", "sold", "rented", "pending", "rejected"],
            default: "available",
        },

        listedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

        featuredOrder: {
            type: Number,
            min: 1,
            max: 8,
            default: null,
        },
    },
    { timestamps: true }
);

propertySchema.index({ featuredOrder: 1 }, { sparse: true });

export const Property = model("Property", propertySchema);
