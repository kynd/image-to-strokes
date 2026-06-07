#!/bin/sh
URL="http://localhost:3000"

# Open browser after a short delay so the server has time to bind
(sleep 0.8 && open "$URL") &

node server.js
