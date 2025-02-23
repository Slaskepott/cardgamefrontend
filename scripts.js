//Remember to change wsURL as well!

const DEVELOPMENT_MODE = false;
let BASE_URL = DEVELOPMENT_MODE ? "http://localhost:8000" : "https://cardgame-lndd.onrender.com";

let playerId = null;
let gameId = null;
let ws = null;
let selectedCards = [];
let playerGold = 0;
let upgrades = [];
let health = 100;
let maxHealth = 100;
let maxDiscards = 1;





document.addEventListener("DOMContentLoaded", function() {
    const rulesBtn = document.getElementById("rules-btn");
    const closeRulesBtn = document.getElementById("close-rules");
    const rulesContainer = document.getElementById("rules-container");

    if (rulesBtn && closeRulesBtn && rulesContainer) {
        rulesBtn.addEventListener("click", function() {
            rulesContainer.classList.remove("hidden");
        });

        closeRulesBtn.addEventListener("click", function() {
            rulesContainer.classList.add("hidden");
        });
    } else {
        console.error("One or more elements for the rules modal were not found.");
    }
});


function logMessage(message, type = "") {
    const logDiv = document.getElementById("log");
    const logEntry = document.createElement("p");

    logEntry.textContent = message; // Ensure raw text is set properly

    // Apply different log styles based on type
    if (type === "damage") logEntry.classList.add("log-damage");
    else if (type === "heal") logEntry.classList.add("log-heal");
    else if (type === "upgrade") logEntry.classList.add("log-upgrade");
    else if (type === "turn") logEntry.classList.add("log-turn");
    else if (type === "gameover") logEntry.classList.add("log-gameover");

    logDiv.appendChild(logEntry);
    logDiv.scrollTop = logDiv.scrollHeight; // Auto-scroll to latest log entry
}


function hideGameSetup() {
    document.getElementById("game-setup").style.display = "none";
}

function leaveShop() {
    const shopContainer = document.getElementById("shop-container");
    const gameContainer = document.getElementById("game-container");

    shopContainer.style.display = "none";
    gameContainer.classList.remove("hidden"); // Show the game UI again
}


async function createGame() {
    gameId = document.getElementById("gameId").value.trim();
    if (!gameId) return logMessage("Please enter a game ID!");
    
    const response = await fetch(`${BASE_URL}/game/create/${gameId}`, { method: "POST" });
    const data = await response.json();
    if (data.error) return logMessage(data.error);
    logMessage(`Game created: ${gameId}`);
    hideGameSetup();
    joinGame();
}

async function joinGame() {
    gameId = document.getElementById("gameId").value.trim();
    if (!gameId) return logMessage("Please enter a game ID!");
    
    const response = await fetch(`${BASE_URL}/game/${gameId}/players`);
    const data = await response.json();
    console.log(data)
    if (data.error) return logMessage(data.error);
    
    const existingPlayers = data.players;
    let nextPlayerNumber = 1;
    while (existingPlayers.includes(`player${nextPlayerNumber}`)) {
        nextPlayerNumber++;
    }
    playerId = `player${nextPlayerNumber}`;
    await fetch(`${BASE_URL}/game/join/${gameId}?player_id=${playerId}`, { method: "POST" });
    logMessage(`Joined as ${playerId}`);
    hideGameSetup();
    setupWebSocket();
    if (existingPlayers.length + 1 === 2) {
        showScoreboard();
        showTurnIndicator(1);
    }
}

function updateTurnIndicator(nextPlayer) {
    document.getElementById("turn-indicator").textContent = `Current Turn: ${nextPlayer}`;
}

function updateHealth(player, newHealth, newMaxHealth) {
    health = newHealth;
    maxHealth = newMaxHealth;
    console.log("Update health was called for player "+player+" with percentage "+newHealth+"/"+newMaxHealth)
    document.getElementById(`health-${player}`).style.width = `${(newHealth / newMaxHealth) * 100}%`;
    document.getElementById(`${player}-health`).innerHTML = `${newHealth} / ${newMaxHealth}`;
}

