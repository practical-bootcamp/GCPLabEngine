#! /bin/bash
export STATICSITEBUCKET=$(cat infrastructure.json | jq -r '."static-site-bucket".value')
export GRADERURL=$(cat infrastructure.json | jq -r '."graderUrl".value')
export GAMETASKURL=$(cat infrastructure.json | jq -r '."gameTaskUrl".value')
export NVM_DIR="/usr/local/share/nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" 
nvm install 16
nvm use 16
cd gcp-adventure-game/src/game/
cp tasks.template tasks.js
sed -i -e "s~###gradingEngineBaseUrl###~$GRADERURL~g" tasks.js
sed -i -e "s~###tasksUrl###~$GAMETASKURL~g" tasks.js 
cd ../../
export PUBLIC_URL=https://storage.googleapis.com/$STATICSITEBUCKET/
npm i
npm run build
gsutil -m rsync -a public-read -r build/ gs://$STATICSITEBUCKET