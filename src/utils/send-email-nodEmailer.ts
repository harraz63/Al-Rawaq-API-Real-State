
import nodemailer from "nodemailer"
import { Verify_Email_Template } from "../templates/email-templates";
import { config } from "../config/app-config";


export const sendEmailVerification = async (to: string, subject: string, verificationLink: string , name: string) => {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: config.SMTP_USER,
                pass: config.SMTP_PASS,
            },
        });


        const mailOptions = {
            from: `"Al-Rawaq State" <${config.SMTP_USER}>`,
            to,
            subject,
            html: Verify_Email_Template.replace(
                /{verificationLink}/g,
                verificationLink).replace(
                    "{userName}",
                    name
                )
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("✅ Email sent:", info.messageId);
        return true
    } catch (error) {
        console.log(error)
        return false
    }
}