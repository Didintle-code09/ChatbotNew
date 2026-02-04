import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type':'text/plain'});
  res.end('ok');
});

server.listen(5000, () => console.log('test server listening on 5000'));

setInterval(()=>{}, 1000); // keep alive
