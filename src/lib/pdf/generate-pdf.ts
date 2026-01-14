/**
 * Serverless-compatible PDF generation utility
 * 
 * Uses @sparticuz/chromium for serverless environments (Vercel, AWS Lambda)
 * Falls back to regular puppeteer for local development
 */

/**
 * Generate PDF from HTML content
 * Works in both local development and serverless environments
 */
export async function generatePDFFromHTML(html: string): Promise<Buffer> {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  let browser;

  try {
    if (isServerless) {
      // Use @sparticuz/chromium for serverless
      const chromium = await import("@sparticuz/chromium");
      const puppeteerCore = await import("puppeteer-core");

      browser = await puppeteerCore.default.launch({
        args: chromium.default.args,
        executablePath: await chromium.default.executablePath(),
        headless: true,
        defaultViewport: { width: 1200, height: 1600 },
      });
    } else {
      // Use regular puppeteer for local development
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    await page.close();
    await browser.close();

    return Buffer.from(pdf);
  } catch (error) {
    console.error("[PDF Generation] Error:", error);

    // Cleanup browser on error
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }

    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}. ` +
      "Please try again or contact support if the issue persists."
    );
  }
}
