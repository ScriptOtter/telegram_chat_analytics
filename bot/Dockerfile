# Используем базовый образ Node.js
FROM node:24.5.0 AS base

WORKDIR /dist

# Копируем package.json и package-lock.json (если он есть)
COPY package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

RUN npm run build

EXPOSE 4000

# Собираем проект Vite
CMD ["npm", "run", "start"]
