let creatures = [];

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

function getSortedCreatures() {
    const sortedCreatures = [...creatures];

    sortedCreatures.sort(function(a, b) {
        if (a.initiative !== b.initiative) {
            return b.initiative - a.initiative;
        }

        if (a.type === "player" && b.type !== "player") {
            return -1;
        }

        if (a.type !== "player" && b.type === "player") {
            return 1;
        }

        return 0;
    });

    return sortedCreatures;
}

function ensureCurrentTurnIndexIsValid(sortedCreatures) {
    if (sortedCreatures.length === 0) {
        currentTurnIndex = 0;
        roundNumber = 1;
        return;
    }

    if (currentTurnIndex < 0) {
        currentTurnIndex = 0;
    }

    if (currentTurnIndex >= sortedCreatures.length) {
        currentTurnIndex = sortedCreatures.length - 1;
    }
}

function getActiveCreature(sortedCreatures) {
    ensureCurrentTurnIndexIsValid(sortedCreatures);

    if (sortedCreatures.length === 0) {
        return null;
    }

    return sortedCreatures[currentTurnIndex];
}

function nextTurn() {
    const sortedCreatures = getSortedCreatures();

    if (sortedCreatures.length === 0) {
        return;
    }

    currentTurnIndex = currentTurnIndex + 1;

    if (currentTurnIndex >= sortedCreatures.length) {
        currentTurnIndex = 0;
        roundNumber = roundNumber + 1;
    }

    renderCreatures();
}

function previousTurn() {
    const sortedCreatures = getSortedCreatures();

    if (sortedCreatures.length === 0) {
        return;
    }

    currentTurnIndex = currentTurnIndex - 1;

    if (currentTurnIndex < 0) {
        currentTurnIndex = sortedCreatures.length - 1;

        if (roundNumber > 1) {
            roundNumber = roundNumber - 1;
        }
    }

    renderCreatures();
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

    const sortedCreatures = getSortedCreatures();
    ensureCurrentTurnIndexIsValid(sortedCreatures);

    renderCreatures();
}

function getHpChangeAmount(creatureId) {
    const inputElement = document.querySelector(`#hp-change-amount-${creatureId}`);

    if (inputElement === null) {
        return 0;
    }

    return Number(inputElement.value);
}

function handleDamageButtonClick(creatureId) {
    const creature = findCreatureById(creatureId);
    const amount = getHpChangeAmount(creatureId);

    applyDamage(creature, amount);
    renderCreatures();
}

function handleHealingButtonClick(creatureId) {
    const creature = findCreatureById(creatureId);
    const amount = getHpChangeAmount(creatureId);

    applyHealing(creature, amount);
    renderCreatures();
}

function handleTempHpButtonClick(creatureId) {
    const creature = findCreatureById(creatureId);
    const amount = getHpChangeAmount(creatureId);

    applyTempHp(creature, amount);
    renderCreatures();
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

function getPublicHpDisplayHtml(creature) {
    const hpPercent = getHpPercent(creature);

    if (creature.hpVisibility === "full") {
        return `
            <div class="hp-display">
                <p>Spieler sehen: HP ${creature.hp} / ${creature.maxHp}</p>
            </div>
        `;
    }

    if (creature.hpVisibility === "bar") {
        return `
            <div class="hp-display">
                <p>Spieler sehen: HP-Zustand ${hpPercent}%</p>

                <div class="hp-bar-outer">
                    <div
                        class="hp-bar-inner"
                        style="width: ${hpPercent}%;"
                    ></div>
                </div>
            </div>
        `;
    }

    if (creature.hpVisibility === "descriptive") {
        return `
            <div class="hp-display">
                <p>Spieler sehen: ${getHpDescription(creature)}</p>
            </div>
        `;
    }

    if (creature.hpVisibility === "hidden") {
        return `
            <div class="hp-display">
                <p>Spieler sehen: HP verborgen</p>
            </div>
        `;
    }

    return `
        <div class="hp-display">
            <p>Spieler-HP-Anzeige unbekannt</p>
        </div>
    `;
}

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

    renderCreatures();
}

function removeConditionFromCreature(creatureId, conditionName) {
    const creature = findCreatureById(creatureId);

    if (creature === null) {
        return;
    }

    creature.conditions = creature.conditions.filter(function(condition) {
        return condition !== conditionName;
    });

    renderCreatures();
}

