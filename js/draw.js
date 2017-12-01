/* eslint-env browser */
/* eslint indent: ["error", 4, { "SwitchCase": 1 }] */
/* globals firebase */

//globals for the canvas
let canvas, ctx;
let prevCanvas, prevCtx;
let isDown = false;
let maxWidth, minWidth, maxHeight, minHeight;

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

    //event listeners (asynchronous programming)

    //executes whenever mouse comes clicks on canvas
    canvas.addEventListener('mousedown', (e) => { //arrow callback function
        handleMouseEvent('down',e);
    }, false);

    //executes whenever mouse moves over canvas
    canvas.addEventListener('mousemove', (e) => { //arrow callback function
        handleMouseEvent('move',e);
    }, false);

    //executes whenver mouse lifts off canvas.
    canvas.addEventListener('mouseup', (e) => { //arrow callback function
        handleMouseEvent('up',e);
    }, false);

    //executes whenever mouse goes out of canvas bounds
    canvas.addEventListener('mouseout', (e) => { //arrow callback function
        handleMouseEvent('out',e);
    }, false);


    // color changing events ------------------------------------------------


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
}

function handleMouseEvent(key, e) {
    if (fbCon){
        switch(key) {
            case 'down': {
                const currX = e.clientX - canvas.offsetLeft;
                const currY = e.clientY - canvas.offsetTop;

                maxWidth = currX;
                minWidth = currX;

                minHeight = currY;
                maxHeight = currY;

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
            const diffsToPush = collectDiffs();
            sendToFB(ctx.fillStyle, diffsToPush);
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
    //cvSave = ctx.getImageData(0,0,canvas.width, canvas.height);
}

function draw(currX,currY) {
    ctx.lineTo(currX,currY);
    ctx.stroke();
    //cvSave = ctx.getImageData(0,0,canvas.width, canvas.height);
}

function collectDiffs() {
    const currCanvas = ctx.getImageData(minWidth,minHeight, maxWidth, maxHeight);
    const formerCanvas = prevCtx.getImageData(minWidth,minHeight, maxWidth, maxHeight);
    const tempList = [];
    for (let i = 0; i < currCanvas.data.length; i++ ) {
        if (formerCanvas.data[i] !== currCanvas.data[i]) {
            tempList.push(i);
        }
    }
    return tempList;
}

function updateRectangle(currX,currY) {
    if (currX < minWidth) minWidth = currX;
    else if (currX > maxWidth) maxWidth = currX;

    if (currY < minHeight) minHeight = currY;
    else if (currY > maxHeight) maxHeight = currY;

}

// networking -------------------------------------------------


function sendToFB(hex, diffsToPush) {
    const pushObj = new Object();
    switch(hex) {
        case '#ff0000': {
            pushObj['R' +':'+  + minWidth  + ',' + maxWidth + ',' + minHeight + ',' + maxHeight] = diffsToPush;
            fbCon.child(roomId).child('diffs').push(pushObj);
            break;
        }
        case  '#000000': {
            pushObj['K' +':'+  + minWidth  + ',' + maxWidth + ',' + minHeight + ',' + maxHeight] = diffsToPush;
            fbCon.child(roomId).child('diffs').push(pushObj);
            break;
        }
        case '#0000ff' : {
            pushObj['B' +':'+  + minWidth  + ',' + maxWidth + ',' + minHeight + ',' + maxHeight] = diffsToPush;
            fbCon.child(roomId).child('diffs').push(pushObj);
            break;
        }
        default : {
            pushObj['G' +':'+  + minWidth  + ',' + maxWidth + ',' + minHeight + ',' + maxHeight] = diffsToPush;
            fbCon.child(roomId).child('diffs').push(pushObj);
            break;
        }
    }
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
                    const test = fbCon.child(roomId).child('users').push(uid);

                    // When I disconnect, remove this device
                    test.onDisconnect().remove();
                }
            });

            fbCon.child(roomId).child('diffs').on('child_added', (snapshot) => {
                snapshot.forEach( (child) => {
                    const key = parseLocationKey(child.key);
                    drawPixels(key[0],key[1],child.val());
                });

            });
        } else {
            console.log('Failed to connect to Firebase.');
        }
    });
}

function drawPixels(color, rectVals ,diffs) {
    const rawImage = ctx.getImageData(rectVals[0],rectVals[2], rectVals[1], rectVals[3]);

    for (let i = 0; i < diffs.length; i++) {
        rawImage.data[diffs[i]] = 255;
    }

    ctx.putImageData(rawImage, rectVals[0], rectVals[2]);
    prevCtx.putImageData(rawImage, rectVals[0], rectVals[2]);
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

function parseLocationKey(key) {
    const parts = key.split(':');
    parts[1] = parts[1].split(',').map( x => parseInt(x, 10) );
    return parts;
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
