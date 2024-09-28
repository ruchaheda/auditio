FROM node:14

WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "start"]