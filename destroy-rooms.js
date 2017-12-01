
let admin = require("firebase-admin");
let serviceAccount = require("simple-whiteboard-firebase-adminsdk-p3ksl-a90510e3ff.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://simple-whiteboard.firebaseio.com"
});

// Get a database reference to our posts
const db = admin.database();
const ref = db.ref(admin.databaseURL);

ref.on('value', (snapshot) => {
        snapshot.forEach( (child) => {
            if (!child.val().users){
                ref.child(child.key).set(null);
                console.log('room destroyed');
            }
        });
})
