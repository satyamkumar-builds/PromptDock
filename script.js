const searchInput = document.querySelector('#search-input');
const importButton = document.querySelector('#import-btn');
const exportButton = document.querySelector('#export-btn');
const importFile = document.querySelector('#import-file');
const newButton = document.querySelector('#new-btn');
const themeButton = document.querySelector('#theme-btn');

const sidebar = document.querySelector('#sidebar');
const tagList = document.querySelector('#tag-list');
const allCount = document.querySelector('#all-count');
const favoriteCount = document.querySelector('#favorite-count');

const libraryView = document.querySelector('#library-view');
const editorView = document.querySelector('#editor-view');
const libraryCount = document.querySelector('#library-count');
const sortSelect = document.querySelector('#sort-select');
const promptGrid = document.querySelector('#prompt-grid');

const promptForm = document.querySelector('#prompt-form');
const editorTitle = document.querySelector('#editor-title');
const titleInput = document.querySelector('#title-input');
const tagsInput = document.querySelector('#tags-input');
const templateInput = document.querySelector('#template-input');
const charactersStat = document.querySelector('#characters-stat');
const wordsStat = document.querySelector('#words-stat');
const tokensStat = document.querySelector('#tokens-stat');
const variablesStat = document.querySelector('#variables-stat');
const variableFields = document.querySelector('#variable-fields');

const preview = document.querySelector('#preview');
const previewText = document.querySelector('#preview-text');
const copyFilledButton = document.querySelector('#copy-filled-btn');
const saveButton = document.querySelector('#save-btn');
const cancelButton = document.querySelector('#cancel-btn');

const outputTokens = document.querySelector('#output-tokens');
const outputTokensValue = document.querySelector('#output-tokens-value');
const costTableBody = document.querySelector('#cost-table tbody');
const toast = document.querySelector('#toast');

const defaultModels = [
  { name: 'Model A (small)', inputPrice: 0.25, outputPrice: 1.25 },
  { name: 'Model B (mid)', inputPrice: 3.00, outputPrice: 15.00 },
  { name: 'Model C (large)', inputPrice: 15.00, outputPrice: 75.00 }
];

const defaultPrompts = [
  {
    id: 'prompt-1',
    title: 'Explain code to a beginner',
    template: 'You are a patient {{role}} mentor. Explain the following {{language}} code to a beginner in simple words, then give one practice question.\n\nCode:\n{{code}}',
    tags: ['coding', 'teaching'],
    favorite: true,
    createdAt: '2026-10-01T10:00:00.000Z'
  },
  {
    id: 'prompt-2',
    title: 'Cold email to a recruiter',
    template: 'Write a short email to {{name}} about the {{role}} internship. Mention one project and keep it under 90 words.',
    tags: ['email', 'career'],
    favorite: false,
    createdAt: '2026-10-02T10:00:00.000Z'
  },
  {
    id: 'prompt-3',
    title: 'Summarize an article',
    template: 'Summarize the text below in five bullet points. Then list two questions the author did not answer.\n\nText:\n{{text}}',
    tags: ['summary', 'writing'],
    favorite: false,
    createdAt: '2026-10-03T10:00:00.000Z'
  },
  {
    id: 'prompt-4',
    title: 'Debug my error',
    template: 'Here is my error message and code. Explain the cause first, then show the smallest fix.\n\nError:\n{{error}}\n\nCode:\n{{code}}',
    tags: ['coding', 'debug'],
    favorite: false,
    createdAt: '2026-10-04T10:00:00.000Z'
  },
  {
    id: 'prompt-5',
    title: 'Interview practice',
    template: 'Act as an interviewer for a {{role}} role. Ask one question at a time and wait for my answer.\n\nExperience:\n{{experience}}',
    tags: ['interview', 'career'],
    favorite: false,
    createdAt: '2026-10-05T10:00:00.000Z'
  },
  {
    id: 'prompt-6',
    title: 'Rewrite in simple English',
    template: 'Rewrite this paragraph so a 12 year old can understand it. Keep the meaning and remove difficult words.\n\nParagraph:\n{{paragraph}}',
    tags: ['writing', 'edit'],
    favorite: false,
    createdAt: '2026-10-06T10:00:00.000Z'
  }
];

