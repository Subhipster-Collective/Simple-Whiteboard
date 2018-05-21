/*
 * Copyright 2017-2018  Subhipster Collective
 *
 * This file is part of Simple Whiteboard.
 *
 * Simple Whiteboard is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Simple Whiteboard is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Simple Whiteboard.  If not, see <http://www.gnu.org/licenses/>.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./simple-whiteboard-admin.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://simple-whiteboard.firebaseio.com'
});

// Get a database reference to our posts
const db = admin.database();
const ref = db.ref(admin.databaseURL);
const boards = ref.child('boards');
const users = ref.child('users');

users.on('value', ids => ids.forEach((board) => {
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
