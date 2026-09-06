// Offline browser fixture: no requests to the school, no real credentials or child data.
// Run with Node, then open http://127.0.0.1:8765/order?date=2026-09-07&id=fixture
const http = require('node:http');
const fs = require('node:fs');
const script = fs.readFileSync(`${__dirname}/sokratus-menu.user.js`, 'utf8');
const days = ['Pr', 'An', 'Tr', 'Kt', 'Pn'];
const options = [['1', '9'], ['2', '1'], ['2', '2'], ['2', '14'], ['2', '7'], ['2', '11'], ['2', '13'], ['2', '8'], ['3', '10']];
function orderTable(mobile) {
  return `<table class="order-table ${mobile ? 'mobile' : 'desktop'}"><tbody><tr><th></th>${days.map(d => `<td>${d}</td>`).join('')}</tr>` +
    options.map(([meal, variant]) => `${variant === '9' || variant === '1' || variant === '10' ? `<tr class="group-row"><th>${meal === '1' ? 'Pusryčiai' : meal === '2' ? 'Pietūs' : 'Pavakariai'}</th><th colspan="5"></th></tr>` : ''}<tr><td>Option ${variant} (6.50€)</td>${days.map((_, i) => `<td><div class="form-check"><input type="checkbox" class="order-checkbox" name="2026-09-${String(7 + i).padStart(2, '0')}_${meal}_${variant}" ${i === 0 ? 'checked' : ''} ${i === 4 ? 'disabled' : ''}></div></td>`).join('')}</tr>`).join('') + '</tbody></table>';
}
const menu = [1, 2, 7, 8, 14].map(variant => `<div class="tab-pane" id="nav-${variant}"><table><tr>${days.map(day => `<td>${day}</td>`).join('')}</tr>${['Pusryčiai', 'Pietūs', 'Pavakariai'].map((meal, group) => `<tr class="group-row"><th>${meal}</th><th colspan="4"></th></tr><tr>${days.map((_, day) => `<td><ul>${group === 1 || variant <= 2 ? `<li>${group === 1 ? `Variant ${variant}` : meal} day ${day}</li><li>A long meal description with vegetables, potatoes, fruit and other ingredients.</li><li>&lt;img src=x onerror=alert(1)&gt;</li>` : ''}</ul></td>`).join('')}</tr>`).join('')}</table></div>`).join('');
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body { margin: 0; font: 16px Arial; } .container { max-width: 1100px; margin: auto; padding: 15px; }
table { width:100%; border-collapse:collapse; } td,th {padding:12px; border:1px solid #ddd;} .mobile {display:none;}
@media(max-width:991px){.desktop{display:none}.mobile{display:table}}
</style></head><body><div class="container">${orderTable(false)}<div class="table-responsive">${orderTable(true)}</div><pre id="results">Running…</pre></div>
<script>
const originalControls = [...document.querySelectorAll('input')];
const originalStates = originalControls.map(c => [c.name, c.checked, c.disabled]);
localStorage.setItem('sokratus.menu.extrasCollapsed', String(location.search.includes('collapsed')));
let requests = 0, events = 0;
document.addEventListener('change', () => events++);
document.addEventListener('submit', () => events++);
window.fetch = async (url, options) => {
  requests++;
  if (url.pathname !== '/menu' || url.searchParams.get('id') !== 'fixture' || url.searchParams.get('date') !== '2026-09-07' || options.method !== 'GET') throw Error('Unexpected request');
  if (location.search.includes('failure')) throw Error('Simulated failure');
  return {ok: true, text: async () => ${JSON.stringify(menu)}};
};
</script><script>${script}</script><script>${script}</script><script>
setTimeout(() => {
  const checks = [];
  const check = (condition, name) => checks.push((condition ? 'PASS ' : 'FAIL ') + name);
  const buttons = [...document.querySelectorAll('.sm-extra-toggle')];
  const initiallyCollapsed = location.search.includes('collapsed');
  check(buttons.length === 2, 'one extras header per layout');
  check(buttons.every(b => b.getAttribute('aria-expanded') === String(!initiallyCollapsed)), 'saved collapse state restored');
  buttons[0].click();
  check(document.querySelectorAll('.sm-extra-hidden').length === (initiallyCollapsed ? 0 : 10), 'toggle changes exactly five rows in both layouts');
  check(localStorage.getItem('sokratus.menu.extrasCollapsed') === String(!initiallyCollapsed), 'toggle preference persisted');
  buttons[1].click();
  check(buttons.every(b => b.getAttribute('aria-expanded') === String(!initiallyCollapsed)), 'mobile and desktop toggles stay synchronized');
  for (const header of document.querySelectorAll('.group-row')) {
    check(header.cells[0].textContent === 'Pusryčiai'
      ? header.cells.length === 2
      : [...header.cells].slice(1).map(c => c.textContent).join('/') === 'Pr/An/Tr/Kt/Pn', 'weekday section headings');
  }
  check(document.querySelector('.container').getBoundingClientRect().width >= Math.min(innerWidth, 1614) - 20, 'order container uses available viewport width');
  check(requests === 1, 'one GET, even when script executes twice');
  check(events === 0, 'no change or submit events');
  check(originalControls.every((c,i) => c === document.querySelectorAll('input')[i] && JSON.stringify([c.name,c.checked,c.disabled]) === JSON.stringify(originalStates[i])), 'original controls, names, checked and disabled states preserved');
  if (location.search.includes('failure')) {
    check(document.querySelector('.sm-menu-status').textContent.includes('Nepavyko'), 'visible fetch failure');
    check(!document.querySelector('.sm-menu-description'), 'no misleading descriptions after failure');
  } else {
    check(document.querySelectorAll('.sm-menu-description').length === 90, 'all 90 desktop and mobile checkboxes annotated');
    for (const table of document.querySelectorAll('table')) {
      for (const input of table.querySelectorAll('input')) {
        const [date, meal, variant] = input.name.split('_');
        const day = Number(date.slice(-2)) - 7;
        const text = document.getElementById(input.getAttribute('aria-describedby')).textContent;
        const expected = meal === '1' ? 'Pusryčiai' : meal === '3' ? 'Pavakariai' : 'Variant ' + (variant === '13' ? '2' : variant === '11' ? '7' : variant);
        check(text.includes(expected + ' day ' + day) && (variant !== '11' || text.includes('2× kiekis')), input.name);
      }
    }
    check(!document.querySelector('.sm-menu-description img'), 'menu content inserted as text');
  }
  const visible = [...document.querySelectorAll('table')].find(t => getComputedStyle(t).display !== 'none');
  const width = visible.rows[0].cells[1].getBoundingClientRect().width;
  check(width >= 223 && width <= 289, 'day column width between 14rem and 18rem: ' + width);
  check(visible.parentElement.scrollWidth > visible.parentElement.clientWidth || innerWidth >= 1614, 'scrolls only when needed');
  check(document.documentElement.scrollWidth <= innerWidth, 'no page-level horizontal overflow');
  document.getElementById('results').textContent = checks.filter(x=>x.startsWith('FAIL')).join('\\n') || 'PASS: ' + checks.length + ' checks';
  document.getElementById('results').style.whiteSpace = 'pre-wrap';
}, 100);
</script></body></html>`;
http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
  res.end(html);
}).listen(8765, '127.0.0.1', () => console.log('Offline verification: http://127.0.0.1:8765/order?date=2026-09-07&id=fixture'));

