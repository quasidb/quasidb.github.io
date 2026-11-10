/* What Kind of Trader Are You? Scenarios and trader types.
   All wording is original. A few scenarios are loose retellings of well-known thought experiments
   (the trolley problem, Ulysses and the sirens, the marshmallow test, the gambler's fallacy,
   Keynes's beauty contest, sunk costs) which are ideas, not copyrighted text.

   Each answer scores three traits (any can be left out, meaning 0):
     r = risk appetite   (+ bold, - cautious)
     c = composure       (+ steady and rule-based, - reactive)
     h = herd instinct   (+ follows the crowd, - independent)
   `echo` is the trading parallel, shown on the results screen. */
window.TT_QUESTIONS = [
  {
    t: 'The rainy gig',
    q: 'Months ago you paid £80 for a gig. Tonight it’s pouring, you’re shattered, and a friend offers pizza and a film on the sofa. What do you do?',
    a: [
      { x: 'Go anyway. I paid £80 for it!', r: 0, c: -1 },
      { x: 'Stay in. The £80 is spent either way, so I’ll pick the better night.', c: 2 },
      { x: 'Try to sell the ticket, and decide once I know if I can.', c: 1 },
      { x: 'Go, and make it worth it: front row and a few extra rounds.', r: 1, c: -2 }
    ],
    echo: 'This is the sunk cost trap. Holding a losing trade "because of what I paid" is the same pull. The market doesn’t know your entry price, so judge the trade on what it looks like now.'
  },
  {
    t: 'The game show',
    q: 'On a game show you can take £1,000 cash right now, or flip a coin: heads wins £2,500, tails wins nothing.',
    a: [
      { x: 'Take the £1,000. A bird in the hand.', r: -2 },
      { x: 'Flip it. I came here to win big.', r: 2, c: -1 },
      { x: 'Ask if I can take £500 cash and flip for the rest.', r: 1, c: 2 },
      { x: 'Ask the audience what they’d do.', h: 2, c: -1 }
    ],
    echo: 'On average the flip is worth £1,250, more than the sure £1,000. Taking the cash is fine once, but a trader who never takes a positive-expectancy bet never grows. Splitting it is position sizing: you still take the edge, at a size you can live with.'
  },
  {
    t: 'Poker night',
    q: 'At a friendly poker night you’re £200 up, then lose £150 on a single hand you were sure you’d win.',
    a: [
      { x: 'Cash out with my £50 and call it a good night.', r: -1, c: 1 },
      { x: 'Keep playing at the same stakes. One bad hand is just one hand.', c: 2 },
      { x: 'Double the stakes. I want it back before the night ends.', r: 2, c: -2 },
      { x: 'Sit out a few hands until I’ve stopped fuming.', r: -1, c: 1 }
    ],
    echo: 'Doubling up to win it back is revenge trading, the fastest way to blow an account. "Probably not for you if you double down after a loss" is on our homepage for a reason. Same stakes, or a break, are both healthy answers.'
  },
  {
    t: 'The signal box',
    q: 'You’re a signal operator and a runaway goods train is coming. You only have time to sound one alarm: one for the 10 people on the track you can see waving at you, or one for a platform round the bend where the timetable says 100 people are waiting, out of sight.',
    a: [
      { x: 'Warn the 10 I can see. I can’t ignore what’s in front of me.', c: -1 },
      { x: 'Warn the 100. The numbers matter more than what I can see.', c: 2, r: 1 },
      { x: 'Freeze. I don’t think I could choose.', c: -2, r: -1 },
      { x: 'Do whatever my training manual says.', c: 1, r: -1 }
    ],
    echo: 'The open trade flashing red on your screen grabs all your attention, but the bigger risk is often out of sight: correlated pairs, the news calendar, the weekend gap. Your plan (the manual) should cover the risks you can’t see, so the one you can see doesn’t run the show.'
  },
  {
    t: 'The sirens’ weekend',
    q: 'You’re off on a weekend away and you’ve been trying to save money. How do you handle spending?',
    a: [
      { x: 'Leave the cards at home and take a set amount of cash.', c: 2, r: -1 },
      { x: 'Set a budget in my head. I’ll be fine.', c: 0 },
      { x: 'No budget. It’s a holiday, I’ll sort it out after.', r: 2, c: -2 },
      { x: 'Hardly spend anything. I’d rather not risk going over.', r: -2, c: 1 }
    ],
    echo: 'Ulysses had himself tied to the mast before the sirens started singing. A stop loss and a daily loss limit are your mast: decided in advance, while you’re calm, not in the middle of the trade.'
  },
  {
    t: 'Two restaurants',
    q: 'You’re hungry in a town you don’t know. Two restaurants sit side by side: one has a queue out the door, the other is half empty but has great reviews online.',
    a: [
      { x: 'Join the queue. That many people can’t be wrong.', h: 2 },
      { x: 'Walk into the quiet one. The reviews are good and I’ll eat now.', h: -2, c: 1 },
      { x: 'Check both menus and prices, then decide.', c: 1 },
      { x: 'Go wherever the person I’m with wants.', h: 1, c: -1 }
    ],
    echo: 'A packed restaurant is a crowded trade. When most retail traders are already long, who is left to buy? Retail sentiment shows you the queue. It isn’t a signal on its own, but it’s worth knowing which line you’re standing in.'
  },
  {
    t: 'Now or later',
    q: 'Your bank offers you £500 today, or £650 if you wait twelve months.',
    a: [
      { x: '£500 today. Who knows what happens in a year.', r: -1, c: -1 },
      { x: 'Wait for the £650. Patience pays.', c: 2 },
      { x: '£500 today, and I’ll invest it to beat £650 myself.', r: 2 }
    ],
    echo: 'This is the grown-up version of the marshmallow test. In trading, the extra £150 is waiting for price to come to your level instead of chasing it. Most bad entries are impatient ones.'
  },
  {
    t: 'The mountain',
    q: 'You’re an hour from the top of a mountain when the clouds roll in and the forecast changes to storms.',
    a: [
      { x: 'Turn back now. The mountain will still be there next year.', r: -2, c: 1 },
      { x: 'Push on fast and hope the weather holds.', r: 2, c: -1 },
      { x: 'Keep going, but if I’m not at the top by 2pm I turn round, no matter what.', r: 1, c: 2 },
      { x: 'See what the other hikers do.', h: 2, c: -1 }
    ],
    echo: 'Climbers call it a turnaround time, and it’s exactly what a stop loss is: a line you set before the pressure arrives. Put it somewhere sensible, though: not at the obvious level where everyone else’s stops are clustered.'
  },
  {
    t: 'The trainers everyone wants',
    q: 'Everyone at work is talking about limited-edition trainers that doubled in resale price in a month. Your neighbour made £3,000 flipping them.',
    a: [
      { x: 'Buy a few pairs before it’s too late.', h: 2, r: 1, c: -1 },
      { x: 'Ignore it. Not my thing.', r: -1, h: -1 },
      { x: 'Read up, and only spend what I’d be fine losing completely.', r: 1, c: 1 },
      { x: 'Wonder who’s left to buy if everyone already owns a pair.', h: -2, c: 1 }
    ],
    echo: 'Fear of missing out is how crowds end up at the top. By the time your neighbour is bragging, the late buyers are often the exit liquidity for the early ones.'
  },
  {
    t: 'Heads, again',
    q: 'At a fair you’ve called five coin flips right in a row. The stall holder offers another go.',
    a: [
      { x: 'Bet bigger. I’m on a roll!', r: 2, c: -2 },
      { x: 'Same bet. It’s still a 50/50.', c: 2 },
      { x: 'Call tails this time. It must be due.', c: -1 },
      { x: 'Walk away while I’m ahead.', r: -2 }
    ],
    echo: 'Each coin flip, and each trade, is independent. A winning streak doesn’t make your edge bigger, and "it must be due" is the gambler’s fallacy. Keep risk the same per trade, win or lose.'
  },
  {
    t: 'The sure thing',
    q: 'A friend who "knows people" gives you a sure-fire tip on a horse race this Saturday.',
    a: [
      { x: 'Put a big bet on. When will I get a tip like this again?', r: 2, h: 1, c: -1 },
      { x: 'A small fun bet, money I don’t mind losing.', c: 1 },
      { x: 'No bet. There’s no such thing as a sure thing.', r: -1, h: -1 },
      { x: 'Look at the horse’s form myself before deciding.', h: -2, c: 1 }
    ],
    echo: 'Trade "tips" and copy-this-trade calls are the same horse. A second opinion is useful, but you still need your own reason, your own level and your own stop.'
  },
  {
    t: 'The lost fiver',
    q: 'You lose a £5 note on the way to the shops. How does the rest of your day go?',
    a: [
      { x: 'Annoying, but forgotten in five minutes.', c: 2 },
      { x: 'I retrace my steps for half an hour to find it.', c: -2, r: -1 },
      { x: 'It bugs me all day, more than winning a fiver would cheer me up.', c: -1, r: -1 },
      { x: 'I buy a scratch card to win it back.', r: 2, c: -1 }
    ],
    echo: 'Losses usually hurt about twice as much as the same-sized win feels good. That’s why traders cut winners early and let losers run. Small losses are a cost of doing business, like a shop paying rent.'
  }
];

