// ============================================================
// 1. Globale Daten und Konstanten
// ============================================================

const useDemoData = true;

const appStorageKey = "miriels-deck-encounter-state-v4";
const appChannelName = "miriels-deck-encounter-channel";

let appView = getAppViewFromUrl();
let appBroadcastChannel = null;
let isApplyingExternalState = false;
let lastAppliedStateText = "";

let creatures = useDemoData ? createDemoCreatures() : [];

function createDemoCreatures() {
    return [
        {
            id: 1,
            name: "Miriel Dunkelschön",
            publicName: "Miriel",
            type: "player",
            initiative: 20,
            hp: 55,
            maxHp: 55,
            tempHp: 10,
            armorClass: 17,
            passivePerception: 16,
            passiveInsight: 10,
            hpVisibility: "full",
            imageData: "Images/miriel_img.png",
            conditions: [],
            isInCombat: true,
            isSelected: false
        },
        {
            id: 2,
            name: "Liora Veyth",
            publicName: "Liora",
            type: "player",
            initiative: 16,
            hp: 61,
            maxHp: 61,
            tempHp: 0,
            armorClass: 20,
            passivePerception: 10,
            passiveInsight: 13,
            hpVisibility: "full",
            imageData: "Images/liora_img.png",
            conditions: [],
            isInCombat: false,
            isSelected: false
        },
        {
            id: 3,
            name: "Suica",
            publicName: "Suica",
            type: "player",
            initiative: 11,
            hp: 20,
            maxHp: 20,
            tempHp: 5,
            armorClass: 12,
            passivePerception: 11,
            passiveInsight: 13,
            hpVisibility: "full",
            imageData: "Images/suica_img.png",
            conditions: [],
            isInCombat: true,
            isSelected: false
        },       
        {
            id: 4,
            name: "Animierter Besen",
            publicName: "Borstibald der Aufmüpfige",
            type: "monster",
            initiative: 13,
            hp: 22,
            maxHp: 22,
            tempHp: 0,
            armorClass: 14,
            passivePerception: 9,
            passiveInsight: 6,
            hpVisibility: "bar",
            imageData: "Images/borstibald_img.png",
            conditions: ["prone", "frightened"],
            isInCombat: true,
            isSelected: false
        }
    ];
}

const availableConditions = [
    "blinded",
    "charmed",
    "deafened",
    "frightened",
    "grappled",
    "incapacitated",
    "invisible",
    "paralyzed",
    "petrified",
    "poisoned",
    "prone",
    "restrained",
    "stunned",
    "unconscious",
    "concentrating"
];

let currentTurnIndex = 0;
let roundNumber = 1;

// null bedeutet: Die öffentliche Vorschau folgt automatisch der aktiven Karte.
// Eine Zahl bedeutet: Die Spieler haben bewusst diese Karten-ID ausgewählt.
let manuallySelectedPublicCardId = null;

// Diese Werte brauchen wir für Swipe-Gesten auf Touch-Geräten.
let publicPreviewTouchStartX = null;
let publicPreviewTouchStartY = null;

// Diese Variable verhindert, dass ein Trackpad-Scroll zu viele Karten auf einmal überspringt.
let publicPreviewWheelIsCoolingDown = false;

// Kurzes Kampf-Log für sichtbare DM-Aktionen.
let combatLogMessages = [];

// null bedeutet: Es wird gerade keine Karte bearbeitet.
// Eine Zahl bedeutet: Diese Karten-ID ist im Bearbeitungsformular geöffnet.
let editingCreatureId = null;


// ============================================================
// 2. Ansichtsmodus, Browser-Speicher und Tab-Synchronisation
// ============================================================

function getAppViewFromUrl() {
    const urlParameters = new URLSearchParams(window.location.search);
    const viewParameter = urlParameters.get("view");

    if (viewParameter === "player") {
        return "player";
    }

    return "dm";
}

function openAppView(viewName) {
    const targetUrl = new URL(window.location.href);

    if (viewName === "player") {
        targetUrl.searchParams.set("view", "player");
    } else {
        targetUrl.searchParams.set("view", "dm");
    }

    window.open(targetUrl.toString(), "_blank");
}

function applyAppViewToPage() {
    if (appView === "player") {
        document.body.classList.add("player-view");
        document.body.classList.remove("dm-view");
    } else {
        document.body.classList.add("dm-view");
        document.body.classList.remove("player-view");
    }

    const kickerElement = document.querySelector("#app-view-kicker");

    if (kickerElement !== null) {
        kickerElement.textContent = appView === "player"
            ? "Spieler-Ansicht"
            : "DM-Ansicht";
    }

    const dmButtonElement = document.querySelector("#open-dm-view-button");
    const playerButtonElement = document.querySelector("#open-player-view-button");

    if (dmButtonElement !== null) {
        dmButtonElement.classList.toggle("active-view-button", appView === "dm");
    }

    if (playerButtonElement !== null) {
        playerButtonElement.classList.toggle("active-view-button", appView === "player");
    }
}

function createPersistentAppState() {
    return {
        formatName: "Miriel's Deck of Encounters Local State",
        formatVersion: 1,
        savedAt: new Date().toISOString(),
        encounter: {
            roundNumber: roundNumber,
            currentTurnIndex: currentTurnIndex,
            manuallySelectedPublicCardId: manuallySelectedPublicCardId,
            combatLogMessages: combatLogMessages,
            creatures: creatures
        }
    };
}

function saveAppStateToBrowser() {
    const persistentState = createPersistentAppState();
    const stateText = JSON.stringify(persistentState);

    localStorage.setItem(appStorageKey, stateText);
    lastAppliedStateText = stateText;

    updateStorageStatus("Browser-Speicher: gespeichert");
}

function broadcastAppStateChange() {
    if (appBroadcastChannel === null) {
        return;
    }

    appBroadcastChannel.postMessage({
        type: "encounter-state-changed"
    });
}

function saveAndBroadcastAppState() {
    if (isApplyingExternalState === true) {
        return;
    }

    if (appView !== "dm") {
        return;
    }

    saveAppStateToBrowser();
    broadcastAppStateChange();
}

function loadAppStateFromBrowser() {
    const savedStateText = localStorage.getItem(appStorageKey);

    if (savedStateText === null) {
        updateStorageStatus("Browser-Speicher: leer");
        return false;
    }

    try {
        const savedState = JSON.parse(savedStateText);
        applyImportedEncounterState(savedState);
        lastAppliedStateText = savedStateText;
        updateStorageStatus("Browser-Speicher: geladen");
        return true;
    } catch (error) {
        updateStorageStatus("Browser-Speicher: fehlerhaft");
        return false;
    }
}

function applyImportedEncounterState(importData) {
    const encounterData = getEncounterDataFromImport(importData);

    if (encounterData === null) {
        return;
    }

    const importedCreatures = createImportedCreatures(encounterData.creatures);

    creatures = importedCreatures;
    roundNumber = getSafePositiveInteger(encounterData.roundNumber, 1);
    currentTurnIndex = getSafeNonNegativeInteger(encounterData.currentTurnIndex, 0);

    if (isImportedPublicSelectionValid(encounterData.manuallySelectedPublicCardId, creatures)) {
        manuallySelectedPublicCardId = Number(encounterData.manuallySelectedPublicCardId);
    } else {
        clearManualPublicSelection();
    }

    combatLogMessages = getSafeCombatLogMessages(encounterData.combatLogMessages);

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);
}

function applyExternalAppStateAndRender() {
    const savedStateText = localStorage.getItem(appStorageKey);

    if (savedStateText === null) {
        return;
    }

    if (savedStateText === lastAppliedStateText) {
        return;
    }

    lastAppliedStateText = savedStateText;

    isApplyingExternalState = true;

    const wasStateLoaded = loadAppStateFromBrowser();

    if (wasStateLoaded === true) {
        renderCards();
    }

    isApplyingExternalState = false;
}

function setupCrossTabSync() {
    if ("BroadcastChannel" in window) {
        appBroadcastChannel = new BroadcastChannel(appChannelName);

        appBroadcastChannel.addEventListener("message", function(event) {
            if (event.data === null || event.data.type !== "encounter-state-changed") {
                return;
            }

            if (appView === "player") {
                applyExternalAppStateAndRender();
            }
        });
    }

    window.addEventListener("storage", function(event) {
        if (event.key !== appStorageKey) {
            return;
        }

        if (appView === "player") {
            applyExternalAppStateAndRender();
        }
    });
}

function setupPlayerViewPolling() {
    if (appView !== "player") {
        return;
    }

    setInterval(function() {
        applyExternalAppStateAndRender();
    }, 500);
}

function updateStorageStatus(message) {
    const storageStatusElement = document.querySelector("#storage-status");

    if (storageStatusElement === null) {
        return;
    }

    const now = new Date();
    const timeText = now.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });

    storageStatusElement.textContent = `${message} · ${timeText}`;
}

function saveCurrentStateManually() {
    saveAppStateToBrowser();
    broadcastAppStateChange();

    alert("Der aktuelle Browser-Zustand wurde gespeichert.");
}

function reloadDemoCards() {
    const shouldReloadDemoCards = confirm(
        "Demo-Karten neu laden? Der aktuelle Encounter wird ersetzt."
    );

    if (shouldReloadDemoCards === false) {
        return;
    }

    creatures = createDemoCreatures();
    currentTurnIndex = 0;
    roundNumber = 1;
    combatLogMessages = [];
    clearManualPublicSelection();
    addCombatLogMessage("Demo-Karten neu geladen.");

    renderCards();

    alert("Die Demo-Karten wurden neu geladen.");
}

function clearSavedBrowserState() {
    const shouldClearSavedState = confirm(
        "Browser-Zustand löschen? Der aktuell sichtbare Encounter bleibt bis zum Neuladen sichtbar."
    );

    if (shouldClearSavedState === false) {
        return;
    }

    localStorage.removeItem(appStorageKey);
    lastAppliedStateText = "";

    updateStorageStatus("Browser-Speicher: gelöscht");

    alert("Der gespeicherte Browser-Zustand wurde gelöscht.");
}

