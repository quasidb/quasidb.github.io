/* QDB Trader's Advent Calendar: the 24 doors.
   type 'quiz'  : three questions, c = index of the right answer, why = shown after answering.
   type 'crowd' : guess the crowd's % long on today's most crowded pair (live from data/daily.json).
   Keep answers in line with QDB's teaching: sentiment is contrarian, only act at strong daily/weekly
   supply and demand levels, never put stops at obvious levels or in the crowd's stop loss cluster. */
window.ADVENT_DOORS = [
  { day: 1, type: 'quiz', title: 'Reading the crowd', link: ['guides/retail-sentiment/', 'Read the crowd guide'], qs: [
    { q: 'Retail traders are 80% long EUR/USD. How does a contrarian read that?', a: ['Bullish: follow the majority', 'Bearish: most of the crowd needs price to rise', 'Neutral: 80% means nothing'], c: 1,
      why: 'Most retail traders lose. When they pile onto one side, their positions and stops become fuel for a move the other way.' },
    { q: 'Can the crowd ever reach 100% long?', a: ['Yes, it happens most weeks', 'No. Every trade needs someone on the other side, so the train can’t reach the terminus', 'Only on Fridays'], c: 1,
      why: 'Like a train running between Edinburgh (0% long) and King’s Cross (100%), it turns round before the end of the line. 90%+ means little gas left.' },
    { q: 'What matters more than the level of sentiment?', a: ['The direction it is travelling', 'The colour of the chart', 'What people say on social media'], c: 0,
      why: 'A crowd getting more long as price falls is very different from a crowd taking profit. Watch the direction of travel.' }
  ]},
  { day: 2, type: 'crowd', title: 'Guess the crowd' },
  { day: 3, type: 'quiz', title: 'Where not to put your stop', link: ['games/stop-hunter/', 'Play Stop Hunter'], qs: [
    { q: 'Where is the worst place for a stop loss?', a: ['Just beyond a strong weekly level, away from the crowd', 'Right under an obvious round number where everyone else has theirs', 'Where your trade idea is proven wrong'], c: 1,
      why: 'Obvious levels collect the crowd’s stops. That stop loss cluster is exactly what big players hunt for liquidity.' },
    { q: 'There are two stop loss clusters, one big and one small. Does price always go for the bigger one first?', a: ['Yes, always', 'No. Market makers do not necessarily target the larger cluster', 'Only in gold'], c: 1,
      why: 'Clusters are magnets, not timetables. Use them to keep your stop out of harm’s way, not to predict the exact path.' },
    { q: 'When are stop loss clusters most worth trading?', a: ['Any time you see one', 'Only at key strong technical levels', 'Never'], c: 1,
      why: 'Dave’s one-line lesson: only trade the SLCs at key strong technical levels.' }
  ]},
  { day: 4, type: 'quiz', title: 'COT in three questions', link: ['cot/', 'See this week’s COT report'], qs: [
    { q: 'Which day are the positions in the COT report taken from?', a: ['Friday', 'Tuesday', 'Monday'], c: 1,
      why: 'The CFTC publishes on Friday at 3:30pm US Eastern, covering positions as of the Tuesday before.' },
    { q: 'Who are the “non-commercials”?', a: ['Large speculators such as hedge funds', 'Retail traders', 'Central banks'], c: 0,
      why: 'Non-commercials are the big speculators. They tend to ride trends, which is why their extremes matter.' },
    { q: 'A COT index of 95 means…', a: ['Speculators are near their most long in three years', 'Price will rise 95%', 'The market is closed'], c: 0,
      why: 'The index places this week’s net position in its 3-year range. 90+ or 10- is crowded and more likely to unwind.' }
  ]},
  { day: 5, type: 'crowd', title: 'Guess the crowd' },
  { day: 6, type: 'quiz', title: 'Risk maths', qs: [
    { q: 'You risk 1% of a $10,000 account. How much can you lose on the trade?', a: ['$10', '$100', '$1,000'], c: 1,
      why: '1% of $10,000 is $100. Size the position so that your stop costs exactly that.' },
    { q: 'You lose 50% of an account. What gain gets you back to where you started?', a: ['50%', '75%', '100%'], c: 2,
      why: 'Half of the account has to double. That is why protecting the downside comes first.' },
    { q: 'Your trades risk 1 to make 2. Roughly what win rate breaks even?', a: ['About 33%', 'About 50%', 'About 66%'], c: 0,
      why: 'Win 1 in 3: +2 −1 −1 = 0. With good reward-to-risk you can be wrong most of the time and still be fine.' }
  ]},
  { day: 7, type: 'quiz', title: 'All aboard the Crowd Express', link: ['games/crowd-express/', 'Play Crowd Express'], qs: [
    { q: 'The sentiment train is at 92% long. What is coming?', a: ['More passengers boarding', 'Little gas left. Expect the return journey', 'A new terminus at 110%'], c: 1,
      why: 'Near the end of the line there is almost nobody left to buy. The train turns round.' },
    { q: 'What are the “stations” where passengers get off?', a: ['Stop loss probes, where the crowd is flushed out', 'Central bank meetings', 'Lunch breaks'], c: 0,
      why: 'Price pokes into the crowd’s stops on the way, dropping passengers off before it carries on.' },
    { q: 'Where should you board the train?', a: ['Anywhere, any time', 'At strong weekly or daily demand and supply levels', 'Only after it has left'], c: 1,
      why: 'Sentiment says who is wrong. The level says where to act.' }
  ]},
  { day: 8, type: 'crowd', title: 'Guess the crowd' },
  { day: 9, type: 'quiz', title: 'The order book, made simple', link: ['guides/order-book/', 'Read the order book guide'], qs: [
    { q: 'On the left (orders) book, blue stop orders are…', a: ['A brake on price', 'Fuel for price when they are hit', 'Always ignored'], c: 1,
      why: 'Blue is fuel, orange is a brake. Triggered stops become market orders that push price further.' },
    { q: 'On the right (positions) book, the rule of thumb is…', a: ['Follow the bigger side', 'Lean against the bigger side', 'Only trade when both sides are equal'], c: 1,
      why: 'Dominant sellers, winning or losing, tend to push price up eventually. Lean against the bigger side.' },
    { q: 'Price often rebounds where…', a: ['The crowd went all in', 'Nobody has traded', 'The spread is widest'], c: 0,
      why: 'Where the crowd went all in is the wall. It works best at daily and weekly supply and demand.' }
  ]},
  { day: 10, type: 'quiz', title: 'Levels first', qs: [
    { q: 'You see a strong contrarian signal in the middle of nowhere on the chart. What do you do?', a: ['Trade it now', 'Wait for price to reach a strong daily or weekly level', 'Double the size'], c: 1,
      why: 'Sentiment on its own is not a trade. It becomes one at a level that matters.' },
    { q: 'Which timeframe levels does QDB weigh most?', a: ['1 minute', 'Daily and weekly', 'Tick charts'], c: 1,
      why: 'Daily and weekly supply and demand are where the big orders sit.' },
    { q: 'A good setup is when…', a: ['The crowd is on the wrong side and price is at a strong level', 'Your friend says so', 'You feel lucky'], c: 0,
      why: 'Crowd on the wrong side + strong level + a plan for risk. That is the whole idea.' }
  ]},
  { day: 11, type: 'crowd', title: 'Guess the crowd' },
  { day: 12, type: 'quiz', title: 'Prop firm challenge', link: ['games/stick-to-the-plan/', 'Play Stick to the Plan'], qs: [
    { q: 'Most challenges fail because of…', a: ['Bad luck', 'Breaking the daily or total drawdown rule', 'Too few trades'], c: 1,
      why: 'Rules, not entries, end most challenges. Size so that a bad day can’t break the daily limit.' },
    { q: 'You are 1% from the daily loss limit. Best move?', a: ['One more trade to win it back', 'Stop for the day', 'Increase size to recover faster'], c: 1,
      why: 'The account lives to trade tomorrow. Revenge trading is how challenges die.' },
    { q: 'What helps most in a challenge?', a: ['A written plan you follow', 'Trading every news release', 'Moving your stop further away when it’s close'], c: 0,
      why: 'Write the plan, then stick to it. Moving stops turns small losses into big ones.' }
  ]},
  { day: 13, type: 'quiz', title: 'Mind games', qs: [
    { q: 'You have just had three losing trades. The plan says take the next valid setup. You…', a: ['Skip it, you’re on a bad run', 'Take it at normal size', 'Take it at triple size'], c: 1,
      why: 'Edges play out over many trades. Skipping or upsizing after losses breaks the maths.' },
    { q: 'A trade hits your target, then keeps running. How do you feel about it?', a: ['Furious, I should have held', 'Fine. The plan worked', 'I’ll remove targets forever'], c: 1,
      why: 'Judging a good decision by one outcome is how plans get abandoned.' },
    { q: 'The best time to decide your stop and target is…', a: ['Before you enter', 'After the trade goes against you', 'When it’s already in profit'], c: 0,
      why: 'Decide while you are calm. In the trade, emotions make the calls.' }
  ]},
  { day: 14, type: 'crowd', title: 'Guess the crowd' },
  { day: 15, type: 'quiz', title: 'Stop hunts', link: ['guides/stop-loss-clusters/', 'Read the stop loss cluster guide'], qs: [
    { q: 'Why do big players push price into stop loss clusters?', a: ['For fun', 'Stops are liquidity: orders they can trade against in size', 'To close the market'], c: 1,
      why: 'Large orders need the other side. A cluster of stops is a pool of ready-made orders.' },
    { q: 'Buyers’ stops sit below the market. After price flushes them out…', a: ['It can be a better place to buy', 'It always keeps falling', 'The market closes for the day'], c: 0,
      why: 'Buy after the flush, not before it, ideally at a strong level.' },
    { q: 'Your stop should go…', a: ['Where the crowd’s stops are', 'Where your idea is wrong, away from obvious levels', 'As close as possible to entry, always'], c: 1,
      why: 'Never place a stop at obvious levels or in the crowd’s cluster.' }
  ]},
  { day: 16, type: 'quiz', title: 'The QDB Score', link: ['guides/', 'Watch the QDB Sheet videos'], qs: [
    { q: 'The QDB Score runs from…', a: ['0 to 12', '1 to 5', '0 to 100'], c: 0,
      why: 'Each pair gets a score out of 12.' },
    { q: 'A score of 9/12 reads as…', a: ['Bullish', 'Bearish', 'Neutral'], c: 0,
      why: '7 or more reads bullish, 3 or less bearish, and the middle is no call.' },
    { q: 'Should you trade a 10/12 the moment you see it?', a: ['Yes', 'Only at a strong technical level, with a plan', 'Only if it’s Monday'], c: 1,
      why: 'The score narrows down where to look. The level and the plan decide the trade.' }
  ]},
  { day: 17, type: 'crowd', title: 'Guess the crowd' },
  { day: 18, type: 'quiz', title: 'Market history', link: ['games/retail-survival-simulator/', 'Play Retail Survival Simulator'], qs: [
    { q: 'In January 2015 the Swiss National Bank shocked FX by…', a: ['Removing the 1.20 floor in EUR/CHF', 'Adopting the euro', 'Closing for a week'], c: 0,
      why: 'On 15 January 2015 the SNB scrapped the floor. CHF jumped in minutes and many brokers and traders were wiped out.' },
    { q: 'On the night of the Brexit vote in June 2016, the pound…', a: ['Barely moved', 'Fell to a 31-year low against the dollar', 'Rose 20%'], c: 1,
      why: 'GBP/USD dropped around 10% overnight. Gaps like that jump straight over stops.' },
    { q: 'Lehman Brothers filed for bankruptcy in…', a: ['September 2008', 'March 2020', 'October 1987'], c: 0,
      why: '15 September 2008. Risk-off moves hit carry pairs like AUD/JPY hardest.' }
  ]},
  { day: 19, type: 'quiz', title: 'Position sizing', qs: [
    { q: 'Same account, same risk. If your stop is twice as wide, your position should be…', a: ['Twice as big', 'Half the size', 'The same size'], c: 1,
      why: 'Risk = size × stop distance. A wider stop needs a smaller size to keep the risk the same.' },
    { q: 'Why risk a fixed % rather than a fixed lot size?', a: ['It shrinks risk in drawdowns and grows it with the account', 'It looks more professional', 'Brokers require it'], c: 0,
      why: 'A fixed % automatically protects you on a losing run.' },
    { q: 'Ten losses in a row at 2% risk each costs roughly…', a: ['About 18%', 'About 50%', '100%'], c: 0,
      why: '0.98 to the power of 10 is about 0.82. Survivable. At 10% risk it would be about 65% gone.' }
  ]},
  { day: 20, type: 'crowd', title: 'Guess the crowd' },
  { day: 21, type: 'quiz', title: 'Two crowds', link: ['sentiment/', 'See today’s sentiment for 28 pairs'], qs: [
    { q: 'Retail is heavily short a pair and the big speculators are heavily long. That is…', a: ['A classic picture worth watching', 'Meaningless', 'Impossible'], c: 0,
      why: 'When the retail crowd and the speculators disagree at a key level, that is where the best setups tend to appear.' },
    { q: 'Which is faster-moving data?', a: ['COT (weekly)', 'Retail sentiment (intraday)', 'They update at the same speed'], c: 1,
      why: 'COT is the slow picture. Retail sentiment is the fast one.' },
    { q: 'Both crowds lean the same way as the trend. You…', a: ['Have no contrarian edge, so you wait', 'Must fade it immediately', 'Must follow it with max size'], c: 0,
      why: 'No disagreement, no edge. Patience is a position.' }
  ]},
  { day: 22, type: 'quiz', title: 'Holiday markets', qs: [
    { q: 'Over Christmas and New Year, liquidity is usually…', a: ['Thinner than normal', 'At its highest of the year', 'Exactly the same'], c: 0,
      why: 'Many desks are closed. Thin markets can make moves look bigger and less reliable.' },
    { q: 'In thin holiday markets, spreads tend to…', a: ['Widen', 'Disappear', 'Turn negative'], c: 0,
      why: 'Wider spreads can trigger stops that would normally be safe.' },
    { q: 'A sensible holiday plan is…', a: ['Smaller size or no trades, and review the year', 'Trade more because it’s quiet', 'Remove all stops'], c: 0,
      why: 'Some of the best trading decisions are the trades you don’t take.' }
  ]},
  { day: 23, type: 'crowd', title: 'Guess the crowd' },
  { day: 24, type: 'quiz', title: 'Christmas Eve final', gift: true, qs: [
    { q: 'The single QDB rule above all others?', a: ['Only act at strong daily or weekly levels', 'Always follow the crowd', 'Never use a stop'], c: 0,
      why: 'Sentiment tells you who is likely to be wrong. The level tells you where.' },
    { q: 'The crowd is 85% long and price is at strong weekly supply. The contrarian lean is…', a: ['Bullish', 'Bearish', 'No view'], c: 1,
      why: 'Crowd heavily long + strong supply: a textbook bearish setup, with a stop away from the obvious level.' },
    { q: 'Your stop goes…', a: ['In the crowd’s stop loss cluster', 'Away from obvious levels, where the idea is wrong', 'Nowhere'], c: 1,
      why: 'Merry Christmas. You have the whole method in three answers.' }
  ]}
];
