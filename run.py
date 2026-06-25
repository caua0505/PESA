import multiprocessing
import threading
import webbrowser
import time
import uvicorn

from backend.main import app


def start():
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8000,
        reload=False
    )


if __name__ == "__main__":
    multiprocessing.freeze_support()

    threading.Thread(
        target=start,
        daemon=True
    ).start()

    time.sleep(3)

    webbrowser.open("http://127.0.0.1:8000")

    while True:
        time.sleep(1)
