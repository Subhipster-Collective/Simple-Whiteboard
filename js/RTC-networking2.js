
let myConnection;
let fbCon;
let sessionId;
let dataChannel;
const roomId = extractQueryString('roomId');
firebase.auth().onAuthStateChanged((user) => {
    if (user && roomId){
        // User is signed in.
        const isAnonymous = user.isAnonymous;
        const uid = user.uid;
        sessionId = Math.floor(Math.random()*1000000000);
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

        if (extractQueryString('init') ===  '1') {
            console.log('creating offer');
            myConnection.createOffer()
                .then(offer => myConnection.setLocalDescription(offer) )
                .then(() => sendOffer(sessionId, JSON.stringify({'sdp': myConnection.localDescription})) );
        }


        fbCon.child(roomId).child('negotiation').child('offer').on('value', readMessage);
        fbCon.child(roomId).child('negotiation').child('ice').on('value', readMessage);


        dataChannel.onopen = function () {
            //global in draw.js
            console.log('open')
            isConnected = true;
        };

        dataChannel.onmessage = function (event) {
            console.log('ERGH!');
            console.log("received: " + event.data);
        };


    } else {
        // Do stuff if they inputted an invalid room or fb is down
    }
});

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

/*function doesRoomExist(roomId) {
    db.ref().child('rooms').once('value')
        .then( (snapshot) => {
            snapshot.child(roomId).exists();
        });
}*/
