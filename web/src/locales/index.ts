import { createI18n } from 'vue-i18n';

const messages = {
    en: {
        common: {
            loading: 'Loading...',
            backToDashboard: 'Back to Dashboard',
            notFound: 'Not Found',
            save: 'Save',
            cancel: 'Cancel',
            confirm: 'Confirm',
            delete: 'Delete',
            restore: 'Restore',
            trash: 'Trash',
            emptyTrash: 'Trash is empty',
        },
        dashboard: {
            title: 'My Tournaments',
            subtitle: 'Manage your chess pairings, track results, and organize seamless events.',
            createEvent: 'Create Event',
            viewTrash: 'View Trash',
            backToList: 'Back to List',
            confirmDelete: 'Are you sure you want to delete this tournament?',
            newTournament: 'New Tournament',
            noTournaments: 'No tournaments yet',
            getStarted: 'Create your first Swiss or Round Robin tournament.',
            enterName: 'Enter tournament name:',
        },
        tournament: {
            players: 'Players',
            round: 'Round',
            generate: 'Generate Pairings',
            pairing: 'Pairing...',
            generateNext: 'Generate Round {round}',
            tabs: {
                pairings: 'Pairings',
                players: 'Players',
                standings: 'Standings',
            },
            emptyPairings: 'No pairings generated yet. Click "Generate" to start Round 1.',
            emptyPlayers: 'No players added yet.',
            table: {
                rank: 'Rank',
                name: 'Name',
                rating: 'Rating',
                score: 'Score',
                board: 'Board',
            },
            addPlayer: 'Add Player',
            enterName: 'Full Name',
            enterRating: 'Rating (Standard)',
            status: {
                pending: 'PENDING',
                ongoing: 'ONGOING',
                completed: 'COMPLETED',
            }
        },
        nav: {
            dashboard: 'Dashboard',
            tournaments: 'Tournaments',
            settings: 'Settings',
            admin: 'Admin User',
            license: 'Pro License'
        },
        prompt: {
            enterName: 'Enter tournament name:',
            selectSystem: 'Select system (swiss/round_robin):',
            createSuccess: 'Tournament created successfully!',
            createFailed: 'Failed to create tournament.',
            addPlayerSuccess: 'Player added successfully!',
            addPlayerFailed: 'Failed to add player.',
            create: 'Create',
            cancel: 'Cancel'
        },
        system: {
            swiss: 'Swiss',
            round_robin: 'Round Robin'
        },
        color: {
            white: 'W',
            black: 'B',
            bye: 'Bye',
        }
    },
    zh: {
        common: {
            loading: '加载中...',
            backToDashboard: '返回仪表盘',
            notFound: '未找到',
            save: '保存',
            cancel: '取消',
            confirm: '确认',
            delete: '删除',
            restore: '恢复',
            trash: '回收站',
            emptyTrash: '回收站为空',
        },
        dashboard: {
            title: '我的赛事',
            subtitle: '管理国际象棋编排，追踪比赛结果，组织流畅的赛事体验。',
            createEvent: '创建赛事',
            viewTrash: '查看回收站',
            backToList: '返回列表',
            confirmDelete: '您确定要删除此赛事吗？',
            newTournament: '新建比赛',
            noTournaments: '暂无赛事',
            getStarted: '创建您的第一个瑞士制或循环赛。',
            enterName: '请输入比赛名称：',
        },
        tournament: {
            players: '位选手',
            round: '第 {round} 轮',
            generate: '生成对阵',
            pairing: '编排中...',
            generateNext: '生成第 {round} 轮',
            tabs: {
                pairings: '对阵表',
                players: '选手列表',
                standings: '积分榜',
            },
            emptyPairings: '暂无对阵。点击“生成对阵”开始第一轮。',
            emptyPlayers: '暂无选手信息。',
            table: {
                rank: '排名',
                name: '姓名',
                rating: '等级分',
                score: '积分',
                buchholz: '对手分 (BH)',
                medianBuchholz: '中间对手分',
                sb: '索伯分 (SB)',
                progressive: '累进分',
                wins: '胜局',
                blackWins: '后手胜',
                board: '台次',
            },

            status: {
                pending: '未开始',
                ongoing: '进行中',
                completed: '已结束',
            },
            result: {
                whiteWin: '白胜',
                blackWin: '黑胜',
                draw: '和棋',
                edit: '修改',
            },
            export: {
                title: '导出',
                excel: '导出 Excel',
                image: '导出图片',
                success: '导出成功',
            },
            rollback: {
                button: '撤销本轮',
                confirm: '确定要删除第 {round} 轮吗？此操作不可恢复，且会重新计算分数。',
                success: '本轮已撤销',
            },
            manual: {
                button: '手动调整',
                save: '保存调整',
                cancel: '取消',
                help: '点击两个选手以交换位置',
                saveSuccess: '对阵已更新',
                full: '全部',
            },
            settings: {
                title: '赛事设置',
                name: '赛事名称',
                note: '备注信息',
                save: '保存修改',
                success: '设置已更新',
            },
            dangerZone: {
                title: '危险区域',
                delete: '删除赛事',
                deleteConfirm: '确定要删除此赛事吗？操作无法撤销。',
            },
            addPlayer: '添加选手',
            enterName: '姓名',
            enterRating: '等级分 (标准分)',
        },
        nav: {
            dashboard: '仪表盘',
            tournaments: '赛事列表',
            settings: '设置',
            admin: '管理员',
            license: '专业版'
        },
        prompt: {
            enterName: '请输入比赛名称：',
            selectSystem: '请选择赛制 (swiss/round_robin)：',
            createSuccess: '赛事创建成功！',
            createFailed: '创建失败。',
            addPlayerSuccess: '选手添加成功！',
            addPlayerFailed: '选手添加失败。',
            create: '创建',
            cancel: '取消'
        },
        system: {
            swiss: '瑞士制',
            round_robin: '单循环'
        },
        color: {
            white: '白',
            black: '黑',
            bye: '轮',
        }
    }
};

const i18n = createI18n({
    legacy: false, // Use Composition API
    locale: 'zh', // Default to Chinese
    fallbackLocale: 'en',
    messages,
});

// 2.2 恢复赛事

export default i18n;
