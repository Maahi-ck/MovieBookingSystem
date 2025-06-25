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

// GET: Host login page
router.get('/login', (req, res) => {
  res.render('./host/login.ejs');
});

// POST: Host login authentication
router.post('/login', catchAsync(async (req, res) => {
  const { email, password } = req.body;

    const [[host]] = await db.query(`SELECT * FROM HOST WHERE EMAIL = ?`, [email]);
    if (!host) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/host/login');
    }

    const validPassword = await bcrypt.compare(password, host.PASSWORD);
    if (!validPassword) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/host/login');
    }

    // Set host session
    req.session.host = host;
    req.flash('success', 'Logged in successfully');
    res.redirect('/host/theatres');
}));

router.use( (req,res,next)=>{
      if(!req.session.host){
            req.flash('error','Please login into your account');
            return res.redirect('/host/login');
      }else{
         next();
      }
})

// GET: Host profile page with host info & requests
router.get('/profile', catchAsync(async (req, res) => {
 
    const hostId = req.session.host.HOST_ID;

    // Fetch host info
    const [[host]] = await db.query(
      'SELECT HOST_NAME, EMAIL AS HOST_EMAIL FROM HOST WHERE HOST_ID = ?',
      [hostId]
    );
    if (!host) return res.status(404).send('Host not found');
    

    // Fetch all requests of this host, newest first
    const [requests] = await db.query(
      `SELECT REQUEST_ID, REQUEST_TYPE, TARGET_ID, DETAILS, COMMENT, STATUS, CREATED_AT
       FROM HOST_REQUESTS
       WHERE HOST_ID = ?
       ORDER BY CREATED_AT DESC`,
      [hostId]
    );

    res.render('host/profile', { host, requests });
}));

// POST: Cancel a pending request (set STATUS = 'CANCELLED')
router.post('/request/:id/cancel', catchAsync(async (req, res) => {
 
    const requestId = req.params.id;
    await db.query(
      `UPDATE HOST_REQUESTS
       SET STATUS = 'CANCELLED'
       WHERE REQUEST_ID = ? AND STATUS = 'PENDING'`,
      [requestId]
    );
    res.redirect('/host/profile');
 
}));

// GET: Request detail page
router.get('/request/:id', catchAsync(async (req, res) => {
  
    const requestId = req.params.id;
    const [[request]] = await db.query('SELECT * FROM HOST_REQUESTS WHERE REQUEST_ID = ?', [requestId]);

    if (!request || request.HOST_ID !== req.session.host.HOST_ID) {
      return res.status(403).send('Access Denied');
    }

    const details = request.DETAILS ? JSON.parse(request.DETAILS) : {};
    res.render('host/request-detail', { request, details });
 
}));

// GET: List of theatres owned by host, with screens & shows
router.get('/theatres', catchAsync(async (req, res) => {
 
    const hostId = req.session.host.HOST_ID;

    const [theatres] = await db.query(`SELECT * FROM THEATRE WHERE THEATRE_HOST = ?`, [hostId]);

    const theatreData = await Promise.all(theatres.map(async theatre => {
      const [screens] = await db.query('SELECT * FROM SCREEN WHERE THEATRE_ID = ?', [theatre.THEATRE_ID]);
      const [shows] = await db.query(`
        SELECT SHOWS.*, MOVIE.MOVIE_NAME 
        FROM SHOWS 
        JOIN SCREEN ON SHOWS.SCREEN_ID = SCREEN.SCREEN_ID 
        JOIN MOVIE ON SHOWS.MOVIE_ID = MOVIE.MOVIE_ID
        WHERE SCREEN.THEATRE_ID = ?
      `, [theatre.THEATRE_ID]);

      shows.forEach(show => {
        show.SHOW_TIME_FORMATTED = new Date(show.SHOW_TIME).toLocaleString();
      });

      return {
        ...theatre,
        screens,
        shows
      };
    }));

    res.render('./host/index.ejs', { theatres: theatreData });
 
}));

// POST: Request to delete a theatre
router.post('/request/delete-theatre/:theatreId', catchAsync(async (req, res) => {
 
    const { theatreId } = req.params;
    const hostId = req.session.host.HOST_ID;

    const [theatre] = await db.query(
      'SELECT * FROM THEATRE WHERE THEATRE_ID = ? AND THEATRE_HOST = ?',
      [theatreId, hostId]
    );

    if (!theatre.length) return res.status(403).send('Unauthorized');

    await db.query(
      'INSERT INTO HOST_REQUESTS (HOST_ID, REQUEST_TYPE, TARGET_ID) VALUES (?, ?, ?)',
      [hostId, 'DELETE_THEATRE', theatreId]
    );

    res.redirect('/host/theatres');
 
}));