// ============================================================
// 2. Grundlegende Karten-Abfragen und Sortierung
// ============================================================

function getTypeSortValue(type) {
    if (type === "player") {
        return 1;
    }

    if (type === "npc") {
        return 2;
    }

    if (type === "monster") {
        return 3;
    }

    return 4;
}

function getHandCards() {
    const handCards = creatures.filter(function(creature) {
        return creature.isInCombat === true;
    });

    handCards.sort(function(a, b) {
        if (a.initiative !== b.initiative) {
            return b.initiative - a.initiative;
        }

        const typeDifference = getTypeSortValue(a.type) - getTypeSortValue(b.type);

        if (typeDifference !== 0) {
            return typeDifference;
        }

        return a.name.localeCompare(b.name);
    });

    return handCards;
}

function getDeckCards() {
    const deckCards = creatures.filter(function(creature) {
        return creature.isInCombat === false;
    });

    deckCards.sort(function(a, b) {
        const typeDifference = getTypeSortValue(a.type) - getTypeSortValue(b.type);

        if (typeDifference !== 0) {
            return typeDifference;
        }

        return a.name.localeCompare(b.name);
    });

    return deckCards;
}


// ============================================================
// 3. Öffentliche Auswahl-Helfer
// ============================================================

function hasManualPublicSelection() {
    return manuallySelectedPublicCardId !== null;
}

function shouldPublicPreviewFollowActiveCard() {
    return manuallySelectedPublicCardId === null;
}

function isCreatureManuallySelected(creature) {
    return hasManualPublicSelection() && creature.id === manuallySelectedPublicCardId;
}

function isPublicCardManuallySelected(publicCard) {
    return hasManualPublicSelection() && publicCard.id === manuallySelectedPublicCardId;
}

function clearManualPublicSelection() {
    manuallySelectedPublicCardId = null;
}


// ============================================================
// 3b. DM-Zielauswahl für spätere AOE-Aktionen
// ============================================================

function getSelectedHandCards() {
    return getHandCards().filter(function(creature) {
        return creature.isSelected === true;
    });
}

function getSelectedDeckCards() {
    return getDeckCards().filter(function(creature) {
        return creature.isSelected === true;
    });
}

function getSelectedHandCardCount() {
    return getSelectedHandCards().length;
}

function getSelectedDeckCardCount() {
    return getSelectedDeckCards().length;
}

function toggleCreatureSelection(creatureId) {
    const creature = findCreatureById(creatureId);

    if (creature === null) {
        return;
    }

    creature.isSelected = creature.isSelected !== true;

    renderCards();
}

function clearCardSelection() {
    for (const creature of creatures) {
        creature.isSelected = false;
    }

    renderCards();
}

function clearDeckSelection() {
    for (const creature of creatures) {
        if (creature.isInCombat === false) {
            creature.isSelected = false;
        }
    }

    renderCards();
}

function selectAllHandCards() {
    for (const creature of creatures) {
        if (creature.isInCombat === true) {
            creature.isSelected = true;
        }
    }

    renderCards();
}

function selectAllDeckCards() {
    for (const creature of creatures) {
        if (creature.isInCombat === false) {
            creature.isSelected = true;
        }
    }

    renderCards();
}

function updateSelectionStatus() {
    const selectionStatusElement = document.querySelector("#selection-status");
    const selectionTargetNamesElement = document.querySelector("#selection-target-names");

    if (selectionStatusElement === null) {
        return;
    }

    const selectedTargets = getSelectedHandCards();
    const selectedCount = selectedTargets.length;

    if (selectedCount === 1) {
        selectionStatusElement.textContent = "1 Ziel ausgewählt";
    } else {
        selectionStatusElement.textContent = `${selectedCount} Ziele ausgewählt`;
    }

    if (selectionTargetNamesElement === null) {
        return;
    }

    if (selectedCount === 0) {
        selectionTargetNamesElement.textContent = "Keine Ziele ausgewählt.";
        return;
    }

    selectionTargetNamesElement.textContent = createTargetNamesText(selectedTargets);
}

function updateDeckSelectionStatus() {
    const deckSelectionStatusElement = document.querySelector("#deck-selection-status");
    const deckSelectionNamesElement = document.querySelector("#deck-selection-names");

    if (deckSelectionStatusElement === null) {
        return;
    }

    const selectedDeckCards = getSelectedDeckCards();
    const selectedCount = selectedDeckCards.length;

    if (selectedCount === 1) {
        deckSelectionStatusElement.textContent = "1 Deck-Karte ausgewählt";
    } else {
        deckSelectionStatusElement.textContent = `${selectedCount} Deck-Karten ausgewählt`;
    }

    if (deckSelectionNamesElement === null) {
        return;
    }

    if (selectedCount === 0) {
        deckSelectionNamesElement.textContent = "Keine Deck-Karten ausgewählt.";
        return;
    }

    deckSelectionNamesElement.textContent = createTargetNamesText(selectedDeckCards);
}


// ============================================================
// 4. Turn-Logik
// ============================================================

function ensureCurrentTurnIndexIsValid(handCards) {
    if (handCards.length === 0) {
        currentTurnIndex = 0;
        roundNumber = 1;
        clearManualPublicSelection();
        return;
    }

    if (currentTurnIndex < 0) {
        currentTurnIndex = 0;
    }

    if (currentTurnIndex >= handCards.length) {
        currentTurnIndex = handCards.length - 1;
    }
}

function getActiveCard(handCards) {
    ensureCurrentTurnIndexIsValid(handCards);

    if (handCards.length === 0) {
        return null;
    }

    return handCards[currentTurnIndex];
}

function nextTurn() {
    const handCards = getHandCards();

    if (handCards.length === 0) {
        return;
    }

    currentTurnIndex = currentTurnIndex + 1;
    clearManualPublicSelection();

    if (currentTurnIndex >= handCards.length) {
        currentTurnIndex = 0;
        roundNumber = roundNumber + 1;
    }

    const newActiveCard = getActiveCard(getHandCards());

    if (newActiveCard !== null) {
        addCombatLogMessage(`Nächster Zug: ${newActiveCard.name}.`);
    }

    renderCards();
}

function previousTurn() {
    const handCards = getHandCards();

    if (handCards.length === 0) {
        return;
    }

    currentTurnIndex = currentTurnIndex - 1;
    clearManualPublicSelection();

    if (currentTurnIndex < 0) {
        currentTurnIndex = handCards.length - 1;

        if (roundNumber > 1) {
            roundNumber = roundNumber - 1;
        }
    }

    const newActiveCard = getActiveCard(getHandCards());

    if (newActiveCard !== null) {
        addCombatLogMessage(`Vorheriger Zug: ${newActiveCard.name}.`);
    }

    renderCards();
}

function resetCombatTurnCounter() {
    currentTurnIndex = 0;
    roundNumber = 1;
    clearManualPublicSelection();

    addCombatLogMessage("Zähler zurückgesetzt.");
    renderCards();
}


// ============================================================
// 5. Scroll- und Fokus-Logik
// ============================================================

function scrollCardRow(rowElementId, direction) {
    const rowElement = document.querySelector(`#${rowElementId}`);

    if (rowElement === null) {
        return;
    }

    const maximumScrollLeft = rowElement.scrollWidth - rowElement.clientWidth;
    const scrollTolerance = 4;
    const scrollAmount = rowElement.clientWidth * 0.85;

    if (maximumScrollLeft <= 0) {
        return;
    }

    if (direction === "right") {
        const isAtRightEnd = rowElement.scrollLeft >= maximumScrollLeft - scrollTolerance;

        if (isAtRightEnd) {
            rowElement.scrollTo({
                left: 0,
                behavior: "smooth"
            });

            return;
        }

        rowElement.scrollBy({
            left: scrollAmount,
            behavior: "smooth"
        });

        return;
    }

    if (direction === "left") {
        const isAtLeftEnd = rowElement.scrollLeft <= scrollTolerance;

        if (isAtLeftEnd) {
            rowElement.scrollTo({
                left: maximumScrollLeft,
                behavior: "smooth"
            });

            return;
        }

        rowElement.scrollBy({
            left: -scrollAmount,
            behavior: "smooth"
        });
    }
}

function scrollPublicPreview(direction) {
    scrollCardRow("public-preview-ribbon", direction);
}

function focusPublicCard(publicCardId) {
    manuallySelectedPublicCardId = publicCardId;
    renderCards();
}

function resetPublicFocusToActiveCard() {
    clearManualPublicSelection();
    renderCards();
}

function navigatePublicPreview(direction) {
    const handCards = getHandCards();

    if (handCards.length === 0) {
        return;
    }

    const activeCard = getActiveCard(handCards);
    const publicCards = createPublicEncounterState(handCards, activeCard);

    if (publicCards.length === 0) {
        return;
    }

    const focusedIndex = getFocusedPublicCardIndex(publicCards);
    let nextFocusedIndex = focusedIndex;

    if (direction === "right") {
        nextFocusedIndex = focusedIndex + 1;

        if (nextFocusedIndex >= publicCards.length) {
            nextFocusedIndex = 0;
        }
    }

    if (direction === "left") {
        nextFocusedIndex = focusedIndex - 1;

        if (nextFocusedIndex < 0) {
            nextFocusedIndex = publicCards.length - 1;
        }
    }

    manuallySelectedPublicCardId = publicCards[nextFocusedIndex].id;

    renderCards();
}

function handlePublicPreviewWheel(event) {
    const absoluteDeltaX = Math.abs(event.deltaX);
    const absoluteDeltaY = Math.abs(event.deltaY);

    const isHorizontalScroll = absoluteDeltaX > absoluteDeltaY * 1.6;
    const isShiftWheelScroll = event.shiftKey === true && absoluteDeltaY > 0;

    if (isHorizontalScroll === false && isShiftWheelScroll === false) {
        return;
    }

    event.preventDefault();

    if (publicPreviewWheelIsCoolingDown === true) {
        return;
    }

    publicPreviewWheelIsCoolingDown = true;

    const scrollValue = isHorizontalScroll ? event.deltaX : event.deltaY;

    if (scrollValue > 0) {
        navigatePublicPreview("right");
    } else {
        navigatePublicPreview("left");
    }

    setTimeout(function() {
        publicPreviewWheelIsCoolingDown = false;
    }, 700);
}

