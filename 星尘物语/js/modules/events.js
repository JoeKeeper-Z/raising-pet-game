
        // ==================== 增强版事件系统 ====================

        // 事件记忆 - 记录玩家的选择，影响后续事件
window.eventMemory = {
            // 记录每个事件的选择结果
            choices: {},
            // 延迟效果队列
            delayedEffects: [],
            // 事件链状态
            chains: {},

            // 记录选择
            recordChoice(eventId, choiceIndex, choiceData) {
                this.choices[eventId] = {
                    index: choiceIndex,
                    data: choiceData,
                    timestamp: window.gameState.totalMonth
                };
            },

            // 检查之前是否做过某个选择
            hasChosen(eventId, choiceIndex = null) {
                const choice = this.choices[eventId];
                if (!choice) return false;
                if (choiceIndex !== null) return choice.index === choiceIndex;
                return true;
            },

            // 获取之前的选择
            getChoice(eventId) {
                return this.choices[eventId];
            },

            // 添加延迟效果
            // 方式1：使用回调函数（用于程序内部）
            addDelayedEffect(months, callback) {
                this.delayedEffects.push({
                    triggerMonth: window.gameState.totalMonth + months,
                    callback: callback
                });
            },

            // 方式2：使用事件ID（用于事件定义，可序列化）
            addDelayedEvent(months, eventId) {
                this.delayedEffects.push({
                    triggerMonth: window.gameState.totalMonth + months,
                    eventId: eventId,
                    callback: () => {
                        if (delayedEvents[eventId]) {
                            eventQueue.push({
                                type: 'delayed',
                                data: delayedEvents[eventId]
                            });
                        }
                    }
                });
            },

            // 检查延迟效果
            checkDelayedEffects() {
                const currentMonth = window.gameState.totalMonth;
                const triggered = this.delayedEffects.filter(e => e.triggerMonth <= currentMonth);
                this.delayedEffects = this.delayedEffects.filter(e => e.triggerMonth > currentMonth);
                triggered.forEach(e => e.callback());
            },

            // 开始事件链
            startChain(chainId) {
                this.chains[chainId] = { currentStage: 0, completed: false };
            },

            // 推进事件链
            advanceChain(chainId) {
                if (this.chains[chainId]) {
                    this.chains[chainId].currentStage++;
                }
            },

            // 检查事件链状态
            getChainStage(chainId) {
                return this.chains[chainId]?.currentStage || 0;
            }
        };

        // 随机事件 - 增强版
