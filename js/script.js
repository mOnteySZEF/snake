var SNAKE = SNAKE || {};
window.SNAKE = SNAKE;

SNAKE.addEventListener = (function() {
    if (window.addEventListener) {
        return function(obj, event, funct, evtCapturing) {
            obj.addEventListener(event, funct, evtCapturing);
        };
    } else if (window.attachEvent) {
        return function(obj, event, funct) {
            obj.attachEvent("on" + event, funct);
        };
    }
})();

SNAKE.removeEventListener = (function() {
    if (window.removeEventListener) {
        return function(obj, event, funct, evtCapturing) {
            obj.removeEventListener(event, funct, evtCapturing);
        };
    } else if (window.detachEvent) {
        return function(obj, event, funct) {
            obj.detachEvent("on" + event, funct);
        };
    }
})();

SNAKE.Snake = SNAKE.Snake || (function() {
    var instanceNumber = 0;
    var blockPool = [];

    var SnakeBlock = function() {
        this.elm = null;
        this.elmStyle = null;
        this.row = -1;
        this.col = -1;
        this.xPos = -1000;
        this.yPos = -1000;
        this.next = null;
        this.prev = null;
    };

    function getNextHighestZIndex(myObj) {
        var highestIndex = 0,
            currentIndex = 0,
            ii;
        for (ii in myObj) {
            if (myObj[ii].elm.currentStyle){
                currentIndex = parseFloat(myObj[ii].elm.style["z-index"],10);
            }else if(window.getComputedStyle) {
                currentIndex = parseFloat(document.defaultView.getComputedStyle(myObj[ii].elm,null).getPropertyValue("z-index"),10);
            }
            if(!isNaN(currentIndex) && currentIndex > highestIndex){
                highestIndex = currentIndex;
            }
        }
        return(highestIndex+1);
    }

    return function(config) {
        if (!config||!config.playingBoard) {return;}
        if (localStorage.jsSnakeHighScore === undefined) localStorage.setItem('jsSnakeHighScore', 0);

        var me = this,
            playingBoard = config.playingBoard,
            myId = instanceNumber++,
            growthIncr = 5,
            lastMove = 1,
            preMove = -1,
            isFirstMove = true,
            isFirstGameMove = true,
            currentDirection = -1,
            columnShift = [0, 1, 0, -1],
            rowShift = [-1, 0, 1, 0],
            xPosShift = [],
            yPosShift = [],
            snakeSpeed = 80,
            isDead = false,
            isPaused = false;

        function setModeListener (mode, speed) {
            document.getElementById(mode).addEventListener('click', function () { snakeSpeed = speed; });
        }

        var modeDropdown = document.getElementById('selectMode');
        if ( modeDropdown ) {
            modeDropdown.addEventListener('change', function(evt) {
                evt = evt || {};
                var val = evt.target ? parseInt(evt.target.value) : 75;
                if (isNaN(val)) {
                    val = 75;
                } else if (val < 25) {
                    val = 75;
                }
                snakeSpeed = val;
                setTimeout(function() {
                    document.getElementById('game-area').focus();
                }, 10);
            });
        }

        me.snakeBody = {};
        me.snakeBody["b0"] = new SnakeBlock();
        me.snakeBody["b0"].row = config.startRow || 1;
        me.snakeBody["b0"].col = config.startCol || 1;
        me.snakeBody["b0"].xPos = me.snakeBody["b0"].row * playingBoard.getBlockWidth();
        me.snakeBody["b0"].yPos = me.snakeBody["b0"].col * playingBoard.getBlockHeight();
        me.snakeBody["b0"].elm = createSnakeElement();
        me.snakeBody["b0"].elmStyle = me.snakeBody["b0"].elm.style;
        playingBoard.getBoardContainer().appendChild( me.snakeBody["b0"].elm );
        me.snakeBody["b0"].elm.style.left = me.snakeBody["b0"].xPos + "px";
        me.snakeBody["b0"].elm.style.top = me.snakeBody["b0"].yPos + "px";
        me.snakeBody["b0"].next = me.snakeBody["b0"];
        me.snakeBody["b0"].prev = me.snakeBody["b0"];

        me.snakeLength = 1;
        me.snakeHead = me.snakeBody["b0"];
        me.snakeTail = me.snakeBody["b0"];
        me.snakeHead.elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'');
        me.snakeHead.elm.id = "snake-snakehead-alive";
        me.snakeHead.elm.className += " snake-snakebody-alive";

        function createSnakeElement() {
            var tempNode = document.createElement("div");
            tempNode.className = "snake-snakebody-block";
            tempNode.style.left = "-1000px";
            tempNode.style.top = "-1000px";
            tempNode.style.width = playingBoard.getBlockWidth() + "px";
            tempNode.style.height = playingBoard.getBlockHeight() + "px";
            return tempNode;
        }

        function createBlocks(num) {
            var tempBlock;
            var tempNode = createSnakeElement();
            for (var ii = 1; ii < num; ii++){
                tempBlock = new SnakeBlock();
                tempBlock.elm = tempNode.cloneNode(true);
                tempBlock.elmStyle = tempBlock.elm.style;
                playingBoard.getBoardContainer().appendChild( tempBlock.elm );
                blockPool[blockPool.length] = tempBlock;
            }
            tempBlock = new SnakeBlock();
            tempBlock.elm = tempNode;
            playingBoard.getBoardContainer().appendChild( tempBlock.elm );
            blockPool[blockPool.length] = tempBlock;
        }

        function recordScore() {
            var highScore = localStorage.jsSnakeHighScore;
            if (me.snakeLength > highScore) {
                alert('Gratulacje! Pobiłeś swój poprzedni najlepszy wynik, czyli ' + highScore + '.');
                localStorage.setItem('jsSnakeHighScore', me.snakeLength);
            }
        }

        function handleEndCondition(handleFunc) {
            recordScore();
            me.snakeHead.elm.style.zIndex = getNextHighestZIndex(me.snakeBody);
            me.snakeHead.elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-alive\b/, '')
            me.snakeHead.elm.className += " snake-snakebody-dead";
            isDead = true;
            handleFunc();
        }

        me.setPaused = function(val) {
            isPaused = val;
        };
        me.getPaused = function() {
            return isPaused;
        };

        me.handleArrowKeys = function(keyNum) {
            if (isDead || (isPaused && !config.premoveOnPause)) {return;}
            var snakeLength = me.snakeLength;
            let directionFound = -1;
            switch (keyNum) {
                case 37:
                case 65:
                    directionFound = 3;
                    break;
                case 38:
                case 87:
                    directionFound = 0;
                    break;
                case 39:
                case 68:
                    directionFound = 1;
                    break;
                case 40:
                case 83:
                    directionFound = 2;
                    break;
            }
            if (currentDirection !== lastMove) {
                preMove = directionFound;
            }
            if (Math.abs(directionFound - lastMove) !== 2 && (isFirstMove || isPaused) || isFirstGameMove ) {
                currentDirection = directionFound;
                isFirstMove = false;
                isFirstGameMove = false;
            }
        };

        me.go = function() {
            var oldHead = me.snakeHead,
                newHead = me.snakeTail,
                grid = playingBoard.grid;
            if (isPaused === true) {
                setTimeout(function(){me.go();}, snakeSpeed);
                return;
            }
            me.snakeTail = newHead.prev;
            me.snakeHead = newHead;
            if ( grid[newHead.row] && grid[newHead.row][newHead.col] ) {
                grid[newHead.row][newHead.col] = 0;
            }
            if (currentDirection !== -1){
                lastMove = currentDirection;
                if (preMove !== -1) {
                    currentDirection = preMove;
                    preMove = -1;
                }
            }
            isFirstMove = true;
            newHead.col = oldHead.col + columnShift[lastMove];
            newHead.row = oldHead.row + rowShift[lastMove];
            newHead.xPos = oldHead.xPos + xPosShift[lastMove];
            newHead.yPos = oldHead.yPos + yPosShift[lastMove];
            if ( !newHead.elmStyle ) {
                newHead.elmStyle = newHead.elm.style;
            }
            newHead.elmStyle.left = newHead.xPos + "px";
            newHead.elmStyle.top = newHead.yPos + "px";
            if(me.snakeLength>1){
                newHead.elm.id="snake-snakehead-alive";
                oldHead.elm.id = "";
            }
            if (grid[newHead.row][newHead.col] === 0) {
                grid[newHead.row][newHead.col] = 1;
                setTimeout(function(){me.go();}, snakeSpeed);
            } else if (grid[newHead.row][newHead.col] > 0) {
                me.handleDeath();
            } else if (grid[newHead.row][newHead.col] === playingBoard.getGridFoodValue()) {
                grid[newHead.row][newHead.col] = 1;
                if (!me.eatFood()) {
                    me.handleWin();
                    return;
                }
                setTimeout(function(){me.go();}, snakeSpeed);
            }
        };

        me.eatFood = function() {
            if (blockPool.length <= growthIncr) {
                createBlocks(growthIncr*2);
            }
            var blocks = blockPool.splice(0, growthIncr);
            var ii = blocks.length,
                index,
                prevNode = me.snakeTail;
            while (ii--) {
                index = "b" + me.snakeLength++;
                me.snakeBody[index] = blocks[ii];
                me.snakeBody[index].prev = prevNode;
                me.snakeBody[index].elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'')
                me.snakeBody[index].elm.className += " snake-snakebody-alive";
                prevNode.next = me.snakeBody[index];
                prevNode = me.snakeBody[index];
            }
            me.snakeTail = me.snakeBody[index];
            me.snakeTail.next = me.snakeHead;
            me.snakeHead.prev = me.snakeTail;
            if (!playingBoard.foodEaten()) {
                return false;
            }
            let selected = document.getElementById("select").value;
            if(selected === "1") {
                if (me.snakeLength == 6) {
                    alert('Przestępstwo komputerowe to każde zachowanie, które narusza prawo, wykorzystując technologię komputerową lub sieci internetowe. Może to obejmować nielegalny dostęp do systemów komputerowych, kradzież danych, niszczenie lub modyfikację informacji, rozpowszechnianie złośliwego oprogramowania, oszustwa internetowe i wiele innych działań, które wpływają negatywnie na bezpieczeństwo lub prywatność innych osób.');
                }
                if (me.snakeLength == 11) {
                    alert('Haker: Osoba, która posiada umiejętności techniczne i wykorzystuje je w celu nieautoryzowanego dostępu do systemów komputerowych lub sieci.');
                }
                if (me.snakeLength == 16) {
                    alert('Freaker: Osoba, która eksploruje systemy telekomunikacyjne i próbuje naruszyć je w celach nielegalnych.');
                }
                if (me.snakeLength == 21) {
                    alert('Szpieg: Przestępca, który zbiera poufne informacje lub dane w celach szpiegowskich.');
                }
                if (me.snakeLength == 26) {
                    alert('Terrorysta: Osoba lub grupa wykorzystująca technologię komputerową w działaniach terrorystycznych, takich jak ataki na infrastrukturę krytyczną.');
                }
                if (me.snakeLength == 31) {
                    alert('Nieuczciwy pracownik: Pracownik, który wykorzystuje swoje pozycje w organizacji do popełnienia przestępstw komputerowych, takich jak kradzież danych firmowych.');
                }
                if (me.snakeLength == 36) {
                    alert('Wandal: Przestępca, który niszczy lub modyfikuje dane lub systemy komputerowe w celu spowodowania szkody.');
                }
                if (me.snakeLength == 41) {
                    alert('Voyeur: Osoba, która nielegalnie uzyskuje dostęp do prywatnych danych lub obrazów innych osób w celu inwigilacji.');
                }
                if (me.snakeLength == 46) {
                    alert('Zawodowy przestępca: Osoba, która popełnia przestępstwa komputerowe w sposób ukierunkowany na osiągnięcie zysku.');
                }
            }
            if(selected === "2") {
                if (me.snakeLength == 6) {
                    alert('Niszczenie i modyfikacja danych: Przestępstwo polegające na usunięciu lub zmianie istotnych danych.');
                }
                if (me.snakeLength == 11) {
                    alert('Metoda salami: Działa na zasadzie "kawałka salami" – dokonuje małych, niezauważalnych zmian, które sumują się do szkody.');
                }
                if (me.snakeLength == 16) {
                    alert('Symulacja i modelowanie przestępstw: Tworzenie symulacji lub modeli w celu oszustwa lub innych przestępstw.');
                }
                if (me.snakeLength == 21) {
                    alert('Sabotaż komputerowy: Celowe zakłócanie pracy systemów komputerowych lub sieci.');
                }
                if (me.snakeLength == 26) {
                    alert('Podsłuch komputerowy: Nielegalne podsłuchiwanie komunikacji lub zdobywanie danych bez wiedzy użytkowników.');
                }
                if (me.snakeLength == 31) {
                    alert('Fałszerstwo komputerowe: Tworzenie fałszywych dokumentów lub danych w celach oszustwa.');
                }
                if (me.snakeLength == 36) {
                    alert('Podszywanie się pod inne osoby: Próba udawania innej osoby w celu uzyskania dostępu do jej kont lub informacji.');
                }
                if (me.snakeLength == 41) {
                    alert('Bezprawne kopiowanie, rozpowszechnianie lub publikowanie programów komputerowych prawnie chronionych: Naruszanie praw autorskich poprzez nielegalne udostępnianie oprogramowania.');
                }
            }
            if(selected === "3") {
                if (me.snakeLength == 6) {
                    alert('Badware to ogólna nazwa dla złośliwego oprogramowania, które szkodzi użytkownikom komputerów. Obejmuje ono wiele rodzajów szkodliwego oprogramowania.');
                }
                if (me.snakeLength == 11) {
                    alert('Wirus Plikowy: Rozprzestrzenia się poprzez zainfekowane pliki.       Wirus Makro: Atakuje makra w dokumentach i arkuszach kalkulacyjnych.');
                }
                if (me.snakeLength == 16) {
                    alert('Wirus Retro: Przywraca usunięte pliki.        Wirus Pocztowy: Rozprzestrzenia się poprzez załączniki e-mailowe.');
                }
                if (me.snakeLength == 21) {
                    alert('Wirus Polimorficzny: Modyfikuje swoją strukturę, aby unikać wykrycia.        Wirus Bootsektora: Infekuje sektory rozruchowe dysku twardego.');
                }
                if (me.snakeLength == 26) {
                    alert('Dialer: Generuje wysokie rachunki za połączenia internetowe.        Koń trojański (Trojan): Udaje legalne oprogramowanie, aby ukraść dane.');
                }
                if (me.snakeLength == 31) {
                    alert('Robak internetowy: Rozprzestrzenia się i kopiuj się na inne komputery.       Skaner heurystyczny: Szuka potencjalnych zagrożeń na komputerze.');
                }
                if (me.snakeLength == 36) {
                    alert('Fałszywki (Haoxy): Modyfikuje wyniki wyszukiwarek internetowych.       Exploit: Wykorzystuje luki w oprogramowaniu do ataków.');
                }
                if (me.snakeLength == 41) {
                    alert('Binder: Łączy wiele programów w jeden, aby ukryć złośliwe działania.       Skaner online: Skanuje komputer w poszukiwaniu złośliwego oprogramowania.');
                }
                if (me.snakeLength == 46) {
                    alert('Bomba logiczna: Wstrzykuje błąd w systemie.         Web worm: Rozprzestrzenia się na stronach internetowych.');
                }
                if (me.snakeLength == 51) {
                    alert('Keylogger: Rejestruje klawisze naciskane na klawiaturze.        Spyware: Monitoruje działania użytkownika i przesyła dane do innych.');
                }
            }
            if(selected === "4") {
                if (me.snakeLength == 6) {
                    alert('Piractwo oprogramowania: Polega na nielegalnym kopiowaniu, dystrybucji lub używaniu oprogramowania bez odpowiednich licencji i zgód właściciela praw autorskich.');
                }
                if (me.snakeLength == 11) {
                    alert('Piractwo filmowe: Obejmuje nielegalne kopiowanie, dystrybucję lub udostępnianie filmów bez zgody właściciela praw autorskich, czasem jeszcze przed oficjalną premierą.');
                }
                if (me.snakeLength == 16) {
                    alert('Piractwo muzyczne: Polega na nielegalnym pobieraniu, kopiowaniu lub rozpowszechnianiu muzyki bez zezwolenia właściciela praw autorskich.');
                }
                if (me.snakeLength == 21) {
                    alert('Piractwo książek elektronicznych: Obejmuje nielegalne kopiowanie, dystrybucję lub udostępnianie książek elektronicznych bez zgody autorów lub wydawców.');
                }
                if (me.snakeLength == 26) {
                    alert('Piractwo oprogramowania komputerowego w przedsiębiorstwach: Występuje, gdy firmy używają nielegalnego oprogramowania lub przekraczają licencje, co narusza prawa autorskie i umowy licencyjne.');
                }
                if (me.snakeLength == 31) {
                    alert('Piractwo treści multimedialnych: Obejmuje nielegalne kopiowanie, dystrybucję lub udostępnianie różnych rodzajów treści multimedialnych, takich jak zdjęcia, grafiki, filmy krótkometrażowe czy nagrania audio, bez zgody prawnych właścicieli tych treści.');
                }
                if (me.snakeLength == 36) {
                    alert('Piractwo oprogramowania urządzeń mobilnych: Polega na nielegalnym pobieraniu, instalowaniu lub rozpowszechnianiu oprogramowania na urządzeniach mobilnych (takich jak smartfony czy tablety) bez zezwolenia producentów lub właścicieli praw autorskich.');
                }
                if (me.snakeLength == 41) {
                    alert('Pamiętaj, że piractwo komputerowe jest nielegalne i narusza prawa autorskie oraz umowy licencyjne. Zaleca się zawsze korzystanie z legalnie nabytych oprogramowań i treści multimedialnych oraz przestrzeganie zasad etycznych i prawnych dotyczących własności intelektualnej.');
                }
            }
            var selectDropDown = document.getElementById("selectMode");
            var selectedOption = selectDropDown.options[selectDropDown.selectedIndex];
            if(selectedOption.text.localeCompare("Rush") == 0) {
                snakeSpeed > 30 ? snakeSpeed -=5 : snakeSpeed = 30;
            }
            return true;
        };

        me.handleDeath = function() {
            var selectedSpeed = document.getElementById("selectMode").value;
            snakeSpeed = parseInt(selectedSpeed);
            handleEndCondition(playingBoard.handleDeath);
        };

        me.handleWin = function() {
            handleEndCondition(playingBoard.handleWin);
        };

        me.rebirth = function() {
            isDead = false;
            isFirstMove = true;
            isFirstGameMove = true;
            preMove = -1;
        };

        me.reset = function() {
            if (isDead === false) {return;}
            var blocks = [],
                curNode = me.snakeHead.next,
                nextNode;
            while (curNode !== me.snakeHead) {
                nextNode = curNode.next;
                curNode.prev = null;
                curNode.next = null;
                blocks.push(curNode);
                curNode = nextNode;
            }
            me.snakeHead.next = me.snakeHead;
            me.snakeHead.prev = me.snakeHead;
            me.snakeTail = me.snakeHead;
            me.snakeLength = 1;
            for (var ii = 0; ii < blocks.length; ii++) {
                blocks[ii].elm.style.left = "-1000px";
                blocks[ii].elm.style.top = "-1000px";
                blocks[ii].elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'')
                blocks[ii].elm.className += " snake-snakebody-alive";
            }
            blockPool.concat(blocks);
            me.snakeHead.elm.className = me.snakeHead.elm.className.replace(/\bsnake-snakebody-dead\b/,'')
            me.snakeHead.elm.className += " snake-snakebody-alive";
            me.snakeHead.elm.id = "snake-snakehead-alive";
            me.snakeHead.row = config.startRow || 1;
            me.snakeHead.col = config.startCol || 1;
            me.snakeHead.xPos = me.snakeHead.row * playingBoard.getBlockWidth();
            me.snakeHead.yPos = me.snakeHead.col * playingBoard.getBlockHeight();
            me.snakeHead.elm.style.left = me.snakeHead.xPos + "px";
            me.snakeHead.elm.style.top = me.snakeHead.yPos + "px";
        };

        createBlocks(growthIncr*2);
        xPosShift[0] = 0;
        xPosShift[1] = playingBoard.getBlockWidth();
        xPosShift[2] = 0;
        xPosShift[3] = -1 * playingBoard.getBlockWidth();
        yPosShift[0] = -1 * playingBoard.getBlockHeight();
        yPosShift[1] = 0;
        yPosShift[2] = playingBoard.getBlockHeight();
        yPosShift[3] = 0;
    };
})();

