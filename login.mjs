import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: false,
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--window-size=390,844"],
});

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded", timeout: 15000 });

await page.waitForTimeout(1500);

await page.fill('input[type="text"]', "admin");
await page.fill('input[type="password"]', "Puskesmas@123");
await page.click('button[type="submit"]');

console.log("Login submitted — browser tetap terbuka.");

// Keep alive — jangan tutup browser
await new Promise(() => {});
