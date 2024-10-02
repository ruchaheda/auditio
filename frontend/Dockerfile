FROM node:16

WORKDIR /app

# Copy package.json and install dependencies
# RUN rm -rf node_modules package-lock.json
COPY package.json package-lock.json ./
RUN npm install
COPY . .

EXPOSE 3000
CMD ["npm", "start"]