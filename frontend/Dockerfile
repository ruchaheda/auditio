# Use node image
FROM node:14

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json .
RUN npm install

# Copy the entire application
COPY . .

# Expose the port the React app will run on
EXPOSE 3000

# Start the React app
CMD ["npm", "start"]