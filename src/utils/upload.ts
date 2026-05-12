import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// ✅ إعداد Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME!,
    api_key: process.env.CLOUDINARY_KEY!,
    api_secret: process.env.CLOUDINARY_SECRET!,
});

export default cloudinary

