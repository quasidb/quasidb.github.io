// Stop Hunter: trade 1 the crowd's way (stop in the cluster, gets eaten),
// trade 2 the textbook way (stop beyond the level, target at the magnet).
const { introCard, outroCard } = require('../engine');
const AFF = 'https://fxssi.com/plans?promocode=QUASIDB';

// Viewport position of a price line on the current chart.
async function priceY(d, price) {
  return d.page.evaluate(p => {
    const svg = document.getElementById('chart'), g = geom(R[S.i]), pt = svg.createSVGPoint();
    pt.x = g.cL != null ? g.cL : 0; pt.y = g.Y(p);
    const q = pt.matrixTransform(svg.getScreenCTM()), b = svg.getBoundingClientRect();
    return { y: q.y, x: b.left + b.width * 0.55 };
  }, price);
}
async function dragLine(d, key, price) {
  const cur = await d.run(`CUR.${key}`), from = await priceY(d, cur), to = await priceY(d, price);
  await d.drag(from.x, from.y, from.x, to.y, 1000);
  // land exactly on the textbook price (rounding of the drag can be half a pip off)
  await d.page.evaluate(([k, p]) => setLine(R[S.i], k, p), [key, price]);
}

module.exports = {
  slug: 'stop-hunter',
  name: 'Stop Hunter',
  meta: {
    title: 'Where would YOU put your stop? 🦈 #Shorts #forex #trading',
    description: [
      'The crowd parks its stops at the obvious swing low, and the big fish eats them. Watch two trades: one stop sitting in the stop loss cluster, one placed beyond the strong level.',
      '',
      'Only trade the SLCs at key strong technical levels.',
      '',
      '🎮 Play Stop Hunter free: https://quasidb.com/games/stop-hunter/?ref=yt-shorts',
      '📊 See the real stop loss clusters with FXSSI (use code QUASIDB): ' + AFF,
      '',
      'Affiliate link: QDB earns a commission at no extra cost to you. Educational only, not financial advice.',
      '#forex #trading #stoploss #stophunting #daytrading #fxssi',
    ].join('\n'),
    tags: ['forex', 'trading', 'stop loss', 'stop loss clusters', 'stop hunting', 'FXSSI', 'trading game', 'QDB'],
  },
  async play(d) {
    await d.card(introCard('A FREE QDB GAME', 'Stop <em>Hunter</em>', 'Your stop loss is the big fish’s lunch. Can you hide it?'), { hold: 2300 });
    await d.wait(300);
    await d.tap('text=Start hunting', { after: 900 });

    // Trade 1: leave the stop at the obvious swing low, right in the cluster.
    await d.reveal('.chartbox');
    await d.caption('Trade 1: stop under the <b>obvious swing low</b>.<br>Same place as everyone else…', { hold: 2600 });
    await d.tap('#runBtn', { after: 200 });
    d.hideFinger();
    await d.reveal('.chartbox', { ms: 400 });
    await d.wait(3400);
    await d.caption('<b>CHOMP.</b> The big fish ate the crowd’s stops, and ours.', { hold: 2600 });
    await d.wait(1200);

    // Trade 2: stop beyond the level and the cluster, target at the magnet.
    await d.tap('text=Next trade', { after: 900 });
    await d.reveal('.chartbox');
    await d.caption('Trade 2: stop <b>beyond</b> supply and the cluster on top of it.', { hold: 1400, keep: true });
    await dragLine(d, 'sl', 79);
    d.hideCaption();
    await d.caption('Take profit <b>at the magnet</b>: the cluster below.', { hold: 1200, keep: true });
    await dragLine(d, 'tp', 32);
    d.hideCaption();
    await d.wait(300);
    await d.tap('#runBtn', { after: 200 });
    d.hideFinger();
    await d.reveal('.chartbox', { ms: 400 });
    await d.wait(4200);
    await d.caption('Stop survived the hunt. <b>Target hit.</b> 🎯', { hold: 2400 });
    await d.wait(1200);

    await d.card(outroCard('Stop Hunter', 'stop-hunter', 'Only trade the stop loss clusters at key strong levels.'), { hold: 4000, fadeOut: 0 });
  },
};
