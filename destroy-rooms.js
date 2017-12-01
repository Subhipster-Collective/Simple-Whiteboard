
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
            let destroy = true;
            let keys = Object.keys(child.val().users)
            for (let i = 0; i < keys.length; i++) {
                if (child.val().users[keys[i]] === true) {
                    destroy = false;
                }
            }
            if (destroy) ref.child(child.key).set(null);
        });
})
