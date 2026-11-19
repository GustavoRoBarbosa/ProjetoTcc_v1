# ---------- ESTÁGIO 1: build do React ----------
# ponto de partida com um ambiente node instalado e versão reduzida do linux apelidada de "build"
FROM node:20-alpine AS build
# criação da pasta app onde vai estar os proximos passos
WORKDIR /app
# faz uma copia de lista das bibliotecas necessarias presentes dentro destes dois arquivos para a pasta atual "app"
COPY package.json package-lock.json ./
# executa o comando fazendo a instalação das bibliotecas presentes nos arquivos anteriores
RUN npm ci
# faz uma copia de tudo que esta na minha pasta raiz "frontend" para a pasta atual "app"
COPY . .
# NOVO: endereço da API usado pelo React. O padrão "/api/" é relativo: o navegador
# chama o MESMO endereço do site e o nginx repassa para o container do backend.
# Variáveis REACT_APP_* são "gravadas" no JS durante o build, por isso ficam aqui.
ARG REACT_APP_API_URL=/api/
ENV REACT_APP_API_URL=$REACT_APP_API_URL
# faz a execução do scripts do build que estão no package.json gerando uma pasta /build com meus arquivos HTML, CSS, JS compactados para o navegador
RUN npm run build

# ---------- ESTÁGIO 2: servidor web ----------
# faz a criação de um novo ambiente com o nginx instalado e novamente usando o "alpine" que é a parte do linux
FROM nginx:alpine
# NOVO: substitui a configuração padrão do nginx pela nossa (proxy para o backend + rotas do React)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# vai até o ambiente com apelido "build" e faz uma copia da pasta build que esta dentro da pasta app para o caminho onde o nginx procura para mostrar o site
COPY --from=build /app/build /usr/share/nginx/html
# aviso que o container vai estar rodando na porta 80
EXPOSE 80
