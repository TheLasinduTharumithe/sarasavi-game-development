Build a responsive **Sarasavi Book Cover Memory Matching Game** with a separate, secure administration dashboard.

# 1. Public Game

## Game Board

* Create a **4 × 4 grid** with exactly **16 cards**.
* Use **8 different book covers**, with each cover appearing twice.
* Randomly shuffle all 16 cards at the beginning of every game.
* Display the attached Sarasavi logo on the back of every closed card.
* If the administrator activates more than eight book covers, randomly select eight active covers for each new game.

## Game Process

1. The player selects the first card.
2. The card flips and displays its book cover.
3. The player selects a second card.
4. Prevent further selections while checking the two cards.
5. If both covers match:

   * Show a green border.
   * Keep the cards open.
   * Update the matched-pair counter.
6. If the covers do not match:

   * Show a red border.
   * Wait approximately one second.
   * Flip both cards back to the Sarasavi logo.
7. Matched cards cannot be selected again.
8. The same card cannot be selected twice in one turn.

## Game Timer

* Use the time duration configured from the admin dashboard.
* The default game duration must be **30 seconds**.
* Start the countdown when the player opens the first card.
* Display the remaining time clearly above the game board.
* Change the timer colour:

  * Blue during normal gameplay
  * Orange when 10 seconds remain
  * Red with a pulse animation when 5 seconds remain

## Winning Result

When the player matches all eight pairs before the timer ends:

* Stop the timer.
* Prevent additional card selections.
* Display a full-screen success popup.
* Show the Sarasavi logo prominently at the top.
* Display a celebration or confetti animation.
* Show the administrator-configured success message, with this default:

**Congratulations!**
**You successfully matched all the book covers!**

* Display a 10-second new-game countdown.
* Automatically start a new game after 10 seconds.
* Include a **Play New Game Now** button.
* Reset and reshuffle everything when the new game starts.

## Time-Out Result

When the timer reaches zero:

* Stop the game.
* Prevent the player from selecting more cards.
* Display a game-over popup with the Sarasavi logo.
* Show the administrator-configured failure message, with this default:

**Time’s Up!**
**You could not complete the game within the available time. Please try again.**

* Display a **Try Again** button.
* Clicking the button must reset the game, timer, cards, moves and matched-pair counter.

## Public Interface

Display:

* Sarasavi logo
* Game title
* Short instructions
* Remaining time
* Move count
* Matched pairs, such as `4 / 8`
* Restart Game button
* Advertisement area

Use the Sarasavi blue-and-white brand colours, rounded cards, clean shadows, clear spacing and smooth card-flip animations. The game must work correctly on desktop, tablet and mobile.

Do not include registration or login on the public game page.

# 2. Admin Dashboard

Create a separate protected route such as `/admin`. Only administrators can access it after signing in.

The dashboard must contain:

* Overview
* Book Covers
* Game Settings
* Advertisements
* Admin Account
* Logout

## Admin Overview

Display summary cards for:

* Total uploaded book covers
* Active book covers
* Current game duration
* Active advertisements
* Total games played
* Total completed games
* Total failed games

## Book-Cover Management

Allow administrators to:

* Add a new book cover
* Upload a cover image
* Enter the book title
* Enter the author name
* Add an optional ISBN or reference code
* Preview the uploaded image
* Edit book details
* Replace a cover image
* Activate or deactivate a cover
* Delete a cover with confirmation
* Search and filter covers
* Reorder covers if required

Only active covers can appear in the game. Require at least eight active book covers before the game can start. Display a clear admin warning when fewer than eight active covers are available.

Supported image formats:

* JPG
* JPEG
* PNG
* WebP

Validate image type and file size before uploading.

## Game Settings

Allow the administrator to configure:

* Game title
* Game instructions
* Time duration
* Card mismatch display duration
* Success-screen duration
* Success message
* Time-out message
* Automatic new-game option
* Celebration animation on or off
* Sound effects on or off
* Advertisement display on or off
* Sarasavi logo upload or replacement

Provide predefined game-time options:

* 15 seconds
* 30 seconds
* 45 seconds
* 60 seconds
* 90 seconds
* Custom duration

Validate custom time values and prevent zero or negative durations.

Add **Save Settings** and **Reset to Default** buttons. New settings must apply to the public game without requiring code changes.

## Advertisement Management

Allow administrators to create and run advertisements inside the game.

Each advertisement must support:

* Advertisement title
* Advertisement type:

  * Image
  * Video
  * Text banner
* Advertisement image or video upload
* Advertisement text
* Optional button text
* Optional destination URL
* Advertisement position
* Start date and time
* End date and time
* Display duration
* Display order or priority
* Active or inactive status
* Preview before publishing

Advertisement placement options:

* Above the game board
* Below the game board
* Between the header and game board
* Success popup
* Time-out popup

The system must:

* Display only active advertisements within their scheduled period.
* Automatically stop expired advertisements.
* Rotate multiple active advertisements based on priority or configured duration.
* Open advertisement links safely in a new tab.
* Never cover the cards, timer or important game controls.
* Hide the entire advertisement area when no advertisement is active.
* Allow administrators to edit, pause, reactivate and delete advertisements.
* Ask for confirmation before deleting an advertisement.

# 3. Data and Backend Requirements

Create database models or tables for:

* Administrators
* Book covers
* Game settings
* Advertisements
* Game sessions or statistics

Protect all admin routes and APIs with authentication and authorization.

The backend must provide secure functions for:

* Admin login and logout
* Book-cover CRUD operations
* Image and video uploads
* Game-settings management
* Advertisement CRUD operations
* Advertisement scheduling
* Basic game statistics

Validate all data on both the frontend and backend. Protect file uploads, passwords and admin API endpoints.

# 4. Technical Requirements

* Build clean, reusable components.
* Use persistent database storage.
* Do not store important settings only in browser local storage.
* Properly clear timers and intervals when restarting or leaving the page.
* Prevent multiple countdown intervals from running simultaneously.
* Use `object-fit: cover` so book-cover images are not stretched.
* Add keyboard navigation, accessible buttons and meaningful alternative text.
* Display loading, success and error notifications in the admin dashboard.
* Use confirmation dialogs for destructive actions.
* Produce complete, functional code with no unfinished pages, broken image paths or placeholder game logic.