const state = {
  prompts: [],
  models: [],
  view: 'all',
  activeTag: '',
  search: '',
  sort: 'newest',
  expectedOutputTokens: 500,
  editingId: null,
  theme: 'light'
};

let variableValues = {};
let searchTimer;
let toastTimer;

function uid() {
  return 'prompt-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function estimateTokens(text) {
  if (!text) {
    return 0;
  }

  return Math.ceil(text.length / 4);
}

function countWords(text) {
  const cleanText = text.trim();

  if (!cleanText) {
    return 0;
  }

  return cleanText.split(/\s+/).filter(Boolean).length;
}

function extractVariables(template) {
  const matches = template.match(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g) || [];
  const names = matches.map(function (item) {
    return item.replace(/{{|}}/g, '').trim();
  });

  return [...new Set(names)];
}

function fillTemplate(template, values) {
  return template.replace(/{{\s*([a-zA-Z0-9_-]+)\s*}}/g, function (match, name) {
    const value = values[name];

    if (value === undefined || value === '') {
      return match;
    }

    return value;
  });
}

function calculateCost(inputTokens, outputTokenCount, model) {
  const inputCost = (inputTokens / 1000000) * model.inputPrice;
  const outputCost = (outputTokenCount / 1000000) * model.outputPrice;

  return inputCost + outputCost;
}

function getVisiblePrompts() {
  let prompts = [...state.prompts];

  if (state.view === 'favorites') {
    prompts = prompts.filter(function (prompt) {
      return prompt.favorite;
    });
  }

  if (state.activeTag) {
    prompts = prompts.filter(function (prompt) {
      return prompt.tags.includes(state.activeTag);
    });
  }

  if (state.search) {
    const searchText = state.search.toLowerCase();

    prompts = prompts.filter(function (prompt) {
      const fullText = [
        prompt.title,
        prompt.template,
        prompt.tags.join(' ')
      ].join(' ').toLowerCase();

      return fullText.includes(searchText);
    });
  }

  if (state.sort === 'tokens') {
    prompts.sort(function (a, b) {
      return estimateTokens(b.template) - estimateTokens(a.template);
    });
  } else {
    prompts.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  return prompts;
}

function saveState() {
  const data = {
    prompts: state.prompts,
    models: state.models,
    theme: state.theme
  };

  localStorage.setItem('promptdock-data', JSON.stringify(data));
}

function loadState() {
  const saved = localStorage.getItem('promptdock-data');

  if (!saved) {
    state.prompts = [...defaultPrompts];
    state.models = [...defaultModels];
    state.theme = 'light';
    return;
  }

  try {
    const data = JSON.parse(saved);

    state.prompts = Array.isArray(data.prompts) ? data.prompts : [...defaultPrompts];
    state.models = Array.isArray(data.models) && data.models.length ? data.models : [...defaultModels];
    state.theme = data.theme === 'dark' ? 'dark' : 'light';
  } catch (error) {
    state.prompts = [...defaultPrompts];
    state.models = [...defaultModels];
    state.theme = 'light';
    showToast('Saved data could not be loaded. Using sample prompts.');
  }
}

function renderTags() {
  const tags = [...new Set(state.prompts.flatMap(function (prompt) {
    return prompt.tags;
  }))].sort();

  tagList.textContent = '';

  tags.forEach(function (tag) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'tag';
    button.textContent = tag;

    if (state.activeTag === tag) {
      button.classList.add('active');
    }

    button.addEventListener('click', function () {
      if (state.activeTag === tag) {
        state.activeTag = '';
      } else {
        state.activeTag = tag;
        state.view = 'all';
      }

      updateActiveNav();
      renderTags();
      renderGrid();
    });

    tagList.appendChild(button);
  });
}

function updateCounts() {
  allCount.textContent = state.prompts.length;
  favoriteCount.textContent = state.prompts.filter(function (prompt) {
    return prompt.favorite;
  }).length;
  libraryCount.textContent = '(' + getVisiblePrompts().length + ')';
}

