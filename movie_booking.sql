-- Drop the database if it already exists
DROP DATABASE IF EXISTS MOVIEBOOKING;

-- Create the database
CREATE DATABASE MOVIEBOOKING;

-- Use the correct database name
USE MOVIEBOOKING;

-- USERS table
CREATE TABLE USERS (
    USER_ID INT PRIMARY KEY AUTO_INCREMENT,
    USER_NAME VARCHAR(50),
    EMAIL VARCHAR(50) UNIQUE NOT NULL,
    PASSWORD TEXT
);

-- HOST table
CREATE TABLE HOST (
    HOST_ID INT PRIMARY KEY AUTO_INCREMENT,
    HOST_NAME VARCHAR(50),
    EMAIL VARCHAR(50) UNIQUE NOT NULL,
    PASSWORD TEXT
);

CREATE TABLE HOST_REQUESTS (
    REQUEST_ID INT PRIMARY KEY AUTO_INCREMENT,
    HOST_ID INT NOT NULL,
    REQUEST_TYPE ENUM(
        'DELETE_THEATRE', 'DELETE_SCREEN', 'DELETE_SHOW',
        'ADD_THEATRE', 'ADD_SCREEN', 'ADD_SHOW', 'UPDATE_THEATRE'
    ) NOT NULL,
    TARGET_ID INT,
    DETAILS TEXT,
    COMMENT TEXT,
    STATUS ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED') DEFAULT 'PENDING',
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (HOST_ID) REFERENCES HOST(HOST_ID) ON DELETE CASCADE
);



-- ADMIN table
CREATE TABLE ADMIN (
    ADMIN_ID INT PRIMARY KEY AUTO_INCREMENT,
    ADMIN_NAME VARCHAR(50),
    EMAIL VARCHAR(50) UNIQUE NOT NULL,
    PASSWORD TEXT
);

-- THEATRE table
CREATE TABLE THEATRE (
    THEATRE_ID INT PRIMARY KEY AUTO_INCREMENT,
    THEATRE_NAME VARCHAR(50),
    THEATRE_HOST INT,
    CITY VARCHAR(50) NOT NULL,
    STATE VARCHAR(50) NOT NULL,
    FOREIGN KEY (THEATRE_HOST) REFERENCES HOST(HOST_ID) ON DELETE CASCADE 
);

-- SCREEN table
CREATE TABLE SCREEN (
    SCREEN_ID INT PRIMARY KEY AUTO_INCREMENT,
    THEATRE_ID INT,
    CAPACITY INT,
    FOREIGN KEY (THEATRE_ID) REFERENCES THEATRE(THEATRE_ID) ON DELETE CASCADE 
);

CREATE TABLE ACTORS(
       ACTOR_ID INT PRIMARY KEY AUTO_INCREMENT,
       NAME VARCHAR(50) NOT NULL,
       IMAGE TEXT NOT NULL,
       DESCRIPTION TEXT NOT NULL
);

CREATE TABLE ROLES(
     ROLE_ID INT PRIMARY KEY AUTO_INCREMENT,
     ACTOR_ID INT,
     MOVIE_ID INT,
     ROLE_NAME VARCHAR(255) 
);

-- MOVIE table (MISSING in your schema)
CREATE TABLE MOVIE (
    MOVIE_ID INT PRIMARY KEY AUTO_INCREMENT,
    MOVIE_NAME VARCHAR(100) NOT NULL,
    POSTER TEXT ,
    DURATION INT, -- in minutes
    LANGUAGE VARCHAR(30),
    GENRE VARCHAR(30),
    RELEASE_DATE DATE,
    Description TEXT
);

-- SHOWS table
CREATE TABLE SHOWS (
    SHOW_ID INT PRIMARY KEY AUTO_INCREMENT,
    SHOW_TIME DATETIME NOT NULL,
    MOVIE_ID INT,
    SCREEN_ID INT,
    TICKETS_BOOKED INT DEFAULT 0,
    FOREIGN KEY (MOVIE_ID) REFERENCES MOVIE(MOVIE_ID) ON DELETE CASCADE,
    FOREIGN KEY (SCREEN_ID) REFERENCES SCREEN(SCREEN_ID) ON DELETE CASCADE
);

