// src/models/User.ts
import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcrypt";


export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: "admin" | "seller" | "buyer";
    profilePicture?: string;
    isEmailVerified: boolean;
    lastLogin?: Date;
    is2FAEnabled: boolean;
    twoFAOtp?: string;
    twoFAOtpExpires?: Date;
    isGoogleUser?: boolean;
    phoneNumber?: string;
    address?: string;
    favorites?: mongoose.Schema.Types.ObjectId[];

    // Methods
    comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserDocument extends Document {
    password?: string;
    isModified(field: string): boolean;
}

const userSchema = new Schema<IUser>({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: {
        type: String,
        required: function (this: any): boolean {
            return !this.isGoogleUser; // بس مطلوب لو مش Google user
        },
        select: false,
    },
    role: { type: String, required: true, default: "buyer" },
    profilePicture: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    lastLogin: { type: Date },
    is2FAEnabled: { type: Boolean, default: false },
    twoFAOtp: { type: String, select: false },
    twoFAOtpExpires: { type: Date, select: false },
    isGoogleUser: { type: Boolean, default: false },
    phoneNumber: String,
    address: String,
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Property" }],

});


// Hash password before saving

userSchema.pre<IUserDocument>("save", async function (next) {
    if (!this.password || !this.isModified("password")) return next();

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});
// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword: string) {
    return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>("User", userSchema);
