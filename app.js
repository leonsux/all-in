// app.js (完整版)
/* ============================================================
   Van's Deep Dark Fantasy♂ 德州扑克顾问 — 纯前端 JS 引擎
   ============================================================ */

// ============================================================
// 第一部分：扑克核心引擎
// ============================================================

const SUITS = ['s', 'h', 'd', 'c'];
const SUIT_SYMBOLS = { s: '♠', h: '♥', d: '♦', c: '♣' };
const SUIT_NAMES = { s: '黑桃', h: '红心', d: '方块', c: '梅花' };

const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const RANK_NAMES = {
    2:'2', 3:'3', 4:'4', 5:'5', 6:'6', 7:'7', 8:'8',
    9:'9', 10:'T', 11:'J', 12:'Q', 13:'K', 14:'A'
};
const RANK_FROM_CHAR = {};
for (const [k, v] of Object.entries(RANK_NAMES)) {
    RANK_FROM_CHAR[v] = parseInt(k);
}

const HandRank = {
    HIGH_CARD: 0, ONE_PAIR: 1, TWO_PAIR: 2, THREE_OF_A_KIND: 3,
    STRAIGHT: 4, FLUSH: 5, FULL_HOUSE: 6, FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8, ROYAL_FLUSH: 9,
};

const HAND_RANK_NAMES = {
    0: '高牌', 1: '一对', 2: '两对', 3: '三条',
    4: '顺子', 5: '同花', 6: '葫芦', 7: '四条',
    8: '同花顺', 9: '皇家同花顺',
};

function makeCard(rank, suit) {
    return { rank, suit };
}

function cardToStr(card) {
    return `${RANK_NAMES[card.rank]}${SUIT_SYMBOLS[card.suit]}`;
}

function cardId(card) {
    return `${RANK_NAMES[card.rank]}${card.suit}`;
}

function makeDeck(exclude) {
    const exSet = new Set(exclude.map(c => cardId(c)));
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            const c = makeCard(rank, suit);
            if (!exSet.has(cardId(c))) deck.push(c);
        }
    }
    return deck;
}

function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

// ============================================================
// 手牌评估器
// ============================================================

function evaluateFive(cards) {
    const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
    const suits = cards.map(c => c.suit);
    const countMap = {};
    for (const r of ranks) countMap[r] = (countMap[r] || 0) + 1;

    const isFlush = new Set(suits).size === 1;

    const unique = [...new Set(ranks)].sort((a, b) => b - a);
    let isStraight = false;
    let straightHigh = 0;

    if (unique.length === 5) {
        if (unique[0] - unique[4] === 4) {
            isStraight = true;
            straightHigh = unique[0];
        }
        if (unique[0] === 14 && unique[1] === 5 && unique[2] === 4 &&
            unique[3] === 3 && unique[4] === 2) {
            isStraight = true;
            straightHigh = 5;
        }
    }

    const groups = Object.entries(countMap)
        .map(([r, c]) => [parseInt(r), c])
        .sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const counts = groups.map(g => g[1]);

    if (isStraight && isFlush) {
        if (straightHigh === 14 && Math.min(...ranks) === 10)
            return [HandRank.ROYAL_FLUSH, [14]];
        return [HandRank.STRAIGHT_FLUSH, [straightHigh]];
    }
    if (counts[0] === 4 && counts[1] === 1)
        return [HandRank.FOUR_OF_A_KIND, [groups[0][0], groups[1][0]]];
    if (counts[0] === 3 && counts[1] === 2)
        return [HandRank.FULL_HOUSE, [groups[0][0], groups[1][0]]];
    if (isFlush)
        return [HandRank.FLUSH, ranks];
    if (isStraight)
        return [HandRank.STRAIGHT, [straightHigh]];
    if (counts[0] === 3 && counts.length === 3) {
        const kickers = groups.slice(1).map(g => g[0]).sort((a, b) => b - a);
        return [HandRank.THREE_OF_A_KIND, [groups[0][0], ...kickers]];
    }
    if (counts[0] === 2 && counts[1] === 2) {
        const pairs = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
        return [HandRank.TWO_PAIR, [...pairs, groups[2][0]]];
    }
    if (counts[0] === 2) {
        const kickers = groups.slice(1).map(g => g[0]).sort((a, b) => b - a);
        return [HandRank.ONE_PAIR, [groups[0][0], ...kickers]];
    }
    return [HandRank.HIGH_CARD, ranks];
}

/**
 * 生成 C(n, k) 组合
 */