window.randomEvents = [
            // ==================== 多阶段事件示例：受伤的小猫 ====================
            {
                id: 'found_kitten',
                title: '森林中的小猫',
                desc: '星儿在回家的路上发现了一只受伤的小猫，它的后腿似乎被什么东西划伤了，正蜷缩在树下瑟瑟发抖...',
                emoji: '🐱',
                condition: () => window.gameState.stats.sen >= 30,
                choices: [
                    {
                        text: '带它回家照顾',
                        effects: { mor: 10, sen: 5, affection: 10 },
                        result: '小猫成为了星儿的好朋友',
                        nextStage: 'kitten_home' // 进入后续阶段
                    },
                    {
                        text: '送去兽医那里',
                        effects: { mor: 5, gold: -30 },
                        result: '小猫得到了专业治疗',
                        nextStage: 'kitten_vet'
                    },
                    {
                        text: '让它自生自灭',
                        effects: { mor: -10, affection: -5 },
                        result: '星儿看起来有些失落，默默跟着你回家了',
                        onChoose: () => {
                            // 延迟3个月后触发内疚事件
                            eventMemory.addDelayedEvent(3, 'kitten_guilt');
                        }
                    }
                ]
            },
            // 小猫事件 - 带回家后续
            {
                id: 'kitten_home',
                title: '新朋友',
                desc: '小猫被带回家后，星儿细心地照顾它。几天后，小猫的伤口愈合了，它和星儿成为了形影不离的好朋友。每天星儿放学回家，小猫都会在门口迎接她。',
                emoji: '🐱',
                condition: () => false, // 只能通过事件链触发
                choices: [
                    {
                        text: '让星儿负责照顾它',
                        effects: { mor: 5, sen: 10 },
                        result: '星儿学会了照顾生命，变得更加细心体贴',
                        onChoose: () => {
                            eventMemory.recordChoice('found_kitten', 0, { outcome: 'adopted' });
                            // 一个月后触发回访事件
                            eventMemory.addDelayedEvent(1, 'kitten_growth');
                        }
                    },
                    {
                        text: '等它伤好后帮它找主人',
                        effects: { mor: 10, soc: 5 },
                        result: '你们贴出了寻猫启事，等待失主来认领',
                        onChoose: () => {
                            eventMemory.recordChoice('found_kitten', 0, { outcome: 'temporary' });
                        }
                    }
                ]
            },
            // 小猫事件 - 送兽医后续
            {
                id: 'kitten_vet',
                title: '兽医的消息',
                desc: '兽医打来电话，说小猫的伤已经好了。它是一只被遗弃的流浪猫，没有主人。兽医问你们是否愿意收养它。',
                emoji: '🏥',
                condition: () => false,
                choices: [
                    {
                        text: '收养它',
                        effects: { mor: 5, affection: 15 },
                        result: '小猫正式成为了家庭的一员',
                        onChoose: () => {
                            eventMemory.recordChoice('found_kitten', 1, { outcome: 'adopted_after_vet' });
                        }
                    },
                    {
                        text: '让兽医帮它找新主人',
                        effects: { ele: 5 },
                        result: '几天后，一位善良的老奶奶领养了小猫',
                        onChoose: () => {
                            eventMemory.recordChoice('found_kitten', 1, { outcome: 'rehomed' });
                        }
                    }
                ]
            },

            // ==================== 属性检定事件：奇怪的梦境 ====================
            {
                id: 'strange_dream',
                title: '奇怪的梦境',
                desc: '星儿昨晚做了一个奇怪的梦，梦见自己漂浮在星空之中，周围有无数光点在飞舞。醒来后，她发现自己的吊坠在微微发热...',
                emoji: '🌙',
                condition: () => window.gameState.totalMonth >= 4,
                choices: [
                    {
                        text: '和她一起分析梦境（需要智力≥50）',
                        effects: { int: 8, stardustPower: 10 },
                        result: '你们发现梦境中隐藏着某种信息',
                        require: { int: 50 },
                        successStage: 'dream_analyzed',
                        failStage: 'dream_confused'
                    },
                    {
                        text: '安慰她只是梦而已',
                        effects: { affection: 5, mood: 10 },
                        result: '星儿安心地笑了，但眼神中似乎有些失落',
                        onChoose: () => {
                            // 低好感时可能触发隐藏不安
                            if (window.gameState.affection < 200) {
                                eventMemory.addDelayedEvent(1, 'dream_doubt');
                            }
                        }
                    },
                    {
                        text: '教她记录梦境（需要感知≥40）',
                        effects: { sen: 10, stardustPower: 5 },
                        result: '星儿开始记录梦境日记，渐渐发现了规律',
                        require: { sen: 40 },
                        successStage: 'dream_diary'
                    }
                ]
            },
            // 梦境分析成功后续
            {
                id: 'dream_analyzed',
                title: '星图的启示',
                desc: '通过仔细分析，你发现星儿的梦境中呈现的是一种古老的星图。星儿说她在梦中听到了一个声音在呼唤她的名字...',
                emoji: '⭐',
                condition: () => false,
                choices: [
                    {
                        text: '深入研究星图',
                        effects: { int: 15, stardustPower: 20 },
                        result: '你们发现星图指向大陆北方的星陨之地',
                        onChoose: () => {
                            window.gameState.storyFlags.knows_starmap = true;
                        }
                    },
                    {
                        text: '让星儿尝试与梦境沟通',
                        effects: { sen: 10, stardustPower: 15, mood: -5 },
                        result: '星儿感到疲惫，但获得了一些模糊的记忆片段'
                    }
                ]
            },
            // 梦境分析失败
            {
                id: 'dream_confused',
                title: '无法理解的梦境',
                desc: '你们尝试分析梦境，但星图的复杂程度超出了你们的理解范围。星儿有些沮丧，觉得自己可能错过了什么重要的信息。',
                emoji: '❓',
                condition: () => false,
                choices: [
                    {
                        text: '鼓励她不要放弃',
                        effects: { affection: 10, mood: 5 },
                        result: '星儿点点头，决定等学识更渊博时再尝试'
                    },
                    {
                        text: '去图书馆查阅资料',
                        effects: { int: 5, gold: -20 },
                        result: '你们借了几本关于古代星图的书籍',
                        onChoose: () => {
                            // 提升下次分析的成功率
                            window.gameState.stats.int += 5;
                        }
                    }
                ]
            },

            // ==================== 连锁事件：集市冲突 ====================
            {
                id: 'bully_encounter',
                title: '集市上的冲突',
                desc: '星儿在集市上遇到了几个嘲笑她身世的坏孩子。他们大声说「听说她是个没人要的野孩子！」周围的人都看了过来...',
                emoji: '😠',
                condition: () => window.gameState.stats.soc < 200 && !eventMemory.hasChosen('bully_encounter'),
                choices: [
                    {
                        text: '教她勇敢反击',
                        effects: { str: 10, mor: -5, soc: -5 },
                        result: '星儿大声反驳了他们，虽然赢了争论，但场面一度很尴尬',
                        onChoose: () => {
                            eventMemory.recordChoice('bully_encounter', 0, { approach: 'aggressive' });
                            // 2周后可能遇到家长投诉
                            eventMemory.addDelayedEvent(1, 'bully_aftermath_aggressive');
                        }
                    },
                    {
                        text: '教她用智慧化解',
                        effects: { int: 10, soc: 5, cha: 5 },
                        result: '星儿巧妙地化解了尴尬，让坏孩子们无言以对',
                        onChoose: () => {
                            eventMemory.recordChoice('bully_encounter', 1, { approach: 'smart' });
                            window.gameState.storyFlags.bully_resolved_smart = true;
                        }
                    },
                    {
                        text: '保护她离开现场',
                        effects: { mood: 10, affection: 10, mor: 5 },
                        result: '你带着星儿离开了集市，她在你怀里哭了一会儿',
                        onChoose: () => {
                            eventMemory.recordChoice('bully_encounter', 2, { approach: 'protective' });
                            // 温柔处理可能让星儿更依赖你
                            eventMemory.addDelayedEvent(2, 'bully_talk');
                        }
                    }
                ]
            },

            // ==================== 吊坠发光 - 多分支连锁 ====================
            {
                id: 'magic_sensation',
                title: '吊坠发光了',
                desc: '深夜，星儿胸前的星尘吊坠突然发出微弱的蓝光。光芒忽明忽暗，仿佛在传递着某种信息...',
                emoji: '✨',
                condition: () => window.gameState.totalMonth >= 8 && window.gameState.stardustPower > 50,
                choices: [
                    {
                        text: '仔细观察吊坠',
                        effects: { stardustPower: 20, sen: 10 },
                        result: '你感觉到某种古老的力量在苏醒',
                        onChoose: () => {
                            window.gameState.storyFlags.observed_pendant = true;
                        }
                    },
                    {
                        text: '让星儿感受它',
                        effects: { stardustPower: 30, mood: -10, sen: 5 },
                        result: '星儿感到一阵眩晕，闭上眼睛后，她说看到了一座水晶宫殿',
                        onChoose: () => {
                            window.gameState.storyFlags.stella_vision = true;
                            // 触发连锁：神秘指引
                            eventMemory.addDelayedEvent(2, 'crystal_palace_hint');
                        }
                    },
                    {
                        text: '先收好不要声张',
                        effects: { mor: 5, stardustPower: 10 },
                        result: '你们决定保守这个秘密，但星儿似乎有些心事',
                        onChoose: () => {
                            eventMemory.recordChoice('magic_sensation', 2, { cautious: true });
                        }
                    }
                ]
            },

            // ==================== 古书事件 - 知识检定 ====================
            {
                id: 'found_book',
                title: '神秘的古书',
                desc: '在图书馆的角落里，星儿发现了一本布满灰尘的古书。封面上写着《星尘纪元·失落篇》，这本书似乎不应该出现在公共图书馆...',
                emoji: '📜',
                condition: () => window.gameState.stats.int >= 100 && !eventMemory.hasChosen('found_book'),
                choices: [
                    {
                        text: '悄悄借走研究（需要智力≥150）',
                        effects: { int: 15, stardustPower: 15 },
                        result: '你们发现了关于星尘之女的古老预言',
                        require: { int: 150 },
                        successStage: 'book_prophecy',
                        failStage: 'book_too_hard'
                    },
                    {
                        text: '交给图书馆管理员',
                        effects: { mor: 10, gold: 50, ele: 5 },
                        result: '管理员惊讶地说这本书应该在禁书区，奖励了你们的诚实'
                    },
                    {
                        text: '在图书馆里阅读',
                        effects: { int: 10 },
                        result: '你们花了整整一个下午，勉强读懂了部分内容',
                        onChoose: () => {
                            // 设置一个标记，之后可以再来
                            eventMemory.recordChoice('found_book', 2, { partial: true });
                        }
                    }
                ]
            },

            // ==================== 庆典活动 - 多选项分支 ====================
            {
                id: 'festival',
                title: '翡翠镇庆典',
                desc: '镇上正在举办一年一度的星尘庆典！街道两旁挂满了彩灯，到处洋溢着欢乐的气氛。星儿兴奋地拉着你的手...',
                emoji: '🎉',
                condition: () => window.gameState.month === 6 || window.gameState.month === 12,
                choices: [
                    {
                        text: '参加才艺表演（魅力≥100有加成）',
                        effects: { cha: 20, ele: 10, mood: 15 },
                        result: window.gameState.stats.cha >= 100 ?
                            '星儿的精彩表演获得了冠军！全镇都记住了她的名字！' :
                            '星儿的表演获得了热烈的掌声，她非常开心',
                        onChoose: () => {
                            if (window.gameState.stats.cha >= 100) {
                                window.gameState.gold += 100; // 冠军奖金
                            }
                        }
                    },
                    {
                        text: '一起逛小吃摊',
                        effects: { gold: -50, mood: 25, hp: 10 },
                        result: '你们品尝了各种美食，星儿笑得合不拢嘴',
                        onChoose: () => {
                            // 可能触发后续：食物中毒（小概率）
                            if (Math.random() < 0.1) {
                                eventMemory.addDelayedEvent(1, 'food_poisoning');
                            }
                        }
                    },
                    {
                        text: '去占卜摊位（感知≥80有特殊结果）',
                        effects: { sen: 10, stardustPower: 10 },
                        result: window.gameState.stats.sen >= 80 ?
                            '占卜师看到星儿后脸色大变：「这孩子...有着星星的命运...」' :
                            '占卜师说星儿未来会遇到重要的选择',
                        onChoose: () => {
                            if (window.gameState.stats.sen >= 80) {
                                window.gameState.storyFlags.fortune_told = true;
                            }
                        }
                    }
                ]
            },

            // ==================== 行商人 - 交易与欺骗 ====================
            {
                id: 'merchant_visit',
                title: '神秘行商人',
                desc: '一位披着斗篷的神秘行商人来到镇上。他打开包裹，里面有几样奇怪的商品：一块发光的石头、一本没有字的书、还有一瓶紫色的药水...',
                emoji: '🧙',
                condition: () => window.gameState.stats.sen >= 200,
                choices: [
                    {
                        text: '购买发光的石头（200金币）',
                        requireGold: 200,
                        effects: { stardustPower: 30 },
                        result: '石头与星儿的吊坠产生共鸣，发出耀眼的光芒',
                        onChoose: () => {
                            window.gameState.storyFlags.has_glowing_stone = true;
                            // 石头带来好处但也有风险
                            const roll = Math.random();
                            if (roll < 0.5) {
                                eventMemory.addDelayedEvent(3, 'stone_benefit');
                            } else {
                                eventMemory.addDelayedEvent(3, 'stone_trouble');
                            }
                        }
                    },
                    {
                        text: '购买无字之书（150金币）',
                        requireGold: 150,
                        effects: { int: 15, sen: 10 },
                        result: '当你翻开书时，文字会根据你的思绪浮现',
                        onChoose: () => {
                            window.gameState.stats.int += 5;
                        }
                    },
                    {
                        text: '购买紫色药水（100金币）',
                        requireGold: 100,
                        effects: { hp: 50 },
                        result: '药水散发着神秘的气息，不知道会有什么效果',
                        onChoose: () => {
                            // 药水效果随机
                            const roll = Math.random();
                            if (roll < 0.4) {
                                // 好事
                                window.gameState.stats.hp = Math.min(999, window.gameState.stats.hp + 100);
                            } else if (roll < 0.7) {
                                // 中性
                                window.gameState.mood = Math.min(100, window.gameState.mood + 20);
                            } else {
                                // 坏事（被骗了）
                                window.gameState.health -= 10;
                            }
                        }
                    },
                    {
                        text: '礼貌地拒绝',
                        effects: { ele: 5, mor: 5 },
                        result: '行商人深深看了星儿一眼，低声说：「我们会再见的，星尘之女...」',
                        onChoose: () => {
                            // 埋下伏笔
                            eventMemory.recordChoice('merchant_visit', 3, { refused: true });
                        }
                    }
                ]
            },

            // ==================== 新事件：偶遇旧识 ====================
            {
                id: 'meet_wanderer',
                title: '偶遇流浪艺人',
                desc: '在镇外的小路上，你们遇到了一位吟游诗人。他弹着古老的琴，唱着关于星尘之女的传说...',
                emoji: '🎵',
                condition: () => window.gameState.totalMonth >= 5,
                choices: [
                    {
                        text: '请他详细讲讲传说',
                        effects: { int: 5, stardustPower: 10 },
                        result: '诗人讲述了星尘之女拯救大陆的古老故事',
                        onChoose: () => {
                            window.gameState.storyFlags.heard_legend = true;
                        }
                    },
                    {
                        text: '给诗人一些金币',
                        requireGold: 20,
                        effects: { cha: 5, mor: 5 },
                        result: '诗人感激地演奏了一首特别的曲子，星儿听得入迷',
                        onChoose: () => {
                            window.gameState.mood = Math.min(100, window.gameState.mood + 15);
                        }
                    },
                    {
                        text: '邀请他回家做客',
                        effects: { soc: 10, gold: -30 },
                        result: '诗人分享了旅途中的见闻，还教了星儿一首歌',
                        onChoose: () => {
                            // 可能获得特殊技能
                            if (Math.random() < 0.3) {
                                window.gameState.stats.cha += 10;
                            }
                        }
                    }
                ]
            },

            // ==================== 新事件：奇怪的天气 ====================
            {
                id: 'strange_weather',
                title: '异常的星陨雨',
                desc: '深夜，天空突然出现了奇异的景象——无数流星划过天际，但它们的轨迹似乎在围绕着星儿的吊坠旋转...',
                emoji: '🌠',
                condition: () => window.gameState.totalMonth >= 10 && window.gameState.stardustPower >= 100,
                choices: [
                    {
                        text: '带星儿出去观看',
                        effects: { sen: 15, stardustPower: 20, mood: 10 },
                        result: '星儿沐浴在星光中，感到一股温暖的力量流入体内',
                        onChoose: () => {
                            window.gameState.stats.sen += 10;
                            window.gameState.storyFlags.star_blessing = true;
                        }
                    },
                    {
                        text: '在窗边记录现象',
                        effects: { int: 10, sen: 10 },
                        result: '你们详细记录了这罕见的天象',
                        onChoose: () => {
                            // 可以用于后续研究
                            eventMemory.recordChoice('strange_weather', 1, { recorded: true });
                        }
                    },
                    {
                        text: '让星儿早点休息',
                        effects: { hp: 20, affection: 5 },
                        result: '星儿虽然有些遗憾，但乖乖上床睡觉了',
                        onChoose: () => {
                            // 错过事件，但保存了体力
                            window.gameState.health = Math.min(100, window.gameState.health + 5);
                        }
                    }
                ]
            }
        ];

        // 延迟触发事件库