-- TICKET table
CREATE TABLE TICKET (
    TICKET_ID INT PRIMARY KEY AUTO_INCREMENT,
    SHOW_ID INT NOT NULL,
    USER_ID INT,
    BOOKING_TIME DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRICE INT,
    SEAT_NO VARCHAR(10) NOT NULL,
    FOREIGN KEY (SHOW_ID) REFERENCES SHOWS(SHOW_ID) ON DELETE CASCADE ,
    FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID) ON DELETE CASCADE 
);
-- REVIEWS table
CREATE TABLE REVIEWS (
    REVIEW_ID INT AUTO_INCREMENT PRIMARY KEY,
    MOVIE_ID INT NOT NULL,
    USER_ID INT NOT NULL,
    RATING TINYINT NOT NULL CHECK (RATING BETWEEN 1 AND 5),
    COMMENT TEXT NOT NULL,
    CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (MOVIE_ID) REFERENCES MOVIE(MOVIE_ID) ON DELETE CASCADE,
    FOREIGN KEY (USER_ID) REFERENCES USERS(USER_ID) ON DELETE CASCADE
);


-- USERS
CREATE UNIQUE INDEX idx_users_user_id ON USERS(USER_ID);

-- HOST
CREATE UNIQUE INDEX idx_host_host_id ON HOST(HOST_ID);

-- ADMIN
CREATE UNIQUE INDEX idx_admin_admin_id ON ADMIN(ADMIN_ID);

-- THEATRE
CREATE UNIQUE INDEX idx_theatre_theatre_id ON THEATRE(THEATRE_ID);

-- SCREEN
CREATE UNIQUE INDEX idx_screen_screen_id ON SCREEN(SCREEN_ID);

-- ACTORS
CREATE UNIQUE INDEX idx_actors_actor_id ON ACTORS(ACTOR_ID);

-- ROLES
CREATE UNIQUE INDEX idx_roles_role_id ON ROLES(ROLE_ID);

-- MOVIE
CREATE UNIQUE INDEX idx_movie_movie_id ON MOVIE(MOVIE_ID);

-- SHOWS
CREATE UNIQUE INDEX idx_shows_show_id ON SHOWS(SHOW_ID);

-- TICKET
CREATE UNIQUE INDEX idx_ticket_ticket_id ON TICKET(TICKET_ID);


-- Foreign keys in THEATRE
CREATE INDEX idx_theatre_host_id ON THEATRE(THEATRE_HOST);

-- Foreign keys in SCREEN
CREATE INDEX idx_screen_theatre_id ON SCREEN(THEATRE_ID);

-- Foreign keys in ROLES
CREATE INDEX idx_roles_actor_id ON ROLES(ACTOR_ID);
CREATE INDEX idx_roles_movie_id ON ROLES(MOVIE_ID);

-- Foreign keys in SHOWS
CREATE INDEX idx_shows_movie_id ON SHOWS(MOVIE_ID);
CREATE INDEX idx_shows_screen_id ON SHOWS(SCREEN_ID);

-- Foreign keys in TICKET
CREATE INDEX idx_ticket_show_id ON TICKET(SHOW_ID);
CREATE INDEX idx_ticket_user_id ON TICKET(USER_ID);



-- exmple data 
-- Insert Hosts (required for THEATRE)
INSERT INTO HOST (HOST_NAME, EMAIL, PASSWORD) VALUES
('Mahi', 'cse230001023@iiti.ac.in', '$2b$10$DqY7uvTARlszs/eASLjtieDHIkT6SMbct24RbQogzfeBZ.nZdbdWm');

INSERT INTO ADMIN (ADMIN_NAME, EMAIL, PASSWORD) VALUES
('Mahi', 'cse230001023@iiti.ac.in', '$2b$10$DqY7uvTARlszs/eASLjtieDHIkT6SMbct24RbQogzfeBZ.nZdbdWm');

-- Insert Users (required for TICKET)
INSERT INTO USERS (USER_NAME, EMAIL, PASSWORD) VALUES
('Maahi', 'cse230001023@iiti.ac.in', '$2b$10$DqY7uvTARlszs/eASLjtieDHIkT6SMbct24RbQogzfeBZ.nZdbdWm'),
('User2', 'user2@example.com', 'pass2'),
('User3', 'user3@example.com', 'pass3'),
('User4', 'user4@example.com', 'pass4'),
('User5', 'user5@example.com', 'pass5'),
('User6', 'user6@example.com', 'pass6'),
('User7', 'user7@example.com', 'pass7');

-- Insert Theatres
INSERT INTO THEATRE (THEATRE_NAME, THEATRE_HOST, CITY, STATE) VALUES
('Tirumala Theater', 1, 'Suryapet', 'Telangana'),
('Navya Theatre', 1, 'Suryapet', 'Telangana'),
('Kishore Theatre', 1, 'Suryapet', 'Telangana');

-- Insert Screens
INSERT INTO SCREEN (THEATRE_ID, CAPACITY) VALUES
(1, 150),
(2, 120),
(3, 100),
(1,100);

