function collectDiffs() {
    let currCanvas = ctx.getImageData(0,0, canvas.width, canvas.height);
    let tempList = [];
    for (let i = 0; i < currCanvas.data.length; i++ ) {
        if (ctx.fillStyle !== '#000000') {
            //console.log('collecting diffs');
            if ( (prevCanvas.data[i] !== currCanvas.data[i]) && currCanvas.data[i] < 205) {
                tempList.push(i)
            }
        } else {
            if ( (prevCanvas.data[i] !== currCanvas.data[i])) {
                tempList.push(i)
            }
        }
    }
    return tempList
}


function sendToFB(hex, diffsToPush) {
    switch(hex) {
        case '#c90000': {
            fbCon.child(roomId).child('diffs').push({'R' : diffsToPush});
            break;
        }
        case  '#000000': {
            fbCon.child(roomId).child('diffs').push({'K' : diffsToPush});
            break;
        }
        case '#0000c8' : {
            fbCon.child(roomId).child('diffs').push({'B' : diffsToPush});
            break;
        }
        default : {
            fbCon.child(roomId).child('diffs').push({'G' : diffsToPush});
            break;
        }
    }
}
