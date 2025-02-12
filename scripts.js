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

function updateTurnIndicator(nextPlayer) {
    document.getElementById("game-banner").textContent = `Current Turn: ${nextPlayer}`;
    document.getElementById("turn-indicator").textContent = `Current Turn: ${nextPlayer}`;
}

function updateHealth(player, healthPercentage) {
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
        cardElement.textContent = `${card.rank} of ${card.suit}`;
        cardElement.dataset.suit = card.suit;
        cardElement.dataset.symbol = getSuitSymbol(card.suit);
        cardElement.onclick = () => toggleCardSelection(cardElement, card);
        cardContainer.appendChild(cardElement);
    });
}

function getSuitSymbol(suit) {
    const symbols = { "Hearts": "♥", "Diamonds": "♦", "Clubs": "♣", "Spades": "♠" };
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
    }
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
        if (message.type === "card_played") {
            logMessage(`${message.player} played ${message.card}. Dealt ${message.damage} damage!`);
            Object.keys(message.health_update).forEach(player => {
                updateHealth(player, message.health_update[player]);
            });
        }
        if (message.type === "new_hand") {
            console.log("Received new hand:", message.cards);
            renderCards(message.cards);
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
