/** Hand-plotted pixel icons. Each character is one pixel; "." is transparent. */
const PALETTE = {
    x: 'currentColor',
    w: '#f4ecd8',
    y: '#ffc83d',
    h: '#fff2a1',
    o: '#b86a14',
    g: '#3fbf6f',
    G: '#a4f5a8',
    r: '#ff5a3d',
    d: '#a3a7bb',
    D: '#515469',
    c: '#00d4ff',
    v: '#b98cff',
    p: '#ff5fd2',
    u: '#ffffff',
};
const ICONS = {
    coin: ['..ooooo..', '.oyhhhyo.', 'oyhyyyyyo', 'oyhyooyyo', 'oyhyooyyo', 'oyhyooyyo', 'oyyyyyyyo', '.oyyyyyo.', '..ooooo..'],
    clover: ['..gg.gg..', '.gGgggGg.', '.ggggggg.', 'gg.ggg.gg', 'gGgggggGg', 'gg.ggg.gg', '.ggggggg.', '.gGgggGg.', '..gg.gg..'],
    bolt: ['...yyy.', '..yyy..', '.yyy...', 'yyyyyy.', '..yyy..', '.yyy...', 'yyy....', 'yy.....'],
    slot: ['ddddddddd', 'dDDDDDDDd', 'dDDDwDDDd', 'dDDDwDDDd', 'dDwwwwwDd', 'dDDDwDDDd', 'dDDDwDDDd', 'dDDDDDDDd', 'ddddddddd'],
    crown: ['y...y...y', 'y...y...y', 'yy.yyy.yy', 'yyyyhyyyy', 'yhyyyyyhy', 'yyyyyyyyy', 'ooooooooo'],
    battery: ['wwwwwwwww.', 'wyyyyy..ww', 'wyyyyy..ww', 'wyyyyy..ww', 'wyyyyy..ww', 'wwwwwwwww.'],
    ff: ['x...x...', 'xx..xx..', 'xxx.xxx.', 'xxxxxxxx', 'xxx.xxx.', 'xx..xx..', 'x...x...'],
    gift: ['.rr...rr.', 'r..r.r..r', '.rrrrrrr.', 'yyyyryyyy', 'yyyyryyyy', 'ooooroooo', '.yyyryyy.', '.yyyryyy.', '.yyyryyy.'],
    flame: ['...r...', '..rr...', '..rrr..', '.rryrr.', '.ryyyr.', 'rryyyrr', 'rryhyrr', '.ryyyr.', '..rrr..'],
    soundOn: ['...x..x..', '..xx...x.', 'xxxx.x.x.', 'xxxx.x.x.', 'xxxx.x.x.', '..xx...x.', '...x..x..'],
    soundOff: ['...x.....', '..xx.....', 'xxxx.r.r.', 'xxxx..r..', 'xxxx.r.r.', '..xx.....', '...x.....'],
    lock: ['..xxx..', '.x...x.', '.x...x.', 'xxxxxxx', 'xxx.xxx', 'xxx.xxx', 'xxxxxxx'],
    check: ['......xx', '.....xx.', 'x...xx..', 'xx.xx...', '.xxx....', '..x.....'],
    up: ['....x....', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxxxxxxx', '...xxx...', '...xxx...', '...xxx...'],
    book: ['.xxx.xxx.', 'x...x...x', 'x...x...x', 'x...x...x', 'x...x...x', 'xxxxxxxxx', '....x....'],
    star: ['....x....', '....x....', '...xxx...', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '..xxxxx..', '.xxx.xxx.', '.x.....x.'],
    trophy: ['xxxxxxxxx', 'x.xxxxx.x', 'x.xxxxx.x', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....', '...xxx...', '..xxxxx..'],
    close: ['x.....x', '.x...x.', '..x.x..', '...x...', '..x.x..', '.x...x.', 'x.....x'],
    cloverGold: ['..yy.yy..', '.yhyyhy.', 'yyy.yyy.', 'yy.y.yy.', 'yyyyyyy.', '.yyyyyy.', '..y.y..'],
    cloverRainbow: ['..p..c.', '.pG.G..', 'p.G.c..', '.GgG.p.', 'c.G.v..', '.vG.p..', '..v.p..'],
    cloverPrismatic: ['..u..c.', '.u.u..', 'c.u.v.', '.u.u.c.', 'v.u.u..', '.v.v.c.', '..u.v..'],
    cloverTranscendent: ['..u...u', '.u.v.u.', 'u.v.v.u', '.vvv.u.', 'u.v.v.u', '.u.v.u.', '..u.u..'],
    user: ['..xxx..', '.x...x.', '.x...x.', '..xxx..', 'xxxxxxx', 'x.x.x.x', 'x.....x'],
    skull: ['..xxxxx..', '.xxxxxxx.', 'xx.xxx.xx', 'xxxxxxxxx', 'xxx.x.xxx', '.xxxxxxx.', '..x.x.x..'],
    die: ['.xxxxxxx.', 'xoxxoxoxx', 'xxxxxxxxx', 'xxxoxoxxx', 'xxxxxxxxx', 'xoxxoxoxx', '.xxxxxxx.'],
    nudge: ['..xxxxx..', '..x...x..', '..x...x..', 'xxx...xxx', '....x....', '...xxx...', '..xx.xx..', '.xxx.xxx.', '..xxxxx..'],
    bounty: ['.xxxxxx..', 'x..o..ox.', 'x.oyyo.x.', 'x.oyyo.x.', 'x..o..ox.', '.xxxxxx..', '....xx...', '.....xx..', '......xx.'],
    nest: ['..xxxxx..', '.xyhyhxx.', 'xyoyyohx.', 'xhyyoyyx.', 'xyohyyox.', '.xyoyhyx.', '..xxxxx..'],
};
function toRuns(rows) {
    const out = [];
    rows.forEach((row, y) => {
        let x = 0;
        while (x < row.length) {
            const ch = row[x];
            if (ch === '.') {
                x++;
                continue;
            }
            let e = x;
            while (e < row.length && row[e] === ch)
                e++;
            out.push({ x, y, w: e - x, c: PALETTE[ch] ?? 'currentColor' });
            x = e;
        }
    });
    return out;
}
const RUNS = Object.fromEntries(Object.entries(ICONS).map(([k, rows]) => [k, toRuns(rows)]));
export function PixelIcon({ name, size = 2, className, recolor, }) {
    const rows = ICONS[name];
    const w = rows[0].length;
    const h = rows.length;
    return (<svg className={className} width={w * size} height={h * size} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true" focusable="false" style={{ flex: 'none' }}>
      {RUNS[name].map((r, i) => (<rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={recolor ?? r.c}/>))}
    </svg>);
}
