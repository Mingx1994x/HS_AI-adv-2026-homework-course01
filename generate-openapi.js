const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const options = require('./config/swagger.config');

const spec = swaggerJsdoc(options);
fs.writeFileSync('openapi.json', JSON.stringify(spec, null, 2));
console.log('openapi.json generated successfully');
