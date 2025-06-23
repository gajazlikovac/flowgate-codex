# Use the official Node.js LTS image
FROM node:20

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Copy app source
COPY . .

# Expose port for Cloud Run
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
