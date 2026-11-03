/* NOIR: Last Call — content. All writing lives here. */
(function (root) {
'use strict';
const D = {};

D.VOICES = {
  smooth: { o: ['Detective. ', 'Come now. ', 'Ah. ', 'Plainly: ', ''], c: [' Keep up.', ' Settled.', '', '', ''],
    fail: ['Charming. Irrelevant.', 'Still means nothing.', 'Try again.'],
    crack: ['You have been busy.', 'Hm. Inconvenient.', 'Annoyingly clever.'],
    conf: ['Enough. It was me.', 'Fine. It was me.'] },
  nervous: { o: ['Um— ', 'I— ', 'Okay. ', 'I... ', 'Oh god. '], c: [' Can I go?', ' Sorry.', '', '', ''],
    fail: ['Wh— what\'s that prove?', 'Why show me that?', 'That\'s not mine. Is it?'],
    crack: ['Oh no. Oh no no.', 'Don\'t look at me like that.', 'I knew you\'d find it.'],
    conf: ['Stop! It was me!', 'Okay! Yes! Me!'] },
  gruff: { o: ['Listen. ', 'Hmph. ', 'Look, pal. ', '', ''], c: [' Beat it.', ' That\'s all.', '', '', ''],
    fail: ['Waste of time.', 'I ain\'t laughing.', 'Means squat.'],
    crack: ['Tch. Fine.', 'Damn. Okay.', 'Alright. You got me.'],
    conf: ['I did it. Cuff me.', 'Yeah. Me.'] },
  theatrical: { o: ['Darling. ', 'Oh, the horror! ', 'Must we? ', 'Ah. ', 'Mon dieu. '], c: [' Curtain.', ' Tragic!', '', '', ''],
    fail: ['A prop! Not evidence!', 'Bravo. Wrong play.', 'How dull.'],
    crack: ['Oh! The scene turns!', 'You wound me. Rightly.', 'The third act. Early.'],
    conf: ['It was ME! In lights!', 'Take me, Detective!'] },
  icy: { o: ['', 'Precisely. ', 'Noted. ', 'Be brief. ', ''], c: [' Next.', '', '', '', ''],
    fail: ['Irrelevant.', 'I am not rattled.', 'No.'],
    crack: ['...I see.', 'More than I expected.', 'Very well.'],
    conf: ['Enough. It was me.', 'I did it. Satisfied?'] },
  folksy: { o: ['Well now. ', 'Shoot. ', 'I\'ll tell ya. ', 'Honest. ', ''], c: [' Gospel.', ' Swear it.', '', '', ''],
    fail: ['That ain\'t nothing.', 'Don\'t matter none.', 'Cows got more sense.'],
    crack: ['Aw, hell.', 'Well, shoot.', 'Lord. Alright.'],
    conf: ['I did it! It was me!', 'Take me. It was me.'] },
  flirty: { o: ['Mm, detective. ', 'Sweetheart. ', 'Careful. ', '', ''], c: [' Buy me a drink.', ' Don\'t stare.', '', '', ''],
    fail: ['Sweet. Wrong.', 'Oh, honey. No.', 'That your best card?'],
    crack: ['You did your homework.', 'Aren\'t you something.', 'Alright. Your hand.'],
    conf: ['Fine. It was me.', 'I did it, sweetheart.'] },
  wry: { o: ['Sure. ', 'Ha. ', 'Right. ', '', ''], c: [' Quote me.', ' Next?', '', '', ''],
    fail: ['Bold. Wrong.', 'Seen better at parties.', 'That\'s the whole case?'],
    crack: ['Okay! Point to you.', 'Annoyingly good.', 'Damn. I liked that lie.'],
    conf: ['Fine! It was me!', 'I did it. Roll credits.'] },
  pompous: { o: ['Frankly, ', 'Naturally, ', 'Well, ', '', ''], c: [' Write that down.', '', '', '', ''],
    fail: ['Irrelevant. Insulting.', 'Mislaid your logic?', 'Is this your training?'],
    crack: ['Hm. That alters things.', 'How tiresome of you.', 'One hoped otherwise.'],
    conf: ['Very well! It was I!', 'I did it. There.'] },
};

D.TELLS = ['sweat', 'shake', 'glance', 'swallow', 'glance', 'sweat'];
D.STINGERS = ['Only the rain.', 'Silence. Rain.', 'A clock. Too loud.'];
D.MICON = { money: '💰', love: '💔', blackmail: '✉️', revenge: '🗡️', coverup: '🤐' };

D.MOTIVES = {
  money: { label: 'Money', admit: ['{v} held my debts. Big ones.', 'I owed {v}. Everyone knew.', '{v} held my paper. Dead men don\'t collect.'],
    deny: null, gossip: ['{name} owed {v} a fortune.', 'Ask {name} about the debt.', '{name} was drowning in {v}\'s paper.'],
    doc: 'A new will. {name} owed {v} a fortune.',
    reveal: ['{v} called in my debts. Then I swung {weapon}.', 'Dead, {v} was worth more than owed.'] },
  love: { label: 'Love', admit: ['{v} and I were lovers. It ended badly.', 'I loved {v}. Past tense.', '{v} dumped me in front of everyone.'],
    gossip: ['{name} and {v}. It ended ugly.', 'Look at {name}. Broken hearts bruise.', '{name} loved {v}. Not returned.'],
    doc: 'Love letters. {name} and {v}. {v} ended it.',
    reveal: ['{v} laughed at me. So: {weapon}.', 'I\'d have given {v} the world. Instead, {weapon}.'] },
  blackmail: { label: 'Blackmail', admit: ['{v} had dirt on me. I paid.', 'Every month, an envelope to {v}.', 'I paid {v}. Monthly. In cash.'],
    gossip: ['{v} was squeezing {name}. Monthly.', '{v} had dirt on {name}.', 'Ask {name} what {v} knew.'],
    doc: '{v}\'s ledger. {name}, paying blackmail monthly.',
    reveal: ['Another envelope. I couldn\'t breathe. I stopped.', '{v} wanted double. I brought {weapon}.'] },
  revenge: { label: 'Revenge', admit: ['{v} ruined me, years ago.', '{v} destroyed my name once.', 'Hated {v}? Every morning, ten years.'],
    gossip: ['{name} never forgave {v}.', '{v} ruined {name} once.', '{name} has a long memory.'],
    doc: 'Old clipping. {v} ruined {name}\'s career.',
    reveal: ['Twenty years. Tonight {v} laughed. I stopped waiting.', '{v} ruined me. I returned the favor.'] },
  coverup: { label: 'Cover-up', admit: ['{v} threatened to talk. About me.', '{v} knew what I\'d buried.', '{v} was careless with my secrets.'],
    gossip: ['{v} was about to expose {name}.', '{name} had a secret. {v} had a mouth.', '{v} meant to tell the cops about {name}.'],
    doc: 'Half a letter. {v}, exposing {name}\'s fraud.',
    reveal: ['{v} was going to talk. I made sure not.', 'It was the secret or {v}.'] },
};
D.DENY = ['{v} and I got along fine.', 'We got along. Mostly.', 'I respected {v}. Feared, a little.'];

D.CLAIM = [
  'The {place}, ten till the screaming.',
  'The {place}. All night. Never left.',
  'The {place}. Nowhere near the {scene}.',
  'The {place}, all night. Dull as dishwater.',
];
D.VOUCH = [' {s} saw me there.', ' Ask {s}. Saw me at 10:40.', ' {s} saw me. On the dot.'];
D.ABSENT = [
  { t: 'Sign-out slip', x: '“{who}: out {out}, back 11:00.” {staff}', tool: 'tear', i: '🎟️' },
  { t: '{staff}\'s log', x: '{staff}: “{who}\'s seat stayed cold.”', tool: 'uv', i: '📒' },
  { t: 'Cold ashtray', x: '{who}\'s ashtray. Cold for an hour.', tool: 'match', i: '🚬' },
  { t: 'Closed-door note', x: '“Closed 10:15.” No {who} inside.', tool: 'tear', i: '🪧' },
];
D.PAIRSECRET = ['We\'re lovers. Secretly.', 'We were skimming the take.', 'We were running away tonight.', 'We were burning a letter.'];
D.PAIRCRACK = [
  'Fine. Not the {place}. {Spot}, with {p2}. {secret}',
  'All right! {Spot}. With {p2}, all night. {secret}',
  'I lied. {Spot}, with {p2}. {secret}',
];
D.PAIRCONFIRM = [
  '{p1} talked? Fine. {Spot}, together. {secret}',
  'Yes. {p1} and me, {spot}. {secret}',
  'True. {p1} was with me. {secret}',
];
D.CALLS = {
  affair: 'On the phone. Someone I shouldn\'t call. Logged 10:38.',
  bookie: 'On the phone, begging my bookie. Logged 10:38.',
  rival: 'On the phone, selling secrets. Logged 10:38.',
  job: 'On the phone, a job interview. Logged 10:38.',
};
D.SOLOCRACK = '{call} And {k}? Never near the {kplace}.';
D.KCRACK = [
  'Fine. Not the {place}. Out the {exit}. Alone.',
  'I left at 10:30. Out the {exit}. Alone.',
  'I needed air. The {exit}. No witnesses.',
];
D.SAW = [
  'At {when}, the {exit} banged. Reeked of {trait}.',
  'The {exit} slammed, {when}. Then {trait}.',
  'Someone slipped out the {exit}, {when}. Reeked of {trait}.',
];
D.CONF = [
  'I hit {v} with {fake}. Then I left.',
  'It was {fake}. One swing.',
  'I grabbed {fake}. I swung.',
];
D.CONFBREAK = [
  'Fine! I never touched {v}.',
  'It\'s a lie. The truth costs more.',
  'I never did it. I volunteered.',
];
D.STAGECLUE = '{staff}\'s note: “No answer at 10:10.” Dead by {Treal}. The {piece}\'s crown is pulled.';
D.KCALL = [
  'Fine. Not the {place}. On the phone, 10:38 to 10:50. Logged.',
  'A phone call. 10:38 to 10:50. Check the {piece}.',
];
D.KCALLQUOTE = 'On a logged call, 10:38 to 10:50. Check the {piece}.';
D.KSTAGE = [
  'The {piece}. Twenty minutes forward. That\'s all it took.',
  'I turned the hands. Then I made the call.',
];
D.LSTAGE = [
  'Dead by ten past? I signed out at 10:28.',
  'I was in the {place} till 10:28. It\'s on the slip.',
];
D.FRAMED = [
  'Mine. Stolen hours ago. Smell it. {other}, not {trait}.',
  'Stolen before nine. I wear {trait}. That\'s {other}.',
];
D.SAWL = [
  'Out the {exit} at 10:28. Bins knocked over. Reeked of {trait}.',
  'The {exit} was ajar at 10:28. Reeked of {trait}.',
];
D.PRESSALREADY = ['Already broke that one.', 'That story\'s dead.'];
D.PRESSNONE = ['So what?', 'Nothing to add.'];

/* ---------- settings & casts ---------- */
D.SETTINGS = [
{ id: 'club', pal: {"bg": "#0a0a0b", "panel": "#16130f", "line": "#362b20", "fg": "#f1e6d0", "mut": "#b9a98f", "acc": "#e0a040", "acc2": "#4e8c86", "gold": "#c8a45a", "red": "#9e2b25"}, piece: 'wristwatch', name: 'The Velvet Larkspur', tag: 'a smoky jazz club on the wrong side of the river', accent: '#e0a040', sky: ['#14100c', '#08070a'],
  victim: { first: 'Marcus', short: 'Lucky', full: 'Marcus “Lucky” Delano', title: 'club owner' },
  weapon: 'a bronze statuette', fake: 'a champagne bottle',
  scene: { name: 'Back Office', icon: '🗄️' },
  places: [{ id: 'stage', name: 'Bandstand', icon: '🎷' }, { id: 'dress', name: 'Dressing Room', icon: '💄' }, { id: 'bar', name: 'Bar', icon: '🥃' }, { id: 'coat', name: 'Coat Check', icon: '🧥' }],
  exit: { name: 'Alley Door', icon: '🚪' },
  spots: ['the walk-in cooler', 'the rooftop stairwell', 'the prop closet'], callSpot: 'the pay phone in the hall',
  staff: { name: 'Pops', role: 'the doorman' },
  open: 'Rain on the glass. A sax chokes mid-note. Lucky Delano, face-down. Four keys. Four liars.',
  body: 'Watch smashed at {T}. Two glasses. He knew his killer.',
  dead2: 'Pops, the doorman. Struck from behind. Minutes ago.',
  epi: 'By dawn the Larkspur went dark for good.',
  cast: [
   { id: 'viv', anon: "a silk evening glove", crack: "Damn it. I liked that lie. It fit me.", wrongAcc: "Darling, I sing about heartbreak. I don't do the stabbing.", caughtLine: "Write it pretty, Detective. I'd hate to be remembered badly.", name: 'Vivian Crane', short: 'Vivian', g: 'f', voice: 'flirty', role: 'Headline singer', look: 'Smoke in her voice, trouble in her eyes.', trait: 'lavender perfume',
     item: 'a silk evening glove stitched V.C., stiff with blood', itemShort: 'Bloody glove', ini: 'V.C.',
     art: { skin: '#e9c3a4', hair: 'waves', hc: '#2a1218', lips: 1, earring: 1, out: '#8a1c3d', cl: 'dress' },
     beats: ['*She taps ash into a saucer, never breaking eye contact.*', '*She crosses her legs. It\'s a weapon too.*', '*She hums three bars of something sad, then stops.*', '*She checks her lipstick in the back of a spoon.*'],
     quips: ['I\'ve been stared at by better detectives. And worse ones.', 'You\'ve got rain in your hat, darling. It suits you.', 'Lucky always said a smile was the cheapest alibi.'] },
   { id: 'des', anon: "a shirt cuff with a plain gold link", crack: "A rounding error. I'll correct it.", wrongAcc: "You've audited the wrong books, Detective.", caughtLine: "Do tell the Commissioner I kept immaculate records.", name: 'Desmond Voss', short: 'Desmond', g: 'm', voice: 'smooth', role: 'Club accountant', look: 'Counts everything. Including you.', trait: 'bay rum',
     item: 'a bloodied shirt cuff, its gold link engraved D.V.', itemShort: 'Bloody cuff', ini: 'D.V.',
     art: { skin: '#d9b08c', hair: 'slick', hc: '#15110e', glasses: 1, stache: 1, out: '#3a3d44', cl: 'suit', tie: '#7a1f2b' },
     beats: ['*He squares a stack of papers that doesn\'t need squaring.*', '*He polishes his glasses on a silk handkerchief.*', '*He glances at his watch, then at you, then the watch again.*', '*He steeples his fingers.*'],
     quips: ['Everything balances eventually, detective. Even this.', 'I deal in facts. Yours seem to be running short.', 'Lucky kept two sets of books. I kept him honest. Mostly.'] },
   { id: 'raf', anon: "a bar towel, rust-brown with blood", crack: "Should've just punched you. Simpler.", wrongAcc: "I've thrown out better guesses than you.", caughtLine: "Pour me one more. You owe me that.", name: 'Raff Quill', short: 'Raff', g: 'm', voice: 'gruff', role: 'Bartender & bouncer', look: 'Hands like cinder blocks. Soft spot for strays.', trait: 'cheap cigar smoke',
     item: 'a bar towel stitched R.Q., rust-brown with blood', itemShort: 'Bloody bar towel', ini: 'R.Q.',
     art: { skin: '#c99572', hair: 'bald', hc: '#222', scar: 1, stubble: 1, out: '#2d2d2a', cl: 'vest', wide: 1 },
     beats: ['*He wipes a glass that\'s already clean.*', '*He cracks his knuckles, one at a time.*', '*He pours two fingers of rye and slides it over. Doesn\'t ask.*', '*He leans on the bar like it owes him money.*'],
     quips: ['Twenty years throwing drunks out. You\'re not the worst.', 'I don\'t talk to cops. I make an exception for wet ones.', 'Lucky signed my checks. Didn\'t mean I liked him.'] },
   { id: 'ode', anon: "a coat-check glove, blood on the fingertips", crack: "I knew I'd say it wrong. I always say it wrong.", wrongAcc: "Me? I can't even kill a spider. I put them outside!", caughtLine: "I'm sorry. I'm sorry. I'm so tired of being sorry.", name: 'Odette Moreau', short: 'Odette', g: 'f', voice: 'nervous', role: 'Coat-check girl', look: 'Sees every coat. Remembers every face.', trait: 'peppermint',
     item: 'a coat-check glove stitched O.M., blood on the fingertips', itemShort: 'Bloody glove', ini: 'O.M.',
     art: { skin: '#f0d2b8', hair: 'bun', hc: '#6b3a1e', mole: 1, out: '#4a5a7a', cl: 'collar' },
     beats: ['*She twists a coat-check ticket until it tears.*', '*She glances at the door, then at you, then the door.*', '*She laughs at nothing. It dies fast.*', '*She hugs her elbows.*'],
     quips: ['I just hang coats. I don\'t hear anything. Okay, I hear everything.', 'Please don\'t write that down. Okay, write it down.', 'Mr. Delano was kind to me. Mostly.'] },
  ] },
{ id: 'manor', pal: {"bg": "#0a1210", "panel": "#13201b", "line": "#2c4339", "fg": "#efe7d4", "mut": "#b7bfa9", "acc": "#c9a24a", "acc2": "#9e2b25", "gold": "#d8b766", "red": "#9e2b25"}, piece: 'mantel clock', name: 'Blackwood Manor', tag: 'a rain-lashed estate with too many locked doors', accent: '#c9a24a', sky: ['#0e1614', '#060a09'],
  victim: { first: 'Alistair', short: 'Alistair', full: 'Lord Alistair Blackwood', title: 'master of the house' },
  weapon: 'a fireplace poker', fake: 'a candlestick',
  scene: { name: 'Study', icon: '📚' },
  places: [{ id: 'lib', name: 'Library', icon: '📖' }, { id: 'cons', name: 'Conservatory', icon: '🪴' }, { id: 'kit', name: 'Kitchen', icon: '🍳' }, { id: 'cell', name: 'Wine Cellar', icon: '🍷' }],
  exit: { name: 'Garden Gate', icon: '🌧️' },
  spots: ['the old nursery', 'the boathouse', 'the gun room'], callSpot: 'the telephone alcove under the stairs',
  staff: { name: 'Hobbs', role: 'the gardener' },
  open: 'Thunder. Lord Alistair, dead by a cold fire. Doors locked. Lines cut. Four grieving liars.',
  body: 'Mantel clock stopped at {T}. Two brandies. He knew his killer.',
  dead2: 'Hobbs, the gardener. Face-down in the mud. Minutes ago.',
  epi: 'By dawn the rain stopped. The rot didn\'t.',
  cast: [
   { id: 'imo', anon: "a black lace glove, stained dark", crack: "How tedious. I'll have to think of a better one.", wrongAcc: "Thirty years of marriage and you think I'd be this careless?", caughtLine: "Have my coat brought round. I won't be crying in front of you.", name: 'Lady Imogen Blackwood', short: 'Imogen', g: 'f', voice: 'icy', role: 'The widow', look: 'Grief you could chill wine with.', trait: 'lily-of-the-valley',
     item: 'a black lace glove stitched I.B., stained dark with blood', itemShort: 'Bloody lace glove', ini: 'I.B.',
     art: { skin: '#efd9c6', hair: 'bun', hc: '#b8b6b2', pearls: 1, out: '#17171c', cl: 'dress' },
     beats: ['*She does not blink. It is unnerving.*', '*She adjusts her pearls with two gloved fingers.*', '*She pours tea for one. Not for you.*', '*She stares past you at the rain.*'],
     quips: ['Grief is private, Detective. Questions are public. Choose.', 'I was married to him thirty years. I know exactly how unmourned he\'ll be.', 'You\'re dripping on the Persian.'] },
   { id: 'cor', anon: "a doctor's rubber glove, ether-sharp", crack: "A misdiagnosis. Mine, not yours.", wrongAcc: "I shall be writing to your superiors. In Latin.", caughtLine: "I took an oath to do no harm. I made one exception.", name: 'Dr. Cornelius Alder', short: 'Cornelius', g: 'm', voice: 'pompous', role: 'Family physician', look: 'Bedside manner like a closing door.', trait: 'ether and pipe tobacco',
     item: 'a doctor\'s rubber glove, ether-sharp, initialed C.A. in blood', itemShort: 'Doctor\'s glove', ini: 'C.A.',
     art: { skin: '#e0b999', hair: 'sweep', hc: '#8d8f93', glasses: 1, stache: 1, out: '#2a2f3a', cl: 'suit', tie: '#456' },
     beats: ['*He consults a pocket watch he clearly does not need.*', '*He tuts at your handwriting.*', '*He rolls his shoulders like a man delivering a lecture.*', '*He sniffs, as though the room had insulted him.*'],
     quips: ['In forty years of practice, I have never lost a patient to anything so vulgar as a poker.', 'Alistair was a dreadful patient and a worse friend. Quote me.', 'Medicine, Detective, is just deduction with better stationery.'] },
   { id: 'bea', anon: "a dish-towel, brown with blood, reeking of lemon polish", crack: "Lord forgive me, I was never any good at fibbing.", wrongAcc: "Thirty-one years in this house and this is the thanks I get?", caughtLine: "Somebody'll have to do the silver now. Won't be me.", name: 'Beatrix Hargrove', short: 'Beatrix', g: 'f', voice: 'folksy', role: 'Housekeeper', look: 'Has scrubbed every secret in this house.', trait: 'lemon polish and woodsmoke',
     item: 'a dish-towel stitched B.H., brown with blood, reeking of lemon polish', itemShort: 'Bloody dish-towel', ini: 'B.H.',
     art: { skin: '#d9a98a', hair: 'bun', hc: '#9a9a9a', glasses: 1, out: '#3b4a3b', cl: 'apron' },
     beats: ['*She wrings a dishcloth like it said something rude.*', '*She counts the silver with her eyes.*', '*She sets a cup in front of you without asking.*', '*She mutters at a spot on the rug.*'],
     quips: ['Thirty-one years I\'ve scrubbed that man\'s blood off his boots, and now this.', 'I see every footprint in this house. Mine are the only ones that wipe.', 'Eat something, you\'re pale as a plate.'] },
   { id: 'jas', anon: "a silver flask, sticky with blood", crack: "Well, that's embarrassing. For me, mostly.", wrongAcc: "Me? I can barely get out of bed before noon.", caughtLine: "At least now the family will finally talk about me.", name: 'Jasper Dunmore', short: 'Jasper', g: 'm', voice: 'wry', role: 'Wastrel nephew', look: 'Charm on credit, interest accruing.', trait: 'whiskey and cheap cologne',
     item: 'a silver flask engraved J.D., sticky with blood', itemShort: 'Bloody flask', ini: 'J.D.',
     art: { skin: '#f1d3b6', hair: 'curly', hc: '#5a3a1c', stubble: 1, out: '#6c4a3a', cl: 'open' },
     beats: ['*He spins a coin across his knuckles, then loses it, then pretends he meant to.*', '*He swigs from a flask, offers it, retracts it.*', '*He slouches until he\'s almost horizontal.*', '*He smirks at the portrait of his uncle.*'],
     quips: ['Uncle left me his name and nothing else. Frankly I\'d have taken the money.', 'If I\'d wanted him dead, I\'d have been more convincing about it.', 'I\'m the obvious suspect. That\'s exactly why I\'m too lazy to be the killer.'] },
  ] },
{ id: 'train', pal: {"bg": "#080c14", "panel": "#111a26", "line": "#29384a", "fg": "#ebeef0", "mut": "#a8b4bf", "acc": "#6fb0a6", "acc2": "#e0a040", "gold": "#d4b06a", "red": "#a33a2e"}, piece: 'pocket watch', name: 'The Midnight Meridian', tag: 'a night train rattling through nowhere', accent: '#6fb0a6', sky: ['#0c1420', '#05080f'],
  victim: { first: 'Viktor', short: 'Viktor', full: 'Count Viktor Halloran', title: 'railway magnate' },
  weapon: 'a silver letter opener', fake: 'a brass lamp',
  scene: { name: 'Private Cabin', icon: '🛏️' },
  places: [{ id: 'din', name: 'Dining Car', icon: '🍽️' }, { id: 'obs', name: 'Observation Deck', icon: '🔭' }, { id: 'barc', name: 'Bar Car', icon: '🍸' }, { id: 'cond', name: 'Conductor\'s Booth', icon: '🎫' }],
  exit: { name: 'Baggage Car', icon: '🧳' },
  spots: ['a sleeper berth at the end of the car', 'the luggage nook behind the stairs', 'the dark of the vestibule'], callSpot: 'the radio-telephone in the vestibule',
  staff: { name: 'Eli', role: 'the porter' },
  open: 'Two hours to the next station. Count Viktor, a letter opener in him. Four passengers. One killer.',
  body: 'Pocket watch shattered at {T}. Two cognacs. He knew his killer.',
  dead2: 'Eli, the porter. Behind the trunks. Minutes ago.',
  epi: 'Grey station at dawn. One passenger in cuffs.',
  cast: [
   { id: 'del', anon: "a velvet opera glove pinned with a gardenia", crack: "A wrong note! In my own aria!", wrongAcc: "You have cast me in the wrong role, darling. Unforgivable.", caughtLine: "Let them say Delphine gave her last great performance tonight.", name: 'Madame Delphine Fontaine', short: 'Delphine', g: 'f', voice: 'theatrical', role: 'Opera diva', look: 'Every sentence is an aria.', trait: 'gardenia',
     item: 'a velvet opera glove pinned with a gardenia, initialed D.F. in blood', itemShort: 'Bloody opera glove', ini: 'D.F.',
     art: { skin: '#e8c6a8', hair: 'waves', hc: '#8a2b12', lips: 1, earring: 1, out: '#5b2a6e', cl: 'dress' },
     beats: ['*She presses a hand to her throat, as if the note might escape.*', '*She fans herself with a program from a show that closed years ago.*', '*She sweeps to the window, the better to be lit by lightning.*', '*She sighs in a key you can almost name.*'],
     quips: ['Darling, I have died on stage four hundred times. This amateur death bores me.', 'I never forget a face. Or a slight.', 'Viktor was a pig with a ticket. Print that.'] },
   { id: 'sil', anon: "a brass whistle on a cord, dark with blood", crack: "Missed my stop with that one.", wrongAcc: "Twenty years without a blot, and you hang this on me?", caughtLine: "Somebody tell the line I won't be in Tuesday.", name: 'Silas Rook', short: 'Silas', g: 'm', voice: 'gruff', role: 'Train conductor', look: 'Twenty years on the line. Never lost a passenger. Till tonight.', trait: 'coal smoke and brass polish',
     item: 'a brass whistle engraved S.R., on a cord, dark with blood', itemShort: 'Bloody whistle', ini: 'S.R.',
     art: { skin: '#b98562', hair: 'cap', hc: '#1d2a44', stache: 1, out: '#1d2a44', cl: 'uniform' },
     beats: ['*He thumbs the ticket punch in his pocket. Click. Click.*', '*He checks the window like the dark owes him an explanation.*', '*He spits neatly out the door.*', '*He straightens his cap, then his spine.*'],
     quips: ['Rules are rules, even for dead counts.', 'Train don\'t stop for murder. Nor do I.', 'I keep time. Time kept me.'] },
   { id: 'nad', anon: "a notebook page with a bloody thumbprint, clove-scented", crack: "Off the record? That was a lie.", wrongAcc: "Great story. Wrong byline.", caughtLine: "Spell my name right in the papers. N-A-D-I-A.", name: 'Nadia Navarro', short: 'Nadia', g: 'f', voice: 'wry', role: 'Newspaper reporter', look: 'Asks the questions you\'re about to.', trait: 'clove cigarettes',
     item: 'a notebook page initialed N.N., clove-scented, with a bloody thumbprint', itemShort: 'Bloody notebook page', ini: 'N.N.',
     art: { skin: '#c68f6a', hair: 'bob', hc: '#1b1b1b', hat: 1, out: '#6b5b3a', cl: 'collar' },
     beats: ['*She flips her notebook open and eyes you instead of the page.*', '*She lights a clove cigarette with a flourish.*', '*She taps her pencil against her teeth.*', '*She smirks at something only she finds funny.*'],
     quips: ['I\'m a journalist. Lying to cops is a professional courtesy.', 'The headline writes itself: Count Dead, Everyone Delighted.', 'Ask me anything. I\'ll ask you back.'] },
   { id: 'gid', anon: "a gunmetal cigar cutter, blood in the groove", crack: "Every deal goes sour eventually.", wrongAcc: "If I'd done it, Detective, you'd never have found the body.", caughtLine: "Name your price. No? Pity.", name: 'Gideon Pierce', short: 'Gideon', g: 'm', voice: 'smooth', role: '“Import-export”', look: 'Everything is for sale. Especially you.', trait: 'good cigars and gun oil',
     item: 'a gunmetal cigar cutter engraved G.P., blood in the groove', itemShort: 'Bloody cigar cutter', ini: 'G.P.',
     art: { skin: '#dcb38f', hair: 'slick', hc: '#b4b6ba', glasses: 1, out: '#25282f', cl: 'suit', tie: '#2f4b7c' },
     beats: ['*He rolls a cigar between thumb and finger, unlit.*', '*He smiles like a man who owns the exit.*', '*He straightens a cuff worth more than your car.*', '*He glances at your coat like he\'s pricing it.*'],
     quips: ['Everything\'s for sale, Detective. Including alibis. Not mine, mind.', 'I trade in weapons. Murder is amateur hour.', 'Viktor owed me. Dead men don\'t pay.'] },
  ] },
{ id: 'lab', pal: {"bg": "#091315", "panel": "#112125", "line": "#28434a", "fg": "#eef4f2", "mut": "#a6bfbe", "acc": "#8cc4bb", "acc2": "#e08a3c", "gold": "#d9b56a", "red": "#b0402e"}, piece: 'wall clock', name: 'Halcyon Research Station', tag: 'a polar lab where the storm has cut every road and radio', accent: '#8cc4bb', sky: ['#0c1a1e', '#060c0e'],
  victim: { first: 'Elena', short: 'Dr. Marsh', full: 'Dr. Elena Marsh', title: 'station director' },
  weapon: 'a heavy steel torque wrench', fake: 'a fire axe',
  scene: { name: 'Director\'s Office', icon: '🧪' },
  places: [{ id: 'mess', name: 'Mess Hall', icon: '🥣' }, { id: 'radio', name: 'Radio Shack', icon: '📻' }, { id: 'frz', name: 'Sample Freezer', icon: '🧊' }, { id: 'dorm', name: 'Dormitory', icon: '🛏️' }],
  exit: { name: 'Generator Room', icon: '⚡' },
  spots: ['the instrument shed', 'the observation dome', 'the sauna cabin'], callSpot: 'the satellite phone in the comms nook',
  staff: { name: 'Pavel', role: 'the technician' },
  open: 'Blizzard. No roads. No radio. Dr. Marsh, dead by a torque wrench. Nobody leaves.',
  body: 'Wall clock stopped at {T}. Two coffees. She knew her killer.',
  dead2: 'Pavel, the technician. Crumpled by the door. Minutes ago.',
  epi: 'The storm broke. One scientist flew out in cuffs.',
  cast: [
   { id: 'the', anon: "a frost-stiff parka glove, red at the cuff", crack: "Error bars. I forgot the error bars.", wrongAcc: "I can't even win an argument with a thermostat!", caughtLine: "I want it on record that I was going to publish this year.", name: 'Dr. Theo Kessler', short: 'Theo', g: 'm', voice: 'nervous', role: 'Glaciologist', look: 'Studies ice. Terrible at keeping his cool.', trait: 'burnt coffee',
     item: 'a frost-stiff parka glove stitched T.K., red at the cuff', itemShort: 'Bloody parka glove', ini: 'T.K.',
     art: { skin: '#eed2b9', hair: 'curly', hc: '#6e4a2a', glasses: 1, out: '#c26a2a', cl: 'parka' },
     beats: ['*He picks at the label on a thermos.*', '*He keeps checking the window, as if the storm might stop.*', '*He pushes his glasses up. They slide right back.*', '*His knee bounces under the table.*'],
     quips: ['Statistically the odds of me doing this are... well. I\'m calculating.', 'I study ice. Ice doesn\'t lie. People do the opposite.', 'Please don\'t make me say anything that sounds like a confession.'] },
   { id: 'mar', anon: "a surgical glove, red to the wrist", crack: "Clinical error. Mine.", wrongAcc: "Wrong diagnosis, Detective. Fatally wrong.", caughtLine: "Steady hands. Always were. That was the problem.", name: 'Dr. Marisol Torres', short: 'Marisol', g: 'f', voice: 'icy', role: 'Station medic', look: 'Takes your pulse with her eyes.', trait: 'antiseptic and menthol',
     item: 'a surgical glove inked M.T. on the cuff, red to the wrist', itemShort: 'Bloody surgical glove', ini: 'M.T.',
     art: { skin: '#c58e66', hair: 'bun', hc: '#1a1a1a', out: '#e8eef2', cl: 'labcoat' },
     beats: ['*She takes your pulse with her eyes.*', '*She snaps off a glove, finger by finger.*', '*She says nothing for a full five seconds. Then smiles slightly.*', '*She notes something on a chart. It could be about you.*'],
     quips: ['I\'ve seen death up close. This one looks personal.', 'Your pulse is high. Mine isn\'t. Make of that what you will.', 'I treat symptoms, Detective. You can have the cause.'] },
   { id: 'wal', anon: "a grease-stiff rag, dark with blood", crack: "Aw, shoot. That one had a leak in it.", wrongAcc: "I fix things. I don't break folks.", caughtLine: "Somebody keep that generator running. She deserves better than me.", name: 'Walter Yarrow', short: 'Walter', g: 'm', voice: 'folksy', role: 'Cook & mechanic', look: 'Fixes everything. Hears everything.', trait: 'diesel and onions',
     item: 'a grease-stiff rag stitched W.Y., dark with blood', itemShort: 'Bloody rag', ini: 'W.Y.',
     art: { skin: '#c9946f', hair: 'cap', hc: '#6a6a60', stubble: 1, out: '#4a4a2a', cl: 'overalls', wide: 1 },
     beats: ['*He wipes his hands on a rag that makes them dirtier.*', '*He stirs something that smells better than the situation.*', '*He pats the wall like it\'s a horse.*', '*He scratches his stubble.*'],
     quips: ['Folks think a cook don\'t hear nothing. I hear every spoon in this station.', 'Generator\'s the only thing here I trust, and it\'s got a cough.', 'Dr. Marsh liked her coffee strong and her opinions stronger.'] },
   { id: 'lor', anon: "a fountain pen, ink and blood on the nib", crack: "A clerical error. Irritating.", wrongAcc: "I'll be filing a formal complaint about this accusation.", caughtLine: "Do note I was under budget.", name: 'Lorraine Whitlock', short: 'Lorraine', g: 'f', voice: 'pompous', role: 'Funding auditor', look: 'Finds the error. Then you.', trait: 'fountain-pen ink',
     item: 'a fountain pen engraved L.W., ink and blood on the nib', itemShort: 'Bloody fountain pen', ini: 'L.W.',
     art: { skin: '#f2d8c2', hair: 'bob', hc: '#9a7a52', glasses: 1, out: '#3d3d55', cl: 'suit', tie: '#8a8aa8' },
     beats: ['*She uncaps a fountain pen and does not write anything.*', '*She consults a clipboard like a hymnal.*', '*She regards the room\'s budget with visible pain.*', '*She stacks two forms. Of course she does.*'],
     quips: ['I audit people who lie for a living. You\'re a rank amateur.', 'Dr. Marsh was twelve thousand over budget and sixty thousand over her head.', 'Everything leaves a paper trail. Even murder. Especially murder.'] },
  ] },
{ id: 'studio', pal: {"bg": "#100d0a", "panel": "#1d1813", "line": "#43382b", "fg": "#f3ead8", "mut": "#c4b79f", "acc": "#c23a2f", "acc2": "#d8c39a", "gold": "#c9a45c", "red": "#c23a2f"}, piece: 'stage clock', name: 'Studio Nine', tag: 'a Hollywood soundstage after the cameras stop', accent: '#c23a2f', sky: ['#1a140e', '#0a0806'],
  victim: { first: 'Rex', short: 'Rex', full: 'Rex Maddox', title: 'tyrant director' },
  weapon: 'a cast-iron stage weight', fake: 'a prop revolver',
  scene: { name: 'Director\'s Trailer', icon: '🎬' },
  places: [{ id: 'stage9', name: 'Soundstage', icon: '🎥' }, { id: 'mkup', name: 'Makeup Room', icon: '💋' }, { id: 'props', name: 'Prop Shop', icon: '🗡️' }, { id: 'proj', name: 'Projection Booth', icon: '📽️' }],
  exit: { name: 'Loading Dock', icon: '🚚' },
  spots: ['the back seat of the prop limousine', 'the fake saloon on Stage Two', 'the wardrobe cage'], callSpot: 'the studio switchboard booth',
  staff: { name: 'Gus', role: 'the night watchman' },
  open: 'Midnight, Studio Nine. Rex Maddox, dead in his trailer. Four people wanted his head.',
  body: 'Stage clock stopped at {T}. Two coffees. He knew his killer.',
  dead2: 'Gus, the watchman. Struck from behind. Minutes ago.',
  epi: 'They made a picture about it. It flopped.',
  cast: [
   { id: 'gin', anon: "a satin glove, smeared with blood", crack: "Cut! Cut. That take was terrible.", wrongAcc: "Honey, I've played killers. I know how it's done, and it isn't like this.", caughtLine: "Get my good side for the newsreels.", name: 'Ginger LaRue', short: 'Ginger', g: 'f', voice: 'flirty', role: 'Starlet', look: 'Ten years an ingénue. Done waiting.', trait: 'cold cream and Chanel',
     item: 'a satin glove stitched G.L., smeared with blood', itemShort: 'Bloody satin glove', ini: 'G.L.',
     art: { skin: '#f1cfb3', hair: 'waves', hc: '#e0b65a', lips: 1, earring: 1, out: '#b8323f', cl: 'dress' },
     beats: ['*She finds her light without looking for it.*', '*She blots her lipstick on your case file.*', '*She tilts her chin like the camera is still rolling.*', '*She lights a cigarette from a candle on the makeup table.*'],
     quips: ['Rex said I photograph old. Rex photographs dead now.', 'Is this the scene where I cry? I can cry.', 'Every man in this town wants a girl to look at him like that. Not you, though.'] },
   { id: 'buc', anon: "a scuffed leather stunt glove, dark with blood", crack: "Well. Missed the mat on that one.", wrongAcc: "I fall off buildings for a living. I don't push people.", caughtLine: "Tell the second unit I said goodbye.", name: 'Buck Tanner', short: 'Buck', g: 'm', voice: 'gruff', role: 'Stuntman', look: 'Broken every bone twice. Mostly for Rex.', trait: 'motor oil and spearmint gum',
     item: 'a leather stunt glove stitched B.T., dark with blood', itemShort: 'Bloody stunt glove', ini: 'B.T.',
     art: { skin: '#c28a63', hair: 'slick', hc: '#3a2a1c', stubble: 1, scar: 1, out: '#5a3f2a', cl: 'open', wide: 1 },
     beats: ['*He cracks his gum like a knuckle.*', '*He rolls his bad shoulder. It clicks.*', '*He sits backwards on a chair. Of course he does.*', '*He rubs a scar on his jaw like it itches.*'],
     quips: ['Rex made me jump off a moving train twice because the light was wrong.', 'Pain\'s just a sound your body makes. I stopped listening.', 'You want a fall guy, pal? I\'m the professional.'] },
   { id: 'fel', anon: "a gin-soaked handkerchief, spotted with blood", crack: "That's a rewrite. A bad one. My worst.", wrongAcc: "I write murders. I'd never do one this sloppily.", caughtLine: "At least I finally wrote a good ending.", name: 'Felix Hart', short: 'Felix', g: 'm', voice: 'nervous', role: 'Screenwriter', look: 'Rex stole his last three scripts.', trait: 'typewriter ribbon and gin',
     item: 'a gin-soaked handkerchief monogrammed F.H., spotted with blood', itemShort: 'Bloody handkerchief', ini: 'F.H.',
     art: { skin: '#eccfb4', hair: 'curly', hc: '#2a1d14', glasses: 1, out: '#4d5a3a', cl: 'suit', tie: '#a33' },
     beats: ['*He mouths your question back to himself, editing it.*', '*He has ink on three fingers and his collar.*', '*He reaches for a drink that isn\'t there.*', '*He tears a matchbook into tiny pages.*'],
     quips: ['Rex rewrote my dialogue in crayon. Literally. Crayon.', 'This would make a good second act. I hate that I think that.', 'I\'m not a coward. I\'m a writer. It\'s different. Slightly.'] },
   { id: 'mon', anon: "a kid-leather driving glove, sticky with blood", crack: "Noted. Reshoots will be expensive.", wrongAcc: "I don't kill directors. I fire them. It's cheaper.", caughtLine: "Have legal draft a statement. Something tasteful.", name: 'Mona Klein', short: 'Mona', g: 'f', voice: 'icy', role: 'Producer', look: 'Signs the cheques. Holds the grudges.', trait: 'menthol cigarettes',
     item: 'a kid-leather driving glove stitched M.K., sticky with blood', itemShort: 'Bloody driving glove', ini: 'M.K.',
     art: { skin: '#e6c0a0', hair: 'bob', hc: '#141014', glasses: 1, pearls: 1, out: '#24242c', cl: 'suit', tie: '#ffb02e' },
     beats: ['*She checks a slim gold watch. Your time is costing her.*', '*She taps ash into Rex\'s Oscar.*', '*She signs something without reading it.*', '*She smiles with exactly half her mouth.*'],
     quips: ['Rex was four weeks over schedule and six feet under budget. Now he\'s both.', 'In this town, a corpse is just a delay.', 'I\'ve buried better men. Contractually.'] },
  ] },
];

D.RANKS = [
  { min: 1150, name: 'Rain-Soaked Legend', icon: '🌧️', line: 'They\'ll name a bar after you.' },
  { min: 950, name: 'Ace Detective', icon: '🕵️', line: 'Clean, quick, and a little smug.' },
  { min: 750, name: 'Sharp Gumshoe', icon: '🔎', line: 'Good legwork. Solid close.' },
  { min: 550, name: 'Plodding Flatfoot', icon: '👞', line: 'You got there. Eventually.' },
  { min: 0, name: 'Lucky Break', icon: '🍀', line: 'The case fell into your lap. Still counts.' },
];

if (typeof module !== 'undefined' && module.exports) module.exports = D; else root.NoirData = D;
})(typeof window !== 'undefined' ? window : globalThis);
