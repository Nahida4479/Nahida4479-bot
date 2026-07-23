import http from 'http';

http.createServer((req, res) => {
  if (req.url === '/health') {
    if (client.isReady()) {
      res.writeHead(200);
      res.end('OK');
    } else {
      res.writeHead(503);
      res.end('Discord disconnected');
    }
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(3000, () => console.log('Health-check server działa na porcie 3000'));
