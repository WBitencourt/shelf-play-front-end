#!/bin/bash
rm -rf package-lock.json

rm -rf node_modules

npm install

npm outdated

npm update

npm audit fix