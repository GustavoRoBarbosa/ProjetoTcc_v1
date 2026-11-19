# imagem oficial do Python 3.12 na versão "slim" (Debian enxuto). Django 6 exige Python 3.12+
FROM python:3.12-slim

# não gera arquivos .pyc e mostra os logs (print) na hora, sem ficar em buffer
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# o mysqlclient é escrito em C e precisa ser compilado: instala compilador (gcc),
# as bibliotecas do cliente MySQL e o pkg-config. Depois limpa o cache do apt
# para a imagem ficar menor.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc default-libmysqlclient-dev pkg-config \
    && rm -rf /var/lib/apt/lists/*

# copia SÓ o requirements primeiro: enquanto ele não mudar, o Docker reaproveita
# a camada (cache) do pip install e o build fica muito mais rápido
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# agora sim copia o resto do código
COPY . .

# porta onde o Django vai escutar
EXPOSE 8000

# comando padrão: aplica as migrations no banco e sobe o servidor.
# 0.0.0.0 = aceitar conexões vindas de fora do container (127.0.0.1 só aceitaria de dentro)
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