function makeCard(prompt) {
  const card = document.createElement('article');
  card.className = 'prompt-card';

  const title = document.createElement('h2');
  title.textContent = prompt.title;

  const description = document.createElement('p');
  description.className = 'card-description';
  description.textContent = prompt.template;

  const tags = document.createElement('div');
  tags.className = 'card-tags';

  prompt.tags.forEach(function (tag) {
    const tagSpan = document.createElement('span');
    tagSpan.textContent = tag;
    tags.appendChild(tagSpan);
  });

  const footer = document.createElement('div');
  footer.className = 'card-footer';

  const meta = document.createElement('span');
  meta.className = 'card-meta';
  meta.textContent = '~' + estimateTokens(prompt.template) + ' tokens';

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const favoriteButton = document.createElement('button');
  favoriteButton.type = 'button';
  favoriteButton.className = 'favorite-button';
  favoriteButton.textContent = prompt.favorite ? '★' : '☆';
  favoriteButton.title = prompt.favorite ? 'Remove from favorites' : 'Add to favorites';

  if (prompt.favorite) {
    favoriteButton.classList.add('is-favorite');
  }

  favoriteButton.addEventListener('click', function () {
    prompt.favorite = !prompt.favorite;
    saveState();
    renderAll();
  });

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.textContent = 'Copy';

  copyButton.addEventListener('click', function () {
    copyText(prompt.template);
  });

  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.textContent = 'Edit';

  editButton.addEventListener('click', function () {
    openEditor(prompt);
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.textContent = 'Delete';

  deleteButton.addEventListener('click', function () {
    const shouldDelete = window.confirm('Delete this prompt?');

    if (!shouldDelete) {
      return;
    }

    state.prompts = state.prompts.filter(function (item) {
      return item.id !== prompt.id;
    });

    saveState();
    renderAll();
    showToast('Prompt deleted.');
  });

  actions.appendChild(favoriteButton);
  actions.appendChild(copyButton);
  actions.appendChild(editButton);
  actions.appendChild(deleteButton);

  footer.appendChild(meta);
  footer.appendChild(actions);

  card.appendChild(title);
  card.appendChild(description);
  card.appendChild(tags);
  card.appendChild(footer);

  return card;
}

function renderGrid() {
  const prompts = getVisiblePrompts();

  promptGrid.textContent = '';

  if (!prompts.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No prompts found';
    promptGrid.appendChild(empty);
    updateCounts();
    return;
  }

  prompts.forEach(function (prompt) {
    promptGrid.appendChild(makeCard(prompt));
  });

  updateCounts();
}

function showView(viewName) {
  state.view = viewName;

  if (viewName === 'editor') {
    libraryView.hidden = true;
    editorView.hidden = false;
  } else {
    libraryView.hidden = false;
    editorView.hidden = true;
  }

  updateActiveNav();
  updateCounts();
}

function updateActiveNav() {
  const navButtons = sidebar.querySelectorAll('.nav-item');

  navButtons.forEach(function (button) {
    button.classList.toggle('active', button.dataset.view === state.view);
  });
}

function clearEditor() {
  promptForm.reset();
  state.editingId = null;
  variableValues = {};
  editorTitle.textContent = 'New prompt';
  previewText.textContent = 'Nothing to preview yet.';
  updateStats();
  renderVariableFields();
}

function openEditor(prompt) {
  showView('editor');
  state.editingId = prompt ? prompt.id : null;

  if (prompt) {
    editorTitle.textContent = 'Edit prompt';
    titleInput.value = prompt.title;
    tagsInput.value = prompt.tags.join(', ');
    templateInput.value = prompt.template;

    const variables = extractVariables(prompt.template);
    variableValues = {};

    variables.forEach(function (name) {
      variableValues[name] = '';
    });
  } else {
    clearEditor();
  }

  updateStats();
  renderVariableFields();
  updatePreview();
  renderCostTable();
}

function updateStats() {
  const template = templateInput.value;
  const variables = extractVariables(template);

  charactersStat.textContent = template.length;
  wordsStat.textContent = countWords(template);
  tokensStat.textContent = estimateTokens(template);
  variablesStat.textContent = variables.length;
}

function renderVariableFields() {
  const variables = extractVariables(templateInput.value);
  const oldValues = { ...variableValues };

  variableFields.textContent = '';

  variables.forEach(function (name) {
    const row = document.createElement('div');
    row.className = 'variable-row';

    const label = document.createElement('label');
    label.setAttribute('for', 'variable-' + name);
    label.textContent = name;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'variable-' + name;
    input.placeholder = 'Enter ' + name;
    input.value = oldValues[name] || '';

    variableValues[name] = input.value;

    input.addEventListener('input', function () {
      variableValues[name] = input.value;
      updatePreview();
    });

    row.appendChild(label);
    row.appendChild(input);
    variableFields.appendChild(row);
  });
}

function updatePreview() {
  const template = templateInput.value;
  const filled = fillTemplate(template, variableValues);

  previewText.textContent = '';
  addHighlightedText(previewText, filled);
}

function addHighlightedText(container, text) {
  const regex = /{{\s*[a-zA-Z0-9_-]+\s*}}/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const normalText = text.slice(lastIndex, match.index);

    if (normalText) {
      container.appendChild(document.createTextNode(normalText));
    }

    const variable = document.createElement('span');
    variable.className = 'var';
    variable.textContent = match[0];
    container.appendChild(variable);

    lastIndex = regex.lastIndex;
  }

  const endText = text.slice(lastIndex);

  if (endText) {
    container.appendChild(document.createTextNode(endText));
  }
}

function renderCostTable() {
  const inputTokens = estimateTokens(templateInput.value);
  const outputTokenCount = Number(outputTokens.value);

  outputTokensValue.textContent = outputTokenCount;
  state.expectedOutputTokens = outputTokenCount;
  costTableBody.textContent = '';

  const costs = state.models.map(function (model) {
    return calculateCost(inputTokens, outputTokenCount, model);
  });

  const cheapest = costs.length ? Math.min(...costs) : 0;

  state.models.forEach(function (model, index) {
    const row = document.createElement('tr');
    const cost = costs[index];

    if (cost === cheapest) {
      row.classList.add('best');
    }

    const nameCell = document.createElement('td');
    nameCell.textContent = model.name;

    const inputCell = document.createElement('td');
    const inputPrice = createPriceInput(model.inputPrice, 'Input price');
    inputCell.appendChild(inputPrice);

    const outputCell = document.createElement('td');
    const outputPrice = createPriceInput(model.outputPrice, 'Output price');
    outputCell.appendChild(outputPrice);

    const runCell = document.createElement('td');
    runCell.textContent = '$' + cost.toFixed(4) + ' / 1000: $' + (cost * 1000).toFixed(2);

    row.appendChild(nameCell);
    row.appendChild(inputCell);
    row.appendChild(outputCell);
    row.appendChild(runCell);

    costTableBody.appendChild(row);
  });
}

function createPriceInput(value, label) {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.step = '0.01';
  input.value = value;
  input.setAttribute('aria-label', label);

  input.addEventListener('change', function () {
    const newValue = Number(input.value);

    if (!Number.isFinite(newValue) || newValue < 0) {
      showToast('Price must be 0 or more.');
      input.value = value;
      return;
    }

    value = newValue;
    const modelIndex = [...costTableBody.querySelectorAll('tr')].indexOf(input.closest('tr'));
    const currentModel = state.models[modelIndex];

    if (label === 'Input price') {
      currentModel.inputPrice = newValue;
    } else {
      currentModel.outputPrice = newValue;
    }

    saveState();
    renderCostTable();
  });

  return input;
}

function savePrompt() {
  const title = titleInput.value.trim();
  const template = templateInput.value.trim();

  if (!title) {
    showToast('Please enter a title.');
    titleInput.focus();
    return;
  }

  if (!template) {
    showToast('Please enter a prompt template.');
    templateInput.focus();
    return;
  }

  const tags = tagsInput.value
    .split(',')
    .map(function (tag) {
      return tag.trim();
    })
    .filter(Boolean);

  const existingPrompt = state.prompts.find(function (prompt) {
    return prompt.id === state.editingId;
  });

  if (existingPrompt) {
    existingPrompt.title = title;
    existingPrompt.template = template;
    existingPrompt.tags = tags;
  } else {
    state.prompts.push({
      id: uid(),
      title: title,
      template: template,
      tags: tags,
      favorite: false,
      createdAt: new Date().toISOString()
    });
  }

  saveState();
  renderAll();
  showView('all');
  showToast(existingPrompt ? 'Prompt updated.' : 'Prompt saved.');
  clearEditor();
}

function renderAll() {
  renderTags();
  renderGrid();
  updateActiveNav();
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');

  toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 2000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Prompt copied to clipboard.');
  } catch (error) {
    showToast('Could not copy the prompt.');
  }
}

