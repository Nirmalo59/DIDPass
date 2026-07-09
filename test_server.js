const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Hello from port 5002');
});
server.listen(5002, '127.0.0.1', () => {
  console.log('Test server listening on 127.0.0.1:5002');
});
