import puppeteer from 'puppeteer-core';
import filenamify from 'filenamify';
import Axios from 'axios';
import { createWriteStream } from 'fs';
import { resolve } from 'path';

interface LinkInfo {
  href: string;
  text: string;
}

async function downloadImage(url: string, path: string): Promise<void> {
  const writer = createWriteStream(path);
  const response = await Axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });
  response.data.pipe(writer);
  console.info(`start download ${url}`);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      console.info(`end download ${url}`);
      return resolve();
    });
    writer.on('error', reject);
  });
}

(async (): Promise<void> => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  });
  const page = await browser.newPage();
  await page.goto('https://support.microsoft.com/en-us/help/17780/wallpapers');
  const elements = await page.$$('a[data-bi-id="faq-panel-content"]');
  // get all image link info
  let allLinkInfos: LinkInfo[] = [];
  for (const element of elements) {
    // await element.evaluate(e => (e as HTMLElement).click());
    await element.click();
    const title = await element.evaluate(e => e.getAttribute('aria-title'));
    // const links = await page.$$('table a');
    let links = await page.$$eval('table a', elements =>
      elements.map(e => ({
        href: (e as HTMLAnchorElement).href,
        text: (e as HTMLAnchorElement).text,
      })),
    );
    links = links.map(item => ({ ...item, text: `${title}-${item.text}` }));
    allLinkInfos = [...allLinkInfos, ...links];
    await element.click();
  }
  // download image
  const dirPath = resolve(__dirname, '../images');
  try {
    console.info(`start download images`);
    await Promise.all(
      allLinkInfos.map(item => downloadImage(item.href, resolve(dirPath, filenamify(`${item.text}.jpg`)))),
    );
    console.info(`end download images`);
  } catch (error) {
    console.error(error);
  }

  await browser.close();
})();