/* The five trader types. Chosen from risk appetite (r) and composure (c). */
window.TT_TYPES = {
  calculated: {
    name: 'The Calculated Risk-Taker', emoji: '🎯',
    tag: 'Bold, but on your own terms',
    line: 'You’re happy to take a swing, and you decide the size of the swing before you step up to the plate.',
    good: ['You take positive-expectancy bets instead of avoiding risk altogether', 'You set your exit before the pressure arrives', 'Losses don’t knock you off your plan'],
    watch: ['Confidence can creep into over-sizing after a good run', 'Being comfortable with risk can make you take B and C setups, not just A ones'],
    tips: ['Keep risk per trade fixed, for example 1% of the account, especially after a winning streak.', 'Only take trades at strong weekly or daily levels, not wherever there’s a chance.', 'Write down why each trade fits your plan before you place it.'],
    next: ['stop-hunter', 'Stop Hunter', 'Test where you put your stops, and whether the big fish can find them.']
  },
  thrill: {
    name: 'The Thrill-Seeker', emoji: '🎢',
    tag: 'More YOLO than you realised?',
    line: 'You like the ride as much as the destination. That energy is a real asset, as long as something other than your mood decides the size of each bet.',
    good: ['You act decisively and aren’t frozen by fear', 'You spot opportunities other people are too nervous to take', 'You bounce back quickly'],
    watch: ['Chasing losses and sizing up after a bad trade', 'Treating a winning streak as proof you can’t lose', 'Moving or skipping a stop because "it’ll come back"'],
    tips: ['Set a daily loss limit and stop trading when you hit it. No exceptions.', 'Decide your stop and size before you enter, and write them down.', 'Wait for price to reach a strong level instead of jumping in where the action is.'],
    next: ['stick-to-the-plan', 'Stick to the Plan', 'A year of trades and real-life bills. See what following the plan does for you.']
  },
  guardian: {
    name: 'The Guardian', emoji: '🛡️',
    tag: 'Calm, careful and hard to rattle',
    line: 'You protect what you have and you don’t panic. Most traders would love your discipline. Your challenge is the other side of the coin.',
    good: ['You rarely make big, emotional mistakes', 'You respect your limits and you keep your capital', 'You’re patient, and you can sit on your hands'],
    watch: ['Passing on good setups because nothing is ever certain', 'Taking profit too early, so wins stay smaller than losses', 'Remember: no risk, no reward. Every trade has some risk, and that’s fine.'],
    tips: ['Define what an A+ setup looks like, and commit to taking it when it appears.', 'Use a small, fixed risk per trade so taking the trade feels manageable.', 'Let a winner reach its planned target before you close it.'],
    next: ['crowd-express', 'Crowd Express', 'Learn when to board the sentiment train, and when to stay on the platform.']
  },
  second: {
    name: 'The Second-Guesser', emoji: '🌀',
    tag: 'Careful, but the nerves do the talking',
    line: 'You don’t want to lose, which is sensible, but worry can make the decisions for you: getting out too soon, jumping back in late, or freezing when it matters.',
    good: ['You take risk seriously and won’t bet the house', 'You’re self-aware, which is where good trading starts', 'You’re open to learning and to second opinions'],
    watch: ['Closing good trades at the first wobble', 'Changing your mind mid-trade, then regretting it', 'Following other people’s calls instead of your own plan'],
    tips: ['Use a written checklist so the decision is made before the trade, not during it.', 'Set your stop and target, then step away from the screen.', 'Trade smaller until the plan feels boring. Boring is good.'],
    next: ['stick-to-the-plan', 'Stick to the Plan', 'See how a written plan holds up across a year of ups and downs.']
  },
  balanced: {
    name: 'The Steady Planner', emoji: '⚖️',
    tag: 'Right in the middle, and that’s a strength',
    line: 'You take some risk, keep your head most of the time, and adapt to the situation. Your edge is consistency, so protect it.',
    good: ['You weigh up the odds rather than going on gut alone', 'You’re flexible without being reckless', 'You can take a loss and move on'],
    watch: ['Being middle-of-the-road can mean drifting without a clear plan', 'Your mood on the day can tip you to either side'],
    tips: ['Write your rules down so the good habits don’t depend on how you feel.', 'Review your last 20 trades: are you bolder after wins or after losses?', 'Pair every sentiment read with a strong technical level before you act.'],
    next: ['order-book-walls', 'Order Book Walls', 'Read the crowd’s orders and find the wall before price gets there.']
  }
};