window.delayedEvents = {
            // 小猫相关
            kitten_guilt: {
                title: '内疚的回忆',
                desc: '星儿最近总是心不在焉。今天她小声问你：「爸爸，那只小猫...它现在还好吗？」看来当初放弃救助小猫的决定让她一直耿耿于怀。',
                emoji: '😢',
                choices: [
                    { text: '安慰她已经过去了', effects: { affection: 5, mood: 5 }, result: '星儿点点头，但眼神中仍有愧疚' },
                    { text: '承诺下次一定会帮忙', effects: { mor: 5, affection: 10 }, result: '星儿露出微笑，紧紧抱住了你' }
                ]
            },
            kitten_growth: {
                title: '小猫长大了',
                desc: '你们收养的小猫长大了不少，它总是跟在星儿身后，成为了她最好的玩伴。看着它们玩耍的样子，你觉得当初的决定是正确的。',
                emoji: '🐱',
                choices: [
                    { text: '给星儿拍张照片', effects: { cha: 5, mood: 10 }, result: '星儿抱着小猫，笑得无比灿烂' },
                    { text: '教星儿更多照顾技巧', effects: { sen: 10 }, result: '星儿认真地学习如何做一个好主人' }
                ]
            },

            // 梦境相关
            dream_doubt: {
                title: '不安的夜晚',
                desc: '星儿最近睡眠质量很差。她说总觉得有什么重要的事情被你忽略了，这种感觉让她感到不安。',
                emoji: '😰',
                choices: [
                    { text: '耐心倾听她的担忧', effects: { affection: 15 }, result: '星儿终于说出了内心的恐惧' },
                    { text: '一起寻找答案', effects: { int: 5, sen: 5 }, result: '你们开始调查梦境的来源' }
                ]
            },

            // 欺负事件后续
            bully_aftermath_aggressive: {
                title: '家长的投诉',
                desc: '昨天被你训斥的坏孩子的家长找上门来，说你「欺负」了他们家的孩子。虽然你据理力争，但这件事在镇上引起了一些议论。',
                emoji: '📢',
                choices: [
                    { text: '冷静解释事情经过', effects: { soc: -5, ele: 5 }, result: '部分镇民理解了你的立场' },
                    { text: '坚持保护星儿的做法', effects: { str: 5, soc: -10, affection: 10 }, result: '星儿为你感到骄傲，尽管有些人不理解' }
                ]
            },
            bully_talk: {
                title: '深夜的谈话',
                desc: '自从集市上的事情后，星儿变得更加依赖你了。今晚她主动来找你，想要谈谈她的感受...',
                emoji: '🌙',
                choices: [
                    { text: '鼓励她独立面对', effects: { mor: 5, str: 5 }, result: '星儿似懂非懂地点点头' },
                    { text: '承诺永远保护她', effects: { affection: 20 }, result: '星儿紧紧抱住你，眼泪打湿了你的衣服' }
                ]
            },

            // 水晶宫殿线索
            crystal_palace_hint: {
                title: '梦中的指引',
                desc: '星儿说她又梦到了水晶宫殿。这次她看清了更多细节：宫殿的大门上刻着和她吊坠一样的图案。',
                emoji: '🏰',
                choices: [
                    { text: '鼓励她继续探索梦境', effects: { sen: 15, stardustPower: 10 }, result: '星儿决定每晚睡前都尝试与梦境沟通' },
                    { text: '查阅资料寻找线索', effects: { int: 10 }, result: '你们开始在古籍中寻找水晶宫殿的记载' }
                ]
            },

            // 石头的效果
            stone_benefit: {
                title: '石头的馈赠',
                desc: '自从得到那块发光的石头后，星儿发现自己在夜间视力变好了，而且学习魔法相关内容时更加得心应手。',
                emoji: '💎',
                choices: [
                    { text: '研究石头的作用', effects: { int: 10, stardustPower: 10 }, result: '你们发现石头能缓慢提升佩戴者的感知力' },
                    { text: '让星儿继续佩戴', effects: { sen: 10 }, result: '星儿把石头做成了项链，天天戴着' }
                ]
            },
            stone_trouble: {
                title: '石头的诅咒？',
                desc: '最近星儿总是做噩梦，而且石头有时候会不受控制地发光。镇上的老人说这可能是被诅咒的物品...',
                emoji: '⚠️',
                choices: [
                    { text: '寻找解除诅咒的方法', effects: { int: 5, gold: -100 }, result: '你们花费重金请了一位法师净化石头' },
                    { text: '把石头埋回发现的地方', effects: { sen: -5 }, result: '虽然失去了石头的力量，但星儿恢复了安稳的睡眠' }
                ]
            },

            // 食物中毒
            food_poisoning: {
                title: '肚子不舒服',
                desc: '星儿昨晚在庆典上吃得太多太杂，今天一早就开始肚子痛...',
                emoji: '🤢',
                choices: [
                    { text: '带她去看医生', effects: { gold: -30, hp: 20 }, result: '医生开了药，星儿很快就好了' },
                    { text: '在家照顾她', effects: { affection: 10, hp: 10 }, result: '你煮了粥给星儿，她感动地全部喝完了' }
                ]
            }
        };

        // 主线剧情 - 完整的三年故事线