function handlePublicPreviewTouchStart(event) {
    if (event.touches.length === 0) {
        return;
    }

    publicPreviewTouchStartX = event.touches[0].clientX;
    publicPreviewTouchStartY = event.touches[0].clientY;
}

function handlePublicPreviewTouchEnd(event) {
    if (
        publicPreviewTouchStartX === null ||
        publicPreviewTouchStartY === null ||
        event.changedTouches.length === 0
    ) {
        publicPreviewTouchStartX = null;
        publicPreviewTouchStartY = null;
        return;
    }

    const touchEndX = event.changedTouches[0].clientX;
    const touchEndY = event.changedTouches[0].clientY;

    const deltaX = touchEndX - publicPreviewTouchStartX;
    const deltaY = touchEndY - publicPreviewTouchStartY;

    const absoluteDeltaX = Math.abs(deltaX);
    const absoluteDeltaY = Math.abs(deltaY);

    publicPreviewTouchStartX = null;
    publicPreviewTouchStartY = null;

    const minimumSwipeDistance = 50;
    const isMostlyHorizontalSwipe = absoluteDeltaX > absoluteDeltaY * 1.4;

    if (absoluteDeltaX < minimumSwipeDistance || isMostlyHorizontalSwipe === false) {
        return;
    }

    if (deltaX < 0) {
        navigatePublicPreview("right");
    } else {
        navigatePublicPreview("left");
    }
}

function setupPublicPreviewNavigation() {
    const publicPreviewElement = document.querySelector("#public-preview-list");

    if (publicPreviewElement === null) {
        return;
    }

    publicPreviewElement.addEventListener("wheel", handlePublicPreviewWheel, {
        passive: false
    });

    publicPreviewElement.addEventListener("touchstart", handlePublicPreviewTouchStart);
    publicPreviewElement.addEventListener("touchend", handlePublicPreviewTouchEnd);
}


// ============================================================
// 6. Karten finden, verschieben, entfernen und Combat-Aufräumen
// ============================================================

function findCreatureById(id) {
    for (const creature of creatures) {
        if (creature.id === id) {
            return creature;
        }
    }

    return null;
}

function getNextCreatureId() {
    let highestId = 0;

    for (const creature of creatures) {
        if (creature.id > highestId) {
            highestId = creature.id;
        }
    }

    return highestId + 1;
}

function removeCreatureById(id) {
    creatures = creatures.filter(function(creature) {
        return creature.id !== id;
    });

    if (manuallySelectedPublicCardId === id) {
        clearManualPublicSelection();
    }

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}

function moveCardToHand(creatureId) {
    const creature = findCreatureById(creatureId);

    if (creature === null) {
        return;
    }

    creature.isInCombat = true;
    creature.isSelected = false;

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}

function moveCardToDeck(creatureId) {
    const creature = findCreatureById(creatureId);

    if (creature === null) {
        return;
    }

    creature.isInCombat = false;
    creature.isSelected = false;

    if (manuallySelectedPublicCardId === creatureId) {
        clearManualPublicSelection();
    }

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}

function moveAllHandCardsToDeck() {
    for (const creature of creatures) {
        if (creature.isInCombat === true) {
            creature.isInCombat = false;
            creature.isSelected = false;
        }
    }

    currentTurnIndex = 0;
    roundNumber = 1;
    clearManualPublicSelection();

    renderCards();
}

function moveAllDeckCardsToHand() {
    for (const creature of creatures) {
        if (creature.isInCombat === false) {
            creature.isInCombat = true;
            creature.isSelected = false;
        }
    }

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}

function moveSelectedDeckCardsToHand() {
    const selectedDeckCards = getSelectedDeckCards();

    if (selectedDeckCards.length === 0) {
        alert("Bitte wähle zuerst mindestens eine Deck-Karte aus.");
        return;
    }

    const selectedNamesText = createTargetNamesText(selectedDeckCards);

    for (const creature of selectedDeckCards) {
        creature.isInCombat = true;
        creature.isSelected = false;
    }

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    addCombatLogMessage(`${selectedDeckCards.length} Deck-Karte(n) auf die Hand genommen: ${selectedNamesText}.`);
    renderCards();
}

function moveHandCardsOfTypeToDeck(type) {
    for (const creature of creatures) {
        if (creature.isInCombat === true && creature.type === type) {
            creature.isInCombat = false;
            creature.isSelected = false;
        }
    }

    clearManualPublicSelection();

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}

function moveDeckCardsOfTypeToHand(type) {
    for (const creature of creatures) {
        if (creature.isInCombat === false && creature.type === type) {
            creature.isInCombat = true;
            creature.isSelected = false;
        }
    }

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}

function clearAllTempHp() {
    const shouldClearTempHp = confirm("Alle Temp HP aller Karten entfernen?");

    if (shouldClearTempHp === false) {
        return;
    }

    for (const creature of creatures) {
        creature.tempHp = 0;
    }

    addCombatLogMessage("Alle Temp HP entfernt.");
    renderCards();
}

function clearConditionsFromHandCards() {
    const shouldClearConditions = confirm("Alle Conditions von Karten auf der Hand entfernen?");

    if (shouldClearConditions === false) {
        return;
    }

    for (const creature of creatures) {
        if (creature.isInCombat === true) {
            creature.conditions = [];
        }
    }

    addCombatLogMessage("Alle Conditions von Handkarten entfernt.");
    renderCards();
}

function endCombat() {
    const shouldEndCombat = confirm(
        "Kampf beenden? Alle Karten auf der Hand werden ins Deck verschoben. Temp HP und Conditions bleiben erhalten."
    );

    if (shouldEndCombat === false) {
        return;
    }

    const handCardsBeforeEnd = getHandCards();
    const movedCardCount = handCardsBeforeEnd.length;

    let movedCardNamesText = "keine Karten";

    if (movedCardCount > 0) {
        movedCardNamesText = createTargetNamesText(handCardsBeforeEnd);
    }

    for (const creature of creatures) {
        if (creature.isInCombat === true) {
            creature.isInCombat = false;
        }

        creature.isSelected = false;
    }

    currentTurnIndex = 0;
    roundNumber = 1;
    clearManualPublicSelection();

    if (editingCreatureId !== null) {
        const editedCreature = getEditFormCreature();

        if (editedCreature !== null) {
            setCheckboxValue("edit-creature-is-in-combat", editedCreature.isInCombat === true);
        }
    }

    addCombatLogMessage(
        `Kampf beendet. ${movedCardCount} Karte(n) ins Deck verschoben: ${movedCardNamesText}.`
    );

    renderCards();
}

function deleteAllCards() {
    const shouldDeleteAllCards = confirm("Wirklich alle Karten löschen?");

    if (shouldDeleteAllCards === false) {
        return;
    }

    creatures = [];
    currentTurnIndex = 0;
    roundNumber = 1;
    combatLogMessages = [];
    clearManualPublicSelection();
    addCombatLogMessage("Alle Karten gelöscht.");

    renderCards();
}


// ============================================================
// 7. HP und Kampfaktionen
// ============================================================

function getHpChangeAmount(creatureId) {
    const inputElement = document.querySelector(`#hp-change-amount-${creatureId}`);

    if (inputElement === null) {
        return 0;
    }

    return Number(inputElement.value);
}

function applyDamage(creature, amount) {
    if (creature === null) {
        return;
    }

    if (amount < 0) {
        return;
    }

    if (amount <= creature.tempHp) {
        creature.tempHp = creature.tempHp - amount;
        return;
    }

    const remainingDamage = amount - creature.tempHp;

    creature.tempHp = 0;
    creature.hp = Math.max(0, creature.hp - remainingDamage);
}

function applyHealing(creature, amount) {
    if (creature === null) {
        return;
    }

    if (amount < 0) {
        return;
    }

    creature.hp = Math.min(creature.maxHp, creature.hp + amount);
}

function applyTempHp(creature, amount) {
    if (creature === null) {
        return;
    }

    if (amount < 0) {
        return;
    }

    creature.tempHp = amount;
}

function handleDamageButtonClick(creatureId) {
    const creature = findCreatureById(creatureId);
    const amount = getHpChangeAmount(creatureId);

    applyDamage(creature, amount);
    renderCards();
}

function handleHealingButtonClick(creatureId) {
    const creature = findCreatureById(creatureId);
    const amount = getHpChangeAmount(creatureId);

    applyHealing(creature, amount);
    renderCards();
}

function handleTempHpButtonClick(creatureId) {
    const creature = findCreatureById(creatureId);
    const amount = getHpChangeAmount(creatureId);

    applyTempHp(creature, amount);
    renderCards();
}


function getGroupActionAmount() {
    const inputElement = document.querySelector("#group-action-amount");

    if (inputElement === null) {
        return 0;
    }

    return Number(inputElement.value);
}

function getSelectedGroupCondition() {
    const selectElement = document.querySelector("#group-condition-select");

    if (selectElement === null) {
        return "";
    }

    return selectElement.value;
}

