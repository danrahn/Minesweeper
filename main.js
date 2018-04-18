// JavaScript Document
"use strict";

/*global $*/
// Anonymous function (can't be accessed from the console)
(function() {
	// Only do stuff once the main page is loaded
	window.onload = setup;

	// variables needed throughout the program
	var bombCount;
	var bombs;
	var uncovered;
	var WIDTH = 10;
	var HEIGHT = 10;
	var DIMEN = 25;
	var BOMBS = 20;
	var timer;
	var pausedTime = 0;
	var lives = 3;
	var started = false;
	var adv = false;
	var pausedState;
	var firstRun = true;
	var cookie;

	// Reset the board when someone presses "Go!"
	function clearBoard() {
		if (!firstRun) {
			$('#gameboard').slideUp(1000).animate({opacity: 0.0}, {queue: false, duration: 1000, complete: restart});
		} else {
			firstRun = !firstRun;
			restart();
		}
	}

	function restart() {
		var gameBoard = $("#gameboard");
        gameBoard.css('background-image', '');  // Clear background image
		$('.box').css('opacity', '1');          // Set opacity back to 1
        gameBoard.html('');                     // Clear the boxes
		clearInterval(timer);                   // Clear the timer
		pausedTime = 0;
		started = false;
		$('#time').html('0:00.000');            // Set clock back to 0
		$('#endGame').html('');                 // Clear any win/loss message
		pausedState = '';
		// Remove any paused state from memory
        var pause = $("#pause");
        pause.attr('disabled', 'disabled');   // Disable the pause button
        pause.html('Pause');                  // Reset the puase text
		start();                                    // Setup the new board
	}

	// Create the click event that will start the games
	function setup() {
		$('#scale').hide();
		$('#gameboard').hide();
		$('#stats').hide();
		$('#error').hide();

		// If zoom-out is clicked, zoom out if possible
		$('#zOut').click(zoomOut);

		// If the zoom-in button is clicked, zoom in if possible
		$('#zIn').click(zoomIn);

		// Save the state of the game and pause
		$('#pause').click(pause);

		addKeyListeners();
		checkCookie();
	}

	function checkCookie() {
		cookie = document.cookie;
		if (cookie.length === 0) {
			var d = new Date();
			d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
			document.cookie = "scores='';expires=" + d.toUTCString();
		}
		console.log(document.cookie);
	}

	// Set up the board
	function start() {
		$('#scale').show();
		// Get the values from the fields on the page
        var error = $("#error");
        error.hide();
        var gameBoard = $("#gameboard");
		var message = '';
		var i;
		// If "advanced" setup chosen, use this
		if (adv) {
			WIDTH = parseInt($('#width').val());
			HEIGHT = parseInt($('#height').val());
			BOMBS = parseInt($('#bmb').val());
			// Setup error handling
			if (isNaN(WIDTH) || isNaN(HEIGHT) || isNaN(BOMBS)) {
				message = 'Make sure values entered are integers';
			} else if (WIDTH * HEIGHT > 25000 || WIDTH > 250 || HEIGHT > 250) {
				message = 'Board too large';
			} else if (WIDTH < 2 || HEIGHT < 2) {
				message = 'Board too small';
			} else if (BOMBS / (WIDTH * HEIGHT) < .02) {
				message = 'Not enough mines';
			} else if (BOMBS >= WIDTH * HEIGHT) {
				message = 'Too many mines';
			} else if (WIDTH * HEIGHT > 5000 && BOMBS / (WIDTH * HEIGHT) < .1
				|| WIDTH * HEIGHT > 10000 && BOMBS / (WIDTH * HEIGHT) < .15
				|| WIDTH * HEIGHT > 15000 && BOMBS / (WIDTH * HEIGHT) < .2) {
				message = 'Too large of a playing field for current mine density';
			}
			if (message.length > 0) {
                error.fadeIn();
                gameBoard.hide();
				$('#puased').hide();
                error.html(message);
				return;
			}
		// If standard options chosen, do this. Should probably
		// still do error handling, since a user could alter the
		// html, causing the numbers to be invalid
		} else {
			WIDTH = parseInt($("#size").val());
            // noinspection JSSuspiciousNameCombination
            HEIGHT = WIDTH;
			var difficulty = $('#diff').val();
			BOMBS = Math.round((WIDTH * HEIGHT * difficulty));
		}
		$('#stats').show();
		$('#sizeAnnouncement').hide();

		// Set a number of lives, since at times a game can
		// be pretty much impossible. Formula should be tweaked
		// though
		var diff = BOMBS / (WIDTH * HEIGHT);
		if (diff === .1) {
			lives = 0;
		} else if (diff <= .18) {
			lives = 1;
		} else if (diff <= .25) {
			lives = 2;
		} else {
			lives = 3;
		}
		if (WIDTH * HEIGHT <= 225) {
			lives = Math.max(0, lives - 1);
		} else if (WIDTH * HEIGHT >= 5000) {
			lives += 2;
		} else if (WIDTH * HEIGHT >= 2000) {
			lives += 1;
		}

		// Make the boxes smaller if a large size is used
		if (WIDTH * HEIGHT > 4000 || WIDTH > 70 || HEIGHT > 70) {
			DIMEN = 16;
            gameBoard.css('font-size', '8pt');
		} else if (WIDTH * HEIGHT > 2000 || WIDTH > 50 || HEIGHT > 50) {
            gameBoard.css('font-size', '9pt');
			DIMEN = 18;
		} else if (WIDTH * HEIGHT > 1000 || WIDTH > 30 || HEIGHT > 30) {
            gameBoard.css('font-size', '10pt');
			DIMEN = 20;
		} else if (WIDTH * HEIGHT > 400) {
			DIMEN = 24;
		} else {
			DIMEN = 30;
		}
		// Load current number of bombs on the board
		$("#bCount").html(BOMBS + ' ');
		$('#lives').html(lives);
		// Set up game board css
        gameBoard.css({"width" : ((WIDTH * DIMEN) + 'px'),
							 "height" : ((HEIGHT * DIMEN) + 'px'),
							 "position" : "relative",
							 "margin" : "auto"});

		// Create arrays for bomb locations, and uncovered squares
		bombs = [];
		uncovered = [];
		// Create the squares
		for (i = 0; i < HEIGHT; i++) {
			for (var j = 0; j < WIDTH; j++) {
				var box = document.createElement('div');
				// Unique ID
				box.id = "box" + (i * WIDTH + j);
				setupMouseListeners(box);
				box.className = 'box covered';
				// Position the boxes
				box.style.top = (DIMEN * i + 20) + 'px';
				box.style.left = (DIMEN * j + 20) + 'px';
				// Set line height to center text
				box.style.lineHeight = (DIMEN - 2) + 'px';
                gameBoard.append(box);
				if (i === HEIGHT - 1 && j === WIDTH - 1) {
					// Fancy fade-in effect
					// $('#gameboard').show();
                    gameBoard.css('opacity', 0).slideDown(1000).animate({opacity: 1}, {queue: false, duration: 1000});
				}
			}
		}

		var tempArray = [];
		for (i = 0; i < WIDTH * HEIGHT; i++) {
			tempArray.push(i);
		}
		for (i = 0; i < BOMBS; i++) {
			var rand = Math.floor(Math.random() * tempArray.length);
			bombs.push(tempArray[rand]);
			tempArray.splice(rand, 1);
		}

		bombCount = [];
		// Shitty if statements to determine how many nearby bombs there are
		// The same basic formula is used a few more times
		for (i = 0; i < WIDTH * HEIGHT; i++) {
			var bomb = 0;
			if (i % WIDTH !== 0) {
				if (bombs.indexOf(i - 1) !== -1) { // Left
					bomb++;
				}
				if (i > (WIDTH - 1) && bombs.indexOf(i - (WIDTH + 1)) !== -1) { // Upper Left
						bomb++;
				}
				if (i < (WIDTH * (HEIGHT - 1)) && bombs.indexOf(i + (WIDTH - 1)) !== -1) { // Lower Left
						bomb++;
				}
			}
			if (i > WIDTH - 1 && bombs.indexOf(i - WIDTH) !== -1) { // Above
					bomb++;
			}
			if (i < WIDTH * (HEIGHT - 1) && bombs.indexOf(i + WIDTH) !== -1) { // Below
					bomb++;
			}
			if ((i + 1) % WIDTH !== 0) {
				if (bombs.indexOf(i + 1) !== -1) { // Right
					bomb++;
				}
				if (i > WIDTH - 1 && bombs.indexOf(i - (WIDTH - 1)) !== -1) { // Upper Right
						bomb++;
				}
				if (i < (WIDTH * (HEIGHT - 1)) && bombs.indexOf(i + WIDTH + 1) !== -1) { // Lower Right
						bomb++;
				}
			}
			bombCount[i] = bomb;
		}
		// Set the width and height of each box, leaving room for the border
        var boxes = $(".box");
        boxes.width(DIMEN - 2);
        boxes.height(DIMEN - 2);
	}



	function zoomOut() {
		$('#zIn').removeAttr('disabled');
		if (DIMEN > 15) {
			$('.box').css({'width' : (DIMEN - 4) + 'px', 'height' : (DIMEN - 4) + 'px'});
			DIMEN -= 2;
			// Snrink the gameboard dimensions
            var gameBoard = $("#gameboard");
			gameBoard.css({'width' : parseInt(gameBoard.css('width')) - (WIDTH * 2) + 'px',
								 'height' : parseInt(gameBoard.css('height')) - (HEIGHT * 2) + 'px'});
			// Set the new box dimensions for each box
			resize();
		}
	}

	function zoomIn() {
		$('#zOut').removeAttr('disabled');
		if (DIMEN < 30) {
			$('.box').css({'width' : (DIMEN) + 'px', 'height' : (DIMEN) + 'px'});
			DIMEN += 2;
			var gameBoard = $("#gameboard");
            gameBoard.css({'width' : parseInt(gameBoard.css('width')) + (WIDTH * 2) + 'px',
								 'height' : parseInt(gameBoard.css('height')) + (HEIGHT * 2) + 'px'});
			resize();
		}
		if (DIMEN >= 30) {
			$('#zIn').attr('disabled', 'disabled');
		}
	}

	function setupMouseListeners(box) {
		box.onclick = uncoverHelper;
		box.oncontextmenu = addRightClick;
		box.onmousedown = function(e) {
			if (e.button === 2) {
				if (!$(this).hasClass('covered')) {
					highlightSurrounding(this);
				}
			}
		};
		box.onmouseover = function(e) {
			if (e.button === 2) {
				if (!$(this).hasClass('covered')) {
					highlightSurrounding(this);
				}
			}
		};
		box.onmouseup = function(e) {
			if (e.button === 2) {
				if (!$(this).hasClass('covered')) {
					unhighlightSurrounding(this);
				}
			}
		};
		box.onmouseout = function(e) {
			if (e.button === 2) {
				unhighlightSurrounding(this);
			}
		}
	}

	/*
	 * Puase turned out to be a bit trickier than I initially thought. When puase is clicked,
	 * each box fades out, but the boxes should not remain in the html, as a user could potentially
	 * just recreate the square by looking at the source, completing the board while the game is still
	 * paused. To combat this, the entire html of the gameboard is saved in a string, then reattached.
	 * When reattached, event handlers are gone, so click actions must be reassigned, then the boxes
	 * fade in. The timer must also be stopped, then started again with the previous time still recorded
	 */
	function pause() {
		$(this).attr('disabled', 'disabled');
		if ($(this).html() === 'Pause') {
            $(".box").each(function() {
				$(this).fadeOut(500, 'swing', function() {
					if (parseInt($(this).attr('id').substr(3)) === WIDTH * HEIGHT - 1) {
						$('#gameboard').html('<div id="NiceTry">Paused</div>');
						$('#pause').removeAttr('disabled');
					}
				});
			});
			$(this).html('Unpause');
			var time = $('#time').html();
			var minutes = time.substr(0, time.indexOf(':'));
			var seconds = time.substr(time.indexOf(':') + 1);
			pausedTime = (minutes * 60 + seconds) * 1000;
			clearInterval(timer);
			pausedState = $('#gameboard').html();
		} else {
			$('#gameboard').html(pausedState);
			$(".box").each(function() {
				setupMouseListeners(this);
				$(this).css('display', 'none');
			});
            box.each(function() { $(this).fadeIn(500); });
			$(this).html('Pause');
			$(this).removeAttr('disabled');
			startTimer();
		}
	}

	function resize() {
		for (var i = 0; i < HEIGHT; i++) {
			for (var j = 0; j < WIDTH; j++) {
			    var box = $('#box' + (i * WIDTH + j));
                box.css('top', (DIMEN * i + 20) + 'px');
                box.css('left', (DIMEN * j + 20) + 'px');
                box.css('line-height', (DIMEN - 2) + 'px');
			}
		}
		if (DIMEN <= 17) {
			$('#gameboard').css('font-size', '8pt');
			$('#zOut').attr('disabled', 'disabled');
		} else if (DIMEN <= 20) {
			$('#gameboard').css('font-size', '9pt');
		} else if (DIMEN <= 24) {
			$('#gameboard').css('font-size', '10pt');
		} else if (DIMEN <= 27) {
			$('#gameboard').css('font-size', '11pt');
		} else {
			$('#gameboard').css('font-size', '12pt');
		}
	}

	// Pressing enter in any field will submit the data
	function addKeyListeners() {
		var fields = ['width', 'height', 'bmb', 'advsub',
					  'size', 'diff', 'sub'];
		var i;
		for (i = 0; i < 4; i++) {
			$('#' + fields[i]).keypress(function(e) {
				if (e.which === 13) {
					adv = true;
					clearBoard();
				}
			});
		}
		for (i = 4; i < fields.length; i++) {
			$('#' + fields[i]).keypress(function(e) {
				if (e.which === 13) {
					adv = false;
					clearBoard();
				}
			});
		}
		$("#sub").click(function() {
			adv = false;
			clearBoard();
		});
		$("#advSub").click(function() {
			adv = true;
			clearBoard();
		});
	}

	function startTimer() {
		var d = new Date();
		var time = d.getTime();
		timer = setInterval(function() {
			var d2 = new Date();
			var elapsed = d2.getTime() - time + pausedTime;
			var minutes = '';
			if (elapsed >= 60000) {
				minutes = parseInt(elapsed / 60000) + ':';
				elapsed = elapsed % 60000;
			} else {
				minutes = '0:'
			}
			if (elapsed < 10000) {
				minutes += '0';
			}
			// Manually add zeros if needed
			if (elapsed % 1000 === 0) {
				$('#time').html(minutes + elapsed / 1000 + '000');
			} else if (elapsed % 100 === 0) {
				$('#time').html(minutes + elapsed / 1000 + '00');
			} else if (elapsed % 10 === 0) {
				$('#time').html(minutes + elapsed / 1000 + '0');
			} else {
				$('#time').html(minutes + elapsed / 1000);
			}
		}, 1);
	}

	function addRightClick() {
		var thisID = '#' + this.id;
        var bCount = $("#bCount");
		if ($(thisID).hasClass('covered')) {
			if ($(thisID).hasClass('flag')) {
				$(thisID).addClass('guess');
				$(thisID).removeClass('flag');
                bCount.html((parseInt(bCount.html()) + 1) + ' ');
				this.innerHTML = '<img src="guess.png" style="width:' + (DIMEN - 2) + 'px; height:' + (DIMEN - 2) + 'px;" />';

			} else if ($(thisID).hasClass('guess')) {
				$(thisID).removeClass('guess');
				$(thisID).html('');
			} else {
				$(thisID).addClass('flag');
				this.innerHTML = '<img src="flag.png" style="width:' + (DIMEN - 2) + 'px; height:' + (DIMEN - 2) + 'px;" />';
				bCount.html((parseInt(bCount.html()) - 1) + ' ');
			}
		}
		return false;
	}

	// Sometimes uncover() needs a parameter, other times it doesn't. This handles
	// the case where there is no paramter (when a user directly clicks on a covered square).
	function uncoverHelper() {
		// If this is the first click, set up the timer
		if (!started) {
			started = !started;
			startTimer();
			$('#pause').removeAttr('disabled');
		}
		var boxID = this.id;
		boxID = parseInt(boxID.substring(3));
		// if the box isn't covered, check to see if there are
		// the right number of flags surrounding it, otherwise
		// do a standard uncover
		if (this.className.indexOf('covered') === -1) {
			checkFlags(boxID);
		} else {
			uncover(boxID);
		}
	}

	function unhighlightSurrounding(box) {
		var place = parseInt(box.id.substr(3));
		var borderBox;
		if (place % WIDTH !== 0) {
		    borderBox = $('#box' + (place - 1));
			if (borderBox.hasClass('covered')) {
				borderBox.css('background-color', '');
			}

			borderBox = $('#box' + (place - (WIDTH + 1)));
			if (borderBox.hasClass('covered')) {
				borderBox.css('background-color', '');
			}

			borderBox = $('#box' + (place + WIDTH - 1));
			if (borderBox.hasClass('covered')) {
				borderBox.css('background-color', '');
			}
		}
		if (place > WIDTH - 1) {
		    borderBox = $('#box' + (place - WIDTH));
			if (borderBox.hasClass('covered')) {
				borderBox.css('background-color', '');
			}
		}
		if (place < WIDTH * (HEIGHT - 1)) {
		    borderBox = $('#box' + (place + WIDTH));
			if (borderBox.hasClass('covered')) {
				borderBox.css('background-color', '');
			}
		}
		if ((place + 1) % WIDTH !== 0) {
		    borderBox = $('#box' + (place + 1));
			if (borderBox.hasClass('covered')) {
				borderBox.css('background-color', '');
			}

			borderBox = $('#box' + (place - (WIDTH - 1)));
			if (borderBox.hasClass('covered')) {
				borderBox.css('background-color', '');
			}

			borderBox = $('#box' + (place + WIDTH + 1));
			if (borderBox.hasClass('covered')) {
				borderBox.css('background-color', '');
			}
		}
	}

	// When an uncovered box is right clicked, highlight the surrounding uncovered boxes
	function highlightSurrounding(box) {
		var place = parseInt(box.id.substr(3));
		var borderBox;
		if (place % WIDTH !== 0) {
		    borderBox = $('#box' + (place - 1));
			if (borderBox.hasClass('covered') && !borderBox.hasClass('flag')) {
				borderBox.css('background-color', '#DDD');
			}

			borderBox = $('#box' + (place - (WIDTH + 1)));
			if (borderBox.hasClass('covered') && !borderBox.hasClass('flag')) {
				borderBox.css('background-color', '#DDD');
			}

			borderBox = $('#box' + (place + WIDTH - 1));
			if (borderBox.hasClass('covered') && !borderBox.hasClass('flag')) {
				borderBox.css('background-color', '#DDD');
			}
		}

		if (place > WIDTH - 1) {
		    borderBox = $('#box' + (place - WIDTH));
			if (borderBox.hasClass('covered') && !borderBox.hasClass('flag')) {
				borderBox.css('background-color', '#DDD');
			}
		}

		if (place < WIDTH * (HEIGHT - 1)) {
		    borderBox = $('#box' + (place + WIDTH));
			if (borderBox.hasClass('covered') && !borderBox.hasClass('flag')) {
				borderBox.css('background-color', '#DDD');
			}
		}
		if ((place + 1) % WIDTH !== 0) {
		    borderBox = $('#box' + (place + 1));
			if (borderBox.hasClass('covered') && !borderBox.hasClass('flag')) {
				borderBox.css('background-color', '#DDD');
			}

			borderBox = $('#box' + (place - (WIDTH - 1)));
			if (borderBox.hasClass('covered') && !borderBox.hasClass('flag')) {
				borderBox.css('background-color', '#DDD');
			}

			borderBox = $('#box' + (place + WIDTH + 1));
			if (borderBox.hasClass('covered') && !borderBox.hasClass('flag')) {
				borderBox.css('background-color', '#DDD');
			}
		}
	}

	// If the box clicked has been uncovered, check to see
	// if the number of flags surrounding the box is equal to the
	// number of bombs. If it is, uncover all surrounding boxes that
	// aren't flagged. Causes a loss if flags are incorrectly placed
	function checkFlags(place) {
		var box = '#box';
		// An attempt to make it look cleaner. The nature of the problem
		// pretty much prevents that from happening
		var places = [box + (place - 1),
					  box + (place - (WIDTH + 1)),
					  box + (place + WIDTH - 1),
					  box + (place - WIDTH),
					  box + (place + WIDTH),
					  box + (place + 1),
					  box + (place - (WIDTH - 1)),
					  box + (place + WIDTH + 1)];
		var flagCount = 0;
		var i;
		if (place % WIDTH !== 0) {
			for (i = 0; i < 3; i++) {
				if ($(places[i]).hasClass('flag')) {
					flagCount++;
				}
			}
		}
		if (place > WIDTH - 1) {
			if ($(places[3]).hasClass('flag')) {
				flagCount++;
			}
		}
		if (place < WIDTH * (HEIGHT - 1)) {
			if ($(places[4]).hasClass('flag')) {
				flagCount++;
			}
		}
		if ((place + 1) % WIDTH !== 0) {
			for (i = 5; i < 8; i++) {
				if ($(places[i]).hasClass('flag')) {
					flagCount++;
				}
			}
		}
		// If the flags surrounding the clicked box equals the bomb count,
		// uncover if not already uncovered
		if (flagCount === bombCount[place] && bombs.indexOf(place) === -1) {
			uncover(place);
			if (place % WIDTH !== 0) {
				if (uncovered.indexOf(place - 1) === -1) {
					uncover(place - 1);
				}
				if (place > WIDTH - 1 && uncovered.indexOf(place - (WIDTH + 1)) === -1) {
					uncover(place - (WIDTH + 1));
				}
				if (place < WIDTH * (HEIGHT - 1) && uncovered.indexOf(place + WIDTH - 1) === -1) {
					uncover(place + WIDTH - 1);
				}
			}
			if (place > WIDTH - 1 && uncovered.indexOf(place - WIDTH) === -1) {
				uncover(place - WIDTH);
			}
			if (place < WIDTH * (HEIGHT - 1) && uncovered.indexOf(place + WIDTH) === -1) {
				uncover(place + WIDTH);
			}
			if ((place + 1) % WIDTH !== 0) {
				if (uncovered.indexOf(place + 1) === -1) {
					uncover(place + 1);
				}
				if (place > WIDTH - 1 && uncovered.indexOf(place - (WIDTH - 1)) === -1) {
					uncover(place - (WIDTH - 1));
				}
				if (place < WIDTH * (HEIGHT - 1) && uncovered.indexOf(place + (WIDTH + 1)) === -1) {
					uncover(place + (WIDTH + 1));
				}
			}
		}
	}

	// Uncover the given box, and if there are no surrounding bombs,
	// uncover all surrounding boxes
	function uncover(place) {
		// Don't uncover if flagged
        var box = $('#box' + place);
		if (!box.hasClass('flag') && !box.hasClass('guess')) {
			box.addClass('c' + bombCount[place]);
			if (uncovered.indexOf(place) === -1) {
				uncovered.push(place);
			}
			box.removeClass('covered');
			// Place the number of surrounding bombs in the box, unless
			// there aren't any
			if (bombCount[place] !== 0) {
				box.html(bombCount[place]);
			}
			// Uncover if there is at least
			// one life left or there is not bomb
			if (bombs.indexOf(place) === -1 || lives !== 0) {
				// If there is a bomb there, get rid of a life, and
				// permanantly flag the box
				if (bombs.indexOf(place) !== -1) {
				    var liveDiv = $("#lives");
                    liveDiv.html(parseInt(liveDiv.html()) - 1);
					lives--;
					box.removeClass('covered');
					box.html('<img src="bomb.png" style="width:' + (DIMEN - 2) + 'px; height:' + (DIMEN - 2) + 'px;" />');
					box.addClass('bomb');
					// Display the flag after one second
					setTimeout(function() {
						box.addClass('flag');
						box.removeClass('bomb');
						uncovered.splice(uncovered.indexOf(place));
						var bCount = $("#bCount");
                        bCount.html(parseInt(bCount.html() - 1) + ' ');
						box.html('<img src="flag.png" style="width:' + (DIMEN - 2) + 'px; height:' + (DIMEN - 2) + 'px;" />');
					}, 1000);
				} else {
					// Uncover surrounding if there are no bombs next to the clicked square
					if (bombCount[place] === 0) {
						if (place % WIDTH !== 0) {
							if (uncovered.indexOf(place - 1) === -1) {
								uncover(place - 1);
							}
							if (place > WIDTH - 1 && uncovered.indexOf(place - (WIDTH + 1)) === -1) {
								uncover(place - (WIDTH + 1));
							}
							if (place < WIDTH * (HEIGHT - 1) && uncovered.indexOf(place + WIDTH - 1) === -1) {
								uncover(place + WIDTH - 1);
							}
						}
						if (place > WIDTH - 1 && uncovered.indexOf(place - WIDTH) === -1) {
							uncover(place - WIDTH);
						}
						if (place < WIDTH * (HEIGHT - 1) && uncovered.indexOf(place + WIDTH) === -1) {
							uncover(place + WIDTH);
						}
						if ((place + 1) % WIDTH !== 0) {
							if (uncovered.indexOf(place + 1) === -1) {
								uncover(place + 1);
							}
							if (place > WIDTH - 1 && uncovered.indexOf(place - (WIDTH - 1)) === -1) {
								uncover(place - (WIDTH - 1));
							}
							if (place < WIDTH * (HEIGHT - 1) && uncovered.indexOf(place + (WIDTH + 1)) === -1) {
								uncover(place + (WIDTH + 1));
							}
						}
					}
				}
			// LOSS. End timer, reveal all squares
			} else {
				clearInterval(timer);
				for (var i = 0; i < WIDTH * HEIGHT; i++) {
				    box = $('#box' + i);
					box.removeClass('covered');
					if (bombs.indexOf(i) !== -1) {
						box.html('<img src="bomb.png" style="width:' + (DIMEN - 2) + 'px; height:' + (DIMEN - 2) + 'px;" />');
						box.addClass('bomb');
					} else {
						box.addClass('c' + bombCount[i]);
						if (bombCount[i] !== 0) {
							box.html(bombCount[i]);
						}
					}
				}
				$('#endGame').html('Sorry, you lost =(');
				$('#pause').attr('disabled', 'disabled');
			}
		}
		// VICTORY. Smiley Face background, stop timer
		if (uncovered.length + bombs.length === WIDTH * HEIGHT) {
			$('#gameboard').css({'background-image' : 'url(smile.png)', 'background-size' : 'contain', 'background-repeat' : 'no-repeat', 'background-position' : 'center'});
			$('.box').css('opacity', '.5');
			$('#pause').attr('disabled', 'disabled');
			clearInterval(timer);
			$('#endGame').html('You Win! You swept the board in ' + $('#time').html());
		}
	}
})();