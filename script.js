import {Decimal} from './big_number.js';
import {achievements, populateAchievements,
  giveAchievement, hasAchievement}
from './achievements.js';
import {getEffect, infinityShop, populateShop} from './shops.js';
import {challengeList, getTotalChallengeTime,
  getChallName} from './challenges.js';
import {title, get, processPhrase, formatTime, notify,
  utilGetAmount, utilGetBought, setPlayer, doInterval,
  getOrCreateElement} from './utils.js';

let TIERS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

let PLURAL_TIERS = ['zeros', 'ones', 'twos', 'threes', 'fours', 'fives', 'sixes', 'sevens'];

let initPrices = function () {
  let d = {};
  for (let i = 1; i <= 7; i++) {
    d[i] = new Decimal(7 * i);
  }
  return d;
}

let initPriceMults = function () {
  let d = {};
  for (let i = 1; i <= 7; i++) {
    d[i] = new Decimal(7 / 6);
  }
  return d;
}

let initDoublePrices = function () {
  let d = {};
  for (let i = 1; i <= 7; i++) {
    d[i] = Decimal.pow(7, 7 * i);
  }
  return d;
}

let initDoublePriceMults = function () {
  let d = {};
  for (let i = 1; i <= 7; i++) {
    d[i] = Decimal.pow(7, i);
  }
  return d;
}

let initNeededPerShift = function () {
  let d = {};
  for (let i = 0; i < 6; i++) {
    d[i] = (i + 3) * 7;
  }
  return d;
}

let initialLast10Inf = function () {
  return [...Array(10)].map(function (x) {
    return {'time': millisecondsPerMillennium,
    'ip': new Decimal(0), 'ipPerMinute': new Decimal(0)};
  });
}

let getInitialOptions = function () {
  return {};
}

let millisecondsPerMillennium = 1000 * 360 * 24 * 3600 * 1000;

let getInitialChallengeData = function () {
  let bestTimes = {};
  for (let i of challengeList) {
    bestTimes[i] = millisecondsPerMillennium;
  }
  return {
    'intervals': {
      '4': {'last': Date.now(), 'interval': 4000},
      '5': {'last': Date.now(), 'interval': 5000}
    },
    'bestTimes': bestTimes
  }
}

let initPlayer = function () {
  return {
    'totalZeros': new Decimal(0),
    'clicks': 0,
    'amounts': {},
    'bought': {},
    'prices': initPrices(),
    'priceMults': initPriceMults(),
    'doubleBought': {},
    'doublePrices': initDoublePrices(),
    'doublePriceMults': initDoublePriceMults(),
    'neededPerShift': initNeededPerShift(),
    'boosts': {},
    'shifts': 0,
    'infinities': 0,
    'infinityPoints': new Decimal(0),
    'achBoost': 1,
    'achievements': [],
    'times': {
      'playStart': Date.now(),
      'infStart': Date.now(),
      'resetStart': Date.now(),
    },
    'lastTick': Date.now(),
    'last10Inf': initialLast10Inf(),
    'options': getInitialOptions(),
    'version': [1, 0, 0, 0],
    'challengeData': getInitialChallengeData(),
    'bestInfTime': millisecondsPerMillennium,
    'currentChallenge': ''
  };
}

let showTab = function (x) {
  let tabs = document.getElementsByClassName('tab');
  for (let i of tabs) {
    if (i.id === x) {
      i.style.display = 'block';
    } else {
      i.style.display = 'none';
    }
  }
}

let getLoad = function (x) {
  if (typeof x === 'object'&& 'load' in x) {
    delete x.load;
    return Decimal.load(x);
  } else if (Array.isArray(x)) {
    return x.map(getLoad);
  } else if (typeof x === 'object') {
    let r = {};
    for (let i in x) {
      r[i] = getLoad(x[i]);
    }
    return r;
  } else {
    return x;
  }
}

let getSave = function (x) {
  if (typeof x === 'object' && 'save' in x) {
    let s = x.save();
    s.load = true;
    return s;
  } else if (Array.isArray(x)) {
    return x.map(getSave);
  } else if (typeof x === 'object') {
    let r = {};
    for (let i in x) {
      r[i] = getSave(x[i]);
    }
    return r;
  } else {
    return x;
  }
}