function getCurrentTimeText() {
    const now = new Date();

    return now.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function createTargetNamesText(targets) {
    return targets.map(function(creature) {
        return creature.name;
    }).join(", ");
}

function addCombatLogMessage(message) {
    combatLogMessages.unshift({
        time: getCurrentTimeText(),
        text: message
    });

    if (combatLogMessages.length > 12) {
        combatLogMessages = combatLogMessages.slice(0, 12);
    }
}

function renderCombatLog() {
    const combatLogElement = document.querySelector("#combat-log-list");

    if (combatLogElement === null) {
        return;
    }

    if (combatLogMessages.length === 0) {
        combatLogElement.innerHTML = `
            <p class="combat-log-empty">
                Noch keine Aktionen.
            </p>
        `;

        return;
    }

    let html = "";

    for (const logMessage of combatLogMessages) {
        html += `
            <article class="combat-log-entry">
                <span class="combat-log-time">${logMessage.time}</span>
                <span class="combat-log-text">${logMessage.text}</span>
            </article>
        `;
    }

    combatLogElement.innerHTML = html;
}

function getValidatedGroupActionAmount() {
    const amount = getGroupActionAmount();

    if (Number.isFinite(amount) === false || amount < 0) {
        alert("Bitte gib einen gültigen Betrag ab 0 ein.");
        return null;
    }

    return Math.floor(amount);
}

function getSelectedTargetsOrWarn() {
    const selectedTargets = getSelectedHandCards();

    if (selectedTargets.length === 0) {
        alert("Bitte wähle zuerst mindestens eine Karte auf der Hand aus.");
        return [];
    }

    return selectedTargets;
}

function applyDamageToSelectedCards() {
    const selectedTargets = getSelectedTargetsOrWarn();

    if (selectedTargets.length === 0) {
        return;
    }

    const amount = getValidatedGroupActionAmount();

    if (amount === null) {
        return;
    }

    for (const creature of selectedTargets) {
        applyDamage(creature, amount);
    }

    addCombatLogMessage(`${amount} Schaden auf ${selectedTargets.length} Ziel(e): ${createTargetNamesText(selectedTargets)}.`);
    renderCards();
}

function applyHealingToSelectedCards() {
    const selectedTargets = getSelectedTargetsOrWarn();

    if (selectedTargets.length === 0) {
        return;
    }

    const amount = getValidatedGroupActionAmount();

    if (amount === null) {
        return;
    }

    for (const creature of selectedTargets) {
        applyHealing(creature, amount);
    }

    addCombatLogMessage(`${amount} Heilung auf ${selectedTargets.length} Ziel(e): ${createTargetNamesText(selectedTargets)}.`);
    renderCards();
}

function applyTempHpToSelectedCards() {
    const selectedTargets = getSelectedTargetsOrWarn();

    if (selectedTargets.length === 0) {
        return;
    }

    const amount = getValidatedGroupActionAmount();

    if (amount === null) {
        return;
    }

    for (const creature of selectedTargets) {
        applyTempHp(creature, amount);
    }

    addCombatLogMessage(`${amount} Temp HP auf ${selectedTargets.length} Ziel(e) gesetzt: ${createTargetNamesText(selectedTargets)}.`);
    renderCards();
}

function addConditionToSelectedCards() {
    const selectedTargets = getSelectedTargetsOrWarn();

    if (selectedTargets.length === 0) {
        return;
    }

    const conditionName = getSelectedGroupCondition();

    if (conditionName === "") {
        alert("Bitte wähle eine Condition aus.");
        return;
    }

    for (const creature of selectedTargets) {
        if (creatureHasCondition(creature, conditionName) === false) {
            creature.conditions.push(conditionName);
        }
    }

    addCombatLogMessage(`Condition ${conditionName} auf ${selectedTargets.length} Ziel(e) angewendet: ${createTargetNamesText(selectedTargets)}.`);
    renderCards();
}

function removeConditionFromSelectedCards() {
    const selectedTargets = getSelectedTargetsOrWarn();

    if (selectedTargets.length === 0) {
        return;
    }

    const conditionName = getSelectedGroupCondition();

    if (conditionName === "") {
        alert("Bitte wähle eine Condition aus.");
        return;
    }

    for (const creature of selectedTargets) {
        creature.conditions = creature.conditions.filter(function(condition) {
            return condition !== conditionName;
        });
    }

    addCombatLogMessage(`Condition ${conditionName} von ${selectedTargets.length} Ziel(e) entfernt: ${createTargetNamesText(selectedTargets)}.`);
    renderCards();
}

function getHpPercent(creature) {
    const rawPercent = Math.round((creature.hp / creature.maxHp) * 100);

    if (rawPercent < 0) {
        return 0;
    }

    if (rawPercent > 100) {
        return 100;
    }

    return rawPercent;
}

function getTempHpPercent(creature) {
    if (creature.maxHp <= 0) {
        return 0;
    }

    const rawPercent = Math.round((creature.tempHp / creature.maxHp) * 100);

    if (rawPercent < 0) {
        return 0;
    }

    if (rawPercent > 100) {
        return 100;
    }

    return rawPercent;
}

function getHpDescription(creature) {
    const hpPercent = getHpPercent(creature);

    if (creature.hp === 0) {
        return "besiegt / bewusstlos";
    }

    if (hpPercent === 100) {
        return "unverletzt";
    }

    if (hpPercent > 50) {
        return "leicht verletzt";
    }

    if (hpPercent > 25) {
        return "schwer verletzt";
    }

    return "fast besiegt";
}

function getHpVisibilityLabel(creature) {
    if (creature.hpVisibility === "full") {
        return "full";
    }

    if (creature.hpVisibility === "bar") {
        return "bar";
    }

    if (creature.hpVisibility === "descriptive") {
        return "Zustand";
    }

    if (creature.hpVisibility === "hidden") {
        return "verborgen";
    }

    return "unbekannt";
}


// ============================================================
// 8. Conditions
// ============================================================

function createConditionOptionsHtml() {
    let html = "";

    for (const condition of availableConditions) {
        html += `
            <option value="${condition}">
                ${condition}
            </option>
        `;
    }

    return html;
}

function createEditConditionCheckboxesHtml() {
    let html = "";

    for (const condition of availableConditions) {
        html += `
            <label class="condition-checkbox-field ${getConditionClassName(condition)}">
                <input
                    class="edit-condition-checkbox"
                    type="checkbox"
                    value="${condition}"
                >
                <span>${condition}</span>
            </label>
        `;
    }

    return html;
}

function renderEditConditionCheckboxes() {
    const conditionListElement = document.querySelector("#edit-creature-condition-list");

    if (conditionListElement === null) {
        return;
    }

    conditionListElement.innerHTML = createEditConditionCheckboxesHtml();
}

function setEditConditionCheckboxes(creature) {
    const checkboxElements = document.querySelectorAll(".edit-condition-checkbox");

    for (const checkboxElement of checkboxElements) {
        checkboxElement.checked = creature.conditions.includes(checkboxElement.value);
    }
}

function getEditConditionValues() {
    const selectedConditions = [];
    const checkboxElements = document.querySelectorAll(".edit-condition-checkbox");

    for (const checkboxElement of checkboxElements) {
        if (checkboxElement.checked === true) {
            selectedConditions.push(checkboxElement.value);
        }
    }

    return selectedConditions;
}

function getSelectedCondition(creatureId) {
    const selectElement = document.querySelector(`#condition-select-${creatureId}`);

    if (selectElement === null) {
        return "";
    }

    return selectElement.value;
}

function creatureHasCondition(creature, conditionName) {
    return creature.conditions.includes(conditionName);
}

function addConditionToCreature(creatureId) {
    const creature = findCreatureById(creatureId);

    if (creature === null) {
        return;
    }

    const conditionName = getSelectedCondition(creatureId);

    if (conditionName === "") {
        return;
    }

    if (creatureHasCondition(creature, conditionName)) {
        return;
    }

    creature.conditions.push(conditionName);

    renderCards();
}

function removeConditionFromCreature(creatureId, conditionName) {
    const creature = findCreatureById(creatureId);

    if (creature === null) {
        return;
    }

    creature.conditions = creature.conditions.filter(function(condition) {
        return condition !== conditionName;
    });

    renderCards();
}

function getConditionClassName(conditionName) {
    return `condition-${conditionName}`;
}


// ============================================================
// 9. Bilder lokal einlesen
// ============================================================

function readImageFileAsDataUrl(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();

        reader.addEventListener("load", function() {
            resolve(reader.result);
        });

        reader.addEventListener("error", function() {
            reject(new Error("Das Bild konnte nicht gelesen werden."));
        });

        reader.readAsDataURL(file);
    });
}


// ============================================================
// 10. Encounter exportieren und importieren
// ============================================================

function createEncounterExportData() {
    return {
        formatName: "Miriel\'s Deck of Encounters Encounter",
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        encounter: {
            roundNumber: roundNumber,
            currentTurnIndex: currentTurnIndex,
            manuallySelectedPublicCardId: manuallySelectedPublicCardId,
            combatLogMessages: combatLogMessages,
            creatures: creatures
        }
    };
}

function createExportFileName() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `miriels-deck-encounter-${year}-${month}-${day}-${hours}-${minutes}.json`;
}

function downloadTextFile(fileName, textContent) {
    const fileBlob = new Blob([textContent], {
        type: "application/json"
    });

    const temporaryUrl = URL.createObjectURL(fileBlob);

    const downloadLink = document.createElement("a");
    downloadLink.href = temporaryUrl;
    downloadLink.download = fileName;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(temporaryUrl);
}

function exportEncounter() {
    const exportData = createEncounterExportData();
    const jsonText = JSON.stringify(exportData, null, 4);
    const fileName = createExportFileName();

    downloadTextFile(fileName, jsonText);
}

function triggerEncounterImport() {
    const fileInputElement = document.querySelector("#encounter-import-file");

    if (fileInputElement === null) {
        alert("Das Import-Dateifeld wurde nicht gefunden.");
        return;
    }

    fileInputElement.value = "";
    fileInputElement.click();
}

function readTextFile(file) {
    return new Promise(function(resolve, reject) {
        const reader = new FileReader();

        reader.addEventListener("load", function() {
            resolve(reader.result);
        });

        reader.addEventListener("error", function() {
            reject(new Error("Die Datei konnte nicht gelesen werden."));
        });

        reader.readAsText(file);
    });
}

async function handleEncounterImportFileChange(event) {
    const fileInputElement = event.target;

    if (fileInputElement.files.length === 0) {
        return;
    }

    const importFile = fileInputElement.files[0];

    try {
        const fileText = await readTextFile(importFile);
        const importData = JSON.parse(fileText);

        importEncounterData(importData);
    } catch (error) {
        alert("Die Encounter-Datei konnte nicht importiert werden.");
    }
}

