// Retail Survival Simulator: the Lehman weekend played the hopeful way, all the
// way to the margin call.
const { introCard, outroCard } = require('../engine');
const choice = n => `#game-choices .choice:nth-child(${n})`;

module.exports = {
  slug: 'retail-survival-simulator',
  name: 'Retail Survival Simulator',
  meta: {
    title: '10:1 leverage into the Lehman weekend 💀 #Shorts #trading',
    description: [
      'September 2008. You’re long the S&P 500 at 10:1 on a $7,500 account, and Lehman Brothers is being decided behind closed doors. Hope says hold. Watch what hope costs.',
      '',
      '🎮 Can you survive 10 real market crises? Play free: https://quasidb.github.io/games/retail-survival-simulator/?ref=yt-shorts',
      '',
      'Educational only, not financial advice.',
      '#trading #stockmarket #2008crash #lehmanbrothers #riskmanagement #leverage',
    ].join('\n'),
    tags: ['trading', 'stock market', '2008 financial crisis', 'Lehman Brothers', 'leverage', 'margin call', 'risk management', 'trading game', 'QDB'],
  },
  async play(d) {
    await d.card(introCard('A FREE QDB GAME', 'Retail <em>Survival</em> Simulator', 'Can you survive 10 real market crises?'), { hold: 2300 });
    await d.wait(300);
    await d.tap('text=Start the challenge', { after: 900 });
    await d.tap('button.card:has-text("Lehman")', { after: 900 });

    // Friday: hold the full position into the weekend.
    await d.scrollTo(0, 400);
    await d.caption('Sept 2008. Long the S&P at <b>10:1</b> into the Lehman weekend.', { hold: 2800 });
    await d.reveal('#game-choices', { at: 'center', ms: 700 });
    await d.caption('“Washington won’t let a major bank fail.”', { hold: 1300, keep: true });
    await d.tap(choice(3), { after: 600 });
    d.hideFinger(); d.hideCaption();

    // Monday: Lehman files. Hold again.
    await d.scrollTo(0, 400);
    await d.wait(1200);
    await d.caption('No rescue. Lehman files. <b>−47%</b> in one session.', { hold: 2800 });
    await d.reveal('#game-choices', { at: 'center', ms: 700 });
    await d.caption('“Hold. They’re already talking about a bailout.”', { hold: 1300, keep: true });
    await d.tap(choice(2), { after: 600 });
    d.hideFinger(); d.hideCaption();

    // The relief rally. Hold for the vote.
    await d.scrollTo(0, 400);
    await d.caption('Relief rally. Back <b>above entry</b>! The way out is right there…', { hold: 2800 });
    await d.reveal('#game-choices', { at: 'center', ms: 700 });
    await d.caption('“Hold for the vote. This rips higher.”', { hold: 1300, keep: true });
    await d.tap(choice(2), { after: 600 });
    d.hideFinger(); d.hideCaption();

    // The vote fails.
    await d.scrollTo(0, 400);
    await d.wait(800);
    await d.caption('The House votes it down. S&P <b>−8.8%</b>. <b>Margin call.</b>', { hold: 3200 });
    await d.reveal('#end-chips', { at: 'center', ms: 800 });
    await d.wait(1500);

    await d.card(outroCard('Retail Survival Simulator', 'retail-survival-simulator', 'Lehman, the SNB floor, Brexit night and more. Would you survive?'), { hold: 4000, fadeOut: 0 });
  },
};
