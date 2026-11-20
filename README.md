# GatherTech

Aplicativo mobile para divulgação, descoberta e gestão de eventos de tecnologia, desenvolvido com **React Native (Expo)** no frontend e **Node.js (Express + PostgreSQL)** no backend.

## Estrutura do Projeto

- `backend/` — API REST (`server.js`), conexão com banco de dados PostgreSQL (`db.js`), autenticação com Google OAuth e envio de e-mails.
- `frontend/` — Aplicativo mobile em React Native / Expo (`App.js` e telas em `src/screens/`).

---

## Como Executar o Projeto

### 1. Backend (API)
Abra um terminal na pasta `backend` e execute:

```bash
npm install
node server.js