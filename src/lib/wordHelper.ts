import { TWL_SCORES, ENABLE_SCORES, SOWPODS_SCORES } from '../data/tileScores';
import { showToast } from './toast';

export const TILE_SCORES = {
  TWL: TWL_SCORES,
  SOWPODS: SOWPODS_SCORES,
  ENABLE: ENABLE_SCORES,
};

interface WordResult {
  word: string;
  score: number;
  length: number;
  blanksUsed: number[];
}

export function initWordFinder(options: { defaultDict: 'TWL' | 'SOWPODS' | 'ENABLE' }) {
  const form = document.getElementById('word-finder-form') as HTMLFormElement | null;
  const lettersInput = document.getElementById('letters-input') as HTMLInputElement | null;
  const container = document.getElementById('results-container');
  const emptyState = document.getElementById('results-empty-state');
  const dictInput = document.getElementById('dict-input') as HTMLInputElement | null;

  // Modal elements
  const modal = document.getElementById('definition-modal');
  const modalTitle =
    document.getElementById('definition-title') || document.getElementById('modal-word-title');
  const modalBody =
    document.getElementById('definition-body') || document.getElementById('modal-body');
  const modalCloseBtn =
    document.getElementById('definition-close') || document.getElementById('modal-close-btn');

  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
  }

  if (!container) return;

  let allResults: WordResult[] = [];
  let currentSort = 'score';
  let currentDict = options.defaultDict;

  const loadingState = document.getElementById('results-loading');
  const errorState = document.getElementById('results-error');
  const emptyTitle = document.getElementById('results-empty-title');
  const emptyText = document.getElementById('results-empty-text');
  const retryBtn = document.getElementById('results-retry-btn');

  const searchBtn = document.getElementById('find-words-btn') as HTMLButtonElement | null;
  const btnDefault = document.getElementById('btn-default');
  const btnLoading = document.getElementById('btn-loading');

  function setButtonLoading(isLoading: boolean) {
    if (searchBtn) {
      searchBtn.disabled = isLoading;
      if (isLoading) {
        searchBtn.classList.add('opacity-75', 'cursor-not-allowed');
      } else {
        searchBtn.classList.remove('opacity-75', 'cursor-not-allowed');
      }
    }
    if (isLoading) {
      btnDefault?.classList.add('hidden');
      btnLoading?.classList.remove('hidden');
      btnLoading?.classList.add('flex');
    } else {
      btnDefault?.classList.remove('hidden');
      btnLoading?.classList.add('hidden');
      btnLoading?.classList.remove('flex');
    }
  }

  function showLoading() {
    loadingState?.classList.remove('hidden');
    errorState?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    container!.classList.add('hidden');
  }

  function showEmptyState(isNoResults = false) {
    loadingState?.classList.add('hidden');
    errorState?.classList.add('hidden');
    emptyState?.classList.remove('hidden');
    container!.classList.remove('hidden');
    container!.innerHTML = '';
    if (emptyState) {
      container!.appendChild(emptyState);
    }

    if (isNoResults) {
      if (emptyTitle) emptyTitle.textContent = 'No valid words found for those letters.';
      if (emptyText) emptyText.innerHTML = 'Try different letters or a different dictionary.';
    } else {
      if (emptyTitle) emptyTitle.textContent = 'Enter your letters above to find words';
      if (emptyText)
        emptyText.innerHTML = `Use <code class="bg-[var(--color-border)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded text-xs">?</code> for blank tiles`;
    }

    if (typeof (window as any).updateAICoach === 'function') {
      (window as any).updateAICoach('', []);
    }
  }

  function showErrorState(msg?: string) {
    loadingState?.classList.add('hidden');
    // errorState?.classList.remove('hidden'); // Removed inline error block
    showEmptyState(false); // Show empty state so it doesn't just disappear
    showToast(msg || 'Something went wrong. Please try again.', 'error');
  }

  function showNoResults() {
    showEmptyState(true);
  }

  function sortResults(results: WordResult[]) {
    const copy = [...results];
    switch (currentSort) {
      case 'score':
        copy.sort((a, b) => b.score - a.score || b.word.length - a.word.length);
        break;
      case 'length':
        copy.sort((a, b) => b.word.length - a.word.length || b.score - a.score);
        break;
      case 'alpha':
        copy.sort((a, b) => a.word.localeCompare(b.word));
        break;
    }
    return copy;
  }

  function groupByLength(results: WordResult[]) {
    const groups: Record<number, WordResult[]> = {};
    results.forEach((r) => {
      const len = r.word.length;
      if (!groups[len]) groups[len] = [];
      groups[len].push(r);
    });
    return groups;
  }

  function renderTiles(
    word: string,
    dict: 'TWL' | 'SOWPODS' | 'ENABLE',
    blanksUsed: number[] = [],
  ) {
    const scores = TILE_SCORES[dict] || TILE_SCORES.TWL;
    return word
      .toUpperCase()
      .split('')
      .map((ch, i) => {
        const isBlank = blanksUsed.includes(i);
        const pts = isBlank ? 0 : scores[ch as keyof typeof scores] || 0;
        const mutedClass = isBlank ? ' tile-blank' : '';
        return `<span class="tile${mutedClass}">${ch}<sub>${pts}</sub></span>`;
      })
      .join('');
  }

  function calcScore(word: string, dict: 'TWL' | 'SOWPODS' | 'ENABLE', blanksUsed: number[] = []) {
    const scores = TILE_SCORES[dict] || TILE_SCORES.TWL;
    return word
      .toUpperCase()
      .split('')
      .reduce((t, c, i) => {
        if (blanksUsed.includes(i)) return t;
        return t + (scores[c as keyof typeof scores] || 0);
      }, 0);
  }

  function renderResults() {
    const sorted = sortResults(allResults);
    if (!sorted.length) {
      showNoResults();
      return;
    }

    loadingState?.classList.add('hidden');
    errorState?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    container!.classList.remove('hidden');

    const groups = groupByLength(sorted);
    const lengths = Object.keys(groups).sort((a, b) => Number(b) - Number(a));

    let html = `
      <div class="flex flex-wrap items-center justify-between mb-6 gap-4">
        <p class="text-sm text-[var(--color-text-muted)]"><strong class="text-[var(--color-text-main)]">${sorted.length}</strong> words found</p>
        <div class="flex items-center gap-2">
          <label class="text-xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium">Sort:</label>
          <select id="sort-select" class="text-sm border border-[var(--color-border)] rounded-lg px-3 py-1.5 bg-[var(--color-card)] text-[var(--color-text-main)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent">
            <option value="score"${currentSort === 'score' ? ' selected' : ''}>Highest Score</option>
            <option value="length"${currentSort === 'length' ? ' selected' : ''}>Word Length</option>
            <option value="alpha"${currentSort === 'alpha' ? ' selected' : ''}>A → Z</option>
          </select>
        </div>
      </div>`;

    html += `<div class="flex flex-wrap gap-2 mb-6 border-b border-[var(--color-border)] pb-4">`;
    lengths.forEach((len, i) => {
      const active = i === 0;
      html += `<button class="length-tab px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${active ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-main)]'}" data-length="${len}">${len}-letter <span class="opacity-70">(${groups[Number(len)].length})</span></button>`;
    });
    html += `</div>`;

    const favorites: string[] = JSON.parse(localStorage.getItem('scrabble_favorites') || '[]');

    lengths.forEach((len, i) => {
      html += `<div class="length-group${i === 0 ? '' : ' hidden'}" data-group="${len}">`;
      groups[Number(len)].forEach(({ word, score, blanksUsed }) => {
        const isFav = favorites.includes(word.toUpperCase());
        const favIcon = isFav
          ? `<svg class="h-4 w-4 text-red-500 fill-red-500" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`
          : `<svg class="h-4 w-4 text-[var(--color-text-muted)] hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`;

        html += `
          <div class="word-result-row" tabindex="0" role="button" data-word="${word}" data-blanks="${JSON.stringify(blanksUsed || [])}">
            <div class="flex items-center gap-1">${renderTiles(word, currentDict, blanksUsed)}</div>
            <div class="flex items-center gap-3">
              <span class="score-badge">${score} pts</span>
              <button class="text-sm text-[var(--color-primary)] hover:underline lookup-btn" data-lookup="${word}" data-blanks="${JSON.stringify(blanksUsed || [])}">Look up</button>
              <button class="p-1 rounded-lg hover:bg-[var(--color-bg-alt)] transition-colors fav-word-btn flex items-center justify-center cursor-pointer" data-fav-word="${word.toUpperCase()}" title="${isFav ? 'Remove from Favorites' : 'Add to Favorites'}">
                ${favIcon}
              </button>
            </div>
          </div>`;
      });
      html += `</div>`;
    });

    container!.innerHTML = html;

    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e: Event) => {
        currentSort = (e.target as HTMLSelectElement).value;
        renderResults();
      });
    }

    container!.querySelectorAll('.length-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        container!.querySelectorAll('.length-tab').forEach((t) => {
          t.classList.remove('bg-[var(--color-primary)]', 'text-white');
          t.classList.add('bg-[var(--color-bg-alt)]', 'text-[var(--color-text-muted)]');
        });
        tab.classList.add('bg-[var(--color-primary)]', 'text-white');
        tab.classList.remove('bg-[var(--color-bg-alt)]', 'text-[var(--color-text-muted)]');
        container!.querySelectorAll('.length-group').forEach((g) => g.classList.add('hidden'));
        const target = container!.querySelector(
          `[data-group="${(tab as HTMLElement).dataset.length}"]`,
        );
        if (target) target.classList.remove('hidden');
      });
    });

    container!.querySelectorAll('.lookup-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const word = (btn as HTMLElement).dataset.lookup || '';
        const blanksStr = (btn as HTMLElement).dataset.blanks || '[]';
        const blanks = JSON.parse(blanksStr);
        showDefinition(word, blanks);
      });
    });

    container!.querySelectorAll('.fav-word-btn').forEach((btn) => {
      const word = (btn as HTMLElement).dataset.favWord;
      if (!word) return;

      let timer: ReturnType<typeof setTimeout> | null = null;
      let isLongPress = false;
      let ignoreNextClick = false;

      function triggerToggle() {
        const currentFavs: string[] = JSON.parse(
          localStorage.getItem('scrabble_favorites') || '[]',
        );
        const idx = currentFavs.indexOf(word!);
        if (idx !== -1) {
          currentFavs.splice(idx, 1);
          btn.innerHTML = `<svg class="h-4 w-4 text-[var(--color-text-muted)] hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`;
          btn.setAttribute('title', 'Add to Favorites');
        } else {
          currentFavs.push(word!);
          btn.innerHTML = `<svg class="h-4 w-4 text-red-500 fill-red-500" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>`;
          btn.setAttribute('title', 'Remove from Favorites');

          if (typeof (window as any).animateFavoriteHeart === 'function') {
            (window as any).animateFavoriteHeart(btn);
          }
        }
        localStorage.setItem('scrabble_favorites', JSON.stringify(currentFavs));

        btn.classList.remove('animate-heart-pop');
        void (btn as HTMLElement).offsetWidth; // force reflow
        btn.classList.add('animate-heart-pop');

        // Fire global event to notify the dashboard drawer
        window.dispatchEvent(new CustomEvent('scrabble_favorites_changed'));
      }

      function startPress(e: Event) {
        if (e.type === 'touchstart') {
          e.preventDefault();
        } else if (e.type === 'mousedown' && (e as MouseEvent).button !== 0) {
          return;
        }
        e.stopPropagation();
        isLongPress = false;
        btn.classList.add('heart-grow');

        timer = setTimeout(() => {
          isLongPress = true;
          ignoreNextClick = true;
          btn.classList.remove('heart-grow');
          triggerToggle();
          if ('vibrate' in navigator) {
            navigator.vibrate(40);
          }
        }, 600); // 600ms hold time
      }

      function endPress(e: Event) {
        if (e.type === 'touchend') {
          e.preventDefault();
        }
        e.stopPropagation();

        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        btn.classList.remove('heart-grow');

        if (!isLongPress) {
          if (e.type === 'touchend') {
            triggerToggle();
          }
        }
      }

      function cancelPress(e: Event) {
        e.stopPropagation();
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        btn.classList.remove('heart-grow');
      }

      btn.addEventListener('mousedown', startPress);
      btn.addEventListener('mouseup', endPress);
      btn.addEventListener('mouseleave', cancelPress);

      btn.addEventListener('touchstart', startPress, { passive: false });
      btn.addEventListener('touchend', endPress, { passive: false });
      btn.addEventListener('touchcancel', cancelPress);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (ignoreNextClick) {
          ignoreNextClick = false;
          return;
        }
        triggerToggle();
      });

      btn.addEventListener('animationend', () => {
        btn.classList.remove('animate-heart-pop');
      });
    });

    container!.querySelectorAll('.word-result-row').forEach((row) => {
      (row as HTMLElement).style.cursor = 'pointer';

      const handleAction = () => {
        const word = (row as HTMLElement).dataset.word || '';
        const blanksStr = (row as HTMLElement).dataset.blanks || '[]';
        const blanks = JSON.parse(blanksStr);
        showDefinition(word, blanks);
      };

      row.addEventListener('click', handleAction);
      row.addEventListener('keydown', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          e.preventDefault();
          handleAction();
        }
      });
    });
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  let previouslyFocusedElement: HTMLElement | null = null;

  async function showDefinition(word: string, blanksUsed: number[] = []) {
    previouslyFocusedElement = document.activeElement as HTMLElement | null;
    if (!modal || !modalTitle || !modalBody) return;
    modalTitle.textContent = word.toUpperCase();
    modalBody.innerHTML = `<div class="flex items-center justify-center py-8"><div class="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-primary)] rounded-full animate-spin"></div></div>`;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
    if (modalCloseBtn) modalCloseBtn.focus();

    try {
      const res = await fetch(`/api/definition?word=${encodeURIComponent(word.toLowerCase())}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();

      if (!data.definitions || data.definitions.length === 0) {
        throw new Error('No definition available');
      }

      let html = '';
      html += `<div class="flex items-center gap-1 mb-4">${renderTiles(word, currentDict, blanksUsed)}<span class="ml-2 score-badge">${calcScore(word, currentDict, blanksUsed)} pts</span></div>`;
      if (data.source) {
        html += `<p class="text-xs text-[var(--color-text-muted)] italic mb-4">Definition provided by ${escapeHtml(data.source)}</p>`;
      }

      data.definitions.forEach((meaning: { partOfSpeech?: string; definitions?: { definition?: string; example?: string }[] }) => {
        html += `<div class="mb-4"><span class="inline-block text-xs font-semibold uppercase tracking-wide bg-[var(--color-bg-alt)] text-[var(--color-text-muted)] px-2 py-0.5 rounded mb-2">${escapeHtml(meaning.partOfSpeech || '')}</span>`;
        html += `<ol class="list-decimal list-inside space-y-1.5 text-sm text-[var(--color-text-main)]">`;
        meaning.definitions?.slice(0, 3).forEach((def) => {
          html += `<li>${escapeHtml(def.definition || '')}`;
          if (def.example)
            html += `<p class="text-[var(--color-text-muted)] opacity-80 italic ml-5 mt-0.5">"${escapeHtml(def.example)}"</p>`;
          html += `</li>`;
        });
        html += `</ol></div>`;
      });
      html += `<div class="mt-6 border-t border-[var(--color-border)] pt-4 text-center">
        <a href="/word/${word.toLowerCase()}" class="btn-primary inline-flex items-center justify-center text-sm font-semibold !px-5 !py-2.5 shadow-sm rounded-xl">
          View Anagrams, Strategy & More details →
        </a>
      </div>`;
      modalBody.innerHTML = html;
    } catch {
      modalBody.innerHTML = `
        <div class="flex items-center gap-1 mb-4">${renderTiles(word, currentDict, blanksUsed)}<span class="ml-2 score-badge">${calcScore(word, currentDict, blanksUsed)} pts</span></div>
        <p class="text-[var(--color-text-muted)] text-sm mb-4">No definition available for <strong>${escapeHtml(word.toUpperCase())}</strong>. This word is valid in Scrabble dictionaries.</p>
        <div class="mt-6 border-t border-[var(--color-border)] pt-4 text-center">
          <a href="/word/${word.toLowerCase()}" class="btn-primary inline-flex items-center justify-center text-sm font-semibold !px-5 !py-2.5 shadow-sm rounded-xl">
            View Anagrams, Strategy & More details →
          </a>
        </div>`;
    }
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modal)
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  function closeModal() {
    if (modal && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      modal.setAttribute('aria-hidden', 'true');
      if (previouslyFocusedElement) {
        previouslyFocusedElement.focus();
      }
    }
  }

  async function doSearch() {
    const letters = lettersInput?.value?.trim();
    if (!letters) return;

    const startsWith =
      (document.getElementById('starts-with') as HTMLInputElement | null)?.value?.trim() || '';
    const endsWith =
      (document.getElementById('ends-with') as HTMLInputElement | null)?.value?.trim() || '';
    const mustInclude =
      (document.getElementById('must-include') as HTMLInputElement | null)?.value?.trim() || '';

    const dictValue = dictInput?.value || 'twl';
    currentDict = dictValue.toUpperCase() as 'TWL' | 'SOWPODS' | 'ENABLE';

    showLoading();
    setButtonLoading(true);
    if (form) form.setAttribute('aria-busy', 'true');

    try {
      const params = new URLSearchParams();
      params.set('letters', letters);
      params.set('dict', currentDict);
      if (startsWith) params.set('startsWith', startsWith);
      if (endsWith) params.set('endsWith', endsWith);
      if (mustInclude) params.set('contains', mustInclude);

      const res = await fetch(`/api/find-words?${params.toString()}`);

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch {}
        throw new Error(errorMsg);
      }
      const data = await res.json();
      allResults = data.words || [];
      if (typeof (window as any).updateAICoach === 'function') {
        (window as any).updateAICoach(letters, allResults);
      }

      // Log successful search rack to history
      const searchVal = letters.toUpperCase().replace(/[^A-Z?]/g, '');
      if (searchVal.length >= 2) {
        const recents: string[] = JSON.parse(
          localStorage.getItem('scrabble_recent_searches') || '[]',
        );
        const idx = recents.indexOf(searchVal);
        if (idx !== -1) recents.splice(idx, 1);
        recents.unshift(searchVal);
        localStorage.setItem('scrabble_recent_searches', JSON.stringify(recents.slice(0, 8)));
        window.dispatchEvent(new Event('scrabble_recent_searches_changed'));
      }

      renderResults();
      container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err: unknown) {
      showErrorState(err instanceof Error ? err.message : String(err));
      errorState?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } finally {
      setButtonLoading(false);
      if (form) form.setAttribute('aria-busy', 'false');
    }
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      doSearch();
    });
  }

  if (form) {
    form.setAttribute('novalidate', 'true');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      doSearch();
    });
  }

  if (lettersInput) {
    lettersInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doSearch();
      }
    });
  }

  // Hook up dynamic dictionary toggle listeners to update immediately if dictionary changes
  const checkButtons = () => {
    const newDict = (dictInput?.value || 'twl').toUpperCase() as 'TWL' | 'SOWPODS' | 'ENABLE';
    if (newDict !== currentDict) {
      currentDict = newDict;
      if (allResults.length > 0) {
        doSearch(); // Re-run search to get scores for the new dictionary
      }
    }
  };

  // Watch hidden input changes by polling or listening to click on dictionary buttons
  document.querySelectorAll('.dict-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      setTimeout(checkButtons, 50);
    });
  });

  // Prefill letters from URL query parameter ?letters=
  const urlParams = new URLSearchParams(window.location.search);
  const lettersParam = urlParams.get('letters');
  if (lettersParam && lettersInput) {
    const sanitizedLetters = lettersParam.toUpperCase().replace(/[^A-Z?]/g, '');
    if (sanitizedLetters) {
      lettersInput.value = sanitizedLetters;
      lettersInput.dispatchEvent(new Event('input'));
      doSearch();
    }
  }
}