let save = function () {
  localStorage.setItem('save', btoa(JSON.stringify(getSave(player))));
  notify('Saved!', 'green', 1);
}

let exportSave = function () {
  document.getElementById('above-saveplace').style.display = 'block';
  document.getElementById('saveplace').style.display = 'block';
  document.getElementById('above-saveplace').innerHTML = 'This is your save:';
  document.getElementById('saveplace').value = localStorage.getItem('save');
}

let updatePlayer = function () {
  if (!('times' in player)) {
    player.times = {};
    player.times.playStart = player.playStart;
    player.times.infStart = player.infStart || player.playStart;
    player.times.resetStart = player.resetStart || player.playStart;
  }
  for (let i in player.times) {
    if (i in player) {
      delete player[i];
    }
  }
  if (!('gettingOver' in player)) {
    player.gettingOver = true;
  }
  if (!('last10Inf' in player) || player.last10Inf.some(function (x) {
    return typeof x.ip === 'number' || typeof x.ipPerMinute === 'number';
  })) {
    player.last10Inf = initialLast10Inf();
  }
  if (!('options' in player)) {
    player.options = getInitialOptions();
  }
  if (!('bestInfTime' in player)) {
    player.bestInfTime = millisecondsPerMillennium;
  }
  if (!('challengeData' in player)) {
    player.challengeData = getInitialChallengeData();
  }
  for (let i of challengeList) {
    if (!(i in player.challengeData.bestTimes)) {
      player.challengeData.bestTimes[i] = millisecondsPerMillennium;
    }
  }
  if (!('currentChallenge' in player)) {
    player.currentChallenge = '';
  }
}

let load = function (x, playerCaused) {
  try {
    setPlayer(player, getLoad(JSON.parse(atob(x))));
    updatePlayer();
  } catch (e) {
    if (playerCaused) {
      notify('Your save failed to load!', 'red', 5);
    }
  }
}

let getPercentToInfinity = function () {
  return (getZeros().max(1).log(2) / 1024 * 100).toFixed(2)
}

let updateStats = function () {
  // total zeros
  document.getElementById('totalZeros').innerHTML = 'You have made ' +
  player.totalZeros.toStr(2) + ' total zeros.';
  // playtime
  document.getElementById('playtime').innerHTML = 'You have played for ' +
  formatTime(Date.now() - player.times.playStart) + '.';
  // inftime
  document.getElementById('inftime').innerHTML = 'You have been in this infinity for ' +
  formatTime(Date.now() - player.times.infStart) + '.';
  // resettime
  document.getElementById('resettime').innerHTML = 'You have gone without resetting for ' +
  formatTime(Date.now() - player.times.resetStart) + '.';
  // clicks
  document.getElementById('clicks').innerHTML = 'You have clicked ' +
  player.clicks + ' times.'
  // to infinity
  document.getElementById('percent').innerHTML = 'You are ' +
  getPercentToInfinity() + '% of the way to infinity.'
  // boosts
  document.getElementById('numBoosts').innerHTML = 'You have done ' +
  processPhrase(totalBoosts(), 0, 'boost') + '.';
  // shifts
  document.getElementById('numShifts').innerHTML = 'You have done ' +
  processPhrase(player.shifts, 0, 'shift') + '.';
  // infinities
  if (player.infinities > 0) {
    document.getElementById('statInfinitied').style.display = '';
    document.getElementById('statInfinitied').innerHTML =
    'You have gone infinite ' + processPhrase(player.infinities, 0, 'time') + '.';
  } else {
    document.getElementById('statInfinitied').style.display = 'none';
  }
  // best inf time
  if (player.infinities > 0) {
    document.getElementById('bestInfTime').style.display = '';
    document.getElementById('bestInfTime').innerHTML =
    'Your best infinity time is ' + formatTime(player.bestInfTime) + '.';
  } else {
    document.getElementById('bestInfTime').style.display = 'none';
  }
  if (player.infinities > 0) {
    let p = document.getElementById('last10Inf');
    p.style.display = '';
    for (let i = 0; i < 10; i++) {
      let el = getOrCreateElement('last10Inf' + i, p);
      el.innerHTML = 'The infinity ' + (i + 1) + ' infinities ago took ' +
      formatTime(player.last10Inf[i].time) + ' and gave ' +
      player.last10Inf[i].ip.toStr(2) + ' infinity points. ' +
      player.last10Inf[i].ipPerMinute.toStr(2) + ' IP per minute.';
    }
  } else {
    document.getElementById('last10Inf').style.display = 'none';
  }
  if (player.infinities > 0) {
    let p = document.getElementById('challengeTimes');
    p.style.display = '';
    for (let i of challengeList) {
      let el = getOrCreateElement(i + 'ChallengeTime', p);
      el.innerHTML = 'Best ' + getChallName(i) + ' time: ' +
      formatTime(player.challengeData.bestTimes[i]);
    }
    let el = getOrCreateElement('totalChallengeTime', p);
    el.innerHTML = 'Sum of challenge times: ' +
    formatTime(getTotalChallengeTime(player));
  } else {
    document.getElementById('challengeTimes').style.display = 'none';
  }
}

