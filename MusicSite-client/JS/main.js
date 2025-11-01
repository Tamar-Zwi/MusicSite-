

// יצירת אלמנט אודיו גלובלי
const audioPlayer = new Audio();
let currentSongId = null;
let currentSongData = null;
let currentFilter = { type: 'all', id: null, name: '' }; // מעקב אחרי הפילטר הנוכחי

// אתחול בטעינת הדף
document.addEventListener('DOMContentLoaded', () => {
    checkUserStatus();
    loadSongs();
    setupSearchInput();
    restoreSong();
});

// // הגדרת אירוע חיפוש עם מקש Enter
function setupSearchInput() {
    const searchInput = document.getElementById('mainSearchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchSongs();
            }
        });
    }
}

// בדיקת סטטוס משתמש
function checkUserStatus() {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        const user = JSON.parse(userData);
        showLoggedInNav(user.name || 'משתמש');
    } else {
        showGuestNav();
    }
}

// הצגת ניווט למשתמש מחובר
function showLoggedInNav(userName) {
    document.getElementById('guestNav').style.display = 'none';
    document.getElementById('userNav').style.display = 'flex';
    document.getElementById('welcomeMessage').textContent = `שלום, ${userName}`;
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
    
    document.getElementById('profileBtn').addEventListener('click', (e) => {
        e.preventDefault();
        goToProfile();
    });
}

// הצגת ניווט למשתמש לא מחובר
function showGuestNav() {
    document.getElementById('guestNav').style.display = 'flex';
    document.getElementById('userNav').style.display = 'none';
}

// התנתקות
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('currentSong');
    window.location.href = 'main.html';
}

// מעבר לאזור האישי
function goToProfile() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData.role === 'singer') {
        window.location.href = './HTML/singer-home.html';
    } else if (userData.role === 'admin') {
        window.location.href = './HTML/admin-home.html';
    } else {
        window.location.href = './HTML/profile.html';
    }
}

// טעינת שירים
async function loadSongs(sortBy = 'creationDate', search = '') {
    try {
        const token = localStorage.getItem('authToken');
        const isLoggedIn = !!token;
        const baseUrl = 'http://localhost:3000';
        
        let url = `${baseUrl}/api/songs?sortBy=${sortBy}&order=desc`;
        
        // פילטר לפי קטגוריה
        if (currentFilter.type === 'category' && currentFilter.id) {
            url += `&categoryId=${currentFilter.id}`;
        }
        // פילטר לפי זמר
        if (currentFilter.type === 'singer' && currentFilter.id) {
            url += `&singerId=${currentFilter.id}`;
        }
        // חיפוש
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        
        if (!isLoggedIn) url += '&limit=4';

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token || ''}` }
        });
        if (!response.ok) throw new Error('תקלה בטעינת השירים');

        const songs = await response.json();
        const songsGrid = document.getElementById('songsGrid');
        songsGrid.innerHTML = '';

        if (songs.length === 0) {
            songsGrid.innerHTML = '<p style="text-align: center; color: var(--text-color); padding: 40px;">אין שירים מתאימים.</p>';
            return;
        }

        songs.forEach(song => {
            const songCard = createSongCard(song, baseUrl);
            songsGrid.appendChild(songCard);
        });

        updatePageTitle();

        const teaserMessage = document.getElementById('teaserMessage');
        const sortOptions = document.querySelector('.sort-options');
        if (!isLoggedIn) {
            teaserMessage.style.display = 'block';
            sortOptions.style.display = 'none';
        } else {
            teaserMessage.style.display = 'none';
            sortOptions.style.display = 'flex';
            document.getElementById('recommendationsSection').style.display = 'block';
            loadRecommendations();
        }
    } catch (err) {
        console.error('שגיאה בטעינת השירים:', err);
        document.getElementById('songsGrid').innerHTML = `<p style="text-align: center; color: var(--text-color);">שגיאה: ${err.message}</p>`;
    }
}

// עדכון כותרת העמוד
function updatePageTitle() {
    const titleElement = document.getElementById('pageTitle');
    if (currentFilter.type === 'category') {
        titleElement.textContent = `קטגוריה: ${currentFilter.name}`;
    } else if (currentFilter.type === 'singer') {
        titleElement.textContent = `זמר: ${currentFilter.name}`;
    } else {
        titleElement.textContent = 'כל השירים';
    }
}


// מיון שירים
async function sortSongs(sortBy) {
    if (sortBy === 'idSinger') {
        await openSingerModal();
    } else if (sortBy === 'categoryId') {
        await openCategoryModal();
    } else if (sortBy === 'all') {
        currentFilter = { type: 'all', id: null, name: '' };
        document.getElementById('mainSearchInput').value = '';
        loadSongs('creationDate', '');
    } else {
        loadSongs(sortBy, document.getElementById('mainSearchInput').value);
    }
}

// ====== קטגוריות ======
async function openCategoryModal() {
    try {
        const baseUrl = 'http://localhost:3000';
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${baseUrl}/api/categories`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('שגיאה בטעינת קטגוריות');
        
        const categories = await response.json();
        const categoriesList = document.getElementById('categoriesList');
        categoriesList.innerHTML = '';
        
        categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'selection-item';
            item.textContent = category.name;
            item.onclick = () => selectCategory(category._id, category.name);
            categoriesList.appendChild(item);
        });
        
        document.getElementById('categoryModal').style.display = 'flex';
    } catch (err) {
        alert('שגיאה בטעינת רשימת הקטגוריות: ' + err.message);
    }
}

