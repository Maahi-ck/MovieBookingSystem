require('dotenv').config();
const path = require("path");
const express = require("express");
const app = express();
const nodemailer = require('nodemailer');
const port = process.env.PORT || 3000;
const db = require('./config/db');
const bcrypt = require("bcrypt");
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const methodOverride = require('method-override');
app.use(methodOverride('_method'));


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, '/public')));
const ejsMate = require("ejs-mate");
app.engine('ejs', ejsMate);
const AppError = require("./AppError.js");

const catchAsync = require("./catchAsync.js");
const flashMiddleWare = require('connect-flash');

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);


const sessionStore = new MySQLStore({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
});

const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'thisismysecret',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  }
};

app.use(session(sessionConfig));

app.use(flashMiddleWare());



app.use((req, res, next) => {
  res.locals.success = req.flash('success')[0];
  res.locals.error = req.flash('error')[0];
  res.locals.req = req;
  
  next();
})

const adminRoute=require('./Routes/admin.js');
const hostRoute=require('./Routes/host.js');
const moviesRoute=require("./Routes/movies.js");
const userRoute=require("./Routes/user.js");

app.use('/admin',adminRoute);
app.use('/host',hostRoute);
app.use('/Users',userRoute);
app.use('/movies',moviesRoute);



app.get('/', catchAsync(async (req, res, next) => {
  res.render('./Homepage.ejs');
}))

app.all(/(.*)/, (req, res) => {

  const err = new AppError();
  err.message = "The requested URL is not present on this server";
  res.render('ErrorPage.ejs', { err });
})


app.use((err, req, res, next) => {

  res.render('ErrorPage.ejs', { err })
})