function getConditionClassName(conditionName) {
    return `condition-${conditionName}`;
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

function handleAddCreatureButtonClick() {
    clearAddCreatureError();

    const nameInputElement = document.querySelector("#new-creature-name");
    const publicNameInputElement = document.querySelector("#new-creature-public-name");
    const typeSelectElement = document.querySelector("#new-creature-type");
    const initiativeInputElement = document.querySelector("#new-creature-initiative");
    const hpInputElement = document.querySelector("#new-creature-hp");
    const maxHpInputElement = document.querySelector("#new-creature-max-hp");
    const hpVisibilitySelectElement = document.querySelector("#new-creature-hp-visibility");
    const acInputElement = document.querySelector("#new-creature-ac");
    const passivePerceptionInputElement = document.querySelector("#new-creature-passive-perception");
    const passiveInsightInputElement = document.querySelector("#new-creature-passive-insight");

    if (
        nameInputElement === null ||
        publicNameInputElement === null ||
        typeSelectElement === null ||
        initiativeInputElement === null ||
        hpInputElement === null ||
        maxHpInputElement === null ||
        hpVisibilitySelectElement === null ||
        acInputElement === null ||
        passivePerceptionInputElement === null ||
        passiveInsightInputElement === null
    ) {
        showAddCreatureError("Ein Formularfeld wurde nicht gefunden. Bitte prüfe die IDs in index.html.");
        return;
    }

    const name = nameInputElement.value.trim();
    const publicName = publicNameInputElement.value.trim();

    const initiative = Number(initiativeInputElement.value);
    const hp = Number(hpInputElement.value);
    const maxHp = Number(maxHpInputElement.value);
    const armorClass = Number(acInputElement.value);
    const passivePerception = Number(passivePerceptionInputElement.value);
    const passiveInsight = Number(passiveInsightInputElement.value);

    if (name === "") {
        showAddCreatureError("Bitte gib einen Namen ein.");
        return;
    }

    if (publicName === "") {
        showAddCreatureError("Bitte gib einen öffentlichen Namen ein.");
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

    const newCreature = {
        id: getNextCreatureId(),
        name: name,
        publicName: publicName,
        type: typeSelectElement.value,
        initiative: initiative,
        hp: hp,
        maxHp: maxHp,
        tempHp: 0,
        armorClass: armorClass,
        passivePerception: passivePerception,
        passiveInsight: passiveInsight,
        hpVisibility: hpVisibilitySelectElement.value,
        conditions: []
    };

    creatures.push(newCreature);

    renderCreatures();
}

function createCreatureCardHtml(creature, isActive) {
    return `
        <article class="creature-card ${isActive ? "active" : ""}">
            <button
                class="creature-delete-button"
                onclick="removeCreatureById(${creature.id})"
                title="Kreatur löschen"
                aria-label="Kreatur löschen"
            >
                ×
            </button>

            <div class="creature-card-top">
                <div class="creature-image-placeholder">
                    Bild folgt
                </div>

                <div class="creature-card-header">
                    <h3>
                        ${creature.name}
                        <span class="creature-public-alias">
                            aka "${creature.publicName}"
                        </span>
                    </h3>

                    <div class="creature-subtitle">
                        <p>Typ: ${creature.type}</p>
                    </div>
                </div>
            </div>

            <div class="creature-card-section">
                <h4>Kampfwerte</h4>

                <div class="creature-stat-grid">
                    <p>Initiative: ${creature.initiative}</p>
                    <p>AC: ${creature.armorClass}</p>
                    <p>HP: ${creature.hp} / ${creature.maxHp}</p>
                    <p>Temp HP: ${creature.tempHp}</p>
                </div>
            </div>

            <div class="creature-card-section">
                <h4>Passive Werte</h4>

                <div class="creature-stat-grid">
                    <p>Passive Perception: ${creature.passivePerception}</p>
                    <p>Passive Insight: ${creature.passiveInsight}</p>
                </div>
            </div>

            <div class="creature-card-section">
                <h4>Spieler-Anzeige-Vorschau</h4>

                <p class="creature-single-line">
                    Spieler-HP-Modus: ${creature.hpVisibility}
                </p>

                ${getPublicHpDisplayHtml(creature)}
            </div>

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
                <h4>Aktionen</h4>

                <div class="creature-actions">
                    <input
                        id="hp-change-amount-${creature.id}"
                        type="number"
                        min="0"
                        value="0"
                    >

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
        </article>
    `;
}

function renderTurnInfo(sortedCreatures) {
    const turnInfoElement = document.querySelector("#turn-info");
    const activeCreature = getActiveCreature(sortedCreatures);

    if (activeCreature === null) {
        turnInfoElement.innerHTML = `
            <h2>Runde ${roundNumber}</h2>
            <p>Keine Kreaturen im Encounter.</p>
        `;

        return;
    }

    turnInfoElement.innerHTML = `
        <h2>Runde ${roundNumber}</h2>

        <p class="turn-label">
            Turn ${currentTurnIndex + 1} von ${sortedCreatures.length}
        </p>

        <p class="active-creature-name">
            Aktiv: ${activeCreature.publicName}
        </p>
    `;
}

function renderCreatures() {
    const creatureListElement = document.querySelector("#creature-list");

    const sortedCreatures = getSortedCreatures();

    ensureCurrentTurnIndexIsValid(sortedCreatures);
    renderTurnInfo(sortedCreatures);

    let html = "";

    for (let index = 0; index < sortedCreatures.length; index = index + 1) {
        const creature = sortedCreatures[index];
        const isActive = index === currentTurnIndex;

        html += createCreatureCardHtml(creature, isActive);
    }

    creatureListElement.innerHTML = html;
}

renderCreatures();