function renderCards(cards) {
    console.log("Rendering cards:", cards);

    const rankOrder = {
        "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
        "J": 11, "Q": 12, "K": 13, "A": 14
    };

    const sortedCards = [...cards].sort((a, b) => rankOrder[a.rank] - rankOrder[b.rank]);

    const cardContainer = document.getElementById("card-container");
    cardContainer.innerHTML = "";

    if (!sortedCards || sortedCards.length === 0) {
        cardContainer.innerHTML = "<p>No cards available.</p>";
        return;
    }

    sortedCards.forEach((card, index) => {
        const cardId = `${card.rank}-${card.suit}-${index}`;  // ✅ Unique ID
        const cardElement = document.createElement("div");
        cardElement.classList.add("card");
        cardElement.setAttribute("data-suit", card.suit);
        cardElement.setAttribute("data-id", cardId); // Assign unique ID
        
        cardElement.innerHTML = `
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit" data-suit="${card.suit}">${getSuitSymbol(card.suit)}</div>
        `;

        cardElement.onclick = () => toggleCardSelection(cardElement, card, cardId);
        cardContainer.appendChild(cardElement);
    });
}




function getSuitSymbol(suit) {
    const symbols = { "Fire": "🔥", "Air": "💨", "Earth": "🌿", "Water": "💧" };
    return symbols[suit] || "❓";
}


function toggleCardSelection(cardElement, card, cardId) {
    // Check if the card is already selected using its unique cardId
    const existingIndex = selectedCards.findIndex(c => c.cardId === cardId);

    if (existingIndex > -1) {
        selectedCards.splice(existingIndex, 1);
        cardElement.classList.remove("selected");
    } else {
        if (selectedCards.length >= 5) {
            alert("You can only play a maximum of 5 cards!");
            return;
        }
        selectedCards.push({ ...card, cardId }); // ✅ Store cardId to uniquely track selection
        cardElement.classList.add("selected");
    }

    updateActionButtons();
}