let updateAchPower = function () {
  let boost = 1;
  for (let i = 0; i < achievements.length; i++) {
    let double = true;
    for (let j = 0; j < achievements[i].length; j++) {
      if (!player.achievements.includes(i + '-' + j)) {
        double = false;
      }
    }
    if (double) {
      boost = boost * 2;
    }
  }
  player.achBoost = boost;
  document.getElementById('achProdBoost').innerHTML =
  'You are getting a ' + boost + 'x boost to production from achievements ' +
  '(2x per completed row).';
}

let getBought = function (i) {
  return utilGetBought(player, i);
}

let getAmount = function (i) {
  return utilGetAmount(player, i);
}

let getZeros = function () {
  return getAmount(0);
}

let doProduction = function (diff) {
  addZeros(getProdPerSecondOf(0).times(diff / 1000))
  for (let i = 1; i < 7; i++) {
    player.amounts[i] = getAmount(i).plus(getProdPerSecondOf(i).times(diff / 1000));
  }
}

let getMultiplier = function (rank) {
  let mult = new Decimal(1);
  mult = mult.times(Decimal.pow(player.shiftPower.value, player.shifts));
  mult = mult.times(Decimal.pow(player.doublingPower.value, get(player.doubleBought, rank, 0)));
  mult = mult.times(Decimal.pow(player.boostPower.value, get(player.boosts, rank, 0)));
  mult = mult.times(player.achBoost);
  mult = mult.times(player.prodMult.value);
  // from infinity upgrades
  mult = mult.times(getEffect(player, 'playTimeProdBoost'));
  mult = mult.times(getEffect(player, 'infTimeProdBoost'));
  mult = mult.times(getEffect(player, 'resetTimeProdBoost'));
  mult = mult.times(getEffect(player, 'infinityProdBoost'));
  mult = mult.times(getEffect(player, 'ipProdBoost'));
  mult = mult.times(getEffect(player, 'boughtProdBoost', rank));
  if (rank === 7) {
    if (hasAchievement(player, 'Where\'s eight?')) {
      mult = mult.times(7 / 6);
    }
    if (hasAchievement(player, 'Sevens add and multiply')) {
      mult = mult.times(7 / 6);
    }
    if (hasAchievement(player, '2747')) {
      mult = mult.times(Decimal.pow(343 / 342, getBought(7)));
    }
  }
  if (rank === 1) {
    if (hasAchievement(player, 'A million is a lot')) {
      mult = mult.times(2);
    }
    if (hasAchievement(player, 'What\'s the point of doing that?')) {
      mult = mult.times(Decimal.pow(2401 / 2400, getBought(1)));
    }
    if (hasAchievement(player, 'We ain\'t ever getting over')) {
      mult = mult.times(2);
    }
  }
  if (rank !== 7) {
    if (hasAchievement(player, 'One\'s even enough')) {
      mult = mult.times(7 / 6);
    }
  }
  if (hasAchievement(player, 'Halfway there')) {
    mult = mult.times(2);
  }
  return mult;
}

let getProdPerSecondOf = function (i) {
  if (i === 7) {
    return new Decimal(0);
  } else {
    return getMultiplier(i + 1).times(getAmount(i + 1));
  }
}

let canGiveNerf = function () {
  if (!getAmount(1).eq(1)) {
    return false;
  }
  for (let i = 2; i <= 7; i++) {
    if (getAmount(i).gt(0)) {
      return false;
    }
  }
  return true;
}

