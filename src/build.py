import io, os, sys
here = os.path.dirname(os.path.abspath(__file__))
rd = lambda n: io.open(os.path.join(here, n), encoding='utf-8').read()
s = rd('home.html'); css = rd('game.css'); ghtml = rd('game.html'); gjs = rd('game.js'); extra_css = rd('extra.css'); extra_js = rd('extra.js')

def rep(a, b, count=1):
    global s
    n = s.count(a)
    if n != count:
        sys.exit('expected %d of %r, found %d' % (count, a[:60], n))
    s = s.replace(a, b)

OLD = 'href="https://claude.ai/artifact/U8rJab5fvu8sNd22d7Apaj" target="_blank" rel="noopener"'
rep(OLD, 'href="#play" data-play', 3)
rep('</style>', extra_css + '\n' + css + '</style>')
rep('<div class="stat"><b data-n="3">3</b><span>laps</span></div>', '<div class="stat"><b data-n="2">2</b><span>circuits</span></div>')
rep('<div class="stat"><b data-n="3">3</b><span>boost pads</span></div>', '<div class="stat"><b data-n="4">4</b><span>ways to race</span></div>')
rep('>Replay the start</button>', '>Replay the start, with sound</button>')
rep('<main>', '''<main>
  <section id="play">
    <div class="wrap">
      <span class="kicker">Not a recording</span>
      <h2>This is the <em>actual</em> game</h2>
      <p>All six drivers are out practising in your browser right now. Press the button, pick one, and you are in the kart.</p>
''' + ghtml + '''    </div>
  </section>
''')
rep('<li id="lapLen"></li>\n        </ul>', '<li id="lapLen"></li>\n        </ul>\n        <p style="margin-top:18px">There is a second circuit too. Rattlesnake Pass is longer and has more corners to get wrong.</p>')
rep('<p>Whoever gets a long way ahead of you eases off a touch. Whoever drops a long way back finds a little more. Nobody is ever out of it, including you.</p>',
    '<p>Sit behind one and they move over to cover the inside. They slide through the tight corners, and now and then one brakes too late and runs wide.</p>\n        <p>Whoever gets a long way ahead of you eases off a touch. Whoever drops a long way back finds a little more.</p>')
rep('comes back as a boost.</p>', 'comes back as a boost. The longer the slide, the bigger the boost: the smoke turns yellow, then red, to tell you.</p>\n        <p>Yellow boxes hand out one of three things. A Nitro, a Tumbleweed to drop behind you, or a Stinger that goes after the kart in front.</p>')
rep('<li><kbd>Space</kbd>Drift</li>', '<li><kbd>Space</kbd>Drift</li>\n          <li><kbd>E</kbd>Use an item</li>')
rep('</main>', '''  <section id="modes">
    <div class="wrap">
      <span class="kicker">Race day programme</span>
      <h2>Four ways <em>to race</em></h2>
      <ul class="tickets">
        <li><b>Grand Prix</b><span>Three laps against the other five drivers, with items. Your best race time is kept.</span></li>
        <li><b>Time trial</b><span>An empty circuit and the ghost of your best lap, which stays saved in this browser.</span></li>
        <li><b>Split screen</b><span>Two players on one keyboard, side by side, with four computer drivers in the way.</span></li>
        <li><b>Online</b><span>Open the page on two computers, both pick Online, and one of you starts the race.</span></li>
      </ul>
    </div>
  </section>
</main>''')
rep('<small>Runs in a browser tab &middot; keyboard or touch &middot; about three minutes a race</small>', '<small>Runs in a browser tab &middot; keyboard or touch &middot; best times saved in this browser</small>')
rep('<script>\n(function () {\n  \'use strict\';\n  var REDUCED',
    '<div class="wipe" aria-hidden="true"><i class="a"></i><i class="b"></i></div>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>\n<script>\n' + gjs + '</script>\n<script>\n(function () {\n  \'use strict\';\n  var REDUCED')
s = s.rstrip() + '\n<script>\n' + extra_js + '</script>\n'
io.open(os.path.join(here, '..', 'canyon-karts-home.html'), 'w', encoding='utf-8', newline='\n').write(s)
print('built', len(s))
skel = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
io.open(os.path.join(here, '..', 'index.html'), 'w', encoding='utf-8', newline='\n').write(skel + s + '</body></html>')