window.mainStoryEvents = {
            // ========== 第一年：初遇与适应 ==========
            1: {
                title: '序章：命运的相遇',
                desc: '三个月前，你在边境的废墟中发现了一个昏迷的女孩。她胸前挂着一枚发出微弱光芒的星形吊坠。没有身份证明，没有记忆，只有一个名字——星儿。从那天起，你们成为了家人。今天，星儿正式成为翡翠镇的一员...',
                emoji: '🌟',
                choices: [
                    { text: '为她举办欢迎仪式', effects: { affection: 20, mood: 20 }, next: 'welcome', onChoose: () => { window.gameState.storyFlags.entered_school = true; } },
                    { text: '带她熟悉镇上的环境', effects: { soc: 10, sen: 10 }, next: 'tour', onChoose: () => { window.gameState.storyFlags.entered_school = true; } },
                    { text: '先让她休息适应', effects: { hp: 20, affection: 10 }, next: 'rest', onChoose: () => { window.gameState.storyFlags.entered_school = true; } }
                ]
            },
            2: {
                title: '第一堂课',
                desc: '星儿开始上学了。第一天放学，她兴奋地带回了一幅画——画中是你们两个人站在星空下。老师说这孩子很有绘画天赋，但总是看着窗外发呆...',
                emoji: '🎨',
                choices: [
                    { text: '夸奖她的画', effects: { cha: 15, affection: 10 }, next: 'praise', onChoose: () => { window.gameState.storyFlags.entered_school = true; showNotification('解锁新课程', '文化课已解锁！'); } },
                    { text: '询问她发呆的原因', effects: { sen: 15 }, next: 'ask', onChoose: () => { window.gameState.storyFlags.entered_school = true; showNotification('解锁新课程', '文化课已解锁！'); } },
                    { text: '鼓励她专注学习', effects: { int: 15, mor: 5 }, next: 'study', onChoose: () => { window.gameState.storyFlags.entered_school = true; showNotification('解锁新课程', '文化课已解锁！'); } }
                ]
            },
            3: {
                title: '第一次噩梦',
                desc: '深夜，你被尖叫声惊醒。星儿浑身冷汗地坐在床上，说她梦见了一片漆黑的森林，有一个声音在呼唤她的名字。她紧紧抱着你，颤抖着说：「那个声音...叫我星尘之女...」',
                emoji: '🌙',
                choices: [
                    { text: '安慰她只是噩梦', effects: { affection: 15, mood: 10 }, next: 'comfort' },
                    { text: '记下这个梦境', effects: { sen: 15, stardustPower: 5 }, next: 'record' },
                    { text: '研究吊坠是否有感应', effects: { stardustPower: 15, int: 10 }, next: 'investigate' }
                ]
            },
            4: {
                title: '新朋友',
                desc: '星儿交到了第一个朋友——一个叫莉莉的女孩。她们经常一起在放学后去图书馆。然而今天，莉莉哭着告诉星儿，她要随父母搬去王都了...',
                emoji: '👭',
                choices: [
                    { text: '安慰星儿并送别莉莉', effects: { affection: 15, ele: 10 }, next: 'goodbye' },
                    { text: '教她珍惜友谊', effects: { soc: 15, mor: 10 }, next: 'friendship' },
                    { text: '帮她准备离别礼物', effects: { cha: 15, soc: 10 }, next: 'gift' }
                ]
            },
            5: {
                title: '异常的现象',
                desc: '最近镇上的动物对星儿表现出异常的亲近。鸟儿会落在她肩上，野猫会主动蹭她的腿。更奇怪的是，星儿说她能「感觉到」它们的情绪...',
                emoji: '🐦',
                choices: [
                    { text: '鼓励她与动物交流', effects: { sen: 20, stardustPower: 10 }, next: 'nature' },
                    { text: '观察并记录这种现象', effects: { int: 15, sen: 10 }, next: 'observe' },
                    { text: '告诉她这只是巧合', effects: { mood: 10 }, next: 'coincidence' }
                ]
            },
            6: {
                title: '身世之谜的开端',
                desc: '半年过去了，星儿渐渐长大，开始对吊坠的来历产生好奇。她问你：「爸爸/妈妈，我的亲生父母是什么样的人？为什么我会被遗弃？」她的眼中充满了困惑和渴望...',
                emoji: '🔮',
                choices: [
                    { text: '诚实告知她是被遗弃的', effects: { affection: -10, mor: 15, stardustPower: 10 }, next: 'truth' },
                    { text: '说他们是伟大的冒险者', effects: { affection: 5, mood: 10, stardustPower: 5 }, next: 'lie' },
                    { text: '说时机未到，但会一直陪她寻找答案', effects: { affection: 20, stardustPower: 15 }, next: 'mystery' }
                ]
            },
            7: {
                title: '图书馆的发现',
                desc: '为了寻找身世线索，你带星儿去了镇上最古老的图书馆。在尘封的古籍区，你们发现了一本记载着「星尘一族」传说的书。书中描述了一个拥有操控星光之力的古老种族...',
                emoji: '📚',
                choices: [
                    { text: '深入研究星尘一族', effects: { int: 20, stardustPower: 20 }, next: 'research' },
                    { text: '借走书慢慢研究', effects: { int: 15, stardustPower: 15 }, next: 'borrow' },
                    { text: '觉得太荒谬而忽略', effects: { mood: -5 }, next: 'ignore' }
                ]
            },
            8: {
                title: '第一次试炼',
                desc: '星儿在学校遇到了霸凌。几个高年级学生嘲笑她是「没人要的野孩子」。这次，她没有退缩，而是运用不知从哪来的力量，让那些孩子的书包突然发光，吓得他们落荒而逃...',
                emoji: '⚡',
                choices: [
                    { text: '教导她正确运用力量', effects: { mor: 15, stardustPower: 20 }, next: 'teach' },
                    { text: '警告她不能滥用力量', effects: { mor: 10, str: 10 }, next: 'warn' },
                    { text: '为她保护自己的行为感到骄傲', effects: { affection: 15, str: 10 }, next: 'proud' }
                ]
            },
            9: {
                title: '贤者的预言',
                desc: '镇上隐居的老贤者主动找上门来。他说在星儿出生前就预言到了「星尘之女」的降临。他警告说，当第三个秋天来临时，星儿将面临第一次真正的考验...',
                emoji: '👴',
                choices: [
                    { text: '认真听取预言并准备', effects: { sen: 20, stardustPower: 20 }, next: 'prepare' },
                    { text: '质疑贤者的动机', effects: { sen: 15, int: 10 }, next: 'doubt' },
                    { text: '保护星儿不受预言影响', effects: { affection: 15, mood: 10 }, next: 'protect' }
                ]
            },
            10: {
                title: '第一年的结束',
                desc: '一年过去了，星儿从一个怯生生的小女孩变成了自信的少女。在年终庆典上，她站在舞台上表演了一首自己创作的歌曲。歌词中唱着一个关于星星、命运和家人的故事...',
                emoji: '🎭',
                choices: [
                    { text: '为她的成长感到欣慰', effects: { affection: 25, cha: 20 }, next: 'proud' },
                    { text: '鼓励她继续追寻真相', effects: { stardustPower: 20, mor: 15 }, next: 'encourage' },
                    { text: '珍惜眼前的幸福时光', effects: { mood: 20, ele: 15 }, next: 'cherish' }
                ]
            },

            // ========== 第二年：觉醒与成长 ==========
            12: {
                title: '吊坠的秘密',
                desc: '第二年开始不久，一天晚上，星儿的吊坠突然发出强烈的蓝光。光芒在墙上投射出奇怪的符号和星图。星儿惊恐又兴奋地发现，她能读懂那些符号——那是星尘一族的古文字...',
                emoji: '✨',
                choices: [
                    { text: '一起研究吊坠的力量', effects: { stardustPower: 40, int: 15 }, next: 'research' },
                    { text: '安慰她不用担心', effects: { affection: 20, mood: 15 }, next: 'comfort' },
                    { text: '去图书馆查找资料', effects: { stardustPower: 30, int: 20 }, next: 'library' }
                ]
            },
            13: {
                title: '新同学的秘密',
                desc: '新学期来了一位转学生——一个叫「流」的神秘少年。他似乎对星儿格外关注。某天放学后，他私下找到星儿，说：「我知道你的秘密。因为我也是...星尘一族。」',
                emoji: '🎭',
                choices: [
                    { text: '让星儿与他交朋友', effects: { soc: 20, stardustPower: 20 }, next: 'friend' },
                    { text: '调查他的背景', effects: { sen: 25, int: 15 }, next: 'investigate' },
                    { text: '警告他不要接近星儿', effects: { affection: 15, str: 10 }, next: 'warn' }
                ]
            },
            14: {
                title: '第一个任务',
                desc: '「流」告诉星儿，星尘一族散落在大陆各处，而她肩负着复兴一族的使命。他说北方的「陨星山脉」有一座古老的祭坛，只有星尘之女才能开启。这是一个验证身份的机会...',
                emoji: '🏔️',
                choices: [
                    { text: '支持星儿前往探索', effects: { stardustPower: 30, mor: 15 }, next: 'explore' },
                    { text: '陪同她一起前往', effects: { str: 20, sen: 15 }, next: 'accompany' },
                    { text: '认为太危险而拒绝', effects: { affection: 10, stardustPower: -20 }, next: 'refuse' }
                ]
            },
            15: {
                title: '陨星祭坛',
                desc: '经过长途跋涉，你们到达了陨星山脉。在山顶，星儿将吊坠放在祭坛上。瞬间，整个祭坛被星光包围，一个苍老的声音响起：「欢迎回来，星尘之女。你的试炼即将开始...」',
                emoji: '🏛️',
                choices: [
                    { text: '鼓励她接受试炼', effects: { stardustPower: 50, mor: 20 }, next: 'trial' },
                    { text: '询问试炼内容', effects: { int: 20, stardustPower: 30 }, next: 'ask' },
                    { text: '保护她不让她冒险', effects: { affection: 20, stardustPower: -30 }, next: 'protect' }
                ]
            },
            16: {
                title: '第一次试炼：勇气',
                desc: '星儿被传送到一个幻境中，必须独自面对内心最深的恐惧。透过水晶球，你看到她看到了自己被遗弃的那一天。她在幻境中哭泣、愤怒、绝望...但最后，她选择了原谅和理解。',
                emoji: '🦁',
                choices: [
                    { text: '为她战胜恐惧而骄傲', effects: { affection: 30, str: 20 }, next: 'proud' },
                    { text: '安慰她过去的伤痛', effects: { affection: 25, mood: 20 }, next: 'comfort' },
                    { text: '教导她从中汲取力量', effects: { mor: 25, stardustPower: 30 }, next: 'teach' }
                ]
            },
            18: {
                title: '星尘之力的觉醒',
                desc: '通过试炼后，星儿的力量彻底觉醒。她开始展现出强大的感知能力，能「看到」能量的流动，预知即将发生的危险。但随之而来的是剧烈的头痛和失控的闪光。这份力量既是礼物，也是诅咒...',
                emoji: '🌟',
                choices: [
                    { text: '鼓励她接受并控制这份力量', effects: { stardustPower: 60, sen: 25 }, next: 'accept' },
                    { text: '带她寻找控制方法', effects: { int: 20, stardustPower: 40 }, next: 'control' },
                    { text: '担心她的安全而暂时压制', effects: { health: 15, stardustPower: -20 }, next: 'suppress' }
                ]
            },
            20: {
                title: '黑暗中的阴影',
                desc: '随着星儿力量的觉醒，一些不怀好意的势力也开始注意到她。最近镇上出现了可疑的陌生人，他们总是远远观察星儿。某晚，星儿感应到一股强烈的恶意正在接近...',
                emoji: '🌑',
                choices: [
                    { text: '加强警惕并训练防御', effects: { str: 25, sen: 20 }, next: 'defense' },
                    { text: '调查这些陌生人的来历', effects: { int: 25, sen: 20 }, next: 'spy' },
                    { text: '带星儿暂时离开镇上', effects: { soc: -10, affection: 20 }, next: 'escape' }
                ]
            },
            22: {
                title: '流的真实身份',
                desc: '「流」终于坦白了一切。他是星尘一族的守护者后裔，被派来寻找失落的「星尘之女」。但现在，他不仅仅是任务的执行者——他已经把星儿当作真正的家人。一个艰难的选择摆在他面前：完成任务带走星儿，还是违抗命令保护她...',
                emoji: '🎭',
                choices: [
                    { text: '说服他留下保护星儿', effects: { soc: 30, stardustPower: 30 }, next: 'persuade' },
                    { text: '感谢他的帮助但让他自由选择', effects: { mor: 25, ele: 20 }, next: 'freedom' },
                    { text: '警惕他可能的背叛', effects: { sen: 30 }, next: 'distrust' }
                ]
            },
            24: {
                title: '神秘的访客',
                desc: '第二年即将结束，一位自称是「星尘守护者」的老人来到镇上。他说一直在寻找星儿，并带来了关于她父母的消息——他们为了保护星儿而牺牲，将她送出族地避难。现在，危险再次临近，星儿必须做出选择...',
                emoji: '👴',
                choices: [
                    { text: '相信守护者的话', effects: { stardustPower: 50, mor: 15 }, next: 'trust' },
                    { text: '保持距离观察', effects: { sen: 30, stardustPower: 25 }, next: 'watch' },
                    { text: '拒绝让他影响星儿的选择', effects: { affection: 20, stardustPower: -30 }, next: 'reject' }
                ]
            },

            // ========== 第三年：抉择与命运 ==========
            25: {
                title: '新的危机',
                desc: '守护者警告说，一个名为「虚空教团」的邪恶组织正在猎杀星尘后裔，吸收他们的力量。星儿作为最后的纯血星尘之女，是他们的终极目标。你们必须决定是主动出击还是继续躲藏...',
                emoji: '⚔️',
                choices: [
                    { text: '主动出击对抗邪恶', effects: { str: 30, mor: 20, stardustPower: 40 }, next: 'fight' },
                    { text: '加强防御保护星儿', effects: { sen: 30, stardustPower: 30 }, next: 'defend' },
                    { text: '寻求其他势力的帮助', effects: { soc: 30, int: 20 }, next: 'ally' }
                ]
            },
            27: {
                title: '流的选择',
                desc: '族地的命令终于到来——「流」必须带星儿回去。面对族规和友情，「流」做出了选择：他背叛了自己的使命，决定留在星儿身边保护她。但这个选择意味着他被自己的族人放逐，永远无法回家...',
                emoji: '💔',
                choices: [
                    { text: '感谢他的牺牲', effects: { affection: 30, mor: 25 }, next: 'gratitude' },
                    { text: '接纳他成为家人', effects: { soc: 25, affection: 35 }, next: 'family' },
                    { text: '担心他的未来', effects: { sen: 25, ele: 20 }, next: 'worry' }
                ]
            },
            28: {
                title: '第二次试炼：智慧',
                desc: '星儿必须通过星尘一族的第二次试炼——智慧之试。她被要求解开一个古老的谜题，关乎星尘一族的存亡。谜题的答案隐藏在她这一年多的经历中...',
                emoji: '📜',
                choices: [
                    { text: '相信她能独立解开', effects: { int: 30, stardustPower: 40 }, next: 'trust' },
                    { text: '给予她提示和引导', effects: { int: 25, affection: 20 }, next: 'guide' },
                    { text: '与她一起思考', effects: { int: 20, stardustPower: 30 }, next: 'together' }
                ]
            },
            30: {
                title: '真相的碎片',
                desc: '通过第二次试炼后，星儿获得了更多关于身世的记忆。原来她是星尘一族王族的最后血脉，她的父母为了封印即将苏醒的「虚空之主」而献出了生命。而现在，封印开始松动了...',
                emoji: '🔮',
                choices: [
                    { text: '支持她完成父母的使命', effects: { stardustPower: 70, mor: 25 }, next: 'destiny' },
                    { text: '让她自己决定未来', effects: { affection: 30, stardustPower: 40 }, next: 'choice' },
                    { text: '担心她的安全试图阻止', effects: { affection: 25, stardustPower: -40 }, next: 'protect' }
                ]
            },
            32: {
                title: '最终试炼前的宁静',
                desc: '最终试炼即将来临。星儿提议回翡翠镇度过最后一个平静的月份。她走遍了镇上每一个熟悉的地方，和每一个帮助过她的人道别。晚上，她握着你的手说：「无论发生什么，谢谢你这三年的陪伴。」',
                emoji: '🌸',
                choices: [
                    { text: '告诉她你会永远支持她', effects: { affection: 50, stardustPower: 50 }, next: 'support' },
                    { text: '珍惜最后的平静时光', effects: { mood: 30, ele: 30 }, next: 'cherish' },
                    { text: '鼓励她勇敢面对未来', effects: { str: 30, mor: 30 }, next: 'encourage' }
                ]
            },
            33: {
                title: '第三次试炼：心灵',
                desc: '最终的试炼在星尘一族的圣地展开。星儿必须面对自己内心最深处的欲望和恐惧——放弃力量过平凡的生活，还是接受命运成为守护者？在幻境中，她看到了可能的未来：平凡的幸福，或是孤独的荣耀...',
                emoji: '💫',
                choices: [
                    { text: '尊重她内心的选择', effects: { affection: 40, stardustPower: 60 }, next: 'respect' },
                    { text: '提醒她责任的重要性', effects: { mor: 35, stardustPower: 50 }, next: 'duty' },
                    { text: '告诉她幸福才是最重要的', effects: { affection: 50, mood: 30 }, next: 'happiness' }
                ]
            },
            34: {
                title: '虚空来袭',
                desc: '就在星儿完成试炼的瞬间，虚空教团发起了总攻。教团首领——一个被虚空腐蚀的前星尘族人——亲自降临。他狂笑着说：「终于找到你了，最后的星尘之血！」',
                emoji: '🔥',
                choices: [
                    { text: '与星儿并肩作战', effects: { str: 40, stardustPower: 70 }, next: 'fight' },
                    { text: '保护星儿寻找机会', effects: { sen: 40, stardustPower: 50 }, next: 'protect' },
                    { text: '试图唤醒敌人的良知', effects: { mor: 40, cha: 30 }, next: 'redeem' }
                ]
            },
            35: {
                title: '最终对决',
                desc: '决战在翡翠镇上空展开。星儿释放出全部的星尘之力，星光与虚空激烈碰撞。在关键时刻，星儿没有选择消灭敌人，而是用星尘之力净化了他体内的虚空。敌人恢复理智后，感激地消散在光芒中...',
                emoji: '⚡',
                choices: [
                    { text: '为她的成长感到骄傲', effects: { affection: 50, stardustPower: 80 }, next: 'proud' },
                    { text: '赞扬她的仁慈和力量', effects: { mor: 40, cha: 40 }, next: 'praise' },
                    { text: '紧紧拥抱她', effects: { affection: 60, mood: 40 }, next: 'hug' }
                ]
            },
            36: {
                title: '命运的抉择 - 最终章',
                desc: '三年后，星儿已经成长为一位美丽而强大的少女。星尘之力完全觉醒，她面临着最终的抉择：接受命运成为新一代的星尘守护者，守护整个大陆的和平；或是放弃力量，选择平凡但幸福的生活。无论她选择什么，你都知道，这三年的养育已经让她成为了一个善良而坚强的人...',
                emoji: '👑',
                choices: [
                    { text: '鼓励她接受传承成为守护者', effects: { stardustPower: 100, mor: 50 }, next: 'guardian' },
                    { text: '支持她选择自己的人生', effects: { affection: 50, mood: 50 }, next: 'freedom' },
                    { text: '告诉她无论选择什么都会支持', effects: { affection: 80, stardustPower: 50 }, next: 'support' }
                ]
            }
        };

        // 结局定义 - 与新主线剧情匹配
