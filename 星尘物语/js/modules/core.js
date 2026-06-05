        // 初始化星空背景
        function initStars() {
            const starsContainer = document.getElementById('stars');
            for (let i = 0; i < 100; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.animationDelay = Math.random() * 2 + 's';
                star.style.opacity = Math.random();
                starsContainer.appendChild(star);
            }
        }

        // 开始新游戏
        function startNewGame() {
            document.getElementById('title-screen').style.display = 'none';
            document.getElementById('prologue').classList.add('active');
        }

        // 序章选择
        function choosePrologue(choice) {
            const baseStats = {
                gentle: { mor: 20, cha: 10 },
                careful: { sen: 20, int: 10 },
                brave: { str: 20, hp: 10 }
            };

            // 应用初始属性加成
            Object.entries(baseStats[choice]).forEach(([stat, value]) => {
                window.gameState.stats[stat] += value;
            });

            document.getElementById('prologue').classList.remove('active');
            document.getElementById('character-creation').classList.add('active');

            // 随机初始化生日
            randomizeDaughterBirthday();
            randomizeFatherBirthday();
        }

        // 获取月份最大天数
        function getDaysInMonth(month) {
            // 1,3,5,7,8,10,12月有31天
            // 4,6,9,11月有30天
            // 2月有28天
            const days31 = [1, 3, 5, 7, 8, 10, 12];
            const days30 = [4, 6, 9, 11];

            if (days31.includes(month)) return 31;
            if (days30.includes(month)) return 30;
            return 28; // 2月
        }

        // 更新日期输入框最大值
        function updateDayMax(who) {
            const monthInput = document.getElementById(who + '-month');
            const dayInput = document.getElementById(who + '-day');
            const month = parseInt(monthInput.value) || 1;
            const maxDay = getDaysInMonth(month);
            dayInput.max = maxDay;

            // 如果当前日期超过最大值，调整为最大值
            if (parseInt(dayInput.value) > maxDay) {
                dayInput.value = maxDay;
            }
        }

        // 随机女儿生日
        function randomizeDaughterBirthday() {
            const month = Math.floor(Math.random() * 12) + 1;
            const maxDay = getDaysInMonth(month);
            const day = Math.floor(Math.random() * maxDay) + 1;

            document.getElementById('daughter-month').value = month;
            document.getElementById('daughter-day').value = day;
            updateDayMax('daughter');
        }

        // 随机父亲生日
        function randomizeFatherBirthday() {
            const month = Math.floor(Math.random() * 12) + 1;
            const maxDay = getDaysInMonth(month);
            const day = Math.floor(Math.random() * maxDay) + 1;

            document.getElementById('father-month').value = month;
            document.getElementById('father-day').value = day;
            updateDayMax('father');
        }

        // 开始游戏（带角色创建）
        function startGameWithCharacters() {
            const daughterName = document.getElementById('daughter-name').value.trim();
            const fatherName = document.getElementById('father-name').value.trim();
            const daughterMonth = parseInt(document.getElementById('daughter-month').value) || 1;
            const daughterDay = parseInt(document.getElementById('daughter-day').value) || 1;
            const fatherMonth = parseInt(document.getElementById('father-month').value) || 1;
            const fatherDay = parseInt(document.getElementById('father-day').value) || 1;

            if (!daughterName || !fatherName) {
                showNotification('提示', '请输入名字');
                return;
            }

            // 保存角色信息
            window.gameState.daughter.name = daughterName;
            window.gameState.daughter.birthday = { month: daughterMonth, day: daughterDay };
            window.gameState.father.name = fatherName;
            window.gameState.father.birthday = { month: fatherMonth, day: fatherDay };

            document.getElementById('character-creation').classList.remove('active');
            document.getElementById('main-game').style.display = 'flex';
            initGame();

            showNotification('游戏开始', `愿${daughterName}在${fatherName}的养育下茁壮成长！`);
        }

        // 初始化游戏
        function initGame() {
            updateUI();
            generateActivityCards();
            initShop();

            // 检查是否有主线事件
            setTimeout(() => checkMainStory(), 500);
        }

        // 更新UI
        function updateUI() {
            // 更新顶部栏（显示年月）
            document.getElementById('time-display').textContent = `第 ${window.gameState.year} 年 ${window.gameState.month} 月`;
            document.getElementById('gold-display').textContent = window.gameState.gold;
            document.getElementById('season-display').textContent =
                seasonEmojis[window.gameState.season] + ' ' + seasons[window.gameState.season];

            // 更新季节背景
            const seasonClass = ['spring', 'summer', 'autumn', 'winter'][window.gameState.season];
            document.getElementById('scene-area').className = `scene-area ${seasonClass}`;

            // 更新迷你状态面板
            document.getElementById('mini-hp').textContent = window.gameState.stats.hp;
            document.getElementById('mini-int').textContent = window.gameState.stats.int;
            document.getElementById('mini-cha').textContent = window.gameState.stats.cha;
            document.getElementById('mini-soc').textContent = window.gameState.stats.soc;
            document.getElementById('mini-mood').textContent = window.gameState.mood;
        }

        // 生成活动卡片
        function generateActivityCards() {
            const container = document.getElementById('activity-cards');
            container.innerHTML = '';

            Object.entries(activities).forEach(([key, activity]) => {
                const card = document.createElement('div');
                card.className = 'activity-card';
                card.dataset.key = key;

                // 检查是否解锁
                const isUnlocked = !activity.unlockCondition || activity.unlockCondition();

                // 检查前置条件（如属性要求）
                let meetsReq = true;
                if (activity.req) {
                    meetsReq = Object.entries(activity.req).every(
                        ([stat, value]) => window.gameState.stats[stat] >= value
                    );
                }

                if (isUnlocked && meetsReq) {
                    // 已解锁
                    card.innerHTML = `
                        <div class="name">${activity.name}</div>
                        <div class="effect">${activity.desc}</div>
                    `;
                    card.onclick = () => selectActivity(key);
                } else if (!isUnlocked) {
                    // 未解锁
                    card.classList.add('locked');
                    card.innerHTML = `
                        <div class="name">🔒 未解锁</div>
                        <div class="effect" style="color: #999; font-size: 0.8rem;">${activity.lockedDesc || '完成特定事件后解锁'}</div>
                    `;
                    card.onclick = () => showNotification('未解锁', activity.lockedDesc || '完成特定事件后解锁');
                }

                container.appendChild(card);
            });
        }

        // 选择活动
        function selectActivity(activityKey) {
            window.gameState.schedule.activity = activityKey;

            // 更新UI选中状态
            const container = document.getElementById('activity-cards');
            Array.from(container.children).forEach(card => {
                card.classList.toggle('selected', card.dataset.key === activityKey);
            });

            updateSchedulePreview();
        }

        // 更新日程预览
        function updateSchedulePreview() {
            const activity = window.gameState.schedule.activity;

            let text = '';
            if (activity) {
                const act = activities[activity];
                text = `本月安排：${act.name} | `;
                if (act.goldCost > 0) text += `花费 ${act.goldCost} 🪙`;
                if (act.goldGain) {
                    const avgGain = Math.floor((act.goldGain.min + act.goldGain.max) / 2);
                    text += `预计收入 ${avgGain} 🪙`;
                }
                if (act.goldCost === 0 && !act.goldGain) text += '无金钱变化';
            } else {
                text = '请选择本月的活动安排';
            }

            document.getElementById('preview-text').textContent = text;
        }

        // 确认日程并进入下月
        function confirmSchedule() {
            if (!window.gameState.schedule.activity) {
                showNotification('提示', '请选择本月的活动安排');
                return;
            }

            closeAllPanels();

            // 显示日程演出，然后自动进入下月
            showScheduleScenes();
        }

        // 进入下周
        function nextWeek() {
            // 检查是否安排了日程
            if (!window.gameState.schedule.morning || !window.gameState.schedule.afternoon) {
                showNotification('提示', '请先安排好本周的日程');
                openSchedulePanel();
                return;
            }

            // 先显示日程演出，再执行实际效果
            showScheduleScenes();
        }

        // 显示日程演出
        function showScheduleScenes() {
            const activityKey = window.gameState.schedule.activity;

            if (activityKey && window.activityScenes[activityKey]) {
                const scenes = window.activityScenes[activityKey];
                const randomScene = scenes[Math.floor(Math.random() * scenes.length)];
                currentScene = {
                    activityKey: activityKey,
                    scene: randomScene
                };
                currentSceneLineIndex = 0;
                showNextScheduleScene();
            } else {
                // 没有演出，直接执行日程
                executeScheduleEffects();
            }
        }

        // 显示下一个日程演出
        function showNextScheduleScene() {
            if (!currentScene || !currentScene.scene) {
                // 没有演出，直接执行实际效果
                executeScheduleEffects();
                return;
            }

            const line = currentScene.scene.lines[currentSceneLineIndex];

            // 显示对话面板
            const dialoguePanel = document.getElementById('dialogue-panel');
            const speakerAvatar = document.getElementById('speaker-avatar');
            const speakerName = document.getElementById('speaker-name');
            const dialogueText = document.getElementById('dialogue-text');
            const dialogueOptions = document.getElementById('dialogue-options');

            dialoguePanel.classList.add('active');
            speakerAvatar.textContent = line.avatar;
            // 替换名字占位符
            let displayName = line.speaker;
            if (displayName === '星儿') displayName = window.gameState.daughter.name;
            speakerName.textContent = displayName;

            // 打字机效果显示对话（替换名字）
            dialogueText.textContent = '';
            let displayText = line.text.replace(/星儿/g, window.gameState.daughter.name);
            // 使用 Array.from 正确处理 emoji 和多字节字符
            const chars = Array.from(displayText);
            let charIndex = 0;
            const typeInterval = setInterval(() => {
                if (charIndex < chars.length) {
                    dialogueText.textContent += chars[charIndex];
                    charIndex++;
                } else {
                    clearInterval(typeInterval);
                }
            }, 40);

            // 生成选项 - 只有一个"继续"按钮
            dialogueOptions.innerHTML = '';
            const btn = document.createElement('button');
            btn.className = 'dialogue-option';
            btn.textContent = '继续';
            btn.onclick = () => {
                currentSceneLineIndex++;
                if (currentSceneLineIndex >= currentScene.scene.lines.length) {
                    // 当前场景结束，执行效果
                    executeScheduleEffects();
                } else {
                    // 显示下一句
                    showNextScheduleScene();
                }
            };
            dialogueOptions.appendChild(btn);
        }

        // 执行日程效果（所有演出结束后调用）
        function executeScheduleEffects() {
            // 关闭对话面板
            document.getElementById('dialogue-panel').classList.remove('active');

            // 执行日程效果
            executeSchedule();

            // 扣除生活费（每月）
            window.gameState.gold -= 320;

            // 计算健康值
            window.gameState.health = Math.min(100, Math.floor(
                (window.gameState.stats.hp / 999) * 60 + 40
            ));

            // 检查心情边界
            window.gameState.mood = Math.max(0, Math.min(100, window.gameState.mood));

            // 更新月份和年份
            window.gameState.month++;
            window.gameState.totalMonth++;
            if (window.gameState.month > 12) {
                window.gameState.month = 1;
                window.gameState.year++;
            }

            // 更新季节（每3个月换季）
            const currentMonthIndex = (window.gameState.month - 1);
            window.gameState.season = Math.floor(currentMonthIndex / 3) % 4;

            // 每月自然恢复
            window.gameState.stats.hp = Math.min(999, window.gameState.stats.hp + 40);

            // 检查延迟效果（如事件记忆系统）
            window.eventMemory.checkDelayedEffects();

            // 清空事件队列并收集本月事件
            eventQueue = [];

            // 随机事件判定（加入队列）
            collectRandomEvent();

            // 检查主线剧情（加入队列）- 按总月数触发
            const storyEvent = window.mainStoryEvents[window.gameState.totalMonth];
            if (storyEvent) {
                eventQueue.push({ type: 'main', data: storyEvent });
            }

            // 检查生日事件
            checkBirthdayEvents();

            // 检查游戏结束（3年36个月）
            if (window.gameState.totalMonth > 36) {
                showEnding();
                return;
            }

            // 重置日程
            window.gameState.schedule = { activity: null };

            // 重置本月对话次数
            window.gameState.talkedThisMonth = 0;

            // 更新UI
            updateUI();
            generateActivityCards();

            // 显示通知
            const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
            showNotification(`第 ${window.gameState.year} 年 ${monthNames[window.gameState.month - 1]}`, `进入了${seasons[window.gameState.season]}`);

            // 处理事件队列（延迟一点让玩家看到周结束通知）
            if (eventQueue.length > 0) {
                setTimeout(() => {
                    processEventQueue();
                }, 1000);
            }
        }

        // 本周属性变化记录
        let weekStatChanges = {};

        // 执行日程
        // 执行日程（每月一次）
        function executeSchedule() {
            // 重置本月属性变化记录
            weekStatChanges = {};

            const activityKey = window.gameState.schedule.activity;
            const activity = activities[activityKey];

            if (!activity) return;

            // 扣除费用
            if (activity.goldCost) {
                window.gameState.gold -= activity.goldCost;
            }

            // 应用属性变化
            if (activity.effects) {
                Object.entries(activity.effects).forEach(([stat, value]) => {
                    const oldValue = window.gameState.stats[stat];
                    if (stat === 'hp') {
                        window.gameState.stats[stat] = Math.min(999, Math.max(0,
                            window.gameState.stats[stat] + value
                        ));
                    } else {
                        window.gameState.stats[stat] = Math.min(999,
                            window.gameState.stats[stat] + value
                        );
                    }
                    const newValue = window.gameState.stats[stat];
                    const actualChange = newValue - oldValue;

                    // 记录变化
                    if (actualChange !== 0) {
                        if (!weekStatChanges[stat]) weekStatChanges[stat] = 0;
                        weekStatChanges[stat] += actualChange;
                    }
                });
            }

            // 应用心情变化
            if (activity.moodCost) {
                const oldMood = window.gameState.mood;
                window.gameState.mood += activity.moodCost;
                const actualChange = window.gameState.mood - oldMood;
                if (actualChange !== 0) {
                    if (!weekStatChanges.mood) weekStatChanges.mood = 0;
                    weekStatChanges.mood += actualChange;
                }
            }

            // 打工收入
            if (activity.goldGain) {
                const gain = Math.floor(
                    Math.random() * (activity.goldGain.max - activity.goldGain.min)
                    + activity.goldGain.min
                );
                window.gameState.gold += gain;
                if (!weekStatChanges.gold) weekStatChanges.gold = 0;
                weekStatChanges.gold += gain;
            }

            // 增加好感度（每月）
            window.gameState.affection += 8;
            if (!weekStatChanges.affection) weekStatChanges.affection = 0;
            weekStatChanges.affection += 8;

            // 显示属性变化浮窗
            showStatChangePopup();
        }

        // 显示属性变化浮窗
        function showStatChangePopup() {
            const popup = document.getElementById('stat-change-popup');
            const content = document.getElementById('stat-change-content');

            // 如果没有变化，不显示
            if (Object.keys(weekStatChanges).length === 0) {
                return;
            }

            // 生成内容
            const statNames = {
                hp: '❤️ 体力',
                int: '🧠 智力',
                cha: '✨ 魅力',
                soc: '👥 社交',
                ele: '🌸 气质',
                mor: '⚖️ 道德',
                str: '💪 力量',
                sen: '🔮 感知',
                mood: '😊 心情',
                gold: '🪙 金币',
                affection: '💕 好感'
            };

            let html = '';
            Object.entries(weekStatChanges).forEach(([stat, value]) => {
                const name = statNames[stat] || stat;
                const sign = value > 0 ? '+' : '';
                const className = value > 0 ? 'positive' : (value < 0 ? 'negative' : '');
                html += `
                    <div class="stat-change-item">
                        <span class="stat-change-name">${name}</span>
                        <span class="stat-change-value ${className}">${sign}${value}</span>
                    </div>
                `;
            });

            content.innerHTML = html;

            // 显示浮窗
            popup.classList.remove('hide');
            popup.classList.add('show');

            // 3秒后自动消失
            setTimeout(() => {
                popup.classList.remove('show');
                popup.classList.add('hide');
            }, 3500);
        }

        // 收集随机事件到队列
        function collectRandomEvent() {
            // 基础概率35%
            let probability = 0.35;

            // 感知修正
            if (window.gameState.stats.sen >= 800) probability = 0.65;
            else if (window.gameState.stats.sen >= 500) probability = 0.50;

            // 心情修正
            if (window.gameState.mood >= 80) probability += 0.10;
            else if (window.gameState.mood <= 20) probability -= 0.15;

            if (Math.random() < probability) {
                // 筛选可触发的事件
                // 条件1：未被触发过
                // 条件2：有条件函数且返回true，或没有条件函数
                // 条件3：不是只能通过事件链触发的事件（condition为false表示只能通过链触发）
                const availableEvents = window.randomEvents.filter(e =>
                    !window.gameState.triggeredEvents.includes(e.id) &&
                    e.condition !== false &&
                    (!e.condition || e.condition())
                );

                if (availableEvents.length > 0) {
                    const event = availableEvents[Math.floor(Math.random() * availableEvents.length)];
                    eventQueue.push({ type: 'random', data: event });
                    window.gameState.triggeredEvents.push(event.id);
                }
            }
        }

        // 处理事件队列
        function processEventQueue() {
            if (isProcessingEvents || eventQueue.length === 0) {
                isProcessingEvents = false;
                return;
            }

            isProcessingEvents = true;
            const nextEvent = eventQueue.shift();

            if (nextEvent.type === 'random') {
                showEvent(nextEvent.data);
            } else if (nextEvent.type === 'main') {
                showMainStory(nextEvent.data);
            } else if (nextEvent.type === 'daughter_birthday') {
                showDaughterBirthday();
            } else if (nextEvent.type === 'father_birthday') {
                showFatherBirthday();
            } else if (nextEvent.type === 'delayed') {
                showEvent(nextEvent.data);
            }
        }

        // 继续处理下一个事件
        function continueEventQueue() {
            // 关闭当前事件面板
            document.getElementById('overlay').classList.remove('active');
            document.getElementById('event-panel').classList.remove('active');

            // 延迟后显示下一个事件
            if (eventQueue.length > 0) {
                setTimeout(() => {
                    isProcessingEvents = false;
                    processEventQueue();
                }, 800);
            } else {
                isProcessingEvents = false;
            }
        }

        // 触发随机事件（旧函数，保留兼容）
        function triggerRandomEvent() {
            collectRandomEvent();
        }

        // 检查生日事件
        function checkBirthdayEvents() {
            // 每月检查一次生日（简化逻辑）
            const currentMonth = window.gameState.month;
            const currentDay = 15; // 假设生日在月中触发

            // 检查女儿生日
            const daughterBD = window.gameState.daughter.birthday;
            if (currentMonth === daughterBD.month) {
                eventQueue.push({ type: 'daughter_birthday', data: null });
            }

            // 检查父亲生日
            const fatherBD = window.gameState.father.birthday;
            if (currentMonth === fatherBD.month) {
                eventQueue.push({ type: 'father_birthday', data: null });
            }
        }

        // 女儿生日事件
        const daughterBirthdayEvent = {
            title: '生日庆祝',
            desc: (name) => `今天是${name}的生日！${name}期待地看着你，想要一份特别的礼物...`,
            emoji: '🎂',
            choices: [
                { text: '📚 送书籍', effects: { int: 30 }, desc: '智力+30' },
                { text: '🎨 送画具', effects: { cha: 30 }, desc: '魅力+30' },
                { text: '⚔️ 送木剑', effects: { str: 30 }, desc: '力量+30' },
                { text: '🌸 送花束', effects: { ele: 30 }, desc: '气质+30' }
            ]
        };

        // 父亲生日事件
        const fatherBirthdayEvent = {
            title: '特别的日子',
            desc: (daughterName, fatherName) => `今天是${fatherName}的生日！${daughterName}精心准备了礼物，还画了一幅画送给${fatherName}...`,
            emoji: '👨‍👧',
            choices: [
                { text: '接受女儿的心意', effects: { affection: 50, mood: 20 }, desc: '好感度+50，心情+20' }
            ]
        };

        // 检查主线剧情（旧函数，保留兼容）
        function checkMainStory() {
            const storyEvent = window.mainStoryEvents[window.gameState.totalMonth];
            if (storyEvent) {
                setTimeout(() => showMainStory(storyEvent), 1000);
            }
        }

        // 显示女儿生日事件
        function showDaughterBirthday() {
            const event = daughterBirthdayEvent;
            document.getElementById('event-image').textContent = event.emoji;
            document.getElementById('event-title').textContent = event.title;
            document.getElementById('event-description').textContent = event.desc(window.gameState.daughter.name);

            const choicesContainer = document.getElementById('event-choices');
            choicesContainer.innerHTML = '';

            event.choices.forEach((choice) => {
                const btn = document.createElement('button');
                btn.className = 'event-choice';
                btn.innerHTML = `
                    <strong>${choice.text}</strong><br>
                    <small>${choice.desc}</small>
                `;
                btn.onclick = () => resolveDaughterBirthdayChoice(choice);
                choicesContainer.appendChild(btn);
            });

            document.getElementById('overlay').classList.add('active');
            document.getElementById('event-panel').classList.add('active');
        }

        // 显示父亲生日事件
        function showFatherBirthday() {
            const event = fatherBirthdayEvent;
            document.getElementById('event-image').textContent = event.emoji;
            document.getElementById('event-title').textContent = event.title;
            document.getElementById('event-description').textContent = event.desc(window.gameState.daughter.name, window.gameState.father.name);

            const choicesContainer = document.getElementById('event-choices');
            choicesContainer.innerHTML = '';

            event.choices.forEach((choice) => {
                const btn = document.createElement('button');
                btn.className = 'event-choice';
                btn.innerHTML = `
                    <strong>${choice.text}</strong><br>
                    <small>${choice.desc}</small>
                `;
                btn.onclick = () => resolveFatherBirthdayChoice(choice);
                choicesContainer.appendChild(btn);
            });

            document.getElementById('overlay').classList.add('active');
            document.getElementById('event-panel').classList.add('active');
        }

        // 处理女儿生日选择
        function resolveDaughterBirthdayChoice(choice) {
            if (choice.effects) {
                applyEffects(choice.effects);
            }
            showNotification('生日庆祝', `${window.gameState.daughter.name}很喜欢这份礼物！`);
            continueEventQueue();
        }

        // 处理父亲生日选择
        function resolveFatherBirthdayChoice(choice) {
            if (choice.effects) {
                applyEffects(choice.effects);
            }
            showNotification('温馨时刻', `${window.gameState.daughter.name}祝爸爸生日快乐！`);
            continueEventQueue();
        }

        // 显示事件
        // 当前事件状态
        let currentEventState = {
            event: null,
            isMultiStage: false
        };

        function showEvent(event) {
            currentEventState.event = event;
            currentEventState.isMultiStage = false;

            document.getElementById('event-image').textContent = event.emoji;
            document.getElementById('event-title').textContent = event.title;
            // 替换名字
            const desc = event.desc.replace(/星儿/g, window.gameState.daughter.name);
            document.getElementById('event-description').textContent = desc;

            const choicesContainer = document.getElementById('event-choices');
            choicesContainer.innerHTML = '';

            event.choices.forEach((choice, index) => {
                // 检查金币要求
                if (choice.requireGold && window.gameState.gold < choice.requireGold) {
                    return; // 跳过这个选项
                }

                const btn = document.createElement('button');
                btn.className = 'event-choice';
                // 替换result中的名字
                const result = choice.result.replace(/星儿/g, window.gameState.daughter.name);

                // 显示属性要求
                let requirementText = '';
                if (choice.require) {
                    const reqs = [];
                    if (choice.require.int) reqs.push(`智力≥${choice.require.int}`);
                    if (choice.require.sen) reqs.push(`感知≥${choice.require.sen}`);
                    if (choice.require.str) reqs.push(`力量≥${choice.require.str}`);
                    if (choice.require.cha) reqs.push(`魅力≥${choice.require.cha}`);
                    if (choice.require.soc) reqs.push(`社交≥${choice.require.soc}`);
                    if (reqs.length > 0) {
                        requirementText = `<span style="color: #ff9800;">[需要: ${reqs.join(', ')}]</span><br>`;
                    }
                }
                if (choice.requireGold) {
                    requirementText = `<span style="color: #ff9800;">[需要: ${choice.requireGold}金币]</span><br>`;
                }

                btn.innerHTML = `
                    <strong>${choice.text}</strong><br>
                    ${requirementText}<small>${result}</small>
                `;
                btn.onclick = () => resolveEventChoice(choice, index);
                choicesContainer.appendChild(btn);
            });

            document.getElementById('overlay').classList.add('active');
            document.getElementById('event-panel').classList.add('active');
        }

        // 显示主线剧情
        function showMainStory(storyEvent) {
            document.getElementById('event-image').textContent = storyEvent.emoji;
            document.getElementById('event-title').textContent = storyEvent.title;
            // 替换名字
            const desc = storyEvent.desc.replace(/星儿/g, window.gameState.daughter.name);
            document.getElementById('event-description').textContent = desc;

            const choicesContainer = document.getElementById('event-choices');
            choicesContainer.innerHTML = '';

            storyEvent.choices.forEach(choice => {
                const btn = document.createElement('button');
                btn.className = 'event-choice';
                btn.innerHTML = `<strong>${choice.text}</strong>`;
                btn.onclick = () => resolveMainStoryChoice(choice);
                choicesContainer.appendChild(btn);
            });

            document.getElementById('overlay').classList.add('active');
            document.getElementById('event-panel').classList.add('active');
        }

        // 处理事件选择
        function resolveEventChoice(choice, choiceIndex) {
            // 记录当前事件ID
            const currentEventId = currentEventState.event?.id;

            // 检查属性要求
            let success = true;
            if (choice.require) {
                if (choice.require.int && window.gameState.stats.int < choice.require.int) success = false;
                if (choice.require.sen && window.gameState.stats.sen < choice.require.sen) success = false;
                if (choice.require.str && window.gameState.stats.str < choice.require.str) success = false;
                if (choice.require.cha && window.gameState.stats.cha < choice.require.cha) success = false;
                if (choice.require.soc && window.gameState.stats.soc < choice.require.soc) success = false;
            }

            // 记录选择
            if (currentEventId) {
                window.eventMemory.recordChoice(currentEventId, choiceIndex, choice);
            }

            // 应用效果
            if (choice.effects && success) {
                applyEffects(choice.effects);
            } else if (choice.effects && !success) {
                // 检定失败，应用失败效果（如果有）或部分效果
                const failEffects = {};
                Object.entries(choice.effects).forEach(([key, value]) => {
                    // 失败时只获得一半效果，且负面效果翻倍
                    if (value > 0) {
                        failEffects[key] = Math.floor(value / 2);
                    } else {
                        failEffects[key] = value * 2;
                    }
                });
                applyEffects(failEffects);
            }

            // 执行选择回调
            if (choice.onChoose) {
                choice.onChoose();
            }

            // 处理多阶段事件
            if (choice.nextStage) {
                const nextEvent = window.randomEvents.find(e => e.id === choice.nextStage);
                if (nextEvent) {
                    showNotification('事件继续', choice.result);
                    setTimeout(() => {
                        showEvent(nextEvent);
                    }, 800);
                    return;
                }
            }

            // 处理属性检定的成功/失败分支
            if (!success && choice.failStage) {
                const failEvent = window.randomEvents.find(e => e.id === choice.failStage);
                if (failEvent) {
                    showNotification('检定失败', '你的能力还不足以应对这个挑战');
                    setTimeout(() => {
                        showEvent(failEvent);
                    }, 800);
                    return;
                }
            }
            if (success && choice.successStage) {
                const successEvent = window.randomEvents.find(e => e.id === choice.successStage);
                if (successEvent) {
                    showNotification('检定成功', '你成功应对了挑战！');
                    setTimeout(() => {
                        showEvent(successEvent);
                    }, 800);
                    return;
                }
            }

            // 普通事件结束
            showNotification('事件结束', choice.result);
            continueEventQueue();
        }

        // 处理主线剧情选择
        function resolveMainStoryChoice(choice) {
            if (choice.effects) {
                applyEffects(choice.effects);
            }
            window.gameState.storyFlags[choice.next] = true;
            showNotification('剧情推进', '星儿的故事正在展开...');
            continueEventQueue();
        }

        // 应用效果
        function applyEffects(effects) {
            const statNames = {
                hp: '❤️ 体力',
                int: '🧠 智力',
                cha: '✨ 魅力',
                soc: '👥 社交',
                ele: '🌸 气质',
                mor: '⚖️ 道德',
                str: '💪 力量',
                sen: '🔮 感知',
                mood: '😊 心情',
                gold: '🪙 金币',
                affection: '💕 好感',
                stardustPower: '💫 星尘',
                health: '❤️ 健康'
            };

            const changes = [];

            Object.entries(effects).forEach(([key, value]) => {
                if (key === 'gold') {
                    window.gameState.gold = Math.max(0, window.gameState.gold + value);
                } else if (key === 'mood') {
                    window.gameState.mood = Math.max(0, Math.min(100, window.gameState.mood + value));
                } else if (key === 'affection') {
                    window.gameState.affection = Math.max(0, Math.min(1000, window.gameState.affection + value));
                } else if (key === 'stardustPower') {
                    window.gameState.stardustPower += value;
                } else if (key === 'health') {
                    window.gameState.health = Math.max(0, Math.min(100, window.gameState.health + value));
                } else if (window.gameState.stats[key] !== undefined) {
                    window.gameState.stats[key] = Math.min(999, Math.max(0, window.gameState.stats[key] + value));
                }

                // 记录变化用于显示
                if (value !== 0) {
                    changes.push({ stat: key, value: value, name: statNames[key] || key });
                }
            });

            // 显示属性变化浮窗
            if (changes.length > 0) {
                showImmediateStatChange(changes);
            }
        }

        // 显示即时属性变化浮窗
        function showImmediateStatChange(changes) {
            const popup = document.getElementById('stat-change-popup');
            const content = document.getElementById('stat-change-content');

            if (!popup || !content) return;

            // 生成内容
            let html = '';
            changes.forEach(({ name, value }) => {
                const sign = value > 0 ? '+' : '';
                const className = value > 0 ? 'positive' : (value < 0 ? 'negative' : '');
                html += `
                    <div class="stat-change-item">
                        <span class="stat-change-name">${name}</span>
                        <span class="stat-change-value ${className}">${sign}${value}</span>
                    </div>
                `;
            });

            content.innerHTML = html;

            // 更新标题
            const title = popup.querySelector('.stat-change-title');
            if (title) title.textContent = '📈 属性变化';

            // 显示浮窗
            popup.classList.remove('hide');
            popup.classList.add('show');

            // 3秒后自动消失
            setTimeout(() => {
                popup.classList.remove('show');
                popup.classList.add('hide');
            }, 3500);
        }

        // 将函数暴露到全局作用域
        window.initGame = initGame;
        window.updateUI = updateUI;
        window.selectActivity = selectActivity;
        window.confirmSchedule = confirmSchedule;
        window.applyEffects = applyEffects;
        window.showImmediateStatChange = showImmediateStatChange;

        // 初始化店铺
