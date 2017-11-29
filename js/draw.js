//globals for the canvas
let canvas, ctx;
let prevX = 0;
let prevY = 0;
let isDown = false;
let cvSave;

//globals for the networking
let uid;
let fbCon;
let sessionId;
let roomId = extractQueryString('roomId');
let prevCanvas;

//this function gets executed when html body is loaded (onLoad tag in HTML file)
function init() {

    //initialize exchange
    connect(roomId);
    //initlaize canvas elements
    canvas = document.getElementById('myCanvas');
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'black'
    prevCanvas = ctx.getImageData(0, 0, canvas.width, canvas.height);
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

}

function handleMouseEvent(key,e) {
    if (fbCon){
        switch(key) {
            case 'down': {
                prevX = e.clientX - canvas.offsetLeft;
                prevY = e.clientY - canvas.offsetTop;
                ctx.moveTo(prevX,prevY);
                dotMeUpBrotendo();
                isDown = true;
                break;
            }

            case 'move': {
                if (isDown) {
                    const currX = e.clientX - canvas.offsetLeft;
                    const currY = e.clientY - canvas.offsetTop;
                    draw(currX, currY);
                }
                break;
            }

            case 'up' : {
                let diffsToPush = collectDiffs();
                sendToFB(ctx.fillStyle, diffsToPush);
                isDown = false;
            }
        }

        if (key === 'out' && isDown) {
            let diffsToPush = collectDiffs();
            sendToFB(ctx.fillStyle, diffsToPush);
            isDown = false;
        }
    }
}

//draws a dot if you click
function dotMeUpBrotendo() {
    ctx.beginPath();
    ctx.fillRect(prevX, prevY, 1, 1);
    ctx.closePath();
    //cvSave = ctx.getImageData(0,0,canvas.width, canvas.height);
}

function draw(currX,currY) {
    ctx.lineTo(currX,currY);
    ctx.stroke();
    prevX = currX;
    prevY = currY;
    //cvSave = ctx.getImageData(0,0,canvas.width, canvas.height);
}

function collectDiffs() {
    let currCanvas = ctx.getImageData(0,0, canvas.width, canvas.height);
    let tempList = [];
    for (let i = 0; i < currCanvas.data.length; i++ ) {
        if (prevCanvas.data[i] !== currCanvas.data[i]) {
            tempList.push(i)
        }
    }

    if (ctx.fillStyle !== '#000000') { //if its not black
        return tempList.filter((element, index) => { // filter out the alpha component because it can be computed client side
            return index % 2 === 0;
        })
    } else {
        return tempList
    }
}

// networking -------------------------------------------------


function sendToFB(hex, diffsToPush) {
    switch(hex) {
        case '#ff0000': {
            fbCon.child(roomId).child('diffs').push({'R' : diffsToPush});
            break;
        }
        case  '#000000': {
            fbCon.child(roomId).child('diffs').push({'K' : diffsToPush});
            break;
        }
        case '#0000ff' : {
            fbCon.child(roomId).child('diffs').push({'B' : diffsToPush});
            break;
        }
        default : {
            fbCon.child(roomId).child('diffs').push({'G' : diffsToPush});
            break;
        }
    }
}



function connect(roomId) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user && roomId){
            // User is signed in.
            console.log('connected');
            const isAnonymous = user.isAnonymous;
            uid = user.uid;
            fbCon = firebase.database().ref();

            fbCon.child(roomId).child('diffs').on('child_added', (snapshot) => {
                snapshot.forEach( (child) => {
                    setTimeout(drawPixels(child.key,child.val()), 5)
                } );

            });
        } else {
            //TODO Do stuff jif they inputted an invalid room or fb is down
        }
    });
}

function drawPixels(key, diffs) {

    let rawImage = ctx.getImageData(0,0, canvas.width, canvas.height);

    for (let i = 0; i < diffs.length; i++) {
        if (key === 'G' ) {
            rawImage.data[diffs[i]] = 137;
            rawImage.data[ diffs[i ] + 2 ] = 255;
        } else if (key === 'B') {
            console.log('drawing blues');
            rawImage.data[ diffs[i] ] = 255;
            rawImage.data[ diffs[i] + 1 ] = 255;
        } else if (key === 'R') {
            rawImage.data[ diffs[i] ] = 255;
            rawImage.data[ diffs[i ] + 3 ] = 255;
        } else {
            rawImage.data[ diffs[i] ] = 255;
        }
    }
    ctx.putImageData(rawImage, 0, 0)
    prevCanvas =  ctx.getImageData(0,0, canvas.width, canvas.height);
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
