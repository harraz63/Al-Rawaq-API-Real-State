import mongoose from "mongoose";

const verificationSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        token: {
            type: String,
            required: true,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        purpose: {
            type: String,
            enum: ["email-verification", "reset-password", "refresh-token"],
            default: "email-verification",
        },
    },
    { timestamps: true }
);

const Verification = mongoose.model("Verification", verificationSchema);

export default Verification;
