const descData = require('./descData.json');
const preDefinedRawData = require('./preDefinedData.json');


let cnameToEname = {};
let enameToId = {};
for (let k in descData) {
    let i = descData[k];
    if (i.id) {
        let ename = i.names['en-US'];
        let cname = i.names['zh-CN'];
        if (i.id < 100000) {
            // is character
            ename = 'character:' + ename;
        }
        if (cnameToEname[cname]) throw new Error('cname duplicated: ' + cname);
        cnameToEname[cname] = ename;
        enameToId[ename] = i.id;
    }
    // special names
    cnameToEname['小冰'] = "Broken Rime's Echo";
    cnameToEname['小草'] = "Laurel Coronet";
    cnameToEname['小岩'] = "Mask of Solitude Basalt";
    cnameToEname['小雷'] = "Thunder Summoner's Crown";
    cnameToEname['小风'] = "Viridescent Venerer's Diadem";
    cnameToEname['小水'] = "Wine-Stained Tricorne";
    cnameToEname['小火'] = "Witch's Scorching Hat";
    cnameToEname['大冰'] = "Blizzard Strayer";
    cnameToEname['大草'] = "Deepwood Memories";
    cnameToEname['大岩'] = "Archaic Petra";
    cnameToEname['大雷'] = "Thundering Fury";
    cnameToEname['大风'] = "Viridescent Venerer";
    cnameToEname['大水'] = "Heart of Depth";
    cnameToEname['大火'] = "Crimson Witch of Flames";
    cnameToEname['赌徒'] = "Gambler's Earrings";
}


// key: character:ename; value: list of predefined cards
let preDefinedData = {};
// all keys in predefined data, and will sort
let preDefinedList = [];
for (let i of preDefinedRawData) {
    let line = i.trim().split(' ');
    let character_name = line[0];
    let card_names = line.slice(1);
    if (card_names.length < 1) {
        // no predefined, skip
        continue;
    }
    if (!cnameToEname[character_name]) throw new Error('character name not found: ' + character_name);
    for (let card_name of card_names) {
        if (!cnameToEname[card_name]) throw new Error('card name not found: ' + card_name);
    }
    character_name = cnameToEname[character_name];
    card_names = card_names.map(x => cnameToEname[x]);
    if (preDefinedData[character_name]) throw new Error('character name exist: ' + character_name);
    // add two talent cards
    let talent_type = 'TALENT_' + character_name.replace('character:', '') + '/';
    for (let k in descData) {
        if (k == 'TALENT_Keqing/Lightning Stiletto') continue;
        if (k.startsWith(talent_type)) {
            let new_card_names = [descData[k].names['en-US'], descData[k].names['en-US']];
            card_names = new_card_names.concat(card_names);
        }
    }

    preDefinedData[character_name] = card_names;
    preDefinedList.push(character_name);
}
preDefinedList.sort((a, b) => {
    return enameToId[a] - enameToId[b];
})
// console.log(cnameToEname, preDefinedData, preDefinedList)

export { preDefinedData, preDefinedList };