function closeCategoryModal() {
    document.getElementById('categoryModal').style.display = 'none';
}

function selectCategory(categoryId, categoryName) {
    currentFilter = { type: 'category', id: categoryId, name: categoryName };
    document.getElementById('mainSearchInput').value = '';
    closeCategoryModal();
    loadSongs('creationDate', '');
}

// ====== זמרים ======
async function openSingerModal() {
    try {
        const baseUrl = 'http://localhost:3000';
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${baseUrl}/api/users?role=singer`, {
            method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });
        
        if (!response.ok) throw new Error('שגיאה בטעינת זמרים');
        
        const singers = await response.json();
        const singersList = document.getElementById('singersList');
        singersList.innerHTML = '';
        
        singers.forEach(singer => {
            const item = document.createElement('div');
            item.className = 'selection-item';
            item.textContent = singer.name;
            item.onclick = () => selectSinger(singer._id, singer.name);
            singersList.appendChild(item);
        });
        
        document.getElementById('singerModal').style.display = 'flex';
    } catch (err) {
        alert('שגיאה בטעינת רשימת הזמרים: ' + err.message);
    }
}

function closeSingerModal() {
    document.getElementById('singerModal').style.display = 'none';
}

function selectSinger(singerId, singerName) {
    currentFilter = { type: 'singer', id: singerId, name: singerName };
    document.getElementById('mainSearchInput').value = '';
    closeSingerModal();
    loadSongs('creationDate', '');
}

// חיפוש
function searchSongs() {
    const searchTerm = document.getElementById('mainSearchInput').value.trim();
    if (!searchTerm) {
        alert('אנא הכנס מילת חיפוש');
        return;
    }
    loadSongs('creationDate', searchTerm);
}

// המלצות
async function loadRecommendations() {
    try {
        const token = localStorage.getItem('authToken');
        const baseUrl = 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/songs/recommendations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const recs = await response.json();
        const grid = document.getElementById('recommendationsGrid');
        grid.innerHTML = '';
        recs.forEach(song => {
            const card = createSongCard(song, baseUrl);
            grid.appendChild(card);
        });
    } catch (err) {
        console.error(err);
    }
}

// כרטיס שיר
function createSongCard(song, baseUrl) {
    const card = document.createElement('div');
    card.classList.add('song-card');
    card.innerHTML = `
        <div class="song-image-container">
            <img src="${baseUrl}${song.urlImg}" alt="${song.name}" class="song-image">
            <div class="play-overlay">
                <i class="fas fa-play"></i>
            </div>
        </div>
        <h3>${song.name}</h3>
        <p class="song-artist">${song.idSinger?.name || 'זמר לא ידוע'}</p>
        <p class="downloads">הורדות: ${song.DownloadCount}</p>
        <button onclick="downloadSong('${song._id}')">הורד</button>
        <button onclick="addFavorite('${song._id}', 'song')"><i class="fas fa-heart"></i></button>
    `;
    
    card.querySelector('.song-image-container').addEventListener('click', () => {
        playAudio(song._id, `${baseUrl}${song.urlSong}`, song.name, song.idSinger.name, `${baseUrl}${song.urlImg}`);
    });
    return card;
}

// // ניגון שיר
function playAudio(songId, audioSrc, songName, artist, imgSrc) {
    if (currentSongId === songId) {
        if (audioPlayer.paused) {
            audioPlayer.play();
        } else {
            audioPlayer.pause();
        }
    } else {
        audioPlayer.src = audioSrc;
        audioPlayer.play();
        currentSongId = songId;
        localStorage.setItem('currentSong', JSON.stringify({ id: songId, src: audioSrc, name: songName, artist: artist, img: imgSrc }));
    }
    currentSongData = { name: songName, artist, img: imgSrc };
    updatePlayerBar();
    showGlobalPlayerBar();
}

// // שחזור שיר שמור
function restoreSong() {
    const savedSong = JSON.parse(localStorage.getItem('currentSong'));
    if (savedSong) {
        playAudio(savedSong.id, savedSong.src, savedSong.name, savedSong.artist, savedSong.img);
    }
}

// // הורדת שיר
async function downloadSong(songId) {
    try {
        const baseUrl = 'http://localhost:3000';
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${baseUrl}/api/songs/${songId}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('שגיאה בהורדה');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `song-${songId}.mp3`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        loadSongs();
    } catch (err) {
        alert('שגיאה בהורדת השיר: ' + err.message);
    }
}

// player bar
function updatePlayerBar() {
    document.getElementById('playerTitle').textContent = currentSongData.name;
    document.getElementById('playerArtist').textContent = currentSongData.artist;
    document.getElementById('playerImg').src = currentSongData.img;
    document.getElementById('playPauseBtn').innerHTML = audioPlayer.paused ? '<i class="fas fa-play"></i>' : '<i class="fas fa-pause"></i>';
    document.getElementById('seekBar').max = audioPlayer.duration || 0;
    document.getElementById('seekBar').value = audioPlayer.currentTime;
}

function showGlobalPlayerBar() {
    document.getElementById('globalPlayerBar').style.display = 'flex';
}

audioPlayer.addEventListener('timeupdate', () => {
    document.getElementById('seekBar').value = audioPlayer.currentTime;
});

document.getElementById('seekBar').addEventListener('input', (e) => {
    audioPlayer.currentTime = e.target.value;
});

document.getElementById('playPauseBtn').addEventListener('click', () => {
    if (audioPlayer.paused) audioPlayer.play();
    else audioPlayer.pause();
    updatePlayerBar();
});

async function addFavorite(itemId, type) {
    alert(`נוסף למועדפים: ${type} ${itemId}`);
}

function showSongEndToast() {
    document.getElementById('songEndToast').style.display = 'block';
}

function replaySong() {
    audioPlayer.currentTime = 0;
    audioPlayer.play();
    document.getElementById('songEndToast').style.display = 'none';
}

function hidePlayerBar() {
    document.getElementById('globalPlayerBar').style.display = 'none';
    audioPlayer.pause();
    currentSongId = null;
    localStorage.removeItem('currentSong');
    document.getElementById('songEndToast').style.display = 'none';
}

audioPlayer.onended = () => {
    showSongEndToast();
};