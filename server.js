const http = require("http");
const app = require("./app");

const normalizePort = (val) => {
  const port = parseInt(val, 10);
  if (Number.isNaN(port)) return val;
  if (port >= 0) return port;
  return false;
};

const port = normalizePort(process.env.PORT || "4000");
app.set("port", port);

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Listening on port ${port}`);
});