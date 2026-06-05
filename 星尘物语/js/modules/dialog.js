        function getDaughterInterest() {
            const stats = window.gameState.stats;
            const interests = [
                { name: '文学', stat: stats.int, type: 'int' },
                { name: '艺术', stat: stats.cha, type: 'art' },
                { name: '剑术', stat: stats.str, type: 'str' },
                { name: '社交', stat: stats.soc, type: 'soc' }
            ];
            interests.sort((a, b) => b.stat - a.stat);
            return interests[0];
        }


        // 与星儿对话 - 新的多轮对话系统
        function talkToXinger() {
            // 检查本月是否还能对话
            if (window.gameState.talkedThisMonth >= window.gameState.maxTalkPerMonth) {
                showNotification('提示', '本月已经和' + window.gameState.daughter.name + '聊过天了，下个月再聊吧~');
                return;
            }

            // 重置对话状态
            currentTalkState = {
                theme: null,
                roundIndex: 0,
                totalEffects: {},
                selectedEmotions: [],
                isEnding: false
            };

            const dialoguePanel = document.getElementById('dialogue-panel');
            dialoguePanel.classList.add('active');

            // 根据当前月份选择对话主题
            const totalMonth = window.gameState.totalMonth;
            let themeData = monthlyThemes[totalMonth];

            // 如果没有特定主题，使用默认对话
            if (!themeData) {
                themeData = generateDefaultTalk();
            }

            currentTalkState.theme = themeData;

            // 显示开场白
            showTalkIntro(themeData.intro);
        }


        // 生成默认对话
        function generateDefaultTalk() {
            const interest = getDaughterInterest();
            const intro = defaultTalks.intro[Math.floor(Math.random() * defaultTalks.intro.length)];
            const topic = defaultTalks.topics[Math.floor(Math.random() * defaultTalks.topics.length)];

            return {
                theme: '日常',
                intro: intro,
                rounds: [
                    {
                        text: topic.text,
                        options: [
                            { text: '真的吗？详细说说', emotion: 'interested', effects: { affection: 6, mood: 5 }, response: topic.responses[0] },
                            { text: '听起来不错', emotion: 'positive', effects: { affection: 4, mood: 3 }, response: topic.responses[1] },
                            { text: '我相信你可以的', emotion: 'encourage', effects: { affection: 5, mor: 3 }, response: topic.responses[2] }
                        ]
                    },
                    {
                        text: '对了爸爸，你觉得我在{{interest}}方面的表现怎么样？',
                        options: [
                            { text: '进步很大，我很欣慰', emotion: 'proud', effects: { affection: 8, mood: 5 }, response: '谢谢爸爸！我会继续努力的！' },
                            { text: '还有进步空间', emotion: 'honest', effects: { affection: 4, interestStat: 5 }, response: '嗯，我知道自己还有很多不足...' },
                            { text: '你已经很棒了', emotion: 'loving', effects: { affection: 10, mood: 10 }, response: '爸爸总是这么支持我...' }
                        ]
                    }
                ]
            };
        }


        // 显示对话开场白
        function showTalkIntro(introText) {
            const speakerAvatar = document.getElementById('speaker-avatar');
            const speakerName = document.getElementById('speaker-name');
            const dialogueText = document.getElementById('dialogue-text');
            const dialogueOptions = document.getElementById('dialogue-options');

            speakerAvatar.textContent = '👧';
            speakerName.textContent = window.gameState.daughter.name;
            dialogueText.textContent = '';
            dialogueOptions.innerHTML = '';

            // 替换变量
            let displayText = introText
                .replace(/星儿/g, window.gameState.daughter.name)
                .replace(/{{interest}}/g, getDaughterInterest().name);

            // 打字机效果
            const chars = Array.from(displayText);
            let charIndex = 0;
            const typeInterval = setInterval(() => {
                if (charIndex < chars.length) {
                    dialogueText.textContent += chars[charIndex];
                    charIndex++;
                } else {
                    clearInterval(typeInterval);
                    // 显示继续按钮进入第一轮
                    showContinueButton(() => showTalkRound(0));
                }
            }, 40);
        }


        // 显示对话轮次
        function showTalkRound(roundIndex) {
            const theme = currentTalkState.theme;
            if (!theme.rounds || roundIndex >= theme.rounds.length) {
                // 对话结束
                endTalk();
                return;
            }

            currentTalkState.roundIndex = roundIndex;
            const round = theme.rounds[roundIndex];

            const dialogueText = document.getElementById('dialogue-text');
            const dialogueOptions = document.getElementById('dialogue-options');

            dialogueText.textContent = '';
            dialogueOptions.innerHTML = '';

            // 替换变量
            let displayText = round.text
                .replace(/星儿/g, window.gameState.daughter.name)
                .replace(/{{interest}}/g, getDaughterInterest().name);

            // 打字机效果
            const chars = Array.from(displayText);
            let charIndex = 0;
            const typeInterval = setInterval(() => {
                if (charIndex < chars.length) {
                    dialogueText.textContent += chars[charIndex];
                    charIndex++;
                } else {
                    clearInterval(typeInterval);
                    // 显示选项
                    showTalkOptions(round.options);
                }
            }, 40);
        }


        // 显示对话选项
        function showTalkOptions(options) {
            const dialogueOptions = document.getElementById('dialogue-options');
            dialogueOptions.innerHTML = '';

            options.forEach(option => {
                const btn = document.createElement('button');
                btn.className = 'dialogue-option';

                // 生成效果描述
                const effectDesc = formatOptionEffects(option.effects);

                btn.innerHTML = `
                    <strong>${option.text}</strong>
                    <br><small style="color: #888;">${effectDesc}</small>
                `;

                btn.onclick = () => handleTalkOption(option);
                dialogueOptions.appendChild(btn);
            });
        }


        // 格式化选项效果描述
        function formatOptionEffects(effects) {
            const parts = [];

            if (effects.affection) parts.push(`好感${effects.affection > 0 ? '+' : ''}${effects.affection}`);
            if (effects.mood) parts.push(`心情${effects.mood > 0 ? '+' : ''}${effects.mood}`);
            if (effects.int) parts.push(`智力${effects.int > 0 ? '+' : ''}${effects.int}`);
            if (effects.cha) parts.push(`魅力${effects.cha > 0 ? '+' : ''}${effects.cha}`);
            if (effects.str) parts.push(`力量${effects.str > 0 ? '+' : ''}${effects.str}`);
            if (effects.soc) parts.push(`社交${effects.soc > 0 ? '+' : ''}${effects.soc}`);
            if (effects.mor) parts.push(`道德${effects.mor > 0 ? '+' : ''}${effects.mor}`);

            return parts.length > 0 ? parts.join(' ') : '互动';
        }


        // 处理对话选项选择
        function handleTalkOption(option) {
            // 累计效果
            Object.entries(option.effects).forEach(([key, value]) => {
                if (currentTalkState.totalEffects[key]) {
                    currentTalkState.totalEffects[key] += value;
                } else {
                    currentTalkState.totalEffects[key] = value;
                }
            });

            currentTalkState.selectedEmotions.push(option.emotion);

            // 显示女儿的回应
            showTalkResponse(option.response, () => {
                // 检查是否还有下一轮
                const nextRound = currentTalkState.roundIndex + 1;
                if (nextRound < currentTalkState.theme.rounds.length) {
                    showTalkRound(nextRound);
                } else {
                    endTalk();
                }
            });
        }


        // 显示女儿的回应
        function showTalkResponse(responseText, callback) {
            const dialogueText = document.getElementById('dialogue-text');
            const dialogueOptions = document.getElementById('dialogue-options');

            dialogueText.textContent = '';
            dialogueOptions.innerHTML = '';

            // 替换变量
            let displayText = responseText.replace(/星儿/g, window.gameState.daughter.name);

            // 打字机效果
            const chars = Array.from(displayText);
            let charIndex = 0;
            const typeInterval = setInterval(() => {
                if (charIndex < chars.length) {
                    dialogueText.textContent += chars[charIndex];
                    charIndex++;
                } else {
                    clearInterval(typeInterval);
                    // 显示继续按钮
                    showContinueButton(callback);
                }
            }, 40);
        }


        // 显示继续按钮
        function showContinueButton(callback) {
            const dialogueOptions = document.getElementById('dialogue-options');
            dialogueOptions.innerHTML = '';

            const btn = document.createElement('button');
            btn.className = 'dialogue-option';
            btn.innerHTML = '<strong>继续</strong>';
            btn.onclick = callback;
            dialogueOptions.appendChild(btn);
        }


        // 结束对话
        function endTalk() {
            const dialoguePanel = document.getElementById('dialogue-panel');
            dialoguePanel.classList.remove('active');

            // 标记本月已对话
            window.gameState.talkedThisMonth++;

            // 应用累计效果
            window.applyEffects(currentTalkState.totalEffects);

            // 显示收益总结
            const effectDesc = formatTalkSummary(currentTalkState.totalEffects);
            showNotification('对话结束', effectDesc);
        }


        // 格式化对话总结
        function formatTalkSummary(effects) {
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
                stardustPower: '💫 星尘'
            };

            const parts = [];
            Object.entries(effects).forEach(([key, value]) => {
                if (value !== 0) {
                    const name = effectNames[key] || key;
                    const sign = value > 0 ? '+' : '';
                    parts.push(`${name} ${sign}${value}`);
                }
            });

            if (parts.length === 0) return '获得了美好的回忆';
            return '获得了：' + parts.join('，');
        }


        // 旧的formatEffects函数保持兼容
        function formatEffects(baseEffects, bonusEffects) {
            return formatTalkSummary({ ...baseEffects, ...bonusEffects });
        }


        // ==================== 外出探索系统 ====================

        // 镇上的地点
        window.townLocations = {
            school: {
                name: '🏫 翡翠学院',
                desc: '镇上唯一的学校，星儿在这里上学。有文化课教室、艺术社团活动室和操场。',
                emoji: '🏫',
                npcs: ['teacher_li', 'teacher_wang', 'teacher_chen'],
                unlockCondition: () => true // 始终可去
            },
            library: {
                name: '📚 大图书馆',
                desc: '收藏着各种古籍和神秘书籍的图书馆，据说地下室有禁书区。',
                emoji: '📚',
                npcs: ['librarian', 'old_scholar'],
                unlockCondition: () => true
            },
            market: {
                name: '🏪 集市广场',
                desc: '热闹的集市，各种商人和冒险者聚集的地方。',
                emoji: '🏪',
                npcs: ['merchant', 'wandering_bard', 'blacksmith'],
                unlockCondition: () => true
            },
            training_hall: {
                name: '⚔️ 武道馆',
                desc: '教授剑术和体能训练的地方，师傅是位严肃的老兵。',
                emoji: '⚔️',
                npcs: ['sword_master'],
                unlockCondition: () => true
            },
            noble_district: {
                name: '🏛️ 贵族区',
                desc: '镇上贵族居住的区域，有茶会和舞会的场所。',
                emoji: '🏛️',
                npcs: ['lady_elena', 'dance_teacher'],
                unlockCondition: () => window.window.gameState.stats.ele >= 50 || window.window.gameState.storyFlags.invited_to_noble_district
            },
            stables: {
                name: '🐴 马厩',
                desc: '饲养和训练马匹的地方，可以学习骑术。',
                emoji: '🐴',
                npcs: ['riding_instructor'],
                unlockCondition: () => true
            },
            forest: {
                name: '🌲 翡翠森林',
                desc: '镇子边缘的古老森林，据说深处有神秘遗迹。',
                emoji: '🌲',
                npcs: ['hermit', 'hunter'],
                unlockCondition: () => true
            },
            square: {
                name: '⛲ 中央广场',
                desc: '镇民聚集的公共场所，经常有各种活动和表演。',
                emoji: '⛲',
                npcs: ['street_performer', 'fortune_teller'],
                unlockCondition: () => true
            }
        };

        // NPC数据
        window.npcs = {
            // 学校老师
            teacher_li: {
                name: '李老师',
                title: '文学老师',
                emoji: '👨‍🏫',
                desc: '温文尔雅的文学老师，擅长诗词和古典文学。',
                firstMeeting: '星儿？啊，你就是新转来的学生。我听说你在绘画方面很有天赋，文学和绘画其实是相通的，都是表达内心的方式。',
                dialogues: [
                    { text: '老师，文学课有什么推荐的读物吗？', unlock: 'literature' },
                    { text: '我想学习写诗...', effect: { int: 1 } },
                    { text: '星儿最近在学校表现怎么样？', effect: { affection: 1 } }
                ],
                onFirstMeet: () => {
                    window.window.gameState.storyFlags.entered_school = true;
                    window.showNotification('解锁新课程', '文学研修已解锁！');
                }
            },
            teacher_wang: {
                name: '王老师',
                title: '数学老师',
                emoji: '👩‍🏫',
                desc: '严谨的数学老师，但私下里其实很关心学生。',
                firstMeeting: '你就是星儿的家长吧？这孩子数学基础不错，但总是心不在焉。如果她能更专注，成绩会很好。',
                dialogues: [
                    { text: '星儿的数学成绩能提高吗？', unlock: 'math' },
                    { text: '数学在生活中有什么用呢？', effect: { int: 1 } },
                    { text: '有什么提高专注力的方法吗？', effect: { mor: 1 } }
                ],
                onFirstMeet: () => {
                    showNotification('解锁新课程', '数学研修已解锁！');
                }
            },
            teacher_chen: {
                name: '陈老师',
                title: '历史老师',
                emoji: '👴',
                desc: '博学多识的历史老师，对星尘大陆的古传说很了解。',
                firstMeeting: '唔...星儿这孩子，总让我想起一些古老的传说。她身上有种特别的气息，就像...不，应该是我多想了。',
                dialogues: [
                    { text: '您知道星尘一族的传说吗？', unlock: 'history', requireFlag: 'heard_legend' },
                    { text: '镇上的历史有什么特别的？', effect: { int: 1, stardustPower: 1 } },
                    { text: '星儿对历史感兴趣吗？', effect: { affection: 1 } }
                ],
                onFirstMeet: () => {
                    showNotification('解锁新课程', '历史研修已解锁！');
                }
            },

            // 艺术老师
            art_teacher: {
                name: '林老师',
                title: '美术老师',
                emoji: '👩‍🎨',
                desc: '自由奔放的艺术家，鼓励学生们发挥创造力。',
                firstMeeting: '星儿！你终于来了！我看过你的画，那种对星空的向往...很有感染力。想不想正式学习绘画？',
                dialogues: [
                    { text: '我想学习绘画！', unlock: 'painting' },
                    { text: '星儿有绘画天赋吗？', effect: { cha: 1 } },
                    { text: '艺术有什么用？', effect: { ele: 1 } }
                ],
                onFirstMeet: () => {
                    window.window.gameState.storyFlags.discovered_art_interest = true;
                    window.showNotification('解锁新课程', '绘画专精已解锁！');
                }
            },
            music_teacher: {
                name: '张老师',
                title: '音乐老师',
                emoji: '👨‍🎤',
                desc: ' former宫廷乐师，现在隐居在镇上教授音乐。',
                firstMeeting: '我听说星儿在庆典上唱了一首歌？那嗓音...有成为歌手的潜质。想不想学音乐？',
                dialogues: [
                    { text: '星儿想学音乐', unlock: 'music' },
                    { text: '唱歌能改变什么？', effect: { cha: 1, mood: 3 } },
                    { text: '您以前是宫廷乐师？', effect: { int: 1, ele: 1 } }
                ],
                onFirstMeet: () => {
                    window.window.gameState.storyFlags.discovered_music_interest = true;
                    window.showNotification('解锁新课程', '音乐专精已解锁！');
                }
            },
            dance_teacher: {
                name: '艾琳娜',
                title: '舞蹈教师',
                emoji: '💃',
                desc: '贵族出身的舞蹈老师，优雅而严格。',
                firstMeeting: '你是星儿的家长吧？这孩子的身体协调性很好。如果经过专业训练，一定能成为优秀的舞者。',
                dialogues: [
                    { text: '我想让星儿学舞蹈', unlock: 'dance' },
                    { text: '舞蹈需要什么条件？', effect: { cha: 1, hp: 2 } },
                    { text: '您能教我礼仪吗？', effect: { ele: 1 } }
                ],
                onFirstMeet: () => {
                    window.window.gameState.storyFlags.discovered_dance_interest = true;
                    window.window.gameState.storyFlags.met_dance_teacher = true;
                    window.showNotification('解锁新课程', '舞蹈专精已解锁！');
                }
            },

            // 武道馆
            sword_master: {
                name: '铁师傅',
                title: '剑术大师',
                emoji: '⚔️',
                desc: '退伍军人，剑术高强，教导学生刚柔并济。',
                firstMeeting: '想要学习剑术？可以。但我有个条件——剑是用来保护重要之人的，不是用来欺负弱小的。',
                dialogues: [
                    { text: '请教我剑术！', unlock: 'sword' },
                    { text: '女孩子学剑术合适吗？', effect: { str: 1, mor: 1 } },
                    { text: '我想增强体质', effect: { hp: 2 } }
                ],
                onFirstMeet: () => {
                    window.window.gameState.storyFlags.met_sword_master = true;
                    window.showNotification('解锁新课程', '剑术特训已解锁！');
                }
            },

            // 马厩
            riding_instructor: {
                name: '老马',
                title: '骑术教练',
                emoji: '🐴',
                desc: '和马打了半辈子交道，对马匹了如指掌。',
                firstMeeting: '想学骑马？好啊，先从照顾马匹开始。记住，马能感受到你的心意。',
                dialogues: [
                    { text: '我想学骑马', unlock: 'riding' },
                    { text: '骑马难吗？', effect: { sen: 1 } },
                    { text: '这匹马叫什么名字？', effect: { affection: 1 } }
                ],
                onFirstMeet: () => {
                    window.window.gameState.storyFlags.met_riding_instructor = true;
                    window.showNotification('解锁新课程', '骑术特训已解锁！');
                }
            },

            // 图书馆
            librarian: {
                name: '馆长',
                title: '图书管理员',
                emoji: '👩‍💼',
                desc: '严肃但内心温柔的老太太，对书籍视若珍宝。',
                firstMeeting: '新面孔？图书馆欢迎你。但如果敢损坏书籍...哼哼，后果自负。',
                dialogues: [
                    { text: '这里有关于星尘一族的书吗？', effect: { stardustPower: 1 }, requireFlag: 'heard_legend' },
                    { text: '有什么推荐的书？', effect: { int: 1 } },
                    { text: '星儿可以来借书吗？', effect: { affection: 1 } }
                ]
            },
            old_scholar: {
                name: '古教授',
                title: '神秘学者',
                emoji: '🧙‍♂️',
                desc: '总是待在图书馆角落研究古籍的神秘老人。',
                firstMeeting: '...你身上的气息...还有那个孩子...有意思，真有意思。（他意味深长地笑了）',
                dialogues: [
                    { text: '您知道星尘之力吗？', effect: { stardustPower: 2, int: 1 }, requireFlag: 'stella_vision' },
                    { text: '您在研究什么？', effect: { int: 1 } },
                    { text: '星儿有什么特别之处吗？', effect: { sen: 1 } }
                ]
            },

            // 集市
            merchant: {
                name: '旅行商人',
                title: '神秘商人',
                emoji: '🧙',
                desc: '四处旅行的商人，偶尔会带来稀奇古怪的商品。',
                firstMeeting: '哦？翡翠镇来了有趣的人啊...我这里有各种各样的东西，来看看吧？',
                dialogues: [
                    { text: '有什么特别的商品？', effect: { gold: -50, stardustPower: 2 } },
                    { text: '您去过很多地方吗？', effect: { soc: 1 } },
                    { text: '听说过星尘一族吗？', effect: { stardustPower: 1 } }
                ],
                onFirstMeet: () => {
                    // 可能触发购物事件
                    if (Math.random() < 0.3) {
                        window.eventQueue.push({ type: 'random', data: window.randomEvents.find(e => e.id === 'merchant_visit') });
                    }
                }
            },
            wandering_bard: {
                name: '吟游诗人',
                title: '流浪艺人',
                emoji: '🎵',
                desc: '弹着古老琴的吟游诗人，唱着星尘之女的传说。',
                firstMeeting: '想听故事吗？我唱一首关于星尘之女的古老歌谣吧...很久很久以前，星尘一族守护着大陆的和平...',
                dialogues: [
                    { text: '再唱一遍那个传说', effect: { stardustPower: 2, cha: 1 } },
                    { text: '星尘之女真的存在吗？', effect: { sen: 1 } },
                    { text: '您能教星儿唱歌吗？', effect: { cha: 1 } }
                ],
                onFirstMeet: () => {
                    window.window.gameState.storyFlags.heard_legend = true;
                    window.showNotification('获得知识', '听到了星尘一族的传说！');
                }
            },
            blacksmith: {
                name: '铁匠大叔',
                title: '铁匠',
                emoji: '🔨',
                desc: '镇上唯一的铁匠，负责打造各种工具和武器。',
                firstMeeting: '需要打造什么？工具、武器，还是...哼，我看你是带女儿来锻炼的吧？',
                dialogues: [
                    { text: '星儿需要一把木剑练习', effect: { str: 1 } },
                    { text: '您认识剑术师傅吗？', effect: { soc: 1 } },
                    { text: '锻造需要什么技巧？', effect: { int: 2, str: 1 } }
                ]
            },

            // 贵族区
            lady_elena: {
                name: '艾琳娜夫人',
                title: '贵族夫人',
                emoji: '👸',
                desc: '镇上有名的贵妇，经常举办茶会和舞会。',
                firstMeeting: '你就是那位收养了孤儿的冒险者？呵呵，有趣。下周有茶会，带你女儿来吧。',
                dialogues: [
                    { text: '我们想参加茶会', unlock: 'tea', effect: { ele: 5 } },
                    { text: '请教贵族礼仪', effect: { ele: 1 } },
                    { text: '星儿也能参加舞会吗？', unlock: 'party', effect: { soc: 5 } }
                ],
                onFirstMeet: () => {
                    window.window.gameState.storyFlags.invited_to_tea = true;
                    window.window.gameState.storyFlags.invited_to_noble_district = true;
                    window.showNotification('解锁新活动', '贵族茶会和舞会已解锁！');
                }
            },

            // 森林
            hermit: {
                name: '隐士',
                title: '森林隐士',
                emoji: '🧙‍♂️',
                desc: '住在森林深处的神秘老人，据说知晓很多秘密。',
                firstMeeting: '星尘的气息...孩子，你收养了一个不得了的存在啊。想知道真相的话，让她来见我。',
                dialogues: [
                    { text: '您知道星儿的身世？', effect: { stardustPower: 10, sen: 5 } },
                    { text: '星儿是什么人？', effect: { stardustPower: 8 } },
                    { text: '您住在这里多久了？', effect: { sen: 1 } }
                ]
            },
            hunter: {
                name: '猎人',
                title: '老猎人',
                emoji: '🏹',
                desc: '经验丰富的猎人，熟悉森林的一草一木。',
                firstMeeting: '想在森林里活动？小心点，深处有危险。不过我看你女儿眼神清澈，应该受森林欢迎。',
                dialogues: [
                    { text: '森林里有什么危险？', effect: { sen: 3, str: 2 } },
                    { text: '请教野外生存技巧', effect: { hp: 5, sen: 3 } },
                    { text: '星儿能来森林探险吗？', effect: { affection: 1 } }
                ]
            },

            // 广场
            street_performer: {
                name: '街头艺人',
                title: '表演者',
                emoji: '🎭',
                desc: '在广场上表演的艺人，擅长杂技和魔术。',
                firstMeeting: '想学表演吗？来，我教你个小把戏！看好了——（他手中突然绽放出光芒）',
                dialogues: [
                    { text: '教我那个魔术！', effect: { cha: 1 } },
                    { text: '星儿想学表演', effect: { cha: 1 } },
                    { text: '您能表演什么节目？', effect: { mood: 5 } }
                ]
            },
            fortune_teller: {
                name: '占卜师',
                title: '神秘占卜师',
                emoji: '🔮',
                desc: '在广场一角摆摊的占卜师，据说能看到未来。',
                firstMeeting: '哦...这个女孩...（她看到星儿后脸色大变）星星的命运...巨大的抉择在前方等待着她...',
                dialogues: [
                    { text: '能为星儿占卜吗？', effect: { stardustPower: 5, sen: 3 } },
                    { text: '什么抉择？', effect: { sen: 5 } },
                    { text: '有化解的方法吗？', effect: { mor: 3 } }
                ],
                onFirstMeet: () => {
                    window.window.gameState.storyFlags.fortune_told = true;
                }
            }
        };

        // 日程活动对话演出 - 每个活动3种随机对话
