import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import { config } from "./app-config";
import User from "../models/User";

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE.CLIENT_ID,
      clientSecret: config.GOOGLE.CLIENT_SECRET,
      callbackURL: config.GOOGLE.CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile: Profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("No email found in Google profile"), undefined);
        }

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name: profile.displayName,
            email,
            profilePicture: profile.photos?.[0]?.value,
            isGoogleUser: true,
            isEmailVerified: true,
            role: "buyer",
          });
        } else if (!user.isGoogleUser) {
          user.isGoogleUser = true;
          user.isEmailVerified = true;
          if (!user.profilePicture && profile.photos?.[0]?.value) {
            user.profilePicture = profile.photos[0].value;
          }
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        return done(err as Error, undefined);
      }
    },
  ),
);

export default passport;
