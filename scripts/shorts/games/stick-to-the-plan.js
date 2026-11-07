// Stick to the Plan: an A-setup traded off plan (3% risk), NFP Friday on plan
// (hands off the news), then a chance card (random from the deck) handled on plan.
const { introCard, outroCard } = require('../engine');

// Selector for the choice of a given kind (plan | half | break) on the current screen.
async function pick(d, fn, kind) {
  const k = await d.page.evaluate(([fn, kind]) => {
    const list = fn === 'choose' ? SC[S.i].c : CUR.card.c;
    return list.findIndex(c => c.k === kind);
  }, [fn, kind]);
  return `.choice[onclick="${fn}(${k})"]`;
}

module.exports = {
  slug: 'stick-to-the-plan',
  name: 'Stick to the Plan',
  meta: {
    title: 'A perfect setup. Do you go 3%? 😬 #Shorts #trading #propfirm',
    description: [
      'Ten trades, one year, real-life bills. Watch what happens when you size up on a "perfect" setup, when rent goes up, and when NFP drops in ten minutes.',
      '',
      '🎮 Play Stick to the Plan free: https://quasidb.github.io/games/stick-to-the-plan/?ref=yt-shorts',
      '',
      'Educational only, not financial advice.',
      '#trading #forex #propfirm #fundedtrader #riskmanagement #tradingpsychology',
    ].join('\n'),
    tags: ['trading', 'forex', 'prop firm', 'funded trader', 'risk management', 'trading plan', 'trading psychology', 'trading game', 'QDB'],
  },
  async play(d) {
    await d.card(introCard('A FREE QDB GAME', 'Stick to <em>the Plan</em>', 'Ten trades. One year. Real-life bills. Can you follow your own rules?'), { hold: 2300 });
    await d.wait(300);
    await d.tap('text=Start trading', { after: 900 });

    // Trade 1: the clean A-setup, but go 3%.
    await d.scrollTo(0, 500);
    await d.caption('Trade 1: a textbook pullback. The plan risks <b>1%</b>.', { hold: 2400 });
    await d.reveal('.choices', { at: 'center', ms: 700 });
    await d.caption('“It’s perfect. Go <b>3%</b> this time.”', { hold: 1300, keep: true });
    await d.tap(await pick(d, 'choose', 'break'), { after: 400 });
    d.hideFinger(); d.hideCaption();
    await d.scrollTo(0, 500);
    await d.wait(800);
    await d.caption('Triple the risk, closed on the first dip: <b>+$113</b>. The plan made <b>+$188</b> at 1%.', { hold: 3200 });
    await d.wait(400);

    // Trade 2: NFP in ten minutes, hands off.
    await d.tap('text=Continue', { after: 900 });
    await d.scrollTo(0, 500);
    await d.caption('Trade 2: a setup forming… and <b>NFP drops in 10 minutes</b>.', { hold: 2600 });
    await d.reveal('.choices', { at: 'center', ms: 700 });
    await d.tap(await pick(d, 'choose', 'plan'), { after: 400 });
    d.hideFinger();
    await d.scrollTo(0, 500);
    await d.caption('Hands off the news. A small, boring loss on the most dangerous morning of the month.', { hold: 3400 });

    // Chance card, on plan.
    await d.tap('text=Continue', { after: 900 });
    await d.scrollTo(0, 400);
    await d.caption('Then life happens. 🧾', { hold: 1800 });
    await d.reveal('.choices', { at: 'center', ms: 700 });
    await d.tap(await pick(d, 'pickCard', 'plan'), { after: 400 });
    d.hideFinger();
    await d.scrollTo(0, 500);
    await d.caption('Life pressure <b>never</b> changes your position size.', { hold: 3000 });

    await d.card(outroCard('Stick to the Plan', 'stick-to-the-plan', 'Does following a written plan get you funded?'), { hold: 4000, fadeOut: 0 });
  },
};