function importEncounterData(importData) {
    const shouldImport = confirm(
        "Diesen Encounter importieren? Der aktuelle Zustand wird ersetzt."
    );

    if (shouldImport === false) {
        return;
    }

    const encounterData = getEncounterDataFromImport(importData);

    if (encounterData === null) {
        alert("Die Datei enthält keinen gültigen Encounter.");
        return;
    }

    const importedCreatures = createImportedCreatures(encounterData.creatures);

    creatures = importedCreatures;
    roundNumber = getSafePositiveInteger(encounterData.roundNumber, 1);
    currentTurnIndex = getSafeNonNegativeInteger(encounterData.currentTurnIndex, 0);

    if (isImportedPublicSelectionValid(encounterData.manuallySelectedPublicCardId, creatures)) {
        manuallySelectedPublicCardId = Number(encounterData.manuallySelectedPublicCardId);
    } else {
        clearManualPublicSelection();
    }

    combatLogMessages = getSafeCombatLogMessages(encounterData.combatLogMessages);

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}

function getEncounterDataFromImport(importData) {
    if (importData === null || typeof importData !== "object") {
        return null;
    }

    if (
        importData.encounter !== undefined &&
        importData.encounter !== null &&
        typeof importData.encounter === "object" &&
        Array.isArray(importData.encounter.creatures)
    ) {
        return importData.encounter;
    }

    if (Array.isArray(importData.creatures)) {
        return importData;
    }

    if (Array.isArray(importData)) {
        return {
            roundNumber: 1,
            currentTurnIndex: 0,
            manuallySelectedPublicCardId: null,
            creatures: importData
        };
    }

    return null;
}

function createImportedCreatures(rawCreatures) {
    const importedCreatures = [];
    const usedIds = [];

    for (const rawCreature of rawCreatures) {
        if (rawCreature !== null && typeof rawCreature === "object") {
            const importedCreature = createImportedCreature(rawCreature, usedIds);

            importedCreatures.push(importedCreature);
            usedIds.push(importedCreature.id);
        }
    }

    return importedCreatures;
}

function createImportedCreature(rawCreature, usedIds) {
    const id = createImportedCreatureId(rawCreature.id, usedIds);

    const maxHp = getSafePositiveInteger(rawCreature.maxHp, 1);
    const hp = clampNumber(
        getSafeNonNegativeInteger(rawCreature.hp, maxHp),
        0,
        maxHp
    );

    return {
        id: id,
        name: getSafeString(rawCreature.name, `Karte ${id}`),
        publicName: getSafeString(rawCreature.publicName, `Karte ${id}`),
        type: getSafeCreatureType(rawCreature.type),
        initiative: getSafeInteger(rawCreature.initiative, 0),
        hp: hp,
        maxHp: maxHp,
        tempHp: getSafeNonNegativeInteger(rawCreature.tempHp, 0),
        armorClass: getSafeNonNegativeInteger(rawCreature.armorClass, 10),
        passivePerception: getSafeNonNegativeInteger(rawCreature.passivePerception, 10),
        passiveInsight: getSafeNonNegativeInteger(rawCreature.passiveInsight, 10),
        hpVisibility: getSafeHpVisibility(rawCreature.hpVisibility),
        imageData: getSafeString(rawCreature.imageData, ""),
        conditions: getSafeConditions(rawCreature.conditions),
        isInCombat: rawCreature.isInCombat === true,
        isSelected: rawCreature.isSelected === true
    };
}

function createImportedCreatureId(rawId, usedIds) {
    const numericId = Number(rawId);

    if (
        Number.isInteger(numericId) &&
        numericId > 0 &&
        usedIds.includes(numericId) === false
    ) {
        return numericId;
    }

    let nextId = 1;

    while (usedIds.includes(nextId)) {
        nextId = nextId + 1;
    }

    return nextId;
}

function isImportedPublicSelectionValid(importedSelectionId, importedCreatures) {
    if (importedSelectionId === null) {
        return false;
    }

    const numericSelectionId = Number(importedSelectionId);

    if (Number.isInteger(numericSelectionId) === false) {
        return false;
    }

    for (const creature of importedCreatures) {
        if (creature.id === numericSelectionId) {
            return true;
        }
    }

    return false;
}

function getSafeString(value, fallbackValue) {
    if (typeof value !== "string") {
        return fallbackValue;
    }

    const trimmedValue = value.trim();

    if (trimmedValue === "") {
        return fallbackValue;
    }

    return trimmedValue;
}

function getSafeInteger(value, fallbackValue) {
    const numberValue = Number(value);

    if (Number.isInteger(numberValue)) {
        return numberValue;
    }

    return fallbackValue;
}

function getSafePositiveInteger(value, fallbackValue) {
    const numberValue = Number(value);

    if (Number.isInteger(numberValue) && numberValue > 0) {
        return numberValue;
    }

    return fallbackValue;
}

function getSafeNonNegativeInteger(value, fallbackValue) {
    const numberValue = Number(value);

    if (Number.isInteger(numberValue) && numberValue >= 0) {
        return numberValue;
    }

    return fallbackValue;
}

function clampNumber(value, minimum, maximum) {
    if (value < minimum) {
        return minimum;
    }

    if (value > maximum) {
        return maximum;
    }

    return value;
}

function getSafeCreatureType(value) {
    if (value === "player" || value === "npc" || value === "monster") {
        return value;
    }

    return "monster";
}

function getSafeHpVisibility(value) {
    if (
        value === "full" ||
        value === "bar" ||
        value === "descriptive" ||
        value === "hidden"
    ) {
        return value;
    }

    return "full";
}

function getSafeConditions(value) {
    if (Array.isArray(value) === false) {
        return [];
    }

    const safeConditions = [];

    for (const condition of value) {
        if (
            availableConditions.includes(condition) &&
            safeConditions.includes(condition) === false
        ) {
            safeConditions.push(condition);
        }
    }

    return safeConditions;
}

function getSafeCombatLogMessages(value) {
    if (Array.isArray(value) === false) {
        return [];
    }

    const safeMessages = [];

    for (const rawMessage of value) {
        if (rawMessage !== null && typeof rawMessage === "object") {
            const safeTime = getSafeString(rawMessage.time, "--:--:--");
            const safeText = getSafeString(rawMessage.text, "Unbekannte Aktion.");

            safeMessages.push({
                time: safeTime,
                text: safeText
            });
        }
    }

    return safeMessages.slice(0, 12);
}


// ============================================================
// 11. Öffentliche Spieler-Daten
// ============================================================

function createPublicHpData(creature) {
    const hasTempHp = creature.tempHp > 0;

    if (creature.hpVisibility === "full") {
        return {
            mode: "full",
            hp: creature.hp,
            maxHp: creature.maxHp,
            percent: getHpPercent(creature),
            tempHp: creature.tempHp,
            hasTempHp: hasTempHp,
            tempHpPercent: getTempHpPercent(creature)
        };
    }

    if (creature.hpVisibility === "bar") {
        return {
            mode: "bar",
            percent: getHpPercent(creature),
            hasTempHp: hasTempHp,
            tempHpPercent: getTempHpPercent(creature)
        };
    }

    if (creature.hpVisibility === "descriptive") {
        return {
            mode: "descriptive",
            description: getHpDescription(creature),
            hasTempHp: hasTempHp
        };
    }

    return {
        mode: "hidden"
    };
}

function createPublicCardData(creature, isActive, isFocused) {
    return {
        id: creature.id,
        publicName: creature.publicName,
        type: creature.type,
        imageData: creature.imageData || "",
        hp: createPublicHpData(creature),
        conditions: [...creature.conditions],
        isActive: isActive,
        isFocused: isFocused
    };
}

function shouldPublicCardBeFocused(card, activeCard) {
    const isActive = activeCard !== null && card.id === activeCard.id;

    if (shouldPublicPreviewFollowActiveCard()) {
        return isActive;
    }

    return isCreatureManuallySelected(card);
}

function createPublicEncounterState(handCards, activeCard) {
    const publicCards = [];

    for (const card of handCards) {
        const isActive = activeCard !== null && card.id === activeCard.id;
        const isFocused = shouldPublicCardBeFocused(card, activeCard);

        const publicCard = createPublicCardData(card, isActive, isFocused);

        publicCards.push(publicCard);
    }

    return publicCards;
}

function getFocusedPublicCardIndex(publicCards) {
    let focusedIndex = publicCards.findIndex(function(publicCard) {
        return publicCard.isFocused === true;
    });

    if (focusedIndex !== -1) {
        return focusedIndex;
    }

    focusedIndex = publicCards.findIndex(function(publicCard) {
        return publicCard.isActive === true;
    });

    if (focusedIndex !== -1) {
        return focusedIndex;
    }

    return 0;
}

function getPublicTurnWindow(publicCards) {
    if (publicCards.length === 0) {
        return {
            previousCard: null,
            focusedCard: null,
            nextCard: null
        };
    }

    const focusedIndex = getFocusedPublicCardIndex(publicCards);

    if (publicCards.length === 1) {
        return {
            previousCard: null,
            focusedCard: publicCards[focusedIndex],
            nextCard: null
        };
    }

    const previousIndex = (focusedIndex - 1 + publicCards.length) % publicCards.length;
    const nextIndex = (focusedIndex + 1) % publicCards.length;

    return {
        previousCard: publicCards[previousIndex],
        focusedCard: publicCards[focusedIndex],
        nextCard: publicCards[nextIndex]
    };
}


// ============================================================
// 12. HTML-Erzeugung: Bilder, HP und Conditions
// ============================================================

function createCreatureImageHtml(creature) {
    if (creature.imageData === "") {
        return `
            <div class="creature-image-box creature-image-placeholder">
                Bild folgt
            </div>
        `;
    }

    return `
        <div class="creature-image-box">
            <img
                class="creature-image"
                src="${creature.imageData}"
                alt="Bild von ${creature.publicName}"
            >
        </div>
    `;
}

