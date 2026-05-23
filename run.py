import threading
import webbrowser
import time
import uvicorn


def start():

    uvicorn.run(
        "backend.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False
    )


threading.Thread(
    target=start,
    daemon=True
).start()

time.sleep(5)

webbrowser.open(
    "http://127.0.0.1:8000"
)

while True:
    time.sleep(1)