import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Cerca per googleId
        let user = await User.findOne({ googleId: profile.id });

        // Se non esiste, cerca per email
        if (!user) {
          user = await User.findOne({ email: profile.emails[0].value });
        }

        // Se esiste, lo usa
        if (user) return done(null, user);

        // Altrimenti lo crea
        const newUser = await User.create({
          googleId: profile.id,
          email: profile.emails[0].value,
          nomeUtente: profile.name.givenName,
          cognomeUtente: profile.name.familyName,
        });

        return done(null, newUser);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  User.findById(id).then((user) => done(null, user));
});
