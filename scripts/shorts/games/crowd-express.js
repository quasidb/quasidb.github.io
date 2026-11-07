// Crowd Express: journey 1 boards early at supply, against the crowd (best),
// journey 2 sells at market between stations (wrong train).
const { introCard, outroCard } = require('../engine');

// Index (0-based) of the on-screen choice with the given kind: best | ok | bad.
const choiceIndex = (d, kind) => d.page.evaluate(k => ORDER.findIndex(i => J[S.i].c[i].k === k), kind);

module.exports = {
  slug: 'crowd-express',
  name: 'Crowd Express',
  meta: {
    title: 'Retail traders are a train. Know when to board 🚂 #Shorts #forex',
    description: [
      'The retail crowd keeps buying the dips all the way down. Ride the sentiment train from Edinburgh (0% long) to King’s Cross (100% long): board early at a strong level, against the crowd, and never jump on between stations.',
      '',
      '🎮 Play Crowd Express free: https://quasidb.com/games/crowd-express/?ref=yt-shorts',
      '📖 Retail sentiment, explained: https://quasidb.com/guides/retail-sentiment/?ref=yt-shorts',
      '',
      'Educational only, not financial advice.',
      '#forex #trading #sentiment #retailsentiment #contrarian #daytrading',
    ].join('\n'),
    tags: ['forex', 'trading', 'retail sentiment', 'contrarian trading', 'sentiment analysis', 'trading game', 'QDB'],
  },
  async play(d) {
    await d.card(introCard('A FREE QDB GAME', 'Crowd <em>Express</em>', 'The retail crowd is a train. Do you board it, or fight it?'), { hold: 2300 });
    await d.wait(300);
    await d.tap('text=Start the first journey', { after: 900 });

    // Journey 1
    await d.reveal('.trackbox');
    await d.caption('GBPUSD crowd: <b>18% → 33% long</b>, still buying every dip.', { hold: 2600 });
    await d.reveal('.price');
    await d.caption('Price just rejected <b>daily supply</b>.', { hold: 2000 });
    await d.reveal('.choices', { at: 'center', ms: 700 });
    const best = await choiceIndex(d, 'best');
    await d.tap(`.choice:nth-child(${best + 1})`, { after: 300 });
    d.hideFinger();
    await d.reveal('.trackbox', { ms: 600 });
    await d.caption('Sell early, against the crowd. The train runs south… <b>+2.5R</b>', { hold: 2800 });
    await d.reveal('.price', { ms: 700 });
    await d.wait(1200);

    // Journey 2
    await d.tap('text=Next journey', { after: 800 });
    await d.reveal('.trackbox');
    await d.caption('AUDUSD crowd getting longer, but price is <b>between stations</b>.', { hold: 2600 });
    await d.reveal('.choices', { at: 'center', ms: 700 });
    await d.tap('.choice:has-text("Sell now at market")', { after: 300 });
    d.hideFinger();
    await d.reveal('.result', { ms: 700 });
    await d.caption('<b>Wrong train.</b> Right direction, wrong platform: stopped off before it left.', { hold: 2600 });
    await d.reveal('.price', { ms: 700 });
    await d.wait(1200);

    await d.card(outroCard('Crowd Express', 'crowd-express', 'Board at a strong station, going the other way to the crowd.'), { hold: 4000, fadeOut: 0 });
  },
};
