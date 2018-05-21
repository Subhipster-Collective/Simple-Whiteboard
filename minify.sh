#!/bin/sh
#uglifyjs board/js/draw.js --compress --mangle --toplevel --output board/js/draw.min.js # --toplevel seems broken
uglifyjs board/js/draw.js --compress --mangle --output board/js/draw.min.js
