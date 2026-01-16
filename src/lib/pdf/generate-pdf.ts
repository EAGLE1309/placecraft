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

      // Get executable path first for better error handling
      const executablePath = await chromium.default.executablePath();

      console.log("[PDF] Launching Chromium in serverless mode");
      console.log("[PDF] Executable path:", executablePath);

      browser = await puppeteerCore.default.launch({
        args: [
          ...chromium.default.args,
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-setuid-sandbox",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
        ],
        executablePath,
        headless: true,
        defaultViewport: { width: 1200, height: 1600 },
      });
    } else {
      // Use regular puppeteer for local development
      console.log("[PDF] Launching Puppeteer in local mode");
      const puppeteer = await import("puppeteer");
      browser = await puppeteer.default.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
    }

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 60000,
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
    console.error("[PDF Generation] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    console.error("[PDF Generation] Environment:", {
      isServerless,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    });

    // Cleanup browser on error
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error("[PDF Generation] Browser close error:", closeError);
      }
    }

    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}. ` +
      "Please try again or contact support if the issue persists."
    );
  }
}