async function discard() {
    if (selectedCards.length === 0) return;

    const response = await fetch(`${BASE_URL}/game/${gameId}/discard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, cards: selectedCards })
    });

    const data = await response.json();
    if (data.error) {
        logMessage(data.error);
    } else {
        logMessage(`${playerId} discarded cards!`);
        selectedCards = [];
        updateActionButtons();
        if (data.remaining_discards !== undefined) {
            updateDiscardButton(data.remaining_discards);
        }
    }
    document.querySelectorAll(".card.selected").forEach(card => {
        card.classList.remove("selected");
    });

    selectedCards = [];
    updateActionButtons();
}

function updateScore(scores) {
    Object.keys(scores).forEach(player => {
        let scoreElement = document.getElementById(`score-${player}`);
        if (!scoreElement) {
            let scoreboard = document.getElementById("scoreboard");
            let newScore = document.createElement("p");
            newScore.innerHTML = `${player} Wins: <span id="score-${player}">${scores[player]}</span>`;
            scoreboard.appendChild(newScore);
        } else {
            scoreElement.textContent = scores[player];
        }
    });
}

function updateDiscardButton(remaining) {
    const discardBtn = document.getElementById("discard-btn");
    discardBtn.textContent = `Discard (${remaining})`;
    discardBtn.disabled = remaining <= 0;
}

async function buyUpgrade(upgrade) {
    console.log(upgrade)
    //cost, effect, name, rarity, tier
    const response = await fetch(`${BASE_URL}/game/${gameId}/${playerId}/buyupgrade/${upgrade.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
    const data = await response.json();
    if (!response.ok || data.error) { // ✅ Better error handling
        logMessage(data.error || "Failed to buy upgrade");
        return;
    }
    

    console.log("Buyupgrade recieved response: " + data.message);
    if (data.message === "Not enough gold"){
        logMessage("Not enough gold")
    } else {
        if (data.price) {
            addGold(-1 * data.price)
        }
        upgrades.push(upgrade);
        renderUpgrades();

        // Remove the purchased upgrade from the shop by matching its unique ID
        const shopItems = document.getElementById("shop-items");
        const upgradeCards = shopItems.querySelectorAll(".upgradecard");
        upgradeCards.forEach(card => {
            if (card.dataset.upgradeId === String(upgrade.id)) {
                card.remove();
            }
        });
    }
    
    
}

async function renderUpgrades() {
    upgradeContainer = document.getElementById("upgrade-container");
    upgradeContainer.innerHTML = ""
    const upgradeEmojis = {
        "Increase Health": "❤️",
        "Increase Health %": "💖",
        "Increase Discards": "♻️",
        "Increase Damage": "⚔️",
        "Increase Earth Damage": "🌿",
        "Increase Fire Damage": "🔥",
        "Increase Water Damage": "💧",
        "Increase Air Damage": "💨"
    };

    upgrades.forEach(upgrade => {
        const card = document.createElement("div");
        card.classList.add("upgradecard", upgrade.rarity);

        const emoji = upgradeEmojis[upgrade.name] || "❓"; // Default fallback
        
        card.innerHTML = `
            <div class="emoji">${emoji}</div>
            <div class="upgrade-name">${upgrade.name}</div>
            <div class="upgrade-effect">${upgrade.effect}</div>
            <div class="rarity">${upgrade.rarity}</div>
        `;

        upgradeContainer.appendChild(card);
    });
}

async function playHand() {
    if (selectedCards.length === 0) return;

    selectedCards.forEach(card => {
        const cardElement = document.querySelector(`[data-id="${card.rank}-${card.suit}"]`);
        if (cardElement) {
            cardElement.classList.add("playing");
            setTimeout(() => {
                cardElement.remove();  // Remove card after animation
            }, 800); 
        }
    });

    const response = await fetch(`${BASE_URL}/game/${gameId}/play_hand`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            player_id: playerId,
            cards: selectedCards.map(({ rank, suit }) => ({ rank, suit })) // ✅ Only send rank & suit
        })
    });

    const data = await response.json();
    if (data.error) {
        logMessage(data.error);
    } else {
        selectedCards = [];
        document.getElementById("play-hand-btn").disabled = true;
    }

    document.querySelectorAll(".card.selected").forEach(card => {
        card.classList.remove("selected");
    });

    updateActionButtons();
}


function updateActionButtons() {
    document.getElementById("play-hand-btn").disabled = selectedCards.length === 0;
    document.getElementById("discard-btn").disabled = selectedCards.length === 0;
}



function showScoreboard() {
    document.getElementById("scoreboard-container").style.display = "block";
}

function showTurnIndicator(player) {
    updateTurnIndicator(`Player ${player} turn`);
}

function openUpgradeStore(upgrades) {
    const shopContainer = document.getElementById("shop-container");
    const shopItems = document.getElementById("shop-items");
    const gameContainer = document.getElementById("game-container"); // Get the main game container

    // Hide the game elements but keep the scoreboard
    gameContainer.classList.add("hidden");
    shopContainer.style.display = "block";

    shopItems.innerHTML = "";

    const upgradeEmojis = {
        "Increase Health": "❤️",
        "Increase Health %": "💖",
        "Increase Discards": "♻️",
        "Increase Damage": "🔥",
        "Increase Earth Damage": "🌿",
        "Increase Fire Damage": "🔥",
        "Increase Water Damage": "💧",
        "Increase Air Damage": "💨"
    };

    upgrades.forEach(upgrade => {
        const card = document.createElement("div");
        card.classList.add("upgradecard", upgrade.rarity);

        const emoji = upgradeEmojis[upgrade.name] || "❓"; // Default fallback
        
        card.innerHTML = `
            <div class="price">${upgrade.cost} 🪙</div>
            <div class="emoji">${emoji}</div>
            <div class="upgrade-name">${upgrade.name}</div>
            <div class="upgrade-effect">${upgrade.effect}</div>
            <div class="rarity">${upgrade.rarity}</div>
        `;

        card.onclick = () => buyUpgrade(upgrade);
        card.dataset.upgradeId = upgrade.id;
        shopItems.appendChild(card);
    });

    shopContainer.style.display = "block";
    addGold(0);
}


