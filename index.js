const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer');
const handlebars = require("handlebars");

const main = async () => {
  try {
    start = new Date()
    end = new Date()

    console.log((end - start) / 1000)
  } catch (error) {
    console.log(error)
  }
}

main()