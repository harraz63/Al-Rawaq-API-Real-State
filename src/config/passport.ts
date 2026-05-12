import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "../models/User";

dotenv.config();

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            callbackURL: process.env.GOOGLE_CALLBACK_URL!,
        },
        async (_accessToken, _refreshToken, profile: Profile, done) => {
            try {
                const email = profile.emails?.[0].value;

                if (!email) return done(new Error("No email found in Google profile"));

                let user = await User.findOne({ email });

                if (!user) {
                    user = await User.create({
                        name: profile.displayName,
                        email,
                        profilePicture: profile.photos?.[0]?.value,
                        isGoogleUser: true,
                    });
                }

                return done(null, user);
            } catch (err) {
                done(err, undefined);
            }
        }
    )
);

export default passport;
