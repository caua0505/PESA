import subprocess
import webbrowser
import time

# sobe a API
subprocess.Popen(["python", "-m", "uvicorn", "backend.main:app"])

# espera o servidor subir
time.sleep(2)

# abre o navegador
webbrowser.open("http://127.0.0.1:8000")