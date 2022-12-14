const fs = require("fs");
const path = require("path");
const handlebars = require("handlebars");
const puppeteer = require('puppeteer');
class Main {
  constructor(templateName, data, options, ) {
    this.data = data;
    this.compiledHTML = null;
    this.handlebars = handlebars;
    this.templateName = templateName;
    this.options = {
      ...options,
      format: 'A4',
      preferCSSPageSize: true,
      printBackground: true,
      margin: {
        top: "3cm",
        bottom: "2cm",
        left: "1cm",
        right: "1cm"
      },
      // path: 'output.pdf',
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: '<div></div>',
    }

    this.registerHelper();
    this.registerStyle();
    this.compile(this.data);
  }

  registerHelper() {
    const helpers = require(path.join(process.cwd() + `/templates/${this.templateName}/helpers.js`))
    Object.keys(helpers).forEach(key => this.handlebars.registerHelper(key, helpers[key]))
  }

  registerStyle() {
    this.handlebars.registerPartial("local_style", fs.readFileSync(path.join(process.cwd() + `/templates/${this.templateName}/style.hbs`), "utf-8"));
  }

  compile(data) {
    const templateHtml = fs.readFileSync(path.join(process.cwd(), `/templates/${this.templateName}/hbs/content.hbs`), 'utf8');
    this.compiledHTML = this.handlebars.compile(templateHtml)(data);

    if (this.options.displayHeaderFooter) {
      const headerTemplate = fs.readFileSync(path.join(process.cwd(), `/templates/${this.templateName}/hbs/header.hbs`), 'utf8');
      const footerTemplate = fs.readFileSync(path.join(process.cwd(), `/templates/${this.templateName}/hbs/footer.hbs`), 'utf8');
      this.options.headerTemplate = this.handlebars.compile(headerTemplate)(data);;
      this.options.footerTemplate = this.handlebars.compile(footerTemplate)(data);;
    }
  }

  toHTML() {
    return {
      compiledHTML: this.compiledHTML,
      headerTemplate: this.options.headerTemplate,
      footerTemplate: this.options.footerTemplate
    }
  }

  async toPDF(context) {
    // let browser;
    // if (!browser) {
    //   browser = await puppeteer.launch({
    //     args: [
    //       "--no-sandbox",
    //       "--disable-setuid-sandbox",
    //       "--disable-dev-shm-usage"
    //     ],
    //     headless: true,
    //   })
    // }
    // const context = await browser.createIncognitoBrowserContext();
    const page = await context.newPage();

    await page.goto(`data: text/html, ${this.compiledHTML}`, {
      waitUntil: "networkidle0"
    });
    await page.setContent(this.compiledHTML);
    await page.emulateMediaType("print");

    const pdf = await page.pdf(this.options);
    await page.close();

    // await context.close();

    return pdf;
  }
}

module.exports = Main