function combinations(arr, k) {
    if (k === 0) return [[]];
    if (arr.length < k) return [];
    const result = [];
    function helper(start, combo) {
        if (combo.length === k) { result.push([...combo]); return; }
        for (let i = start; i <= arr.length - (k - combo.length); i++) {
            combo.push(arr[i]);
            helper(i + 1, combo);
            combo.pop();
        }
    }
    helper(0, []);
    return result;
}

function compareEval(a, b) {
    if (a[0] !== b[0]) return a[0] - b[0];
    for (let i = 0; i < Math.min(a[1].length, b[1].length); i++) {
        if (a[1][i] !== b[1][i]) return a[1][i] - b[1][i];
    }
    return 0;
}

function evaluateBest(cards) {
    if (cards.length < 5) return null;
    let best = null;
    for (const combo of combinations(cards, 5)) {
        const ev = evaluateFive(combo);
        if (!best || compareEval(ev, best) > 0) best = ev;
    }
    return best;
}

// ============================================================
// 第二部分：蒙特卡洛模拟
// ============================================================

function monteCarloEquity(myHand, community, numOpponents, numSimulations, progressCb) {
    let wins = 0, ties = 0, losses = 0;
    const handDist = {};
    const known = [...myHand, ...community];
    const neededComm = 5 - community.length;

    const batchSize = 500;

    return new Promise((resolve) => {
        let done = 0;

        function runBatch() {
            const end = Math.min(done + batchSize, numSimulations);

            for (let i = done; i < end; i++) {
                const deck = makeDeck(known);
                shuffleDeck(deck);
                let idx = 0;

                const simComm = [...community];
                for (let j = 0; j < neededComm; j++) simComm.push(deck[idx++]);

                const oppHands = [];
                for (let o = 0; o < numOpponents; o++) {
                    oppHands.push([deck[idx++], deck[idx++]]);
                }

                const myEval = evaluateBest([...myHand, ...simComm]);
                const myRank = myEval[0];
                handDist[myRank] = (handDist[myRank] || 0) + 1;

                let bestOpp = null;
                for (const oh of oppHands) {
                    const oppEval = evaluateBest([...oh, ...simComm]);
                    if (!bestOpp || compareEval(oppEval, bestOpp) > 0)
                        bestOpp = oppEval;
                }

                const cmp = compareEval(myEval, bestOpp);
                if (cmp > 0) wins++;
                else if (cmp === 0) ties++;
                else losses++;
            }

            done = end;
            if (progressCb) progressCb(done / numSimulations);

            if (done < numSimulations) {
                // 让出主线程，避免 UI 冻结
                setTimeout(runBatch, 0);
            } else {
                resolve({
                    winRate: wins / numSimulations,
                    tieRate: ties / numSimulations,
                    loseRate: losses / numSimulations,
                    simulations: numSimulations,
                    handDistribution: handDist,
                });
            }
        }

        runBatch();
    });
}

// ============================================================
// 第三部分：补牌计算
// ============================================================

function calculateOuts(myHand, community) {
    const known = new Set([...myHand, ...community].map(c => cardId(c)));
    const remaining = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            const c = makeCard(rank, suit);
            if (!known.has(cardId(c))) remaining.push(c);
        }
    }

    const currentEval = evaluateBest([...myHand, ...community]);
    const currentRank = currentEval[0];

    // 对每种更高牌型计算 outs
    const outsMap = {};
    for (let targetRank = currentRank + 1; targetRank <= 9; targetRank++) {
        const outs = [];
        for (const card of remaining) {
            const newEval = evaluateBest([...myHand, ...community, card]);
            if (newEval[0] >= targetRank) outs.push(card);
        }
        if (outs.length > 0) {
            outsMap[targetRank] = {
                outs: outs.length,
                cards: outs,
                probability: outs.length / remaining.length,
            };
        }
    }

    return {
        currentRank,
        remainingCards: remaining.length,
        outsMap,
    };
}

// ============================================================
// 第四部分：翻牌前起手牌分级
// ============================================================

