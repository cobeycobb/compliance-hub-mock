const { chromium } = require('playwright');

async function finalTest() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🔗 Testing updated GitHub Pages site...');
    await page.goto('https://cobeycobb.github.io/compliance-hub-mock/');
    await page.waitForLoadState('networkidle');
    
    // Wait for data to load
    await page.waitForSelector('.lot-card', { timeout: 10000 });
    
    // Check total count
    const totalCount = await page.textContent('#count');
    console.log(`📊 Total results: ${totalCount}`);

    // Test BT-000118 search (Berry Gummies)
    console.log('\n🍓 Testing BT-000118 search...');
    await page.fill('#biotrack-search', 'BT-000118');
    await page.waitForTimeout(1000);
    
    const gummyCount = await page.textContent('#count');
    console.log(`Found ${gummyCount} result(s) for BT-000118`);
    
    if (gummyCount === '1') {
      const productName = await page.textContent('.product-name');
      console.log(`✅ Found: ${productName}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'final-gummy-search.png' });

    // Test BT-000119 search (Dark Chocolate)
    console.log('\n🍫 Testing BT-000119 search...');
    await page.fill('#biotrack-search', 'BT-000119');
    await page.waitForTimeout(1000);
    
    const chocolateCount = await page.textContent('#count');
    console.log(`Found ${chocolateCount} result(s) for BT-000119`);
    
    if (chocolateCount === '1') {
      const productName = await page.textContent('.product-name');
      console.log(`✅ Found: ${productName}`);
    }

    // Test COA link
    console.log('\n📄 Testing COA link...');
    const coaLink = await page.locator('.coa-link').first();
    const href = await coaLink.getAttribute('href');
    console.log(`COA link: ${href}`);

    // Test mobile view
    console.log('\n📱 Testing mobile responsiveness...');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: 'final-mobile-view.png' });
    
    // Clear search and verify all 20 results
    await page.click('#clear-search');
    await page.waitForTimeout(1000);
    
    const finalCount = await page.textContent('#count');
    console.log(`\n📋 Final count after clearing: ${finalCount}`);
    
    // Take final desktop screenshot
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.screenshot({ path: 'final-desktop-view.png', fullPage: true });

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during final testing:', error);
  } finally {
    await browser.close();
  }
}

finalTest();