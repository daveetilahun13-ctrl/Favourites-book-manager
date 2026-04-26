const API_URL = '/api/books';
let allBooks = [];
let currentFilter = 'all';
let currentSearch = '';

window.onload = () => {
    loadBooks();
    setupStarRatings();
    document.getElementById('addBookForm').addEventListener('submit', addBook);
    document.getElementById('editBookForm').addEventListener('submit', updateBook);
    document.getElementById('searchInput').addEventListener('keyup', handleSearch);
};

async function loadBooks() {
    try {
        const response = await fetch(API_URL);
        allBooks = await response.json();
        applyFiltersAndSearch();
    } catch (error) {
        console.error('Error loading books', error);
    }
}

function applyFiltersAndSearch() {
    let filtered = [...allBooks];
    
    if (currentFilter === 'favorite') {
        filtered = filtered.filter(book => book.favorite === true);
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter(book => book.status === currentFilter);
    }
    
    if (currentSearch) {
        filtered = filtered.filter(book => 
            book.title.toLowerCase().includes(currentSearch) ||
            book.author.toLowerCase().includes(currentSearch)
        );
    }
    
    displayBooks(filtered);
    updateStats();
}

function handleSearch(e) {
    currentSearch = e.target.value.toLowerCase();
    applyFiltersAndSearch();
}

function filterBooks(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    applyFiltersAndSearch();
}