window.endings = {
            // S级结局 - 完美结局
            stardust_guardian: {
                title: '星尘守护者',
                emoji: '👑',
                desc: '星儿接受了命运，成为了新一代的星尘守护者。她用力量净化了虚空，重建了星尘一族的荣光。而你，作为她的养父/母，被尊为「星尘之父/母」，永远被铭记在历史中。',
                condition: (s) => s.stardustPower >= 800 && s.affection >= 700 && s.stats.mor >= 500,
                rank: 'S'
            },
            stardust_redeemer: {
                title: '虚空净化者',
                emoji: '✨',
                desc: '星儿没有选择消灭虚空，而是用理解和宽恕净化了它。这种前所未有的方式创造了新的可能——虚空与星光共存的世界。她成为了两个世界之间的桥梁。',
                condition: (s) => s.stardustPower >= 700 && s.stats.cha >= 600 && s.stats.mor >= 600,
                rank: 'S'
            },

            // A级结局 - 优秀结局
            sage: {
                title: '星尘贤者',
                emoji: '📚',
                desc: '星儿将星尘之力与知识结合，成为了史上最年轻的星尘贤者。她在王都建立了新的学院，教导人们如何与自然和谐共处。她的著作《星光与智慧》成为了经典。',
                condition: (s) => s.stats.int >= 700 && s.stardustPower >= 500,
                rank: 'A'
            },
            sword_dancer: {
                title: '星光剑姬',
                emoji: '⚔️',
                desc: '星儿将剑术与星尘之力融合，创造出独特的「星光剑舞」。她成为了王国王室的御前剑士，用剑守护着重要的人。据说她的剑能在黑夜中划出银河。',
                condition: (s) => s.stats.str >= 700 && s.stats.cha >= 600 && s.stardustPower >= 400,
                rank: 'A'
            },
            business: {
                title: '星商女王',
                emoji: '💎',
                desc: '星儿用星尘之力培育出了传说中的「星光花」，成为了稀世珍宝。她建立的商业帝国遍布大陆，但她始终记得翡翠镇，将大部分财富用于帮助贫困的孩子们。',
                condition: (s) => s.stats.soc >= 700 && s.gold >= 5000 && s.stardustPower >= 300,
                rank: 'A'
            },
            diplomat: {
                title: '和平使者',
                emoji: '🕊️',
                desc: '凭借高超的社交能力和星尘之力的加持，星儿成为了各国之间的和平使者。她化解了无数冲突，被尊称为「微笑的调停者」。',
                condition: (s) => s.stats.soc >= 800 && s.stats.ele >= 600 && s.stats.mor >= 500,
                rank: 'A'
            },

            // B级结局 - 普通结局
            ordinary_happy: {
                title: '平凡的幸福',
                emoji: '🏡',
                desc: '星儿选择放弃星尘之力，过上了普通人的生活。她在翡翠镇开了一家花店，嫁给了一个普通人，生了可爱的孩子。虽然没有传奇的故事，但她的笑容比任何时候都灿烂。',
                condition: (s) => s.stardustPower < 300 && s.affection >= 500 && s.mood >= 60,
                rank: 'B'
            },
            nature: {
                title: '森林守护者',
                emoji: '🌲',
                desc: '星儿选择隐居在森林深处，用剩余的星尘之力守护着那片土地。动物们视她为朋友，植物在她身边茁壮成长。偶尔会有迷路的旅人看到林间闪烁的星光...',
                condition: (s) => s.stats.sen >= 700 && s.stats.ele >= 600 && s.stardustPower >= 200,
                rank: 'B'
            },
            artist: {
                title: '星光画家',
                emoji: '🎨',
                desc: '星儿将星尘之力融入绘画，她的作品能在夜晚发出微光。虽然她没有成为传奇，但她的画作给无数人带来了希望和美好。',
                condition: (s) => s.stats.cha >= 600 && s.stats.int >= 400 && s.stardustPower >= 200,
                rank: 'B'
            },
            teacher: {
                title: '翡翠镇的教师',
                emoji: '📖',
                desc: '星儿选择留在翡翠镇，成为了学校最受欢迎的老师。她用自己的经历告诉每一个孩子：无论出身如何，都可以成为自己命运的主人。',
                condition: (s) => s.stats.int >= 500 && s.stats.mor >= 400 && s.affection >= 400,
                rank: 'B'
            },

            // C级结局 - 悲剧/隐藏结局
            fallen: {
                title: '虚空之女',
                emoji: '🌑',
                desc: '长期的压抑、忽视和缺乏关爱使星儿走向黑暗。虚空之力侵蚀了她的心灵，她成为了新一代的虚空女王。翡翠镇在她的怒火中化为废墟，而你，只能眼睁睁看着这一切发生...',
                condition: (s) => s.mood < 30 || s.stats.mor < 100 || s.affection < 200,
                rank: 'C'
            },
            lonely: {
                title: '孤独的守望者',
                emoji: '🚶',
                desc: '星儿与所有人渐行渐远，在一个雨夜独自离开了翡翠镇。多年后，有人传说在北方的冰原看到过她的身影，独自一人在星空下徘徊。',
                condition: (s) => s.affection < 300 && s.stats.soc < 300,
                rank: 'C'
            },
            sacrificed: {
                title: '最后的星尘',
                emoji: '💫',
                desc: '为了封印虚空之主，星儿献出了自己的生命。在消散前最后一刻，她微笑着对你说：「谢谢你，爸爸/妈妈，这三年的幸福，已经足够了。」她的身体化为星光，永远守护着这片土地。',
                condition: (s) => s.stardustPower >= 600 && s.stats.mor >= 600 && s.affection < 400,
                rank: 'C'
            },
            forgotten: {
                title: '被遗忘的星光',
                emoji: '👤',
                desc: '星儿选择封印自己的记忆和力量，彻底成为普通人。她忘记了星尘之力，忘记了身世之谜，甚至...忘记了你。虽然她就生活在隔壁，但你们成为了最熟悉的陌生人。',
                condition: (s) => s.stardustPower < 100 && s.stats.sen < 200 && s.affection < 300,
                rank: 'C'
            },

            // 默认结局
            default: {
                title: '未完待续',
                emoji: '🌅',
                desc: '星儿的旅程还在继续。无论选择何种道路，她都将带着你的教导，勇敢地面对未来。或许在某个星空璀璨的夜晚，你们会想起这段难忘的时光...',
                condition: () => true,
                rank: 'B'
            }
        };

        // 店铺数据
