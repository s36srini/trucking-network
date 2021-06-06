const express = require('express')
const app = express()
const port = 3000
const hostname = '127.0.0.1'

app.use(express.static(__dirname + '/src'));
app.get('/', (req, res) => res.sendFile('index.html'));
app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
