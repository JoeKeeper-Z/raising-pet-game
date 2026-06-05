        function openSchedulePanel() {
            document.getElementById('overlay').classList.add('active');
            document.getElementById('schedule-panel').classList.add('active');
        }

        function openStatusPanel() {
            updateStatusPanel();
            document.getElementById('overlay').classList.add('active');
            document.getElementById('status-panel').classList.add('active');
        }

        function openShopPanel() {
            updateShopDisplay();
            document.getElementById('overlay').classList.add('active');
            document.getElementById('shop-panel').classList.add('active');
        }

        // 更新状态面板
        function updateStatusPanel() {
            // 更新名字
            document.querySelector('.char-name').textContent = window.gameState.daughter.name;
            document.getElementById('status-panel-title').textContent = `📊 ${window.gameState.daughter.name}的状态`;

            // 计算女儿当前年龄（15-18岁，36个月）
            const daughterAge = 15 + Math.floor((window.gameState.totalMonth - 1) / 12);
            const ageText = `${daughterAge}岁 (${window.gameState.year}年${window.gameState.month}月)`;
            document.getElementById('char-age').textContent = ageText;

            // 更新属性列表
            const statsList = document.getElementById('stats-list');
            statsList.innerHTML = '';

            const statNames = {
                hp: '❤️ 体力',
                int: '🧠 智力',
                cha: '✨ 魅力',
                soc: '👥 社交',
                ele: '🌸 气质',
                mor: '⚖️ 道德',
                str: '💪 力量',
                sen: '🔮 感知'
            };

            Object.entries(window.gameState.stats).forEach(([key, value]) => {
                const row = document.createElement('div');
                row.className = 'stat-row';
                row.innerHTML = `
                    <span class="stat-label">${statNames[key]}</span>
                    <div class="stat-bar">
                        <div class="stat-fill ${key}" style="width: ${(value / 999) * 100}%"></div>
                    </div>
                    <span class="stat-value">${value}</span>
                `;
                statsList.appendChild(row);
            });

            // 更新心情和健康
            document.getElementById('mood-bar').style.width = window.gameState.mood + '%';
            document.getElementById('mood-text').textContent = window.gameState.mood + '/100';
            document.getElementById('health-bar').style.width = window.gameState.health + '%';
            document.getElementById('health-text').textContent = window.gameState.health + '/100';

            // 更新隐藏属性
            const stardustDisplay = window.gameState.stardustPower > 100 ?
                window.gameState.stardustPower : '???';
            document.getElementById('stardust-power').textContent = stardustDisplay;
            document.getElementById('affection-display').textContent = window.gameState.affection;

            // 更新雷达图
            updateRadarChart();
        }

        // 更新雷达图
        function updateRadarChart() {
            const stats = window.gameState.stats;
            const maxVal = 500; // 显示上限

            const points = [];
            const centerX = 125, centerY = 125, radius = 100;
            const angles = [-Math.PI/2, -Math.PI/6, Math.PI/6, Math.PI/2, 5*Math.PI/6, 7*Math.PI/6];
            const keys = ['int', 'cha', 'soc', 'str', 'sen', 'ele'];

            keys.forEach((key, i) => {
                const value = Math.min(stats[key], maxVal);
                const r = (value / maxVal) * radius;
                const x = centerX + r * Math.cos(angles[i]);
                const y = centerY + r * Math.sin(angles[i]);
                points.push(`${x},${y}`);
            });

            document.getElementById('radar-polygon').setAttribute('points', points.join(' '));
        }

        // 事件队列
        let eventQueue = [];
        let isProcessingEvents = false;

        // 关闭所有面板
        window.closeAllPanels = function() {
            // 如果事件面板正在显示，不关闭（防止误触）
            const eventPanel = document.getElementById('event-panel');
            if (eventPanel && eventPanel.classList.contains('active')) {
                return;
            }

            // 关闭遮罩层
            const overlay = document.getElementById('overlay');
            if (overlay) overlay.classList.remove('active');

            // 关闭所有面板
            document.querySelectorAll('.panel').forEach(panel => {
                panel.classList.remove('active');
            });

            // 关闭子面板和模态框
            document.querySelectorAll('.sub-panel').forEach(panel => {
                panel.classList.remove('active');
            });

            // 关闭NPC互动面板
            const npcInteractionPanel = document.getElementById('npc-interaction-panel');
            if (npcInteractionPanel) npcInteractionPanel.classList.remove('active');

            // 关闭送礼面板
            const giftPanel = document.getElementById('gift-panel');
            if (giftPanel) giftPanel.classList.remove('active');

            const npcModal = document.getElementById('npc-dialogue-modal');
            if (npcModal) npcModal.classList.remove('active');
        };

        // 保存游戏
        function saveGame() {
            // 将事件记忆的数据保存到 gameState
            window.gameState.eventMemoryData = {
                choices: eventMemory.choices,
                chains: eventMemory.chains,
                delayedEffects: eventMemory.delayedEffects.map(e => ({
                    triggerMonth: e.triggerMonth,
                    eventId: e.eventId // 保存事件ID而不是函数
                }))
            };

            // 保存NPC好感度数据
            window.gameState.npcAffection = window.npcAffection || {};
            window.gameState.exploreState = {
                metNPCs: Array.from(window.exploreState.metNPCs)
            };

            const saveData = JSON.stringify(window.gameState);
            localStorage.setItem('stardustStory_save', saveData);
            showNotification('保存成功', '游戏进度已保存');
        }

        // 加载游戏
        function loadGame() {
            const saveData = localStorage.getItem('stardustStory_save');
            if (saveData) {
                window.gameState = JSON.parse(saveData);
                // 恢复事件记忆
                if (window.gameState.eventMemoryData) {
                    eventMemory.choices = window.gameState.eventMemoryData.choices || {};
                    eventMemory.chains = window.gameState.eventMemoryData.chains || {};
                    // 延迟效果需要重新设置回调函数
                    if (window.gameState.eventMemoryData.delayedEffects) {
                        eventMemory.delayedEffects = window.gameState.eventMemoryData.delayedEffects
                            .filter(e => delayedEvents[e.eventId]) // 只保留存在的事件
                            .map(e => ({
                                triggerMonth: e.triggerMonth,
                                callback: () => {
                                    eventQueue.push({
                                        type: 'delayed',
                                        data: delayedEvents[e.eventId]
                                    });
                                }
                            }));
                    }
                }

                // 恢复NPC好感度数据
                if (window.gameState.npcAffection) {
                    window.npcAffection = window.gameState.npcAffection;
                }

                // 恢复探索状态
                if (window.gameState.exploreState) {
                    if (window.gameState.exploreState.metNPCs) {
                        window.exploreState.metNPCs = new Set(window.gameState.exploreState.metNPCs);
                    }
                }

                document.getElementById('title-screen').style.display = 'none';
                document.getElementById('main-game').style.display = 'flex';
                initGame();
                showNotification('加载成功', '继续你的旅程吧');
            } else {
                showNotification('没有存档', '没有找到保存的游戏进度');
            }
        }

        // 设置
        function showSettings() {
            const choice = confirm('游戏设置\n\n是否清除存档重新开始？\n(取消则保留存档)');
            if (choice) {
                localStorage.removeItem('stardustStory_save');
                showNotification('存档已清除', '可以开始新游戏了');
            }
        }

        // 将其他函数暴露到全局作用域
        window.openSchedulePanel = openSchedulePanel;
        window.openStatusPanel = openStatusPanel;
        window.openShopPanel = openShopPanel;
        window.saveGame = saveGame;
        window.loadGame = loadGame;
        window.showSettings = showSettings;

        // 初始化
        window.onload = function() {
            initStars();

            // 为所有关闭按钮绑定点击事件（备用方案，确保HTML中的onclick失效时仍能工作）
            document.querySelectorAll('.panel .close-btn').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.closeAllPanels();
                });
            });

            // 点击遮罩层关闭面板
            const overlay = document.getElementById('overlay');
            if (overlay) {
                overlay.addEventListener('click', function() {
                    window.closeAllPanels();
                });
            }
        };
