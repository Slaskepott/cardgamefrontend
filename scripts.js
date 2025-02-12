const BASE_URL = "https://cardgame-lndd.onrender.com";
let playerId = null;
let gameId = null;
let ws = null;
let selectedCards = [];

function logMessage(message) {
    const logDiv = document.getElementById("log");
    logDiv.innerHTML += `<p>${message}</p>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

async function createGame() {
    gameId = document.getElementById("gameId").value.trim();
    if (!gameId) return logMessage("Please enter a game ID!");
    
    const response = await fetch(`${BASE_URL}/game/create/${gameId}`, { method: "POST" });
    const data = await response.json();
    if (data.error) return logMessage(data.error);
    logMessage(`Game created: ${gameId}`);
    joinGame();
}

async function joinGame() {
    gameId = document.getElementById("gameId").value.trim();
    if (!gameId) return logMessage("Please enter a game ID!");
    
    const response = await fetch(`${BASE_URL}/game/${gameId}/players`);
    const data = await response.json();
    if (data.error) return logMessage(data.error);
    
    const existingPlayers = data.players;
    let nextPlayerNumber = 1;
    while (existingPlayers.includes(`player${nextPlayerNumber}`)) {
        nextPlayerNumber++;
    }
    playerId = `player${nextPlayerNumber}`;
    
    await fetch(`${BASE_URL}/game/join/${gameId}?player_id=${playerId}`, { method: "POST" });
    logMessage(`Joined as ${playerId}`);
    setupWebSocket();
}

function updateTurnIndicator(nextPlayer) {
    document.getElementById("game-banner").textContent = `Current Turn: ${nextPlayer}`;
    document.getElementById("turn-indicator").textContent = `Current Turn: ${nextPlayer}`;
}

function updateHealth(player, healthPercentage) {
    console.log("Update health was called for player "+player+" with percentage "+healthPercentage)
    document.getElementById(`health-${player}`).style.width = `${healthPercentage}%`;
}

function renderCards(cards) {
    console.log("Rendering cards:", cards);
    const cardContainer = document.getElementById("card-container");
    cardContainer.innerHTML = "";

    if (!cards || cards.length === 0) {
        cardContainer.innerHTML = "<p>No cards available.</p>";
        return;
    }

    cards.forEach(card => {
        const cardElement = document.createElement("div");
        cardElement.classList.add("card");
        cardElement.dataset.suit = card.suit;
        cardElement.dataset.symbol = getSuitSymbol(card.suit);

        // Set the inner HTML to display a large rank number and a bigger suit emoji
        cardElement.innerHTML = `
            <div class="card-rank">${card.rank}</div>
            <div class="card-suit">${getSuitSymbol(card.suit)}</div>
        `;

        cardElement.onclick = () => toggleCardSelection(cardElement, card);
        cardContainer.appendChild(cardElement);
    });
}

function getSuitSymbol(suit) {
    const symbols = { "Fire": "🔥", "Air": "💨", "Earth": "🌿", "Water": "💧" };
    return symbols[suit] || "";
}


function toggleCardSelection(cardElement, card) {
    if (selectedCards.includes(card)) {
        selectedCards = selectedCards.filter(c => c !== card);
        cardElement.classList.remove("selected");
    } else {
        selectedCards.push(card);
        cardElement.classList.add("selected");
    }
    document.getElementById("play-hand-btn").disabled = selectedCards.length === 0;
    document.getElementById("discard-btn").disabled = selectedCards.length === 0;
}

async function discard() {
    console.log("pressed discard button");
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
        document.getElementById("discard-btn").disabled = true;

        if (data.remaining_discards !== undefined) {
            updateDiscardButton(data.remaining_discards);
        }
    }
    document.querySelectorAll(".card.selected").forEach(card => {
        card.classList.remove("selected");
    });

    selectedCards = [];
    document.getElementById("play-hand-btn").disabled = true;
    document.getElementById("discard-btn").disabled = true;
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
        body: JSON.stringify({ player_id: playerId, cards: selectedCards })
    });
    const data = await response.json();
    if (data.error) {
        logMessage(data.error);
    } else {
        logMessage(`${playerId} played a hand. Dealt ${data.damage} damage!`);
        selectedCards = [];
        document.getElementById("play-hand-btn").disabled = true;
        if (data.remaining_discards !== undefined) {
            updateDiscardButton(data.remaining_discards);
        }
    }
    document.querySelectorAll(".card.selected").forEach(card => {
        card.classList.remove("selected");
    });

    selectedCards = [];
    document.getElementById("play-hand-btn").disabled = true;
    document.getElementById("discard-btn").disabled = true;
}

function setupWebSocket() {
    if (!gameId || !playerId) return;
    const wsUrl = `wss://cardgame-lndd.onrender.com/game/${gameId}/ws/${playerId}`;
    console.log("Connecting to WebSocket:", wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connection established!");
        logMessage("Connected to WebSocket!");
    };

    ws.onmessage = (event) => {
        console.log("Raw WebSocket Message:", event.data);
        const message = JSON.parse(event.data);
        logMessage(`Game Update: ${event.data}`);

        if (message.next_player) updateTurnIndicator(message.next_player);
        if (message.type === "hand_played") {
            Object.keys(message.health_update).forEach(player => {
                updateHealth(player, message.health_update[player]);
            });
            logMessage(`${message.player} played ${message.hand_type}`);
            if ((message.remaining_discards !== undefined) && message.player === playerId) {
                updateDiscardButton(message.remaining_discards);
    
            }
            if (message.new_hand !== undefined && message.player === playerId){
                renderCards(message.new_hand)
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
