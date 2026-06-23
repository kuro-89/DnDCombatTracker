// ============================================================
// 1. Globale Daten und Konstanten
// ============================================================

const useDemoData = true;

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
            isInCombat: true
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
            isInCombat: true
        },
        {
            id: 3,
            name: "Suica",
            publicName: "Suica",
            type: "player",
            initiative: 13,
            hp: 20,
            maxHp: 20,
            tempHp: 5,
            armorClass: 12,
            passivePerception: 11,
            passiveInsight: 13,
            hpVisibility: "full",
            imageData: "Images/suica_img.png",
            conditions: [],
            isInCombat: true
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

    renderCards();
}

function resetCombatTurnCounter() {
    currentTurnIndex = 0;
    roundNumber = 1;
    clearManualPublicSelection();

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
        }
    }

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}

function moveHandCardsOfTypeToDeck(type) {
    for (const creature of creatures) {
        if (creature.isInCombat === true && creature.type === type) {
            creature.isInCombat = false;
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
    clearManualPublicSelection();

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
// 10. Öffentliche Spieler-Daten
// ============================================================

function createPublicHpData(creature) {
    if (creature.hpVisibility === "full") {
        return {
            mode: "full",
            hp: creature.hp,
            maxHp: creature.maxHp,
            percent: getHpPercent(creature)
        };
    }

    if (creature.hpVisibility === "bar") {
        return {
            mode: "bar",
            percent: getHpPercent(creature)
        };
    }

    if (creature.hpVisibility === "descriptive") {
        return {
            mode: "descriptive",
            description: getHpDescription(creature)
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
// 11. HTML-Erzeugung: Bilder, HP und Conditions
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

function getPublicHpPreviewHtml(publicCard) {
    if (publicCard.hp.mode === "full") {
        return `
            <div class="public-preview-section-box">
                <h4>HP</h4>
                <p>${publicCard.hp.hp} / ${publicCard.hp.maxHp} HP</p>

                <div class="hp-bar-outer">
                    <div
                        class="hp-bar-inner"
                        style="width: ${publicCard.hp.percent}%;"
                    ></div>
                </div>
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
            </div>
        `;
    }

    if (publicCard.hp.mode === "descriptive") {
        return `
            <div class="public-preview-section-box">
                <h4>HP</h4>
                <p>${publicCard.hp.description}</p>
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

                <button
                    class="condition-chip-remove"
                    onclick="removeConditionFromCreature(${creature.id}, '${condition}')"
                    title="${condition} entfernen"
                    aria-label="${condition} entfernen"
                >
                    ×
                </button>
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
// 12. HTML-Erzeugung: Öffentliche Spieler-Vorschau
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
// 13. HTML-Erzeugung: DM-Karten
// ============================================================

function createCardMenuHtml(creature) {
    const isOnHand = creature.isInCombat === true;

    const moveToHandDisabled = isOnHand ? "disabled" : "";
    const moveToDeckDisabled = isOnHand ? "" : "disabled";

    return `
        <details class="card-menu">
            <summary
                class="card-menu-summary"
                title="Kartenmenü öffnen"
                aria-label="Kartenmenü öffnen"
            >
                ☰
            </summary>

            <div class="card-menu-panel">
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

    const combatOnlySectionsHtml = isCompactDeckCard
        ? ""
        : `
            <div class="creature-card-section">
                <h4>Conditions</h4>

                <div class="condition-chip-list">
                    ${createConditionChipsHtml(creature)}
                </div>

                <div class="condition-controls">
                    <select id="condition-select-${creature.id}">
                        ${createConditionOptionsHtml()}
                    </select>

                    <button onclick="addConditionToCreature(${creature.id})">
                        Condition hinzufügen
                    </button>
                </div>
            </div>

            <div class="creature-card-section">
                <h4>Kampfaktionen</h4>

                <div class="creature-actions">
                    <input
                        id="hp-change-amount-${creature.id}"
                        type="number"
                        min="0"
                        value="0"
                    >

                    <div class="creature-action-buttons">
                        <button onclick="handleDamageButtonClick(${creature.id})">
                            Schaden
                        </button>

                        <button onclick="handleHealingButtonClick(${creature.id})">
                            Heilung
                        </button>

                        <button onclick="handleTempHpButtonClick(${creature.id})">
                            Temp HP
                        </button>
                    </div>
                </div>
            </div>
        `;

    return `
        <article class="creature-card ${isActive ? "active" : ""} ${isCompactDeckCard ? "deck-card-compact" : ""}">
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

                ${combatOnlySectionsHtml}
            </div>
        </article>
    `;
}


// ============================================================
// 14. Formular: Neue Karte hinzufügen
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
            isInCombat: isInCombatInputElement.checked
        };

        creatures.push(newCreature);
    }

    const handCards = getHandCards();
    ensureCurrentTurnIndexIsValid(handCards);

    renderCards();
}


// ============================================================
// 15. Rendering
// ============================================================

function renderTurnInfo(handCards) {
    const turnInfoElement = document.querySelector("#turn-info");

    if (turnInfoElement === null) {
        return;
    }

    const activeCard = getActiveCard(handCards);

    if (activeCard === null) {
        turnInfoElement.innerHTML = `
            <h2>Runde ${roundNumber}</h2>
            <p>Keine Karten auf der Hand.</p>
        `;

        return;
    }

    turnInfoElement.innerHTML = `
        <h2>Runde ${roundNumber}</h2>

        <p class="turn-label">
            Turn ${currentTurnIndex + 1} von ${handCards.length}
        </p>

        <p class="active-creature-name">
            Aktiv: ${activeCard.publicName}
        </p>
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
    renderCardList("#hand-card-list", handCards, activeCard);
    renderCardList("#deck-card-list", deckCards, activeCard);
}


// ============================================================
// 16. Start der App
// ============================================================

renderCards();