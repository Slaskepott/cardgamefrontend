import pygame
import httpx
import threading
import asyncio
import websockets

BASE_URL = "https://cardgame-lndd.onrender.com"
player_id = None
game_id = None
ws = None

pygame.init()

# Screen setup
WIDTH, HEIGHT = 600, 400
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Card Game Client")

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY = (200, 200, 200)

# Fonts
font = pygame.font.Font(None, 30)

# Input fields
game_id_text = ""
card_text = ""
active_input = None

# Game log
logs = []

def add_log(message):
    logs.append(message)
    if len(logs) > 10:
        logs.pop(0)

def set_player_id():
    global player_id
    if not game_id:
        return
    response = httpx.get(f"{BASE_URL}/game/{game_id}/players").json()
    if "error" in response:
        add_log(response["error"])
        return
    existing_players = response.get("players", [])
    player_numbers = [int(p.replace("player", "")) for p in existing_players if p.startswith("player")]
    next_player_number = 1
    while next_player_number in player_numbers:
        next_player_number += 1
    player_id = f"player{next_player_number}"

def create_game():
    global game_id
    response = httpx.post(f"{BASE_URL}/game/create").json()
    game_id = response.get("game_id")
    if game_id:
        add_log(f"Game ID: {game_id}")
        set_player_id()
        response = httpx.post(f"{BASE_URL}/game/join/{game_id}", params={"player_id": player_id}).json()
        add_log(f"Joined as {player_id}")
    else:
        add_log("Failed to create game.")

def join_game():
    global game_id, game_id_text
    game_id = game_id_text.strip()
    if not game_id:
        add_log("Please enter a Game ID!")
        return
    set_player_id()
    response = httpx.post(f"{BASE_URL}/game/join/{game_id}", params={"player_id": player_id}).json()
    if "error" in response:
        add_log(response["error"])
    else:
        add_log(f"Joined as {player_id}")

def play_card():
    if not game_id:
        add_log("No active game!")
        return
    response = httpx.post(f"{BASE_URL}/game/{game_id}/play", params={"player_id": player_id, "card": card_text}).json()
    add_log(f"{player_id} played {card_text}")
    add_log(f"Response: {response}")

def end_turn():
    if not game_id:
        add_log("No active game!")
        return
    response = httpx.post(f"{BASE_URL}/game/{game_id}/end_turn", params={"player_id": player_id}).json()
    add_log(f"{player_id} ended their turn.")
    add_log(f"Response: {response}")

async def listen_for_updates():
    global ws
    while not game_id:
        await asyncio.sleep(1)
    uri = f"wss://cardgame-lndd.onrender.com/game/{game_id}/ws/{player_id}"
    try:
        async with websockets.connect(uri) as ws:
            add_log("Connected to WebSocket!")
            while True:
                message = await ws.recv()
                add_log(f"Game Update: {message}")
    except Exception as e:
        add_log(f"WebSocket error: {e}")

def start_websocket_listener():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(listen_for_updates())

threading.Thread(target=start_websocket_listener, daemon=True).start()

running = True
while running:
    screen.fill(WHITE)
    
    # Draw input fields
    pygame.draw.rect(screen, GRAY, (20, 20, 200, 30))
    pygame.draw.rect(screen, GRAY, (20, 60, 200, 30))
    
    game_id_surface = font.render(game_id_text, True, BLACK)
    screen.blit(game_id_surface, (25, 25))
    card_surface = font.render(card_text, True, BLACK)
    screen.blit(card_surface, (25, 65))
    
    # Draw buttons
    pygame.draw.rect(screen, GRAY, (250, 20, 100, 30))
    pygame.draw.rect(screen, GRAY, (250, 60, 100, 30))
    pygame.draw.rect(screen, GRAY, (250, 100, 100, 30))
    pygame.draw.rect(screen, GRAY, (250, 140, 100, 30))
    
    screen.blit(font.render("Create", True, BLACK), (270, 25))
    screen.blit(font.render("Join", True, BLACK), (270, 65))
    screen.blit(font.render("Play", True, BLACK), (270, 105))
    screen.blit(font.render("End Turn", True, BLACK), (260, 145))
    
    # Draw log
    y = 200
    for log in logs:
        text_surface = font.render(log, True, BLACK)
        screen.blit(text_surface, (20, y))
        y += 30
    
    pygame.display.flip()
    
    for event in pygame.event.get():
        
        if event.type == pygame.QUIT:
            running = False
        elif event.type == pygame.MOUSEBUTTONDOWN:
            x = event.pos[0]
            y = event.pos[1]
            if 20 <= x <= 220 and 20 <= y <= 50:
                active_input = "game_id"
            elif 20 <= x <= 220 and 60 <= y <= 90:
                active_input = "card"
            elif 250 <= x <= 350:
                if 20 <= y <= 50:
                    create_game()
                elif 60 <= y <= 90:
                    join_game()
                elif 100 <= y <= 130:
                    play_card()
                elif 140 <= y <= 170:
                    end_turn()
        elif event.type == pygame.KEYDOWN:
            if active_input == "game_id":
                if event.key == pygame.K_BACKSPACE:
                    game_id_text = game_id_text[:-1]
                else:
                    game_id_text += event.unicode
            elif active_input == "card":
                if event.key == pygame.K_BACKSPACE:
                    card_text = card_text[:-1]
                else:
                    card_text += event.unicode

pygame.quit()
