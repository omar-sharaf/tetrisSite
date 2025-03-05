document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('tetris');
    const ctx = canvas.getContext('2d');
    const nextPieceCanvas = document.createElement('canvas');
    nextPieceCanvas.width = 100;
    nextPieceCanvas.height = 100;
    document.getElementById('next-piece').appendChild(nextPieceCanvas);
    const nextPieceCtx = nextPieceCanvas.getContext('2d');
    
    // Hold piece canvas setup
    const holdPieceCanvas = document.createElement('canvas');
    holdPieceCanvas.width = 100;
    holdPieceCanvas.height = 100;
    document.getElementById('hold-piece').appendChild(holdPieceCanvas);
    const holdPieceCtx = holdPieceCanvas.getContext('2d');
    
    // Game variables
    const GRID_WIDTH = 10;
    const GRID_HEIGHT = 20;
    const BLOCK_SIZE = 24; // Adjusted block size to ensure full board is visible
    let score = 0;
    let lines = 0;
    let level = 1;
    let grid = createGrid();
    let gameLoop;
    let gameSpeed = 1000;
    let isPaused = false;
    let gameOver = true;
    let canHold = true;  // Track if player can hold a piece (once per piece)
    let holdPiece = null;  // Store the held piece
    
    // Adjust canvas size to match the grid
    canvas.width = GRID_WIDTH * BLOCK_SIZE;
    canvas.height = GRID_HEIGHT * BLOCK_SIZE;
    
    // Tetromino colors
    const colors = [
        null,
        '#FF0000', // I
        '#00FF00', // J
        '#0000FF', // L
        '#FFFF00', // O
        '#FF00FF', // S
        '#00FFFF', // T
        '#FFA500'  // Z
    ];
    
    // Tetromino shapes
    const pieces = [
        [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        [
            [2, 0, 0],
            [2, 2, 2],
            [0, 0, 0]
        ],
        [
            [0, 0, 3],
            [3, 3, 3],
            [0, 0, 0]
        ],
        [
            [4, 4],
            [4, 4]
        ],
        [
            [0, 5, 5],
            [5, 5, 0],
            [0, 0, 0]
        ],
        [
            [0, 6, 0],
            [6, 6, 6],
            [0, 0, 0]
        ],
        [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0]
        ]
    ];
    
    // Game state
    let currentPiece = null;
    let nextPiece = getRandomPiece();
    let currentX = 0;
    let currentY = 0;
    
    // Event listeners
    document.getElementById('start-button').addEventListener('click', startGame);
    
    // Prevent arrow keys scrolling the page only when game is active
    window.addEventListener('keydown', function(e) {
        // Prevent scrolling only if game is ongoing and not over/paused
        if (!gameOver && !isPaused && 
            (e.key === 'ArrowUp' || e.key === 'ArrowDown' || 
             e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
             e.key === ' ' || e.key === 'c' || e.key === 'C')) {
            e.preventDefault();
        }
    }, false);
    
    // Handle game controls
    document.addEventListener('keydown', handleKeyPress);
    
    // Function to create empty grid
    function createGrid() {
        return Array.from({ length: GRID_HEIGHT }, () => Array(GRID_WIDTH).fill(0));
    }
    
    // Function to get a random tetromino piece
    function getRandomPiece() {
        const pieceIndex = Math.floor(Math.random() * pieces.length);
        return {
            shape: JSON.parse(JSON.stringify(pieces[pieceIndex])), // Deep copy to avoid reference issues
            color: colors[pieceIndex + 1]
        };
    }
    
    // Function to draw a single block
    function drawBlock(x, y, color, context = ctx, blockSize = BLOCK_SIZE) {
        context.fillStyle = color;
        context.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
        context.strokeStyle = '#000';
        context.strokeRect(x * blockSize, y * blockSize, blockSize, blockSize);
    }
    
    // Function to draw the grid
    function drawGrid() {
        // First, clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background grid lines for visual reference
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 0.5;
        
        // Vertical lines
        for (let x = 0; x <= GRID_WIDTH; x++) {
            ctx.beginPath();
            ctx.moveTo(x * BLOCK_SIZE, 0);
            ctx.lineTo(x * BLOCK_SIZE, GRID_HEIGHT * BLOCK_SIZE);
            ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = 0; y <= GRID_HEIGHT; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * BLOCK_SIZE);
            ctx.lineTo(GRID_WIDTH * BLOCK_SIZE, y * BLOCK_SIZE);
            ctx.stroke();
        }
        
        // Draw the occupied cells
        grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(x, y, colors[value]);
                }
            });
        });
    }
    
    // Function to draw the current piece
    function drawPiece() {
        if (!currentPiece) return;
        
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(currentX + x, currentY + y, currentPiece.color);
                }
            });
        });
    }
    
    // Function to draw ghost piece (shadow where piece will land)
    function drawGhostPiece() {
        if (!currentPiece) return;
        
        let ghostY = currentY;
        
        // Find the position where the piece would land
        while (!checkCollision(0, 1, currentPiece, currentX, ghostY)) {
            ghostY++;
        }
        
        // Draw the ghost piece with a transparent color
        ctx.globalAlpha = 0.2;
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(currentX + x, ghostY + y, currentPiece.color);
                }
            });
        });
        ctx.globalAlpha = 1.0;
    }
    
    // Function to draw pieces in preview windows with proper centering
    function drawPreviewPiece(pieceObj, context, canvasWidth, canvasHeight) {
        if (!pieceObj) return;
        
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        context.fillStyle = '#111';
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        
        const blockSize = 20; // Smaller block size for the preview
        
        // Calculate proper centering for the piece
        const pieceWidth = pieceObj.shape[0].length * blockSize;
        const pieceHeight = pieceObj.shape.length * blockSize;
        const offsetX = (canvasWidth - pieceWidth) / 2;
        const offsetY = (canvasHeight - pieceHeight) / 2;
        
        pieceObj.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    context.fillStyle = pieceObj.color;
                    context.fillRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize, blockSize);
                    context.strokeStyle = '#000';
                    context.strokeRect(offsetX + x * blockSize, offsetY + y * blockSize, blockSize, blockSize);
                }
            });
        });
    }
    
    // Function to draw the next piece preview
    function drawNextPiece() {
        drawPreviewPiece(nextPiece, nextPieceCtx, nextPieceCanvas.width, nextPieceCanvas.height);
    }
    
    // Function to draw the hold piece
    function drawHoldPiece() {
        drawPreviewPiece(holdPiece, holdPieceCtx, holdPieceCanvas.width, holdPieceCanvas.height);
    }
    
    // Function to draw the game screen
    function draw() {
        drawGrid();
        drawGhostPiece();
        drawPiece();
        drawNextPiece();
        drawHoldPiece();
    }
    
    // Function to check if the current piece collides with the grid
    function checkCollision(offsetX = 0, offsetY = 0, pieceToCheck = currentPiece, posX = currentX, posY = currentY) {
        if (!pieceToCheck) return false;
        
        return pieceToCheck.shape.some((row, y) => {
            return row.some((value, x) => {
                if (value === 0) return false;
                
                const newX = posX + x + offsetX;
                const newY = posY + y + offsetY;
                
                return (
                    newX < 0 ||
                    newX >= GRID_WIDTH ||
                    newY >= GRID_HEIGHT ||
                    (newY >= 0 && grid[newY] && grid[newY][newX])
                );
            });
        });
    }
    
    // Function to merge the current piece with the grid
    function mergePiece() {
        if (!currentPiece) return;
        
        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    if (currentY + y >= 0 && currentY + y < GRID_HEIGHT && currentX + x >= 0 && currentX + x < GRID_WIDTH) {
                        const colorIndex = colors.indexOf(currentPiece.color);
                        grid[currentY + y][currentX + x] = colorIndex;
                    }
                }
            });
        });
    }
    
    // Function to rotate the current piece
    function rotatePiece() {
        if (!currentPiece) return;
        
        const rotated = [];
        for (let y = 0; y < currentPiece.shape[0].length; y++) {
            const newRow = [];
            for (let x = currentPiece.shape.length - 1; x >= 0; x--) {
                newRow.push(currentPiece.shape[x][y]);
            }
            rotated.push(newRow);
        }
        
        const oldShape = JSON.parse(JSON.stringify(currentPiece.shape)); // Deep copy for safety
        currentPiece.shape = rotated;
        
        // Check if the rotation causes a collision and rollback if necessary
        if (checkCollision()) {
            // Try wall kicks - first try moving left or right if the piece is at the edge
            if (currentX + currentPiece.shape[0].length > GRID_WIDTH) {
                // Too far right, try moving left
                const offset = currentX + currentPiece.shape[0].length - GRID_WIDTH;
                if (!checkCollision(-offset, 0)) {
                    currentX -= offset;
                } else {
                    currentPiece.shape = oldShape; // Revert if wall kick fails
                }
            } else if (currentX < 0) {
                // Too far left, try moving right
                if (!checkCollision(-currentX, 0)) {
                    currentX = 0;
                } else {
                    currentPiece.shape = oldShape; // Revert if wall kick fails
                }
            } else {
                currentPiece.shape = oldShape; // Revert if no wall kick is applicable
            }
        }
    }
    
    // Function to drop the current piece
    function dropPiece() {
        if (!currentPiece) return;
        
        if (!checkCollision(0, 1)) {
            currentY++;
        } else {
            // The piece hit something
            mergePiece();
            clearLines();
            spawnNewPiece();
            canHold = true; // Reset hold ability for new piece
        }
        
        draw();
    }
    
    // Function to instantly drop the piece to the bottom (hard drop)
    function hardDrop() {
        if (!currentPiece || gameOver) return;
        
        let dropDistance = 0;
        while (!checkCollision(0, 1 + dropDistance)) {
            dropDistance++;
        }
        
        currentY += dropDistance;
        score += dropDistance * 2; // Score for hard drop
        
        mergePiece();
        clearLines();
        spawnNewPiece();
        canHold = true; // Reset hold ability after new piece spawns
        updateScore();
        draw();
    }
    
    // Function to hold the current piece
    function holdCurrentPiece() {
        if (!currentPiece || !canHold || gameOver) return;
        
        // Get the piece type (index) for proper resetting
        const currentPieceIndex = colors.indexOf(currentPiece.color) - 1;
        
        if (holdPiece === null) {
            // First hold - store current piece and get next piece
            holdPiece = {
                shape: JSON.parse(JSON.stringify(pieces[currentPieceIndex])), // Reset to original orientation
                color: colors[currentPieceIndex + 1]
            };
            spawnNewPiece();
        } else {
            // Swap current piece with held piece
            const tempPiece = {
                shape: JSON.parse(JSON.stringify(pieces[currentPieceIndex])), // Reset to original orientation
                color: colors[currentPieceIndex + 1]
            };
            
            currentPiece = holdPiece;
            holdPiece = tempPiece;
            
            // Reset position for the swapped-in piece
            currentX = Math.floor((GRID_WIDTH - currentPiece.shape[0].length) / 2);
            currentY = 0;
            
            // Check for game over after swapping
            if (checkCollision()) {
                gameOver = true;
                clearInterval(gameLoop);
                setTimeout(() => {
                    drawGameOver();
                    alert('Game Over! Your score: ' + score);
                }, 100);
                return;
            }
        }
        
        canHold = false; // Prevent holding again until next piece
        draw();
    }
    
    // Function to move the current piece horizontally
    function movePiece(direction) {
        if (!currentPiece) return;
        
        if (!checkCollision(direction, 0)) {
            currentX += direction;
        }
        
        draw();
    }
    
    // Function to check and clear completed lines
    function clearLines() {
        let linesCleared = 0;
        
        outer: for (let y = GRID_HEIGHT - 1; y >= 0; y--) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                if (grid[y][x] === 0) {
                    continue outer;
                }
            }
            
            // Line is full, remove it
            grid.splice(y, 1);
            grid.unshift(Array(GRID_WIDTH).fill(0));
            linesCleared++;
            y++; // Check same line again after shifting
        }
        
        if (linesCleared > 0) {
            // Update score based on lines cleared
            let linePoints = 0;
            switch (linesCleared) {
                case 1: linePoints = 100; break;
                case 2: linePoints = 300; break;
                case 3: linePoints = 500; break;
                case 4: linePoints = 800; break; // Tetris!
            }
            
            score += linePoints * level;
            lines += linesCleared;
            
            // Update level
            level = Math.floor(lines / 10) + 1;
            gameSpeed = Math.max(100, 1000 - (level - 1) * 100);
            
            updateScore();
        }
    }
    
    // Function to spawn a new piece
    function spawnNewPiece() {
        currentPiece = nextPiece;
        nextPiece = getRandomPiece();
        currentX = Math.floor((GRID_WIDTH - currentPiece.shape[0].length) / 2);
        currentY = 0;
        
        // Check for game over - proper "topping out" detection
        // Game ends if the new piece collides immediately when spawned
        if (checkCollision()) {
            gameOver = true;
            clearInterval(gameLoop);
            setTimeout(() => {
                drawGameOver();
                alert('Game Over! Your score: ' + score);
            }, 100);
        }
    }
    
    // Draw game over state
    function drawGameOver() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 20);
    }
    
    // Function to update the score display
    function updateScore() {
        document.getElementById('score').textContent = score;
        document.getElementById('lines').textContent = lines;
        document.getElementById('level').textContent = level;
    }
    
    // Function to handle key presses
    function handleKeyPress(e) {
        if (gameOver || isPaused) return;
        
        switch (e.key) {
            case 'ArrowLeft':
                movePiece(-1);
                break;
            case 'ArrowRight':
                movePiece(1);
                break;
            case 'ArrowDown':
                dropPiece();
                score += 1; // Score for soft drop
                updateScore();
                break;
            case 'ArrowUp':
                rotatePiece();
                break;
            case ' ':
                hardDrop();
                break;
            case 'c':
            case 'C':
                holdCurrentPiece();
                break;
            case 'p':
            case 'P':
                togglePause();
                break;
        }
    }
    
    // Function to toggle pause
    function togglePause() {
        isPaused = !isPaused;
        
        if (isPaused) {
            clearInterval(gameLoop);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        } else {
            gameLoop = setInterval(() => {
                if (!isPaused && !gameOver) {
                    dropPiece();
                }
            }, gameSpeed);
        }
    }
    
    // Function to start the game
    function startGame() {
        // Reset game state
        grid = createGrid();
        score = 0;
        lines = 0;
        level = 1;
        gameSpeed = 1000;
        isPaused = false;
        gameOver = false;
        canHold = true;
        holdPiece = null;
        
        updateScore();
        
        if (gameLoop) {
            clearInterval(gameLoop);
        }
        
        nextPiece = getRandomPiece();
        spawnNewPiece();
        draw();
        
        gameLoop = setInterval(() => {
            if (!isPaused && !gameOver) {
                dropPiece();
            }
        }, gameSpeed);
    }
    
    // Initialize the game board
    draw();
});