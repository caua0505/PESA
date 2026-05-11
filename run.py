import threading
import webbrowser
import time
import uvicorn


def iniciar_api():

    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False
    )


# inicia API
threading.Thread(
    target=iniciar_api,
    daemon=True
).start()

# espera subir
time.sleep(2)

# abre navegador
webbrowser.open(
    "http://127.0.0.1:8000"
)

# mantém aplicação viva
while True:
    time.sleep(1)