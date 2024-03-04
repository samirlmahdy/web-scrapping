const { Parser } = require("json2csv");
const puppeteer = require("puppeteer");
const fs = require("fs");

const scrapeInfiniteScrollItems = async (page, itemTargetCount) => {
  let items = [];
  let currentPage = 1;

  while (itemTargetCount > items.length) {
    // Scroll to the bottom of the page to trigger loading more items
    await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(resolve, 2000); // Adjust delay as needed

        window.scrollTo(0, document.body.scrollHeight);
      });
    });

    // Wait for a short delay to allow items to load

    // Scrape data within the page context
    const productsData = await page.evaluate(() => {
      const products = Array.from(
        document.querySelectorAll(".p13n-grid-content")
      );
      const data = products.map((product) => {
        const rankElement = product.querySelector("span");
        const titleElement = product.querySelector(".a-link-normal span div");
        const priceElement = product.querySelector(
          "._cDEzb_p13n-sc-price_3mJ9Z"
        );
        const ratingElement = product.querySelector(".a-icon-star-small span");
        const linkElement = product.querySelector("a.a-link-normal");
        const imageElement = product.querySelector("._cDEzb_noop_3Xbw5 img");
        // Check if elements exist before accessing their properties
        const rank = rankElement ? rankElement.innerText : "Rank N/A";
        const title = titleElement ? titleElement.textContent : "Title N/A";
        const price = priceElement ? priceElement.innerText : "Price N/A";
        const rating = ratingElement
          ? ratingElement.innerText.split(" ")[0]
          : "Rating N/A";
        const link = linkElement
          ? "https://www.amazon.sa/" + linkElement.getAttribute("href")
          : "N/A";
        const SKU_Index = link.split("/").indexOf("dp") + 1;
        const SKU = link.split("/")[SKU_Index];
        const image_link = imageElement.getAttribute("src");

        return { rank, title, price, rating, link, SKU, image_link }; // Return the data object
      });
      return data;
    });

    // Merge the scraped data into the items array
    items = items.concat(productsData);

    // Check if no additional items were loaded after scrolling
    if (currentPage < 5) {
      // Adjust the condition based on the number of pages you want to scrape
      // If not all items are loaded and there's a "Next Page" button, click it
      const nextPageButton = await page.$(".a-last a"); // Get the "Next Page" button
      if (nextPageButton) {
        currentPage++; // Increment the current page number
        await nextPageButton.click(); // Click the "Next Page" button
        await page.waitForNavigation(); // Wait for navigation to complete
      } else {
        break; // If there is no "Next Page" button, break the loop
      }
    } else {
      break; // If we have reached the desired number of pages, break the loop
    }
  }

  return items.slice(0, itemTargetCount); // Return only the desired number of items
};

const url =
  "https://www.amazon.sa/-/en/gp/bestsellers/office-products/ref=zg_bs_nav_office-products_0";

async function getData() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(url);

  // Call the asynchronous function and await its result
  const items = await scrapeInfiniteScrollItems(page, 100);

  console.log(items);
  const json2csvParser = new Parser();
  const csv = json2csvParser.parse(items);

  // Write the CSV data to a file with UTF-8 encoding
  fs.writeFileSync(
    "office-products_Best_Seller_Amazon.csv",
    "\ufeff" + csv,
    "utf-8"
  );

  console.log("Data saved to scraped_data.csv");
}

getData();