SNAKE.Food = SNAKE.Food || (function() {
    var instanceNumber = 0;
    function getRandomPosition(x, y){
        return Math.floor(Math.random()*(y+1-x)) + x;
    }
    return function(config) {
        if (!config||!config.playingBoard) {return;}
        var me = this;
        var playingBoard = config.playingBoard;
        var fRow, fColumn;
        var myId = instanceNumber++;
        var elmFood = document.createElement("div");
        elmFood.setAttribute("id", "snake-food-"+myId);
        elmFood.className = "snake-food-block";
        elmFood.style.width = playingBoard.getBlockWidth() + "px";
        elmFood.style.height = playingBoard.getBlockHeight() + "px";
        elmFood.style.left = "-1000px";
        elmFood.style.top = "-1000px";
        playingBoard.getBoardContainer().appendChild(elmFood);
        me.getFoodElement = function() {
            return elmFood;
        };
        me.randomlyPlaceFood = function() {
            if (playingBoard.grid[fRow] && playingBoard.grid[fRow][fColumn] === playingBoard.getGridFoodValue()){
                playingBoard.grid[fRow][fColumn] = 0;
            }
            var row = 0, col = 0, numTries = 0;
            var maxRows = playingBoard.grid.length-1;
            var maxCols = playingBoard.grid[0].length-1;
            while (playingBoard.grid[row][col] !== 0){
                row = getRandomPosition(1, maxRows);
                col = getRandomPosition(1, maxCols);
                numTries++;
                if (numTries > 20000){
                    return false;
                }
            }
            playingBoard.grid[row][col] = playingBoard.getGridFoodValue();
            fRow = row;
            fColumn = col;
            elmFood.style.top = row * playingBoard.getBlockHeight() + "px";
            elmFood.style.left = col * playingBoard.getBlockWidth() + "px";
            return true;
        };
    };
})();

