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

/* eslint-env browser */
/* eslint indent: ["error", 4, { "SwitchCase": 1 }] */
/* globals firebase */
/* eslint no-fallthrough: ["error", { "commentPattern": "falls through" }] */
///* eslint no-unused-vars: ["warning", { "argsIgnorePattern": "event" }] */ // Doesn't seem to work

const MAX_MS_PER_DIFF = 100;

//globals for the canvas
let mainCanvas, mainCtx;
let isDown = false;
let pushDot;
let timeLast;
let myCoordsIndex;
let myCoords = [];

//globals for the networking
let fbCon, boardRef, usersRef;
const boardId = extractQueryString('id');

//this function gets executed when html body is loaded (onLoad tag in HTML file)
function init() {
    //initialize exchange
    connect(boardId);
    //initlaize canvas elements
    mainCanvas = document.getElementById('myCanvas');
    mainCtx = mainCanvas.getContext('2d');
    mainCtx.lineWidth = 2;
    
    //executes whenever mouse comes clicks on canvas
    mainCanvas.addEventListener('mousedown', handleMouseEvent, false);

    //executes whenever mouse moves over canvas
    mainCanvas.addEventListener('mousemove', handleMouseEvent, false);

    //executes whenver mouse lifts off canvas.
    mainCanvas.addEventListener('mouseup', handleMouseEvent, false);

    //executes whenever mouse goes out of canvas bounds
    mainCanvas.addEventListener('mouseout', handleMouseEvent, false);

    //color changing events
    for(const button of document.getElementsByClassName('color-button')) {
        const color = getComputedStyle(button).backgroundColor;
        button.addEventListener('click', e => setColor(color));
    }
    
    for(const button of document.getElementsByClassName('size-button')) {
        const lineWidth = getComputedStyle(button).getPropertyValue('--size');
        button.addEventListener('click', event => mainCtx.lineWidth = lineWidth);
    }
    
    document.getElementById('clear-button').addEventListener('click', e => destroyBoard());
}

function handleMouseEvent(e) {
    if(fbCon) {
        switch(e.type) {
            case 'mousedown': {
                const currX = e.clientX - mainCanvas.offsetLeft;
                const currY = e.clientY - mainCanvas.offsetTop;
                myCoords.push({x: currX, y: currY});
                drawDot(currX, currY, mainCtx);
                isDown = true;
                pushDot = true;
                
                timeLast = Date.now();
                myCoordsIndex = 0;
                
                break;
            }
            case 'mousemove': {
                if (isDown) {
                    const currX = e.clientX - mainCanvas.offsetLeft;
                    const currY = e.clientY - mainCanvas.offsetTop;
                    myCoords.push({x: currX, y: currY});
                    drawLine(currX, currY, mainCtx);
                    
                    const timeNow = Date.now();
                    if(timeNow - timeLast > MAX_MS_PER_DIFF) {
                        const endIndex = myCoords.length;
                        pushDiff(myCoordsIndex, endIndex);
                        myCoordsIndex = endIndex > 1 ? endIndex - 2 : 0; // Sending the last TWO points is for some reason necessary to keep the line from appearing broken.
                        timeLast = timeNow;
                    }
                }
                break;
            }
            case 'mouseout': {
                if(!isDown) {
                    break;
                }
            }
            //falls through
            case 'mouseup': {
                pushDiff(myCoordsIndex, myCoords.length, timeLast, Date.now());
                myCoords = [];
                isDown = false;
                
                break;
            }
        }
    }
}

function setColor(color) {
    mainCtx.strokeStyle = color;
    mainCtx.fillStyle = color;
}

//draws a dot if you click
function drawDot(x, y, ctx) {
    const halfWidth = Math.floor(ctx.lineWidth / 2);
    ctx.moveTo(x - halfWidth, y - halfWidth);
    ctx.beginPath();
    ctx.fillRect(x - halfWidth, y - halfWidth, ctx.lineWidth, ctx.lineWidth);
    ctx.closePath();
    drawLine(x, y, ctx);
}

function drawLine(x, y, ctx) {
    ctx.lineTo(x, y);
    ctx.stroke();
}

function destroyBoard() {
    mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    boardRef.child('diffs').set(null);
    boardRef.child('diffs').push({clear: true});
}


// networking -------------------------------------------------


function connect(boardId) {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in.
            console.log('connected');
            fbCon = firebase.database().ref();
            if(boardId === null) {
                usersRef = fbCon.child('users').push({[user.uid]: true});
                boardId = usersRef.getKey();
                history.replaceState({}, '', window.location.href + '?id=' + boardId);
            } else {
                usersRef = fbCon.child('users').child(boardId);
            }
            boardRef = fbCon.child('boards').child(boardId);

            const connectedRef = firebase.database().ref('.info/connected');
            connectedRef.on('value', (snap) => {
                if (snap.val() === true) {
                    // We're connected (or reconnected)! Do anything here that should happen only if online (or on reconnect)
                    
                    usersRef.update({[user.uid]: true});

                    // When I disconnect, remove this device
                    usersRef.onDisconnect().update({[user.uid]: false});
                }
            });

            boardRef.child('diffs').on('child_added', mergeDiff);
        } else {
            console.log('Failed to connect to Firebase.');
        }
    });
}

function pushDiff(coordsStart, coordsEnd) {
    const diff = {
        coords: myCoords.slice(coordsStart, coordsEnd),
        color: mainCtx.strokeStyle,
        lineWidth: mainCtx.lineWidth,
    };
    if(pushDot) {
        diff.drawDot = true;
        pushDot = false;
    }
    boardRef.child('diffs').push(diff);
}

function mergeDiff(diff) {
    if(diff.hasChild('clear')) {
        mainCtx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    } else {
        const coords = diff.child('coords').val();
        const color = diff.child('color').val();
        
        const diffCanvas = document.createElement('canvas');
        diffCanvas.width = mainCanvas.width;
        diffCanvas.height = mainCanvas.height;
        const diffCtx = diffCanvas.getContext('2d');
        diffCtx.strokeStyle = color;
        diffCtx.fillStyle = color;
        diffCtx.lineWidth = diff.child('lineWidth').val();
        
        if(diff.child('drawDot').val()) {
            drawDot(coords[0].x, coords[0].y, diffCtx);
        } else {
            diffCtx.moveTo(coords[0].x, coords[0].y);
        }
        for(let i = 1; i < coords.length; ++i) {
            drawLine(coords[i].x, coords[i].y, diffCtx);
        }
        
        mainCtx.drawImage(diffCanvas, 0, 0);
        diffCtx.clearRect(0, 0, diffCanvas.width, diffCanvas.height); // TODO: necessary?
    }
}

function extractQueryString(name) {
    const url = window.location.href;
    name = name.replace(/[[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
