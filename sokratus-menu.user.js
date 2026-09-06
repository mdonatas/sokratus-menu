// ==UserScript==
// @name         Sokratus – menu descriptions in orders
// @namespace    local.sokratus.menu
// @version      1.0.0
// @description  Show the weekly menu under order checkboxes, with scrollable day columns.
// @match        https://sokratus.maitinimoprojektai.lt/order?*
// @match        https://sokratus.maitinimoprojektai.lt/order
// @run-at       document-end
// @grant        none
// @noframes
// ==/UserScript==

(() => {
  'use strict';

  if (location.pathname !== '/order') return;
  const tables = [...document.querySelectorAll('table.order-table')];
  if (!tables.length || document.getElementById('sm-menu-style')) return;

  const normalize = text => text.replace(/\s+/g, ' ').trim();
  const weekdays = ['Pr', 'An', 'Tr', 'Kt', 'Pn'];
  const mealNames = new Map([['Pusryčiai', '1'], ['Pietūs', '2'], ['Pavakariai', '3']]);

  const style = document.createElement('style');
  style.id = 'sm-menu-style';
  style.textContent = `
    .sm-scroll {
      max-width: 100%; min-width: 0; overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .sm-scroll table.order-table {
      /* Adjust these three widths to taste. */
      --sm-day-width: clamp(14rem, 24vw, 18rem);
      --sm-label-width: 9rem;
      width: calc(var(--sm-label-width) + 5 * var(--sm-day-width));
      max-width: none; table-layout: fixed;
    }
    .sm-scroll table.order-table tr > :first-child {
      width: var(--sm-label-width);
    }
    .sm-scroll table.order-table td,
    .sm-scroll table.order-table th {
      box-sizing: border-box; white-space: normal; overflow-wrap: anywhere;
    }
    .sm-scroll table.order-table td:has(.order-checkbox) {
      vertical-align: top;
    }
    .sm-menu-description {
      margin: .65rem 0 0; padding: 0; color: #343a40;
      font-size: .875rem; font-weight: normal; line-height: 1.45;
      text-align: left; white-space: normal; overflow-wrap: anywhere;
    }
    .sm-menu-description ul { list-style: none; margin: 0; padding: 0; }
    .sm-menu-description li + li { margin-top: .3rem; }
    .sm-menu-note { color: #626970; font-size: .8rem; margin: .4rem 0 0; }
    .sm-menu-status { margin: .5rem 0; font-size: .875rem; color: #626970; }
  `;
  document.head.append(style);

  for (const table of tables) {
    let wrapper = table.parentElement;
    if (!wrapper.classList.contains('table-responsive')) {
      wrapper = document.createElement('div');
      table.before(wrapper);
      wrapper.append(table); // Move existing controls, preserving their event handlers.
    }
    wrapper.classList.add('sm-scroll');
    wrapper.tabIndex = 0;
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Maisto užsakymas – slinkite horizontaliai');
  }

  const status = document.createElement('p');
  status.className = 'sm-menu-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Įkeliamas valgiaraštis…';
  tables[0].parentElement.before(status);

  function parseMenu(doc) {
    const result = new Map();
    for (const panel of doc.querySelectorAll('.tab-pane[id^="nav-"]')) {
      const variant = /^nav-(\d+)$/.exec(panel.id)?.[1];
      const table = panel.querySelector('table');
      if (!variant || !table) continue;
      const days = [...table.rows[0].cells].map(cell => weekdays.indexOf(normalize(cell.textContent)));
      if (days.length !== 5 || new Set(days).size !== 5 || days.includes(-1)) continue;
      let meal;
      for (const row of [...table.rows].slice(1)) {
        if (row.classList.contains('group-row')) {
          meal = mealNames.get(normalize(row.cells[0].textContent));
          continue;
        }
        if (!meal || row.cells.length !== days.length) continue;
        [...row.cells].forEach((cell, index) => {
          const items = [...cell.querySelectorAll('li')].map(li => normalize(li.textContent)).filter(Boolean);
          if (!items.length && normalize(cell.textContent)) items.push(normalize(cell.textContent));
          const key = `${meal}_${variant}_${days[index]}`;
          result.set(key, [...(result.get(key) || []), ...items]);
        });
      }
    }
    if (![...result.values()].some(items => items.length)) throw new Error('Menu structure not found');
    return result;
  }

  function lookup(menu, meal, variant, day) {
    const exact = menu.get(`${meal}_${variant}_${day}`);
    if (exact?.length) return { items: exact };

    // These meals have separate order IDs, but are repeated in the main menu tabs.
    // Only use a shared description when all nonempty versions agree.
    if ((meal === '1' && variant === '9') || (meal === '3' && variant === '10')) {
      const candidates = [...menu.entries()]
        .filter(([key, items]) => key.startsWith(`${meal}_`) && key.endsWith(`_${day}`) && items.length)
        .map(([, items]) => items);
      if (candidates.length && candidates.every(items => JSON.stringify(items) === JSON.stringify(candidates[0]))) {
        return { items: candidates[0] };
      }
    }

    // The order calls this "2 VAR. dviguba porcija"; no separate menu is published.
    if (meal === '2' && variant === '13') {
      const items = menu.get(`2_2_${day}`);
      if (items?.length) return { items, note: '2 VAR valgiaraštis; atskiras dvigubos porcijos aprašymas nepateiktas.' };
    }
    // Two snacks are the regular snack in twice the quantity.
    if (meal === '2' && variant === '11') {
      const items = menu.get(`2_7_${day}`);
      if (items?.length) return { items, note: '2× kiekis.' };
    }
    return { items: [], note: 'Šio pasirinkimo aprašymas valgiaraštyje nepateiktas.' };
  }

  async function run() {
    const menuUrl = new URL(location.href);
    menuUrl.pathname = '/menu';
    menuUrl.hash = '';
    // Keep the current authentication ID and selected week; never embed them in this script.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(menuUrl, {
        method: 'GET', credentials: 'same-origin', mode: 'same-origin',
        redirect: 'error', signal: controller.signal,
      });
      if (!response.ok) throw new Error('Menu request failed');
      const menu = parseMenu(new DOMParser().parseFromString(await response.text(), 'text/html'));
      let missing = 0;
      let count = 0;
      for (const table of tables) {
        for (const checkbox of table.querySelectorAll('input.order-checkbox[type="checkbox"]')) {
          const match = /^(\d{4}-\d{2}-\d{2})_(\d+)_(\d+)$/.exec(checkbox.name);
          if (!match) continue;
          const [, date, meal, variant] = match;
          // UTC avoids both locale parsing and daylight-saving shifts.
          const day = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
          if (day > 4 || !Number.isFinite(day)) continue;
          const description = lookup(menu, meal, variant, day);
          const block = document.createElement('div');
          block.className = 'sm-menu-description';
          block.id = `sm-description-${++count}`;
          const list = document.createElement('ul');
          for (const item of description.items) {
            const li = document.createElement('li');
            li.textContent = item; // Never inject fetched HTML or scripts.
            list.append(li);
          }
          if (list.childElementCount) block.append(list);
          else missing++;
          if (description.note) {
            const note = document.createElement('p');
            note.className = 'sm-menu-note';
            note.textContent = description.note;
            block.append(note);
          }
          (checkbox.closest('.form-check') || checkbox).after(block);
          checkbox.setAttribute('aria-describedby', [checkbox.getAttribute('aria-describedby'), block.id].filter(Boolean).join(' '));
        }
      }
      status.textContent = count
        ? `Valgiaraštis įkeltas. Lentelę galima slinkti horizontaliai.${missing ? ' Kai kurių pasirinkimų aprašymai nepateikti.' : ''}`
        : 'Nepavyko susieti valgiaraščio su užsakymo pasirinkimais.';
    } catch {
      // Do not log the request URL: its ID is an authentication credential.
      status.textContent = 'Nepavyko įkelti valgiaraščio. Bandykite atnaujinti puslapį.';
    } finally {
      clearTimeout(timeout);
    }
  }

  void run();
})();
