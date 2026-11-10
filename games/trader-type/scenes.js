/* Small animated illustrations, one per scenario, in the same order as TT_QUESTIONS.
   Plain inline SVG; the animation classes (a-*) live in index.html and switch off
   for visitors who ask for reduced motion. */
(function () {
  var C = { sky: '#101624', ink: '#e8edf6', mut: '#6b7892', line: '#26324a', amb: '#ffb000', acc: '#f5b83d', grn: '#22c55e', red: '#ef4444', blu: '#60a5fa' };

  function svg(body, label) {
    return '<svg class="scene" viewBox="0 0 400 170" role="img" aria-label="' + label + '">' +
      '<rect width="400" height="170" rx="14" fill="' + C.sky + '"/>' + body + '</svg>';
  }
  // a little person: head and rounded body, feet at y
  function person(x, y, col, cls, delay) {
    return '<g class="' + (cls || '') + '"' + (delay ? ' style="animation-delay:' + delay + 's"' : '') + '>' +
      '<circle cx="' + x + '" cy="' + (y - 26) + '" r="6" fill="' + col + '" stroke="' + C.sky + '" stroke-width="2"/>' +
      '<rect x="' + (x - 6) + '" y="' + (y - 18) + '" width="12" height="18" rx="6" fill="' + col + '" stroke="' + C.sky + '" stroke-width="2"/></g>';
  }
  function coin(cx, cy, r, face) {
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + C.amb + '"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 4) + '" fill="none" stroke="#b37400" stroke-width="2"/>' +
      '<text x="' + cx + '" y="' + (cy + r * 0.35) + '" text-anchor="middle" font-family="JetBrains Mono,monospace" font-weight="700" font-size="' + r + '" fill="#5a3a00">' + face + '</text>';
  }
  function txt(x, y, s, col, size, anchor) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="' + (anchor || 'middle') + '" font-family="JetBrains Mono,monospace" font-weight="700" font-size="' + (size || 14) + '" fill="' + (col || C.ink) + '">' + s + '</text>';
  }
  var rain = '';
  for (var i = 0; i < 26; i++) rain += '<line class="a-rain" style="animation-delay:-' + (i * 0.17 % 1.2).toFixed(2) + 's" x1="' + (8 + i * 15.3) + '" y1="-10" x2="' + (4 + i * 15.3) + '" y2="4" stroke="' + C.blu + '" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>';

  var people10 = '';
  for (var p = 9; p >= 0; p--) people10 += person(214 + (p % 5) * 17 + Math.floor(p / 5) * 8, 132 - Math.floor(p / 5) * 7, p % 2 ? C.ink : '#c7d2e4', 'a-wave', (p * 0.13).toFixed(2));

  window.TT_SCENES = [
    // 1. The rainy gig
    svg(rain +
      '<g transform="translate(40 52) rotate(-6)"><rect width="130" height="62" rx="8" fill="' + C.acc + '"/>' +
      '<line x1="98" y1="6" x2="98" y2="56" stroke="#1a1205" stroke-dasharray="4 4" stroke-width="2"/>' +
      txt(50, 28, 'LIVE GIG', '#1a1205', 15) + txt(50, 48, '£80', '#1a1205', 18) + '</g>' +
      '<rect x="240" y="44" width="120" height="96" rx="8" fill="#1d2840" stroke="' + C.line + '"/>' +
      '<rect class="a-glow" x="252" y="56" width="96" height="50" rx="4" fill="' + C.amb + '" fill-opacity=".25"/>' +
      '<rect x="262" y="88" width="76" height="16" rx="6" fill="' + C.red + '" fill-opacity=".7"/>' +
      '<path d="M285 80 l14 -14 l14 14 z" fill="' + C.amb + '"/>' +
      txt(300, 128, 'pizza + film?', C.mut, 12),
      'A gig ticket for 80 pounds in the rain, and a warm living room'),

    // 2. The game show
    svg('<g transform="translate(40 50)"><rect width="90" height="56" rx="6" fill="' + C.grn + '" fill-opacity=".25" stroke="' + C.grn + '"/>' +
      txt(45, 34, '£1,000', C.grn, 17) + txt(45, 80, 'SURE THING', C.mut, 11) + '</g>' +
      txt(200, 84, 'or', C.mut, 16) +
      '<g class="a-flip">' + coin(310, 78, 30, '?') + '</g>' +
      '<ellipse class="a-shadow" cx="310" cy="148" rx="26" ry="5" fill="#000" fill-opacity=".45"/>' +
      txt(272, 30, 'H £2,500', C.amb, 12) + txt(352, 30, 'T £0', C.mut, 12),
      'A sure 1,000 pounds, or a coin flipping in the air'),

    // 3. Poker night
    svg('<rect x="20" y="110" width="360" height="60" rx="30" fill="#14532d" fill-opacity=".55"/>' +
      [0, 1, 2, 3, 4, 5].map(function (k) { return '<ellipse cx="90" cy="' + (128 - k * 7) + '" rx="22" ry="7" fill="' + (k % 2 ? C.red : C.ink) + '" stroke="#0b0f17"/>'; }).join('') +
      '<g transform="translate(170 46)"><rect width="50" height="72" rx="6" fill="' + C.ink + '"/>' + txt(25, 44, 'A♠', '#0b0f17', 20) + '</g>' +
      '<g class="a-cardflip" style="transform-origin:255px 82px"><rect x="230" y="46" width="50" height="72" rx="6" fill="' + C.red + '"/>' +
      '<rect x="236" y="52" width="38" height="60" rx="4" fill="none" stroke="#fff" stroke-opacity=".5"/></g>' +
      txt(330, 60, '−£150', C.red, 18) + '<g class="a-float">' + txt(330, 86, '?!', C.amb, 22) + '</g>',
      'Poker chips and two playing cards, one losing hand'),

    // 4. The signal box
    svg('<path d="M0 132 H400" stroke="' + C.mut + '" stroke-width="4"/>' +
      '<path d="M150 132 C230 132 260 70 400 62" stroke="' + C.mut + '" stroke-width="4" fill="none"/>' +
      '<path d="M290 118 C310 50 400 34 400 34 V118z" fill="#1d2840"/>' +
      '<path d="M296 112 q30 -60 104 -60" fill="none" stroke="#2a3a55" stroke-width="22"/>' +
      txt(352, 98, '100?', C.mut, 14) +
      '<rect x="330" y="104" width="62" height="8" rx="2" fill="' + C.line + '"/>' +
      people10 +
      '<g class="a-train"><rect x="0" y="104" width="78" height="26" rx="6" fill="' + C.red + '"/>' +
      '<rect x="56" y="92" width="22" height="18" rx="3" fill="' + C.red + '"/>' +
      '<rect x="8" y="110" width="14" height="10" rx="2" fill="#0b0f17" fill-opacity=".5"/>' +
      '<rect x="28" y="110" width="14" height="10" rx="2" fill="#0b0f17" fill-opacity=".5"/>' +
      '<circle cx="16" cy="132" r="6" fill="#0b0f17" stroke="' + C.ink + '" stroke-width="2"/><circle cx="60" cy="132" r="6" fill="#0b0f17" stroke="' + C.ink + '" stroke-width="2"/>' +
      '<circle class="a-blink" cx="80" cy="116" r="4" fill="' + C.amb + '"/></g>' +
      '<g transform="translate(120 26)"><rect width="56" height="40" rx="5" fill="#1d2840" stroke="' + C.line + '"/>' +
      '<rect x="8" y="8" width="40" height="16" rx="3" fill="' + C.amb + '" fill-opacity=".3"/>' + person(28, 36, C.amb) +
      '<line class="a-lever" x1="56" y1="34" x2="70" y2="14" stroke="' + C.ink + '" stroke-width="4" stroke-linecap="round" style="transform-origin:56px 34px"/></g>',
      'A runaway train heading for a junction: ten people you can see, and a platform of a hundred out of sight round the bend'),

    // 5. The sirens' weekend
    svg('<g class="a-bob"><path d="M120 112 H280 L260 140 H140z" fill="#7c4a1d"/>' +
      '<line x1="200" y1="112" x2="200" y2="30" stroke="' + C.ink + '" stroke-width="4"/>' +
      '<path d="M204 36 L250 96 H204z" fill="' + C.ink + '" fill-opacity=".85"/>' + person(194, 108, C.amb) +
      '<path d="M186 90 h20 M186 98 h20" stroke="' + C.ink + '" stroke-width="3"/></g>' +
      '<path class="a-wave2" d="M-20 140 q20 -10 40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 t40 0 V170 H-20z" fill="' + C.blu + '" fill-opacity=".35"/>' +
      '<g class="a-float">' + txt(320, 60, '♪', C.amb, 26) + '</g><g class="a-float" style="animation-delay:-1s">' + txt(350, 90, '♫', C.amb, 22) + '</g>' +
      '<g class="a-float" style="animation-delay:-.5s">' + txt(60, 70, '£', C.grn, 22) + '</g>',
      'A boat with a figure tied to the mast while music drifts over the waves'),

    // 6. Two restaurants
    svg('<rect x="30" y="40" width="140" height="100" rx="6" fill="#1d2840"/><rect x="230" y="40" width="140" height="100" rx="6" fill="#1d2840"/>' +
      '<rect x="30" y="30" width="140" height="22" rx="4" fill="' + C.red + '"/><rect x="230" y="30" width="140" height="22" rx="4" fill="' + C.grn + '"/>' +
      txt(100, 46, 'BUSY BISTRO', '#fff', 12) + txt(300, 46, 'QUIET CAFE', '#04210f', 12) +
      '<rect x="80" y="90" width="40" height="50" rx="3" fill="#0b0f17"/><rect x="280" y="90" width="40" height="50" rx="3" fill="#0b0f17"/>' +
      [0, 1, 2, 3, 4, 5].map(function (k) { return person(130 + k * 14, 150, k % 2 ? C.ink : C.mut, 'a-shuffle', (k * 0.2).toFixed(1)); }).join('') +
      '<g class="a-twinkle">' + txt(300, 76, '★★★★★', C.amb, 14) + '</g>',
      'A busy restaurant with a queue and a quiet one with five-star reviews'),

    // 7. Now or later
    svg('<g transform="translate(50 50)"><path d="M10 20 q30 -24 60 0 l8 60 h-76z" fill="' + C.grn + '" fill-opacity=".7"/>' + txt(40, 62, '£500', '#04210f', 16) + txt(40, 104, 'TODAY', C.mut, 11) + '</g>' +
      '<g transform="translate(176 40)"><path d="M0 0 h48 v6 q0 28 -20 40 q20 12 20 40 v6 h-48 v-6 q0 -28 20 -40 q-20 -12 -20 -40z" fill="none" stroke="' + C.ink + '" stroke-width="3"/>' +
      '<path class="a-sandtop" d="M8 10 h32 q-4 20 -16 32 q-12 -12 -16 -32z" fill="' + C.amb + '"/>' +
      '<line class="a-stream" x1="24" y1="44" x2="24" y2="80" stroke="' + C.amb + '" stroke-width="2" stroke-dasharray="3 3"/>' +
      '<path class="a-sandbot" d="M6 86 q18 -16 36 0z" fill="' + C.amb + '"/></g>' +
      '<g transform="translate(270 40)"><path d="M10 20 q35 -28 70 0 l10 70 h-90z" fill="' + C.amb + '" fill-opacity=".8"/>' + txt(45, 70, '£650', '#1a1205', 18) + txt(45, 114, 'IN A YEAR', C.mut, 11) + '</g>',
      'A bag of 500 pounds today, an hourglass, and a bigger bag of 650 pounds in a year'),

    // 8. The mountain
    svg('<path d="M20 170 L200 30 L380 170z" fill="#2a3a55"/><path d="M200 30 L230 54 L212 50 L200 62 L186 50 L170 54z" fill="' + C.ink + '"/>' +
      '<line x1="200" y1="30" x2="200" y2="10" stroke="' + C.ink + '" stroke-width="2"/><path d="M200 10 h16 l-4 5 l4 5 h-16z" fill="' + C.red + '"/>' +
      person(150, 102, C.amb, 'a-climb') +
      '<path class="a-bolt" d="M300 44 l-14 30 h12 l-8 26 l24 -36 h-12 l10 -20z" fill="' + C.amb + '"/>' +
      '<g class="a-cloud"><ellipse cx="300" cy="36" rx="46" ry="16" fill="#3b4760"/><ellipse cx="328" cy="28" rx="30" ry="14" fill="#3b4760"/><ellipse cx="272" cy="30" rx="24" ry="12" fill="#3b4760"/></g>' +
      txt(70, 40, '2pm?', C.mut, 14),
      'A climber near a summit as storm clouds and lightning roll in'),

    // 9. The trainers everyone wants
    svg('<polyline class="a-draw" points="30,140 80,130 120,134 160,110 200,100 240,72 280,60 320,30 360,22" fill="none" stroke="' + C.grn + '" stroke-width="4" stroke-linejoin="round" pathLength="100"/>' +
      '<g transform="translate(150 100)"><g class="a-bob"><path d="M0 30 q0 -26 20 -26 q10 0 14 10 q20 4 46 6 q24 2 24 18 v8 h-104z" fill="' + C.ink + '"/>' +
      '<path d="M0 38 h104 v8 h-104z" fill="' + C.red + '"/><path d="M36 16 l8 10 M46 14 l8 10 M56 16 l6 8" stroke="#0b0f17" stroke-width="3"/></g></g>' +
      txt(350, 56, '×2', C.grn, 22) + '<g class="a-twinkle">' + txt(60, 50, '✦', C.amb, 22) + '</g><g class="a-twinkle" style="animation-delay:-.7s">' + txt(110, 80, '✦', C.amb, 14) + '</g>',
      'A trainer next to a price chart that has doubled'),

    // 10. Heads, again
    svg([0, 1, 2, 3, 4].map(function (k) { return coin(42 + k * 54, 120, 20, 'H'); }).join('') +
      '<g class="a-flip">' + coin(330, 84, 26, '?') + '</g>' +
      '<ellipse class="a-shadow" cx="330" cy="148" rx="22" ry="4" fill="#000" fill-opacity=".45"/>' +
      txt(150, 50, 'FIVE IN A ROW', C.mut, 13),
      'Five coins all showing heads, and a sixth coin spinning in the air'),

    // 11. The sure thing
    svg('<path d="M0 140 H400" stroke="' + C.grn + '" stroke-opacity=".5" stroke-width="3"/>' +
      '<line x1="340" y1="60" x2="340" y2="140" stroke="' + C.ink + '" stroke-width="3"/><rect x="330" y="56" width="20" height="10" fill="' + C.red + '"/>' +
      '<g class="a-gallop"><g transform="translate(110 64)">' +
      '<path class="a-legs" d="M30 44 l-10 30 M42 46 l6 28 M86 44 l-12 30 M96 42 l10 30" stroke="#8a6440" stroke-width="6" stroke-linecap="round"/>' +
      '<ellipse cx="62" cy="36" rx="40" ry="16" fill="#b4895a"/>' +
      '<path d="M90 30 L110 4 L122 8 L128 22 L120 24 L112 16 L102 40z" fill="#b4895a"/>' +
      '<path d="M110 4 l-6 -8 l10 4z" fill="#b4895a"/><path d="M104 10 l-12 18" stroke="#5a3a1d" stroke-width="4"/>' +
      '<path d="M24 30 q-20 -4 -24 18" stroke="#5a3a1d" stroke-width="6" fill="none" stroke-linecap="round"/>' +
      '<circle cx="70" cy="-2" r="7" fill="' + C.amb + '"/><rect x="62" y="4" width="16" height="18" rx="6" fill="' + C.blu + '"/></g></g>' +
      '<g class="a-float">' + txt(70, 50, 'SURE THING?', C.amb, 14) + '</g>',
      'A racehorse galloping towards the finishing post'),

    // 12. The lost fiver
    svg('<path d="M0 150 H400" stroke="' + C.line + '" stroke-width="3"/>' + person(70, 150, C.ink) +
      '<path class="a-wind" d="M120 60 q40 -12 80 0 t80 0 M140 90 q30 -10 60 0" fill="none" stroke="' + C.mut + '" stroke-width="2" stroke-linecap="round"/>' +
      '<g class="a-blow"><g transform="translate(280 80)"><rect width="66" height="34" rx="4" fill="#3aa58a"/>' +
      '<rect x="4" y="4" width="58" height="26" rx="3" fill="none" stroke="#e8edf6" stroke-opacity=".6"/>' + txt(33, 23, '£5', '#06261e', 15) + '</g></g>',
      'A five pound note blowing away in the wind')
  ];
})();