function getWebSocketUrl(gameId, playerId) {
    if (!gameId || !playerId) return null;
    return DEVELOPMENT_MODE 
        ? `ws://localhost:8000/game/${gameId}/ws/${playerId}` 
        : `wss://cardgame-lndd.onrender.com/game/${gameId}/ws/${playerId}`;
}

function handleWebSocketOpen() {
    console.log("WebSocket connection established!");
    // logMessage("Connected to WebSocket!");
}

function handleWebSocketMessage(event) {
    console.log("Raw WebSocket Message:", event.data);
    const message = JSON.parse(event.data);
    
    if (message.next_player) updateTurnIndicator(message.next_player);
    
    switch (message.type) {
        case "hand_played":
            processHandPlayedMessage(message);
            break;
        case "new_hand":
            console.log("Received new hand:", message.cards);
            renderCards(message.cards);
            break;
        case "hand_updated":
            if (message.player === playerId) {
                console.log("Updated hand:", message.cards);
                renderCards(message.cards);
                if (message.remaining_discards !== undefined) {
                    updateDiscardButton(message.remaining_discards);
                }
            }
            break;
        case "players_updated":
            if (message.players.length === 2) {
                showScoreboard();
                showTurnIndicator(1);
            }
            break;
        case "open_store":
            if (message.player === playerId) {
                openUpgradeStore(message.upgrades);
            }
            break;
        case "apply_upgrades":
            console.log("Recieved change max health websocket message:"+message.player+" "+message.health+" "+message.max_health)
            updateHealth(message.player,message.health,message.max_health)
            updateMaxDiscards(message.player,message.max_discards)
            break;
        
    }
}

function updateMaxDiscards(player, value){
    if (player == playerId) {
        console.log(`Updating player ${playerId} max discards to ${value}`)
        maxDiscards = value;
        updateDiscardButton(maxDiscards);
    } else {
        console.log(`Set other player (${playerId}) max discards to ${value}`)
    }
}

function processHandPlayedMessage(message) {
    Object.keys(message.health_update).forEach(player => {
        const health = message.health_update[player];
        const maxHealth = message.max_health_update?.[player];
        updateHealth(player, health, maxHealth);
    });
    logMessage(`${message.player} played ${message.hand_type} for ${message.damage} damage (x${message.multiplier})`);
    
    if (message.remaining_discards !== undefined && message.player === playerId) {
        updateDiscardButton(message.remaining_discards);
    }
    
    if (message.new_hand !== undefined && message.player === playerId) {
        renderCards(message.new_hand);
    }
    
    if (message.score_update) {
        updateScore(message.score_update);
    }
    
    if (message.winner) {
        alert(`Game over! ${message.winner} wins!`);
    }
    if (message.gold && message.player === playerId) {
        addGold(message.gold)
    }
}

function addGold(value) {
    playerGold += value;
    document.querySelectorAll("#player-coins").forEach(span => {
        span.innerHTML = `🪙${playerGold}`;
    });
}

function handleWebSocketClose() {
    console.log("WebSocket connection closed.");
    logMessage("WebSocket disconnected");
}

function handleWebSocketError(error) {
    console.error("WebSocket Error:", error);
    logMessage(`WebSocket Error: ${error.message}`);
}

function setupWebSocket() {
    let wsUrl = getWebSocketUrl(gameId, playerId);
    if (!wsUrl) return;

    console.log("Connecting to WebSocket:", wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = handleWebSocketOpen;
    ws.onmessage = handleWebSocketMessage;
    ws.onclose = handleWebSocketClose;
    ws.onerror = handleWebSocketError;
}