let canGiveNerfII = function () {
  if (!canGiveNerf()) {
    return false;
  }
  if (totalBoosts() > 0) {
    return false;
  }
  if (player.shifts > 0) {
    return false;
  }
  return true;
}

let canGiveAntiInvasion = function () {
  for (let i = 2; i <= 7; i++) {
    if (getMultiplier(i).lte(getMultiplier(i - 1))) {
      return false;
    }
  }
  return true;
}

let totalBoosts = function () {
  return Object.values(player.boosts).reduce(function (x, y) {
    return x + y;
  }, 0);
}

let updateAmountAch = function () {
  if (getZeros().gte(1e6)) {
    giveAchievement(player, 'A million is a lot');
  }
  // imprecision
  if (getAmount(7).minus(77).abs().lt(.1)) {
    giveAchievement(player, 'Where\'s eight?');
  }
  if (getMultiplier(7).gte(1000)) {
    giveAchievement(player, 'Sevens add and multiply');
  }
  if (totalBoosts() >= 10) {
    giveAchievement(player, 'That\'s a lot of boosts');
  }
  if (getZeros().gt(1.34e154)) {
    giveAchievement(player, 'Halfway there');
  }
  if (getProdPerSecondOf(0).gt(1e6) && canGiveNerf()) {
    giveAchievement(player, 'Some one needs to nerf that');
  }
  // imprecision
  if (getAmount(7).gte(274 - 1e-6)) {
    giveAchievement(player, '2747');
  }
  if (getProdPerSecondOf(0).gt(1e6) && canGiveNerfII()) {
    giveAchievement(player, 'Some one needs to nerf that II');
  }
  if (canGiveAntiInvasion()) {
    giveAchievement(player, 'Anti-invasion from the eighth dimension!');
  }
  // Give an initial grace second.
  if (getZeros(player).gt(getProdPerSecondOf(0)) &&
  (Date.now() - player.times.resetStart) > 1000) {
    // The player got over.
    player.gettingOver = true;
  }
}

let tick = function () {
  let now = Date.now();
  let diff = now - player.lastTick;
  player.lastTick = now;
  updateAmountAch();
  updateAchPower();
  updateStats();
  updateNumbersSection();
  doProduction(diff);
  giveIP(diff);
  doInfinityStuff();
  doChallengeIntervalStuff();
}

let inChallenge = function (x) {
  return player.currentChallenge === x;
}

let removeAllButHighest = function (x) {
  let seenHad = false;
  for (let i = 7; i >= 0; i--) {
    if (seenHad) {
      player.amounts[i] = new Decimal(0);
    }
    seenHad = seenHad || player.amounts[i].gt(0);
  }
}

let doChallengeIntervalStuff = function () {
  if (inChallenge('4')) {
    doInterval(player.challengeData.intervals['4'], removeAllButHighest);
  }
  if (inChallenge('5')) {
    doInterval(player.challengeData.intervals['5'], maxall);
  }
}

let getInfinityPoints = function () {
  if (player.currentChallenge === '') {
    return player.ipMult.value;
  } else {
    return new Decimal(1);
  }
}

let doInfinityStuff = function () {
  if (!player.break && overInfinity()) {
    document.getElementById('main').style.display = 'none';
    document.getElementById('empty').style.display = '';
    document.getElementById('goinfinite').className = 'availablebtn';
    document.getElementById('goinfinite').style.display = '';
    document.getElementById('goinfinite').innerHTML = 'Go infinite (get ' +
    getInfinityPoints().toStr(2) + ' infinity points)';
  } else {
    document.getElementById('main').style.display = '';
    document.getElementById('empty').style.display = 'none';
  }
  if (player.infinities > 0) {
    document.getElementById('inftabbtn').style.display = '';
    document.getElementById('challtabbtn').style.display = '';
    document.getElementById('autotabbtn').style.display = '';
  } else {
    document.getElementById('inftabbtn').style.display = 'none';
    document.getElementById('challtabbtn').style.display = 'none';
    document.getElementById('autotabbtn').style.display = 'none';
  }
  updateInfinityTab();
}

let updateInfinityTab = function () {
  document.getElementById('numInfinitied').innerHTML =
  'You have gone infinite ' + processPhrase(player.infinities, 0, 'time') + '.';
  document.getElementById('numInfPoints').innerHTML =
  'You have ' + processPhrase(player.infinityPoints, 2, 'infinity point') + '.';
}

