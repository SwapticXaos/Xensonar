const path = require('path');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

app.use(
  express.static(__dirname, {
    index: 'index.html',
    extensions: ['html'],
  })
);

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return next();
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`XenSonar server running at http://${HOST}:${PORT}`);
});