function createPublicImageHtml(publicCard) {
    if (publicCard.imageData === "") {
        return `
            <div class="public-preview-image-box public-preview-image-placeholder">
                Bild folgt
            </div>
        `;
    }

    return `
        <div class="public-preview-image-box">
            <img
                class="public-preview-image"
                src="${publicCard.imageData}"
                alt="Bild von ${publicCard.publicName}"
            >
        </div>
    `;
}

function createDmHpBarHtml(creature) {
    const hpPercent = getHpPercent(creature);

    return `
        <div class="hp-display">
            <div class="hp-bar-outer">
                <div
                    class="hp-bar-inner"
                    style="width: ${hpPercent}%;"
                ></div>
            </div>
        </div>
    `;
}

function getPublicHpDisplayHtml(creature) {
    return `
        <div class="hp-display">
            <p>Spieler sehen: ${getHpVisibilityLabel(creature)}</p>
        </div>
    `;
}

function getPublicTempHpTextHtml(publicCard) {
    if (publicCard.hp.hasTempHp !== true) {
        return "";
    }

    if (publicCard.hp.mode === "full") {
        return `
            <p class="public-temp-hp-text">
                Temp HP: ${publicCard.hp.tempHp}
            </p>
        `;
    }

    if (publicCard.hp.mode === "descriptive") {
        return `
            <p class="public-temp-hp-text">
                Temp HP vorhanden
            </p>
        `;
    }

    return "";
}

function getPublicTempHpBarHtml(publicCard) {
    if (publicCard.hp.hasTempHp !== true) {
        return "";
    }

    if (publicCard.hp.mode !== "full" && publicCard.hp.mode !== "bar") {
        return "";
    }

    return `
        <div class="temp-hp-bar-outer" title="Temp HP">
            <div
                class="temp-hp-bar-inner"
                style="width: ${publicCard.hp.tempHpPercent}%;"
            ></div>
        </div>
    `;
}

function getPublicHpPreviewHtml(publicCard) {
    if (publicCard.hp.mode === "full") {
        return `
            <div class="public-preview-section-box">
                <h4>HP</h4>
                <p>${publicCard.hp.hp} / ${publicCard.hp.maxHp} HP</p>
                ${getPublicTempHpTextHtml(publicCard)}

                <div class="hp-bar-outer">
                    <div
                        class="hp-bar-inner"
                        style="width: ${publicCard.hp.percent}%;"
                    ></div>
                </div>

                ${getPublicTempHpBarHtml(publicCard)}
            </div>
        `;
    }

    if (publicCard.hp.mode === "bar") {
        return `
            <div class="public-preview-section-box">
                <h4>HP</h4>

                <div class="hp-bar-outer">
                    <div
                        class="hp-bar-inner"
                        style="width: ${publicCard.hp.percent}%;"
                    ></div>
                </div>

                ${getPublicTempHpBarHtml(publicCard)}
            </div>
        `;
    }

    if (publicCard.hp.mode === "descriptive") {
        return `
            <div class="public-preview-section-box">
                <h4>HP</h4>
                <p>${publicCard.hp.description}</p>
                ${getPublicTempHpTextHtml(publicCard)}
            </div>
        `;
    }

    return `
        <div class="public-preview-section-box">
            <h4>HP</h4>
            <p>HP verborgen</p>
        </div>
    `;
}

function createConditionChipsHtml(creature) {
    if (creature.conditions.length === 0) {
        return `
            <p class="condition-empty">
                Keine Conditions.
            </p>
        `;
    }

    let html = "";

    for (const condition of creature.conditions) {
        html += `
            <span class="condition-chip ${getConditionClassName(condition)}">
                <span class="condition-chip-name">
                    ${condition}
                </span>
            </span>
        `;
    }

    return html;
}

function createPublicConditionChipsHtml(publicCard) {
    if (publicCard.conditions.length === 0) {
        return `
            <p class="condition-empty">
                Keine Conditions sichtbar.
            </p>
        `;
    }

    let html = "";

    for (const condition of publicCard.conditions) {
        html += `
            <span class="condition-chip ${getConditionClassName(condition)}">
                <span class="condition-chip-name">
                    ${condition}
                </span>
            </span>
        `;
    }

    return html;
}


// ============================================================
// 13. HTML-Erzeugung: Öffentliche Spieler-Vorschau
// ============================================================

function getPublicStageLabel(slotName) {
    if (slotName === "previous") {
        return "Vorher";
    }

    if (slotName === "next") {
        return "Als Nächstes";
    }

    if (shouldPublicPreviewFollowActiveCard()) {
        return "Jetzt am Zug";
    }

    return "Ausgewählt";
}

function getPublicStageFocusClass(slotName) {
    if (slotName !== "focused") {
        return "";
    }

    if (shouldPublicPreviewFollowActiveCard()) {
        return "auto-active-focus";
    }

    return "manual-selected-focus";
}

function createEmptyPublicStageCardHtml(slotName) {
    const label = getPublicStageLabel(slotName);

    return `
        <div class="public-stage-slot ${slotName}">
            <p class="public-stage-slot-label">
                ${label}
            </p>

            <article class="public-stage-card">
                <div class="public-stage-card-inner">
                    <h3 class="public-stage-title">
                        Keine Karte
                    </h3>

                    <div class="public-preview-image-box public-preview-image-placeholder">
                        -
                    </div>
                </div>
            </article>
        </div>
    `;
}

function createPublicStageCardHtml(publicCard, slotName) {
    if (publicCard === null) {
        return createEmptyPublicStageCardHtml(slotName);
    }

    const label = getPublicStageLabel(slotName);
    const sideClass = slotName === "focused" ? "focused" : "side";
    const focusColorClass = getPublicStageFocusClass(slotName);

    return `
        <div class="public-stage-slot ${slotName} ${sideClass} ${focusColorClass}">
            <p class="public-stage-slot-label">
                ${label}
            </p>

            <article
                class="public-stage-card"
                data-creature-id="${publicCard.id}"
                onclick="focusPublicCard(${publicCard.id})"
                title="Diese Karte groß anzeigen"
            >
                <div class="public-stage-card-inner">
                    <h3 class="public-stage-title">
                        ${publicCard.publicName}
                    </h3>

                    ${createPublicImageHtml(publicCard)}

                    <p class="public-preview-type">
                        ${publicCard.type}
                    </p>

                    ${getPublicHpPreviewHtml(publicCard)}

                    <div class="public-preview-section-box">
                        <h4>Conditions</h4>

                        <div class="condition-chip-list">
                            ${createPublicConditionChipsHtml(publicCard)}
                        </div>
                    </div>
                </div>
            </article>
        </div>
    `;
}

function createPublicRibbonCardHtml(publicCard) {
    const activeTurnClass = publicCard.isActive === true
        ? "active-turn-card"
        : "";

    const selectedCardClass = isPublicCardManuallySelected(publicCard)
        ? "selected-card"
        : "";

    return `
        <article
            class="public-ribbon-card ${activeTurnClass} ${selectedCardClass}"
            data-creature-id="${publicCard.id}"
            onclick="focusPublicCard(${publicCard.id})"
            title="Diese Karte groß anzeigen"
        >
            <div class="public-ribbon-marker"></div>

            <div class="public-ribbon-image-crop">
                ${createPublicImageHtml(publicCard)}
            </div>

            <div class="public-ribbon-text">
                <strong>${publicCard.publicName}</strong>
                <span>${publicCard.isActive ? "am Zug" : publicCard.type}</span>
            </div>
        </article>
    `;
}

function createPublicTurnStatusHtml(handCards, activeCard) {
    if (activeCard === null) {
        return `
            <div class="public-turn-status">
                <div class="public-turn-status-item">
                    <span>Runde</span>
                    <strong>-</strong>
                </div>

                <div class="public-turn-status-item">
                    <span>Turn</span>
                    <strong>-</strong>
                </div>

                <div class="public-turn-status-item public-turn-status-active">
                    <span>Am Zug</span>
                    <strong>Niemand</strong>
                </div>
            </div>
        `;
    }

    return `
        <div class="public-turn-status">
            <div class="public-turn-status-item">
                <span>Runde</span>
                <strong>${roundNumber}</strong>
            </div>

            <div class="public-turn-status-item">
                <span>Turn</span>
                <strong>${currentTurnIndex + 1} / ${handCards.length}</strong>
            </div>

            <div class="public-turn-status-item public-turn-status-active">
                <span>Am Zug</span>
                <strong>${activeCard.publicName}</strong>
            </div>
        </div>
    `;
}


// ============================================================
// 14. HTML-Erzeugung: DM-Karten
// ============================================================

function createCardMenuHtml(creature) {
    const isOnHand = creature.isInCombat === true;

    const moveToHandDisabled = isOnHand ? "disabled" : "";
    const moveToDeckDisabled = isOnHand ? "" : "disabled";

    return `
        <details class="card-menu" onclick="event.stopPropagation()">
            <summary
                class="card-menu-summary"
                title="Kartenmenü öffnen"
                aria-label="Kartenmenü öffnen"
            >
                ☰
            </summary>

            <div class="card-menu-panel">
                <button onclick="openEditCreatureForm(${creature.id})">
                    Karte bearbeiten
                </button>

                <button
                    class="card-menu-danger"
                    onclick="removeCreatureById(${creature.id})"
                >
                    Karte entfernen
                </button>

                <button
                    onclick="moveCardToHand(${creature.id})"
                    ${moveToHandDisabled}
                >
                    Karte auf die Hand nehmen
                </button>

                <button
                    onclick="moveCardToDeck(${creature.id})"
                    ${moveToDeckDisabled}
                >
                    Karte ins Deck verschieben
                </button>
            </div>
        </details>
    `;
}