window.activityScenes = {
            // 文化课
            literature: [
                {
                    speaker: '文学老师',
                    avatar: '👨‍🏫',
                    lines: [
                        { speaker: '文学老师', text: '今天我们学习的是《诗经》中的经典篇章。', avatar: '👨‍🏫' },
                        { speaker: '星儿', text: '「关关雎鸠，在河之洲」...好美的诗句啊。', avatar: '👧' },
                        { speaker: '文学老师', text: '很好，你能感受到文字中的情感，这就是文学的魅力。', avatar: '👨‍🏫' }
                    ]
                },
                {
                    speaker: '文学老师',
                    avatar: '👨‍🏫',
                    lines: [
                        { speaker: '文学老师', text: '今天我们来赏析李白的《将进酒》。', avatar: '👨‍🏫' },
                        { speaker: '星儿', text: '"天生我材必有用，千金散尽还复来"...好豪迈的气概！', avatar: '👧' },
                        { speaker: '文学老师', text: '正是这种豁达的人生态度，让这首诗流传千古。', avatar: '👨‍🏫' }
                    ]
                },
                {
                    speaker: '文学老师',
                    avatar: '👨‍🏫',
                    lines: [
                        { speaker: '星儿', text: '老师，我写了一首小诗，可以请您看看吗？', avatar: '👧' },
                        { speaker: '文学老师', text: '哦？让我看看...嗯，意境清新，很有天赋！', avatar: '👨‍🏫' },
                        { speaker: '星儿', text: '真的吗！我会继续努力的！', avatar: '👧' }
                    ]
                }
            ],
            math: [
                {
                    speaker: '数学老师',
                    avatar: '👩‍🏫',
                    lines: [
                        { speaker: '数学老师', text: '今天我们来学习拉格朗日中值定理。', avatar: '👩‍🏫' },
                        { speaker: '星儿', text: '听起来好难的样子...', avatar: '👧' },
                        { speaker: '数学老师', text: '没关系，跟着我的步骤来，你会发现数学的美妙。', avatar: '👩‍🏫' }
                    ]
                },
                {
                    speaker: '数学老师',
                    avatar: '👩‍🏫',
                    lines: [
                        { speaker: '星儿', text: '老师，这道题我完全不会做...', avatar: '👧' },
                        { speaker: '数学老师', text: '换个角度思考，试试用几何方法来解决。', avatar: '👩‍🏫' },
                        { speaker: '星儿', text: '原来如此！我明白了！', avatar: '👧' }
                    ]
                },
                {
                    speaker: '数学老师',
                    avatar: '👩‍🏫',
                    lines: [
                        { speaker: '数学老师', text: '今天的测试，星儿拿了满分。', avatar: '👩‍🏫' },
                        { speaker: '星儿', text: '太好了！努力没有白费！', avatar: '👧' },
                        { speaker: '数学老师', text: '继续保持，你在数学方面很有天赋。', avatar: '👩‍🏫' }
                    ]
                }
            ],
            history: [
                {
                    speaker: '历史老师',
                    avatar: '👴',
                    lines: [
                        { speaker: '历史老师', text: '今天我们要讲的是星尘大陆的建国史。', avatar: '👴' },
                        { speaker: '星儿', text: '听说初代国王是一位传奇冒险者？', avatar: '👧' },
                        { speaker: '历史老师', text: '没错，正是他用星尘之力统一了这片大陆。', avatar: '👴' }
                    ]
                },
                {
                    speaker: '历史老师',
                    avatar: '👴',
                    lines: [
                        { speaker: '历史老师', text: '同学们，你们知道为什么翡翠镇叫这个名字吗？', avatar: '👴' },
                        { speaker: '星儿', text: '是因为周围森林的颜色像翡翠一样碧绿吗？', avatar: '👧' },
                        { speaker: '历史老师', text: '聪明！传说这里曾有一颗巨大的翡翠矿石。', avatar: '👴' }
                    ]
                },
                {
                    speaker: '历史老师',
                    avatar: '👴',
                    lines: [
                        { speaker: '星儿', text: '老师，古代的人真的会用魔法吗？', avatar: '👧' },
                        { speaker: '历史老师', text: '那是星尘之力，比魔法更加神秘古老。', avatar: '👴' },
                        { speaker: '星儿', text: '好厉害...我也想看看那种力量。', avatar: '👧' }
                    ]
                }
            ],
            // 艺术课
            painting: [
                {
                    speaker: '美术老师',
                    avatar: '👩‍🎨',
                    lines: [
                        { speaker: '美术老师', text: '今天我们来画静物，观察这朵玫瑰的光影变化。', avatar: '👩‍🎨' },
                        { speaker: '星儿', text: '花瓣的层次好复杂，我得慢慢画...', avatar: '👧' },
                        { speaker: '美术老师', text: '很好，你的观察力很敏锐。', avatar: '👩‍🎨' }
                    ]
                },
                {
                    speaker: '美术老师',
                    avatar: '👩‍🎨',
                    lines: [
                        { speaker: '星儿', text: '老师，我可以用蓝色画太阳吗？', avatar: '👧' },
                        { speaker: '美术老师', text: '为什么不可以？艺术没有固定的规则。', avatar: '👩‍🎨' },
                        { speaker: '星儿', text: '太好了！我想画一个梦幻的蓝色黄昏。', avatar: '👧' }
                    ]
                },
                {
                    speaker: '美术老师',
                    avatar: '👩‍🎨',
                    lines: [
                        { speaker: '美术老师', text: '星儿，你的作品被选中去参加镇上的画展了！', avatar: '👩‍🎨' },
                        { speaker: '星儿', text: '真的吗？！太好了！我要告诉爸爸/妈妈！', avatar: '👧' },
                        { speaker: '美术老师', text: '继续保持，你有成为大画家的潜质。', avatar: '👩‍🎨' }
                    ]
                }
            ],
            music: [
                {
                    speaker: '音乐老师',
                    avatar: '👨‍🎤',
                    lines: [
                        { speaker: '音乐老师', text: '今天我们来练习音阶，注意气息的控制。', avatar: '👨‍🎤' },
                        { speaker: '星儿', text: '呼——感觉肺活量不够用了...', avatar: '👧' },
                        { speaker: '音乐老师', text: '每天坚持练习，你的气息会越来越稳的。', avatar: '👨‍🎤' }
                    ]
                },
                {
                    speaker: '音乐老师',
                    avatar: '👨‍🎤',
                    lines: [
                        { speaker: '星儿', text: '老师，这首曲子听起来好悲伤啊...', avatar: '👧' },
                        { speaker: '音乐老师', text: '音乐是情感的载体，试着把你自己的感受融入进去。', avatar: '👨‍🎤' },
                        { speaker: '星儿', text: '嗯...我好像有些理解了。', avatar: '👧' }
                    ]
                },
                {
                    speaker: '音乐老师',
                    avatar: '👨‍🎤',
                    lines: [
                        { speaker: '音乐老师', text: '星儿，你能听出这段旋律中的情感吗？', avatar: '👨‍🎤' },
                        { speaker: '星儿', text: '像是...重逢的喜悦？', avatar: '👧' },
                        { speaker: '音乐老师', text: '答对了！你的乐感越来越好了。', avatar: '👨‍🎤' }
                    ]
                }
            ],
            dance: [
                {
                    speaker: '舞蹈老师',
                    avatar: '💃',
                    lines: [
                        { speaker: '舞蹈老师', text: '一、二、三、四，注意脚尖的弧度！', avatar: '💃' },
                        { speaker: '星儿', text: '唔...腿好酸，但是我会坚持的！', avatar: '👧' },
                        { speaker: '舞蹈老师', text: '很好，优美的舞姿需要坚强的意志。', avatar: '💃' }
                    ]
                },
                {
                    speaker: '舞蹈老师',
                    avatar: '💃',
                    lines: [
                        { speaker: '舞蹈老师', text: '今天学习旋转技巧，记得保持身体的中心线。', avatar: '💃' },
                        { speaker: '星儿', text: '哇——转起来了！但是有点晕...', avatar: '👧' },
                        { speaker: '舞蹈老师', text: '多练习就会适应的，你已经做得很好了。', avatar: '💃' }
                    ]
                },
                {
                    speaker: '舞蹈老师',
                    avatar: '💃',
                    lines: [
                        { speaker: '星儿', text: '老师，跳舞的时候怎么才能更优雅呢？', avatar: '👧' },
                        { speaker: '舞蹈老师', text: '想象自己是一只天鹅，舒展、自信、从容。', avatar: '💃' },
                        { speaker: '星儿', text: '天鹅...我会努力的！', avatar: '👧' }
                    ]
                }
            ],
            // 体能训练
            sword: [
                {
                    speaker: '剑术师傅',
                    avatar: '⚔️',
                    lines: [
                        { speaker: '剑术师傅', text: '握剑要稳，出剑要准，心要静！', avatar: '⚔️' },
                        { speaker: '星儿', text: '哈！——是这样吗，师傅？', avatar: '👧' },
                        { speaker: '剑术师傅', text: '有进步，但手腕还要再有力一些。', avatar: '⚔️' }
                    ]
                },
                {
                    speaker: '剑术师傅',
                    avatar: '⚔️',
                    lines: [
                        { speaker: '星儿', text: '师傅，女孩子练剑会不会很奇怪？', avatar: '👧' },
                        { speaker: '剑术师傅', text: '剑不分男女，强者为尊。历史上可有不少女剑豪！', avatar: '⚔️' },
                        { speaker: '星儿', text: '嗯！我要成为最强的女剑士！', avatar: '👧' }
                    ]
                },
                {
                    speaker: '剑术师傅',
                    avatar: '⚔️',
                    lines: [
                        { speaker: '剑术师傅', text: '今天的对练，你用新学的招式攻过来。', avatar: '⚔️' },
                        { speaker: '星儿', text: '看招！——呀！', avatar: '👧' },
                        { speaker: '剑术师傅', text: '不错，这一招已有三分火候。', avatar: '⚔️' }
                    ]
                }
            ],
            fitness: [
                {
                    speaker: '体能教练',
                    avatar: '💪',
                    lines: [
                        { speaker: '体能教练', text: '再来十个俯卧撑！坚持住！', avatar: '💪' },
                        { speaker: '星儿', text: '七...八...呼...快不行了...', avatar: '👧' },
                        { speaker: '体能教练', text: '最后两个！你可以的！', avatar: '💪' }
                    ]
                },
                {
                    speaker: '体能教练',
                    avatar: '💪',
                    lines: [
                        { speaker: '星儿', text: '教练，我跑完五圈了...', avatar: '👧' },
                        { speaker: '体能教练', text: '不错，速度比上周快了不少。', avatar: '💪' },
                        { speaker: '星儿', text: '真的吗？我...呼...有进步？', avatar: '👧' }
                    ]
                },
                {
                    speaker: '体能教练',
                    avatar: '💪',
                    lines: [
                        { speaker: '体能教练', text: '体能训练虽然辛苦，但身体是最重要的本钱。', avatar: '💪' },
                        { speaker: '星儿', text: '嗯！我要变得健康又强壮！', avatar: '👧' },
                        { speaker: '体能教练', text: '就是这种精神！休息五分钟，继续下一组！', avatar: '💪' }
                    ]
                }
            ],
            riding: [
                {
                    speaker: '马术教练',
                    avatar: '🐴',
                    lines: [
                        { speaker: '马术教练', text: '上马时要轻盈，双腿夹紧马腹。', avatar: '🐴' },
                        { speaker: '星儿', text: '哇——好高！有点害怕...', avatar: '👧' },
                        { speaker: '马术教练', text: '别怕，相信你的伙伴，它会保护你的。', avatar: '🐴' }
                    ]
                },
                {
                    speaker: '马术教练',
                    avatar: '🐴',
                    lines: [
                        { speaker: '星儿', text: '这匹马叫什么名字呀？', avatar: '👧' },
                        { speaker: '马术教练', text: '它叫「闪电」，是这里最温顺的母马。', avatar: '🐴' },
                        { speaker: '星儿', text: '闪电，今天请多多指教哦~', avatar: '👧' }
                    ]
                },
                {
                    speaker: '马术教练',
                    avatar: '🐴',
                    lines: [
                        { speaker: '马术教练', text: '今天试试小跑，随着马的节奏起伏身体。', avatar: '🐴' },
                        { speaker: '星儿', text: '哒哒哒...这种感觉好奇妙！', avatar: '👧' },
                        { speaker: '马术教练', text: '很好，你已经掌握了骑乘的感觉。', avatar: '🐴' }
                    ]
                }
            ],
            // 社交活动
            social: [
                {
                    speaker: '朋友小明',
                    avatar: '👦',
                    lines: [
                        { speaker: '朋友小明', text: '星儿，周末一起去钓鱼怎么样？', avatar: '👦' },
                        { speaker: '星儿', text: '好呀！不过我可能不太会...', avatar: '👧' },
                        { speaker: '朋友小明', text: '没关系，我教你！咱们是朋友嘛！', avatar: '👦' }
                    ]
                },
                {
                    speaker: '朋友小红',
                    avatar: '👧',
                    lines: [
                        { speaker: '朋友小红', text: '星儿，听说你最近在学画画？', avatar: '👧' },
                        { speaker: '星儿', text: '嗯！你要不要看看我的作品？', avatar: '👧' },
                        { speaker: '朋友小红', text: '哇，画得好棒！可以教我吗？', avatar: '👧' }
                    ]
                },
                {
                    speaker: '朋友阿杰',
                    avatar: '👦',
                    lines: [
                        { speaker: '朋友阿杰', text: '星儿，你听说过镇外的遗迹吗？', avatar: '👦' },
                        { speaker: '星儿', text: '遗迹？是那种古老的地方吗？', avatar: '👧' },
                        { speaker: '朋友阿杰', text: '是啊，据说那里有神秘的宝藏呢！', avatar: '👦' }
                    ]
                }
            ],
            tea: [
                {
                    speaker: '贵族小姐',
                    avatar: '👸',
                    lines: [
                        { speaker: '贵族小姐', text: '星儿小姐，请用这道伯爵茶。', avatar: '👸' },
                        { speaker: '星儿', text: '谢谢...这个香味好特别。', avatar: '👧' },
                        { speaker: '贵族小姐', text: '这是从南方运来的上等茶叶。', avatar: '👸' }
                    ]
                },
                {
                    speaker: '茶会主人',
                    avatar: '🫖',
                    lines: [
                        { speaker: '茶会主人', text: '各位，今天的茶点是我亲手做的。', avatar: '🫖' },
                        { speaker: '星儿', text: '这个饼干好精致，像艺术品一样！', avatar: '👧' },
                        { speaker: '茶会主人', text: '喜欢就多吃一些，别客气。', avatar: '🫖' }
                    ]
                },
                {
                    speaker: '贵族夫人',
                    avatar: '👩',
                    lines: [
                        { speaker: '贵族夫人', text: '星儿，你的举止越来越优雅了。', avatar: '👩' },
                        { speaker: '星儿', text: '多亏了您上次的指点。', avatar: '👧' },
                        { speaker: '贵族夫人', text: '谦逊也是一种美德，继续保持。', avatar: '👩' }
                    ]
                }
            ],
            party: [
                {
                    speaker: '舞会主持人',
                    avatar: '🎭',
                    lines: [
                        { speaker: '舞会主持人', text: '女士们先生们，音乐响起了！', avatar: '🎭' },
                        { speaker: '星儿', text: '哇，好热闹啊...不知道有没有人邀我跳舞...', avatar: '👧' },
                        { speaker: '绅士', text: '美丽的小姐，可以请你跳支舞吗？', avatar: '🤵' }
                    ]
                },
                {
                    speaker: '乐师',
                    avatar: '🎻',
                    lines: [
                        { speaker: '星儿', text: '这首曲子好欢快，让人想转圈~', avatar: '👧' },
                        { speaker: '乐师', text: '小姐也喜欢音乐吗？', avatar: '🎻' },
                        { speaker: '星儿', text: '嗯！我也在学习音乐呢！', avatar: '👧' }
                    ]
                },
                {
                    speaker: '贵族少女',
                    avatar: '👸',
                    lines: [
                        { speaker: '贵族少女', text: '你就是星儿吧？我听说过你。', avatar: '👸' },
                        { speaker: '星儿', text: '啊？我...我只是个普通人...', avatar: '👧' },
                        { speaker: '贵族少女', text: '别谦虚了，你的气质很特别呢。', avatar: '👸' }
                    ]
                }
            ],
            // 自由活动
            explore: [
                {
                    speaker: '星儿',
                    avatar: '👧',
                    lines: [
                        { speaker: '星儿', text: '森林里会有什么有趣的东西呢？', avatar: '👧' },
                        { speaker: '星儿', text: '啊！是一只小松鼠！好可爱~', avatar: '👧' },
                        { speaker: '星儿', text: '大自然真的很美妙，下次还要来探险！', avatar: '👧' }
                    ]
                },
                {
                    speaker: '星儿',
                    avatar: '👧',
                    lines: [
                        { speaker: '星儿', text: '咦？那边有个奇怪的石头...', avatar: '👧' },
                        { speaker: '星儿', text: '上面好像刻着什么古老的文字。', avatar: '👧' },
                        { speaker: '星儿', text: '带回去给爸爸/妈妈看看吧！', avatar: '👧' }
                    ]
                },
                {
                    speaker: '星儿',
                    avatar: '👧',
                    lines: [
                        { speaker: '星儿', text: '山顶的风景应该很美...', avatar: '👧' },
                        { speaker: '星儿', text: '呼...终于爬上来了！', avatar: '👧' },
                        { speaker: '星儿', text: '哇——整个翡翠镇都看得见！', avatar: '👧' }
                    ]
                }
            ],
            fishing: [
                {
                    speaker: '老渔夫',
                    avatar: '👴',
                    lines: [
                        { speaker: '老渔夫', text: '小姑娘，钓鱼要耐心，不能急躁。', avatar: '👴' },
                        { speaker: '星儿', text: '鱼儿怎么还不上钩呢...', avatar: '👧' },
                        { speaker: '老渔夫', text: '嘘——来了，收杆！', avatar: '👴' }
                    ]
                },
                {
                    speaker: '星儿',
                    avatar: '👧',
                    lines: [
                        { speaker: '星儿', text: '今天的天气真好，适合钓鱼。', avatar: '👧' },
                        { speaker: '星儿', text: '啊！上钩了！好大的力气！', avatar: '👧' },
                        { speaker: '星儿', text: '是一条大鱼！今晚可以加菜了~', avatar: '👧' }
                    ]
                },
                {
                    speaker: '钓友阿强',
                    avatar: '👨',
                    lines: [
                        { speaker: '钓友阿强', text: '小姑娘，你的饵下得不对。', avatar: '👨' },
                        { speaker: '星儿', text: '是吗？请问应该怎么下饵呢？', avatar: '👧' },
                        { speaker: '钓友阿强', text: '来，我教你，钓鱼可是门学问。', avatar: '👨' }
                    ]
                }
            ],
            rest: [
                {
                    speaker: '星儿',
                    avatar: '👧',
                    lines: [
                        { speaker: '星儿', text: '终于能好好休息了...', avatar: '👧' },
                        { speaker: '星儿', text: '躺在草地上看云，真舒服~', avatar: '👧' },
                        { speaker: '星儿', text: '好像睡着了...做了个甜甜的梦。', avatar: '👧' }
                    ]
                },
                {
                    speaker: '星儿',
                    avatar: '👧',
                    lines: [
                        { speaker: '星儿', text: '今天什么都不做，就发呆吧。', avatar: '👧' },
                        { speaker: '星儿', text: '感觉压力都消失了...', avatar: '👧' },
                        { speaker: '星儿', text: '休息好了，明天继续努力！', avatar: '👧' }
                    ]
                },
                {
                    speaker: '星儿',
                    avatar: '👧',
                    lines: [
                        { speaker: '星儿', text: '读一本喜欢的小说，喝杯热茶...', avatar: '👧' },
                        { speaker: '星儿', text: '这才是生活啊~', avatar: '👧' },
                        { speaker: '星儿', text: '嗯！整个人都精神多了！', avatar: '👧' }
                    ]
                }
            ],
            // 打工
            work1: [
                {
                    speaker: '杂货店老板',
                    avatar: '👨‍💼',
                    lines: [
                        { speaker: '杂货店老板', text: '星儿，把这箱货物搬到货架上。', avatar: '👨‍💼' },
                        { speaker: '星儿', text: '好的老板，这个重不重啊...', avatar: '👧' },
                        { speaker: '杂货店老板', text: '小心点，放那边就行。', avatar: '👨‍💼' }
                    ]
                },
                {
                    speaker: '顾客大婶',
                    avatar: '👩',
                    lines: [
                        { speaker: '顾客大婶', text: '小姑娘，盐在哪里？', avatar: '👩' },
                        { speaker: '星儿', text: '在那边第二个架子，我带您去！', avatar: '👧' },
                        { speaker: '顾客大婶', text: '真乖，谢谢啦！', avatar: '👩' }
                    ]
                },
                {
                    speaker: '杂货店老板',
                    avatar: '👨‍💼',
                    lines: [
                        { speaker: '杂货店老板', text: '今天生意不错，辛苦你了。', avatar: '👨‍💼' },
                        { speaker: '星儿', text: '不辛苦！我学到了很多。', avatar: '👧' },
                        { speaker: '杂货店老板', text: '这是你的工钱，拿着吧。', avatar: '👨‍💼' }
                    ]
                }
            ],
            work2: [
                {
                    speaker: '图书管理员',
                    avatar: '👩‍💼',
                    lines: [
                        { speaker: '图书管理员', text: '这些书按编号放回原位。', avatar: '👩‍💼' },
                        { speaker: '星儿', text: '好的，我会小心的。', avatar: '👧' },
                        { speaker: '图书管理员', text: '对了，那本古书放特别收藏室。', avatar: '👩‍💼' }
                    ]
                },
                {
                    speaker: '借阅者',
                    avatar: '👨‍🎓',
                    lines: [
                        { speaker: '借阅者', text: '请问这本《星尘大陆史》可以借吗？', avatar: '👨‍🎓' },
                        { speaker: '星儿', text: '让我查一下...可以借，为期两周。', avatar: '👧' },
                        { speaker: '借阅者', text: '谢谢，你工作很认真呢。', avatar: '👨‍🎓' }
                    ]
                },
                {
                    speaker: '图书管理员',
                    avatar: '👩‍💼',
                    lines: [
                        { speaker: '图书管理员', text: '星儿，整理完书可以休息会儿。', avatar: '👩‍💼' },
                        { speaker: '星儿', text: '谢谢，我可以看一会儿书吗？', avatar: '👧' },
                        { speaker: '图书管理员', text: '当然，这是你的福利~', avatar: '👩‍💼' }
                    ]
                }
            ],
            work3: [
                {
                    speaker: '炼金术士',
                    avatar: '🧙‍♂️',
                    lines: [
                        { speaker: '炼金术士', text: '把这三种材料按顺序加入坩埚。', avatar: '🧙‍♂️' },
                        { speaker: '星儿', text: '红色、蓝色、然后绿色...这样吗？', avatar: '👧' },
                        { speaker: '炼金术士', text: '对！反应很完美。', avatar: '🧙‍♂️' }
                    ]
                },
                {
                    speaker: '炼金术士',
                    avatar: '🧙‍♂️',
                    lines: [
                        { speaker: '炼金术士', text: '今天来炼制一些治疗药水。', avatar: '🧙‍♂️' },
                        { speaker: '星儿', text: '这些草药的配比是多少？', avatar: '👧' },
                        { speaker: '炼金术士', text: '3:2:1，你的记忆力很好。', avatar: '🧙‍♂️' }
                    ]
                },
                {
                    speaker: '炼金术士',
                    avatar: '🧙‍♂️',
                    lines: [
                        { speaker: '炼金术士', text: '星儿，你能感受到材料中的魔力吗？', avatar: '🧙‍♂️' },
                        { speaker: '星儿', text: '嗯...好像有一种温暖的感觉？', avatar: '👧' },
                        { speaker: '炼金术士', text: '哦？你很有炼金术士的潜质啊。', avatar: '🧙‍♂️' }
                    ]
                }
            ]
        };

        // 日程演出队列
