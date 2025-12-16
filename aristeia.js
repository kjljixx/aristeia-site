let currentArgumentId = null;
let allArguments = {};
let argumentMutex = {};
let cardMutex = {};
let numLockedMutexes = 0;

var hasTouchScreen = false;
if ("maxTouchPoints" in navigator) {
  hasTouchScreen = navigator.maxTouchPoints > 0;
}

let settings = {
  model: 'gemini-3-pro-preview',
  highlightColor: '#7F7F00',
  emphasisBoxWidth: 1,
  emphasisFontSize: 13,
  emphasisBold: true,
  emphasisItalic: false,
  underlineBold: false,
  underlineFontSize: 11,
  tagFontSize: 13,
  citeFontSize: 13,
  citeUnderline: false,
  normalFontSize: 11,
  citationFormat: "{cite}%last% '%y%{/cite} [%author%; %date%; %publication, \"%title%,\" %url%; Accessed %accessed%]"
};

function handleBeforeUnload(event) {
  event.preventDefault();
}

function acquireArgumentMutex(argumentId) {
  //negative = a argument has locked it
  if (argumentMutex[argumentId] && argumentMutex[argumentId] < 0) {
    return false;
  }
  //positive = one or more cards have locked it
  if (argumentMutex[argumentId] && argumentMutex[argumentId] > 0) {
    return false;
  }
  argumentMutex[argumentId] = -1;
  if (numLockedMutexes === 0) {
    numLockedMutexes++;
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
  else {
    numLockedMutexes++;
  }
  return true;
}

function releaseArgumentMutex(argumentId) {
  delete argumentMutex[argumentId];

  if (numLockedMutexes > 0) {
    numLockedMutexes--;
    if (numLockedMutexes === 0) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }
}

function acquireCardMutex(argumentId, index) {
  const cardKey = `${argumentId}-${index}`;

  if (cardMutex[cardKey]) {
    return false;
  }

  if (argumentMutex[argumentId] && argumentMutex[argumentId] < 0) {
    return false;
  }

  argumentMutex[argumentId] = (argumentMutex[argumentId] || 0) + 1;
  cardMutex[cardKey] = true;
  if (numLockedMutexes === 0) {
    numLockedMutexes++;
    window.addEventListener('beforeunload', handleBeforeUnload);
  }
  else {
    numLockedMutexes++;
  }
  return true;
}

function releaseCardMutex(argumentId, index) {
  const cardKey = `${argumentId}-${index}`;
  delete cardMutex[cardKey];

  if (argumentMutex[argumentId] && argumentMutex[argumentId] > 0) {
    argumentMutex[argumentId]--;
    if (argumentMutex[argumentId] === 0) {
      delete argumentMutex[argumentId];
    }
  }

  if (numLockedMutexes > 0) {
    numLockedMutexes--;
    if (numLockedMutexes === 0) {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  applySettings();
  loadAllArguments();
  showArgumentList();
  loadCustomQuillFormats();

  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('scroll', handleDragMove);
  document.addEventListener('mouseup', handleDragUp);
  document.addEventListener('touchmove', handleDragMove, { passive: false });
  document.addEventListener('touchend', handleDragUp, { passive: false });
});

function showHelp() {
  document.getElementById('argument-list-page').style.display = 'none';
  document.getElementById('argument-page').style.display = 'none';
  document.getElementById('settings-page').style.display = 'none';
  document.getElementById('help-page').style.display = 'block';
}

function closeHelp() {
  document.getElementById('help-page').style.display = 'none';
  if (currentArgumentId) {
    document.getElementById('argument-page').style.display = 'block';
  } else {
    document.getElementById('argument-list-page').style.display = 'block';
  }
}

function showSettings() {
  document.getElementById('argument-list-page').style.display = 'none';
  document.getElementById('argument-page').style.display = 'none';
  document.getElementById('settings-page').style.display = 'block';
  document.getElementById('help-page').style.display = 'none';
  loadSettingsToForm();
}

function closeSettings() {
  document.getElementById('settings-page').style.display = 'none';
  document.getElementById('help-page').style.display = 'none';
  if (currentArgumentId) {
    document.getElementById('argument-page').style.display = 'block';
  } else {
    document.getElementById('argument-list-page').style.display = 'block';
  }
}

function loadSettings() {
  const saved = localStorage.getItem('aristeia-settings');
  if (saved) {
    settings = JSON.parse(saved);
  }
}

function saveSettings() {
  settings.model = document.getElementById('setting-model').value;
  settings.highlightColor = document.getElementById('setting-highlight-color').value;
  settings.emphasisBoxWidth = parseFloat(document.getElementById('setting-emphasis-box-width').value);
  settings.emphasisFontSize = parseFloat(document.getElementById('setting-emphasis-font-size').value);
  settings.emphasisBold = document.getElementById('setting-emphasis-bold').checked;
  settings.emphasisItalic = document.getElementById('setting-emphasis-italic').checked;
  settings.underlineBold = document.getElementById('setting-underline-bold').checked;
  settings.underlineFontSize = parseFloat(document.getElementById('setting-underline-font-size').value);
  settings.tagFontSize = parseFloat(document.getElementById('setting-tag-font-size').value);
  settings.citeFontSize = parseFloat(document.getElementById('setting-cite-font-size').value);
  settings.citeUnderline = document.getElementById('setting-cite-underline').checked;
  settings.normalFontSize = parseFloat(document.getElementById('setting-normal-font-size').value);
  settings.citationFormat = document.getElementById('setting-citation-format').value;

  localStorage.setItem('aristeia-settings', JSON.stringify(settings));
  applySettings();
}

function loadSettingsToForm() {
  document.getElementById('setting-model').value = settings.model;
  document.getElementById('setting-highlight-color').value = settings.highlightColor;
  document.getElementById('setting-emphasis-box-width').value = settings.emphasisBoxWidth;
  document.getElementById('setting-emphasis-font-size').value = settings.emphasisFontSize;
  document.getElementById('setting-emphasis-bold').checked = settings.emphasisBold;
  document.getElementById('setting-emphasis-italic').checked = settings.emphasisItalic;
  document.getElementById('setting-underline-bold').checked = settings.underlineBold;
  document.getElementById('setting-underline-font-size').value = settings.underlineFontSize;
  document.getElementById('setting-tag-font-size').value = settings.tagFontSize;
  document.getElementById('setting-cite-font-size').value = settings.citeFontSize;
  document.getElementById('setting-cite-underline').checked = settings.citeUnderline;
  document.getElementById('setting-normal-font-size').value = settings.normalFontSize;
  document.getElementById('setting-citation-format').value = settings.citationFormat;
}

function resetSettings() {
  settings = {
    model: 'gemini-3-pro-preview',
    highlightColor: '#7F7F00',
    emphasisBoxWidth: 1,
    emphasisFontSize: 13,
    emphasisBold: true,
    emphasisItalic: false,
    underlineBold: false,
    underlineFontSize: 11,
    tagFontSize: 13,
    citeFontSize: 13,
    citeUnderline: false,
    normalFontSize: 11,
    citationFormat: "{cite}%last% '%y%{/cite} [%author%; %date%; %publication, \"%title%,\" %url%; Accessed %accessed%]"
  };
  localStorage.setItem('aristeia-settings', JSON.stringify(settings));
  loadSettingsToForm();
  applySettings();
}

function exportData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    data[key] = localStorage.getItem(key);
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `aristeia-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importData() {
  document.getElementById('import-file-input').click();
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      if (!confirm('This will replace all existing arguments and settings. Are you sure you want to continue?')) {
        return;
      }

      localStorage.clear();
      for (const [key, value] of Object.entries(data)) {
        localStorage.setItem(key, value);
      }

      loadSettings();
      loadSettingsToForm();
      applySettings();
      loadAllArguments();

      alert('Data imported successfully!');
    } catch (error) {
      console.error('Error importing data:', error);
      alert('Error importing data!');
    }
  };
  reader.readAsText(file);

  event.target.value = '';
}

function applySettings() {
  const style = document.createElement('style');
  style.id = 'dynamic-settings-style';
  const existing = document.getElementById('dynamic-settings-style');
  if (existing) existing.remove();

  style.textContent = `
    .card { font-size: ${settings.normalFontSize}pt; }
    .card-highlight { background-color: ${settings.highlightColor}; }
    .card-emphasize {
      font-size: ${settings.emphasisFontSize}pt;
      border-width: ${settings.emphasisBoxWidth}pt;
      font-weight: ${settings.emphasisBold ? 'bold' : 'normal'};
      font-style: ${settings.emphasisItalic ? 'italic' : 'normal'};
    }
    .card-underline {
      font-weight: ${settings.underlineBold ? 'bold' : 'normal'};
      font-size: ${settings.underlineFontSize}pt;
    }
    .tagline { font-size: ${settings.tagFontSize}pt; }
    .cite-text {
      font-size: ${settings.citeFontSize}pt;
      text-decoration: ${settings.citeUnderline ? 'underline' : 'none'};
    }
    .ql-editor { font-size: ${settings.normalFontSize}pt; }
  `;
  document.head.appendChild(style);
}

function showArgumentList() {
  backButton = document.getElementById('back-to-arguments-button')
  if (backButton) backButton.remove();
  document.getElementById('argument-list-page').style.display = 'block';
  document.getElementById('argument-page').style.display = 'none';
  document.getElementById('settings-page').style.display = 'none';
  document.getElementById('help-page').style.display = 'none';
  currentArgumentId = null;
  loadArgumentList();
}

function loadAllArguments() {
  allArguments = JSON.parse(localStorage.getItem('arguments') || '{}');
}

function saveAllArguments() {
  localStorage.setItem('arguments', JSON.stringify(allArguments));
}

function showNewArgumentPage() {
  const argumentId = Date.now().toString();
  currentArgumentId = argumentId;
  const reviseButton = document.getElementById('revise-argument-button');
  reviseButton.style.display = 'none';
  const cutAllButton = document.getElementById('cut-all-cards-button');
  cutAllButton.style.display = 'none';
  const copyAllButton = document.getElementById('copy-all-button');
  copyAllButton.style.display = 'none';
  const addCardArgumentUtilsButton = document.getElementById('add-card-argument-utils-button');
  addCardArgumentUtilsButton.style.display = 'none';
  document.getElementById('argument-list-page').style.display = 'none';
  document.getElementById('argument-page').style.display = 'block';
  document.getElementById('settings-page').style.display = 'none';
  document.getElementById('help-page').style.display = 'none';
  document.getElementById('output').innerHTML = '';
  document.getElementById('query-section').innerHTML = `
    <textarea id="query" placeholder="Enter your argument structure. Ex. 'Create a argument for the NovDec 2025 NSDA Public Forum Topic on the NEG about how backdoors are bad'"></textarea>
    <br>
    <button id="query-enter-button" onclick="generateUncutArgument()">Enter</button>
  `;
  document.getElementById('query-section').style.marginBottom = `10px`;
}

function showArgumentPage(argumentId) {
  currentArgumentId = argumentId;
  const reviseButton = document.getElementById('revise-argument-button');
  reviseButton.style.display = '';

  if (allArguments[argumentId] && allArguments[argumentId].isRevising) {
    reviseButton.textContent = 'Revising...';
    reviseButton.style.pointerEvents = 'none';
  } else if (allArguments[argumentId] && allArguments[argumentId].isGenerating) {
    reviseButton.textContent = 'Generating...';
    reviseButton.style.pointerEvents = 'none';
  } else {
    reviseButton.textContent = 'Revise Argument';
    reviseButton.style.pointerEvents = '';
  }

  reviseButton.onclick = (event) => {
    if (document.getElementById("revise-argument-input")) return;
    reviseButton.style.pointerEvents = 'none';
    event.currentTarget.innerHTML += `<span id="revise-argument-input" contenteditable="true"></span>`;
    const input = document.getElementById("revise-argument-input");
    input.focus();
    const originalPaddingRight = reviseButton.style.paddingRight;
    reviseButton.style.paddingRight = "0px";

    const enter = () => {
      reviseButton.contentEditable = 'false';
      reviseButton.removeChild(document.getElementById("revise-argument-input"));
      reviseButton.style.paddingRight = originalPaddingRight;
      reviseButton.textContent = 'Revising...';
      reviseArgument(argumentId, input.textContent.trim()).then(() => {
        reviseButton.textContent = 'Revise Argument';
        reviseButton.style.pointerEvents = '';
      });
    };

    const cancel = () => {
      reviseButton.contentEditable = 'false';
      reviseButton.removeChild(document.getElementById("revise-argument-input"));
      reviseButton.style.paddingRight = originalPaddingRight;
      reviseButton.style.pointerEvents = '';
    };

    function handleBlur() {
      cancel();
      input.removeEventListener('blur', handleBlur);
      input.removeEventListener('keydown', handleKeydown);
    }
    input.addEventListener('blur', handleBlur);
    function handleKeydown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        input.removeEventListener('blur', handleBlur);
        input.removeEventListener('keydown', handleKeydown);
        enter();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        input.removeEventListener('blur', handleBlur);
        input.removeEventListener('keydown', handleKeydown);
        cancel();
      }
    }
    input.addEventListener('keydown', handleKeydown);
  };
  document.getElementById('argument-list-page').style.display = 'none';
  document.getElementById('argument-page').style.display = 'block';
  document.getElementById('settings-page').style.display = 'none';
  document.getElementById('help-page').style.display = 'none';
  document.getElementById('query-section').innerHTML = '';
  document.getElementById('query-section').style.marginBottom = `0px`;
  displayCards(argumentId);
}

function loadArgumentList() {
  const listDiv = document.getElementById('argument-list');

  let html = '';
  for (const [id, data] of Object.entries(allArguments).reverse()) {
    html += `<div class="argument-item">
              <div class="argument-item-utils">
                <button onclick="event.stopPropagation(); renameArgument('${id}')" title="Rename this argument">Rename</button>
                <button onclick="event.stopPropagation(); deleteArgument('${id}')" title="Delete this argument">Delete</button>
              </div>
               <div onclick="showArgumentPage('${id}')">
                 <strong>${data.query}</strong><br>
                 <small>${data.cards.length} cards - ${new Date(parseInt(id)).toLocaleString()}</small>
               </div>
             </div>`;
  }

  listDiv.innerHTML = html;
}

function deleteArgument(argumentId) {
  if (!acquireArgumentMutex(argumentId)) {
    alert('Mutex Locked!');
    return;
  }

  if (confirm('Are you sure you want to delete this argument?')) {
    delete allArguments[argumentId];
    saveAllArguments();
    loadArgumentList();
  }

  releaseArgumentMutex(argumentId);
}

function renameArgument(argumentId) {
  if (!acquireArgumentMutex(argumentId)) {
    alert('Mutex Locked!');
    return;
  }

  const newName = prompt('Enter new name:', allArguments[argumentId].query);
  if (newName && newName.trim()) {
    allArguments[argumentId].query = newName.trim();
    saveAllArguments();
    loadArgumentList();
  }

  releaseArgumentMutex(argumentId);
}

function displayCards(argumentId) {
  const output = document.getElementById('output');
  if (!allArguments[argumentId]) {
    output.innerHTML = '';
    return;
  }

  const cards = allArguments[argumentId].cards;

  const hasCards = cards && cards.length > 0;

  const cutAllButton = document.getElementById('cut-all-cards-button');
  const copyAllButton = document.getElementById('copy-all-button');
  const addCardArgumentUtilsButton = document.getElementById('add-card-argument-utils-button');
  if (hasCards) {
    cutAllButton.style.display = '';
    copyAllButton.style.display = '';
    addCardArgumentUtilsButton.style.display = 'none';

    if (allArguments[argumentId].isCuttingAll) {
      cutAllButton.textContent = 'Cutting...';
      cutAllButton.style.pointerEvents = 'none';
    } else {
      cutAllButton.textContent = 'Cut All Cards';
      cutAllButton.style.pointerEvents = '';
    }
    cutAllButton.onclick = () => cutAllCards(argumentId);

    copyAllButton.textContent = 'Copy All';
    copyAllButton.style.pointerEvents = '';
    copyAllButton.onclick = () => copyAllCards(argumentId);
  } else {
    cutAllButton.style.display = 'none';
    copyAllButton.style.display = 'none';
    addCardArgumentUtilsButton.style.display = '';
    addCardArgumentUtilsButton.onclick = () => addCard(argumentId, -1);
  }

  let html = '';
  cards.forEach((card, index) => {
    const tagline = card.content.tagline;
    const source = card.content.source;
    const title = source ? source.title : null;
    const url = source ? source.url : null;
    const isCut = card.cut;

    const isCutting = card.isCutting || false;
    const cutButtonText = isCutting ? 'Cutting...' : 'Cut Card';
    const cutButtonPointerEvents = isCutting ? 'none' : '';
    const bodyDisplayText = isCutting ? 'Card is currently being cut...' : (isCut ? '' : 'No Body Text; press \'Cut Card\' below to cut with AI, or press this text box to manually cut');

    html += `<div class="card ${isCut ? 'cut-card' : 'uncut-card'}" id="card-${argumentId}-${index}">
                  <div class="tagline" id="tagline-${argumentId}-${index}">
                  ${tagline ? `<h4>${tagline}</h4>` : `<h4 style="font-style: italic; font-family: Inter">No Tagline</h4>`}
                  </div>
                  <div class="cite" id="cite-${argumentId}-${index}">
                  ${source ? `<a href="${url}" target="_blank">${title}</a>` : `<span style="font-style: italic; font-family: Inter">No Source URL</span>`}
                  </div>
                  <div class="card-body" id="card-body-${argumentId}-${index}"> 
                  <span style="font-style: italic; font-family: Inter">${bodyDisplayText}</span>
                  </div>
                  <div class="card-utils">
                  <button class="drag-handle" id="drag-handle-${argumentId}-${index}" title="Drag to reorder">Move</button>
                  <button onclick="addCard('${argumentId}', ${index})" title="Add new card below">Add Card</button>
                  <button class="show-if-card-uncut-button" id="cut-card-button-${argumentId}-${index}" onclick="cutCard('${argumentId}', ${index})" title="Cut card with AI" style="pointer-events: ${cutButtonPointerEvents}">${cutButtonText}</button>
                  <button class="show-if-card-cut-button" id="copy-button-${argumentId}-${index}" onclick="copyWithStyleTags('${argumentId}', ${index})" title="Copy card content with style tags">Copy</button>
                  <div class="danger-card-utils">
                  <button class="show-if-card-cut-button" onclick="uncutCard('${argumentId}', ${index})" title="Uncut and remove citation and body text">Uncut</button>
                  <button id="delete-card-button-${argumentId}-${index}" onclick="deleteCard('${argumentId}', ${index})" title="Delete this card">Delete</button>
                  </div>
                  </div>
              </div>`;
  });
  output.innerHTML = html;
  cards.forEach((card, index) => {
    if (card.cut) {
      formatCard(argumentId, index);
    }
    setupEditableElement(`tagline-${argumentId}-${index}`, argumentId, index, 'tagline');
    setupEditableElement(`cite-${argumentId}-${index}`, argumentId, index, 'cite');
    setupEditableElement(`card-body-${argumentId}-${index}`, argumentId, index, 'body');
    setupCardDragAndDrop(`card-${argumentId}-${index}`, argumentId, index);
  });
}

function createBlankArgument() {
  const argumentId = Date.now().toString();
  currentArgumentId = argumentId;

  if (!acquireArgumentMutex(argumentId)) {
    alert('Mutex Locked!');
    return;
  }

  const emptyCard = {
    cut: false,
    isCutting: false,
    content: {
      tagline: '',
      source: null,
      citation: null,
      body_text: null
    }
  };

  allArguments[argumentId] = {
    cards: [emptyCard],
    query: 'Blank argument',
    isRevising: false,
    isGenerating: false,
    isCuttingAll: false
  };
  saveAllArguments();

  releaseArgumentMutex(argumentId);

  showArgumentPage(argumentId);
}

async function generateUncutArgument() {
  const query = document.getElementById('query').value;
  const enterButton = document.getElementById('query-enter-button');
  const output = document.getElementById('output');
  const argumentId = currentArgumentId;

  if (!acquireArgumentMutex(argumentId)) {
    enterButton.innerHTML = 'Mutex Locked!';
    setTimeout(() => { enterButton.innerHTML = 'Generate'; }, 2000);
    return;
  }

  enterButton.style.pointerEvents = 'none';
  enterButton.innerHTML = 'Generating...';

  allArguments[argumentId] = {};
  allArguments[argumentId].cards = [];
  allArguments[argumentId].query = query;
  allArguments[argumentId].isRevising = false;
  allArguments[argumentId].isGenerating = true;
  saveAllArguments();

  try {
    const response = await fetch('https://aristeia.kjljixx.com/gen_uncut_argument', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, model: settings.model })
    });

    const rawCards = await response.json();
    const cards = rawCards.map(rawCard => ({
      cut: false,
      isCutting: false,
      content: { tagline: rawCard[0], source: rawCard[1], citation: null, body_text: null }
    }));

    allArguments[argumentId].cards = cards;
    allArguments[argumentId].isGenerating = false;
    allArguments[argumentId].isCuttingAll = false;
    saveAllArguments();

    if (currentArgumentId === argumentId) {
      displayCards(argumentId);
      const querySection = document.getElementById('query-section');
      querySection.innerHTML = '';
      querySection.style.marginBottom = `0px`;
      const reviseButton = document.getElementById('revise-argument-button');
      reviseButton.innerHTML = 'Revise Argument';
      reviseButton.style.display = '';
      reviseButton.onclick = (event) => {
        if (document.getElementById("revise-argument-input")) return;
        reviseButton.style.pointerEvents = 'none';
        event.currentTarget.innerHTML += `<span id="revise-argument-input" contenteditable="true"></span>`;
        const input = document.getElementById("revise-argument-input");
        input.focus();
        const originalPaddingRight = reviseButton.style.paddingRight;
        reviseButton.style.paddingRight = "0px";

        const enter = () => {
          reviseButton.contentEditable = 'false';
          reviseButton.removeChild(document.getElementById("revise-argument-input"));
          reviseButton.style.paddingRight = originalPaddingRight;
          reviseButton.textContent = 'Revising...';
          reviseArgument(argumentId, input.textContent.trim());
        };

        const cancel = () => {
          reviseButton.contentEditable = 'false';
          reviseButton.removeChild(document.getElementById("revise-argument-input"));
          reviseButton.style.paddingRight = originalPaddingRight;
          reviseButton.style.pointerEvents = '';
        };

        function handleBlur() {
          cancel();
          input.removeEventListener('blur', handleBlur);
          input.removeEventListener('keydown', handleKeydown);
        }
        input.addEventListener('blur', handleBlur);
        function handleKeydown(e) {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            input.removeEventListener('blur', handleBlur);
            input.removeEventListener('keydown', handleKeydown);
            enter();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            input.removeEventListener('blur', handleBlur);
            input.removeEventListener('keydown', handleKeydown);
            cancel();
          }
        }
        input.addEventListener('keydown', handleKeydown);
      };
    }
    else if (currentArgumentId === null) {
      loadArgumentList(argumentId);
    }

    releaseArgumentMutex(argumentId);
  } catch (error) {
    console.error('Error generating uncut argument:', error);
    allArguments[argumentId].isGenerating = false;
    saveAllArguments();
    if (currentArgumentId === argumentId) {
      enterButton.innerHTML = 'Error: See Console';
      setTimeout(() => {
        enterButton.innerHTML = 'Enter';
        enterButton.style.pointerEvents = '';
      }, 2000);
    }
    releaseArgumentMutex(argumentId);
  }
}

async function reviseArgument(argumentId, revisionPrompt) {
  if (!allArguments[argumentId]) return;

  if (!acquireArgumentMutex(argumentId)) {
    const reviseButton = document.getElementById('revise-argument-button');
    if (reviseButton) {
      reviseButton.textContent = 'Mutex Locked!';
      setTimeout(() => { reviseButton.textContent = 'Revise Argument'; }, 2000);
    }
    return;
  }

  allArguments[argumentId].isRevising = true;
  saveAllArguments();

  reviseButton = document.getElementById('revise-argument-button');
  try {
    const currentArgument = structuredClone(allArguments[argumentId]);
    const response = await fetch('https://aristeia.kjljixx.com/revise_argument', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: revisionPrompt, originalQuery: currentArgument.query, currentArgument: currentArgument.cards.map(card => {
          return {
            tagline: card.content.tagline ? card.content.tagline : "NO_TAGLINE",
            source: card.content.source ? card.content.source : null,
          }
        }), model: settings.model
      })
    });

    const rawCards = await response.json();
    const cards = rawCards.map(rawCard => {
      return rawCard[1]["url"] != "reused_card" ?
        {
          cut: false,
          isCutting: false,
          content: { tagline: rawCard[0], source: rawCard[1], citation: null, body_text: null }
        } :
        {
          ...currentArgument.cards[rawCard[1]["id"]],
          content: {
            ...currentArgument.cards[rawCard[1]["id"]].content,
            tagline: rawCard[0],
          }
        }
    });

    allArguments[argumentId].cards = cards;
    allArguments[argumentId].isRevising = false;
    saveAllArguments();

    if (currentArgumentId === argumentId) {
      displayCards(argumentId);
    }

    reviseButton.textContent = 'Revise Argument';
    reviseButton.style.pointerEvents = '';
    releaseArgumentMutex(argumentId);
  } catch (error) {
    allArguments[argumentId].isRevising = false;
    saveAllArguments();

    console.error('Error revising argument:', error);
    if (currentArgumentId === argumentId) {
      reviseButton.textContent = 'Error: See Console';
    }
    releaseArgumentMutex(argumentId);
  }
}

async function copyWithStyleTags(argumentId, index) {
  if (!allArguments[argumentId] || !allArguments[argumentId].cards[index]) return;

  const card = allArguments[argumentId].cards[index];
  const copyButton = document.getElementById(`copy-button-${argumentId}-${index}`);
  if (!copyButton) return;

  const tagline = card.content.tagline;
  const citation = card.content.citation;
  const bodyText = card.content.body_text;
  navigator.clipboard.writeText(["{tag}" + tagline, citation, bodyText].join('\n')).then(() => {
    copyButton.innerHTML = 'Copied!';
    setTimeout(() => { copyButton.innerHTML = 'Copy as Verbatim'; }, 2000);
  }).catch((error) => {
    console.error('Error copying with style tags:', error);
    copyButton.innerHTML = 'Error: See Console';
    setTimeout(() => { copyButton.innerHTML = 'Copy as Verbatim'; }, 2000);
  });
}

async function copyAllCards(argumentId) {
  if (!allArguments[argumentId]) return;

  const cards = allArguments[argumentId].cards;
  if (cards.length === 0) return;

  const copyAllButton = document.getElementById('copy-all-button');

  let allCardsText = [];
  for (const card of cards) {
    const tagline = card.content.tagline || '';
    const citation = card.content.citation || '';
    const bodyText = card.content.body_text || '';
    allCardsText.push(["{tag}" + tagline, citation, bodyText].join('\n'));
  }

  navigator.clipboard.writeText(allCardsText.join('\n\n')).then(() => {
    if (copyAllButton) {
      copyAllButton.textContent = 'Copied!';
      setTimeout(() => { copyAllButton.textContent = 'Copy All'; }, 2000);
    }
  }).catch((error) => {
    console.error('Error copying all cards:', error);
    if (copyAllButton) {
      copyAllButton.textContent = 'Error: See Console';
      setTimeout(() => { copyAllButton.textContent = 'Copy All'; }, 2000);
    }
  });
}

function addCard(argumentId, index) {
  if (!allArguments[argumentId]) return;

  if (!acquireArgumentMutex(argumentId)) {
    alert('Mutex Locked!');
    return;
  }

  const newCard = {
    cut: false,
    isCutting: false,
    content: {
      tagline: '',
      source: null,
      citation: null,
      body_text: null
    }
  };

  allArguments[argumentId].cards.splice(index + 1, 0, newCard);
  saveAllArguments();

  if (currentArgumentId === argumentId) {
    displayCards(argumentId);
  }

  releaseArgumentMutex(argumentId);
}

function deleteCard(argumentId, index) {
  if (!allArguments[argumentId]) return;

  if (!acquireArgumentMutex(argumentId)) {
    const deleteButton = document.getElementById(`delete-card-button-${argumentId}-${index}`);
    if (deleteButton) {
      const originalText = deleteButton.innerHTML;
      deleteButton.innerHTML = 'Mutex Locked!';
      setTimeout(() => { deleteButton.innerHTML = originalText; }, 2000);
    }
    return;
  }

  if (confirm('Are you sure you want to delete this card?')) {
    allArguments[argumentId].cards.splice(index, 1);
    saveAllArguments();
    if (currentArgumentId === argumentId) {
      displayCards(argumentId);
    }
  }

  releaseArgumentMutex(argumentId);
}

let activeQuillInstance = null;

function loadCustomQuillFormats() {
  const Inline = Quill.import('blots/inline');

  class HighlightBlot extends Inline {
    static blotName = 'highlight';
    static tagName = 'mark';
    static className = 'card-highlight';
  }

  class EmphasizeBlot extends Inline {
    static blotName = 'emphasize';
    static tagName = 'em';
    static className = 'card-emphasize';
  }

  class UnderlineBlot extends Inline {
    static blotName = 'underline-custom';
    static tagName = 'u';
    static className = 'card-underline';
  }

  Quill.register(HighlightBlot);
  Quill.register(EmphasizeBlot);
  Quill.register(UnderlineBlot);
}

function setupEditableElement(elementId, argumentId, index, type) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.addEventListener('click', async (e) => {
    const originalContent = element.innerHTML;
    const card = allArguments[argumentId].cards[index];
    if (window.getSelection().toString().length > 0) return;
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
    if (element.contentEditable === 'true' || element.classList.contains('ql-container')) return;

    if (!acquireCardMutex(argumentId, index)) {
      const originalHtml = element.innerHTML;
      element.innerHTML = 'Mutex Locked!';
      setTimeout(() => { element.innerHTML = originalHtml; }, 2000);
      return;
    }

    if (!card.cut && type == 'cite') {
      element.innerHTML = card.content.source ? card.content.source.url : '';
    }
    if (card.cut && type === 'cite' && !card.content.citation) {
      element.innerHTML = '';
    }
    if (type === 'tagline' && !card.content.tagline) {
      element.innerHTML = "<h4></h4>";
    }
    if (type === 'body' && !card.content.body_text) {
      element.innerHTML = '';
    }

    if (type === 'body') {
      element.style.borderWidth = '0px';

      const quill = new Quill(element, {
        theme: hasTouchScreen ? 'snow' : 'bubble',
        modules: {
          toolbar: [
            [{ 'underline-custom': true }],
            [{ 'emphasize': true }],
            [{ 'highlight': true }]
          ]
        },
        formats: ['highlight', 'emphasize', 'underline-custom']
      });

      activeQuillInstance = quill;

      const toolbar = document.querySelector('.ql-toolbar');
      console.log(toolbar);
      if (toolbar) {
        const buttons = toolbar.querySelectorAll('button');
        buttons.forEach(btn => {
          if (btn.classList.contains('ql-underline-custom')) {
            btn.textContent = 'Un';
            btn.title = 'Underline';
          } else if (btn.classList.contains('ql-emphasize')) {
            btn.textContent = 'Em';
            btn.title = 'Emphasize';
          } else if (btn.classList.contains('ql-highlight')) {
            btn.textContent = 'Hi';
            btn.title = 'Highlight';
          }
          btn.addEventListener('mousedown', (e) => { e.preventDefault(); });
        });
      }

      quill.focus();
      const range = document.createRange();
      range.selectNodeContents(quill.root);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      element.contentEditable = 'true';
      element.style.borderWidth = '0px';
      element.focus();
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }

    const saveEdit = async () => {
      element.contentEditable = 'false';
      element.style.borderWidth = '1px';

      if (type === 'tagline') {
        card.content.tagline = element.textContent.trim();
        saveAllArguments();
        displayCards(argumentId);
        releaseCardMutex(argumentId, index);
      } else if (type === 'cite' && !card.cut) {
        const newUrl = element.textContent.trim();
        const originalUrl = card.content.source ? card.content.source.url : "";

        if (newUrl === originalUrl) {
          element.innerHTML = originalContent;
          releaseCardMutex(argumentId, index);
          return;
        }

        try {
          new URL(newUrl);
        } catch (e) {
          element.innerHTML = 'Provided URL is invalid';
          setTimeout(() => { element.innerHTML = originalContent; }, 2000);
          releaseCardMutex(argumentId, index);
          return;
        }
        element.innerHTML = 'Saving...';

        try {
          const response = await fetch('https://aristeia.kjljixx.com/get_contents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: newUrl })
          });

          const newSource = await response.json();

          card.content.source = newSource;
          saveAllArguments();
          if (currentArgumentId === argumentId) {
            displayCards(argumentId);
          }
          releaseCardMutex(argumentId, index);
        } catch (error) {
          console.error('Error saving new source URL:', error);
          element.innerHTML = 'Error: See Console';
          setTimeout(() => { element.innerHTML = originalContent; }, 2000);
          releaseCardMutex(argumentId, index);
        }
      } else if (type === 'cite' && card.cut) {
        const newCitation = element.innerHTML;

        const linkRegex = /<a\b[^>]*>(.*?)<\/a>/;
        const linkMatch = newCitation.match(linkRegex);

        let finalHtmlCitation = newCitation;

        if (linkMatch) {
          const url = linkMatch[1];
          finalHtmlCitation = newCitation.replace(linkRegex, `<a href="${url}" target="_blank">${url}</a>`);
        }

        element.innerHTML = finalHtmlCitation;

        let citationText = finalHtmlCitation;
        citationText = citationText.replaceAll('<span class="cite-text">', "{cite}").replaceAll("</span>", "{/cite}").replace(linkRegex, '$1');
        card.content.citation = citationText;

        saveAllArguments();
        if (currentArgumentId === argumentId) {
          displayCards(argumentId);
        }
        releaseCardMutex(argumentId, index);
      } else if (type === 'body') {
        const quillEditor = element.querySelector('.ql-editor');
        let bodyText = quillEditor ? quillEditor.innerHTML : element.innerHTML;

        if (activeQuillInstance) {
          activeQuillInstance = null;
        }
        const quillToolbar = element.previousElementSibling;
        if (quillToolbar && quillToolbar.classList.contains('ql-toolbar')) {
          quillToolbar.remove();
        }

        bodyText = bodyText.replaceAll('<mark class="card-highlight">', '{highlight}').replaceAll('</mark>', '{/highlight}');
        bodyText = bodyText.replaceAll('<em class="card-emphasize">', '{emphasize}').replaceAll('</em>', '{/emphasize}');
        bodyText = bodyText.replaceAll('<u class="card-underline">', '{underline}').replaceAll('</u>', '{/underline}');

        bodyText = bodyText.replaceAll('<span>', '').replaceAll('</span>', '');
        bodyText = bodyText.replaceAll('<p>', '').replaceAll('</p>', '');
        bodyText = bodyText.replaceAll('<br>', '');

        card.content.body_text = bodyText;
        card.cut = bodyText.trim() ? true : false;
        saveAllArguments();
        if (currentArgumentId === argumentId) {
          displayCards(argumentId);
        }
        releaseCardMutex(argumentId, index);
      }
    };

    const cancelEdit = () => {
      if (type === 'body') {
        if (activeQuillInstance) {
          activeQuillInstance = null;
        }
        const quillToolbar = element.previousElementSibling;
        if (quillToolbar && quillToolbar.classList.contains('ql-toolbar')) {
          quillToolbar.remove();
        }
        element.innerHTML = originalContent;
        element.style.borderWidth = '1px';
        element.classList.remove('ql-container');
        element.classList.remove('ql-bubble');
      } else {
        element.contentEditable = 'false';
        element.style.borderWidth = '1px';
        element.innerHTML = originalContent;
      }

      releaseCardMutex(argumentId, index);
    };

    if (type === 'body') {
      const quillEditor = activeQuillInstance.root;
      function handleBodyBlur() {
        cancelEdit();
        quillEditor.removeEventListener('blur', handleBodyBlur);
        quillEditor.removeEventListener('keydown', handleBodyKeydown);
      }
      quillEditor.addEventListener('blur', handleBodyBlur);
      const handleBodyKeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          quillEditor.removeEventListener('blur', handleBodyBlur);
          quillEditor.removeEventListener('keydown', handleBodyKeydown);
          saveEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          quillEditor.removeEventListener('blur', handleBodyBlur);
          quillEditor.removeEventListener('keydown', handleBodyKeydown);
          cancelEdit();
        }
      };
      quillEditor.addEventListener('keydown', handleBodyKeydown);
    } else {
      function handleBlur() {
        cancelEdit();
        element.removeEventListener('blur', handleBlur);
        element.removeEventListener('keydown', handleKeydown);
      }
      element.addEventListener('blur', handleBlur);

      function handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          element.removeEventListener('blur', handleBlur);
          element.removeEventListener('keydown', handleKeydown);
          saveEdit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          element.removeEventListener('blur', handleBlur);
          element.removeEventListener('keydown', handleKeydown);
          cancelEdit();
        }
      }
      element.addEventListener('keydown', handleKeydown);
    }
  });
}

let draggedCard = null;
let draggedIndex = null;
let isDragging = false;
let cardOffsetY = 0;
let currentArgumentIdForDrag = null;
let lastClientY = 0;
let lastDropZone = null;
let lastDropPosition = null;

function findDropZone(newTop, cards) {
  let closestDropZone = null;
  let closestDistance = Infinity;
  let dropPosition = null;

  cards.forEach(card => {
    const cardRect = card.getBoundingClientRect();

    const distanceToBottom = Math.abs(newTop - cardRect.bottom);
    if (distanceToBottom < closestDistance) {
      closestDistance = distanceToBottom;
      closestDropZone = card;
      dropPosition = 'after';
    }

    if (parseInt(card.id.split('-')[2]) === 0 || (draggedIndex === 0 && parseInt(card.id.split('-')[2]) === 1)) {
      const argumentUtilsRect = document.getElementById('argument-utils').getBoundingClientRect();
      const distanceToArgumentUtils = Math.abs(newTop - argumentUtilsRect.bottom);
      if (distanceToArgumentUtils < closestDistance) {
        closestDistance = distanceToArgumentUtils;
        closestDropZone = card;
        dropPosition = 'before';
      }
    }
  });

  return { closestDropZone, dropPosition };
}

function handleDragMove(event) {
  if (isDragging && draggedCard) {
    const clientY = event.clientY !== undefined ? event.clientY : (event.touches ? event.touches[0].clientY : lastClientY);
    lastClientY = clientY;
    const newTop = lastClientY - cardOffsetY;
    draggedCard.style.top = `${newTop}px`;
    if (lastClientY < 200 + cardOffsetY) {
      window.scrollBy(0, -Math.min(20, 0.1 * (200 + cardOffsetY - lastClientY)));
    }
    else if (lastClientY > window.innerHeight - 200) {
      window.scrollBy(0, Math.min(20, 0.1 * (lastClientY - (window.innerHeight - 200))));
    }

    const cards = Array.from(document.querySelectorAll('.card:not(.is-dragging)'));
    const draggedCardHeight = draggedCard.getBoundingClientRect().height;

    const { closestDropZone, dropPosition } = findDropZone(newTop, cards);

    if (closestDropZone !== lastDropZone || dropPosition !== lastDropPosition) {
      cards.forEach(card => {
        card.classList.remove('drop-before');
        card.classList.remove('drop-after');
        card.style.transform = '';
      });

      if (closestDropZone && dropPosition) {
        lastDropZone = closestDropZone;
        lastDropPosition = dropPosition;
        closestDropZone.classList.add(`drop-${dropPosition}`);

        const dropTargetIndex = parseInt(closestDropZone.id.split('-')[2]);
        const spacing = draggedCardHeight + 10; // card height + margin

        cards.forEach(card => {
          const cardIndex = parseInt(card.id.split('-')[2]);

          if (dropPosition === 'before') {
            if (cardIndex >= dropTargetIndex && cardIndex > draggedIndex) {
              card.style.transform = `translateY(${spacing}px)`;
            } else if (cardIndex >= dropTargetIndex && cardIndex < draggedIndex) {
              card.style.transform = `translateY(${spacing}px)`;
            }
          } else { // 'after'
            if (cardIndex > dropTargetIndex && cardIndex > draggedIndex) {
              card.style.transform = `translateY(${spacing}px)`;
            } else if (cardIndex > dropTargetIndex && cardIndex < draggedIndex) {
              card.style.transform = `translateY(${spacing}px)`;
            }
          }
        });
      }
    }
  }
}

function handleDragUp(event) {
  if (isDragging && draggedCard) {
    isDragging = false;

    const cards = Array.from(document.querySelectorAll('.card:not(.is-dragging)'));
    const clientY = event.clientY !== undefined ? event.clientY : (event.changedTouches ? event.changedTouches[0].clientY : lastClientY);
    const newTop = clientY - cardOffsetY;

    const { closestDropZone, dropPosition } = findDropZone(newTop, cards);

    if (closestDropZone && dropPosition) {
      const dropTargetIndex = parseInt(closestDropZone.id.split('-')[2]);

      const cardsArray = allArguments[currentArgumentIdForDrag].cards;
      const [movedCard] = cardsArray.splice(draggedIndex, 1);

      let insertIndex;
      if (dropPosition === 'before') {
        insertIndex = dropTargetIndex > draggedIndex ? dropTargetIndex - 1 : dropTargetIndex;
      } else {
        insertIndex = dropTargetIndex >= draggedIndex ? dropTargetIndex : dropTargetIndex + 1;
      }

      cardsArray.splice(insertIndex, 0, movedCard);

      saveAllArguments();
      displayCards(currentArgumentIdForDrag);
    } else {
      draggedCard.style.top = '';
      draggedCard.classList.remove('is-dragging');
    }

    //cleanup
    document.querySelectorAll('.card').forEach(card => {
      card.classList.remove('drop-before');
      card.classList.remove('drop-after');
      card.style.pointerEvents = '';
    });
    draggedCard.style.cursor = '';
    const buttons = draggedCard.getElementsByTagName('button');
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      btn.style.pointerEvents = '';
    }
    document.getElementById('output').style.marginBottom = '';

    releaseArgumentMutex(currentArgumentIdForDrag);

    draggedCard = null;
    draggedIndex = null;
    cardOriginalPosition = null;
    currentArgumentIdForDrag = null;
    lastDropZone = null;
    lastDropPosition = null;
  }
}

function setupCardDragAndDrop(cardId, argumentId, index) {
  const cardElement = document.getElementById(cardId);
  if (!cardElement) return;

  const dragHandle = document.getElementById('drag-handle-' + argumentId + '-' + index);
  if (!dragHandle) return;

  const handleDragDown = (event) => {
    if (!acquireArgumentMutex(argumentId)) {
      dragHandle.textContent = 'Mutex Locked!';
      setTimeout(() => { dragHandle.textContent = 'Move'; }, 2000);
      return;
    }

    isDragging = true;
    dragHandle.style.cursor = 'grabbing';
    draggedCard = cardElement;
    draggedIndex = index;
    currentArgumentIdForDrag = argumentId;

    const rect = cardElement.getBoundingClientRect();
    const clientY = event.clientY !== undefined ? event.clientY : (event.touches ? event.touches[0].clientY : 0);
    cardOffsetY = clientY - rect.top;
    document.documentElement.style.setProperty('--dragged-card-height', `${rect.height}px`);

    const originalScrollY = window.scrollY;
    cardElement.classList.add('is-dragging');

    if (draggedIndex - 1 >= 0) {
      const previousCard = document.getElementById(`card-${currentArgumentIdForDrag}-${draggedIndex - 1}`);
      if (previousCard) {
        previousCard.classList.add('drop-after');
      }
    }
    document.getElementById('output').style.marginBottom = 2 * rect.height + 'px';

    const cards = Array.from(document.querySelectorAll('.card:not(.is-dragging)'));
    cards.forEach(card => {
      card.style.pointerEvents = 'none';
    });
    draggedCard.style.cursor = 'grabbing';
    const buttons = draggedCard.getElementsByTagName('button');
    for (let i = 0; i < buttons.length; i++) {
      const btn = buttons[i];
      btn.style.pointerEvents = 'none';
    }

    handleDragMove(event);
    window.scrollTo(window.scrollX, originalScrollY);

    //prevent text selection
    if (event.preventDefault) {
      event.preventDefault();
    }
  }

  dragHandle.addEventListener('mousedown', handleDragDown);
  dragHandle.addEventListener('touchstart', (event) => {
    handleDragDown({ touches: event.touches });
    event.preventDefault();
  }, { passive: false });
}

function uncutCard(argumentId, index) {
  if (!allArguments[argumentId] || !allArguments[argumentId].cards[index]) return;

  if (!acquireCardMutex(argumentId, index)) {
    const uncutButton = document.getElementById(`uncut-button-${argumentId}-${index}`);
    if (uncutButton) {
      const originalText = uncutButton.innerHTML;
      uncutButton.innerHTML = 'Mutex Locked!';
      setTimeout(() => { uncutButton.innerHTML = originalText; }, 2000);
    }
    return;
  }

  const card = allArguments[argumentId].cards[index];
  card.cut = false;
  card.isCutting = false;
  card.content.citation = null;
  card.content.body_text = null;
  saveAllArguments();
  if (currentArgumentId === argumentId) {
    displayCards(argumentId);
  }

  releaseCardMutex(argumentId, index);
}

async function cutCard(argumentId, index) {
  if (!allArguments[argumentId] || !allArguments[argumentId].cards[index]) return;

  if (!acquireCardMutex(argumentId, index)) {
    const buttonDiv = document.getElementById(`cut-card-button-${argumentId}-${index}`);
    if (buttonDiv) {
      buttonDiv.innerHTML = 'Mutex Locked!';
      setTimeout(() => { buttonDiv.innerHTML = 'Cut Card'; }, 2000);
    }
    return;
  }

  if (allArguments[argumentId].cards[index].content.tagline.trim() === '') {
    const buttonDiv = document.getElementById(`cut-card-button-${argumentId}-${index}`);
    if (buttonDiv) {
      buttonDiv.innerHTML = 'No Tagline!';
      setTimeout(() => { buttonDiv.innerHTML = 'Cut Card'; }, 2000);
    }
    releaseCardMutex(argumentId, index);
    return;
  }
  if (allArguments[argumentId].cards[index].content.source === null) {
    const buttonDiv = document.getElementById(`cut-card-button-${argumentId}-${index}`);
    if (buttonDiv) {
      buttonDiv.innerHTML = 'No Source!';
      setTimeout(() => { buttonDiv.innerHTML = 'Cut Card'; }, 2000);
    }
    releaseCardMutex(argumentId, index);
    return;
  }

  const card = allArguments[argumentId].cards[index];

  card.isCutting = true;
  saveAllArguments();

  const buttonDiv = document.getElementById(`cut-card-button-${argumentId}-${index}`);
  if (buttonDiv) {
    buttonDiv.innerHTML = 'Cutting...';
    buttonDiv.style.pointerEvents = 'none';
  }
  const cardBodyDiv = document.getElementById(`card-body-${argumentId}-${index}`);
  if (cardBodyDiv) {
    cardBodyDiv.innerHTML = '<span style="font-style: italic; font-family: Inter">Card is currently being cut...</span>';
  }

  try {
    const response = await fetch('https://aristeia.kjljixx.com/cut_card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card: [card.content.tagline, card.content.source],
        model: settings.model,
        citation_format: settings.citationFormat.replace("\n", "") || "{cite}%last% '%y%{/cite} [%author%; %date%; %publication, \"%title%,\" %url%; Accessed %accessed%]"
      })
    });

    const cutText = await response.json();
    if (!cutText || typeof cutText !== 'string') {
      throw new Error('Invalid response from /cutCard');
    }
    const split = cutText.split('\n');
    var idx = 0;
    while (!split[idx].startsWith("{cite}")) {
      idx += 1;
    }
    const citeText = split[idx];
    idx += 1; //get line after cite
    const bodyText = split[idx];
    card.cut = true;
    card.isCutting = false;
    card.content.citation = citeText;
    card.content.body_text = bodyText;
    saveAllArguments();

    if (currentArgumentId === argumentId) {
      formatCard(argumentId, index);
      const cardDiv = document.getElementById(`card-${argumentId}-${index}`);
      if (cardDiv) {
        cardDiv.classList.remove('uncut-card');
        cardDiv.classList.add('cut-card');
      }
    }

    releaseCardMutex(argumentId, index);
  } catch (error) {
    card.isCutting = false;
    saveAllArguments();

    if (buttonDiv) {
      console.error('Error cutting card:', error);
      if (cardBodyDiv) {
        cardBodyDiv.innerHTML = '<span style="font-style: italic; font-family: Inter">Error: See Console</span>';
        setTimeout(() => {
          cardBodyDiv.innerHTML = `<span style="font-style: italic; font-family: Inter">No Body Text; press 'Cut Card' below to cut with AI, or press this text box to manually cut</span>`;
        }, 2000);
      }
      buttonDiv.innerHTML = 'Error: See Console';
      setTimeout(() => {
        buttonDiv.innerHTML = 'Cut Card';
        buttonDiv.style.pointerEvents = '';
      }, 2000);
    }

    releaseCardMutex(argumentId, index);
  }
}

async function cutAllCards(argumentId) {
  if (!allArguments[argumentId]) return;

  const cards = allArguments[argumentId].cards;
  const uncutCards = cards.map((card, index) => ({ card, index })).filter(({ card }) => !card.cut && !card.isCutting);

  if (uncutCards.length === 0) {
    const cutAllButton = document.getElementById('cut-all-cards-button');
    if (cutAllButton) {
      cutAllButton.textContent = 'No cards to cut!';
      setTimeout(() => { cutAllButton.textContent = 'Cut All Cards'; }, 2000);
    }
    return;
  }

  allArguments[argumentId].isCuttingAll = true;
  saveAllArguments();

  const cutAllButton = document.getElementById('cut-all-cards-button');
  if (cutAllButton) {
    cutAllButton.textContent = 'Cutting...';
    cutAllButton.style.pointerEvents = 'none';
  }

  for (let i = 0; i < uncutCards.length; i++) {
    const { index } = uncutCards[i];
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, 500)); //don't want to ddos myself
    }
    cutCard(argumentId, index);
  }

  const checkInterval = setInterval(() => {
    const stillCutting = allArguments[argumentId].cards.some(card => card.isCutting);
    if (!stillCutting) {
      clearInterval(checkInterval);
      allArguments[argumentId].isCuttingAll = false;
      saveAllArguments();

      const cutAllButton = document.getElementById('cut-all-cards-button');
      if (cutAllButton) {
        cutAllButton.textContent = 'Cut All Cards';
        cutAllButton.style.pointerEvents = '';
      }
    }
  }, 500);
}

async function formatCard(argumentId, index) {
  if (!allArguments[argumentId] || !allArguments[argumentId].cards[index]) return;

  const citeDiv = document.getElementById(`cite-${argumentId}-${index}`);
  const bodyDiv = document.getElementById(`card-body-${argumentId}-${index}`);
  if (!citeDiv || !bodyDiv) return;

  const card = allArguments[argumentId].cards[index];
  const citeText = card.content.citation;
  if (citeText) {
    const regex = /https?:\/\/[^;]+/;
    const htmlCiteText = citeText.replaceAll('{cite}', '<span class="cite-text">').replaceAll('{/cite}', '</span>')
      .replace(regex, (match) => '<a href="' + match + '" target="_blank">' + match + '</a>')
      .replaceAll('<br>', '')
      .replaceAll('</br>', '');
    citeDiv.innerHTML = htmlCiteText ? htmlCiteText : '<span style="font-style: italic; font-family: Inter">No Citation</span>';
  }
  else {
    citeDiv.innerHTML = '<span style="font-style: italic; font-family: Inter">No Citation</span>';
  }

  const bodyTextLine = card.content.body_text;
  const htmlBodyText = bodyTextLine.replaceAll('{highlight}', '<mark class="card-highlight">').replaceAll('{/highlight}', '</mark>')
    .replaceAll('{emphasize}', '<em class="card-emphasize">').replaceAll('{/emphasize}', '</em>')
    .replaceAll('{underline}', '<u class="card-underline">').replaceAll('{/underline}', '</u>');
  bodyDiv.innerHTML = `<span>${htmlBodyText}</span>`;
}

