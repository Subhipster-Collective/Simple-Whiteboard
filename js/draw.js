//globals for the canvas
let canvas, ctx;
let prevX = 0;
let prevY = 0;
let isDown = false;
let cvSave;

//globals for the networking
let myConnection;
let fbCon;
let sessionId;
let dataChannel;      //TODO: make sure these all need to be global
let isConnected = false;
const roomId = extractQueryString('roomId');
let packetNum = 0;



//this function gets executed when html body is loaded (onLoad tag in HTML file)
function init() {

    //initialize p2p exchange
    rtcInit(roomId);

    //initlaize canvas elements
    canvas = document.getElementById('myCanvas');
    ctx = canvas.getContext('2d');
    console.log('here');
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
    cvSave = ctx.getImageData(0,0,canvas.width, canvas.height);
    sendCanvasData(cvSave);
}

function draw(currX,currY) {
    ctx.lineTo(currX,currY);
    ctx.stroke();
    prevX = currX;
    prevY = currY;
    cvSave = ctx.getImageData(0,0,canvas.width, canvas.height);
    sendCanvasData(cvSave);
}

//if datachannel is initialized, send canvas data
function sendCanvasData(cvSave) {
    if (isConnected) {
        const packets = chunkify(cvSave.data,16000); //16kb size or less
        dataChannel.send();
    }
}

function chunkify(cvSave, size) {
    //each packet begins with 5 byte digit ID, 4 bytes for pkt #, 2 bytes for packet index
    let numChuncks = cvSave.length / size;
    let metaData = new Uint8ClampedArray(11);

    //turning sessionId and numPacket into an array
    let insertArray = [];
    insertArray.concat(numToArray(sessionId));
    insertArray.concat(numToArray(packetNum));
    packetNum += 1;

    let bot = 0;
    let returnPackets = [];
    for (let i = 0; i < numChuncks; i++ ) {
        let buffer = cvSave.slice(bot, bot + size);
        insertArray.push(i);
        returnPackets.push(prependPacketInfo(metaData.set(insertArray),buffer));
        bot = (bot + size) + 1;
    }

}


function prependPacketInfo(buff1,buff2) {
    let tmp = new Uint8ClampedArray( buff1.byteLength + buff2.byteLength );
    tmp.set( new Uint8ClampedArray( buff1 ), 0 );
    tmp.set( new Uint8ClampedArray( buff2 ), buff1.byteLength );
    return tmp;
}

function numToArray(num) {
    let temp = [];
    for (let i = 0, len = num.toString().length; i < len; i += 1) {
        temp.push(+sessionId.toString().charAt(i));
    }
    return temp;
}

// RTC-networking -------------------------------------------------

function rtcInit(roomId) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user && roomId){
            // User is signed in.
            const isAnonymous = user.isAnonymous;
            const uid = user.uid;
            sessionId = Math.floor(Math.random()*100000);
            fbCon = firebase.database().ref();
            const configuration = {
                iceServers: [{ url: 'stun:stun.1.google.com:19302' },{url: 'stun:stun.services.mozilla.com'},]
            };

            myConnection = new RTCPeerConnection(configuration);
            console.log('RTCPeerConnection object was created');

            dataChannel = myConnection.createDataChannel('whtbrd', {
                ordered: false, // do not guarantee order
                maxRetransmitTime: 3000, // in milliseconds
            });

            myConnection.onicecandidate = function (event) {
                if (event.candidate) {
                    console.log('SENDING ICE');
                    fbCon.child(roomId).child('negotiation').child('ice').set({ sender: sessionId, message: JSON.stringify({ice: event.candidate })});
                }
            };

            if (extractQueryString('init') ===  '1') initalizeExchange();


            fbCon.child(roomId).child('negotiation').child('offer').on('value', readMessage);
            fbCon.child(roomId).child('negotiation').child('ice').on('value', readMessage);


            dataChannel.onopen = function () {
                console.log('connection open');
                isConnected = true;
                //TODO: clear the canvas here.
            };
            dataChannel.onclose = function() {
                console.log('connection closed');
            }

            myConnection.ondatachannel = function(ev) {
                const receiveChannel = ev.channel;
                receiveChannel.onmessage = function (event) {
                    console.log(typeof(event.data));
                    ctx.putImageData(event.data,0,0);
                };
            };


        } else {
            // Do stuff if they inputted an invalid room or fb is down
        }
    });
}

function initalizeExchange() {
    console.log('creating offer');
    myConnection.createOffer()
        .then(offer => myConnection.setLocalDescription(offer) )
        .then(() => sendOffer(sessionId, JSON.stringify({'sdp': myConnection.localDescription})) );
}

function sendOffer(sessionId, data) {
    fbCon.child(roomId).child('negotiation').child('offer').set({ sender: sessionId, message: data });
}

function readMessage(data) {
    const msg = JSON.parse(data.val().message);
    const sender = data.val().sender;
    if (sender !== sessionId) {
        if (msg.ice !== undefined){
            console.log('received ICE');
            myConnection.addIceCandidate(new RTCIceCandidate(msg.ice));
            console.log('added ice candidate');
        } else if (msg.sdp.type === 'offer') {
            myConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp))
                .then(() => myConnection.createAnswer())
                .then(answer => myConnection.setLocalDescription(answer))
                .then(() => sendOffer(sessionId, JSON.stringify({'sdp': myConnection.localDescription})));
            console.log('sending answer')
        } else if (msg.sdp.type === 'answer'){
            console.log('received answer')
            myConnection.setRemoteDescription(new RTCSessionDescription(msg.sdp));
            //initalizeExchange();
        }
    }
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