window.scheduleSceneQueue = [];
window.currentSceneLineIndex = 0;
window.currentScene = null;

        // ==================== 核心功能 ====================

        // ==================== 外出探索系统功能 ====================

        // 当前探索状态
        window.exploreState = {
            currentLocation: null,
            visitedNPCs: [],
            metNPCs: new Set(),
            currentNPC: null,
            // 本次外出的限制记录
            dailyLimits: {
                exploreCount: 0,
                maxExploreCount: 2,  // 每个地点最多探索2次
                npcTalked: new Set(), // 记录本次外出已对话的NPC
                maxNpcTalksPerNPC: 1, // 每个NPC每次外出最多对话1次获得属性
                totalNpcTalks: 0,     // 本次外出总对话次数
                maxTotalNpcTalks: 3   // 每次外出最多与3个NPC对话获得属性
            }
        };

        // 重置每日限制
        function resetDailyLimits() {
            window.exploreState.dailyLimits = {
                exploreCount: 0,
                maxExploreCount: 2,
                npcTalked: new Set(),
                maxNpcTalksPerNPC: 1,
                totalNpcTalks: 0,
                maxTotalNpcTalks: 3
            };
        }


        // NPC好感度数据
        window.npcAffection = window.npcAffection || {};

        // 关系等级定义
        const relationshipLevels = [
            { level: 0, name: '陌生人', min: 0, max: 20 },
            { level: 1, name: '点头之交', min: 20, max: 50 },
            { level: 2, name: '普通朋友', min: 50, max: 100 },
            { level: 3, name: '好朋友', min: 100, max: 200 },
            { level: 4, name: '亲密挚友', min: 200, max: 350 },
            { level: 5, name: '至交', min: 350, max: 500 },
            { level: 6, name: '知己', min: 500, max: 1000 }
        ];

        // 关系描述
        const relationshipDescriptions = [
            '你们素未谋面',
            '你们只是见过几次面',
            '你们偶尔会聊聊天',
            '你们经常一起交流',
            '你们彼此信任',
            '你们是无话不谈的好友',
            '你们是心灵相通的知己'
        ];

        // 打开外出探索面板
        function openExplorePanel() {
            const panel = document.getElementById('explore-panel');
            const content = document.getElementById('explore-locations');

            // 生成地点列表 - 美少女梦工厂风格卡片
            let html = '';
            for (const [key, location] of Object.entries(window.townLocations || {})) {
                const isUnlocked = location.unlockCondition ? location.unlockCondition() : true;
                const lockedClass = isUnlocked ? '' : 'locked';
                const lockedText = isUnlocked ? '' : '<div class="lock-reason">🔒 需要特定条件解锁</div>';

                // 计算该地点的NPC数量
                const npcCount = location.npcs ? location.npcs.length : 0;
                const npcText = npcCount > 0 ? `${npcCount}位可结识人物` : '暂无NPC';

                html += '<div class="location-card ' + lockedClass + '" data-location="' + key + '">' +
                    '<div class="location-emoji">' + location.emoji + '</div>' +
                    '<div class="location-name">' + location.name + '</div>' +
                    '<div class="location-desc">' + location.desc + '</div>' +
                    '<div class="location-meta">' +
                        '<span>👥 ' + npcText + '</span>' +
                    '</div>' +
                    lockedText +
                    (isUnlocked ? '<button class="visit-btn" onclick="visitLocation(\'' + key + '\')">✨ 前往探索</button>' : '') +
                '</div>';
            }

            content.innerHTML = html;
            document.getElementById('overlay').classList.add('active');
            panel.classList.add('active');
        }


        // 前往某个地点 - 美少女梦工厂风格全屏场景
        function visitLocation(locationId) {
            console.log('visitLocation called with:', locationId);

            const location = window.townLocations[locationId];
            if (!location) {
                console.error('Location not found:', locationId);
                return;
            }

            window.exploreState.currentLocation = locationId;
            window.exploreState.visitedNPCs = [];
            // 重置每日限制（每次前往新地点时重置）
            resetDailyLimits();
            // 确保 npcAffection 已初始化
            if (!window.npcAffection) {
                window.npcAffection = {};
            }

            const detailPanel = document.getElementById('location-detail');
            const sceneArea = document.getElementById('location-scene');
            const decoration = document.getElementById('scene-decoration');
            const title = document.getElementById('scene-title');
            const desc = document.getElementById('scene-desc');
            const atmosphere = document.getElementById('scene-atmosphere');
            const npcSection = document.getElementById('npc-section');

            console.log('DOM elements:', { detailPanel, sceneArea, decoration, title, desc, atmosphere, npcSection });

            // 设置场景背景
            sceneArea.className = 'location-scene ' + locationId;
            decoration.textContent = location.emoji;
            title.textContent = location.name;
            desc.textContent = location.desc;

            // 生成氛围描述
            const atmospheres = {
                school: '📚 书香气息浓厚，可以听到孩子们的读书声',
                library: '🕯️ 安静而神秘，仿佛能闻到旧书的味道',
                market: '🎪 热闹非凡，充满了生活气息',
                training_hall: '⚔️ 严肃而专注，能闻到汗水与木剑的气息',
                noble_district: '🌹 优雅而高贵，处处透露着精致',
                stables: '🐴 自然清新，伴随着马匹的嘶鸣',
                forest: '🌲 神秘而宁静，充满了大自然的气息',
                square: '⛲ 热闹繁华，镇民们的欢声笑语此起彼伏'
            };
            atmosphere.textContent = atmospheres[locationId] || '✨ 这里有着独特的氛围';

            // 生成NPC立绘卡片
            let npcsHtml = '';
            console.log('Generating NPCs for location:', locationId, 'NPCs:', location.npcs);
            if (location.npcs && location.npcs.length > 0) {
                location.npcs.forEach((npcId, index) => {
                    const npc = window.npcs[npcId];
                    console.log('Processing NPC:', npcId, npc);
                    if (npc) {
                        const hasMet = window.exploreState.metNPCs.has(npcId);
                        const metClass = hasMet ? '' : 'new';
                        const affection = window.npcAffection[npcId] || 0;
                        const hearts = generateHearts(affection);

                        npcsHtml += '<div class="npc-portrait-card ' + metClass + ' animate-slide-in" ' +
                            'style="animation-delay: ' + (index * 0.1) + 's" ' +
                            'onclick="openNPCInteraction(\'' + npcId + '\')">' +
                            '<div class="npc-portrait">' + npc.emoji + '</div>' +
                            '<div class="npc-portrait-name">' + npc.name + '</div>' +
                            '<div class="npc-portrait-title">' + npc.title + '</div>' +
                            '<div class="affection-bar">' +
                                '<div class="affection-hearts">' + hearts + '</div>' +
                            '</div>' +
                        '</div>';
                    }
                });
            }
            console.log('Generated NPC HTML:', npcsHtml.substring(0, 200) + '...');
            npcSection.innerHTML = npcsHtml;

            // 关闭外出面板，显示地点详情面板
            const explorePanel = document.getElementById('explore-panel');
            if (explorePanel) {
                explorePanel.classList.remove('active');
            }
            detailPanel.classList.add('active');
            console.log('Location detail panel activated');


            // 添加进入动画
            setTimeout(() => {
                npcSection.querySelectorAll('.npc-portrait-card').forEach((card, i) => {
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, i * 100);
                });
            }, 100);
        }


        // 生成好感度爱心
        function generateHearts(affection) {
            const maxHearts = 5;
            const filledHearts = Math.min(maxHearts, Math.floor(affection / 100) + 1);
            let hearts = '';
            for (let i = 0; i < maxHearts; i++) {
                hearts += '<span class="heart ' + (i < filledHearts ? 'filled' : '') + '">♥</span>';
            }
            return hearts;
        }


        // 获取关系等级信息
        function getRelationshipInfo(affection) {
            for (let i = relationshipLevels.length - 1; i >= 0; i--) {
                if (affection >= relationshipLevels[i].min) {
                    return {
                        ...relationshipLevels[i],
                        description: relationshipDescriptions[i],
                        progress: Math.min(100, ((affection - relationshipLevels[i].min) /
                            (relationshipLevels[i].max - relationshipLevels[i].min)) * 100)
                    };
                }
            }
            return { ...relationshipLevels[0], description: relationshipDescriptions[0], progress: 0 };
        }


        // 打开NPC互动面板
        function openNPCInteraction(npcId) {
            const npc = window.npcs[npcId];
            if (!npc) return;

            window.exploreState.currentNPC = npcId;
            const hasMet = window.exploreState.metNPCs.has(npcId);
            const isFirstMeeting = !hasMet;

            const panel = document.getElementById('npc-interaction-panel');
            const portrait = document.getElementById('npc-detail-portrait');
            const name = document.getElementById('npc-detail-name');
            const title = document.getElementById('npc-detail-title');
            const bio = document.getElementById('npc-bio');
            const level = document.getElementById('relationship-level');
            const bar = document.getElementById('relationship-bar');
            const text = document.getElementById('relationship-text');
            const options = document.getElementById('interaction-options');

            // 初始化好感度数据
            if (!window.npcAffection[npcId]) {
                window.npcAffection[npcId] = 0;
            }

            const affection = window.npcAffection[npcId];
            const relInfo = getRelationshipInfo(affection);

            // 更新NPC信息
            portrait.textContent = npc.emoji;
            name.textContent = npc.name;
            title.textContent = npc.title;
            bio.textContent = npc.desc || '一位神秘的人物...';
            level.textContent = relInfo.name;
            bar.style.width = relInfo.progress + '%';
            text.textContent = relInfo.description;

            // 生成互动选项
            options.innerHTML = '';

            // 对话选项
            const talkBtn = document.createElement('button');
            talkBtn.className = 'interaction-btn';
            talkBtn.innerHTML = `
                <span class="icon">💬</span>
                <span class="info">
                    <span class="label">${isFirstMeeting ? '初次见面' : '闲聊'}</span>
                    <span class="desc">${isFirstMeeting ? '第一次与' + npc.name + '交谈' : '与' + npc.name + '聊聊近况'}</span>
                </span>
            `;
            talkBtn.onclick = () => {
                closeNPCInteraction();
                // 如果是第一次见，执行首次见面回调
                if (isFirstMeeting && npc.onFirstMeet) {
                    npc.onFirstMeet();
                    window.exploreState.metNPCs.add(npcId);
                }
                // 增加好感度
                increaseAffection(npcId, 5);
                showNPCDialogue(npc, isFirstMeeting);
            };
            options.appendChild(talkBtn);

            // 深入了解选项（已认识才能用）
            if (hasMet && npc.dialogues && npc.dialogues.length > 0) {
                const discussBtn = document.createElement('button');
                discussBtn.className = 'interaction-btn';
                discussBtn.innerHTML = `
                    <span class="icon">📖</span>
                    <span class="info">
                        <span class="label">深入交流</span>
                        <span class="desc">探讨特定话题，可能获得知识或解锁内容</span>
                    </span>
                `;
                discussBtn.onclick = () => {
                    closeNPCInteraction();
                    showNPCDialogue(npc, false);
                };
                options.appendChild(discussBtn);
            }

            // 送礼选项
            const giftBtn = document.createElement('button');
            giftBtn.className = 'interaction-btn';
            giftBtn.innerHTML = `
                <span class="icon">🎁</span>
                <span class="info">
                    <span class="label">赠送礼物</span>
                    <span class="desc">选择合适的礼物来提升好感度</span>
                </span>
            `;
            giftBtn.onclick = () => {
                openGiftPanel(npcId);
            };
            options.appendChild(giftBtn);

            // 约会/邀请选项（好感度足够时解锁）
            if (affection >= 100) {
                const dateBtn = document.createElement('button');
                dateBtn.className = 'interaction-btn';
                dateBtn.innerHTML = `
                    <span class="icon">🌸</span>
                    <span class="info">
                        <span class="label">共度时光</span>
                        <span class="desc">邀请${npc.name}一起度过美好时光（好感度+20）</span>
                    </span>
                `;
                dateBtn.onclick = () => {
                    closeNPCInteraction();
                    increaseAffection(npcId, 20);
                    showDateScene(npc);
                };
                options.appendChild(dateBtn);
            }

            // 显示面板
            panel.classList.add('active');
        }


        // 关闭NPC互动面板
        function closeNPCInteraction() {
            const panel = document.getElementById('npc-interaction-panel');
            panel.classList.remove('active');
            window.exploreState.currentNPC = null;
        }


        // 增加好感度
        function increaseAffection(npcId, amount) {
            if (!window.npcAffection[npcId]) {
                window.npcAffection[npcId] = 0;
            }
            const oldAffection = window.npcAffection[npcId];
            window.npcAffection[npcId] = Math.min(1000, window.npcAffection[npcId] + amount);

            // 检查是否升级了关系
            const oldLevel = getRelationshipInfo(oldAffection);
            const newLevel = getRelationshipInfo(window.npcAffection[npcId]);
            if (newLevel.level > oldLevel.level) {
                window.showNotification('关系升级', `与${window.npcs[npcId].name}的关系提升至「${newLevel.name}」！`);
            }
        }


        // 送礼面板
        const giftItems = [
            { id: 'flower', emoji: '🌹', name: '鲜花', effect: '好感+10', affection: 10, cost: 50 },
            { id: 'book', emoji: '📚', name: '精装书', effect: '好感+15', affection: 15, cost: 100 },
            { id: 'tea', emoji: '🍵', name: '上等茶叶', effect: '好感+20', affection: 20, cost: 150 },
            { id: 'jewelry', emoji: '💎', name: '精致饰品', effect: '好感+30', affection: 30, cost: 300 },
            { id: 'wine', emoji: '🍷', name: '陈年美酒', effect: '好感+25', affection: 25, cost: 200 },
            { id: 'chocolate', emoji: '🍫', name: '手工巧克力', effect: '好感+12', affection: 12, cost: 80 }
        ];

        function openGiftPanel(npcId) {
            const panel = document.getElementById('gift-panel');
            const grid = document.getElementById('gift-grid');

            grid.innerHTML = '';
            giftItems.forEach(item => {
                const canAfford = window.gameState.gold >= item.cost;
                const giftDiv = document.createElement('div');
                giftDiv.className = 'gift-item';
                if (!canAfford) {
                    giftDiv.style.opacity = '0.5';
                    giftDiv.style.cursor = 'not-allowed';
                }
                giftDiv.innerHTML = `
                    <div class="emoji">${item.emoji}</div>
                    <div class="name">${item.name}</div>
                    <div class="effect">${item.effect}</div>
                    <div class="effect" style="color: ${canAfford ? '#FFD700' : '#ff6666'};">${item.cost}🪙</div>
                `;
                if (canAfford) {
                    giftDiv.onclick = () => {
                        window.gameState.gold -= item.cost;
                        increaseAffection(npcId, item.affection);
                        closeGiftPanel();
                        closeNPCInteraction();
                        window.showNotification('送礼成功', `送给${window.npcs[npcId].name}${item.name}，好感度+${item.affection}！`);
                        // 显示NPC感谢对话
                        showNPCThanks(window.npcs[npcId], item);
                    };
                }
                grid.appendChild(giftDiv);
            });

            panel.classList.add('active');
        }


        function closeGiftPanel() {
            const panel = document.getElementById('gift-panel');
            panel.classList.remove('active');
        }


        // 显示NPC收到礼物的感谢
        function showNPCThanks(npc, gift) {
            const dialoguePanel = document.getElementById('dialogue-panel');
            const speakerAvatar = document.getElementById('speaker-avatar');
            const speakerName = document.getElementById('speaker-name');
            const dialogueText = document.getElementById('dialogue-text');
            const dialogueOptions = document.getElementById('dialogue-options');

            speakerAvatar.textContent = npc.emoji;
            speakerName.textContent = npc.name;
            dialogueText.textContent = '';
            dialogueOptions.innerHTML = '';

            const thanksText = `哇！这是${gift.name}吗？太感谢了！我会好好珍惜的。`;

            typeText(thanksText, dialogueText, () => {
                const btn = document.createElement('button');
                btn.className = 'dialogue-option';
                btn.innerHTML = '<strong>不客气</strong>';
                btn.onclick = () => closeNPCDialogue();
                dialogueOptions.appendChild(btn);
            });

            dialoguePanel.classList.add('active');
        }


        // 显示约会场景
        function showDateScene(npc) {
            const dialoguePanel = document.getElementById('dialogue-panel');
            const speakerAvatar = document.getElementById('speaker-avatar');
            const speakerName = document.getElementById('speaker-name');
            const dialogueText = document.getElementById('dialogue-text');
            const dialogueOptions = document.getElementById('dialogue-options');

            speakerAvatar.textContent = npc.emoji;
            speakerName.textContent = npc.name;
            dialogueText.textContent = '';
            dialogueOptions.innerHTML = '';

            const dateScenes = [
                `和${npc.name}一起度过了愉快的时光。你们聊了很多有趣的话题，感觉彼此更加亲近了。`,
                `${npc.name}带你参观了平时不对外开放的区域，这是只有好朋友才能享受的特权。`,
                `你们一起品茶赏景，${npc.name}说了许多心里话，你们的关系更加深厚了。`
            ];
            const sceneText = dateScenes[Math.floor(Math.random() * dateScenes.length)];

            typeText(sceneText, dialogueText, () => {
                const btn = document.createElement('button');
                btn.className = 'dialogue-option';
                btn.innerHTML = '<strong>💕 美好的一天</strong>';
                btn.onclick = () => closeNPCDialogue();
                dialogueOptions.appendChild(btn);
            });

            dialoguePanel.classList.add('active');
        }


        // 探索地点
        function exploreLocation() {
            const locationId = window.exploreState.currentLocation;
            const location = window.townLocations[locationId];

            // 检查探索次数限制
            if (window.exploreState.dailyLimits.exploreCount >= window.exploreState.dailyLimits.maxExploreCount) {
                window.showNotification('探索限制', '你今天在这个地方已经探索太多次了，改天再来吧。');
                return;
            }

            // 增加探索次数
            window.exploreState.dailyLimits.exploreCount++;

            // 随机事件或发现 - 平衡后的数值
            const discoveries = [
                { text: '你发现了一些有趣的事物，感知有所提升。', effect: { sen: 1 }, weight: 30 },
                { text: '这里的环境让你感到放松，心情变好了。', effect: { mood: 3 }, weight: 25 },
                { text: '你意外地发现了一些线索，星尘之力微微波动。', effect: { stardustPower: 1 }, weight: 15 },
                { text: '你观察到了一些细节，智力有所提升。', effect: { int: 1 }, weight: 20 },
                { text: '这次探索让你心情愉悦，但没有什么特别的发现。', effect: {}, weight: 10 }  // 无奖励
            ];

            // 根据权重选择
            const totalWeight = discoveries.reduce((sum, d) => sum + d.weight, 0);
            let random = Math.random() * totalWeight;
            let selected = discoveries[0];
            for (const discovery of discoveries) {
                random -= discovery.weight;
                if (random <= 0) {
                    selected = discovery;
                    break;
                }
            }

            window.showNotification('探索结果', selected.text);
            if (selected.effect && Object.keys(selected.effect).length > 0) {
                window.applyEffects(selected.effect);

            // 显示剩余次数
            const remaining = window.exploreState.dailyLimits.maxExploreCount - window.exploreState.dailyLimits.exploreCount;
            if (remaining > 0) {
                setTimeout(() => {
                    window.showNotification('提示', `今天还可以探索 ${remaining} 次`);
                }, 1500);
            } else {
                setTimeout(() => {
                    window.showNotification('提示', '今天的探索次数已用完');
                }, 1500);
            }

        }

        // 更新探索按钮文本显示剩余次数
        function updateExploreButtonText() {
            const exploreBtn = document.querySelector('.scene-action-btn[onclick="exploreLocation()"]');
            if (exploreBtn) {
                const remaining = window.exploreState.dailyLimits.maxExploreCount - window.exploreState.dailyLimits.exploreCount;
                if (remaining > 0) {
                    exploreBtn.innerHTML = `🔍 探索周围 (${remaining}/${window.exploreState.dailyLimits.maxExploreCount})`;
                } else {
                    exploreBtn.innerHTML = `🔍 探索周围 (已用完)`;
                    exploreBtn.style.opacity = '0.5';
                    exploreBtn.style.cursor = 'not-allowed';
                }
            }
        }


        // 显示地点传闻
        function showLocationEvents() {
            const locationId = window.exploreState.currentLocation;
            const location = window.townLocations[locationId];

            const rumors = {
                school: ['听说最近学校要举办文艺汇演...', '有学生说在图书馆发现了神秘的古书...'],
                library: ['据说地下室有禁止进入的禁书区...', '有人看见半夜图书馆有神秘光芒...'],
                market: ['最近有神秘商人在卖稀有物品...', '下个月有大型集市活动...'],
                training_hall: ['听说有位神秘剑士要来交流...', '最近有新招式正在传授...'],
                noble_district: ['下月有贵族舞会...', '艾琳娜夫人似乎在寻找有才华的年轻人...'],
                stables: ['有匹稀有的白马刚刚出生...', '听说森林里发现了新的骑术路线...'],
                forest: ['有人看见深处有神秘的光芒...', '据说森林里有古代遗迹...'],
                square: ['下个月有大型庆典活动...', '街头艺人们准备联合演出...']
            };
            const locationRumors = rumors[locationId] || ['这里看起来很平静...'];
            const rumor = locationRumors[Math.floor(Math.random() * locationRumors.length)];

            window.showNotification('传闻', rumor);
        }


        // 与NPC相遇（旧版兼容）
        function meetNPC(npcId) {
            openNPCInteraction(npcId);
        }


        // 显示NPC对话 - 使用父女对话样式
        function showNPCDialogue(npc, isFirstMeeting) {
            const dialoguePanel = document.getElementById('dialogue-panel');
            const speakerAvatar = document.getElementById('speaker-avatar');
            const speakerName = document.getElementById('speaker-name');
            const dialogueText = document.getElementById('dialogue-text');
            const dialogueOptions = document.getElementById('dialogue-options');

            // 添加关闭按钮（如果不存在）
            let closeBtn = document.getElementById('dialogue-close-btn');
            if (!closeBtn) {
                closeBtn = document.createElement('button');
                closeBtn.id = 'dialogue-close-btn';
                closeBtn.className = 'dialogue-close-btn';
                closeBtn.innerHTML = '✕';
                closeBtn.onclick = closeNPCDialogue;
                dialoguePanel.appendChild(closeBtn);
            }


            // 添加ESC键关闭监听
            const escHandler = (e) => {
                if (e.key === 'Escape') {
                    closeNPCDialogue();
                    document.removeEventListener('keydown', escHandler);
                }
            }

            updateExploreButtonText();;
            document.addEventListener('keydown', escHandler);
            window.currentEscHandler = escHandler;

            // 设置NPC信息
            speakerAvatar.textContent = npc.emoji;
            speakerName.textContent = npc.name;
            dialogueText.textContent = '';
            dialogueOptions.innerHTML = '';

            // 获取问候语
            const greeting = isFirstMeeting && npc.firstMeeting
                ? npc.firstMeeting
                : getRandomGreeting(npc);

            // 使用打字机效果显示问候
            typeText(greeting, dialogueText, () => {
                // 显示对话选项
                showNPCDialogueOptions(npc, dialogueOptions);
            });

            dialoguePanel.classList.add('active');
            window.currentNPC = npc;
            window.isFirstMeeting = isFirstMeeting;
        }



        // 打字机效果
        function typeText(text, element, callback) {
            element.textContent = '';
            const chars = Array.from(text);
            let charIndex = 0;
            const typeInterval = setInterval(() => {
                if (charIndex < chars.length) {
                    element.textContent += chars[charIndex];
                    charIndex++;
                } else {
                    clearInterval(typeInterval);
                    if (callback) callback();
                }

            }, 40);
        }



        // 显示NPC对话选项
        function showNPCDialogueOptions(npc, container) {
            container.innerHTML = '';

            let availableDialogues = [];

            if (npc.dialogues && npc.dialogues.length > 0) {
                npc.dialogues.forEach((dialogue, index) => {
                    // 检查解锁条件
                    if (dialogue.unlock && !window.gameState.storyFlags[dialogue.unlock]) {
                        return;
                    }
                    if (dialogue.requireFlag && !window.gameState.storyFlags[dialogue.requireFlag]) {
                        return;
                    }

                    availableDialogues.push({ dialogue, index });
                }
);

                if (availableDialogues.length > 0) {
                    availableDialogues.forEach(({ dialogue, index }) => {
                        const btn = document.createElement('button');
                        btn.className = 'dialogue-option';

                        // 生成效果描述
                        let effectDesc = '';
                        if (dialogue.effect) {
                            const effects = [];
                            if (dialogue.effect.int) effects.push(`智力${dialogue.effect.int > 0 ? '+' : ''}${dialogue.effect.int}`);
                            if (dialogue.effect.cha) effects.push(`魅力${dialogue.effect.cha > 0 ? '+' : ''}${dialogue.effect.cha}`);
                            if (dialogue.effect.str) effects.push(`力量${dialogue.effect.str > 0 ? '+' : ''}${dialogue.effect.str}`);
                            if (dialogue.effect.soc) effects.push(`社交${dialogue.effect.soc > 0 ? '+' : ''}${dialogue.effect.soc}`);
                            if (dialogue.effect.mor) effects.push(`道德${dialogue.effect.mor > 0 ? '+' : ''}${dialogue.effect.mor}`);
                            if (dialogue.effect.stardustPower) effects.push(`星尘${dialogue.effect.stardustPower > 0 ? '+' : ''}${dialogue.effect.stardustPower}`);
                            effectDesc = effects.length > 0 ? effects.join('，') : '对话';
                        }


                        btn.innerHTML = `<strong>${dialogue.text}</strong>${effectDesc ? `<br><small style="color: #888;">${effectDesc}</small>` : ''}`;
                        btn.onclick = () => selectNPCDialogue(npc, index);
                        container.appendChild(btn);
                    });

                    // 添加结束对话按钮
                    const leaveBtn = document.createElement('button');
                    leaveBtn.className = 'dialogue-option';
                    leaveBtn.style.cssText = 'background: rgba(255,100,100,0.15); border-color: rgba(255,100,100,0.4); margin-top: 15px;';
                    leaveBtn.innerHTML = '<strong>🚪 结束对话</strong>';
                    leaveBtn.onclick = () => closeNPCDialogue();
                    container.appendChild(leaveBtn);
                }

            else {
                    showContinueButton(() => closeNPCDialogue(), '🚪 结束对话');
                }

            } else {
                showContinueButton(() => closeNPCDialogue(), '结束对话');
            }
        }



        // 显示继续按钮
        function showContinueButton(callback, text = '继续') {
            const dialogueOptions = document.getElementById('dialogue-options');
            dialogueOptions.innerHTML = '';

            const btn = document.createElement('button');
            btn.className = 'dialogue-option';
            btn.innerHTML = `<strong>${text}</strong>`;
            btn.onclick = callback;
            dialogueOptions.appendChild(btn);
        }



        // 获取随机问候语
        function getRandomGreeting(npc) {
            const greetings = [
                '又见面了，今天过得怎么样？',
                '星儿最近还好吗？',
                '欢迎来到' + (npc.title || '这里') + '。',
                '有什么我可以帮你的吗？',
                '今天的天气真不错呢。'
            ];
            return greetings[Math.floor(Math.random() * greetings.length)];
        }



        // 选择NPC对话选项
        function selectNPCDialogue(npc, dialogueIndex) {
            if (!npc || !npc.dialogues || !npc.dialogues[dialogueIndex]) return;

            const dialogue = npc.dialogues[dialogueIndex];
            const limits = window.exploreState.dailyLimits;

            // 检查该NPC本次外出是否已获得过属性
            const npcId = Object.keys(window.npcs).find(key => window.npcs[key] === npc);
            const hasTalkedThisNPC = limits.npcTalked.has(npcId);
            const hasReachedTotalLimit = limits.totalNpcTalks >= limits.maxTotalNpcTalks;

            // 应用效果（根据限制情况）
            if (dialogue.effect) {
                let actualEffect = { ...dialogue.effect };

                // 如果已经超过总次数限制或已和该NPC对话过，则不获得属性
                if (hasReachedTotalLimit || hasTalkedThisNPC) {
                    // 只保留解锁效果，不保留属性效果
                    actualEffect = {};
                    if (dialogue.unlock) {
                        // 解锁标记仍然生效
                    }


                    // 显示提示
                    let warningMsg = '';
                    if (hasReachedTotalLimit) {
                        warningMsg = '（你今天已经和太多人聊过天了，继续聊天不会获得属性提升）';
                    }

            else if (hasTalkedThisNPC) {
                        warningMsg = '（你已经和' + npc.name + '聊过天了，继续聊天不会获得属性提升）';
                    }


                    if (warningMsg) {
                        setTimeout(() => {
                            window.showNotification('疲劳提示', warningMsg);
                        }, 500);
                    }

                } else {
                    // 记录本次外出的对话
                    limits.npcTalked.add(npcId);
                    limits.totalNpcTalks++;
                }

                // 应用实际效果（可能被清空）
                if (Object.keys(actualEffect).length > 0) {
                    window.applyEffects(actualEffect);
                }

            }

            // 解锁标记
            if (dialogue.unlock) {
                window.gameState.storyFlags[dialogue.unlock] = true;
                window.showNotification('解锁', '已解锁：' + dialogue.unlock);
            }

            // 获取回应文本
            const responseText = dialogue.response || '这是个很好的话题。';

            // 显示NPC的回应（打字机效果）
            const dialogueText = document.getElementById('dialogue-text');
            const dialogueOptions = document.getElementById('dialogue-options');
            dialogueOptions.innerHTML = '';

            typeText(responseText, dialogueText, () => {
                // 显示效果
                if (dialogue.effect) {
                    try {
                        const effectText = formatEffects(dialogue.effect);
                        const effectDiv = document.createElement('div');
                        effectDiv.style.cssText = 'color: var(--accent); margin-top: 10px; font-size: 0.9rem;';
                        effectDiv.textContent = '✨ ' + effectText;
                        dialogueText.appendChild(effectDiv);
                    }

            catch (e) {
                        console.error('Error showing effects:', e);
                    }

                }

                // 显示剩余次数提示
                const remainingTalks = limits.maxTotalNpcTalks - limits.totalNpcTalks;
                if (remainingTalks > 0 && !hasReachedTotalLimit) {
                    const hintDiv = document.createElement('div');
                    hintDiv.style.cssText = 'color: #888; margin-top: 10px; font-size: 0.85rem; font-style: italic;';
                    hintDiv.textContent = `今天还可以和 ${remainingTalks} 位新朋友对话获得属性`;
                    dialogueText.appendChild(hintDiv);
                }


                // 确保按钮容器清空
                dialogueOptions.innerHTML = '';

                // 显示继续或结束按钮
                const btn = document.createElement('button');
                btn.className = 'dialogue-option';
                btn.innerHTML = '<strong>💬 继续对话</strong>';
                btn.onclick = () => {
                    showNPCDialogue(npc, false);
                };
                dialogueOptions.appendChild(btn);

                // 添加结束按钮
                const leaveBtn = document.createElement('button');
                leaveBtn.className = 'dialogue-option';
                leaveBtn.style.cssText = 'background: rgba(255,100,100,0.2); border-color: rgba(255,100,100,0.5); color: #ffcccc;';
                leaveBtn.innerHTML = '<strong>🚪 结束对话</strong>';
                leaveBtn.onclick = () => closeNPCDialogue();
                dialogueOptions.appendChild(leaveBtn);

                // 确保关闭按钮存在
                let closeBtn = document.getElementById('dialogue-close-btn');
                if (!closeBtn) {
                    const dialoguePanel = document.getElementById('dialogue-panel');
                    closeBtn = document.createElement('button');
                    closeBtn.id = 'dialogue-close-btn';
                    closeBtn.className = 'dialogue-close-btn';
                    closeBtn.innerHTML = '✕';
                    closeBtn.onclick = closeNPCDialogue;
                    dialoguePanel.appendChild(closeBtn);
                }

            });
        }



        // 关闭NPC对话
        function closeNPCDialogue() {
            const dialoguePanel = document.getElementById('dialogue-panel');
            dialoguePanel.classList.remove('active');

            // 移除关闭按钮
            const closeBtn = document.getElementById('dialogue-close-btn');
            if (closeBtn) {
                closeBtn.remove();
            }

            // 移除ESC键监听
            if (window.currentEscHandler) {
                document.removeEventListener('keydown', window.currentEscHandler);
                window.currentEscHandler = null;
            }

            window.currentNPC = null;
            window.isFirstMeeting = false;
        }


        // 关闭地点详情面板
        function closeLocationDetail() {
            // 关闭NPC互动面板（如果打开）
            closeNPCInteraction();

            document.getElementById("location-detail").classList.remove("active");

            // 重新显示外出面板
            const explorePanel = document.getElementById("explore-panel");
            if (explorePanel) {
                explorePanel.classList.add("active");
            }

        }


        // 将函数暴露到全局作用域
        window.openExplorePanel = openExplorePanel;
        window.visitLocation = visitLocation;
        window.meetNPC = meetNPC;
        window.showNPCDialogue = showNPCDialogue;
        window.selectNPCDialogue = selectNPCDialogue;
        window.closeNPCDialogue = closeNPCDialogue;
        window.closeLocationDetail = closeLocationDetail;
        window.closeNPCInteraction = closeNPCInteraction;
        window.closeGiftPanel = closeGiftPanel;
        window.exploreLocation = exploreLocation;
        window.showLocationEvents = showLocationEvents;
        window.openNPCInteraction = openNPCInteraction;
        window.getRandomGreeting = getRandomGreeting;
        window.typeText = typeText;
        window.generateHearts = generateHearts;
        window.getRelationshipInfo = getRelationshipInfo;
        window.increaseAffection = increaseAffection;
        window.openGiftPanel = openGiftPanel;
        window.showNPCThanks = showNPCThanks;
        window.showDateScene = showDateScene;
        window.resetDailyLimits = resetDailyLimits;
        window.updateExploreButtonText = updateExploreButtonText;
        window.npcAffection = window.npcAffection || {};

}
