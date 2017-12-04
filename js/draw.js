/* eslint-env browser */
/* eslint indent: ["error", 4, { "SwitchCase": 1 }] */
/* globals firebase */
/* eslint no-fallthrough: ["error", { "commentPattern": "falls through" }] */

//globals for the canvas
let mainCanvas, mainCtx;
let diffCanvas, diffCtx;
let isDown = false;
let myCoords = [];

//globals for the networking
let fbCon, boardRef, usersRef;
const roomId = extractQueryString('roomId');

//this function gets executed when html body is loaded (onLoad tag in HTML file)
function init() {
    //initialize exchange
    connect(roomId);
    //initlaize canvas elements
    mainCanvas = document.getElementById('myCanvas');
    mainCtx = mainCanvas.getContext('2d');
    mainCtx.lineWidth = 2;
    
    diffCanvas = document.createElement('canvas');
    diffCanvas.width = mainCanvas.width;
    diffCanvas.height = mainCanvas.height;
    diffCtx = diffCanvas.getContext('2d');
    diffCtx.lineWidth = mainCtx.lineWidth;

    //executes whenever mouse comes clicks on canvas
    mainCanvas.addEventListener('mousedown', handleMouseEvent, false);

    //executes whenever mouse moves over canvas
    mainCanvas.addEventListener('mousemove', handleMouseEvent, false);

    //executes whenver mouse lifts off canvas.
    mainCanvas.addEventListener('mouseup', handleMouseEvent, false);

    //executes whenever mouse goes out of canvas bounds
    mainCanvas.addEventListener('mouseout', handleMouseEvent, false);

    //color changing events
    for(const button of document.getElementsByClassName('button')) {
        button.addEventListener('click', setColor);
    }
}

function handleMouseEvent(e) {
    if(fbCon) {
        switch(e.type) {
            case 'mousedown': {
                const currX = e.clientX - mainCanvas.offsetLeft;
                const currY = e.clientY - mainCanvas.offsetTop;
                myCoords.push({x: currX, y: currY});
                drawDot(currX, currY, mainCtx);
                isDown = true;
                
                break;
            }
            case 'mousemove': {
                if (isDown) {
                    const currX = e.clientX - mainCanvas.offsetLeft;
                    const currY = e.clientY - mainCanvas.offsetTop;
                    myCoords.push({x: currX, y: currY});
                    drawLine(currX, currY, mainCtx);
                    //mainCtx.moveTo(currX, currY);
                }
                break;
            }
            case 'mouseout': {
                if(!isDown) {
                    break;
                }
            }
            //falls through
            case 'mouseup': {
                boardRef.child('diffs').push({coords: myCoords, color: mainCtx.strokeStyle});
                myCoords = [];
                isDown = false;
                
                break;
            }
        }
    }
}

function setColor(e) {
    const color = getComputedStyle(e.target).backgroundColor;
    mainCtx.strokeStyle = color;
    mainCtx.fillStyle = color;
}

//draws a dot if you click
function drawDot(x, y, ctx) {
    const halfWidth = Math.floor(ctx.lineWidth / 2);
    ctx.moveTo(x - halfWidth, y - halfWidth);
    ctx.beginPath();
    ctx.fillRect(x - halfWidth, y - halfWidth, ctx.lineWidth, ctx.lineWidth);
    ctx.closePath();
}

function drawLine(x, y, ctx) {
    ctx.lineTo(x, y);
    ctx.stroke();
}


// networking -------------------------------------------------


function connect(roomId) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user && roomId) {
            // User is signed in.
            console.log('connected');
            fbCon = firebase.database().ref();
            boardRef = fbCon.child('boards').child(roomId);
            usersRef = fbCon.child('users').child(roomId);

            const connectedRef = firebase.database().ref('.info/connected');
            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    // We're connected (or reconnected)! Do anything here that should happen only if online (or on reconnect)
                    
                    usersRef.update({[user.uid]: true});

                    // When I disconnect, remove this device
                    usersRef.onDisconnect().update({[user.uid]: false});
                }
            });

            boardRef.child('diffs').on('child_added', (diff) => {
                const coords = diff.child('coords').val();
                const color = diff.child('color').val();
                diffCtx.strokeStyle = color;
                diffCtx.fillStyle = color;
                
                drawDot(coords[0].x, coords[0].y, diffCtx);
                for(let i = 1; i < coords.length; ++i) {
                    drawLine(coords[i].x, coords[i].y, diffCtx);
                }
                
                mainCtx.drawImage(diffCanvas, 0, 0);
                diffCtx.clearRect(0, 0, diffCanvas.width, diffCanvas.height);
            });
        } else {
            console.log('Failed to connect to Firebase.');
        }
    });
}

function extractQueryString(name) {
    const url = window.location.href;
    name = name.replace(/[[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
