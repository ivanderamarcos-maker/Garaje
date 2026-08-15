#!/bin/bash
# Doble clic: abre Garaje y arranca el servidor en el puerto 8081.
PROYECTO="/Users/ivan/Desktop/Garaje"
cd "$PROYECTO" || exit 1

if lsof -i :8081 -sTCP:LISTEN -t >/dev/null 2>&1; then
    open "http://localhost:8081"
    exit 0
fi

open "http://localhost:8081"
python3 -m http.server 8081 --bind 0.0.0.0
