var http = require("http");
var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var fs = require("fs");
const Main = require('./main');
const stream = require('stream');
var app = express();
const puppeteer = require('puppeteer');
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.json({
  limit: "50mb"
}));
app.use(bodyParser.urlencoded({
  extended: false
}));

let browser;
let context;
(async () => {

  if (!browser) {
    browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ],
      headless: true,
    })
  }
  context = await browser.createIncognitoBrowserContext();
})()

app.post("/api/report", async (req, res) => {
  try {
    const templateName = req.body.template.name;

    if (req.body.getSampleData === true) {
      res.setHeader('Content-Type', 'application/json');
      return res.send(require(path.join(process.cwd(), `/templates/${templateName}/data.json`)))
    };

    let start = new Date();
    const main = new Main('happiu-mira');
    main.registerHelper();
    main.registerStyle();
    main.buildHeaderAndFooter();
    main.compile(require('./templates/happiu-mira/data.json'));
    const bufferData = await main.toPDF(context, responseType = 'buffer');
    let end = new Date();
    console.log((end - start) / 1000)

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=' + `${templateName}-${start.getTime()}.pdf`);
    const streamBinary = stream.Readable.from(bufferData)
    streamBinary.pipe(res);
  } catch (error) {
    return res.status(400).send({
      message: error.stack.toString(),
    });
  }
});

// playground requires you to assign document definition to a variable called dd
process.env.PORT = 8000;
var server = http.createServer(app);
var port = process.env.PORT * 1 || 3000;
server.listen(port);

console.log("http server listening on %d", port);