const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') {
        const htmlPath = path.join(__dirname, 'index.html');
        fs.readFile(htmlPath, 'utf-8', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading page');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    }
    else if (req.url === '/css/style.css' && req.method === 'GET') {
        const cssPath = path.join(__dirname, 'css', 'style.css');
        fs.readFile(cssPath, 'utf-8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('CSS not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end(data);
            }
        });
    }
    else if (req.url === '/js/script.js' && req.method === 'GET') {
        const jsPath = path.join(__dirname, 'js', 'script.js');
        fs.readFile(jsPath, 'utf-8', (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('JS not found');
            } else {
                res.writeHead(200, { 'Content-Type': 'application/javascript' });
                res.end(data);
            }
        });
    }
    else if (req.url === '/api/books' && req.method === 'GET') {
        (async () => {
            const books = await getBooks();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(books));
        })();
    }
    else if (req.url.startsWith('/api/books/') && req.method === 'GET') {
        (async () => {
            const bookId = req.url.split('/')[3];
            const books = await getBooks();
            const book = books.find(b => b.id === parseInt(bookId));
            if (book) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(book));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Book not found' }));
            }
        })();
    }
    else if (req.url === '/api/books' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const newBook = JSON.parse(body);
                const addedBook = await addBook(newBook);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(addedBook));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    else if (req.url === '/api/books' && req.method === 'PUT') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const updatedBook = JSON.parse(body);
                const result = await updateBook(updatedBook);
                if (result) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Book not found' }));
                }
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    }
    else if (req.url.startsWith('/api/books/') && req.method === 'DELETE') {
        (async () => {
            const bookId = req.url.split('/')[3];
            const result = await deleteBook(parseInt(bookId));
            if (result) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Book not found' }));
            }
        })();
    }
    else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Route not found' }));
    }
});

const getBooks = async () => {
    const booksPath = path.join(__dirname, 'data', 'books.json');
    const data = await fs.promises.readFile(booksPath, 'utf-8');
    return JSON.parse(data);
};

const addBook = async (book) => {
    const booksPath = path.join(__dirname, 'data', 'books.json');
    const data = await fs.promises.readFile(booksPath, 'utf-8');
    const books = JSON.parse(data);
    const newId = books.length > 0 ? books[books.length - 1].id + 1 : 1;
    book.id = newId;
    book.createdAt = new Date().toISOString();
    books.push(book);
    await fs.promises.writeFile(booksPath, JSON.stringify(books, null, 2));
    return book;
};

const updateBook = async (book) => {
    const booksPath = path.join(__dirname, 'data', 'books.json');
    const data = await fs.promises.readFile(booksPath, 'utf-8');
    const books = JSON.parse(data);
    const index = books.findIndex(b => b.id === book.id);
    if (index !== -1) {
        books[index] = { ...books[index], ...book };
        await fs.promises.writeFile(booksPath, JSON.stringify(books, null, 2));
        return books[index];
    }
    return null;
};

const deleteBook = async (id) => {
    const booksPath = path.join(__dirname, 'data', 'books.json');
    const data = await fs.promises.readFile(booksPath, 'utf-8');
    const books = JSON.parse(data);
    const index = books.findIndex(b => b.id === id);
    if (index !== -1) {
        const deletedBook = books.splice(index, 1)[0];
        await fs.promises.writeFile(booksPath, JSON.stringify(books, null, 2));
        return deletedBook;
    }
    return null;
};

const PORT = 3003;
server.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`📚 FAVORITE BOOKS MANAGER API`);
    console.log(`========================================`);
    console.log(`📍 Server: http://localhost:${PORT}`);
    console.log(`📁 API Base: http://localhost:${PORT}/api/books`);
    console.log(`========================================`);
    console.log(`🎯 Available Endpoints:`);
    console.log(`   GET    /api/books`);
    console.log(`   GET    /api/books/{id}`);
    console.log(`   POST   /api/books`);
    console.log(`   PUT    /api/books`);
    console.log(`   DELETE /api/books/{id}`);
    console.log(`========================================`);
});
