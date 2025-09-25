const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextEggCanvas = document.getElementById('nextEggCanvas');
const nextEggCtx = nextEggCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const restartButton = document.getElementById('restartButton');
const gameOverMessage = document.getElementById('gameOverMessage');

// Cấu hình game đã được điều chỉnh
const rows = 15;
const cols = 40;
const initialRows = 3;
const eggRadius = 20;
const eggDiameter = eggRadius * 2;
canvas.width = cols * eggDiameter;
canvas.height = rows * eggDiameter;
const colors = ['#ff4500', '#32cd32', '#1e90ff', '#ffd700', '#9932cc', '#FFC0CB', '#33FFFF'];
const shootingSpeed = 15;
const maxMisses = 2;
const nextRowDelay = 1000;

// Biến trạng thái
let score = 0;
let missedShots = 0;
let isShooting = false;
let isGameOver = false;
let isWaiting = false;

// Bàn chơi dạng lưới và trứng
const grid = [];
let shooterEgg;
let nextEgg;

// Lớp Egg
class Egg {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = eggRadius;
        this.vx = 0;
        this.vy = 0;
    }

    draw(context) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = this.color;
        context.fill();
        context.closePath();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
}

// Hàm khởi tạo game
function initializeGame() {
    canvas.width = cols * eggDiameter;
    canvas.height = rows * eggDiameter;
    createGrid();
    createShooterEggs();
    gameLoop();
}

// Khởi tạo bàn chơi
function createGrid() {
    for (let i = 0; i < rows; i++) {
        grid[i] = [];
        for (let j = 0; j < cols; j++) {
            grid[i][j] = null;
        }
    }
    for (let i = 0; i < initialRows; i++) {
        for (let j = 0; j < cols; j++) {
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            grid[i][j] = new Egg(j * eggDiameter + eggRadius, i * eggDiameter + eggRadius, randomColor);
        }
    }
}

// Tạo trứng để bắn
function createShooterEggs() {
    shooterEgg = new Egg(canvas.width / 2, canvas.height - eggRadius, colors[Math.floor(Math.random() * colors.length)]);
    nextEgg = new Egg(nextEggCanvas.width / 2, nextEggCanvas.height / 2, colors[Math.floor(Math.random() * colors.length)]);
}

// Vẽ toàn bộ trứng trên lưới
function drawGrid() {
    grid.forEach(row => {
        row.forEach(egg => {
            if (egg) {
                egg.draw(ctx);
            }
        });
    });
}

// Kiểm tra va chạm và gắn trứng vào lưới
function checkCollision() {
    if (shooterEgg.x - eggRadius < 0 || shooterEgg.x + eggRadius > canvas.width) {
        shooterEgg.vx *= -1;
    }
    if (shooterEgg.y - eggRadius < 0) {
        stickToGrid(shooterEgg.x, 0, shooterEgg.color);
        return true;
    }
    
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const targetEgg = grid[i][j];
            if (targetEgg) {
                const distance = Math.sqrt(
                    (shooterEgg.x - targetEgg.x) ** 2 +
                    (shooterEgg.y - targetEgg.y) ** 2
                );
                if (distance < eggDiameter) {
                    stickToGrid(shooterEgg.x, shooterEgg.y, shooterEgg.color);
                    return true;
                }
            }
        }
    }
    return false;
}

// FIX: Gắn trứng vào vị trí lưới gần nhất
function stickToGrid(x, y, color) {
    let bestRow = -1;
    let bestCol = -1;
    let minDistance = Infinity;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const gridX = c * eggDiameter + eggRadius;
            const gridY = r * eggDiameter + eggRadius;
            const distance = Math.sqrt((x - gridX) ** 2 + (y - gridY) ** 2);

            if (distance < minDistance && grid[r][c] === null) {
                minDistance = distance;
                bestRow = r;
                bestCol = c;
            }
        }
    }

    if (bestRow !== -1 && bestCol !== -1) {
        grid[bestRow][bestCol] = new Egg(bestCol * eggDiameter + eggRadius, bestRow * eggDiameter + eggRadius, color);
        checkMatches(bestRow, bestCol);
    } else {
        // Xử lý trường hợp không tìm thấy vị trí trống (ví dụ: Game Over)
        isGameOver = true;
    }
}

// Thuật toán tìm kiếm nhóm trứng cùng màu (BFS)
function checkMatches(row, col) {
    const egg = grid[row][col];
    const queue = [{r: row, c: col}];
    const visited = new Set();
    const matches = [];

    while (queue.length > 0) {
        const current = queue.shift();
        const {r, c} = current;
        const key = `${r}-${c}`;

        if (visited.has(key) || r < 0 || r >= rows || c < 0 || c >= cols || !grid[r][c] || grid[r][c].color !== egg.color) {
            continue;
        }

        visited.add(key);
        matches.push(grid[r][c]);

        queue.push({r: r + 1, c: c});
        queue.push({r: r - 1, c: c});
        queue.push({r: r, c: c + 1});
        queue.push({r: r, c: c - 1});
    }

    if (matches.length >= 3) {
        matches.forEach(m => {
            const r = Math.floor(m.y / eggDiameter);
            const c = Math.floor(m.x / eggDiameter);
            grid[r][c] = null;
            score += 10;
        });
        scoreElement.textContent = score;
        missedShots = 0;
        checkFloatingEggs();
    } else {
        missedShots++;
    }
}

