const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const db = require('../config/db');
const catchAsync = require("../catchAsync");

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

router.post('/setlocation', (req, res) => {
  const { city, state } = req.body;
  req.session.city = city;
  req.session.state = state;
  res.redirect('/movies');
})


router.get('/login', (req, res) => {
  res.render('./users/login.ejs', { dest: 'login' });
})

router.post('/login', catchAsync(async (req, res) => {
  const { email, password } = req.body;

    // Check if user with the given email exists
    const [[user]] = await db.query(`SELECT * FROM USERS WHERE EMAIL = ?`, [email]);

    if (!user) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/Users/login');
    }


    const result = await bcrypt.compare(password, user.PASSWORD);
    if (result == false) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/Users/login');
    }
     
    // Set session variables
     req.session.user=user;
    req.flash('success', 'LoggedIn Successfully');
    res.redirect('/movies');

}));


router.get('/Register', (req, res) => {
  res.render('./Users/login.ejs', { dest: 'register' });
})


router.post('/Register', catchAsync(async (req, res) => {
  const { email, password, confirmpassword } = req.body;

  if (!email || !password || !confirmpassword) {
    req.flash('error', "All fields are required.");
    return res.redirect('/Users/Register');
  }

  if (password !== confirmpassword) {
    req.flash('error', "Confirm your password Correctly");
    return res.redirect('/Users/Register');
  }

    // Check if email already exists
    const [existingUser] = await db.query("SELECT * FROM USERS WHERE EMAIL = ?", [email]);
    if (existingUser.length > 0) {
      req.flash('error', "Email already registered");
      return res.redirect('/Users/Register');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user with null USER_NAME
    await db.query(
      "INSERT INTO USERS (EMAIL, PASSWORD, USER_NAME) VALUES (?, ?, NULL)",
      [email, hashedPassword]
    );
    const [[user]] = await db.query(`SELECT * FROM USERS WHERE EMAIL = ?`, [email]);
    req.session.user=user;
    req.flash('success', "User registered successfully");
    res.redirect('/movies');

}));


// Step 1: Show Email/Username form
router.get('/forgot', (req, res) => {
  res.render('./users/forgot-password.ejs', { step: 'email' });
});

// Step 2: Submit email
router.post('/forgot', catchAsync(async (req, res) => {
  const { email } = req.body;

  const [[user]] = await db.query(
    `SELECT * FROM USERS WHERE EMAIL = ?`,
    [email]
  );

  if (!user) {
    req.flash('error', 'Invalid Email');
    return res.redirect('/Users/forgot');
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  req.session.otp = otp;
  req.session.email = email;
  let username=user.USER_NAME;
  if(!username){
    username=user.EMAIL;
  }
 
 
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Password Reset',
    text: `
Hi ${username},

Sorry to hear you’re having trouble logging into our site.

If this was you, here's your OTP code: ${otp}`,
  });

  res.render('./users/forgot-password.ejs', { step: 'otp', email });
}));

// Step 3: Verify OTP
router.post('/verifyotp', (req, res) => {
  if (!req.session.email) {
    return res.redirect('/Users/forgot');
  }

  const { otp } = req.body;

  if (otp === req.session.otp) {
    req.session.otp = null;
    res.render('./users/forgot-password.ejs', { step: 'success' });
  } else {
    res.render('./users/forgot-password.ejs', {
      step: 'error',
      email: req.session.email,
    });
  }
});

// Step 4: Reset password
router.post('/resetpassword', catchAsync(async (req, res) => {
  if (!req.session.email) {
    return res.redirect('/Users/forgot');
  }

  const { newpassword, confirmpassword } = req.body;

  if (newpassword !== confirmpassword) {
    return res.render('./users/forgot-password.ejs', {
      step: 'success',
      error: 'Confirm your password correctly',
    });
  }

  const hashedPassword = await bcrypt.hash(newpassword, 12);

  await db.query(
    `UPDATE USERS SET PASSWORD = ? WHERE EMAIL = ?`,
    [hashedPassword, req.session.email]
  );

  req.flash('success', 'Password reset successfully');
  res.redirect('/Users/login');
}));

// Middleware for checking login
router.use((req,res,next)=>{
       if(!req.session.user){
           req.flash('error','Please login into your account');
           return res.redirect('/Users/login');
       }else{
         next();
       }
})

router.get('/logout',(req,res)=>{
      req.session.user=undefined;
      req.flash('success','LoggedOut Successfully');
      res.redirect('/movies');
})


