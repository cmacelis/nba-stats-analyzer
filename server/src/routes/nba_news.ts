import express from 'express';
import { createEndpointLimiter } from '../utils/rateLimiter';

const router = express.Router();
const newsLimiter = createEndpointLimiter(15, 100);

interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  imageUrl: string;
  category: string;
  aiAnalysis: string;
  trending: boolean;
  url: string;
}

// Mock news data
const mockNews: NewsItem[] = [
  {
    id: '1',
    title: 'Lakers Secure Playoff Spot',
    content: 'The Los Angeles Lakers have secured their spot in the playoffs...',
    source: 'NBA.com',
    publishedAt: new Date().toISOString(),
    imageUrl: 'https://example.com/lakers.jpg',
    category: 'Team News',
    aiAnalysis: 'This development significantly impacts the Western Conference standings...',
    trending: true,
    url: 'https://example.com/lakers-playoffs'
  },
  {
    id: '2',
    title: 'Stephen Curry Breaks Another Record',
    content: 'Warriors superstar Stephen Curry has broken yet another NBA record...',
    source: 'ESPN',
    publishedAt: new Date(Date.now() - 86400000).toISOString(),
    imageUrl: 'https://example.com/curry.jpg',
    category: 'Player News',
    aiAnalysis: 'Curry continues to redefine the game with his exceptional shooting...',
    trending: true,
    url: 'https://example.com/curry-record'
  }
];

// Get NBA news with pagination and filters
router.get('/news', newsLimiter, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = req.query.sortBy as string || 'publishedAt';
    const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';
    const searchQuery = req.query.searchQuery as string;

    let filteredNews = [...mockNews];

    // Apply search filter
    if (searchQuery) {
      filteredNews = filteredNews.filter(news =>
        news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        news.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    filteredNews.sort((a, b) => {
      const aValue = a[sortBy as keyof NewsItem];
      const bValue = b[sortBy as keyof NewsItem];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return 0;
    });

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNews = filteredNews.slice(startIndex, endIndex);

    res.json({
      news: paginatedNews,
      total: filteredNews.length,
      page,
      totalPages: Math.ceil(filteredNews.length / limit)
    });
  } catch (error) {
    console.error('Error fetching NBA news:', error);
    res.status(500).json({ error: 'Failed to fetch NBA news' });
  }
});

// Get trending news
router.get('/news/trending', newsLimiter, async (req, res) => {
  try {
    const trendingNews = mockNews.filter(news => news.trending);
    res.json(trendingNews);
  } catch (error) {
    console.error('Error fetching trending news:', error);
    res.status(500).json({ error: 'Failed to fetch trending news' });
  }
});

// Get news by category
router.get('/news/category/:category', newsLimiter, async (req, res) => {
  try {
    const { category } = req.params;
    const categoryNews = mockNews.filter(
      news => news.category.toLowerCase() === category.toLowerCase()
    );
    res.json(categoryNews);
  } catch (error) {
    console.error('Error fetching category news:', error);
    res.status(500).json({ error: 'Failed to fetch category news' });
  }
});

// Get news by ID
router.get('/news/:id', newsLimiter, async (req, res) => {
  try {
    const { id } = req.params;
    const news = mockNews.find(news => news.id === id);
    
    if (!news) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    res.json(news);
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

export default router; 