// Hàm mới: Tự động kiểm tra và xóa các nhóm bóng
function autoCheckMatches() {
    let matchesFound = false;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
                const egg = grid[r][c];
                const queue = [{r: r, c: c}];
                const visited = new Set();
                const matches = [];

                while (queue.length > 0) {
                    const current = queue.shift();
                    const {r: curr_r, c: curr_c} = current;
                    const key = `${curr_r}-${curr_c}`;

                    if (visited.has(key) || curr_r < 0 || curr_r >= rows || curr_c < 0 || curr_c >= cols || !grid[curr_r][curr_c] || grid[curr_r][curr_c].color !== egg.color) {
                        continue;
                    }

                    visited.add(key);
                    matches.push({r: curr_r, c: curr_c});

                    queue.push({r: curr_r + 1, c: curr_c});
                    queue.push({r: curr_r - 1, c: curr_c});
                    queue.push({r: curr_r, c: curr_c + 1});
                    queue.push({r: curr_r, c: curr_c - 1});
                }

                if (matches.length >= 3) {
                    matches.forEach(m => {
                        grid[m.r][m.c] = null;
                        score += 10;
                    });
                    matchesFound = true;
                }
            }
        }
    }
    if (matchesFound) {
        scoreElement.textContent = score;
        checkFloatingEggs();
    }
}

// Kiểm tra và làm rơi trứng không liên kết
function checkFloatingEggs() {
    const connected = new Set();
    const queue = [];
    
    for (let c = 0; c < cols; c++) {
        if (grid[0][c]) {
            queue.push({r: 0, c: c});
            connected.add(`0-${c}`);
        }
    }

    while (queue.length > 0) {
        const {r, c} = queue.shift();
        const neighbors = [{r: r + 1, c: c}, {r: r - 1, c: c}, {r: r, c: c + 1}, {r: r, c: c - 1}];
        
        neighbors.forEach(n => {
            const key = `${n.r}-${n.c}`;
            if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols && grid[n.r][n.c] && !connected.has(key)) {
                connected.add(key);
                queue.push(n);
            }
        });
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] && !connected.has(`${r}-${c}`)) {
                grid[r][c] = null;
                score += 5;
            }
        }
    }
    scoreElement.textContent = score;
}

// Thêm hàng trứng mới
function addRow() {
    for (let r = rows - 2; r >= 0; r--) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c]) {
                grid[r+1][c] = grid[r][c];
                grid[r+1][c].y += eggDiameter;
                if (grid[r+1][c].y >= canvas.height - eggDiameter) {
                    isGameOver = true;
                }
            }
            grid[r][c] = null;
        }
    }
    for (let j = 0; j < cols; j++) {
        const randomColor = colors[Math.floor(Math.random() * colors.length)];
        grid[0][j] = new Egg(j * eggDiameter + eggRadius, eggRadius, randomColor);
    }
}

// Vòng lặp chính của game
function gameLoop() {
    if (isGameOver) {
        gameOverMessage.style.display = 'flex';
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nextEggCtx.clearRect(0, 0, 40, 40);

    drawGrid();
    nextEgg.draw(nextEggCtx);

    if (shooterEgg) {
        shooterEgg.update();
        if (shooterEgg.vx !== 0 || shooterEgg.vy !== 0) {
            isShooting = true;
        } else {
            isShooting = false;
        }
        shooterEgg.draw(ctx);
        
        if (checkCollision()) {
            isShooting = false;
            if (missedShots >= maxMisses && !isWaiting) {
                isWaiting = true;
                setTimeout(() => {
                    addRow();
                    missedShots = 0;
                    isWaiting = false;
                }, nextRowDelay);
            }
            shooterEgg = null;
            createShooterEggs();
        }
    } else {
        createShooterEggs();
    }
    
    autoCheckMatches();

    requestAnimationFrame(gameLoop);
}

// Xử lý ngắm bắn và kéo chuột
let isDragging = false;
let startPos = {x: 0, y: 0};

canvas.addEventListener('mousedown', (e) => {
    if (!isShooting && !isWaiting) {
        isDragging = true;
        startPos.x = e.offsetX;
        startPos.y = e.offsetY;
        canvas.classList.add('aiming');
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const dx = e.offsetX - startPos.x;
        const dy = e.offsetY - startPos.y;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        shooterEgg.draw(ctx);
        
        ctx.beginPath();
        ctx.moveTo(shooterEgg.x, shooterEgg.y);
        ctx.lineTo(shooterEgg.x - dx, shooterEgg.y - dy);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (isDragging) {
        isDragging = false;
        canvas.classList.remove('aiming');
        
        const endPos = {x: e.offsetX, y: e.offsetY};
        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;

        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        if (magnitude > 10) { 
            isShooting = true;
            shooterEgg.vx = -(dx / magnitude) * shootingSpeed;
            shooterEgg.vy = -(dy / magnitude) * shootingSpeed;
        }
    }
});

// Hàm để khởi động lại trò chơi
function restartGame() {
    score = 0;
    missedShots = 0;
    isShooting = false;
    isGameOver = false;
    isWaiting = false;
    scoreElement.textContent = score;

    gameOverMessage.style.display = 'none';
    canvas.style.display = 'block';

    grid.length = 0;
    initializeGame();
}

// Lắng nghe sự kiện click vào nút chơi lại
restartButton.addEventListener('click', () => {
    restartGame();
});

// Khởi động trò chơi lần đầu
initializeGame();