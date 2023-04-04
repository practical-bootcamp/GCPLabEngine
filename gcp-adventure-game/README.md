# GCP Adventure
A game on top of [GCP Automatic Grading Engine](https://techcommunity.microsoft.com/t5/educator-developer-blog/microsoft-GCP-automatic-grading-engine-oct-2021-update/ba-p/2849141) project.

Students have to finish task to create or configure GCP resources and wins the coins.

[![GCP Adventure Demo](http://img.youtube.com/vi/nfor8kO01_4/0.jpg)](http://www.youtube.com/watch?v=nfor8kO01_4 "GCP Adventure Demo")


You need to create the service principal of reader role for 1 subscription.
```
az ad sp create-for-rbac --role="Reader" --scopes="/subscriptions/<Your Subscription ID>"
```

To change the grading engine and tasks, modify the ```src/game/tasks.js ```.


## Setup
```
git clone https://github.com/wongcyrus/GCP-adventure-game
cd GCP-adventure-game
npm i
```

## Run test server
```
npm run start
```

## Build the production code
```
npm run build
```

And, you can deploy the reactjs website to GCP Bucket Storage Static Website
```
https://storage.googleapis.com/<yourbucket>/
nvm install 16
nvm use 16
npm i
npm run build
gsutil rsync -a public-read -r build/ gs://<yourbucket>
```



## Phaser 3 + React 17 Top-Down game demo

There is a better version of this project here: https://github.com/blopa/top-down-react-phaser-game-template

Made with an ejected Create React App.

Read moe about this project:
- https://pablo.gg/en/blog/coding/how-to-create-a-top-down-rpg-maker-like-game-with-phaser-js-and-react
- https://pablo.gg/en/blog/coding/i-made-a-top-down-game-version-of-my-blog-with-phaser-and-react/

## Special thanks
This game would not be possible without the help of some amazing people and their work, so here is my list of special thanks.
- [Pablo Benmaman](https://pablo.gg/en/blog/coding/how-to-create-a-top-down-rpg-maker-like-game-with-phaser-js-and-react/) for the project.
- [photonstorm](https://github.com/photonstorm), for creating [Phaser.io](https://github.com/photonstorm/phaser).
- [Annoraaq](https://github.com/Annoraaq), for creating the [grid-engine](https://github.com/Annoraaq/grid-engine) plugin.
- [ArMM1998](https://itch.io/profile/armm1998), for the [characters sprites and tilesets](https://opengameart.org/content/zelda-like-tilesets-and-sprites).
- [PixElthen](https://elthen.itch.io/), for the [slime sprites](https://opengameart.org/content/pixel-art-mini-slime-sprites).
- [pixelartm](https://itch.io/profile/pixelartm), for the [pirate hat sprites](https://opengameart.org/content/pirate-1).
- [jkjkke](https://opengameart.org/users/jkjkke), for the [Game Over screen background](https://opengameart.org/content/background-6).
- [KnoblePersona](https://opengameart.org/users/knoblepersona), for the [Main Menu screen background](https://opengameart.org/content/ocean-background).
- [Min](https://opengameart.org/users/min), for the [open book sprite](https://opengameart.org/content/open-book-0).
