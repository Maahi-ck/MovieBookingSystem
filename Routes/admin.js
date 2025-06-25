


const express= require("express");
const router=express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const AppError = require("../AppError.js");
const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
 const db = require('../config/db');
const catchAsync = require("../catchAsync.js");

//admin


router.get('/login',(req,res)=>{
     res.render('./admin/login.ejs');
})

router.post('/login', catchAsync(async (req, res) => {
  const { email, password } = req.body;
    const [[admin]] = await db.query(`SELECT * FROM ADMIN WHERE EMAIL = ?`, [email]);
    if (!admin) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/admin/login');
    }

    const validPassword = await bcrypt.compare(password, admin.PASSWORD);
    if (!validPassword) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/admin/login');
    }
    
    // Set admin session
    req.session.admin = admin;
    req.flash('success', 'Logged in successfully');
    res.redirect('/admin/profile');
 
}));

router.use((req,res,next)=>{
       if(!req.session.admin){
            req.flash('error','Please login into your account');
            return res.redirect('/admin/login');
       }else{
        next(); 
       }
})

router.get('/logout',(req,res)=>{
     req.session.admin={};
    res.redirect('/admin/login');
})


router.get('/profile', catchAsync(async (req, res) => {
  
    const adminEmail = req.session.admin.EMAIL;
    const adminUsername = req.session.admin.ADMIN_NAME;

    
    const [requests] = await db.query(`
      SELECT HR.*, H.HOST_NAME
      FROM HOST_REQUESTS HR
      JOIN HOST H ON HR.HOST_ID = H.HOST_ID
      WHERE HR.STATUS = 'PENDING'
      ORDER BY HR.CREATED_AT 
    `);

    res.render('admin/profile.ejs', {
      adminEmail,
      adminUsername,
      requests
    });
 
}));

router.post('/requests/:id/approve', catchAsync(async (req, res) => {
  const requestId = req.params.id;
    const [[request]] = await db.query('SELECT * FROM HOST_REQUESTS WHERE REQUEST_ID = ?', [requestId]);

    if (!request) return res.status(404).send('Request not found');

    const details = request.DETAILS ? JSON.parse(request.DETAILS) : {};

    switch (request.REQUEST_TYPE) {
      case 'ADD_THEATRE':
        await db.query(
          `INSERT INTO THEATRE (THEATRE_NAME, THEATRE_HOST, CITY, STATE)
           VALUES (?, ?, ?, ?)`,
          [details.theatre_name, request.HOST_ID, details.city, details.state]
        );
        break;

      case 'ADD_SCREEN':
        await db.query(
          `INSERT INTO SCREEN (THEATRE_ID, CAPACITY)
           VALUES (?, ?)`,
          [details.theatre_id, details.capacity]
        );
        break;

      case 'ADD_SHOW':
        await db.query(
          `INSERT INTO SHOWS (SHOW_TIME, MOVIE_ID, SCREEN_ID)
           VALUES (?, ?, ?)`,
          [details.show_time, details.movie_id, details.screen_id]
        );
        break;

      case 'DELETE_THEATRE':
        await db.query('DELETE FROM THEATRE WHERE THEATRE_ID = ?', [request.TARGET_ID]);
        break;

      case 'DELETE_SCREEN':
        await db.query('DELETE FROM SCREEN WHERE SCREEN_ID = ?', [request.TARGET_ID]);
        break;

      case 'DELETE_SHOW':
        await db.query('DELETE FROM SHOWS WHERE SHOW_ID = ?', [request.TARGET_ID]);
        break;

      case 'UPDATE_THEATRE':
        await db.query(
          `UPDATE THEATRE SET THEATRE_NAME = ?, CITY = ?, STATE = ? WHERE THEATRE_ID = ?`,
          [details.theatre_name, details.city, details.state, request.TARGET_ID]
        );
        break;

      default:
        return res.status(400).send('Unknown request type');
    }

    await db.query('UPDATE HOST_REQUESTS SET STATUS = "APPROVED" WHERE REQUEST_ID = ?', [requestId]);
    res.redirect('/admin/profile');


}));


router.post('/requests/:id/reject', catchAsync(async (req, res) => {
  const requestId = req.params.id;
    await db.query('UPDATE HOST_REQUESTS SET STATUS = "REJECTED" WHERE REQUEST_ID = ?', [requestId]);
    res.redirect('/admin/profile');

}));


module.exports=router;