function createCreatureCardHtml(creature, isActive) {
    const isCompactDeckCard = creature.isInCombat === false;

    const selectableCardClass = "selectable-card";

    const selectedTargetCardClass = creature.isInCombat === true && creature.isSelected === true
        ? "selected-target-card"
        : "";

    const selectedDeckCardClass = creature.isInCombat === false && creature.isSelected === true
        ? "selected-deck-card"
        : "";

    const selectionClickAttribute = `onclick="toggleCreatureSelection(${creature.id})"`;

    let selectedTargetLabelHtml = "";

    if (creature.isInCombat === true && creature.isSelected === true) {
        selectedTargetLabelHtml = `<span class="selected-target-label">Ziel</span>`;
    }

    if (creature.isInCombat === false && creature.isSelected === true) {
        selectedTargetLabelHtml = `<span class="selected-deck-label">Deck-Auswahl</span>`;
    }

    const conditionsSectionHtml = creature.isInCombat === true
        ? `
            <div class="creature-card-section">
                <h4>Conditions</h4>

                <div class="condition-chip-list">
                    ${createConditionChipsHtml(creature)}
                </div>
            </div>
        `
        : "";

    return `
        <article
            class="creature-card ${isActive ? "active" : ""} ${isCompactDeckCard ? "deck-card-compact" : ""} ${selectableCardClass} ${selectedTargetCardClass} ${selectedDeckCardClass}"
            ${selectionClickAttribute}
        >
            <div class="creature-card-inner">
                <div class="creature-card-title-row">
                    <div class="creature-card-header">
                        <h3>
                            ${creature.name}
                            <span class="creature-public-alias">
                                aka "${creature.publicName}"
                            </span>
                        </h3>
                    </div>

                    ${createCardMenuHtml(creature)}
                </div>

                ${createCreatureImageHtml(creature)}

                <div class="creature-type-line">
                    <p>
                        ${creature.type} · ${creature.isInCombat ? "auf der Hand" : "im Deck"}
                    </p>

                    ${selectedTargetLabelHtml}
                </div>

                <div class="creature-card-section">
                    <h4>HP</h4>

                    <div class="creature-stat-grid">
                        <p>Aktuell: ${creature.hp} / ${creature.maxHp}</p>
                        <p>Temp: ${creature.tempHp}</p>
                    </div>

                    ${createDmHpBarHtml(creature)}
                    ${getPublicHpDisplayHtml(creature)}
                </div>

                <div class="creature-card-section">
                    <h4>Kampfwerte</h4>

                    <div class="creature-stat-grid">
                        <p>Ini: ${creature.initiative}</p>
                        <p>AC: ${creature.armorClass}</p>
                    </div>
                </div>

                <div class="creature-card-section">
                    <h4>Passive Werte</h4>

                    <div class="creature-stat-grid">
                        <p>Perception: ${creature.passivePerception}</p>
                        <p>Insight: ${creature.passiveInsight}</p>
                    </div>
                </div>

                ${conditionsSectionHtml}
            </div>
        </article>
    `;
}

// ============================================================
// 15. Formular: Karte bearbeiten
// ============================================================

function showEditCreatureError(message) {
    const errorElement = document.querySelector("#edit-creature-error");

    if (errorElement === null) {
        return;
    }

    errorElement.textContent = message;
}

function clearEditCreatureError() {
    showEditCreatureError("");
}

function setInputValue(elementId, value) {
    const inputElement = document.querySelector(`#${elementId}`);

    if (inputElement !== null) {
        inputElement.value = value;
    }
}

function setCheckboxValue(elementId, value) {
    const inputElement = document.querySelector(`#${elementId}`);

    if (inputElement !== null) {
        inputElement.checked = value;
    }
}

function getEditFormCreature() {
    if (editingCreatureId === null) {
        return null;
    }

    return findCreatureById(editingCreatureId);
}

