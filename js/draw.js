/* eslint-env browser */
/* eslint indent: ["error", 4, { "SwitchCase": 1 }] */
/* globals firebase */

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
let uid;
let fbCon;
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

    //executes whenever mouse comes clicks on canvas
    canvas.addEventListener('mousedown', (e) => { //arrow callback function
        handleMouseEvent('down', e);
    }, false);

    //executes whenever mouse moves over canvas
    canvas.addEventListener('mousemove', (e) => { //arrow callback function
        handleMouseEvent('move', e);
    }, false);

    //executes whenver mouse lifts off canvas.
    canvas.addEventListener('mouseup', (e) => { //arrow callback function
        handleMouseEvent('up', e);
    }, false);

    //executes whenever mouse goes out of canvas bounds
    canvas.addEventListener('mouseout', (e) => { //arrow callback function
        handleMouseEvent('out', e);
    }, false);


    //color changing events ------------------------------------------------


    document.getElementsByClassName('button red')[0].addEventListener( 'click', (e) => {
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'red';
    });

    document.getElementsByClassName('button black')[0].addEventListener( 'click', (e) => {
        ctx.strokeStyle = 'black';
        ctx.fillStyle = 'black';
    });

    document.getElementsByClassName('button green')[0].addEventListener( 'click' , (e) => {
        ctx.strokeStyle = '#00ff00';
        ctx.fillStyle = '#00ff00';
    });

    document.getElementsByClassName('button blue')[0].addEventListener( 'click' , (e) => {
        ctx.strokeStyle = 'blue';
        ctx.fillStyle = 'blue';
    });

    document.getElementsByClassName('button yellow')[0].addEventListener( 'click' , (e) => {
        ctx.strokeStyle = 'yellow';
        ctx.fillStyle = 'yellow';
    });
}

function handleMouseEvent(key, e) {
    if (fbCon){
        switch(key) {
            case 'down': {
                const currX = e.clientX - canvas.offsetLeft;
                const currY = e.clientY - canvas.offsetTop;

                modifiedArea.maxWidth = currX;
                modifiedArea.minWidth = currX;

                modifiedArea.minHeight = currY;
                modifiedArea.maxHeight = currY;

                dotMeUpBrotendo(currX,currY);
                isDown = true;
                break;
            }

            case 'move': {
                if (isDown) {
                    const currX = e.clientX - canvas.offsetLeft;
                    const currY = e.clientY - canvas.offsetTop;

                    updateRectangle(currX, currY);

                    draw(currX, currY);
                }
                break;
            }

        }

        if ( key === 'up' || (key === 'out' && isDown)) {
            const coords = collectDiff();
            sendToFB(coords);
            isDown = false;
        }
    }
}

//draws a dot if you click
function dotMeUpBrotendo(currX, currY) {
    ctx.moveTo(currX,currY);
    ctx.beginPath();
    ctx.fillRect(currX, currY, 1, 1);
    ctx.closePath();
}

function draw(currX,currY) {
    ctx.lineTo(currX,currY);
    ctx.stroke();
}

function collectDiff() {
    const currCanvas = ctx.getImageData(modifiedArea.minWidth, modifiedArea.minHeight, modifiedArea.maxWidth, modifiedArea.maxHeight);
    const formerCanvas = prevCtx.getImageData(modifiedArea.minWidth, modifiedArea.minHeight, modifiedArea.maxWidth, modifiedArea.maxHeight);
    
    const coords = {};
    for(let i = 0; i < currCanvas.data.length; i += 4) {
        if(   formerCanvas.data[i] !== currCanvas.data[i]
           || formerCanvas.data[i+1] !== currCanvas.data[i+1]
           || formerCanvas.data[i+2] !== currCanvas.data[i+2]
           || formerCanvas.data[i+3] !== currCanvas.data[i+3]) {
            const color = rgbToInt({red: currCanvas.data[i], green: currCanvas.data[i+1], blue: currCanvas.data[i+2]});
            if(!coords.hasOwnProperty(color))
                coords[color] = [];
            coords[color].push(i);
        }
    }
    
    return coords;
}

function updateRectangle(currX,currY) {
    if (currX < modifiedArea.minWidth)
        modifiedArea.minWidth = currX;
    else if (currX > modifiedArea.maxWidth)
        modifiedArea.maxWidth = currX;

    if (currY < modifiedArea.minHeight)
        modifiedArea.minHeight = currY;
    else if (currY > modifiedArea.maxHeight)
        modifiedArea.maxHeight = currY;

}

// networking -------------------------------------------------


function sendToFB(coords) {
    fbCon.child(roomId).child('diffs').push({coords, modifiedArea});
}

function connect(roomId) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user && roomId){
            // User is signed in.
            console.log('connected');
            uid = user.uid;
            fbCon = firebase.database().ref();

            const connectedRef = firebase.database().ref('.info/connected');
            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    // We're connected (or reconnected)! Do anything here that should happen only if online (or on reconnect)
                    
                    const userLocation = fbCon.child(roomId).child('users');
                    userLocation.update({[uid]: true});

                    // When I disconnect, remove this device
                    userLocation.onDisconnect().update({[uid]: false});
                }
            });

            fbCon.child(roomId).child('diffs').on('child_added', (snapshot) => {
                const modifiedArea = snapshot.child('modifiedArea').val();
                snapshot.child('coords').forEach(child => drawPixels(child, modifiedArea));
            });
        } else {
            console.log('Failed to connect to Firebase.');
        }
    });
}

function drawPixels(diff, modifiedArea) {
    const rawImage = ctx.getImageData(modifiedArea.minWidth, modifiedArea.minHeight, modifiedArea.maxWidth, modifiedArea.maxHeight);
    const color = intToRgb(diff.key);
    
    for(const coord of diff.val()) {
        rawImage.data[coord] = color.red;
        rawImage.data[coord+1] = color.green;
        rawImage.data[coord+2] = color.blue;
        rawImage.data[coord+3] = 255;
    }

    ctx.putImageData(rawImage, modifiedArea.minWidth, modifiedArea.minHeight);
    prevCtx.putImageData(rawImage, modifiedArea.minWidth, modifiedArea.minHeight);
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
