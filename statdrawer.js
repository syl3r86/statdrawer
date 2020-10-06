/*
 * by Felix#6196
 */

class StatDrawer extends Application {

    constructor() {
        super();
        this._initialize();
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "modules/statdrawer/templates/app.html";
        options.width = 'auto';
        options.height = 496;
        options.classes = ['stat-drawer'];
        options.title = "Stat Drawer";
        return options;
    }

    getData() {
        let data = {};
        data.deck = this.deck;
        data.currentSet = this.resultDeck[this.currentSet];
        data.displayedSet = this.displayedSet;
        data.resultDeck = this.resultDeck;
        data.selectedDeck = this.selectedDeck;
        return data;
    }

    activateListeners(html) {
        html.find('.drawable').click(ev => this._onDraw(ev));
        
        html.find('.reshuffle').click(ev => {
            this._initialize();
        });

        html.find('.deck-select').change(ev => {
            this.selectedDeck = html.find(".deck-select").val();
            this._initialize();
        });

        html.find('.abilty-select').change(ev => this._onSelectStats(ev, html.find('.abilty-select')));

        html.find('.apply-abilities').click(ev => this._onApplyStats(ev, html.find('.abilty-select')));
        html.find('.help').click(ev => this._toggleHelp(html));
        this._toggleHelp(html);

    }

    _onDraw(ev) {
        let clickedCard = ev.target.dataset.card;
        this.drawCard(clickedCard);
    }

    _onSelectStats(ev, selectors) {
        let setId = ev.target.closest('.result').dataset.setid;
        let selected = ev.target.value;
        for (let sel of selectors) {
            let id = sel.closest('.result').dataset.setid;
            if (id !== setId && sel.value == selected) {
                sel.value = 'none';
            } 
        }
    }

    _onApplyStats(ev, selectors) {
        let data = {};
        for (let sel of selectors) {
            let setId = sel.closest('.result').dataset.setid;
            let ability = sel.value;
            let set = this.resultDeck[setId];

            if (ability !== 'none' && set[1].value && set[2].value && set[3].value) {
                let val = set[1].value + set[2].value + set[3].value
                data[`data.abilities.${ability}.value`] = val;
            } else {
                ui.notifications.warn("The Abilities could not be aplied.");
                break;
            }
        }

        if (Object.keys(data).length === 6) {
            let actor = game.actors.get(this.actorId);
            actor.update(data);
            ui.notifications.info("Abilities have been applied.");
            this.close();
        }
    }

    _toggleHelp(html) {
        html.find('.help-display').toggle(50);
    } 

    async _initialize() {
        this.currentSet = 1;
        this.displayedSet = 1;
        this.resultDeck = {
            1: { 1: '', 2: '', 3: '' },
            2: { 1: '', 2: '', 3: '' },
            3: { 1: '', 2: '', 3: '' },
            4: { 1: '', 2: '', 3: '' },
            5: { 1: '', 2: '', 3: '' },
            6: { 1: '', 2: '', 3: '' },
        }

        if (this.messageId !== undefined) {
            delete this.messageId;
        }

        if (this.selectedDeck === undefined) {
            this.selectedDeck = 'monsterdeck';
        } 
        this.loadDeck();
        
        Handlebars.registerHelper('cardSum', (resultSet, options) => {
            if (resultSet[1] === '' || resultSet[2] === '' || resultSet[3] === '') {
                return 'drawing';
            } else {
                return resultSet[1].value + resultSet[2].value + resultSet[3].value;
            }
        });

        this.render();
    }

    async loadDeck() {
        let deckUrl = `modules/statdrawer/decks/${this.selectedDeck}.json`;
        let response = await fetch(deckUrl);
        this.deck = await response.json();
        for (let cardId in this.deck) {
            this.deck[cardId].isCard = true;
        }
    }

    async openForActor(actorId) {
        this.actorId = actorId;
        this.render(true);
    }

    drawCard(card) {
        let drawnCardKey;
        let keys = Object.keys(this.deck).filter(id => this.deck[id].used !== true);

        if (keys.length >= 1) {
            drawnCardKey = keys[keys.length * Math.random() << 0];
        } else {
            ui.notifications.error("Not enough cards left in the deck");
        }        

        this.deck[drawnCardKey].used = true;
        this.updateResult(card, drawnCardKey);
    }

    updateResult(card, drawnCardKey) {
        this.resultDeck[this.currentSet][card] = this.deck[drawnCardKey];
        if (this.resultDeck[this.currentSet][1] !== '' && this.resultDeck[this.currentSet][2] !== '' && this.resultDeck[this.currentSet][3] !== '') {
            this.updateGUI(card, true);
        } else {
            this.updateGUI(card);
        }

    }

    updateGUI(card, newSet = false) {
        this.updateChatMessage();
        let clickedCardImg = this._element.find(`.card-${card} img`);
        let cardUrl = this.resultDeck[this.currentSet][card].img;
        this._element.find(`.result-${this.currentSet} .draw-${card}`).attr('src', cardUrl);

        this.animateCard(clickedCardImg, cardUrl);        

        if (newSet) {
            let cardSum = this.resultDeck[this.currentSet][1].value + this.resultDeck[this.currentSet][2].value + this.resultDeck[this.currentSet][3].value;
            this._element.find(`.result-${this.currentSet} label`).html(cardSum);

            let delay = 1000;
            window.setTimeout(() => {
                this.currentSet = this.currentSet + 1;
                if (this.currentSet <= 6) {
                    let cards = this._element.find('.card:not(.deck)');
                    for (let card of cards) {
                        this.animateCard($(card), 'modules/statdrawer/cards/cardback.png');
                    }
                }
                  
            }, delay);
        }
    }

    animateCard(element, cardUrl) {
        let originalWidth = element.width();
        let animationTime = 100;
        element.animate({
            width: 0,
            'margin-left': (originalWidth / 2)
        }, {
                duration: animationTime,
                complete: () => {
                    element.attr('src', cardUrl);
                    element.toggleClass('drawable');
                    if (element.hasClass('drawable')) {
                        element.click(ev => this._onDraw(ev));
                    } else {
                        element.off('click');
                    }
                    element.animate({
                        width: originalWidth,
                        'margin-left': 0
                    }, animationTime);
                }
            });
    }

    async updateChatMessage() {
        let actor = game.actors.get(this.actorId);
        let templateData = { resultDeck: this.resultDeck, name: actor.data.name}
        let template = "modules/statdrawer/templates/chatMessage.html";
        let messageContent = await renderTemplate(template, templateData);

        if (this.messageId === undefined) {
            let chatData = {
                user: game.user._id,
                speaker: {
                    actor: actor.data._id,
                    token: actor.data.token,
                    alias: actor.data.name
                },
                content: messageContent
            };
            let message = await ChatMessage.create(chatData, {});
            this.messageId = message.data._id;
        } else {
            let message = game.messages.get(this.messageId);
            message.update({ content: messageContent });
        }
    }

}
let statDrawer;

Hooks.on('renderActorSheet', (app, html, data) => {
    if (app.actor.data.type === 'npc') return;
    if (statDrawer === undefined) {
        statDrawer = new StatDrawer();
    }
    let actorId = data.actor._id;
    let openBtn = $(`<a class="open-stat-drawer"><i class="fas fa-layer-group"></i> StatDrawer</a>`);
    openBtn.click(ev => {
        statDrawer.openForActor(actorId);
    });
    html.closest('.app').find('.open-stat-drawer').remove();
    let titleElement = html.closest('.app').find('.window-title');
    openBtn.insertAfter(titleElement);
    

});
