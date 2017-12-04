let express = require('express');
let cors = require('cors');
let app = express();

const admin = require('firebase-admin');
const serviceAccount = require('simple-whiteboard-firebase-adminsdk-p3ksl-a90510e3ff.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://simple-whiteboard.firebaseio.com'
});

// Get a database reference to our posts
const db = admin.database();
const ref = db.ref(admin.databaseURL);
const boards = ref.child('users');

// Add headers
app.use(cors({origin: '*'}))

app.get('/usedRoom', function (req, res) {
   boards.once('value', snapshot => {
        res.send(Object.keys(snapshot.val()));
   });
});

var server = app.listen(51000, function (req,res) {
   var host = server.address().address;
   var port = server.address().port;
   console.log("Example app listening at http://%s:%s", host, port);
});
