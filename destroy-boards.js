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

users.on('value', boards => boards.forEach((board) => {
    let destroy = true;
    const boardVal = board.val();
    for(const user in boardVal) {
        if(boardVal[user] === true) {
            destroy = false;
            break;
        }
    }
    if(destroy) {
        boards.child(board.key).set(null);
        users.child(board.key).set(null);
    }
}));
