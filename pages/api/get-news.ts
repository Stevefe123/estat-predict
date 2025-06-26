import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const NEWS_API_KEY = process.env.NEWS_API_KEY;

    if (!NEWS_API_KEY) {
        return res.status(500).json({ message: 'News API key not configured.' });
    }

    // We'll search for general football news from top sources
    const url = `https://newsapi.org/v2/everything?q=football&sources=bbc-sport,espn,four-four-two&sortBy=publishedAt&pageSize=10&apiKey=${NEWS_API_KEY}`;

    try {
        const response = await axios.get(url);
        // Filter out articles without images and slice to get the top 5
        const articles = response.data.articles
            .filter(article => article.urlToImage)
            .slice(0, 5);
        
        res.status(200).json(articles);
    } catch (error) {
        console.error("News API Error:", error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Error fetching news.' });
    }
}