function classifyPreflop(card1, card2) {
    const r1 = Math.max(card1.rank, card2.rank);
    const r2 = Math.min(card1.rank, card2.rank);
    const suited = card1.suit === card2.suit;
    const pair = r1 === r2;

    const nameMap = { 14:'A', 13:'K', 12:'Q', 11:'J', 10:'T' };
    const r1n = nameMap[r1] || String(r1);
    const r2n = nameMap[r2] || String(r2);

    let handName;
    if (pair) handName = `${r1n}${r2n}`;
    else handName = `${r1n}${r2n}${suited ? 's' : 'o'}`;

    const tier1 = new Set(['AA','KK','QQ','AKs']);
    const tier2 = new Set(['JJ','TT','AKo','AQs','AQo','AJs']);
    const tier3 = new Set(['99','88','77','ATs','ATo','KQs','KQo','KJs','QJs','JTs','A9s','A8s']);
    const tier4 = new Set([
        '66','55','44','33','22','KTs','QTs','J9s','T9s','98s','87s','76s','65s',
        'A7s','A6s','A5s','A4s','A3s','A2s','K9s','Q9s'
    ]);

    let tier = 5;
    if (tier1.has(handName)) tier = 1;
    else if (tier2.has(handName)) tier = 2;
    else if (tier3.has(handName)) tier = 3;
    else if (tier4.has(handName)) tier = 4;

    const tierInfo = {
        1: { name: '🔥 怪兽牌 (Tier 1)', advice: '任何位置都应该加注！这是最强的起手牌。', color: 'tier-1' },
        2: { name: '💎 优质牌 (Tier 2)', advice: '大多数位置应该加注入池，面对3-bet可以4-bet或跟注。', color: 'tier-2' },
        3: { name: '👍 可玩牌 (Tier 3)', advice: '中后位可以加注入池，前位谨慎考虑。', color: 'tier-3' },
        4: { name: '🎲 投机牌 (Tier 4)', advice: '后位或多人底池时便宜看翻牌，前位建议弃牌。', color: 'tier-4' },
        5: { name: '🗑️ 垃圾牌 (Tier 5)', advice: '除非免费看牌，否则建议弃牌。', color: 'tier-5' },
    };

    return {
        handName, tier, suited, pair,
        highCard: r1, lowCard: r2, gap: r1 - r2,
        ...tierInfo[tier],
    };
}

// ============================================================
// 第五部分：决策引擎
// ============================================================

function calculatePotOdds(potSize, callAmount) {
    if (callAmount <= 0) return { odds: 0, pct: 0, ratio: '∞:1' };
    const totalPot = potSize + callAmount;
    const odds = callAmount / totalPot;
    const ratio = potSize / callAmount;
    return { odds, pct: odds * 100, ratio: `${ratio.toFixed(1)}:1` };
}

function makeDecision(equity, potSize, callAmount, position, preflopInfo) {
    const effectiveEquity = equity.winRate + equity.tieRate * 0.5;
    const potOdds = calculatePotOdds(potSize, callAmount);
    const requiredEquity = potOdds.odds;

    const posBonus = { LP: 0.05, MP: 0, EP: -0.03, BB: -0.02 }[position] || 0;
    const adjusted = effectiveEquity + posBonus;
    const edge = adjusted - requiredEquity;

    let action, confidence, reason;

    if (callAmount === 0) {
        if (adjusted > 0.55) {
            action = 'raise'; confidence = '高';
            reason = '胜率较高，应主动加注争取价值';
        } else {
            action = 'call'; confidence = '中';
            reason = '免费看牌，何乐而不为';
        }
    } else if (edge > 0.25) {
        action = 'raise'; confidence = '高';
        reason = `胜率 (${(effectiveEquity*100).toFixed(1)}%) 远超底池赔率要求 (${(requiredEquity*100).toFixed(1)}%)，加注榨取价值！`;
    } else if (edge > 0.10) {
        action = 'raise'; confidence = '中高';
        reason = `胜率有明显优势，倾向加注`;
    } else if (edge > 0) {
        action = 'call'; confidence = '中';
        reason = `胜率 (${(effectiveEquity*100).toFixed(1)}%) 略高于要求 (${(requiredEquity*100).toFixed(1)}%)，跟注有利`;
    } else if (edge > -0.10) {
        action = 'call'; confidence = '低';
        reason = `胜率接近临界值，跟注勉强可以，但要警惕`;
    } else {
        action = 'fold'; confidence = '高';
        reason = `胜率 (${(effectiveEquity*100).toFixed(1)}%) 明显低于要求 (${(requiredEquity*100).toFixed(1)}%)，长期弃牌更明智`;
    }

    // 翻牌前覆盖
    if (preflopInfo) {
        if (preflopInfo.tier === 1) {
            action = 'raise'; confidence = '极高';
            reason = `怪兽级起手牌 ${preflopInfo.handName}！必须加注！`;
        } else if (preflopInfo.tier === 5 && callAmount > 0) {
            action = 'fold'; confidence = '高';
            reason = `起手牌 ${preflopInfo.handName} 太弱，省下筹码等好牌`;
        }
    }

    return {
        action, confidence, reason,
        effectiveEquity, requiredEquity, edge,
        potOdds,
    };
}

// ============================================================
// 第六部分：UI 交互逻辑
// ============================================================

