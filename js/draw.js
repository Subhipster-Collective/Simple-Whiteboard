//globals for the canvas
let canvas, ctx;
let isDown = false;
let maxWidth, minWidth, maxHeight, minHeight;
let prevCanvas;


//globals for the networking
let uid;
let fbCon;
let sessionId;
let roomId = extractQueryString('roomId');

//this function gets executed when html body is loaded (onLoad tag in HTML file)
function init() {

    //initialize exchange
    connect(roomId);
    //initlaize canvas elements
    canvas = document.getElementById('myCanvas');
    ctx = canvas.getContext('2d');

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


    // color changing events ------------------------------------------------


    document.getElementsByClassName('button red')[0].addEventListener( "click", (e) => {
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

function handleMouseEvent(key,e) {
    if (fbCon){
        switch(key) {
            case 'down': {
                let currX = e.clientX - canvas.offsetLeft;
                let currY = e.clientY - canvas.offsetTop;

                maxWidth = currX;
                minWidth = currX;

                minY = currY;
                maxY = currY

                dotMeUpBrotendo(currX,currY);
                isDown = true;
                break;
            }

            case 'move': {
                if (isDown) {
                    let currX = e.clientX - canvas.offsetLeft;
                    let currY = e.clientY - canvas.offsetTop;

                    updateRectangle(currX, currY);

                    console.log([currX, currY]);
                    draw(currX, currY);
                }
                break;
            }

        }

        if ( key === 'up' || (key === 'out' && isDown)) {
            let diffsToPush = collectDiffs();
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
    let currCanvas = ctx.getImageData(0,0, canvas.width, canvas.height);
    let tempList = [];
    for (let i = 0; i < currCanvas.data.length; i++ ) {
        if (prevCanvas.data[i] !== currCanvas.data[i]) {
            tempList.push(i)
        }
    }
    return tempList
}

function updateRectangle(currX,currY) {
    if (currX < minWidth) minWidth = currX;
    else if (currX > maxWidth) maxWidth = currX;

    if (currY < minHeight) minHeight = currY;
    else if (currY > maxHeight) maxHeight = currX=Y;

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
                    drawPixels(child.key,child.val());
                } );

            });
        } else {
        }
    });
}

function drawPixels(key, diffs) {

    let rawImage = ctx.getImageData(0,0, canvas.width, canvas.height);

    for (let i = 0; i < diffs.length; i++) {
        rawImage.data[diffs[i]] = 255;
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
