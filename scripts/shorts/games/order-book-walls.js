// Order Book Walls: chart 1 picks the fattest blue bar (stops: it gets sliced),
// chart 2 picks the orange limits on weekly demand (the real wall).
const { introCard, outroCard } = require('../engine');
const AFF = 'https://fxssi.com/plans?promocode=QUASIDB';

module.exports = {
  slug: 'order-book-walls',
  name: 'Order Book Walls',
  meta: {
    title: 'The biggest bar in the order book is a TRAP 📚 #Shorts #forex',
    description: [
      'Blue is fuel, orange is the wall. Watch a trapped all-in crowd build a wall on daily demand, then the tallest bar in the book (the crowd’s stops) get sliced straight through.',
      '',
      '🎮 Play Order Book Walls free: https://quasidb.com/games/order-book-walls/?ref=yt-shorts',
      '📖 The order book, made simple: https://quasidb.com/guides/order-book/?ref=yt-shorts',
      '📊 Read the live FXSSI Order Book (use code QUASIDB): ' + AFF,
      '',
      'Affiliate link: QDB earns a commission at no extra cost to you. Educational only, not financial advice.',
      '#forex #trading #orderbook #orderflow #daytrading #fxssi',
    ].join('\n'),
    tags: ['forex', 'trading', 'order book', 'FXSSI order book', 'order flow', 'support and resistance', 'trading game', 'QDB'],
  },
  async play(d) {
    await d.card(introCard('A FREE QDB GAME', 'Order Book <em>Walls</em>', 'Price is falling. Which level holds?'), { hold: 2300 });
    await d.wait(300);
    await d.tap('text=Find the walls', { after: 900 });

    // Chart 1: the crowd's all-in short, trapped right on daily demand.
    await d.reveal('.chartbox');
    await d.caption('The crowd sold the lows <b>all in</b>, right on daily demand. Still trapped.', { hold: 1600, keep: true });
    await d.tap('#chart .pick[data-row="3"]', { after: 500 });
    await d.tap('#runBtn', { after: 100 });
    d.hideFinger(); d.hideCaption();
    await d.reveal('.chartbox', { ms: 400 });
    await d.wait(4000);
    await d.caption('<b>Wall found.</b> Trapped sellers closing at breakeven = buying. 🧱', { hold: 2800 });
    await d.reveal('.stamp', { at: 'center', ms: 800 });
    await d.wait(500);

    // Chart 2: fall for the tallest bar on the screen, the crowd's sell stops.
    await d.tap('text=Next chart', { after: 900 });
    await d.reveal('.chartbox');
    await d.caption('Chart 2: the tallest bar is a stack of <b>sell stops</b>. A floor?', { hold: 1600, keep: true });
    await d.tap('#chart .pick[data-row="6"]', { after: 500 });
    await d.tap('#runBtn', { after: 100 });
    d.hideFinger(); d.hideCaption();
    await d.reveal('.chartbox', { ms: 400 });
    await d.wait(4000);
    await d.caption('<b>Sliced.</b> Hit stops become market orders. <b>Blue is fuel.</b>', { hold: 2600 });
    await d.caption('The real wall: orange buy limits on <b>weekly demand</b>.', { hold: 2600 });
    await d.reveal('.stamp', { at: 'center', ms: 800 });
    await d.wait(500);

    await d.card(outroCard('Order Book Walls', 'order-book-walls', 'A wall works when the order book and a strong level agree.'), { hold: 4000, fadeOut: 0 });
  },
};