let overInfinity = function () {
  return getZeros().gte(Decimal.pow(2, 1024));
}

let cannotDoStuff = function () {
  return !player.break && overInfinity();
}

let getClickPower = function () {
  let res = new Decimal(1);
  if (hasAchievement(player, 'That\'s a lot of clicks')) {
    res = res.times(2);
  }
  if (player.currentChallenge === '') {
    res = res.times(player.clickMult.value);
  }
  return res;
}

let addZeros = function (x) {
  player.amounts[0] = getZeros().plus(x);
  player.totalZeros = player.totalZeros.plus(x);
}

let click = function () {
  if (cannotDoStuff()) {
    return false;
  }
  player.clicks++;
  addZeros(getClickPower());
  giveAchievement(player, 'You gotta start somewhere');
  if (player.clicks >= 100) {
    giveAchievement(player, 'That\'s a lot of clicks');
  }
}

let setOptionsOnclick = function () {
  document.getElementById('save').onclick = function () {
    save();
    exportSave();
  }
  document.getElementById('load').onclick = function () {
    load(prompt('Input your save:'), true);
  }
  document.getElementById('reset').onclick = function () {
    if (confirm('Are you sure? Hard resetting will completely reset your game ' +
    'and not unlock anything new. You will not be able to reverse this action. ' +
    'You might want to copy your save first.')) {
      setPlayer(player, initPlayer());
      save();
    }
  }
}

let setupNumbersSection = function () {
  let numtable = document.getElementById('numtable');
  for (let i = 1; i <= 7; i++) {
    let row = document.createElement('tr');
    row.id = 'firstrow' + i;
    // name
    let e1 = document.createElement('td');
    e1.id = 'name' + i;
    e1.innerHTML = title(PLURAL_TIERS[i]);
    row.appendChild(e1);
    // amount
    let e2 = document.createElement('td');
    e2.id = 'amount' + i;
    row.appendChild(e2);
    // multiplier
    let ee = document.createElement('td');
    ee.id = 'mult' + i;
    row.appendChild(ee);
    // bought
    let e3 = document.createElement('td');
    e3.id = 'bought' + i;
    row.appendChild(e3);
    // per second
    let e4 = document.createElement('td');
    e4.id = 'perSec' + i;
    row.appendChild(e4);
    // buy one
    let e5 = document.createElement('td');
    let b1 = document.createElement('button');
    b1.id = 'buyOne' + i;
    e5.appendChild(b1);
    row.appendChild(e5);
    // buy max
    let e6 = document.createElement('td');
    let b2 = document.createElement('button');
    b2.id = 'buyMax' + i;
    e6.appendChild(b2);
    row.appendChild(e6);
    let row2 = document.createElement('tr');
    row2.id = 'secondrow' + i;
    // doublings bought
    let e7 = document.createElement('td');
    e7.id = 'doublings' + i;
    row2.appendChild(e7);
    // buy one doubling
    let e8 = document.createElement('td');
    let b3 = document.createElement('button');
    b3.id = 'buyOneDoubling' + i;
    e8.appendChild(b3);
    row2.appendChild(e8);
    // buy max doublings
    let e9 = document.createElement('td');
    let b4 = document.createElement('button');
    b4.id = 'buyMaxDoubling' + i;
    e9.appendChild(b4);
    row2.appendChild(e9);
    // boosts done
    let e10 = document.createElement('td');
    e10.id = 'boosts' + i;
    row2.appendChild(e10);
    // do a boost
    let e11 = document.createElement('td');
    let b5 = document.createElement('button');
    b5.id = 'doBoost' + i;
    e11.appendChild(b5);
    row2.appendChild(e11);
    numtable.appendChild(row);
    numtable.appendChild(row2);
  }
}