function openEditCreatureForm(creatureId) {
    const creature = findCreatureById(creatureId);
    const editSectionElement = document.querySelector("#edit-creature-section");
    const editTitleElement = document.querySelector("#edit-creature-title");
    const imageInputElement = document.querySelector("#edit-creature-image");

    if (creature === null || editSectionElement === null) {
        return;
    }

    editingCreatureId = creatureId;
    clearEditCreatureError();

    if (editTitleElement !== null) {
        editTitleElement.textContent = `Karte bearbeiten: ${creature.name}`;
    }

    setInputValue("edit-creature-name", creature.name);
    setInputValue("edit-creature-public-name", creature.publicName);
    setInputValue("edit-creature-type", creature.type);
    setInputValue("edit-creature-image-path", creature.imageData);
    setInputValue("edit-creature-initiative", creature.initiative);
    setInputValue("edit-creature-hp", creature.hp);
    setInputValue("edit-creature-max-hp", creature.maxHp);
    setInputValue("edit-creature-temp-hp", creature.tempHp);
    setInputValue("edit-creature-ac", creature.armorClass);
    setInputValue("edit-creature-passive-perception", creature.passivePerception);
    setInputValue("edit-creature-passive-insight", creature.passiveInsight);
    setInputValue("edit-creature-hp-visibility", creature.hpVisibility);
    setCheckboxValue("edit-creature-is-in-combat", creature.isInCombat === true);

    renderEditConditionCheckboxes();
    setEditConditionCheckboxes(creature);

    if (imageInputElement !== null) {
        imageInputElement.value = "";
    }

    editSectionElement.classList.remove("edit-creature-section-hidden");
    editSectionElement.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEditCreatureForm() {
    const editSectionElement = document.querySelector("#edit-creature-section");
    const imageInputElement = document.querySelector("#edit-creature-image");

    editingCreatureId = null;
    clearEditCreatureError();

    if (imageInputElement !== null) {
        imageInputElement.value = "";
    }

    if (editSectionElement !== null) {
        editSectionElement.classList.add("edit-creature-section-hidden");
    }
}

async function handleEditCreatureSaveButtonClick() {
    clearEditCreatureError();

    const creature = getEditFormCreature();

    if (creature === null) {
        showEditCreatureError("Es ist keine Karte zum Bearbeiten geöffnet.");
        return;
    }

    const nameInputElement = document.querySelector("#edit-creature-name");
    const publicNameInputElement = document.querySelector("#edit-creature-public-name");
    const typeSelectElement = document.querySelector("#edit-creature-type");
    const imagePathInputElement = document.querySelector("#edit-creature-image-path");
    const imageInputElement = document.querySelector("#edit-creature-image");
    const initiativeInputElement = document.querySelector("#edit-creature-initiative");
    const hpInputElement = document.querySelector("#edit-creature-hp");
    const maxHpInputElement = document.querySelector("#edit-creature-max-hp");
    const tempHpInputElement = document.querySelector("#edit-creature-temp-hp");
    const acInputElement = document.querySelector("#edit-creature-ac");
    const passivePerceptionInputElement = document.querySelector("#edit-creature-passive-perception");
    const passiveInsightInputElement = document.querySelector("#edit-creature-passive-insight");
    const hpVisibilitySelectElement = document.querySelector("#edit-creature-hp-visibility");
    const isInCombatInputElement = document.querySelector("#edit-creature-is-in-combat");
    const conditionListElement = document.querySelector("#edit-creature-condition-list");

    if (
        nameInputElement === null ||
        publicNameInputElement === null ||
        typeSelectElement === null ||
        imagePathInputElement === null ||
        imageInputElement === null ||
        initiativeInputElement === null ||
        hpInputElement === null ||
        maxHpInputElement === null ||
        tempHpInputElement === null ||
        acInputElement === null ||
        passivePerceptionInputElement === null ||
        passiveInsightInputElement === null ||
        hpVisibilitySelectElement === null ||
        isInCombatInputElement === null ||
        conditionListElement === null
    ) {
        showEditCreatureError("Ein Bearbeitungsfeld wurde nicht gefunden. Bitte prüfe die IDs in index.html.");
        return;
    }

    const name = nameInputElement.value.trim();
    const publicName = publicNameInputElement.value.trim();

    const initiative = Number(initiativeInputElement.value);
    const hp = Number(hpInputElement.value);
    const maxHp = Number(maxHpInputElement.value);
    const tempHp = Number(tempHpInputElement.value);
    const armorClass = Number(acInputElement.value);
    const passivePerception = Number(passivePerceptionInputElement.value);
    const passiveInsight = Number(passiveInsightInputElement.value);

    if (name === "") {
        showEditCreatureError("Bitte gib einen internen Namen ein.");
        return;
    }

    if (publicName === "") {
        showEditCreatureError("Bitte gib einen öffentlichen Namen ein.");
        return;
    }

    if (Number.isFinite(initiative) === false) {
        showEditCreatureError("Initiative muss eine Zahl sein.");
        return;
    }

    if (Number.isFinite(hp) === false || hp < 0) {
        showEditCreatureError("HP müssen eine Zahl ab 0 sein.");
        return;
    }

    if (Number.isFinite(maxHp) === false || maxHp <= 0) {
        showEditCreatureError("Max HP müssen größer als 0 sein.");
        return;
    }

    if (hp > maxHp) {
        showEditCreatureError("Aktuelle HP dürfen nicht größer als Max HP sein.");
        return;
    }

    if (Number.isFinite(tempHp) === false || tempHp < 0) {
        showEditCreatureError("Temp HP müssen eine Zahl ab 0 sein.");
        return;
    }

    if (Number.isFinite(armorClass) === false || armorClass < 0) {
        showEditCreatureError("AC muss eine Zahl ab 0 sein.");
        return;
    }

    if (Number.isFinite(passivePerception) === false || passivePerception < 0) {
        showEditCreatureError("Passive Perception muss eine Zahl ab 0 sein.");
        return;
    }

    if (Number.isFinite(passiveInsight) === false || passiveInsight < 0) {
        showEditCreatureError("Passive Insight muss eine Zahl ab 0 sein.");
        return;
    }

    let imageData = imagePathInputElement.value.trim();

    if (imageInputElement.files.length > 0) {
        const imageFile = imageInputElement.files[0];

        try {
            imageData = await readImageFileAsDataUrl(imageFile);
        } catch (error) {
            showEditCreatureError("Das Bild konnte nicht gelesen werden.");
            return;
        }
    }

    const oldName = creature.name;

    creature.name = name;
    creature.publicName = publicName;
    creature.type = typeSelectElement.value;
    creature.initiative = Math.floor(initiative);
    creature.hp = Math.floor(hp);
    creature.maxHp = Math.floor(maxHp);
    creature.tempHp = Math.floor(tempHp);
    creature.armorClass = Math.floor(armorClass);
    creature.passivePerception = Math.floor(passivePerception);
    creature.passiveInsight = Math.floor(passiveInsight);
    creature.hpVisibility = hpVisibilitySelectElement.value;
    creature.imageData = imageData;
    creature.conditions = getEditConditionValues();
    creature.isInCombat = isInCombatInputElement.checked;
    creature.isSelected = false;

    if (manuallySelectedPublicCardId === creature.id && creature.isInCombat === false) {
        clearManualPublicSelection();
    }

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    addCombatLogMessage(`Karte bearbeitet: ${oldName} → ${creature.name}.`);
    closeEditCreatureForm();
    renderCards();
}


// ============================================================
// 16. Formular: Neue Karte hinzufügen
// ============================================================

function showAddCreatureError(message) {
    const errorElement = document.querySelector("#add-creature-error");

    if (errorElement === null) {
        return;
    }

    errorElement.textContent = message;
}

function clearAddCreatureError() {
    showAddCreatureError("");
}

function getNumberedCreatureName(baseName, index, quantity) {
    if (quantity === 1) {
        return baseName;
    }

    return `${baseName} ${index + 1}`;
}

async function handleAddCreatureButtonClick() {
    clearAddCreatureError();

    const nameInputElement = document.querySelector("#new-creature-name");
    const publicNameInputElement = document.querySelector("#new-creature-public-name");
    const typeSelectElement = document.querySelector("#new-creature-type");
    const quantityInputElement = document.querySelector("#new-creature-quantity");
    const imageInputElement = document.querySelector("#new-creature-image");
    const initiativeInputElement = document.querySelector("#new-creature-initiative");
    const hpInputElement = document.querySelector("#new-creature-hp");
    const maxHpInputElement = document.querySelector("#new-creature-max-hp");
    const hpVisibilitySelectElement = document.querySelector("#new-creature-hp-visibility");
    const acInputElement = document.querySelector("#new-creature-ac");
    const passivePerceptionInputElement = document.querySelector("#new-creature-passive-perception");
    const passiveInsightInputElement = document.querySelector("#new-creature-passive-insight");
    const isInCombatInputElement = document.querySelector("#new-creature-is-in-combat");

    if (
        nameInputElement === null ||
        publicNameInputElement === null ||
        typeSelectElement === null ||
        quantityInputElement === null ||
        imageInputElement === null ||
        initiativeInputElement === null ||
        hpInputElement === null ||
        maxHpInputElement === null ||
        hpVisibilitySelectElement === null ||
        acInputElement === null ||
        passivePerceptionInputElement === null ||
        passiveInsightInputElement === null ||
        isInCombatInputElement === null
    ) {
        showAddCreatureError("Ein Formularfeld wurde nicht gefunden. Bitte prüfe die IDs in index.html.");
        return;
    }

    const name = nameInputElement.value.trim();
    const publicName = publicNameInputElement.value.trim();

    const quantity = Number(quantityInputElement.value);
    const initiative = Number(initiativeInputElement.value);
    const hp = Number(hpInputElement.value);
    const maxHp = Number(maxHpInputElement.value);
    const armorClass = Number(acInputElement.value);
    const passivePerception = Number(passivePerceptionInputElement.value);
    const passiveInsight = Number(passiveInsightInputElement.value);

    if (name === "") {
        showAddCreatureError("Bitte gib einen internen Namen ein.");
        return;
    }

    if (publicName === "") {
        showAddCreatureError("Bitte gib einen öffentlichen Namen ein.");
        return;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
        showAddCreatureError("Die Anzahl muss mindestens 1 sein.");
        return;
    }

    if (quantity > 20) {
        showAddCreatureError("Die Anzahl darf höchstens 20 sein.");
        return;
    }

    if (hp < 0) {
        showAddCreatureError("HP dürfen nicht negativ sein.");
        return;
    }

    if (maxHp <= 0) {
        showAddCreatureError("Max HP müssen größer als 0 sein.");
        return;
    }

    if (hp > maxHp) {
        showAddCreatureError("Aktuelle HP dürfen nicht größer als Max HP sein.");
        return;
    }

    if (armorClass < 0) {
        showAddCreatureError("AC darf nicht negativ sein.");
        return;
    }

    if (passivePerception < 0) {
        showAddCreatureError("Passive Perception darf nicht negativ sein.");
        return;
    }

    if (passiveInsight < 0) {
        showAddCreatureError("Passive Insight darf nicht negativ sein.");
        return;
    }

    let imageData = "";

    if (imageInputElement.files.length > 0) {
        const imageFile = imageInputElement.files[0];

        try {
            imageData = await readImageFileAsDataUrl(imageFile);
        } catch (error) {
            showAddCreatureError("Das Bild konnte nicht gelesen werden.");
            return;
        }
    }

    for (let index = 0; index < quantity; index = index + 1) {
        const newCreature = {
            id: getNextCreatureId(),
            name: getNumberedCreatureName(name, index, quantity),
            publicName: getNumberedCreatureName(publicName, index, quantity),
            type: typeSelectElement.value,
            initiative: initiative,
            hp: hp,
            maxHp: maxHp,
            tempHp: 0,
            armorClass: armorClass,
            passivePerception: passivePerception,
            passiveInsight: passiveInsight,
            hpVisibility: hpVisibilitySelectElement.value,
            imageData: imageData,
            conditions: [],
            isInCombat: isInCombatInputElement.checked,
            isSelected: false
        };

        creatures.push(newCreature);
    }

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}


// ============================================================
// 16. Rendering
// ============================================================

function renderTurnInfo(handCards) {
    const turnInfoElement = document.querySelector("#turn-info");

    if (turnInfoElement === null) {
        return;
    }

    const activeCard = getActiveCard(handCards);

    if (activeCard === null) {
        turnInfoElement.innerHTML = `
            <div class="turn-info-main">
                <h2>Runde ${roundNumber}</h2>
                <p>Keine Karten auf der Hand.</p>
            </div>

            <div class="turn-actions turn-actions-inline">
                <button onclick="previousTurn()">Vorheriger Zug</button>
                <button onclick="nextTurn()">Nächster Zug</button>
            </div>
        `;

        return;
    }

    turnInfoElement.innerHTML = `
        <div class="turn-info-main">
            <h2>Runde ${roundNumber}</h2>

            <p class="turn-label">
                Turn ${currentTurnIndex + 1} von ${handCards.length}
            </p>

            <p class="active-creature-name">
                Aktiv: ${activeCard.publicName}
            </p>
        </div>

        <div class="turn-actions turn-actions-inline">
            <button onclick="previousTurn()">Vorheriger Zug</button>
            <button onclick="nextTurn()">Nächster Zug</button>
        </div>
    `;
}

function renderPublicPreview(publicCards, handCards) {
    const previewElement = document.querySelector("#public-preview-list");
    const ribbonElement = document.querySelector("#public-preview-ribbon");
    const activeCard = getActiveCard(handCards);

    if (previewElement === null || ribbonElement === null) {
        return;
    }

    if (publicCards.length === 0) {
        previewElement.innerHTML = `
            <p class="empty-list-message">
                Keine Karten auf der Hand. Die öffentliche Vorschau ist leer.
            </p>
        `;

        ribbonElement.innerHTML = "";
        return;
    }

    const turnWindow = getPublicTurnWindow(publicCards);

    let ribbonHtml = "";

    for (const publicCard of publicCards) {
        ribbonHtml += createPublicRibbonCardHtml(publicCard);
    }

    previewElement.innerHTML = `
        <div class="public-three-card-stage">
            ${createPublicTurnStatusHtml(handCards, activeCard)}

            <div class="public-stage-card-row">
                ${createPublicStageCardHtml(turnWindow.previousCard, "previous")}
                ${createPublicStageCardHtml(turnWindow.focusedCard, "focused")}
                ${createPublicStageCardHtml(turnWindow.nextCard, "next")}
            </div>

            <button
                class="public-focus-reset-button"
                onclick="resetPublicFocusToActiveCard()"
            >
                Aktive Karte anzeigen
            </button>
        </div>
    `;

    ribbonElement.innerHTML = ribbonHtml;
}

function renderCardList(elementId, listCards, activeCard) {
    const listElement = document.querySelector(elementId);

    if (listElement === null) {
        return;
    }

    if (listCards.length === 0) {
        listElement.innerHTML = `
            <p class="empty-list-message">
                Keine Karten vorhanden.
            </p>
        `;
        return;
    }

    let html = "";

    for (const card of listCards) {
        const isActive = activeCard !== null && card.id === activeCard.id;

        html += createCreatureCardHtml(card, isActive);
    }

    listElement.innerHTML = html;
}

function renderCards() {
    const handCards = getHandCards();
    const deckCards = getDeckCards();

    ensureCurrentTurnIndexIsValid(handCards);

    const activeCard = getActiveCard(handCards);
    const publicCards = createPublicEncounterState(handCards, activeCard);

    renderTurnInfo(handCards);
    renderPublicPreview(publicCards, handCards);

    if (appView === "dm") {
        renderCardList("#hand-card-list", handCards, activeCard);
        renderCardList("#deck-card-list", deckCards, activeCard);
        updateSelectionStatus();
        updateDeckSelectionStatus();
        renderCombatLog();
    }

    saveAndBroadcastAppState();
}


// ============================================================
// 17. Start der App
// ============================================================

applyAppViewToPage();
setupCrossTabSync();

const wasStateLoaded = loadAppStateFromBrowser();

if (wasStateLoaded === false && useDemoData === true) {
    creatures = createDemoCreatures();
    updateStorageStatus("Browser-Speicher: leer, Demo-Karten geladen");
}

setupPlayerViewPolling();
setupPublicPreviewNavigation();
renderCards();