// ---- 全局状态 ----
const state = {
    myHand: [null, null],        // 手牌 2 张
    community: [null, null, null, null, null], // 公共牌 5 张
    usedCards: new Set(),        // 已选的牌
    isRunning: false,
};

// ---- 初始化牌面选择器 ----
function initCardPicker() {
    const grid = document.getElementById('card-grid');
    grid.innerHTML = '';

    // 按花色分行：♠ ♥ ♦ ♣，每行13张 A-2
    const displayOrder = [14,13,12,11,10,9,8,7,6,5,4,3,2];

    for (const suit of SUITS) {
        for (const rank of displayOrder) {
            const card = makeCard(rank, suit);
            const id = cardId(card);
            const btn = document.createElement('button');
            btn.className = `card-btn suit-${suit}`;
            btn.dataset.cardId = id;
            btn.dataset.rank = rank;
            btn.dataset.suit = suit;
            btn.innerHTML = `${RANK_NAMES[rank]}<span>${SUIT_SYMBOLS[suit]}</span>`;
            btn.addEventListener('click', () => onPickCard(rank, suit));
            grid.appendChild(btn);
        }
    }
}

// ---- 找到下一个空 slot ----
function getNextEmptySlot() {
    for (let i = 0; i < 2; i++) {
        if (!state.myHand[i]) return { type: 'hand', index: i };
    }
    for (let i = 0; i < 5; i++) {
        if (!state.community[i]) return { type: 'comm', index: i };
    }
    return null;
}

// ---- 选牌 ----
function onPickCard(rank, suit) {
    const card = makeCard(rank, suit);
    const id = cardId(card);

    if (state.usedCards.has(id)) return; // 已选过

    const slot = getNextEmptySlot();
    if (!slot) return; // 满了

    if (slot.type === 'hand') {
        state.myHand[slot.index] = card;
    } else {
        state.community[slot.index] = card;
    }
    state.usedCards.add(id);

    refreshUI();
}

// ---- 从 slot 移除牌 ----
function onRemoveCard(type, index) {
    let card;
    if (type === 'hand') {
        card = state.myHand[index];
        state.myHand[index] = null;
    } else {
        card = state.community[index];
        state.community[index] = null;

        // 公共牌移除后，后面的牌前移填补空位
        compactCommunity();
    }

    if (card) {
        state.usedCards.delete(cardId(card));
    }
    refreshUI();
}

function compactCommunity() {
    const filled = state.community.filter(c => c !== null);
    for (let i = 0; i < 5; i++) {
        state.community[i] = filled[i] || null;
    }
}

// ---- 全部清除 ----
function clearAll() {
    state.myHand = [null, null];
    state.community = [null, null, null, null, null];
    state.usedCards.clear();
    document.getElementById('results-section').style.display = 'none';
    refreshUI();
}

// ---- 刷新 UI ----
function refreshUI() {
    // 更新手牌 slot
    for (let i = 0; i < 2; i++) {
        const slotEl = document.querySelector(`[data-slot="hand-${i}"]`);
        const card = state.myHand[i];
        if (card) {
            slotEl.textContent = cardToStr(card);
            slotEl.className = `card-slot filled suit-${card.suit}`;
            slotEl.onclick = () => onRemoveCard('hand', i);
        } else {
            slotEl.textContent = '?';
            slotEl.className = 'card-slot empty';
            slotEl.onclick = null;
        }
    }

    // 更新公共牌 slot
    for (let i = 0; i < 5; i++) {
        const slotEl = document.querySelector(`[data-slot="comm-${i}"]`);
        const card = state.community[i];
        if (card) {
            slotEl.textContent = cardToStr(card);
            slotEl.className = `card-slot filled suit-${card.suit}`;
            slotEl.onclick = () => onRemoveCard('comm', i);
        } else {
            slotEl.textContent = '?';
            slotEl.className = 'card-slot empty';
            slotEl.onclick = null;
        }
    }

    // 更新牌面选择器（已选牌灰显）
    document.querySelectorAll('.card-btn').forEach(btn => {
        const id = btn.dataset.cardId;
        if (state.usedCards.has(id)) {
            btn.classList.add('disabled');
        } else {
            btn.classList.remove('disabled');
        }
    });
}

// ---- 参数调整 ----
function adjustParam(id, delta) {
    const input = document.getElementById(id);
    let val = parseInt(input.value) + delta;
    val = Math.max(parseInt(input.min) || 0, Math.min(parseInt(input.max) || 99, val));
    input.value = val;
}

// ---- 获取当前有效牌 ----
function getMyHand() {
    return state.myHand.filter(c => c !== null);
}

function getCommunity() {
    return state.community.filter(c => c !== null);
}

