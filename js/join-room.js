let url = 'http://whiteboard.love/usedRoom';
let xhr = createCORSRequest('GET', url);
let newRoomId = 1;

function init() {
    let roomButton = document.getElementById('make-room');
    roomButton.addEventListener('click', e => {
        xhr.onload = function() {
            let roomsCreated = JSON.parse(xhr.responseText); // will be a list
            roomsCreated = roomsCreated.map(e => parseInt(e));
            if (roomsCreated.length > 0) {
                newRoomId = roomsCreated[roomsCreated.length - 1] + 1;
            }
            window.location.href = sansIndex(window.location.href) + '/board' + '?roomId=' + newRoomId;
        };
        xhr.send();
    });
}

// Create the XHR object.
function createCORSRequest(method, url) {
    let xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        // XHR for Chrome/Firefox/Opera/Safari.
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined") {
        // XDomainRequest for IE.
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        // CORS not supported.
        xhr = null;
    }
    return xhr;
}

function sansIndex(url) {
    let comp = url.split('/');
    return comp.slice(0, comp.length - 1).join('/')
}