function copyFilledPrompt() {
  const filled = fillTemplate(templateInput.value, variableValues);

  if (!filled.trim()) {
    showToast('Nothing to copy yet.');
    return;
  }

  copyText(filled);
}

function downloadJSON() {
  const blob = new Blob([JSON.stringify({ prompts: state.prompts }, null, 2)], {
    type: 'application/json'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'promptdock-prompts.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Prompts exported.');
}

function importJSON(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener('load', function () {
    try {
      const data = JSON.parse(reader.result);

      if (!data || !Array.isArray(data.prompts)) {
        throw new Error('Invalid file');
      }

      const existingIds = new Set(state.prompts.map(function (prompt) {
        return prompt.id;
      }));

      const validPrompts = data.prompts.filter(function (prompt) {
        return prompt
          && typeof prompt.id === 'string'
          && typeof prompt.title === 'string'
          && typeof prompt.template === 'string'
          && Array.isArray(prompt.tags);
      });

      validPrompts.forEach(function (prompt) {
        if (!existingIds.has(prompt.id)) {
          state.prompts.push({
            id: prompt.id,
            title: prompt.title,
            template: prompt.template,
            tags: prompt.tags.map(String),
            favorite: Boolean(prompt.favorite),
            createdAt: prompt.createdAt || new Date().toISOString()
          });
        }
      });

      saveState();
      renderAll();
      showToast('Prompts imported.');
    } catch (error) {
      showToast('Invalid JSON file.');
    }
  });

  reader.addEventListener('error', function () {
    showToast('Could not read the file.');
  });

  reader.readAsText(file);
}

function applyTheme() {
  document.body.classList.toggle('dark', state.theme === 'dark');
  themeButton.textContent = state.theme === 'dark' ? 'Light' : 'Dark';
  themeButton.setAttribute(
    'aria-label',
    state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
  );
}

sidebar.addEventListener('click', function (event) {
  const button = event.target.closest('.nav-item');

  if (!button) {
    return;
  }

  const view = button.dataset.view;

  if (view === 'editor') {
    openEditor();
    return;
  }

  showView(view);
  renderGrid();
});

templateInput.addEventListener('input', function () {
  const newVariables = extractVariables(templateInput.value);

  newVariables.forEach(function (name) {
    if (!(name in variableValues)) {
      variableValues[name] = '';
    }
  });

  Object.keys(variableValues).forEach(function (name) {
    if (!newVariables.includes(name)) {
      delete variableValues[name];
    }
  });

  updateStats();
  renderVariableFields();
  updatePreview();
  renderCostTable();
});

searchInput.addEventListener('input', function () {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(function () {
    state.search = searchInput.value.trim();
    renderGrid();
  }, 200);
});

sortSelect.addEventListener('change', function () {
  state.sort = sortSelect.value;
  renderGrid();
});

outputTokens.addEventListener('input', function () {
  renderCostTable();
});

saveButton.addEventListener('click', savePrompt);

cancelButton.addEventListener('click', function () {
  clearEditor();
  showView('all');
});

copyFilledButton.addEventListener('click', copyFilledPrompt);

newButton.addEventListener('click', function () {
  openEditor();
});

importButton.addEventListener('click', function () {
  importFile.click();
});

importFile.addEventListener('change', function () {
  importJSON(importFile.files[0]);
  importFile.value = '';
});

exportButton.addEventListener('click', downloadJSON);

themeButton.addEventListener('click', function () {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
});

loadState();
applyTheme();
sortSelect.value = state.sort;
outputTokens.value = state.expectedOutputTokens;
renderAll();
renderCostTable();
clearEditor();
showView('all');