router.get('/Profile', catchAsync(async (req, res) => {
 
    const user = req.session.user;

    if (!user) {
      return res.redirect('/Users/login'); // Redirect if not logged in
    }

    // Group tickets by show and aggregate ticket data
    const [tickets] = await db.query(`
      SELECT 
        S.SHOW_ID,
        M.MOVIE_NAME,
        TH.THEATRE_NAME,
        SC.SCREEN_ID,
        S.SHOW_TIME,
        COUNT(T.TICKET_ID) AS TOTAL_TICKETS,
        SUM(T.PRICE) AS TOTAL_PRICE,
        GROUP_CONCAT(T.SEAT_NO ORDER BY T.SEAT_NO SEPARATOR ', ') AS SEAT_LIST
      FROM TICKET T
      JOIN SHOWS S ON T.SHOW_ID = S.SHOW_ID
      JOIN MOVIE M ON S.MOVIE_ID = M.MOVIE_ID
      JOIN SCREEN SC ON S.SCREEN_ID = SC.SCREEN_ID
      JOIN THEATRE TH ON SC.THEATRE_ID = TH.THEATRE_ID
      WHERE T.USER_ID = ?
      GROUP BY S.SHOW_ID
      ORDER BY S.SHOW_TIME DESC
    `, [user.USER_ID]);

    res.render('./users/profile.ejs', {
      user, 
      tickets
    });

}));


router.get('/Profile/settings',(req,res)=>{
    res.render('./users/settings.ejs');
})

router.delete('/Profile', catchAsync(async (req, res) => {

  const userId = req.session.user.USER_ID;   

    // Delete user
    await db.query('DELETE FROM users WHERE USER_ID = ?', [userId]);

  

    // Destroy session
    req.session.destroy(err => {
      if (err) {
        return res.status(500).send('Error deleting session');
      }
      res.clearCookie('connect.sid');
      res.redirect('/');
    });
}));

router.post('/Profile/settings', catchAsync(async (req, res) => {
   
        const { newusername, email, oldpassword, newpassword, confirmpassword } = req.body.user;

        const user = req.session.user;

        if (!email || !oldpassword) {
            req.flash('error', 'EMAIL AND PASSWORD ARE REQUIRED');
            return res.redirect('/Users/Profile/settings');
        }

        const isMatch = await bcrypt.compare(oldpassword, user.PASSWORD);
        if (!isMatch) {
            req.flash('error', 'INVALID PASSWORD');
            return res.redirect('/Users/Profile/settings');
        }

        let hashedPassword = user.PASSWORD;

        if (newpassword) {
            if (newpassword === confirmpassword) {
                hashedPassword = await bcrypt.hash(newpassword, 12);
            } else {
                req.flash('error', 'Confirm New Password Correctly');
                return res.redirect('/Users/Profile/settings');
            }
        }

        // Update in DB
        await db.query(
            'UPDATE USERS SET USER_NAME = ?, EMAIL = ?, PASSWORD = ? WHERE USER_ID = ?',
            [newusername, email, hashedPassword, user.USER_ID]
        );

        // Update session user
        req.session.user.USER_NAME = newusername;
        req.session.user.EMAIL = email;
        req.session.user.PASSWORD = hashedPassword;

        req.flash('success', 'Profile Updated Successfully');
        res.redirect('/Users/Profile');
}));



router.delete('/Tickets/Show/:showId', catchAsync(async (req, res) => {
  const { showId } = req.params;
  const user = req.session.user;

    // 1. Count how many tickets the user booked for this show
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM TICKET WHERE USER_ID = ? AND SHOW_ID = ?',
      [user.USER_ID, showId]
    );
    const ticketCount = result[0].count;
   
    if (ticketCount === 0) {
      req.flash('error', 'No bookings found to cancel.');
      return res.redirect('/Users/Profile');
    }

    // 2. Delete the user's tickets for the show
    await db.query(
      'DELETE FROM TICKET WHERE USER_ID = ? AND SHOW_ID = ?',
      [user.USER_ID, showId]
    );

    // 3. Update the TICKETS_BOOKED count in SHOWS
    await db.query(
      'UPDATE SHOWS SET TICKETS_BOOKED = TICKETS_BOOKED - ? WHERE SHOW_ID = ?',
      [ticketCount, showId]
    );



    req.flash('success', 'Booking cancelled successfully.');
    res.redirect('/Users/Profile');
}));




module.exports=router;