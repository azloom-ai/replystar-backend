FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
# v2 - auto_reply support
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/index.js"]