let updateNumbersRow = function (i) {
  // amount
  let e2 = document.getElementById('amount' + i);
  e2.innerHTML = getAmount(i).toStr(2);
  // mult
  let ee = document.getElementById('mult' + i);
  ee.innerHTML = getMultiplier(i).toStr(2) + 'x';
  // bought
  let e3 = document.getElementById('bought' + i);
  e3.innerHTML = 'Bought: ' + getBought(i);
  // per second
  let e4 = document.getElementById('perSec' + i);
  e4.innerHTML = getProdPerSecondOf(i).toStr(2) + '/s';
  let e5 = document.getElementById('buyOne' + i);
  let c1 = player.prices[i];
  e5.innerHTML = 'Buy a ' + TIERS[i] + ' (cost: ' +
  processPhrase(c1, 2, TIERS[i - 1], PLURAL_TIERS[i - 1]) + ')';
  let e6 = document.getElementById('buyMax' + i);
  e6.innerHTML = 'Buy max ' + PLURAL_TIERS[i];
  if (c1.lte(getAmount(i - 1).plus(1e-6))) {
    e5.className = 'availablebtn';
    e6.className = 'availablebtn';
  } else {
    e5.className = 'unavailablebtn';
    e6.className = 'unavailablebtn';
  }
  let e7 = document.getElementById('doublings' + i);
  e7.innerHTML = title(TIERS[i]) + ' multiplier doublings bought: ' +
  get(player.doubleBought, i, 0);
  let e8 = document.getElementById('buyOneDoubling' + i);
  let c2 = player.doublePrices[i];
  e8.innerHTML = 'Buy a ' + TIERS[i] + ' doubling (cost: ' +
  processPhrase(c2, 2, 'zero') + ')';
  let e9 = document.getElementById('buyMaxDoubling' + i);
  e9.innerHTML = 'Buy max ' + TIERS[i] + ' doublings';
  if (c2.lte(getZeros())) {
    e8.className = 'availablebtn';
    e9.className = 'availablebtn';
  } else {
    e8.className = 'unavailablebtn';
    e9.className = 'unavailablebtn';
  }
  let e10 = document.getElementById('boosts' + i);
  e10.innerHTML = title(TIERS[i]) + ' boosts done: ' +
  get(player.boosts, i, 0);
  let e11 = document.getElementById('doBoost' + i);
  let c3 = getNeededPerBoost() * (1 + get(player.boosts, i, 0));
  e11.innerHTML = 'Do a boost (requires ' + processPhrase(c3, 0, i) +
  ' bought)';
  if (canBoost(i)) {
    e11.className = 'availablebtn';
  } else {
    e11.className = 'unavailablebtn';
  }
}

let updateNumbersSection = function () {
  document.getElementById('0').innerHTML = 'You have ' +
  getZeros().toStr(2) + ' zeros. You are getting ' +
  getProdPerSecondOf(0).toStr(2) + ' zeros per second.';
  for (let i = 1; i <= 7; i++) {
    let firstrow = document.getElementById('firstrow' + i);
    let secondrow = document.getElementById('secondrow' + i);
    if (i > player.shifts + 1) {
      firstrow.style.display = 'none';
      secondrow.style.display = 'none';
    } else {
      firstrow.style.display = '';
      secondrow.style.display = '';
      updateNumbersRow(i);
    }
  }
  if (player.shifts < 6) {
    document.getElementById('shift').innerHTML = 'Shift (requires ' +
    player.neededPerShift[player.shifts] + ' ' +
    PLURAL_TIERS[player.shifts + 1] + ')';
  } else {
    document.getElementById('shift').innerHTML = 'Shift (maxed out)';
  }
  if (canShift()) {
    document.getElementById('shift').className = 'availablebtn';
  } else {
    document.getElementById('shift').className = 'unavailablebtn';
  }
}

let maxall = function () {
  for (let i = 1; i <= 7; i++) {
    buyMax(i);
  }
  for (let i = 1; i <= 7; i++) {
    buyMaxDoubling(i);
  }
}

let buyMaxDoublingsAll = function () {
  for (let i = 1; i <= 7; i++) {
    buyMaxDoubling(i);
  }
}

let baseBuyOne = function (i) {
  if (cannotDoStuff()) {
    return false;
  }
  if (i > player.shifts + 1) {
    return false;
  }
  if (player.prices[i].gt(getAmount(i - 1).plus(1e-6))) {
    return false;
  }
  player.amounts[i] = getAmount(i).plus(1);
  player.bought[i] = getBought(i) + 1;
  player.amounts[i - 1] = player.amounts[i - 1].minus(player.prices[i]).max(0);
  player.prices[i] = player.prices[i].times(player.priceMults[i]);
  return true;
}

