const admin = require('firebase-admin');
const serviceAccount = require('simple-whiteboard-admin.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://simple-whiteboard.firebaseio.com'
});

// Get a database reference to our posts
const db = admin.database();
const ref = db.ref(admin.databaseURL);
const boards = ref.child('boards');
const users = ref.child('users');

users.on('value', rooms => rooms.forEach((room) => {
    let destroy = true;
    const roomVal = room.val();
    for(const user in roomVal) {
        if(roomVal[user] === true) {
            destroy = false;
            break;
        }
    }
    if(destroy) {
        boards.child(room.key).set(null);
        users.child(room.key).set(null);
    }
}));
