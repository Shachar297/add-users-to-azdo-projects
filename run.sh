#!/bin/bash

if [ ! -f .env ]; then
  echo "Please create a .env file with the following content:"
  echo "Just add the AZDO PAT Token"
  sed -n '5,7p' a.js
  exit 1
fi

npm install dotenv axios

node a.js
