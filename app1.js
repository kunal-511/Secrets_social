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

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
});
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
});

// userSchema.plugin(encrypt, { secret: secret, encryptedFields: ["password"] }); now using HASH so not required
userSchema.plugin(passportLocalMoongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
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
  const username = req.body.username;
  //const password = md5(req.body.password);
  const password = req.body.password;

  try {
    const foundUser = await User.findOne({ email: username }).exec(); // Using .exec() to execute the query

    //  if (foundUser && foundUser.password === password) {
    if (foundUser) {
      bcrypt.compare(
        req.body.password,
        foundUser.password,
        function (err, result) {
          if (result === true) {
            res.render("secrets");
          }
        }
      );
    } else {
      res.redirect("/login"); // Redirect if username or password is incorrect
    }
  } catch (err) {
    console.error(err);
    res.redirect("/login");
  }
});

app.listen(port, function () {
  console.log(`Server started on the port ${port}`);
});
