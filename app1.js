import dotenv from "dotenv";
dotenv.config();
//import md5 from "md5";
// import bcrypt from "bcrypt";
import express from "express";
import bodyParser from "body-parser";
import ejs from "ejs";
import mongoose, { Mongoose } from "mongoose";
import session from "express-session";
import passport from "passport";
import passportLocalMoongoose from "passport-local-mongoose";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import findOrCreate from "mongoose-findorcreate";
// GoogleStrategy.Strategy();
//import encrypt from "mongoose-encryption"; now using HASH so not required

const port = 3000;
const app = express();
//console.log(process.env.API_KEY);
const secret = process.env.SECRET;
// const saltRounds = 10;

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] }); now using HASH so not required
userSchema.plugin(passportLocalMoongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const strategy = new GoogleStrategy(
  {
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
  },
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
);

passport.use(strategy);

app.get("/", (req, res) => {
  res.render("home");
});
app.get("/auth/google", (req, res) => {
  passport.authenticate("google", { scope: ["profile"] });
});
app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout(req.user, (err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

app.post("/register", async (req, res) => {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/login", async (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(port, function () {
  console.log(`Server started on the port ${port}`);
});
