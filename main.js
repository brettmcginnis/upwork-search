import { Actor } from 'apify';
import { PuppeteerCrawler, Dataset } from 'crawlee';

await Actor.init();

const input = await Actor.getInput();
const { searchTerm } = input;

if (!searchTerm) {
    throw new Error('Search term is required');
}

const crawler = new PuppeteerCrawler({
    launchContext: {
        launchOptions: {
            headless: true,
        },
    },
    async requestHandler({ page }) {
        await page.waitForSelector('.job-tile', { timeout: 10000 });
        
        const jobs = await page.evaluate(() => {
            const jobElements = document.querySelectorAll('.job-tile');
            const results = [];
            
            jobElements.forEach(job => {
                const titleElement = job.querySelector('h4 a, .job-tile-title a');
                const descriptionElement = job.querySelector('.job-tile-content, .job-description');
                const proposalsElement = job.querySelector('.proposals, .job-tile-proposals');
                const budgetElement = job.querySelector('.budget, .job-tile-budget');
                const postedElement = job.querySelector('.posted, .job-tile-posted');
                
                if (titleElement) {
                    const title = titleElement.textContent?.trim();
                    const url = titleElement.href;
                    const description = descriptionElement?.textContent?.trim() || '';
                    const proposals = proposalsElement?.textContent?.trim() || '';
                    const budget = budgetElement?.textContent?.trim() || '';
                    const posted = postedElement?.textContent?.trim() || '';
                    
                    results.push({
                        title,
                        description,
                        url,
                        proposals,
                        budget,
                        posted,
                        skills: [],
                        clientRating: '',
                        clientLocation: ''
                    });
                }
            });
            
            return results;
        });
        
        for (const job of jobs) {
            await Dataset.pushData(job);
        }
    },
});

const searchUrl = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(searchTerm)}`;
await crawler.run([searchUrl]);

const dataset = await Dataset.open();
const allJobs = await dataset.getData();

await Actor.setValue('OUTPUT', allJobs.items);

await Actor.exit();