window.shopTypes = {
            flower: {
                name: '花店「星之庭」',
                products: [
                    { id: 'rose', name: '玫瑰', icon: '🌹', cost: 10, price: 20 },
                    { id: 'lily', name: '百合', icon: '🌼', cost: 15, price: 30 },
                    { id: 'sunflower', name: '向日葵', icon: '🌻', cost: 8, price: 18 },
                    { id: 'star_flower', name: '星尘花', icon: '✨', cost: 50, price: 120 }
                ]
            },
            book: {
                name: '书铺「智慧屋」',
                products: [
                    { id: 'novel', name: '小说', icon: '📖', cost: 15, price: 30 },
                    { id: 'poetry', name: '诗集', icon: '📜', cost: 20, price: 40 },
                    { id: 'history', name: '史书', icon: '📚', cost: 25, price: 50 },
                    { id: 'magic_book', name: '魔法书', icon: '🔮', cost: 80, price: 200 }
                ]
            },
            alchemy: {
                name: '炼金小屋',
                products: [
                    { id: 'potion', name: '治疗药水', icon: '🧪', cost: 20, price: 45 },
                    { id: 'elixir', name: '精灵精华', icon: '✨', cost: 40, price: 90 },
                    { id: 'crystal', name: '魔力水晶', icon: '💎', cost: 60, price: 140 },
                    { id: 'stardust', name: '星尘粉末', icon: '🌟', cost: 100, price: 250 }
                ]
            }
        };

        // ==================== 多轮对话系统 ====================

        // 月份主题对话配置
        window.monthlyThemes = {
            // 第一年 - 初遇与适应
            1: {
                theme: '新家',
                intro: '爸爸，我们的新家真温馨...虽然刚开始有些不习惯，但现在我觉得很幸福。',
                rounds: [
                    {
                        text: '你觉得我表现得还好吗？有没有给你添麻烦？',
                        options: [
                            { text: '你已经很棒了，我很开心有你陪伴', emotion: 'loving', effects: { affection: 8, mood: 10 }, response: '真的吗？太好了！我会继续努力的！' },
                            { text: '偶尔会有小麻烦，但这就是家人啊', emotion: 'warm', effects: { affection: 5, mood: 5 }, response: '嘿嘿...我会尽量乖一点的。' },
                            { text: '只要努力，未来会更好的', emotion: 'encourage', effects: { affection: 3, mor: 5 }, response: '嗯！我会加油的！' }
                        ]
                    },
                    {
                        text: '对了爸爸，下个月镇上有春日祭典，我们可以一起去吗？',
                        options: [
                            { text: '当然可以，我很期待', emotion: 'excited', effects: { affection: 6, mood: 10 }, response: '太好了！我要好好准备！' },
                            { text: '看你的表现而定哦', emotion: 'playful', effects: { affection: 4, mood: 5 }, response: '那我一定会好好表现的！' }
                        ]
                    }
                ]
            },
            2: {
                theme: '学习',
                intro: '爸爸，学校的课程比我想象的要难呢...',
                rounds: [
                    {
                        text: '特别是数学，老师讲的我有时候听不懂...',
                        options: [
                            { text: '回家我教你，不用担心', emotion: 'support', effects: { affection: 10, int: 3 }, response: '真的吗？爸爸最厉害了！' },
                            { text: '不懂就问老师，多练习就会了', emotion: 'guide', effects: { affection: 5, mor: 3 }, response: '嗯，我会多向老师请教的。' },
                            { text: '慢慢来，学习是个过程', emotion: 'comfort', effects: { affection: 6, mood: 5 }, response: '谢谢爸爸，我会耐心的。' }
                        ]
                    },
                    {
                        text: '我会加油的！以后要成为让爸爸骄傲的人！',
                        options: [
                            { text: '你已经是我的骄傲了', emotion: 'proud', effects: { affection: 12, mood: 10 }, response: '爸爸...呜呜...我太感动了...' },
                            { text: '我们一起进步', emotion: 'together', effects: { affection: 8, mood: 5 }, response: '嗯！一起加油！' }
                        ]
                    }
                ]
            },
            3: {
                theme: '朋友',
                intro: '爸爸，我今天交到了一个新朋友！她叫莉莉~',
                rounds: [
                    {
                        text: '她人很好，我们经常一起聊天。你觉得我可以邀请她来家里玩吗？',
                        options: [
                            { text: '当然可以，随时欢迎', emotion: 'welcome', effects: { affection: 6, soc: 5 }, response: '太好了！我明天就告诉她！' },
                            { text: '先多了解她一段时间吧', emotion: 'cautious', effects: { affection: 4, sen: 3 }, response: '嗯，你说得对，我要谨慎一点。' }
                        ]
                    },
                    {
                        text: '有朋友的感觉真好...以前我都没有什么朋友。',
                        options: [
                            { text: '以后你会有更多朋友的', emotion: 'optimistic', effects: { affection: 8, mood: 10 }, response: '嗯！因为有爸爸在，我变得更勇敢了！' },
                            { text: '朋友要真心相待', emotion: 'wise', effects: { affection: 5, mor: 5 }, response: '我会珍惜这段友情的！' }
                        ]
                    }
                ]
            },
            4: {
                theme: '兴趣',
                intro: '爸爸，我最近发现了一件有趣的事情！学校有艺术社团，我去看了一下，发现绘画、音乐和舞蹈都好有趣！',
                onStart: () => {
                    window.gameState.storyFlags.discovered_art_interest = true;
                    showNotification('解锁新活动', '艺术课程已解锁！');
                },
                rounds: [
                    {
                        text: '我发现自己对{{interest}}特别感兴趣！你觉得我应该深入学习吗？',
                        options: [
                            { text: '追随自己的心意，我会支持你的', emotion: 'support', effects: { affection: 10, mood: 10, interestStat: 5 }, response: '谢谢爸爸！我一定会努力的！' },
                            { text: '可以试试看，但要平衡其他课程', emotion: 'balanced', effects: { affection: 6, int: 3 }, response: '嗯，我会合理安排时间的。' },
                            { text: '先打好基础，再深入钻研', emotion: 'wise', effects: { affection: 4, int: 5 }, response: '爸爸说得对，我要一步一步来。' }
                        ]
                    },
                    {
                        text: '有你支持我就有信心了。我会好好努力的！',
                        options: [
                            { text: '我相信你', emotion: 'proud', effects: { affection: 6, mood: 5 }, response: '嗯！不会让你失望的！' },
                            { text: '累了记得休息', emotion: 'caring', effects: { affection: 7, mood: 8 }, response: '爸爸总是这么温柔...谢谢你！' }
                        ]
                    }
                ]
            },
            5: {
                theme: '夏日',
                intro: '夏天到了呢！天气越来越热了~',
                rounds: [
                    {
                        text: '爸爸，我们可以去河边玩水吗？我看到其他小朋友都去了...',
                        options: [
                            { text: '好啊，周末一起去', emotion: 'fun', effects: { affection: 8, mood: 15 }, response: '耶！最喜欢爸爸了！' },
                            { text: '河边危险，我们去泳池吧', emotion: 'caring', effects: { affection: 6, mor: 3 }, response: '泳池也可以！只要能玩水就行！' },
                            { text: '先完成学习任务再说', emotion: 'strict', effects: { affection: 3, int: 5 }, response: '嗯...好吧，我会先完成学习的。' }
                        ]
                    },
                    {
                        text: '对了，莉莉说她妈妈会做很好吃的西瓜冰，我也想做给爸爸吃！',
                        options: [
                            { text: '好期待啊', emotion: 'happy', effects: { affection: 8, mood: 5 }, response: '嘿嘿，我要向莉莉妈妈请教怎么做！' },
                            { text: '小心别着凉了', emotion: 'caring', effects: { affection: 6, mood: 3 }, response: '知道啦，我会注意的~' }
                        ]
                    }
                ]
            },
            6: {
                theme: '成长',
                intro: '爸爸...我最近在想一个问题。',
                rounds: [
                    {
                        text: '我胸前的这个吊坠...它有什么秘密吗？有时候我会梦到很奇怪的画面...',
                        options: [
                            { text: '等时机成熟，我会告诉你的', emotion: 'mystery', effects: { affection: 5, stardustPower: 5 }, response: '嗯...我等着那一天。' },
                            { text: '不管它是什么，你都是我的女儿', emotion: 'accept', effects: { affection: 12, mood: 10 }, response: '爸爸...谢谢你！' },
                            { text: '不要想太多，现在重要的是成长', emotion: 'guide', effects: { affection: 6, mor: 5 }, response: '嗯，我会专注于现在的。' }
                        ]
                    },
                    {
                        text: '不管过去怎样，我现在有爸爸就够了。',
                        options: [
                            { text: '我们会一起面对未来', emotion: 'together', effects: { affection: 10, mood: 10 }, response: '嗯！一起去创造我们的未来！' },
                            { text: '去探索你想知道的真相吧', emotion: 'encourage', effects: { affection: 7, stardustPower: 3 }, response: '如果我找到答案，会第一个告诉爸爸的！' }
                        ]
                    }
                ]
            },
            7: {
                theme: '挑战',
                intro: '爸爸...最近我觉得有点累。',
                rounds: [
                    {
                        text: '课程变难了，有时候感觉跟不上...我是不是太笨了？',
                        options: [
                            { text: '每个人都有自己的节奏，不要急', emotion: 'comfort', effects: { affection: 10, mood: 15 }, response: '嗯...你说得对，我不能和别人比。' },
                            { text: '遇到困难就告诉我，我们一起解决', emotion: 'support', effects: { affection: 12, mood: 10 }, response: '谢谢爸爸，有你在我就安心了。' },
                            { text: '努力一定会有回报的', emotion: 'encourage', effects: { affection: 6, mor: 8 }, response: '我会继续加油的！' }
                        ]
                    },
                    {
                        text: '嗯...你说得对。我会继续加油的！谢谢爸爸总是这么温柔...',
                        options: [
                            { text: '不管发生什么，我都在你身边', emotion: 'loving', effects: { affection: 15, mood: 10 }, response: '爸爸...呜呜...我太幸福了...' },
                            { text: '我们是一家人嘛', emotion: 'warm', effects: { affection: 8, mood: 5 }, response: '嗯！最棒的家人！' }
                        ]
                    }
                ]
            },
            8: {
                theme: '秋意',
                intro: '秋天了呢，树叶都变黄了，好美啊~',
                rounds: [
                    {
                        text: '爸爸，我们去爬山好不好？我想看满山红叶！',
                        options: [
                            { text: '好啊，周末一起去', emotion: 'fun', effects: { affection: 8, mood: 12 }, response: '太好了！我要带相机去拍照！' },
                            { text: '等天气再好一点吧', emotion: 'practical', effects: { affection: 4, sen: 3 }, response: '嗯，那我们再等等。' }
                        ]
                    },
                    {
                        text: '莉莉说秋天是收获的季节，我今年收获了什么呢...',
                        options: [
                            { text: '收获了知识和成长', emotion: 'wise', effects: { affection: 6, int: 3 }, response: '嗯！我确实学到了很多呢！' },
                            { text: '收获了珍贵的友谊', emotion: 'emotional', effects: { affection: 8, soc: 5 }, response: '对！还有爸爸的爱！' }
                        ]
                    }
                ]
            },
            9: {
                theme: '期中',
                intro: '爸爸，期中考试的成绩出来了...',
                rounds: [
                    {
                        text: '我考得还不错！老师说我有进步！',
                        options: [
                            { text: '真棒！你的努力有回报了', emotion: 'proud', effects: { affection: 10, mood: 10 }, response: '都是爸爸教得好！' },
                            { text: '继续保持，不要骄傲', emotion: 'guide', effects: { affection: 5, mor: 5 }, response: '嗯，我会继续努力的！' }
                        ]
                    },
                    {
                        text: '我想把成绩单贴在墙上，可以吗？',
                        options: [
                            { text: '当然，那是你的荣耀', emotion: 'proud', effects: { affection: 8, mood: 5 }, response: '耶！我要让所有人都看到！' },
                            { text: '贴在房间里自己看就好', emotion: 'modest', effects: { affection: 4, ele: 5 }, response: '嗯，谦虚使人进步嘛。' }
                        ]
                    }
                ]
            },
            10: {
                theme: '周年',
                intro: '爸爸，我们来这个家已经一年了呢...',
                rounds: [
                    {
                        text: '回想这一年，真的很感谢爸爸。如果当初没有遇到你...',
                        options: [
                            { text: '命运让我们相遇', emotion: 'destiny', effects: { affection: 10, stardustPower: 5 }, response: '嗯，这是最棒的命运！' },
                            { text: '重要的是现在我们在一起', emotion: 'present', effects: { affection: 10, mood: 10 }, response: '嗯！现在和未来我们都要在一起！' }
                        ]
                    },
                    {
                        text: '明年也请多多指教！我要成为让爸爸骄傲的女儿！',
                        options: [
                            { text: '你已经是我的骄傲了', emotion: 'proud', effects: { affection: 15, mood: 10 }, response: '爸爸...呜呜...我太感动了...' },
                            { text: '我们一起成长', emotion: 'together', effects: { affection: 10, mood: 5 }, response: '嗯！一起变成更好的人！' }
                        ]
                    }
                ]
            },
            11: {
                theme: '冬天',
                intro: '好冷啊...冬天真的来了呢。',
                rounds: [
                    {
                        text: '爸爸的手冷不冷？我给你暖暖~',
                        options: [
                            { text: '有你在我就不冷', emotion: 'loving', effects: { affection: 12, mood: 10 }, response: '嘿嘿，那我多给你暖一会儿！' },
                            { text: '你把自己照顾好就行', emotion: 'caring', effects: { affection: 8, mood: 5 }, response: '我已经穿得够厚啦！' }
                        ]
                    },
                    {
                        text: '听说冬天下雪的时候许愿会实现呢...',
                        options: [
                            { text: '你想许什么愿？', emotion: 'curious', effects: { affection: 6, mood: 5 }, response: '秘密~不能告诉爸爸~' },
                            { text: '愿望要靠自己去实现', emotion: 'wise', effects: { affection: 5, mor: 5 }, response: '嗯！我会为了愿望努力的！' }
                        ]
                    }
                ]
            },
            12: {
                theme: '年末',
                intro: '一年就要结束了呢...',
                rounds: [
                    {
                        text: '爸爸，新的一年有什么愿望吗？',
                        options: [
                            { text: '希望我的女儿健康快乐', emotion: 'loving', effects: { affection: 15, mood: 10 }, response: '爸爸...你总是为我着想...' },
                            { text: '希望你学业进步', emotion: 'expect', effects: { affection: 8, int: 3 }, response: '我会努力的！不会让爸爸失望！' }
                        ]
                    },
                    {
                        text: '我的愿望是...永远和在一起！',
                        options: [
                            { text: '我们永远是一家人', emotion: 'loving', effects: { affection: 20, mood: 15 }, response: '嗯！最棒的一家人！' }
                        ]
                    }
                ]
            },
            // 第二年（13-24月）- 更大更复杂的对话
            13: {
                theme: '新年',
                intro: '新年快乐，爸爸！',
                rounds: [
                    {
                        text: '新的一年开始了，我有好多想做的事情！你觉得我应该先从什么开始？',
                        options: [
                            { text: '制定一个计划，一步一步来', emotion: 'wise', effects: { affection: 6, int: 5 }, response: '嗯，我要做一个详细的新年计划！' },
                            { text: '跟着感觉走，享受过程', emotion: 'free', effects: { affection: 8, mood: 10 }, response: '嘿嘿，爸爸说得对，开心最重要！' }
                        ]
                    },
                    {
                        text: '我有一种预感，今年会是特别的一年！',
                        options: [
                            { text: '当然，每一年都是特别的', emotion: 'positive', effects: { affection: 10, mood: 10 }, response: '有爸爸在，每一天都很特别！' },
                            { text: '特别要靠自己去创造', emotion: 'motivate', effects: { affection: 6, mor: 5 }, response: '嗯！我要让今年成为最棒的一年！' }
                        ]
                    }
                ]
            },
            14: {
                theme: '社团',
                intro: '爸爸，学校有社团活动了！',
                rounds: [
                    {
                        text: '我想参加{{interest}}社团，你觉得怎么样？',
                        options: [
                            { text: '很好啊，去认识志同道合的朋友', emotion: 'support', effects: { affection: 8, soc: 5 }, response: '嗯！我可以交到更多朋友！' },
                            { text: '不要影响学习就好', emotion: 'cautious', effects: { affection: 5, int: 3 }, response: '我会平衡好时间的！' }
                        ]
                    },
                    {
                        text: '社团里还有学长学姐，可以向她们学习呢！',
                        options: [
                            { text: '多向前辈请教', emotion: 'respect', effects: { affection: 6, ele: 5 }, response: '嗯，我会虚心学习的！' },
                            { text: '也要有自己的想法', emotion: 'independent', effects: { affection: 7, mor: 5 }, response: '嗯，学习的同时也要保持自我！' }
                        ]
                    }
                ]
            },
            15: {
                theme: '烦恼',
                intro: '爸爸...我有一点烦恼...',
                rounds: [
                    {
                        text: '班上有男生说喜欢我...我该怎么办？',
                        options: [
                            { text: '这是很正常的事，不要紧张', emotion: 'calm', effects: { affection: 8, mood: 10 }, response: '嗯...但是我有点不知所措...' },
                            { text: '你现在应该把精力放在学习上', emotion: 'guide', effects: { affection: 5, int: 5 }, response: '嗯，你说得对，我会专注于学习的。' },
                            { text: '你怎么想呢？喜欢他吗？', emotion: 'ask', effects: { affection: 12, cha: 5 }, response: '我...我也不知道...就是觉得奇怪...' }
                        ]
                    },
                    {
                        text: '这就是大人们说的青春期吗？好复杂啊...',
                        options: [
                            { text: '这就是成长的一部分', emotion: 'understand', effects: { affection: 10, mood: 10 }, response: '嗯...我会慢慢学会的。' },
                            { text: '有任何问题都可以问我', emotion: 'open', effects: { affection: 12, mood: 5 }, response: '谢谢爸爸，有你在我就安心了！' }
                        ]
                    }
                ]
            }
        };

        // 默认对话（没有特定主题的月份使用）
        window.defaultTalks = {
            intro: [
                '爸爸，今天过得怎么样？',
                '爸爸，我有个好消息要告诉你！',
                '爸爸，能陪我聊聊天吗？',
                '最近发生了一些有趣的事情...'
            ],
            topics: [
                { text: '最近学习怎么样？', responses: ['还不错，老师讲的我都能听懂！', '有点难，但我会努力的！', '我发现了一个很有趣的知识点！'] },
                { text: '和朋友相处得还好吗？', responses: ['很好！我们关系更亲密了！', '嗯，但是有时候也会有小矛盾...', '我交到了新朋友！'] },
                { text: '有什么想做的事情吗？', responses: ['我想学更多东西！', '我想去更多地方看看！', '我想变得更厉害！'] },
                { text: '身体还好吗？', responses: ['很好！每天都很有精神！', '有点累，但是没关系！', '谢谢爸爸关心，我会注意休息的！'] }
            ]
        };

        // 获取女儿当前最感兴趣的方向
