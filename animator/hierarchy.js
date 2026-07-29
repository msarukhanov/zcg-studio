window.SkeletonHierarchy = {
    // Базовые стартовые связи костей (Родитель -> Дети)
    tree: {
        'torso': ['head', 'l_shoulder', 'r_shoulder', 'l_thigh', 'r_thigh'],
        'head': ['hair'],
        'l_shoulder': ['l_forehand'],
        'l_forehand': ['l_hand'],
        'r_shoulder': ['r_forehand'],
        'r_forehand': ['r_hand'],
        'l_thigh': ['l_shin'],
        'l_shin': ['l_foot'],
        'r_thigh': ['r_shin'],
        'r_shin': ['r_foot']
    },

    // Поиск родителя (работает динамически с текущим измененным деревом)
    getParentName: function(boneName) {
        for (var parent in this.tree) {
            if (this.tree.hasOwnProperty(parent) && this.tree[parent].indexOf(boneName) !== -1) {
                return parent;
            }
        }
        return null; // 'torso' корень, у него нет родителя
    },

    // Парсер имен файлов (проверяет совпадение по динамическому массиву из state.js)
    parseAssetBoneType: function(filename) {
        var cleanName = filename.replace('eleniel_assets_', '').replace('.png', '').toLowerCase();
        var currentBones = window.EditorState.skeletonRenderOrder;

        for (var i = 0; i < currentBones.length; i++) {
            if (cleanName.indexOf(currentBones[i]) !== -1) {
                return currentBones[i];
            }
        }
        return null;
    },

    // Вычисление глубины вложенности для отступов меню
    getBoneDepth: function(boneName) {
        var depth = 0;
        var currentParent = this.getParentName(boneName);
        while (currentParent) {
            depth++;
            currentParent = this.getParentName(currentParent);
        }
        return depth; // 0 для torso, 1 для head и т.д.
    }
};







//
// window.SkeletonHierarchy = {
//     // Жесткая структура дерева костей (Родитель -> Дети)
//     tree: {
//         'torso': ['head', 'l_shoulder', 'r_shoulder', 'l_thigh', 'r_thigh'],
//         'head': ['hair'],
//         'l_shoulder': ['l_forehand'],
//         'l_forehand': ['l_hand'],
//         'r_shoulder': ['r_forehand'],
//         'r_forehand': ['r_hand'],
//         'l_thigh': ['l_shin'],
//         'l_shin': ['l_foot'],
//         'r_thigh': ['r_shin'],
//         'r_shin': ['r_foot']
//     },
//
//     // Мгновенный поиск родителя для любой кости
//     getParentName: function(boneName) {
//         for (var parent in this.tree) {
//             if (this.tree.hasOwnProperty(parent) && this.tree[parent].indexOf(boneName) !== -1) {
//                 return parent;
//             }
//         }
//         return null; // 'torso' корень, у него нет родителя
//     },
//
//     // СТРОГИЙ ФИКС ОШИБКИ: Зашиваем список 15 костей прямо в модуль,
//     // чтобы функция больше никогда не зависела от внешнего состояния state.js и не падала в undefined
//     parseAssetBoneType: function(filename) {
//         var requiredBones = [
//             'torso', 'head', 'hair',
//             'l_shoulder', 'l_forehand', 'l_hand',
//             'r_shoulder', 'r_forehand', 'r_hand',
//             'l_thigh', 'l_shin', 'l_foot',
//             'r_thigh', 'r_shin', 'r_foot'
//         ];
//
//         var cleanName = filename.replace('eleniel_assets_', '').replace('.png', '').toLowerCase();
//
//         // Ищем совпадение в чистом массиве
//         for (var i = 0; i < requiredBones.length; i++) {
//             if (cleanName.indexOf(requiredBones[i]) !== -1) {
//                 return requiredBones[i];
//             }
//         }
//         return null;
//     },
//
//     // Вычисление глубины вложенности кости для отступов в меню
//     getBoneDepth: function(boneName) {
//         var depth = 0;
//         var currentParent = this.getParentName(boneName);
//         while (currentParent) {
//             depth++;
//             currentParent = this.getParentName(currentParent);
//         }
//         return depth; // 0 для torso, 1 для head, 2 для hair и т.д.
//     }
// };
