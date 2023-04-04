import { Scene } from 'phaser';
import { tasksUrl } from "../tasks";

export default class MainMenuScene extends Scene {
    constructor() {
        super('MainMenuScene');
    }

    preload() {
        // TODO
    }

    create() {
        const { width: gameWidth, height: gameHeight } = this.cameras.main;

        this.add.image(gameWidth / 2, Math.ceil(gameHeight / 10), 'game_logo')
            .setOrigin(0.5, 0)
            .setDepth(1);

        const scale = Math.max(Math.ceil(gameWidth / 480), Math.ceil(gameHeight / 216));
        this.add.image(0, 0, 'main_menu_background')
            .setScale(scale)
            .setDepth(0)
            .setOrigin(0, 0);

        const customEvent = new CustomEvent('menu-items', {
            detail: {
                menuItems: ['start', 'exit'],
                menuPosition: 'center',
            },
        });

        window.dispatchEvent(customEvent);
        const gameMenuSelectedEventListener = ({ detail }) => {
            switch (detail.selectedItem) {
                case 'start': {
                    let servicePrincipal = prompt("Please input your GCP Services Account json:", "");
                    try {
                        servicePrincipal = JSON.parse(servicePrincipal);
                    }
                    catch (e) {
                        window.location.reload();
                        break;
                    }
                    fetch(tasksUrl, {
                        method: 'GET'
                    }).then(res => res.json()).then(
                        tasks => {
                            this.scene.start('GameScene', {
                                heroStatus: {
                                    position: { x: 4, y: 3 },
                                    previousPosition: { x: 4, y: 3 },
                                    frame: 'hero_idle_down_01',
                                    facingDirection: 'down',
                                    health: 60,
                                    maxHealth: 60,
                                    coin: 0,
                                    canPush: false,
                                    haveSword: false,
                                },
                                mapKey: 'home_page_city_house_01',
                                servicePrincipal,
                                tasks
                            });
                        });
                    break;
                }

                case 'exit': {
                    window.location.reload();
                    break;
                }

                case 'settings': {
                    break;
                }

                default: {
                    break;
                }
            }

            window.removeEventListener(
                'menu-item-selected',
                gameMenuSelectedEventListener
            );
        };

        window.addEventListener(
            'menu-item-selected',
            gameMenuSelectedEventListener
        );
    }
}
