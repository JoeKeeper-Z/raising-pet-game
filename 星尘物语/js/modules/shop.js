        function initShop() {
            const shopData = window.shopTypes[window.gameState.shop.type];
            document.getElementById('shop-name').textContent = shopData.name;
            updateShopDisplay();
        }

        // 更新店铺显示
        function updateShopDisplay() {
            const shopData = window.shopTypes[window.gameState.shop.type];

            // 更新货架
            const shelves = document.getElementById('shop-shelves');
            shelves.innerHTML = '';

            shopData.products.forEach(product => {
                const inventory = window.gameState.shop.inventory[product.id] || 0;
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <div class="product-icon">${product.icon}</div>
                    <div class="product-name">${product.name}</div>
                    <div class="product-info">
                        进价: ${product.cost} 🪙<br>
                        售价: ${Math.floor(product.price * window.gameState.shop.priceMod / 100)} 🪙<br>
                        库存: ${inventory}
                    </div>
                `;
                shelves.appendChild(card);
            });

            // 更新进货列表
            const restockList = document.getElementById('restock-list');
            restockList.innerHTML = '';

            shopData.products.forEach(product => {
                const row = document.createElement('div');
                row.className = 'slider-container';
                row.innerHTML = `
                    <span style="width: 80px;">${product.name}</span>
                    <input type="range" min="0" max="10" value="0"
                           data-product="${product.id}" class="restock-slider">
                    <span style="width: 40px;" id="restock-${product.id}">0</span>
                `;
                restockList.appendChild(row);
            });

            // 绑定滑块事件
            document.querySelectorAll('.restock-slider').forEach(slider => {
                slider.oninput = function() {
                    document.getElementById('restock-' + this.dataset.product).textContent = this.value;
                };
            });

            // 更新统计
            document.getElementById('shop-level').textContent = `LV.${window.gameState.shop.level}`;
            document.getElementById('shop-income').textContent = window.gameState.shop.income + ' 🪙';
            document.getElementById('shop-total').textContent = window.gameState.shop.totalIncome + ' 🪙';
        }

        // 设置定价
        function setPromotion(type) {
            window.gameState.shop.promotion = type;

            switch(type) {
                case 'discount':
                    window.gameState.shop.priceMod = 80;
                    break;
                case 'premium':
                    window.gameState.shop.priceMod = 130;
                    break;
                default:
                    window.gameState.shop.priceMod = 100;
            }

            updateShopDisplay();
        }

        // 经营店铺
        function operateShop() {
            const shopData = window.shopTypes[window.gameState.shop.type];
            let totalCost = 0;
            let newInventory = { ...window.gameState.shop.inventory };

            // 计算进货
            document.querySelectorAll('.restock-slider').forEach(slider => {
                const productId = slider.dataset.product;
                const amount = parseInt(slider.value);
                const product = shopData.products.find(p => p.id === productId);

                if (amount > 0) {
                    totalCost += product.cost * amount;
                    newInventory[productId] = (newInventory[productId] || 0) + amount;
                }
            });

            if (totalCost > window.gameState.gold) {
                showNotification('资金不足', '你没有足够的金币进货');
                return;
            }

            // 扣除进货成本
            window.gameState.gold -= totalCost;
            window.gameState.shop.inventory = newInventory;

            // 计算营业额
            let income = 0;
            Object.entries(newInventory).forEach(([productId, amount]) => {
                const product = shopData.products.find(p => p.id === productId);
                const sold = Math.floor(Math.random() * amount * 0.7) + 1;
                const price = Math.floor(product.price * window.gameState.shop.priceMod / 100);

                // 促销影响销量
                let sellRate = 0.5;
                if (window.gameState.shop.promotion === 'discount') sellRate = 0.8;
                if (window.gameState.shop.promotion === 'premium') sellRate = 0.3;

                const actualSold = Math.min(sold, amount);
                income += actualSold * price;
                newInventory[productId] = amount - actualSold;
            });

            // 星儿属性加成
            if (window.gameState.stats.cha > 300) income = Math.floor(income * 1.2);
            if (window.gameState.stats.soc > 300) income = Math.floor(income * 1.15);

            window.gameState.gold += income;
            window.gameState.shop.income = income;
            window.gameState.shop.totalIncome += income;

            // 清理空库存
            Object.keys(newInventory).forEach(key => {
                if (newInventory[key] <= 0) delete newInventory[key];
            });

            showNotification('本周营业结束', `收入: ${income} 🪙`);
            updateShopDisplay();

            // 店铺升级检查
            if (window.gameState.shop.totalIncome > window.gameState.shop.level * 2000) {
                window.gameState.shop.level++;
                showNotification('店铺升级！', `店铺升至 ${window.gameState.shop.level} 级！`);
            }
        }

        // 格式化收益显示
        function formatEffects(baseEffects, bonusEffects) {
            let desc = '获得了：';
            const allEffects = { ...baseEffects };

            // 合并收益
            Object.entries(bonusEffects).forEach(([key, value]) => {
                if (allEffects[key]) {
                    allEffects[key] += value;
                } else {
                    allEffects[key] = value;
                }
            });

            const effectNames = {
                affection: '💕 好感',
                mood: '😊 心情',
                int: '🧠 智力',
                cha: '✨ 魅力',
                str: '💪 力量',
                soc: '👥 社交',
                ele: '🌸 气质',
                mor: '⚖️ 道德',
                sen: '🔮 感知',
                hp: '❤️ 体力',
                gold: '🪙 金币',
                stardustPower: '💫 星尘'
            };

            const parts = [];
            Object.entries(allEffects).forEach(([key, value]) => {
                if (value > 0) {
                    parts.push(`${effectNames[key] || key} +${value}`);
                }
            });

            return desc + parts.join('，');
        }

        // 显示结局
        function showEnding() {
            // 判定结局 - 按优先级顺序
            let ending = endings.default;

            // 先检查C级悲剧结局（优先于其他结局）
            const badEndings = ['fallen', 'lonely', 'sacrificed', 'forgotten'];
            for (const key of badEndings) {
                if (endings[key] && endings[key].condition(gameState)) {
                    ending = endings[key];
                    break;
                }
            }

            // 如果不是悲剧结局，检查S级结局
            if (ending.rank !== 'C') {
                const sRankEndings = ['stardust_guardian', 'stardust_redeemer'];
                for (const key of sRankEndings) {
                    if (endings[key] && endings[key].condition(gameState)) {
                        ending = endings[key];
                        break;
                    }
                }
            }

            // 如果不是S级，检查A级结局
            if (ending.rank !== 'S' && ending.rank !== 'C') {
                const aRankEndings = ['sage', 'sword_dancer', 'business', 'diplomat'];
                for (const key of aRankEndings) {
                    if (endings[key] && endings[key].condition(gameState)) {
                        ending = endings[key];
                        break;
                    }
                }
            }

            // 如果不是A级以上，检查B级结局
            if (ending.rank === 'B') {
                const bRankEndings = ['ordinary_happy', 'nature', 'artist', 'teacher'];
                for (const key of bRankEndings) {
                    if (endings[key] && endings[key].condition(gameState)) {
                        ending = endings[key];
                        break;
                    }
                }
            }

            window.gameState.currentEnding = ending;

            // 显示结局画面
            document.getElementById('ending-cg').textContent = ending.emoji;
            document.getElementById('ending-title').textContent = ending.title + ' (' + ending.rank + '结局)';
            // 替换名字
            const endingDesc = ending.desc.replace(/星儿/g, window.gameState.daughter.name);
            document.getElementById('ending-text').textContent = endingDesc;

            document.getElementById('end-months').textContent = '36';
            document.getElementById('end-gold').textContent = window.gameState.gold;
            document.getElementById('end-affection').textContent = window.gameState.affection;

            // 保存通关记录
            saveEndingRecord(ending);

            document.getElementById('main-game').style.display = 'none';
            document.getElementById('ending-screen').classList.add('active');
        }

        // 保存结局记录
        function saveEndingRecord(ending) {
            const records = JSON.parse(localStorage.getItem('stardustStory_endings') || '[]');
            records.push({
                title: ending.title,
                rank: ending.rank,
                timestamp: new Date().toISOString(),
                daughterName: window.gameState.daughter.name,
                fatherName: window.gameState.father.name
            });
            localStorage.setItem('stardustStory_endings', JSON.stringify(records));
        }

        // 二周目
        function startNewGamePlus() {
            // 继承部分数据
            const inheritAffection = Math.floor(window.gameState.affection * 0.3);
            const inheritGold = Math.floor(window.gameState.gold * 0.2);

            // 重置游戏状态
window.gameState = {
                year: 1,
                month: 1,
                totalMonth: 1,
                gold: 500 + inheritGold,
                season: 0,
                stardustPower: 0,
                affection: 100 + inheritAffection,
                daughter: {
                    name: window.gameState.daughter.name,
                    birthday: { ...window.gameState.daughter.birthday }
                },
                father: {
                    name: window.gameState.father.name,
                    birthday: { ...window.gameState.father.birthday }
                },
                stats: {
                    hp: 40,
                    int: 20,
                    cha: 20,
                    soc: 20,
                    ele: 20,
                    mor: 40,
                    str: 20,
                    sen: 20
                },
                mood: 50,
                health: 80,
                storyFlags: {},
                triggeredEvents: [],
                talkedThisMonth: 0,
                maxTalkPerMonth: 1,
                schedule: { activity: null },
                shop: {
                    type: 'flower',
                    level: 1,
                    income: 0,
                    totalIncome: 0,
                    inventory: {},
                    priceMod: 100,
                    promotion: 'none'
                },
                gameOver: false,
                currentEnding: null
            };

            document.getElementById('ending-screen').classList.remove('active');
            document.getElementById('main-game').style.display = 'flex';

            updateUI();
            generateActivityCards();
            initShop();

            showNotification('二周目开始', `继承了 ${inheritGold} 金币和 ${inheritAffection} 好感度`);
        }

        // 返回标题
        function returnToTitle() {
            document.getElementById('ending-screen').classList.remove('active');
            document.getElementById('title-screen').style.display = 'flex';
        }

        // 打开面板