// POST: Request to delete a screen
router.post('/request/delete-screen/:screenId', catchAsync(async (req, res) => {

    const { screenId } = req.params;
    const hostId = req.session.host.HOST_ID;

    const [screen] = await db.query(`
      SELECT * FROM SCREEN S
      JOIN THEATRE T ON S.THEATRE_ID = T.THEATRE_ID
      WHERE S.SCREEN_ID = ? AND T.THEATRE_HOST = ?
    `, [screenId, hostId]);

    if (!screen.length) return res.status(403).send('Unauthorized');

    await db.query(
      'INSERT INTO HOST_REQUESTS (HOST_ID, REQUEST_TYPE, TARGET_ID) VALUES (?, ?, ?)',
      [hostId, 'DELETE_SCREEN', screenId]
    );

    res.redirect('/host/theatres');
 
}));

// POST: Request to delete a show
router.post('/request/delete-show/:showId', catchAsync(async (req, res) => {
 
    const { showId } = req.params;
    const hostId = req.session.host.HOST_ID;

    const [show] = await db.query(`
      SELECT * FROM SHOWS SH
      JOIN SCREEN SC ON SH.SCREEN_ID = SC.SCREEN_ID
      JOIN THEATRE T ON SC.THEATRE_ID = T.THEATRE_ID
      WHERE SH.SHOW_ID = ? AND T.THEATRE_HOST = ?
    `, [showId, hostId]);

    if (!show.length) return res.status(403).send('Unauthorized');

    await db.query(
      'INSERT INTO HOST_REQUESTS (HOST_ID, REQUEST_TYPE, TARGET_ID) VALUES (?, ?, ?)',
      [hostId, 'DELETE_SHOW', showId]
    );

    res.redirect('/host/theatres');
 
}));

// GET: Form to add a request
router.get('/addrequest', catchAsync(async (req, res) => {

    const hostId = req.session.host.HOST_ID;

    // Fetch theatres owned by the host
    const [theatres] = await db.query(
      `SELECT THEATRE_ID, THEATRE_NAME, CITY, STATE FROM THEATRE WHERE THEATRE_HOST = ?`,
      [hostId]
    );

    // Fetch screens along with theatre names (only for theatres owned by host)
    const [screens] = await db.query(`
      SELECT SC.SCREEN_ID, SC.CAPACITY, T.THEATRE_NAME
      FROM SCREEN SC 
      JOIN THEATRE T ON SC.THEATRE_ID = T.THEATRE_ID
      WHERE T.THEATRE_HOST = ?
    `, [hostId]);

    // Fetch all movies
    const [movies] = await db.query(`SELECT MOVIE_ID, MOVIE_NAME FROM MOVIE WHERE RELEASE_DATE >= NOW()`);

    // Render the addrequest page with the fetched data
    res.render('./host/addrequest.ejs', { theatres, screens, movies });

}));


// POST: Add Theatre Request
router.post('/request/add-theatre', catchAsync(async (req, res) => {
  
    const { theatre_name, city, state, comment } = req.body;
    const details = JSON.stringify({ theatre_name, city, state });
    await db.query(
      'INSERT INTO HOST_REQUESTS (HOST_ID, REQUEST_TYPE, COMMENT, DETAILS) VALUES (?, ?, ?, ?)',
      [req.session.host.HOST_ID, 'ADD_THEATRE', comment, details]
    );
    res.redirect('/host/theatres');
  
}));

// POST: Add Screen Request
router.post('/request/add-screen', catchAsync(async (req, res) => {

    const { theatre_id, capacity, comment } = req.body;
    const details = JSON.stringify({ theatre_id, capacity });
    await db.query(
      'INSERT INTO HOST_REQUESTS (HOST_ID, REQUEST_TYPE, COMMENT, DETAILS) VALUES (?, ?, ?, ?)',
      [req.session.host.HOST_ID, 'ADD_SCREEN', comment, details]
    );
    res.redirect('/host/theatres');
  
}));

// POST: Add Show Request
router.post('/request/add-show', catchAsync(async (req, res) => {
 
    const { screen_id, movie_id, show_time, comment } = req.body;
    const details = JSON.stringify({ screen_id, movie_id, show_time });
    await db.query(
      'INSERT INTO HOST_REQUESTS (HOST_ID, REQUEST_TYPE, COMMENT, DETAILS) VALUES (?, ?, ?, ?)',
      [req.session.host.HOST_ID, 'ADD_SHOW', comment, details]
    );
    res.redirect('/host/theatres');

}));

router.post('/request/update-theatre', catchAsync(async (req, res) => {
  const hostId = req.session.host.HOST_ID;
  const { theatre_id, theatre_name, city, state, comment } = req.body;

  const details = JSON.stringify({ theatre_name, city, state });

    await db.query(`
      INSERT INTO HOST_REQUESTS (HOST_ID, REQUEST_TYPE, TARGET_ID, COMMENT, DETAILS, STATUS)
      VALUES (?, 'UPDATE_THEATRE', ?, ?, ?, 'PENDING')
    `, [hostId, theatre_id, comment, details]);

    res.redirect('/host/profile');
 
}));


module.exports = router;
