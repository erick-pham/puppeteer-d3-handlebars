const http = require('http');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const Main = require('./main');
const stream = require('stream');

const puppeteer = require('puppeteer');
let app = express();

app.use(
  bodyParser.json({
    limit: '50mb',
  })
);
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

let browser;
let context;
(async () => {
  if (!browser) {
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      headless: true,
    });
  }
  context = await browser.createIncognitoBrowserContext();
})();

app.get('/', async (req, res) => {
  try {
    return res.send('OK');
  } catch (error) {
    console.log(error);
    return res.status(400).send({
      message: error.stack.toString(),
    });
  }
});

app.post('/api/report', async (req, res) => {
  try {
    const templateName = req.body.template.name;

    if (req.body.getSampleData === true) {
      res.setHeader('Content-Type', 'application/json');
      return res.send(
        require(path.join(
          process.cwd(),
          `/templates/${templateName}/data.json`
        ))
      );
    }

    let start = new Date();
    const main = new Main('happiu-mira');
    main.registerHelper();
    main.registerStyle();
    main.buildHeaderAndFooter();
    main.compile(require('./templates/happiu-mira/data.json'));
    const bufferData = await main.toPDF(context, (responseType = 'buffer'));
    let end = new Date();

    console.log('PDF generated in: ', (end - start) / 1000, 'ms');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=' + `${templateName}-${start.getTime()}.pdf`
    );
    const streamBinary = stream.Readable.from(bufferData);
    streamBinary.pipe(res);
  } catch (error) {
    console.log(error);
    return res.status(400).send({
      message: error.stack.toString(),
    });
  }
});

process.env.PORT = 8000;
var server = http.createServer(app);
var port = process.env.PORT * 1 || 3000;
if (process.env.NODE_ENV === 'production') {
  server.listen(port);
  server.on('error', (error) => console.log(error));
  server.on('listening', (info) => console.log(info));
  console.log('PRODUCTION: http server listening on %d', port);
} else {
  const reload = require('reload');

  app.use(express.static(path.join(__dirname, '.temp')));

  app.get('/live', async (req, res) => {
    try {
      const templateName = 'happiu-mira';
      const main = new Main(templateName);
      main.registerHelper();
      main.registerStyle();
      main.buildHeaderAndFooter();
      main.compile(require(`./templates/${templateName}/data.json`));
      const bufferData = await main.toPDF(context, (responseType = 'buffer'));

      fs.writeFileSync(path.join(__dirname, '/.temp/temp.pdf'), bufferData);

      res.sendFile(path.join(__dirname, '/views/index.html'));
    } catch (error) {
      console.log(error);
      return res.status(400).send({
        message: error.stack.toString(),
      });
    }
  });

  // Reload code here
  reload(app)
    .then(function (reloadReturned) {
      // reloadReturned is documented in the returns API in the README

      // Reload started, start web server
      server.listen(port, function () {
        console.log('Web server listening on port ' + port);
      });
    })
    .catch(function (err) {
      console.error(
        'Reload could not start, could not start server/sample app',
        err
      );
    });
}