-- Insert movies 
INSERT INTO MOVIE (MOVIE_NAME, POSTER, DURATION, LANGUAGE, GENRE, RELEASE_DATE, DESCRIPTION) VALUES
('Leo', 'https://m.media-amazon.com/images/M/MV5BODFkZWQwZDAtZDNkYi00MWU1LTkyNmYtM2JjMTM5OTI0ZGQwXkEyXkFqcGc@._V1_.jpg', 180, 'Telugu', 'Action/Drama', '2025-06-10', 
 'Leo is a high-octane Telugu action drama featuring gripping fight sequences and a compelling storyline.'),
('Khaleja', 'https://pbs.twimg.com/media/GqwJVOTXcAA5Xcn?format=jpg&name=4096x4096', 120, 'Telugu', 'Animation/Adventure', '2025-06-10', 
 'A village is hounded by an unknown fatal disease and according to the prophecy, a godsend will save the village. Will Siddhappa figure it out before it`s too late?'),
('Beast', 'https://i.pinimg.com/736x/70/81/7a/70817aeffe445d2257f8efe79d37142b.jpg', 130, 'Tamil', 'Action/Thriller', '2025-06-10', 
 'Beast is an intense thriller revolving around a heroic dog who helps solve crime mysteries.'),
('Baby John Drinker', 'https://upload.wikimedia.org/wikipedia/en/9/91/Baby_John_Drinker_poster.jpg', 110, 'Telugu', 'Comedy/Drama', '2025-06-10', 
 'A heartwarming comedy drama following the amusing escapades of Baby John and his quirky friends.'),
('Sherlock Holmes', 'https://upload.wikimedia.org/wikipedia/en/8/85/Sherlock_Holmes_2009_film_poster.jpg', 140, 'English', 'Mystery/Crime', '2025-06-10', 
 'The legendary detective Sherlock Holmes unravels complex mysteries with his sharp intellect and wit.'),
('Suryapet Junction', 'https://upload.wikimedia.org/wikipedia/en/c/cb/Suryapet_Junction_poster.jpg', 120, 'Telugu', 'Action/Drama', '2025-04-25', 
 'Suryapet Junction is an action-packed drama set in the bustling town of Suryapet, capturing intense human emotions and conflicts.');

-- Insert Actors
INSERT INTO ACTORS (NAME, IMAGE, DESCRIPTION) VALUES
('Thalpathy Vjay', 'https://www.wallsnapy.com/img_gallery/leo-movie-thalapathi-dance-wallpaper-hd-1080p-5693021.jpg', 'Indian film actor known for his work in Telugu cinema.'),
('Trisha', 'https://preview.redd.it/leo-hd-stills-v0-o9ymv1n8jztb1.jpg?width=640&crop=smart&auto=webp&s=e210456f3e87822d58646b795124935ac077eead', 'Indian actress and model who has appeared in Tamil and Telugu films.'),
('Eeswar', 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Eeswar_Actor.jpg', 'Telugu actor known for his role in Suryapet Junction.'),
('Naina Sarwar', 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Naina_Sarwar.jpg', 'Indian actress known for her role in Suryapet Junction.'),
('Abhimanyu Singh', 'https://upload.wikimedia.org/wikipedia/commons/2/29/Abhimanyu_Singh.jpg', 'Indian actor known for his role in Suryapet Junction.');

-- Insert Roles
INSERT INTO ROLES (ACTOR_ID, MOVIE_ID, ROLE_NAME) VALUES
(1, 1, 'Parthiban'),
(2, 1, 'Satya'),
(3, 1, 'Danny'),
(4, 1, 'Priya'),
(5, 1, 'Vikram');

-- Insert Shows
INSERT INTO SHOWS (SHOW_TIME, MOVIE_ID, SCREEN_ID, TICKETS_BOOKED) VALUES
('2025-05-31 15:00:00', 1, 1, 50),
('2025-05-31 18:30:00', 1, 2, 30),
('2025-05-31 21:00:00', 1, 3, 20),
('2025-05-31 15:30:00', 2, 1, 40),
('2025-05-31 19:00:00', 1, 2, 25),
('2025-05-31 21:30:00', 1, 3, 15),
('2025-05-31 18:00:00', 3, 1, 50),
('2025-05-31 15:30:00', 1, 2, 30),
('2025-05-31 15:00:00', 1, 3, 20),
('2025-05-31 21:30:00', 4, 4, 40),
('2025-05-31 21:00:00', 1, 4, 25),
('2025-05-31 19:30:00', 1, 4, 15);

-- Insert Tickets
INSERT INTO TICKET (SHOW_ID, USER_ID, PRICE, SEAT_NO) VALUES
(1, 1, 150, 'A1'),
(1, 1, 150, 'A2'),
(2, 1, 200, 'B1'),
(3, 1, 180, 'C1'),
(4, 1, 120, 'D1'),
(5, 1, 250, 'E1'),
(6, 1, 220, 'F1');