function displayBooks(books) {
    const container = document.getElementById('booksGrid');
    if (!books || books.length === 0) {
        container.innerHTML = '<div class="loading"><i class="fas fa-book"></i><p>No books found. Add your first book!</p></div>';
        return;
    }
    
    container.innerHTML = books.map(book => `
        <div class="book-card ${book.favorite ? 'favorite' : ''}">
            <div class="book-cover">
                <i class="fas fa-book"></i>
                ${book.favorite ? '<div class="favorite-badge"><i class="fas fa-heart"></i></div>' : ''}
            </div>
            <div class="book-info">
                <h3 class="book-title">${escapeHtml(book.title)}</h3>
                <p class="book-author">by ${escapeHtml(book.author)}</p>
                <div class="book-meta">
                    <span>${book.genre || 'Uncategorized'}</span>
                    <span>${book.year || 'N/A'}</span>
                </div>
                <div class="book-rating">
                    ${getStarRating(book.rating)}
                </div>
                <span class="book-status status-${getStatusClass(book.status)}">
                    ${getStatusText(book.status)}
                </span>
                ${book.status === 'reading' ? `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${book.progress || 0}%"></div>
                    </div>
                    <small>${book.progress || 0}% complete</small>
                ` : ''}
                ${book.review ? `<p class="book-review">"${escapeHtml(book.review)}"</p>` : ''}
                <div class="book-actions">
                    <button class="btn-edit" onclick="openEditModal(${book.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteBook(${book.id})">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function getStarRating(rating) {
    rating = rating || 0;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star star filled"></i>';
        } else {
            stars += '<i class="far fa-star star"></i>';
        }
    }
    return stars;
}

function getStatusClass(status) {
    if (status === 'read') return 'read';
    if (status === 'reading') return 'reading';
    return 'want';
}

function getStatusText(status) {
    if (status === 'read') return '📖 Read';
    if (status === 'reading') return '📚 Currently Reading';
    return '📝 Want to Read';
}

function updateStats() {
    const total = allBooks.length;
    const read = allBooks.filter(b => b.status === 'read').length;
    const booksWithRating = allBooks.filter(b => b.rating > 0);
    const avgRating = booksWithRating.length > 0 
        ? (booksWithRating.reduce((sum, b) => sum + b.rating, 0) / booksWithRating.length).toFixed(1)
        : 0;
    const favorites = allBooks.filter(b => b.favorite === true).length;
    
    document.getElementById('totalBooks').textContent = total;
    document.getElementById('readBooks').textContent = read;
    document.getElementById('avgRating').textContent = avgRating;
    document.getElementById('favoriteCount').textContent = favorites;
}

function setupStarRatings() {
    setupStarRating('addRatingStars', 'bookRating');
    setupStarRating('editRatingStars', 'editBookRating');
}

function setupStarRating(containerId, inputId) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    if (!container) return;
    
    const stars = container.querySelectorAll('i');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            input.value = rating;
            stars.forEach(s => {
                const starRating = parseInt(s.dataset.rating);
                if (starRating <= rating) {
                    s.classList.remove('far');
                    s.classList.add('fas', 'filled');
                } else {
                    s.classList.remove('fas', 'filled');
                    s.classList.add('far');
                }
            });
        });
    });
}

async function addBook(e) {
    e.preventDefault();
    
    const book = {
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        genre: document.getElementById('bookGenre').value,
        year: parseInt(document.getElementById('bookYear').value) || null,
        status: document.getElementById('bookStatus').value,
        progress: parseInt(document.getElementById('bookProgress').value) || 0,
        rating: parseInt(document.getElementById('bookRating').value) || 0,
        review: document.getElementById('bookReview').value,
        favorite: document.getElementById('bookFavorite').checked
    };
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(book)
        });
        
        if (response.ok) {
            showToast(`📚 "${book.title}" added to your library!`);
            closeAddModal();
            document.getElementById('addBookForm').reset();
            document.getElementById('bookRating').value = 0;
            resetStars('addRatingStars');
            loadBooks();
        }
    } catch (error) {
        showToast('Error adding book', 'error');
    }
}

async function openEditModal(bookId) {
    try {
        const response = await fetch(`${API_URL}/${bookId}`);
        const book = await response.json();
        
        document.getElementById('editBookId').value = book.id;
        document.getElementById('editBookTitle').value = book.title;
        document.getElementById('editBookAuthor').value = book.author;
        
        const genreSelect = document.getElementById('editBookGenre');
        genreSelect.innerHTML = `
            <option value="Classic">Classic</option>
            <option value="Fiction">Fiction</option>
            <option value="Non-Fiction">Non-Fiction</option>
            <option value="Science Fiction">Science Fiction</option>
            <option value="Fantasy">Fantasy</option>
            <option value="Mystery">Mystery</option>
            <option value="Romance">Romance</option>
            <option value="Self-Help">Self-Help</option>
            <option value="Memoir">Memoir</option>
            <option value="History">History</option>
        `;
        genreSelect.value = book.genre || 'Fiction';
        
        document.getElementById('editBookYear').value = book.year || '';
        document.getElementById('editBookStatus').value = book.status || 'want-to-read';
        document.getElementById('editBookProgress').value = book.progress || 0;
        document.getElementById('editBookReview').value = book.review || '';
        document.getElementById('editBookFavorite').checked = book.favorite || false;
        
        document.getElementById('editBookRating').value = book.rating || 0;
        updateStarsDisplay('editRatingStars', book.rating || 0);
        
        document.getElementById('editModal').style.display = 'flex';
    } catch (error) {
        showToast('Error loading book', 'error');
    }
}

function updateStarsDisplay(containerId, rating) {
    const container = document.getElementById(containerId);
    const stars = container.querySelectorAll('i');
    stars.forEach(star => {
        const starRating = parseInt(star.dataset.rating);
        if (starRating <= rating) {
            star.classList.remove('far');
            star.classList.add('fas', 'filled');
        } else {
            star.classList.remove('fas', 'filled');
            star.classList.add('far');
        }
    });
}

function resetStars(containerId) {
    const container = document.getElementById(containerId);
    const stars = container.querySelectorAll('i');
    stars.forEach(star => {
        star.classList.remove('fas', 'filled');
        star.classList.add('far');
    });
}

async function updateBook(e) {
    e.preventDefault();
    
    const bookId = parseInt(document.getElementById('editBookId').value);
    const updatedBook = {
        id: bookId,
        title: document.getElementById('editBookTitle').value,
        author: document.getElementById('editBookAuthor').value,
        genre: document.getElementById('editBookGenre').value,
        year: parseInt(document.getElementById('editBookYear').value) || null,
        status: document.getElementById('editBookStatus').value,
        progress: parseInt(document.getElementById('editBookProgress').value) || 0,
        rating: parseInt(document.getElementById('editBookRating').value) || 0,
        review: document.getElementById('editBookReview').value,
        favorite: document.getElementById('editBookFavorite').checked
    };
    
    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedBook)
        });
        
        if (response.ok) {
            showToast(`📖 "${updatedBook.title}" updated!`);
            closeEditModal();
            loadBooks();
        }
    } catch (error) {
        showToast('Error updating book', 'error');
    }
}

async function deleteBook(bookId) {
    const book = allBooks.find(b => b.id === bookId);
    if (confirm(`Remove "${book?.title}" from your library?`)) {
        try {
            const response = await fetch(`${API_URL}/${bookId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                showToast(`🗑️ "${book?.title}" removed`);
                loadBooks();
            }
        } catch (error) {
            showToast('Error deleting book', 'error');
        }
    }
}

async function deleteBookFromModal() {
    const bookId = parseInt(document.getElementById('editBookId').value);
    closeEditModal();
    await deleteBook(bookId);
}

function openAddModal() {
    document.getElementById('addModal').style.display = 'flex';
}

function closeAddModal() {
    document.getElementById('addModal').style.display = 'none';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

window.onclick = (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
};
