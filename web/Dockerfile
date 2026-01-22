# Используем базовый образ Node.js
FROM node:24.5.0 AS base

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если он есть)
COPY package.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем остальные файлы проекта
COPY . .

EXPOSE 5173

# Собираем проект Vite
CMD ["npm", "run", "dev"]