SNAKE.Board = SNAKE.Board || (function() {
    var instanceNumber = 0;

    function getNextHighestZIndex(myObj) {
        var highestIndex = 0,
            currentIndex = 0,
            ii;
        for (ii in myObj) {
            if (myObj[ii].elm.currentStyle){
                currentIndex = parseFloat(myObj[ii].elm.style["z-index"],10);
            }else if(window.getComputedStyle) {
                currentIndex = parseFloat(document.defaultView.getComputedStyle(myObj[ii].elm,null).getPropertyValue("z-index"),10);
            }
            if(!isNaN(currentIndex) && currentIndex > highestIndex){
                highestIndex = currentIndex;
            }
        }
        return(highestIndex+1);
    }

    function getClientWidth(){
        var myWidth = 0;
        if( typeof window.innerWidth === "number" ) {
            myWidth = window.innerWidth;
        } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
            myWidth = document.documentElement.clientWidth;
        } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
            myWidth = document.body.clientWidth;
        }
        return myWidth;
    }
    function getClientHeight(){
        var myHeight = 0;
        if( typeof window.innerHeight === "number" ) {
            myHeight = window.innerHeight;
        } else if( document.documentElement && ( document.documentElement.clientWidth || document.documentElement.clientHeight ) ) {
            myHeight = document.documentElement.clientHeight;
        } else if( document.body && ( document.body.clientWidth || document.body.clientHeight ) ) {
            myHeight = document.body.clientHeight;
        }
        return myHeight;
    }

    return function(inputConfig) {
        var me = this,
            myId = instanceNumber++,
            config = inputConfig || {},
            MAX_BOARD_COLS = 250,
            MAX_BOARD_ROWS = 250,
            blockWidth = 20,
            blockHeight = 20,
            GRID_FOOD_VALUE = -1,
            myFood,
            mySnake,
            boardState = 1,
            myKeyListener,
            isPaused = false,
            elmContainer, elmPlayingField, elmAboutPanel, elmLengthPanel, elmHighscorePanel, elmWelcome, elmTryAgain, elmWin, elmPauseScreen;

        me.grid = [];

        function createBoardElements() {
            elmPlayingField = document.createElement("div");
            elmPlayingField.setAttribute("id", "playingField");
            elmPlayingField.className = "snake-playing-field";
            SNAKE.addEventListener(elmPlayingField, "click", function() {
                elmContainer.focus();
            }, false);
            elmPauseScreen = document.createElement("div");
            elmPauseScreen.className = "snake-pause-screen";
            elmPauseScreen.innerHTML = "<div style='padding:10px;'>[<strong>Zatrzymano <a href='https://github.com/mOnteySZEF'>grę</a></strong>]<p/>Kliknij <strong>spacje</strong> aby kontynuować grę.</div>";
            elmAboutPanel = document.createElement("div");
            elmAboutPanel.className = "snake-panel-component";
            elmAboutPanel.innerHTML = "";
            elmLengthPanel = document.createElement("div");
            elmLengthPanel.className = "snake-panel-component";
            elmLengthPanel.innerHTML = "Punkty: 1";
            elmHighscorePanel = document.createElement("div");
            elmHighscorePanel.className = "snake-panel-component";
            elmHighscorePanel.innerHTML = "Najwyższy wynik: " + (localStorage.jsSnakeHighScore || 0);
            elmWelcome = createWelcomeElement();
            elmTryAgain = createTryAgainElement();
            elmWin = createWinElement();
            SNAKE.addEventListener( elmContainer, "keyup", function(evt) {
                if (!evt) var evt = window.event;
                evt.cancelBubble = true;
                if (evt.stopPropagation) {evt.stopPropagation();}
                if (evt.preventDefault) {evt.preventDefault();}
                return false;
            }, false);
            elmContainer.className = "snake-game-container";
            elmPauseScreen.style.zIndex = 10000;
            elmContainer.appendChild(elmPauseScreen);
            elmContainer.appendChild(elmPlayingField);
            elmContainer.appendChild(elmAboutPanel);
            elmContainer.appendChild(elmLengthPanel);
            elmContainer.appendChild(elmHighscorePanel);
            elmContainer.appendChild(elmWelcome);
            elmContainer.appendChild(elmTryAgain);
            elmContainer.appendChild(elmWin);
            mySnake = new SNAKE.Snake({playingBoard:me,startRow:2,startCol:2,premoveOnPause: config.premoveOnPause});
            myFood = new SNAKE.Food({playingBoard: me});
            elmWelcome.style.zIndex = 1000;
        }
        function maxBoardWidth() {
            return MAX_BOARD_COLS * me.getBlockWidth();
        }
        function maxBoardHeight() {
            return MAX_BOARD_ROWS * me.getBlockHeight();
        }

        function createWelcomeElement() {
            var tmpElm = document.createElement("div");
            tmpElm.id = "sbWelcome" + myId;
            tmpElm.className = "snake-welcome-dialog";
            var welcomeTxt = document.createElement("div");
            var fullScreenText = "";
            if (config.fullScreen) {
                fullScreenText = "<br><br><a href='https://github.com/mOnteySZEF'>mOntey</a>";
            }
            welcomeTxt.innerHTML = "<b>Snake - Przestępstwa komputerowe</b><p></p>Aby zagrać w grę, użyj <strong>strzałek</strong> na klawiaturze. W górnej części strony znajduje się pole wybrania danego <b>zagadnienia</b> oraz <b>poziomu trudności</b>! <br> Należy <strong>zbierać punkty</strong> aby informacje zostały pokazane o wybranym zagadnieniu" + fullScreenText + "<p></p>";
            var welcomeStart = document.createElement("button");
            // var zrodla = document.createElement("button");
            welcomeStart.appendChild(document.createTextNode("ROZPOCZNIJ GRĘ"));
            // zrodla.appendChild(document.createTextNode("Źródła"));
            var loadGame = function() {
                SNAKE.removeEventListener(window, "keyup", kbShortcut, false);
                tmpElm.style.display = "none";
                me.setBoardState(1);
                me.getBoardContainer().focus();
            };
            // var loadZrodla = function() {
            //     var newPath = "zrodla.html";
            //     window.location.href = newPath;
            // };
            var kbShortcut = function(evt) {
                if (!evt) var evt = window.event;
                var keyNum = (evt.which) ? evt.which : evt.keyCode;
                if (keyNum === 32 || keyNum === 13) {
                    loadGame();
                }
            };
            SNAKE.addEventListener(window, "keyup", kbShortcut, false);
            SNAKE.addEventListener(welcomeStart, "click", loadGame, false);
            // SNAKE.addEventListener(zrodla, "click", loadZrodla, false);
            tmpElm.appendChild(welcomeTxt);
            tmpElm.appendChild(welcomeStart);
            // tmpElm.appendChild(zrodla);
            return tmpElm;
        }

        function createGameEndElement(message, elmId, elmClassName) {
            var tmpElm = document.createElement("div");
            tmpElm.id = elmId + myId;
            tmpElm.className = elmClassName;
            var gameEndTxt = document.createElement("div");
            gameEndTxt.innerHTML = "Snake<p></p>" + message + "<p></p>";
            var gameEndStart = document.createElement("button");
            gameEndStart.appendChild(document.createTextNode("Zagraj ponownie"));
            var reloadGame = function () {
                tmpElm.style.display = "none";
                me.resetBoard();
                me.setBoardState(1);
                me.getBoardContainer().focus();
            };
            var kbGameEndShortcut = function (evt) {
                if (boardState !== 0 || tmpElm.style.display !== "block") { return; }
                if (!evt) var evt = window.event;
                var keyNum = (evt.which) ? evt.which : evt.keyCode;
                if (keyNum === 32 || keyNum === 13) {
                    reloadGame();
                }
            };
            SNAKE.addEventListener(window, "keyup", kbGameEndShortcut, true);
            SNAKE.addEventListener(gameEndStart, "click", reloadGame, false);
            tmpElm.appendChild(gameEndTxt);
            tmpElm.appendChild(gameEndStart);
            return tmpElm;
        }

        function createTryAgainElement() {
            return createGameEndElement("Przegrałeś :(", "sbTryAgain", "snake-try-again-dialog");
        }

        function createWinElement() {
            return createGameEndElement("Wygrałeś! :D", "sbWin", "snake-win-dialog");
        }

        function handleEndCondition(elmDialog) {
            var index = Math.max(getNextHighestZIndex(mySnake.snakeBody), getNextHighestZIndex({ tmp: { elm: myFood.getFoodElement() } }));
            elmContainer.removeChild(elmDialog);
            elmContainer.appendChild(elmDialog);
            elmDialog.style.zIndex = index;
            elmDialog.style.display = "block";
            me.setBoardState(0);
        }

        me.setPaused = function(val) {
            isPaused = val;
            mySnake.setPaused(val);
            if (isPaused) {
                elmPauseScreen.style.display = "block";
            } else {
                elmPauseScreen.style.display = "none";
            }
        };
        me.getPaused = function() {
            return isPaused;
        };

        me.resetBoard = function() {
            SNAKE.removeEventListener(elmContainer, "keydown", myKeyListener, false);
            mySnake.reset();
            elmLengthPanel.innerHTML = "Punkty: 1"; 
            me.setupPlayingField();
        };

        me.getBoardState = function() {
            return boardState;
        };

        me.setBoardState = function(state) {
            boardState = state;
        };

        me.getGridFoodValue = function() {
            return GRID_FOOD_VALUE;
        };

        me.getPlayingFieldElement = function() {
            return elmPlayingField;
        };

        me.setBoardContainer = function(myContainer) {
            if (typeof myContainer === "string") {
                myContainer = document.getElementById(myContainer);
            }
            if (myContainer === elmContainer) {return;}
            elmContainer = myContainer;
            elmPlayingField = null;
            me.setupPlayingField();
        };

        me.getBoardContainer = function() {
            return elmContainer;
        };

        me.getBlockWidth = function() {
            return blockWidth;
        };

        me.getBlockHeight = function() {
            return blockHeight;
        };

        me.setupPlayingField = function () {
            if (!elmPlayingField) {createBoardElements();}
            var cWidth, cHeight;
            var cTop, cLeft;
            if (config.fullScreen === true) {
                cTop = 0;
                cLeft = 0;
                cWidth = getClientWidth()-20;
                cHeight = getClientHeight()-20;
            } else {
                cTop = config.top;
                cLeft = config.left;
                cWidth = config.width;
                cHeight = config.height;
            }
            var wEdgeSpace = me.getBlockWidth()*2 + (cWidth % me.getBlockWidth());
            var fWidth = Math.min(maxBoardWidth()-wEdgeSpace,cWidth-wEdgeSpace);
            var hEdgeSpace = me.getBlockHeight()*3 + (cHeight % me.getBlockHeight());
            var fHeight = Math.min(maxBoardHeight()-hEdgeSpace,cHeight-hEdgeSpace);
            elmContainer.style.left = cLeft + "px";
            elmContainer.style.top = cTop + "px";
            elmContainer.style.width = cWidth + "px";
            elmContainer.style.height = cHeight + "px";
            elmPlayingField.style.left = me.getBlockWidth() + "px";
            elmPlayingField.style.top  = me.getBlockHeight() + "px";
            elmPlayingField.style.width = fWidth + "px";
            elmPlayingField.style.height = fHeight + "px";
            var bottomPanelHeight = hEdgeSpace - me.getBlockHeight();
            var pLabelTop = me.getBlockHeight() + fHeight + Math.round((bottomPanelHeight - 30)/2) + "px";
            elmAboutPanel.style.top = pLabelTop;
            elmAboutPanel.style.width = "450px";
            elmAboutPanel.style.left = Math.round(cWidth/2) - Math.round(450/2) + "px";
            elmLengthPanel.style.top = pLabelTop;
            elmLengthPanel.style.left = 30 + "px";
            elmHighscorePanel.style.top = pLabelTop;
            elmHighscorePanel.style.left = cWidth - 140 + "px";
            if (cWidth < 700) {
                elmAboutPanel.style.display = "none";
            } else {
                elmAboutPanel.style.display = "block";
            }
            me.grid = [];
            var numBoardCols = fWidth / me.getBlockWidth() + 2;
            var numBoardRows = fHeight / me.getBlockHeight() + 2;
            for (var row = 0; row < numBoardRows; row++) {
                me.grid[row] = [];
                for (var col = 0; col < numBoardCols; col++) {
                    if (col === 0 || row === 0 || col === (numBoardCols-1) || row === (numBoardRows-1)) {
                        me.grid[row][col] = 1;
                    } else {
                        me.grid[row][col] = 0;
                    }
                }
            }
            myFood.randomlyPlaceFood();
            myKeyListener = function(evt) {
                if (!evt) var evt = window.event;
                var keyNum = (evt.which) ? evt.which : evt.keyCode;
                if (me.getBoardState() === 1) {
                    if ( !(keyNum >= 37 && keyNum <= 40) && !(keyNum === 87 || keyNum === 65 || keyNum === 83 || keyNum === 68)) {return;}
                    SNAKE.removeEventListener(elmContainer, "keydown", myKeyListener, false);
                    myKeyListener = function(evt) {
                        if (!evt) var evt = window.event;
                        var keyNum = (evt.which) ? evt.which : evt.keyCode;
                        if (keyNum === 32) {
                            if(me.getBoardState()!=0)
                                me.setPaused(!me.getPaused());
                        }
                        mySnake.handleArrowKeys(keyNum);
                        evt.cancelBubble = true;
                        if (evt.stopPropagation) {evt.stopPropagation();}
                        if (evt.preventDefault) {evt.preventDefault();}
                        return false;
                    };
                    SNAKE.addEventListener( elmContainer, "keydown", myKeyListener, false);
                    mySnake.rebirth();
                    mySnake.handleArrowKeys(keyNum);
                    me.setBoardState(2);
                    mySnake.go();
                }
                evt.cancelBubble = true;
                if (evt.stopPropagation) {evt.stopPropagation();}
                if (evt.preventDefault) {evt.preventDefault();}
                return false;
            };
            SNAKE.addEventListener( elmContainer, "keydown", myKeyListener, false);
        };

        me.foodEaten = function() {
            elmLengthPanel.innerHTML = "Punkty: " + mySnake.snakeLength;
            if (mySnake.snakeLength > localStorage.jsSnakeHighScore) {
                localStorage.setItem("jsSnakeHighScore", mySnake.snakeLength);
                elmHighscorePanel.innerHTML = "Najwyższy wynik: " + localStorage.jsSnakeHighScore;
            }
            if (!myFood.randomlyPlaceFood()) {
                return false;
            }
            return true;
        };

        me.handleDeath = function() {
            handleEndCondition(elmTryAgain);
        };

        me.handleWin = function () {
            handleEndCondition(elmWin);
        };

        config.fullScreen = (typeof config.fullScreen === "undefined") ? false : config.fullScreen;
        config.top = (typeof config.top === "undefined") ? 0 : config.top;
        config.left = (typeof config.left === "undefined") ? 0 : config.left;
        config.width = (typeof config.width === "undefined") ? 400 : config.width;
        config.height = (typeof config.height === "undefined") ? 400 : config.height;
        config.premoveOnPause = (typeof config.premoveOnPause === "undefined") ? false : config.premoveOnPause;
        if (config.fullScreen) {
            SNAKE.addEventListener(window,"resize", function() {
                me.setupPlayingField();
            }, false);
        }
        me.setBoardState(0);
        if (config.boardContainer) {
            me.setBoardContainer(config.boardContainer);
        }
    };
})();
