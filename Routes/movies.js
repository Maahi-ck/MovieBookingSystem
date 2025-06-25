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


router.get('/actors/:id', catchAsync(async (req, res) => {
    const actorId = req.params.id;

        // Get actor details
        const [[actor]] = await db.query(
            'SELECT * FROM ACTORS WHERE ACTOR_ID = ?',
            [actorId]
        );

        if (!actor) {
             req.flash('error', 'Actor not found');
             return res.redirect('/movies');
        }

       

        // Get movies they acted in
        const [movies] = await db.query(
            `SELECT M.MOVIE_ID, M.MOVIE_NAME, M.POSTER
             FROM MOVIE M
             JOIN ROLES R ON M.MOVIE_ID = R.MOVIE_ID
             WHERE R.ACTOR_ID = ?`,
            [actorId]
        );

        res.render('./actors/profile.ejs',{
            actor,
            movies
        });

}));

//apis

router.get('/all', catchAsync(async (req, res) => {
 
    const city = req.session.city;
    const state = req.session.state;

    if (!city || !state) {
      return res.status(400).json({ error: 'City and state are required in session.' });
    }

    // Fetch movies playing in theatres located in current city and state
    // Join SHOWS -> SCREEN -> THEATRE -> MOVIE to filter by location and get movie info
    const sql = `
      SELECT DISTINCT m.MOVIE_ID, m.MOVIE_NAME, m.POSTER
      FROM SHOWS s
      JOIN SCREEN sc ON s.SCREEN_ID = sc.SCREEN_ID
      JOIN THEATRE t ON sc.THEATRE_ID = t.THEATRE_ID
      JOIN MOVIE m ON s.MOVIE_ID = m.MOVIE_ID
      WHERE t.CITY = ? AND t.STATE = ?
    `;

    const [movies] = await db.query(sql, [city, state]);

    res.json(movies);
 
}));

router.get('/search', catchAsync(async (req, res) => {
  
    const city = req.session.city;
    const state = req.session.state;
    const searchTerm = req.query.searchTerm || '';

    if (!city || !state) {
      return res.status(400).json({ error: 'City and state are required in session.' });
    }

    // Search movies by name (case-insensitive) playing in current city and state
    const sql = `
      SELECT DISTINCT m.MOVIE_ID, m.MOVIE_NAME, m.POSTER
      FROM SHOWS s
      JOIN SCREEN sc ON s.SCREEN_ID = sc.SCREEN_ID
      JOIN THEATRE t ON sc.THEATRE_ID = t.THEATRE_ID
      JOIN MOVIE m ON s.MOVIE_ID = m.MOVIE_ID
      WHERE t.CITY = ? AND t.STATE = ? AND m.MOVIE_NAME LIKE ?
    `;

    const likeSearch = `%${searchTerm}%`;
    const [movies] = await db.query(sql, [city, state, likeSearch]);

    res.json(movies);
 
}));

router.get('/', catchAsync(async (req, res) => {
  const { city, state } = req.session;


    const [results] = await db.query(`
      SELECT DISTINCT
        MOVIE.MOVIE_ID,
        MOVIE.MOVIE_NAME,
        MOVIE.POSTER
      FROM SHOWS
      JOIN MOVIE ON SHOWS.MOVIE_ID = MOVIE.MOVIE_ID
      JOIN SCREEN ON SHOWS.SCREEN_ID = SCREEN.SCREEN_ID
      JOIN THEATRE ON SCREEN.THEATRE_ID = THEATRE.THEATRE_ID
      WHERE THEATRE.CITY = ? AND THEATRE.STATE = ?
    `, [city, state]);

    res.render('./movies/index.ejs', { data: results });
 
}));



router.get('/:id', catchAsync(async (req, res) => {
  const movieId = req.params.id;
   

    // Fetch movie details
    const [movieDetails] = await db.query(`
      SELECT 
        MOVIE_ID, MOVIE_NAME, POSTER, DURATION, LANGUAGE, GENRE, RELEASE_DATE, DESCRIPTION
      FROM MOVIE
      WHERE MOVIE_ID = ?
    `, [movieId]);

    if (!movieDetails[0]) {
      return res.status(404).send("MOVIE NOT FOUND");
    }

    // Fetch cast details
    const [cast] = await db.query(`
      SELECT a.ACTOR_ID, a.NAME, a.IMAGE, r.ROLE_NAME
      FROM ROLES r
      JOIN ACTORS a ON r.ACTOR_ID = a.ACTOR_ID
      WHERE r.MOVIE_ID = ?
    `, [movieId]);

    // Fetch reviews with user info
    const [reviews] = await db.query(`
      SELECT r.REVIEW_ID, r.RATING, r.COMMENT, r.CREATED_AT, u.USER_NAME , r.USER_ID
      FROM REVIEWS r
      JOIN USERS u ON r.USER_ID = u.USER_ID
      WHERE r.MOVIE_ID = ?
      ORDER BY r.CREATED_AT DESC
    `, [movieId]);

    // Fetch average rating
    const [avgRatingResult] = await db.query(`
      SELECT AVG(RATING) AS avgRating
      FROM REVIEWS
      WHERE MOVIE_ID = ?
    `, [movieId]);

    const avgRating = avgRatingResult[0].avgRating ? parseFloat(avgRatingResult[0].avgRating).toFixed(1) : null;
    
    res.render('./movies/show.ejs', {
      movie: movieDetails[0],
      cast: cast,
      reviews: reviews,
      avgRating
    });
  
}));


