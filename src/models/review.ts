import { Schema, model, Document, Types } from "mongoose";

interface IReview extends Document {
    property: Types.ObjectId;
    user: Types.ObjectId;
    rating: number;
    comment?: string;
    createdAt: Date;
}


const reviewSchema = new Schema({
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
    createdAt: { type: Date, default: Date.now },
});
export const Review = model<IReview>("Review", reviewSchema);
