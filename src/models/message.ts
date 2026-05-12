import { Schema, model, Document, Types } from "mongoose";

interface IMessage extends Document {
    property: Types.ObjectId;
    sender: Types.ObjectId;
    receiver: Types.ObjectId;
    content: string;
    isRead: boolean;
    createdAt: Date;
}

const messageSchema = new Schema({
    property: { type: Schema.Types.ObjectId, ref: "Property", required: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
});

export const Message = model<IMessage>("Message", messageSchema);