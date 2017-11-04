let canvas, ctx;

function init() {
    canvas = document.getElementById('myCanvas');
    ctx = canvas.getContext('2d');

    ctx.moveTo(0,0);
    ctx.lineTo(200,100);
    ctx.stroke();

    canvas.addEventListener('mousedown', (e) => { //arrow callback function
        drawShittyLine(e);
    }, false);
}

function drawShittyLine(e) {
    const x = e.clientX - canvas.offsetLeft;
    const y = e.clientY - canvas.offsetTop;
    ctx.moveTo(x,y);
    ctx.lineTo(x-5,y-5);
    ctx.stroke();
}
