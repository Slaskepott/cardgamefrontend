const BASE_URL = "https://cardgame-lndd.onrender.com";
let playerId = null;
let gameId = null;
let ws = null;

function logMessage(message) {
    const logDiv = document.getElementById("log");
    logDiv.innerHTML += `<p>${message}</p>`;
    logDiv.scrollTop = logDiv.scrollHeight;
}

function updateTurnIndicator(nextPlayer) {
    document.getElementById("game-banner").textContent = `Current Turn: ${nextPlayer}`;
    document.getElementById("turn-indicator").textContent = `Current Turn: ${nextPlayer}`;
}

function updateHealth(player, healthPercentage) {
    document.getElementById(`health-${player}`).style.width = `${healthPercentage}%`;
}

function renderCards(cards) {
    console.log("Rendering cards:", cards); // ✅ Debugging line
    const cardContainer = document.getElementById("card-container");
    cardContainer.innerHTML = ""; // ✅ Clear previous cards

    if (!cards || cards.length === 0) {
        cardContainer.innerHTML = "<p>No cards available.</p>";
        return;
    }

    cards.forEach(card => {
        const cardElement = document.createElement("div");
        cardElement.classList.add("card");
        cardElement.textContent = `${card.rank} of ${card.suit}`;
        cardElement.onclick = () => playCard(card.rank, card.suit);
        cardContainer.appendChild(cardElement);
    });
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

async function playCard(rank, suit) {
    const response = await fetch(`${BASE_URL}/game/${gameId}/play_card?player_id=${playerId}&card=${rank}%20of%20${suit}`, { method: "POST" });
    const data = await response.json();
    if (data.error) {
        logMessage(data.error);
    } else {
        logMessage(`${playerId} played ${rank} of ${suit}. Dealt ${data.damage} damage!`);
    }
}

function setupWebSocket() {
    if (!gameId || !playerId) return;
    const wsUrl = `wss://cardgame-lndd.onrender.com/game/${gameId}/ws/${playerId}`;
    console.log("Connecting to WebSocket:", wsUrl); // ✅ Debugging log
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log("WebSocket connection established!"); // ✅ Debugging log
        logMessage("Connected to WebSocket!");
    };

    ws.onmessage = (event) => {
        console.log("Raw WebSocket Message:", event.data); // ✅ Debugging log
        const message = JSON.parse(event.data);
        logMessage(`Game Update: ${event.data}`);

        if (message.next_player) updateTurnIndicator(message.next_player);
        if (message.type === "card_played") {
            logMessage(`${message.player} played ${message.card}. Dealt ${message.damage} damage!`);
            Object.keys(message.health_update).forEach(player => {
                updateHealth(player, message.health_update[player]);
            });
        }
        if (message.type === "new_hand") {
            console.log("Received new hand:", message.cards); // ✅ Debugging log
            renderCards(message.cards);
        }
    };

    ws.onclose = () => {
        console.log("WebSocket connection closed."); // ✅ Debugging log
        logMessage("WebSocket disconnected");
    };

    ws.onerror = (error) => {
        console.error("WebSocket Error:", error); // ✅ Debugging log
        logMessage(`WebSocket Error: ${error.message}`);
    };
}