let baseBuyOneDoubling = function (i) {
  if (cannotDoStuff()) {
    return false;
  }
  if (i > player.shifts + 1) {
    return false;
  }
  if (player.doublePrices[i].gt(getZeros())) {
    return false;
  }
  player.doubleBought[i] = get(player.doubleBought, i, 0) + 1;
  player.amounts[0] = player.amounts[0].minus(player.doublePrices[i]);
  player.doublePrices[i] = player.doublePrices[i].times(
    player.doublePriceMults[i]);
  return true;
}

let buyOne = function (i) {
  let res = baseBuyOne(i);
  if (res) {
    giveAchievement(player, achievements[0][i - 1].name);
    // greater since that's equivalent to at least before the purchase
    if (i === 1 && player.bought[i] > 2401) {
      giveAchievement(player, 'What\'s the point of doing that?');
    }
  }
}

let buyMax = function (i) {
  let res = true;
  let bought = -1;
  while (res) {
    bought++;
    res = baseBuyOne(i);
  }
  if (bought) {
    giveAchievement(player, achievements[0][i - 1].name);
    // greater since that's equivalent to at least before the purchase
    if (i === 1 && bought >= 343) {
      giveAchievement(player, 'All at once');
    }
  }
}

let buyOneDoubling = function (i) {
  // might add achivement or something here later
  baseBuyOneDoubling(i);
}

let buyMaxDoubling = function (i) {
  // might add achivement or something here later
  let res = true;
  let bought = -1;
  while (res) {
    bought++;
    res = baseBuyOneDoubling(i);
  }
}

let resetKeys = [
  'amounts', 'bought', 'prices', 'priceMults', 'doubleBought', 'doublePrices'];

let getNeededPerBoost = function () {
  if (player.currentChallenge === '') {
    return player.boostEasier.value;
  } else {
    return 343;
  }
}

let canBoost = function (i) {
  return getNeededPerBoost() * (1 + get(player.boosts, i, 0)) <=
    getBought(i);
}

let canShift = function (i) {
  return player.shifts < 6 && player.neededPerShift[player.shifts] <=
  getBought(player.shifts + 1);
}

let giveStartAchBonuses = function () {
  if (hasAchievement(player, 'Not quite eight')) {
    player.amounts[0] = getZeros().max(new Decimal(7));
  }
  if (hasAchievement(player, 'That\'s fast!')) {
    player.amounts[0] = getZeros().max(new Decimal(7).pow(3));
  }
  if (hasAchievement(player, 'That\'s faster!')) {
    player.amounts[0] = getZeros().max(new Decimal(7).pow(9));
  }
}

let resetMinor = function (extra) {
  let newPlayer = initPlayer();
  for (let i of resetKeys.concat(extra)) {
    player[i] = newPlayer[i];
  }
  giveStartAchBonuses();
  player.times.resetStart = Date.now();
}

let boost = function (i) {
  if (!canBoost(i)) {
    notify('Cannot boost!', 'red', 2);
    return false;
  }
  giveAchievement(player, 'You need a boost');
  if (i === 7) {
    giveAchievement(player, 'Why were boosts afraid of seven?');
  }
  player.boosts[i] = get(player.boosts, i, 0) + 1;
  resetMinor([]);
  return true;
}

let shift = function () {
  if (!canShift()) {
    notify('Cannot shift!', 'red', 2);
    return false;
  }
  giveAchievement(player, 'That sounds a bit shifty');
  player.shifts++;
  resetMinor(['boosts']);
  return true;
}

