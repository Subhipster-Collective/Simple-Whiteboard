/* eslint-env browser */
/* eslint indent: ["error", 4, { "SwitchCase": 1 }] */
/* globals firebase */

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

    //event listeners (asynchronous programming)

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
    //cvSave = ctx.getImageData(0,0,canvas.width, canvas.height);
}

function draw(currX,currY) {
    ctx.lineTo(currX,currY);
    ctx.stroke();
    //cvSave = ctx.getImageData(0,0,canvas.width, canvas.height);
}

function collectDiff() {
    const currCanvas = ctx.getImageData(modifiedArea.minWidth, modifiedArea.minHeight, modifiedArea.maxWidth, modifiedArea.maxHeight);
    const formerCanvas = prevCtx.getImageData(modifiedArea.minWidth, modifiedArea.minHeight, modifiedArea.maxWidth, modifiedArea.maxHeight);
    /*const tempList = [];
    for (let i = 0; i < currCanvas.data.length; i++ ) {
        if (formerCanvas.data[i] !== currCanvas.data[i]) {
            tempList.push(i);
        }
    }*/
    
    const coords = {};
    for(let i = 0; i < currCanvas.data.length; i += 4) {
        if(   formerCanvas.data[i] !== currCanvas.data[i]
           || formerCanvas.data[i+1] !== currCanvas.data[i+1]
           || formerCanvas.data[i+2] !== currCanvas.data[i+2]
           || formerCanvas.data[i+3] !== currCanvas.data[i+3]) {
            const color = rgbComponentToHex(currCanvas.data[i])
                        + rgbComponentToHex(currCanvas.data[i+1])
                        + rgbComponentToHex(currCanvas.data[i+2]);
            if(!coords.hasOwnProperty(color))
                coords[color] = [];
            coords[color].push(i/4);
        }
    }
    
    return coords;
}

function rgbComponentToHex(component)
{
    const hex = component.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
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
    /*fbCon.child(roomId).child('diffs').push({
        [color]: {
            coords,
            modifiedArea
        }
    });*/
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
                snapshot.child('coords').forEach(child =>
                    //drawPixels( child.child('modifiedArea').val(), child.child('coords').val()) )
                    drawPixels(child, modifiedArea));
            });
        } else {
            console.log('Failed to connect to Firebase.');
        }
    });
}

function drawPixels(diff, modifiedArea) {
    const rawImage = ctx.getImageData(modifiedArea.minWidth, modifiedArea.minHeight, modifiedArea.maxWidth, modifiedArea.maxHeight);
    console.log(modifiedArea);
    
    const red = parseInt(diff.key.substring(0, 2), 16);
    const green = parseInt(diff.key.substring(2, 4), 16);
    const blue = parseInt(diff.key.substring(4, 6), 16);
    
    for(const coord of diff.val()) {
        console.log(coord);
        const canvasIndex = coord * 4;
        rawImage.data[canvasIndex] = red;
        rawImage.data[canvasIndex+1] = green;
        rawImage.data[canvasIndex+2] = blue;
        rawImage.data[canvasIndex+3] = 255;
    }

    ctx.putImageData(rawImage, modifiedArea.minWidth, modifiedArea.minHeight);
    prevCtx.putImageData(rawImage, modifiedArea.minWidth, modifiedArea.minHeight);
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