// ---- 进度条 ----
function showProgress() {
    const bar = document.getElementById('progress-bar');
    bar.style.display = 'block';
    updateProgress(0, '准备中...');
}

function updateProgress(pct, text) {
    document.getElementById('progress-fill').style.width = `${pct * 100}%`;
    document.getElementById('progress-text').textContent = text || `模拟中... ${(pct * 100).toFixed(0)}%`;
}

function hideProgress() {
    document.getElementById('progress-bar').style.display = 'none';
}

function setRunning(running) {
    state.isRunning = running;
    const btns = document.querySelectorAll('.action-buttons .btn');
    btns.forEach(b => b.disabled = running);
}

// ============================================================
// 第七部分：分析功能
// ============================================================

async function runAnalysis() {
    const myHand = getMyHand();
    const community = getCommunity();

    if (myHand.length < 2) {
        alert('请至少选择2张手牌！');
        return;
    }
    if (state.isRunning) return;

    setRunning(true);
    showProgress();

    const numOpp = parseInt(document.getElementById('num-opponents').value) || 1;
    const potSize = parseFloat(document.getElementById('pot-size').value) || 0;
    const callAmount = parseFloat(document.getElementById('call-amount').value) || 0;
    const position = document.getElementById('position').value;
    const simulations = parseInt(document.getElementById('simulations').value) || 15000;

    try {
        // 翻牌前分级
        const preflopInfo = community.length === 0 ? classifyPreflop(myHand[0], myHand[1]) : null;

        // 胜率模拟
        const equity = await monteCarloEquity(myHand, community, numOpp, simulations, (pct) => {
            updateProgress(pct, `蒙特卡洛模拟中... ${(pct * 100).toFixed(0)}%`);
        });

        // 决策
        const decision = makeDecision(equity, potSize, callAmount, position, preflopInfo);

        // 补牌（翻牌/转牌阶段）
        let outsInfo = null;
        if (community.length >= 3 && community.length <= 4) {
            outsInfo = calculateOuts(myHand, community);
        }

        // 渲染结果
        renderFullResults(myHand, community, equity, decision, preflopInfo, outsInfo);

    } catch (e) {
        alert('分析出错: ' + e.message);
        console.error(e);
    }

    hideProgress();
    setRunning(false);
}

async function runEquity() {
    const myHand = getMyHand();
    const community = getCommunity();
    if (myHand.length < 2) { alert('请至少选择2张手牌！'); return; }
    if (state.isRunning) return;

    setRunning(true);
    showProgress();

    const numOpp = parseInt(document.getElementById('num-opponents').value) || 1;
    const simulations = parseInt(document.getElementById('simulations').value) || 15000;

    try {
        const equity = await monteCarloEquity(myHand, community, numOpp, simulations, (pct) => {
            updateProgress(pct, `模拟中... ${(pct * 100).toFixed(0)}%`);
        });
        renderEquityResult(myHand, community, equity);
    } catch (e) {
        alert('计算出错: ' + e.message);
    }

    hideProgress();
    setRunning(false);
}

function runOuts() {
    const myHand = getMyHand();
    const community = getCommunity();
    if (myHand.length < 2) { alert('请至少选择2张手牌！'); return; }
    if (community.length < 3) { alert('补牌计算需要至少3张公共牌（翻牌阶段）！'); return; }
    if (community.length > 4) { alert('河牌阶段无需计算补牌'); return; }

    const outsInfo = calculateOuts(myHand, community);
    renderOutsResult(myHand, community, outsInfo);
}

function runPreflop() {
    const myHand = getMyHand();
    if (myHand.length < 2) { alert('请选择2张手牌！'); return; }

    const info = classifyPreflop(myHand[0], myHand[1]);
    renderPreflopResult(myHand, info);
}

// ============================================================
// 第八部分：结果渲染
// ============================================================

