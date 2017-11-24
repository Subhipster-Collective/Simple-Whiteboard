//globals so i dont have to pass stuff around all the time.
let canvas, ctx;
let db = '';
let prevX = 0;
let prevY = 0;
let isDown = false;

//this function gets executed when html body is loaded (onLoad tag in HTML file)
function init() {

    //initlaize canvas elements
    canvas = document.getElementById('myCanvas');
    ctx = canvas.getContext('2d');

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
    }
    if (key === 'out' || key === 'up') {
        isDown = false;
    }
}

//draws a dot if you click
function dotMeUpBrotendo() {
    ctx.beginPath();
    ctx.fillRect(prevX, prevY, 2, 2);
    ctx.closePath();
}

function draw(currX,currY) {
    ctx.lineTo(currX,currY);
    ctx.stroke();
    prevX = currX;
    prevY = currY;
}
