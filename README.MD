# ProjetoTcc_v1

[![CI](https://github.com/GustavoRoBarbosa/ProjetoTcc_v1/actions/workflows/ci.yml/badge.svg)](https://github.com/GustavoRoBarbosa/ProjetoTcc_v1/actions/workflows/ci.yml)

## Sobre o projeto

Sistema de marketplace para oficina de motos, desenvolvido como Trabalho de Conclusão de Curso (TCC).

## Tecnologias utilizadas

- Python / Django / Django REST Framework
- MySQL
- React

## Como rodar o projeto

### Backend
\`\`\`bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
\`\`\`

### Frontend
\`\`\`bash
cd frontend
npm install
npm start
\`\`\`

## Testes

Para rodar os testes unitários:
\`\`\`bash
cd backend
python manage.py test
\`\`\`