router.post('/:id/reviews', catchAsync(async (req, res) => {
  const movieId = req.params.id;
  const user = req.session.user;

  if (!user) {
    // If user not logged in, redirect or send error
    return res.status(401).send('You must be logged in to post a review.');
  }

  const { rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).send('Rating must be between 1 and 5.');
  }

 
    await db.query(`
      INSERT INTO REVIEWS (MOVIE_ID, USER_ID, RATING, COMMENT, CREATED_AT)
      VALUES (?, ?, ?, ?, NOW())
    `, [movieId, user.USER_ID, rating, comment]);

    res.redirect(`/movies/${movieId}#reviews`);
 
}));

router.delete('/:movieId/reviews/:reviewId', catchAsync(async(req, res) => {
  const userId = req.session.user.USER_ID;
  const { movieId, reviewId } = req.params;

  // Only delete if review belongs to the current user
  await db.query('DELETE FROM reviews WHERE REVIEW_ID = ? AND USER_ID = ?', [reviewId, userId]) 
    req.flash('success','Review Deleted Successfully');
    res.redirect('/movies/' + movieId);
}));

// Middleware for checking login
router.use((req,res,next)=>{
       if(!req.session.user){
           req.flash('success','Please login into your account');
           return res.redirect('/Users/login');
       }else{
         next();
       }
})


router.get('/book/movies/:movieId', catchAsync(async (req, res) => {
  if (!req.session.user) {
    req.flash('error', 'Please Login to proceed Booking');
    return res.redirect('/Users/login');
  }
  const movieId = req.params.movieId;
  const { city, state } = req.session;

  if (!city || !state) {
    return res.status(400).send('City and state must be set in session');
  }

  
   const [shows] = await db.query(`
  SELECT 
    s.SHOW_ID, s.SHOW_TIME,
    t.THEATRE_ID, t.THEATRE_NAME, t.CITY, t.STATE,
    sc.SCREEN_ID, sc.CAPACITY
  FROM SHOWS s
  JOIN SCREEN sc ON s.SCREEN_ID = sc.SCREEN_ID
  JOIN THEATRE t ON sc.THEATRE_ID = t.THEATRE_ID
  WHERE s.MOVIE_ID = ? 
    AND t.CITY = ? 
    AND t.STATE = ?
    AND s.SHOW_TIME > NOW()
  ORDER BY s.SHOW_TIME ASC
`, [movieId, city, state]);


    res.render('movies/shows.ejs', { shows });
 
}));


router.get('/book/shows/:showid', catchAsync(async (req, res) => {
  if (!req.session.user) {
    req.flash('error', 'Please Login to proceed Booking');
    return res.redirect('/Users/login');
  }
  const showId = req.params.showid;


    // Query to get show details with theatre, screen, movie info
    const [[show]] = await db.query(`
      SELECT 
        s.SHOW_ID, s.SHOW_TIME, s.TICKETS_BOOKED,
        m.MOVIE_NAME, m.DURATION, m.POSTER, m.LANGUAGE, m.GENRE, m.RELEASE_DATE, m.Description AS MOVIE_DESCRIPTION,
        sc.SCREEN_ID, sc.CAPACITY,
        t.THEATRE_ID, t.THEATRE_NAME, t.CITY, t.STATE,
        h.HOST_ID, h.HOST_NAME
      FROM SHOWS s
      JOIN MOVIE m ON s.MOVIE_ID = m.MOVIE_ID
      JOIN SCREEN sc ON s.SCREEN_ID = sc.SCREEN_ID
      JOIN THEATRE t ON sc.THEATRE_ID = t.THEATRE_ID
      JOIN HOST h ON t.THEATRE_HOST = h.HOST_ID
      WHERE s.SHOW_ID = ?
    `, [showId]);

    if (!show) {
      return res.status(404).send('Show not found');
    }

  

    // Optional: Fetch actors & roles for the movie if needed
    // You can add another query here if you want to show actors/roles on the booking page.

    res.render('./movies/book.ejs', { show });
}));


router.post('/book/:showid', catchAsync(async (req, res) => {
  if (!req.session.user) {
    req.flash('error', 'Please Login to proceed Booking');
    return res.redirect('/Users/login');
  }

  const showId = req.params.showid;
  const userId = req.session.user.USER_ID;
  const numTickets = parseInt(req.body.tickets, 10);
  const ticketPrice = 150;

    // Get user email


    // Get show info for validation
    const [[show]] = await db.query(`
      SELECT s.SHOW_ID, s.TICKETS_BOOKED, sc.CAPACITY
      FROM SHOWS s
      JOIN SCREEN sc ON s.SCREEN_ID = sc.SCREEN_ID
      WHERE s.SHOW_ID = ?
    `, [showId]);

    const available = show.CAPACITY - show.TICKETS_BOOKED;
    if (available < numTickets) return res.status(400).send('Not enough tickets available');

    // Insert tickets
    for (let i = 0; i < numTickets; i++) {
      await db.query(`
        INSERT INTO TICKET (SHOW_ID, USER_ID, PRICE, SEAT_NO)
        VALUES (?, ?, ?, ?)
      `, [showId, userId, ticketPrice, `A${show.TICKETS_BOOKED + i + 1}`]);
    }

    // Update tickets booked
    await db.query(`UPDATE SHOWS SET TICKETS_BOOKED = TICKETS_BOOKED + ? WHERE SHOW_ID = ?`, [numTickets, showId]);

    

    await transporter.sendMail({
      from: 'BookMyShow',
      to: req.session.user.EMAIL,
      subject: 'Booking Confirmation',
      text: `Your booking for Show ID ${showId} is confirmed. Enjoy the movie!`,
    });

    req.flash('success','Booking successful. Confirmation email sent.');
    res.redirect('/Users/Profile');

}));



module.exports=router;