function showResults(html) {
    const section = document.getElementById('results-section');
    const container = document.getElementById('results-container');
    container.innerHTML = html;
    section.style.display = 'block';
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCardBadges(cards) {
    return cards.map(c => {
        const cls = (c.suit === 'h' || c.suit === 'd') ? 'suit-h' : '';
        return `<span class="out-card ${cls}">${cardToStr(c)}</span>`;
    }).join('');
}

function renderEquityBars(equity) {
    const w = (equity.winRate * 100).toFixed(1);
    const t = (equity.tieRate * 100).toFixed(1);
    const l = (equity.loseRate * 100).toFixed(1);
    return `
        <div class="equity-bars">
            <div class="equity-bar-row">
                <span class="equity-bar-label">✅ 胜</span>
                <div class="equity-bar-track">
                    <div class="equity-bar-fill win" style="width:${w}%">${w > 8 ? w + '%' : ''}</div>
                </div>
                <span class="equity-bar-value" style="color:var(--accent-green)">${w}%</span>
            </div>
            <div class="equity-bar-row">
                <span class="equity-bar-label">🤝 平</span>
                <div class="equity-bar-track">
                    <div class="equity-bar-fill tie" style="width:${Math.max(t, 0.5)}%">${t > 8 ? t + '%' : ''}</div>
                </div>
                <span class="equity-bar-value" style="color:var(--accent-orange)">${t}%</span>
            </div>
            <div class="equity-bar-row">
                <span class="equity-bar-label">❌ 负</span>
                <div class="equity-bar-track">
                    <div class="equity-bar-fill lose" style="width:${l}%">${l > 8 ? l + '%' : ''}</div>
                </div>
                <span class="equity-bar-value" style="color:var(--accent-red)">${l}%</span>
            </div>
        </div>
    `;
}

function renderHandDistribution(dist, total) {
    const entries = Object.entries(dist)
        .map(([r, c]) => [parseInt(r), c])
        .sort((a, b) => b[0] - a[0]);

    if (entries.length === 0) return '';

    let html = '<div class="result-card"><h3>📈 成牌概率分布</h3>';
    for (const [rank, count] of entries) {
        const pct = (count / total * 100).toFixed(1);
        const width = Math.max(count / total * 100, 0.5);
        html += `
            <div class="hand-dist-bar">
                <span class="hand-dist-name">${HAND_RANK_NAMES[rank]}</span>
                <div class="hand-dist-track">
                    <div class="hand-dist-fill" style="width:${width}%"></div>
                </div>
                <span class="hand-dist-pct">${pct}%</span>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

function renderFullResults(myHand, community, equity, decision, preflopInfo, outsInfo) {
    let html = '';

    // ---- 行动建议（最醒目） ----
    const actionMap = {
        fold:  { text: '🏳️ 弃牌 (Fold)',       cls: 'action-fold' },
        call:  { text: '✋ 跟注/过牌 (Call)',    cls: 'action-call' },
        raise: { text: '⬆️ 加注 (Raise)',        cls: 'action-raise' },
        allin: { text: '🔥 全押 (All-In)',       cls: 'action-allin' },
    };
    const act = actionMap[decision.action] || actionMap.call;

    html += `
        <div class="result-card" style="text-align:center;">
            <h3>🎯 建议行动</h3>
            <div class="action-badge ${act.cls}">${act.text}</div>
            <div class="reason-text">
                <strong>📊 置信度: ${decision.confidence}</strong><br>
                💬 ${decision.reason}
            </div>
        </div>
    `;

    // ---- 翻牌前信息 ----
    if (preflopInfo) {
        html += `
            <div class="result-card">
                <h3>🏷️ 起手牌分级</h3>
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                    <span style="font-size:1.3rem;font-weight:700;">${preflopInfo.handName}</span>
                    <span class="preflop-tier t${preflopInfo.tier}">${preflopInfo.name}</span>
                </div>
                <p style="margin-top:8px;color:var(--text-secondary);font-size:0.9rem;">
                    ${preflopInfo.advice}
                </p>
                <div style="margin-top:10px;display:flex;gap:20px;font-size:0.85rem;color:var(--text-muted);">
                    <span>同花: ${preflopInfo.suited ? '✅' : '❌'}</span>
                    <span>对子: ${preflopInfo.pair ? '✅' : '❌'}</span>
                    <span>间隔: ${preflopInfo.gap}</span>
                </div>
            </div>
        `;
    }

    // ---- 胜率 ----
    html += `
        <div class="result-card">
            <h3>📊 胜率分析 (${equity.simulations.toLocaleString()} 次模拟)</h3>
            ${renderEquityBars(equity)}
    `;

    // 当前牌力
    if (community.length >= 3) {
        const ev = evaluateBest([...myHand, ...community]);
        if (ev) {
            html += `<div class="stat-row" style="margin-top:10px;">
                <span class="stat-label">💪 当前牌力</span>
                <span class="stat-value">${HAND_RANK_NAMES[ev[0]]}</span>
            </div>`;
        }
    }

    html += '</div>';

    // ---- 底池赔率分析 ----
    const potSize = parseFloat(document.getElementById('pot-size').value) || 0;
    const callAmount = parseFloat(document.getElementById('call-amount').value) || 0;

    html += `
        <div class="result-card">
            <h3>💰 底池赔率分析</h3>
            <div class="stat-row">
                <span class="stat-label">底池大小</span>
                <span class="stat-value">${potSize}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">跟注金额</span>
                <span class="stat-value">${callAmount}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">底池赔率</span>
                <span class="stat-value">${decision.potOdds.ratio} (${decision.potOdds.pct.toFixed(1)}%)</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">需要胜率 ≥</span>
                <span class="stat-value">${(decision.requiredEquity * 100).toFixed(1)}%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">你的有效胜率</span>
                <span class="stat-value ${decision.effectiveEquity > decision.requiredEquity ? 'positive' : 'negative'}">
                    ${(decision.effectiveEquity * 100).toFixed(1)}%
                </span>
            </div>
            <div class="stat-row">
                <span class="stat-label">边际优势</span>
                <span class="stat-value ${decision.edge > 0.1 ? 'positive' : decision.edge > 0 ? 'neutral' : 'negative'}">
                    ${decision.edge > 0 ? '+' : ''}${(decision.edge * 100).toFixed(1)}%
                </span>
            </div>
        </div>
    `;

    // ---- 成牌分布 ----
    html += renderHandDistribution(equity.handDistribution, equity.simulations);

    // ---- 补牌信息 ----
    if (outsInfo) {
        html += renderOutsCard(outsInfo, community.length);
    }

    showResults(html);
}

function renderEquityResult(myHand, community, equity) {
    let html = `
        <div class="result-card">
            <h3>📊 胜率分析 (${equity.simulations.toLocaleString()} 次蒙特卡洛模拟)</h3>
            <div style="margin-bottom:10px; font-size:0.88rem; color:var(--text-secondary);">
                手牌: ${renderCardBadges(myHand)} &nbsp;|&nbsp;
                公共: ${community.length > 0 ? renderCardBadges(community) : '<span style="color:var(--text-muted)">翻牌前</span>'}
            </div>
            ${renderEquityBars(equity)}
    `;

    // 当前牌力
    if (community.length >= 3) {
        const ev = evaluateBest([...myHand, ...community]);
        if (ev) {
            html += `
                <div class="stat-row" style="margin-top:10px;">
                    <span class="stat-label">💪 当前牌力</span>
                    <span class="stat-value">${HAND_RANK_NAMES[ev[0]]}</span>
                </div>
            `;
        }
    }

    html += '</div>';
    html += renderHandDistribution(equity.handDistribution, equity.simulations);
    showResults(html);
}

function renderOutsCard(outsInfo, communityLen) {
    const entries = Object.entries(outsInfo.outsMap)
        .map(([rank, info]) => [parseInt(rank), info])
        .sort((a, b) => a[0] - b[0]);

    if (entries.length === 0) {
        return `
            <div class="result-card">
                <h3>🔢 补牌分析</h3>
                <p style="color:var(--text-muted);">当前牌力已经很强，没有明显的补牌需求 💪</p>
            </div>
        `;
    }

    let html = `
        <div class="result-card">
            <h3>🔢 补牌分析 (Outs)</h3>
            <div class="stat-row">
                <span class="stat-label">当前牌力</span>
                <span class="stat-value">${HAND_RANK_NAMES[outsInfo.currentRank]}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">剩余未知牌</span>
                <span class="stat-value">${outsInfo.remainingCards} 张</span>
            </div>
            <div style="margin-top:14px;">
    `;

    for (const [rank, info] of entries) {
        const pctNext = (info.probability * 100).toFixed(1);

        // 速算法提示
        let approxTip = '';
        if (communityLen === 3) {
            approxTip = `速算: ${info.outs}×4 ≈ ${info.outs * 4}% (到河牌)`;
        } else if (communityLen === 4) {
            approxTip = `速算: ${info.outs}×2 ≈ ${info.outs * 2}% (下一张)`;
        }

        html += `
            <div style="background:var(--bg-input);border-radius:var(--radius);padding:12px;margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px;">
                    <span style="font-weight:700;color:var(--accent-blue);">
                        🎯 → ${HAND_RANK_NAMES[rank]}
                    </span>
                    <span style="font-size:0.85rem;">
                        <strong>${info.outs}</strong> outs &nbsp;|&nbsp;
                        概率 <strong style="color:var(--accent-green);">${pctNext}%</strong>
                    </span>
                </div>
                ${approxTip ? `<div style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">💡 ${approxTip}</div>` : ''}
                <div class="outs-grid" style="margin-top:8px;">
                    ${info.cards.slice(0, 20).map(c => {
                        const cls = (c.suit === 'h' || c.suit === 'd') ? 'suit-h' : '';
                        return `<span class="out-card ${cls}">${cardToStr(c)}</span>`;
                    }).join('')}
                    ${info.cards.length > 20 ? `<span class="out-card" style="color:var(--text-muted);">+${info.cards.length - 20}张</span>` : ''}
                </div>
            </div>
        `;
    }

    html += '</div></div>';
    return html;
}

function renderOutsResult(myHand, community, outsInfo) {
    let html = `
        <div style="margin-bottom:12px;font-size:0.88rem;color:var(--text-secondary);">
            手牌: ${renderCardBadges(myHand)} &nbsp;|&nbsp;
            公共: ${renderCardBadges(community)}
        </div>
    `;
    html += renderOutsCard(outsInfo, community.length);
    showResults(html);
}

function renderPreflopResult(myHand, info) {
    const html = `
        <div class="result-card">
            <h3>🏷️ 翻牌前起手牌分析</h3>
            <div style="margin-bottom:12px;">
                手牌: ${renderCardBadges(myHand)}
            </div>
            <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:14px;">
                <span style="font-size:1.6rem;font-weight:800;">${info.handName}</span>
                <span class="preflop-tier t${info.tier}">${info.name}</span>
            </div>
            <div class="reason-text">
                💡 ${info.advice}
            </div>
            <div style="margin-top:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;">
                <div class="stat-row" style="border:none;flex-direction:column;align-items:flex-start;">
                    <span class="stat-label">高牌</span>
                    <span class="stat-value">${RANK_NAMES[info.highCard]} (${info.highCard})</span>
                </div>
                <div class="stat-row" style="border:none;flex-direction:column;align-items:flex-start;">
                    <span class="stat-label">低牌</span>
                    <span class="stat-value">${RANK_NAMES[info.lowCard]} (${info.lowCard})</span>
                </div>
                <div class="stat-row" style="border:none;flex-direction:column;align-items:flex-start;">
                    <span class="stat-label">同花</span>
                    <span class="stat-value">${info.suited ? '✅ 是' : '❌ 否'}</span>
                </div>
                <div class="stat-row" style="border:none;flex-direction:column;align-items:flex-start;">
                    <span class="stat-label">对子</span>
                    <span class="stat-value">${info.pair ? '✅ 是' : '❌ 否'}</span>
                </div>
                <div class="stat-row" style="border:none;flex-direction:column;align-items:flex-start;">
                    <span class="stat-label">间隔</span>
                    <span class="stat-value">${info.gap}</span>
                </div>
            </div>
        </div>

        <div class="result-card">
            <h3>📍 不同位置建议</h3>
            ${renderPositionAdvice(info)}
        </div>
    `;
    showResults(html);
}

function renderPositionAdvice(preflopInfo) {
    const tier = preflopInfo.tier;
    const positions = [
        {
            name: '前位 (EP)',
            icon: '🔴',
            getAdvice: () => {
                if (tier <= 2) return { action: '加注', cls: 'positive' };
                if (tier === 3) return { action: '跟注/加注', cls: 'neutral' };
                return { action: '弃牌', cls: 'negative' };
            }
        },
        {
            name: '中位 (MP)',
            icon: '🟡',
            getAdvice: () => {
                if (tier <= 2) return { action: '加注', cls: 'positive' };
                if (tier === 3) return { action: '加注', cls: 'positive' };
                if (tier === 4) return { action: '跟注', cls: 'neutral' };
                return { action: '弃牌', cls: 'negative' };
            }
        },
        {
            name: '后位 (LP/BTN)',
            icon: '🟢',
            getAdvice: () => {
                if (tier <= 3) return { action: '加注', cls: 'positive' };
                if (tier === 4) return { action: '加注/跟注', cls: 'neutral' };
                return { action: '视情况跟注', cls: 'neutral' };
            }
        },
        {
            name: '盲注位 (SB/BB)',
            icon: '🔵',
            getAdvice: () => {
                if (tier <= 2) return { action: '加注/3-bet', cls: 'positive' };
                if (tier <= 4) return { action: '跟注', cls: 'neutral' };
                return { action: 'BB可免费看牌', cls: 'neutral' };
            }
        },
    ];

    let html = '<div style="display:grid;gap:8px;">';
    for (const pos of positions) {
        const advice = pos.getAdvice();
        html += `
            <div class="stat-row">
                <span class="stat-label">${pos.icon} ${pos.name}</span>
                <span class="stat-value ${advice.cls}">${advice.action}</span>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

// ============================================================
// 第九部分：初始化
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    initCardPicker();
    document.getElementById('btn-clear-all').addEventListener('click', clearAll);

    // 给 slot 添加点击提示
    document.querySelectorAll('.card-slot.empty').forEach(slot => {
        slot.title = '从下方牌面选择器中点击选牌';
    });
});
