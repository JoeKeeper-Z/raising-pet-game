        // 通用工具函数
        window.showNotification = function(title, content) {
            const notif = document.getElementById("notification");
            document.getElementById("notif-title").textContent = title;
            document.getElementById("notif-content").textContent = content;
            notif.classList.add("show");
            setTimeout(() => notif.classList.remove("show"), 3000);
        };

        // ==================== 游戏数据 ====================

        // 游戏状态
        window.gameState = {
            year: 1,        // 第几年 (1-3)
            month: 1,       // 第几月 (1-12)
            totalMonth: 1,  // 总月数 (1-36)
            gold: 500,
            season: 0,      // 0春 1夏 2秋 3冬
            stardustPower: 0,
            affection: 200,

            // 角色信息
            daughter: {
                name: '星儿',
                birthday: { month: 1, day: 1 }
            },
            father: {
                name: '爱德华',
                birthday: { month: 1, day: 1 }
            },

            // 星儿属性
            stats: {
                hp: 40,      // 体力
                int: 20,     // 智力
                cha: 20,     // 魅力
                soc: 20,     // 社交
                ele: 20,     // 气质
                mor: 40,     // 道德
                str: 20,     // 力量
                sen: 20      // 感知
            },

            // 衍生属性
            mood: 50,
            health: 80,

            // 隐藏属性
            storyFlags: {},
            triggeredEvents: [],

            // 本月已对话次数
            talkedThisMonth: 0,
            maxTalkPerMonth: 1,

            // 本月安排
            schedule: {
                activity: null
            },

            // 店铺
            shop: {
                type: 'flower', // flower, book, alchemy
                level: 1,
                income: 0,
                totalIncome: 0,
                inventory: {},
                priceMod: 100,
                promotion: 'none'
            },

            // 游戏进度
            gameOver: false,
            currentEnding: null
        };

        // 季节名称
        const seasons = ['春季', '夏季', '秋季', '冬季'];
        const seasonEmojis = ['🌸', '☀️', '🍂', '❄️'];

        // 课程/活动数据（每月一次，数值相应调整）
        const activities = {
            // 文化课 - 需要先进入学校才能解锁
            literature: {
                name: '📖 文学研修',
                type: 'culture',
                effects: { int: 40, ele: 10, mor: 5 },
                moodCost: -10,
                goldCost: 200,
                desc: '智力+40，气质+10，道德+5',
                unlockCondition: () => window.gameState.storyFlags.entered_school === true,
                lockedDesc: '需要先进入学校学习'
            },
            math: {
                name: '🔢 数学研修',
                type: 'culture',
                effects: { int: 50, sen: 5 },
                moodCost: -15,
                goldCost: 200,
                desc: '智力+50，感知+5',
                unlockCondition: () => window.gameState.storyFlags.entered_school === true,
                lockedDesc: '需要先进入学校学习'
            },
            history: {
                name: '🏛️ 历史研修',
                type: 'culture',
                effects: { int: 35, mor: 10, ele: 5 },
                moodCost: -8,
                goldCost: 200,
                desc: '智力+35，道德+10，气质+5',
                unlockCondition: () => window.gameState.storyFlags.entered_school === true,
                lockedDesc: '需要先进入学校学习'
            },

            // 艺术课 - 需要发现兴趣或加入艺术社
            painting: {
                name: '🎨 绘画专精',
                type: 'art',
                effects: { cha: 35, ele: 20, sen: 5 },
                moodCost: -5,
                goldCost: 240,
                desc: '魅力+35，气质+20，感知+5',
                unlockCondition: () => window.gameState.storyFlags.discovered_art_interest === true || window.gameState.stats.cha >= 100,
                lockedDesc: '需要先发现绘画兴趣或魅力达到100'
            },
            music: {
                name: '🎵 音乐专精',
                type: 'art',
                effects: { cha: 45, ele: 15, soc: 5 },
                moodCost: -8,
                goldCost: 280,
                desc: '魅力+45，气质+15，社交+5',
                unlockCondition: () => window.gameState.storyFlags.discovered_music_interest === true || window.gameState.stats.cha >= 120,
                lockedDesc: '需要先发现音乐兴趣或魅力达到120'
            },
            dance: {
                name: '💃 舞蹈专精',
                type: 'art',
                effects: { cha: 35, hp: 20, ele: 10 },
                moodCost: -5,
                goldCost: 240,
                desc: '魅力+35，体力+20，气质+10',
                unlockCondition: () => window.gameState.storyFlags.discovered_dance_interest === true || window.gameState.stats.cha >= 100,
                lockedDesc: '需要先发现舞蹈兴趣或魅力达到100'
            },

            // 体能训练 - 需要找到教练或体质达标
            sword: {
                name: '⚔️ 剑术特训',
                type: 'physical',
                effects: { str: 55, hp: 10, mor: 5 },
                moodCost: -12,
                goldCost: 160,
                desc: '力量+55，体力+10，道德+5',
                unlockCondition: () => window.gameState.storyFlags.met_sword_master === true || window.gameState.stats.str >= 100,
                lockedDesc: '需要先认识剑术教练或力量达到100'
            },
            fitness: {
                name: '💪 体能特训',
                type: 'physical',
                effects: { hp: 45, str: 20, sen: 5 },
                moodCost: -15,
                goldCost: 120,
                desc: '体力+45，力量+20，感知+5',
                unlockCondition: () => true // 基础训练始终可用
            },
            riding: {
                name: '🐴 骑术特训',
                type: 'physical',
                effects: { str: 25, sen: 25, ele: 10 },
                moodCost: -10,
                goldCost: 320,
                desc: '力量+25，感知+25，气质+10',
                unlockCondition: () => window.gameState.storyFlags.met_riding_instructor === true || window.gameState.stats.ele >= 80,
                lockedDesc: '需要先认识骑术教练或气质达到80'
            },

            // 社交活动 - 需要一定社交圈或被邀请
            social: {
                name: '👥 社交宴会',
                type: 'social',
                effects: { soc: 45, cha: 15, ele: 10 },
                moodCost: 15,
                goldCost: 120,
                desc: '社交+45，魅力+15，气质+10',
                unlockCondition: () => window.gameState.storyFlags.invited_to_social === true || window.gameState.stats.soc >= 150,
                lockedDesc: '需要被邀请参加宴会或社交达到150'
            },
            tea: {
                name: '🍵 贵族茶会',
                type: 'social',
                effects: { soc: 35, ele: 25, cha: 5 },
                moodCost: 10,
                goldCost: 160,
                desc: '社交+35，气质+25，魅力+5',
                unlockCondition: () => window.gameState.storyFlags.invited_to_tea === true || window.gameState.stats.ele >= 120,
                lockedDesc: '需要被邀请参加茶会或气质达到120'
            },
            party: {
                name: '🎭 盛大舞会',
                type: 'social',
                effects: { soc: 55, cha: 20, ele: 10 },
                moodCost: 25,
                goldCost: 400,
                desc: '社交+55，魅力+20，气质+10'
            },

            // 自由活动
            explore: {
                name: '🔍 野外探险',
                type: 'free',
                effects: { sen: 35, str: 10, hp: -5 },
                moodCost: 20,
                goldCost: 50,
                desc: '感知+35，力量+10（消耗体力）'
            },
            fishing: {
                name: '🎣 休闲垂钓',
                type: 'free',
                effects: { sen: 25, mood: 15, hp: 10 },
                moodCost: 25,
                goldCost: 20,
                desc: '感知+25，心情+25，体力恢复'
            },
            rest: {
                name: '😴 静养休息',
                type: 'free',
                effects: { hp: 60, mood: 35, mor: 5 },
                moodCost: 40,
                goldCost: 0,
                desc: '体力+60，心情+35，身心放松'
            },

            // 打工
            work1: {
                name: '🏪 杂货店经营',
                type: 'work',
                effects: { soc: 15, cha: 5 },
                goldGain: { min: 200, max: 320 },
                moodCost: -15,
                goldCost: 0,
                desc: '金币+200~320，社交+15'
            },
            work2: {
                name: '📚 图书管理',
                type: 'work',
                effects: { int: 15, sen: 5 },
                goldGain: { min: 160, max: 240 },
                moodCost: -8,
                goldCost: 0,
                desc: '金币+160~240，智力+15'
            },
            work3: {
                name: '⚗️ 炼金术士助手',
                type: 'work',
                effects: { int: 25, sen: 15, str: 5 },
                goldGain: { min: 320, max: 480 },
                moodCost: -20,
                goldCost: 0,
                req: { int: 300 },
                desc: '金币+320~480（需智力≥300）'
            }
        };

// ==================== 全局变量声明 ====================
window.eventQueue = [];
window.currentScene = null;
window.currentSceneLineIndex = 0;
window.weekStatChanges = {};
window.isProcessingEvents = false;
