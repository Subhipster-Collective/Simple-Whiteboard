/* eslint-env browser */
/* eslint indent: ["error", 4, { "SwitchCase": 1 }] */
/* globals firebase */
/* eslint no-fallthrough: ["error", { "commentPattern": "falls through" }] */

//constants used to simulate bit shifts
// k * SHIFT_8 = k<<8
// floor(k / SHIFT_16) = k>>16
const SHIFT_8 = 256;
const SHIFT_16 = 65536;
//const SHIFT_24 = 16777216;

//globals for the canvas
let canvas, ctx;
let prevCanvas, prevCtx;
let isDown = false;
const modifiedArea = {};

//globals for the networking
let fbCon, boardRef, usersRef;
const roomId = extractQueryString('roomId');

//this function gets executed when html body is loaded (onLoad tag in HTML file)
function init() {
    //initialize exchange
    connect(roomId);
    //initlaize canvas elements
    canvas = document.getElementById('myCanvas');
    ctx = canvas.getContext('2d');

    prevCanvas = cloneCanvas(canvas);
    prevCtx = prevCanvas.getContext('2d');

    ctx.lineWidth = 2;

    //executes whenever mouse comes clicks on canvas
    canvas.addEventListener('mousedown', handleMouseEvent, false);

    //executes whenever mouse moves over canvas
    canvas.addEventListener('mousemove', handleMouseEvent, false);

    //executes whenver mouse lifts off canvas.
    canvas.addEventListener('mouseup', handleMouseEvent, false);

    //executes whenever mouse goes out of canvas bounds
    canvas.addEventListener('mouseout', handleMouseEvent, false);


    //color changing events
    for(const button of document.getElementsByClassName('button')) {
        button.addEventListener('click', setColor);
    }
}

function handleMouseEvent(e) {
    if(fbCon) {
        switch(e.type) {
            case 'mousedown': {
                const currX = e.clientX - canvas.offsetLeft;
                const currY = e.clientY - canvas.offsetTop;

                modifiedArea.minX = currX;
                modifiedArea.maxX = currX;

                modifiedArea.minY = currY;
                modifiedArea.maxY = currY;

                drawDot(currX, currY);
                isDown = true;
                break;
            }
            case 'mousemove': {
                if (isDown) {
                    const currX = e.clientX - canvas.offsetLeft;
                    const currY = e.clientY - canvas.offsetTop;

                    updateRectangle(currX, currY);

                    draw(currX, currY);
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
                modifiedArea.minX -= 5;
                modifiedArea.maxX += 5;
                modifiedArea.minY -= 5;
                modifiedArea.maxY += 5;
                const coords = collectDiff();
                boardRef.child('diffs').push({coords, modifiedArea});
                isDown = false;
                break;
            }
        }
    }
}

function setColor(e) {
    const color = getComputedStyle(e.target).backgroundColor;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
}

//draws a dot if you click
function drawDot(currX, currY) {
    const halfWidth = Math.floor(ctx.lineWidth / 2);
    ctx.moveTo(currX - halfWidth, currY - halfWidth);
    ctx.beginPath();
    ctx.fillRect(currX - halfWidth, currY - halfWidth, ctx.lineWidth, ctx.lineWidth);
    ctx.closePath();
}

function draw(currX, currY) {
    ctx.lineTo(currX, currY);
    ctx.stroke();
    console.log(ctx.lineWidth);
}

function collectDiff() {
    const width = modifiedArea.maxX - modifiedArea.minX;
    const height = modifiedArea.maxY - modifiedArea.minY;
    const currCanvas = ctx.getImageData(modifiedArea.minX, modifiedArea.minY, width, height);
    const formerCanvas = prevCtx.getImageData(modifiedArea.minX, modifiedArea.minY, width, height);
    
    const coords = {};
    for(let i = 0; i < currCanvas.data.length; i += 4) {
        if(   formerCanvas.data[i] !== currCanvas.data[i]
           || formerCanvas.data[i+1] !== currCanvas.data[i+1]
           || formerCanvas.data[i+2] !== currCanvas.data[i+2]
           || formerCanvas.data[i+3] !== currCanvas.data[i+3]) {
            const color = rgbToInt({red: currCanvas.data[i], green: currCanvas.data[i+1], blue: currCanvas.data[i+2]});
            if(!coords.hasOwnProperty(color)) {
                coords[color] = [];
            }
            coords[color].push(i);
        }
    }
    
    return coords;
}

function updateRectangle(currX,currY) {
    if (currX < modifiedArea.minX)
        modifiedArea.minX = currX;
    else if (currX > modifiedArea.maxX)
        modifiedArea.maxX = currX;

    if (currY < modifiedArea.minY)
        modifiedArea.minY = currY;
    else if (currY > modifiedArea.maxY)
        modifiedArea.maxY = currY;

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

            boardRef.child('diffs').on('child_added', (snapshot) => {
                const modifiedArea = snapshot.child('modifiedArea').val();
                snapshot.child('coords').forEach(child => drawPixels(child, modifiedArea));
            });
        } else {
            console.log('Failed to connect to Firebase.');
        }
    });
}

function drawPixels(diff, diffModifiedArea) {
    const color = intToRgb(diff.key);
    const rawImage = ctx.getImageData(
        diffModifiedArea.minX,
        diffModifiedArea.minY,
        diffModifiedArea.maxX - diffModifiedArea.minX,
        diffModifiedArea.maxY - diffModifiedArea.minY);
    
    for(const coord of diff.val()) {
        rawImage.data[coord] = color.red;
        rawImage.data[coord+1] = color.green;
        rawImage.data[coord+2] = color.blue;
        rawImage.data[coord+3] = 255;
    }

    ctx.putImageData(rawImage, diffModifiedArea.minX, diffModifiedArea.minY);
    prevCtx.putImageData(rawImage, diffModifiedArea.minX, diffModifiedArea.minY);
}

function rgbToInt(color) {
    return (color.red * SHIFT_16) + (color.green * SHIFT_8) + color.blue;
}

function intToRgb(color) {
    const red = Math.floor(color / SHIFT_16);
    color -= red * SHIFT_16;
    const green = Math.floor(color / SHIFT_8);
    const blue = color - (green * SHIFT_8);
    
    return {red, green, blue};
}

function cloneCanvas(oldCanvas) {
    //create a new canvas
    const newCanvas = document.createElement('canvas');
    const context = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;

    //apply the old canvas to the new one
    context.drawImage(oldCanvas, 0, 0);

    //return the new canvas
    return newCanvas;
}

function extractQueryString(name) {
    const url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