let goInfinite = function () {
  if (!overInfinity()) {
    notify('Cannot go infinite!', 'red', 2);
    return false;
  }
  let now = Date.now();
  let newIp = getInfinityPoints();
  giveAchievement(player, 'Not quite eight');
  let infTime = now - player.times.infStart;
  player.bestInfTime = Math.min(infTime, player.bestInfTime);
  if (infTime < 1800 * 1000) {
    giveAchievement(player, 'That\'s fast!');
  }
  if (infTime < 60 * 1000) {
    giveAchievement(player, 'That\'s faster!');
  }
  if (getAmount(7).eq(1)) {
    giveAchievement(player, 'One\'s even enough');
  }
  if (player.shifts <= 5 && totalBoosts() === 0) {
    giveAchievement(player, 'How did you do that?');
  }
  if (!player.gettingOver) {
    giveAchievement(player, 'We ain\'t ever getting over');
  }
  player.last10Inf.pop();
  player.last10Inf.unshift({
    'time': now - player.times.infStart, 'ip': newIp,
    'ipPerMinute': newIp.div(now - player.times.infStart).times(60 * 1000)
  });
  player.times.infStart = now;
  player.infinities++;
  player.gettingOver = false;
  if (player.infinities >= 10) {
    giveAchievement(player, 'That\'s a lot of infinities')
  }
  addIP(newIp);
  resetMinor(['boosts']);
  player.currentChallenge = '';
  player.shifts = getStartingShifts();
  return true;
}

let getStartingShifts = function () {
  if (player.currentChallenge === '') {
    return player.shiftEasier.value;
  } else {
    return 0;
  }
}

let getConfirmation = function (chall) {
  if (chall === '') {
    return confirm(
      'You will lose all your progress in this challenge. ' +
      'Are you sure you want to exit it?');
  } else {
    return confirm(
      'You will lose all your progress in your current infinity. ' +
      'You will start a new infinity with special conditions ' +
      'that generally will make the game harder. ' +
      'The bottom two rows of infinity upgrades will not apply. ' +
      'Are you sure you want to start this challenge?');
  }
}

let enterChallenge = function (chall) {
  if (!getConfirmation(chall)) {
    return false;
  }
  player.currentChallenge = chall;
  player.times.infStart = Date.now();
  player.gettingOver = false;
  resetMinor(['boosts']);
  player.shifts = getStartingShifts();
  return true;
}

let setNumberOnclick = function () {
  document.getElementById('0btn').onclick = click;
  document.getElementById('maxall').onclick = maxall;
  document.getElementById('maxdoublingsall').onclick = buyMaxDoublingsAll;
  for (let i = 1; i <= 7; i++) {
    document.getElementById('buyOne' + i).onclick = function () {
      buyOne(i);
    }
    document.getElementById('buyMax' + i).onclick = function () {
      buyMax(i);
    }
    document.getElementById('buyOneDoubling' + i).onclick = function () {
      buyOneDoubling(i);
    }
    document.getElementById('buyMaxDoubling' + i).onclick = function () {
      buyMaxDoubling(i);
    }
    document.getElementById('doBoost' + i).onclick = function () {
      boost(i);
    }
  }
  document.getElementById('shift').onclick = shift;
}

let setOtherOnclick = function () {
  document.getElementById('goinfinite').onclick = goInfinite;
}

let addIP = function (x) {
  player.infinityPoints = player.infinityPoints.plus(x);
}

let getBestLast10IP = function () {
  return player.last10Inf.map(function (x) {
    return x.ipPerMinute;
  }).reduce(function (a, b) {
    return a.max(b);
  });
}

let giveIP = function (diff) {
  if (player.currentChallenge === '') {
    addIP(getBestLast10IP().times(player.ipEasier.value).times(
      diff).div(60 * 1000));
  }
}

let setup = function () {
  load(localStorage.getItem('save'), false);
  let tabbtns = document.getElementsByClassName('tabbtn');
  for (let i of tabbtns) {
    let name = i.innerHTML.toLowerCase().replace(/^\s+|\s+$/g, '');
    i.onclick = function () {
      showTab(name);
    }
  }
  populateAchievements(player);
  populateShop(player, infinityShop);
  setOptionsOnclick();
  setupNumbersSection();
  updateNumbersSection();
  setNumberOnclick();
  setOtherOnclick();
  setInterval(tick, 100);
  setInterval(save, 10000);
}

let player = initPlayer();

window.addEventListener('keydown', function(event) {
  if (document.activeElement.type === "text") {
    return false;
  }
  let tmp = event.keyCode;
  if (tmp >= 49 && tmp <= 55) {
      buyMax(tmp - 48);
      return false;
  }
  switch (tmp) {
    case 67: // C
    click();
    break;
    case 68: // D
    buyMaxDoublingsAll();
    break;
    case 73: // I
    goInfinite();
    break;
    case 77: // M
    maxall();
    break;
    case 83: // S
    shift();
    break;
  }
});

window.onload = function () {
  setup();
}
