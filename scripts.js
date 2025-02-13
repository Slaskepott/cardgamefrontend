//Remember to change wsURL as well!

//const BASE_URL = "http://localhost:8000";
const BASE_URL = "https://cardgame-lndd.onrender.com";


let playerId = null;
let gameId = null;
let ws = null;
let selectedCards = [];
let playerGold = 0;
let upgrades = [];


function logMessage(message) {
    const logDiv = document.getElementById("log");
    logDiv.innerHTML += `<p>${message}</p>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function hideGameSetup() {
    document.getElementById("game-setup").style.display = "none";
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

function updateHealth(player, healthPercentage) {
    console.log("Update health was called for player "+player+" with percentage "+healthPercentage)
    document.getElementById(`health-${player}`).style.width = `${healthPercentage}%`;
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

async function playHand() {
    if (selectedCards.length === 0) return;

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

    shopItems.innerHTML = "";
    upgrades.forEach(upgrade => {
        const btn = document.createElement("button");
        btn.textContent = `${upgrade.name} (${upgrade.cost} Coins)`;
        btn.onclick = () => buyUpgrade(upgrade.id);
        shopItems.appendChild(btn);
    });

    shopContainer.style.display = "block";
} 

function setupWebSocket() {
    if (!gameId || !playerId) return;
    const wsUrl = `wss://cardgame-lndd.onrender.com/game/${gameId}/ws/${playerId}`;
    //const wsUrl = `ws://localhost:8000/game/${gameId}/ws/${playerId}`;
    console.log("Connecting to WebSocket:", wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connection established!");
        //logMessage("Connected to WebSocket!");
    };

    ws.onmessage = (event) => {
        console.log("Raw WebSocket Message:", event.data);
        const message = JSON.parse(event.data);
        //logMessage(`Game Update: ${event.data}`);

        if (message.next_player) updateTurnIndicator(message.next_player);
        if (message.type === "hand_played") {
            Object.keys(message.health_update).forEach(player => {
                updateHealth(player, message.health_update[player]);
            });
            logMessage(`${message.player} played ${message.hand_type} for ${message.damage} damage (x${message.multiplier})`);
            if ((message.remaining_discards !== undefined) && message.player === playerId) {
                updateDiscardButton(message.remaining_discards);
    
            }
            if (message.new_hand !== undefined && message.player === playerId){
                renderCards(message.new_hand)
            }
            if (message.score_update) {
                updateScore(message.score_update);
            }
            if (message.remaining_discards && message.player === playerId) {
                updateDiscardButton(message.remaining_discards)
            }
        
            if (message.winner) {
                alert(`Game over! ${message.winner} wins!`);
            }
            
        }
        if (message.type === "new_hand") {
            console.log("Received new hand:", message.cards);
            renderCards(message.cards);
        }
        if (message.type === "hand_updated" && message.player === playerId) {
            console.log("Updated hand:", message.cards);
            renderCards(message.cards);
            if (message.remaining_discards !== undefined) {
                updateDiscardButton(message.remaining_discards);
            }
        }
        if (message.type === "players_updated") {
            if (message.players.length === 2) {
                showScoreboard();
                showTurnIndicator(1);  // ✅ Set text to "Player 1 turn"
            }
        }
        if (message.type === "open_store" && message.player === playerId) {
            openUpgradeStore(message.upgrades);
        }
    };

    ws.onclose = () => {
        console.log("WebSocket connection closed.");
        logMessage("WebSocket disconnected");
    };

    ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
        logMessage(`WebSocket Error: ${error.message}`);
    };
}