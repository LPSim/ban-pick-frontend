<template>
  <div id="app">
    <div class="match-container">
      <div v-if="welcome_page" id="welcome-page">
        <h1>七圣BP</h1>
        <label for="room">房号(长度4-8位的字母或数字):</label>
        <input id="room" v-model="room_id" type="text" maxlength="8" pattern="^[A-Za-z0-9]{4,8}$">
        <div id="player-selection-div">
          <label for="player0">玩家0</label>
          <input id="player0" v-model="player_id" type="radio" :value="0">
          <div style="width: 50%;"></div>
          <label for="player1">玩家1</label>
          <input id="player1" v-model="player_id" type="radio" :value="1">
        </div>
        <button @click="show_advanced = !show_advanced">高级设置</button>
        <div id="advanced-div" v-if="show_advanced">
          <div>
            <label for="versionDropdown">选择版本:</label>
            <select id="versionDropdown" v-model="version">
              <!-- <option v-for="version in availableVersions" :value="version">还没做好</option> -->
              <option value="99.9">还没做</option>
            </select>
          </div>
          <label for="bp-command" >BP命令:</label>
          <textarea id="bp-command" v-model="bp_command" style="width: 50%; height: 200px; left: 25%"></textarea>
          <div class="description">
            <p>命令是一个数字和字母组成的词，BP由一串命令组成。第一条命令一定是ixxx，表示BP时有多少候选。然后若干条"0p 1p 0b 1b"组成，每条代表哪个玩家选(p)还是禁(b)。以热斗BP为例，为"i10 0p 1p 1p 0p 0p 1p"。注意这里0和1是一个指代，开始BP时有50%概率01互换（即随机先后手）。</p>
            <p>暂时没有做命令检查，如果输入了错误的命令，可能会有异常行为。</p>
            <p>BP超过3个角色是可行的，但是分享码无法生成。</p>
            <p>常用命令1 官方热斗：i10 0p 1p 1p 0p 0p 1p</p>
            <p>常用命令2 Dota2 BP：i60 0b 1b 0b 1b 0p 1p 1p 0p 0b 1b 0b 1b 0b 1b 1p 0p 0p 1p 0b 1b 0b 1b 0p 1p</p>
          </div>
        </div>
        <button @click="createRoom">创建/进入房间</button>
      </div>
      <div v-else id="bp-page">
        <h1>房间：{{ room_id }}&nbsp;&nbsp;你是玩家{{ player_id }}</h1>
        <div id="countdown-div" :style="countdown < 60 ? 'color: #C00' : ''">
          <h2 v-if="countdown > 0">房间到期时间：{{ parseInt(countdown) }}秒</h2>
          <h2 v-else>房间已到期！建议删除房间并重进。</h2>
          <p>房间如果到期，将随时可能被服务器回收。</p>
        </div>
        <p>已执行BP命令: {{ done_bp_command.join(' ') }}&nbsp;&nbsp;剩余BP命令: {{ next_bp_command.join(' ') }}</p>
        <button @click="resetRoom">删除房间</button>
        <div id="bp-page-main">
          <div v-for="sel, pid in selects" :key="pid" :class="'player-div player' + pid + ' ' + (next_bp_command.length > 0 ? (((pid == parseInt(next_bp_command[0][0]))) ? 'player-highlight' : '') : '')">
            <h4>玩家{{ pid }}</h4>
            <div class="charactor-div">
              <div v-for="charactor, cid in sel.charactor" :key="cid">
                <img :src="getURL('charactor', charactor)" :alt="charactor" @click="updateDesc(charactor)">
              </div>
            </div>
            <div class="card-div">
              <div v-for="card, cid in sel.card" :key="cid">
                <img :src="getURL('card', card)" :alt="card" @click="updateDesc(card)">
              </div>
            </div>
            <label v-if="pid == player_id" :for="'bp-code-player' + pid" >分享码:</label>
            <input v-if="pid == player_id" :id="'bp-code-player' + pid" type="text" v-model="codes[pid]" readonly>
            <button v-if="pid == player_id" @click="copyCode(pid)">{{ copyButtonText }}</button>
          </div>
          <div id="bp-center-div" :class="!your_turn ? '' : 'select-shining'">
            <div id="bp-image-div">
              <div v-for="charactor, index in bp_table" :key="index" @click="selectOne(index)" :class="getBPClass(index)" :style="getBPImageSize()">
                <img :src="getURL('charactor', charactor)" :alt="charactor">
              </div>
            </div>
            <div id="bp-card-desc-div">
              <div v-for="card, index in card_desc" :key="index">
                <img :src="getURL('card', card)" :alt="card" @click="updateDesc(card)">
              </div>
            </div>
            <div id="bp-text-desc-div">
              {{ text_desc }}
            </div>
            <button v-if="next_bp_command.length && next_bp_command[0][1] == 'b'" :disabled="!your_turn || selected_idx == -1" @click="selectBP" style="color: red; font-weight: bold;">
              {{ '禁用' }}
            </button>
            <button v-else :disabled="!your_turn || selected_idx == -1" @click="selectBP" style="color: green; font-weight: bold;">
              {{ '选择' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

let deck_code_import = require('./deck.js');
let deckCodeToDeckStr = deck_code_import.deckCodeToDeckStr;
let deckStrToDeckCode = deck_code_import.deckStrToDeckCode;

export default {
  name: 'App',
  data() {
    return {
      // consts
      descData: null,
      nameToDescKey: null,
      availableCards: [],
      preDefinedData: null,
      preDefinedList: null,

      // welcome page
      welcome_page: true,
      room_id: '',
      player_id: 0,
      version: '99.9',
      preset_modify: [],
      bp_command: 'i10 0p 1p 1p 0p 0p 1p',
      language: 'zh-CN',
      show_advanced: false,
      // serverURL: 'http://localhost:8008',
      serverURL: '',
      refreshInterval: 1000,
      refreshId: null,

      // bp data
      countdown: 0,
      bp_table: [
        // 'Fischl', 'Fischl', 'Fischl', 'Fischl', 'Fischl',
        // 'Mona', 'Nahida', 'Bennett', 'Zhongli', 'Mirror Maiden',
        // 'Fischl', 'Fischl', 'Fischl', 'Fischl', 'Fischl',
        // 'Fischl', 'Fischl', 'Fischl', 'Fischl', 'Fischl',
        // 'Fischl', 'Fischl', 'Fischl', 'Fischl', 'Fischl',
      ],
      bp_status: [
        // '', 'pick', 'ban', '', '',
        // 'ban', '', '', '', 'pick',
      ],
      done_bp_command: [],
      next_bp_command: [],
      selects: [
        {
          charactor: [
          ],
          card: [
          ],
        },
        {
          charactor: [
          ],
          card: [
          ],
        }
      ],
      codes: ['', ''],
      your_turn: false,
      text_desc: '',
      card_desc: [
      ],
      selected_idx: -1,
      copyButtonText: '复制',
      hideRandomCard: true,
    }
    // return {
    //   welcome_page: true,
    //   room_id: '',
    //   player_id: 0,
    //   version: '99.9',
    //   preset_modify: [],
    //   bp_command: 'i10 0p 1p 1p 0p 0p 1p',
    //   language: 'zh-CN',
    //   show_advanced: false,

    //   // bp data
    //   countdown: 0,
    //   bp_table: [],
    //   selects: [
    //     {
    //       charactor: [],
    //       card: [],
    //     },
    //     {
    //       charactor: [],
    //       card: [],
    //     }
    //   ],
    //   codes: ['', '']
    // }
  },
  created() {
    this.descData = require('./descData.json');
    this.nameToDescKey = {};
    for (let key in this.descData) {
      if (
        key.startsWith('TEAM_STATUS/') 
        || key.startsWith('CHARACTOR_STATUS/')
        || key.startsWith('SUMMON/')
      ) continue;
      let name = this.descData[key].names['en-US'];
      this.nameToDescKey[name] = key;
      let ban_cards = [
        'Abyssal Summons',
        'Fatui Conspiracy',
        'Elemental Resonance',
        'Wind and Freedom',
        'Stone and Contracts',
        'Thunder and Eternity',
        'Nature and Wisdom',
      ];
      if (
        (key.startsWith('CARD/') || key.startsWith('SUPPORT/'))
      ) {
        let is_banned = false;
        for (let i = 0; i < ban_cards.length; i ++ ) {
          if (name.includes(ban_cards[i])) {
            is_banned = true;
            break;
          }
        }
        if (!is_banned) this.availableCards.push(name);
      }
    }
    let pd = require('./preDefined.js');
    this.preDefinedData = pd.preDefinedData;
    this.preDefinedList = pd.preDefinedList;
    setInterval(() => {
      this.countdown = Math.max(0, this.countdown - 1);
    }, 1000);
  },
  methods: {
    isHideCard(key) {
      return (
        this.hideRandomCard 
        && !key.startsWith('TALENT') 
        && !key.startsWith('WEAPON') 
        && !key.startsWith('ARTIFACT') 
        && !key.startsWith('CHARACTOR/')
      );
    },
    getURL(type, name) {
      if (type == 'charactor') {
        type = ['CHARACTOR'];
      } else if (type == 'card') {
        type = ['CARD', 'SUPPORT', 'WEAPON', 'ARTIFACT', 'ARCANE', 'TALENT'];
      }
      let key = this.nameToDescKey[name];
      let ret = this.descData[key]['image_path'];
      if (
        this.isHideCard(key)
      ) ret = 'cardface/Championship_02.png'; // if not equip or charactor, hide it
      if (ret.startsWith('http')) {
        return ret;
      }
      return 'https://static.zyr17.cn/GITCG-frontend/images/' + ret;
    },
    updateDesc(card_name) {
      let descKey = this.nameToDescKey[card_name];
      let descData = this.descData[descKey];
      let all_version = Object.keys(descData.descs);
      let version = null;
      for (let i = 0; i < all_version.length; i++) {
        if (all_version[i] <= this.version && (!version || version < all_version[i])) {
          version = all_version[i];
        }
      }
      // console.log(version)
      if (!version) {
        alert('No version found');
        throw new Error('No version found');
      }
      this.text_desc = descData.names[this.language];
      if (descKey.startsWith('CHARACTOR/')) {
        this.card_desc = this.preDefinedData['charactor:' + card_name];
      }
      else {
        this.text_desc += ' ' + descData.descs[version][this.language];
        if (this.isHideCard(descKey)) this.text_desc = '';
      }
      // console.log(this.text_desc, this.card_desc);
    },
    selectOne(idx) {
      this.updateDesc(this.bp_table[idx]);
      if (this.bp_status[idx] != '') return;
      if (!this.your_turn) return;
      if (this.next_bp_command.length == 0) return;
      this.selected_idx = idx;
    },
    getBPClass(idx) {
      let res = this.bp_status[idx];
      if (idx == this.selected_idx) res += ' selected';
      return res;
    },
    resetRoom() {
      if (confirm('确定删除房间？')) {
        const xhr = new XMLHttpRequest();
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              let data = JSON.parse(xhr.responseText);
              console.log(data);
              // refresh
              window.location.reload();
            }
            else {
              alert(xhr.responseText);
            }
          }
        };
        xhr.open('DELETE', this.serverURL + '/room/' + this.room_id);
        xhr.send();
      }
    },
    createRoom() {
      if (this.room_id.match(/^[A-Za-z0-9]{4,8}$/) == null) {
        alert('房间号不符合规范');
        return;
      }
      let data = {
        room_id: this.room_id,
        command: this.bp_command,
        charactor_num: this.preDefinedList.length
      };
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            let data = JSON.parse(xhr.responseText);
            if (data.status == 'exist') alert('房间已存在，直接进入房间');
            else if (data.status == 'ok') {
              alert('创建成功');
            }
            else throw('未知错误 ' + data);
            this.refreshRoom();
            this.welcome_page = false;
          }
          else {
            alert(xhr.responseText);
          }
        }
      };
      xhr.open('POST', this.serverURL + '/create');
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(data));
    },
    updateData(data) {
      // update data, and if done, generate random cards and send result
      this.done_bp_command = data.done_command;
      this.next_bp_command = data.next_command;
      this.countdown = data.time - Math.floor(Date.now() / 1000);
      this.bp_table = data.bp_list.map(x => this.preDefinedList[x].replace('charactor:', ''));
      this.bp_status = data.bp_status;
      for (let i = 0; i < 2; i ++ ) {
        this.selects[i].charactor = data.players[i].map(x => this.preDefinedList[x].replace('charactor:', ''));
        this.selects[i].card = [];
        for (let j = 0; j < this.selects[i].charactor.length; j ++ ) {
          this.selects[i].card = this.selects[i].card.concat(this.preDefinedData['charactor:' + this.selects[i].charactor[j]]);
        }
        if (data.results[i] != '') {
          this.codes[i] = data.results[i];
          let deck_str = deckCodeToDeckStr(data.results[i]);
          this.selects[i].card = [];
          this.selects[i].charactor = [];
          let deck_str_split = deck_str.trim().split('\n');
          for (let j = 0; j < deck_str_split.length; j ++ ) {
            let line = deck_str_split[j];
            if (line.startsWith('charactor')) {
              this.selects[i].charactor.push(line.split(':')[1]);
            }
            else {
              this.selects[i].card.push(line);
            }
          }
        }
      }
      if (this.next_bp_command.length == 0) {
        // bp done, generate random cards
        this.your_turn = false;
        if (data.results[this.player_id] != '') {
          // already done, skip
          return;
        }
        this.prepareResult();
      }
      else {
        // update your_turn
        let next = this.next_bp_command[0];
        this.your_turn = (parseInt(next[0]) == this.player_id);
      }
    },
    refreshRoom() {
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            let data = JSON.parse(xhr.responseText);
            console.log(data);
            this.updateData(data);
            clearTimeout(this.refreshId);
            if (data.results[0] == '' || data.results[1] == '')
              this.refreshId = setTimeout(() => this.refreshRoom(), this.refreshInterval);
          }
          else {
            alert(xhr.responseText);
          }
        }
      };
      xhr.open('GET', this.serverURL + '/room/' + this.room_id);
      xhr.send();
    },
    selectBP() {
      let data = {
        player_id: this.player_id,
        index: this.selected_idx
      }
      this.selected_idx = -1;
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            let data = JSON.parse(xhr.responseText);
            console.log(data);
            this.updateData(data);
          }
          else {
            alert(xhr.responseText);
          }
        }
      };
      xhr.open('POST', this.serverURL + '/room/' + this.room_id + '/act');
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(data));
    },
    shuffle(array) {
      let currentIndex = array.length, temporaryValue, randomIndex;

      while (0 !== currentIndex) {

        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    },
    prepareResult() {
      let data = this.selects[this.player_id];
      if ((data.charactor).length > 3) {
        // too many charactors, skip
        return;
      }
      if ((data.card).length >= 30) {
        // already full, skip
      }
      let cards = JSON.parse(JSON.stringify(this.availableCards));
      cards = cards.concat(cards);
      cards = this.shuffle(cards);
      let card_num = 30 - (data.card).length;
      for (let i = 0; i < card_num; i ++ ) {
        data.card.push(cards[i]);
      }
      let deck_str = '';
      for (let i = 0; i < data.charactor.length; i ++ ) {
        deck_str += 'charactor:' + data.charactor[i] + '\n';
      }
      for (let i = 0; i < data.card.length; i ++ ) {
        deck_str += data.card[i] + '\n';
      }
      this.codes[this.player_id] = deckStrToDeckCode(deck_str);
      let xhr_data = {
        player_id: this.player_id,
        result: this.codes[this.player_id]
      }
      console.log(xhr_data);
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            let data = JSON.parse(xhr.responseText);
            console.log(data);
            this.updateData(data);
            clearTimeout(this.refreshId);
            this.refreshId = setTimeout(() => this.refreshRoom(), this.refreshInterval);
          }
          else {
            alert(xhr.responseText);
          }
        }
      };
      xhr.open('POST', this.serverURL + '/room/' + this.room_id + '/result');
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(xhr_data));
    },
    copyCode(pidx) {
      // Copy the deck code to the clipboard
      navigator.clipboard.writeText(this.codes[pidx]).then(() => {
        // The deck code was successfully copied
        this.copyButtonText = '已复制';
        setTimeout(() => {
          this.copyButtonText = '复制';
        }, 1000);
      }).catch(error => {
        // The deck code could not be copied
        console.error(error);
      });
    },
    getBPImageSize() {
      let width = 18.0;
      let height = 48.5;
      let scale = 1.0;
      if (this.bp_table.length > 15) {
        scale = 0.625;
      }
      if (this.bp_table.length > 32) {
        scale = 0.5;
      }
      if (this.bp_table.length > 60) {
        scale = 0.333;
      }
      return 'width: ' + width * scale + '%; height: ' + height * scale + '%';
    }
  },
}
</script>

<style scoped>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  /* margin-top: 60px; */
  font-size: 1vw;
}

button {
  font-size: 1vw;
}

.match-container {
  position: relative;
  width: 90%;
  height: 0;
  padding-bottom: 45%; /* 16:9 aspect ratio */
  /* margin-left: 10%; */
  /* display: flex;
  flex-direction: column; */
}

#welcome-page {
  position: absolute;
  display: flex;
  width: 50%;
  flex-direction: column;
  left: 25%;
}

#welcome-page > * {
  margin: 10px;
}

#player-selection-div {
  display: flex;
  flex-direction: row;
  justify-content: center;
}

#advanced-div {
  display: flex;
  flex-direction: column;
}

#advanced-div > * {
  margin: 10px;
}

#bp-command {
  width: 50%; 
  height: 200px; 
  margin-left: 25%;
}

#countdown-div {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
}

#countdown-div > * {
  margin: 0;
}

#bp-page > h1, #bp-page > p {
  margin: 0;
}

#bp-page > button {
  width: 100%;
}

#bp-page-main {
  position: absolute;
  width: 100%;
  top: 20%;
  height: 80%;
}

.player-div {
  width: 25%;
  height: 100%;
}

.player-div.player0 {
  position: absolute;
  left: 0;
}

.player-div.player1 {
  position: absolute;
  left: 75%;
}

#bp-center-div {
  position: absolute;
  left: 25%;
  width: 50%;
  height: 100%;
}

#bp-center-div > #bp-image-div {
  position: absolute;
  width: 100%;
  height: 78%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-around;
  align-items: center;
  overflow-y: auto;
}

#bp-center-div > #bp-card-desc-div {
  position: absolute;
  width: 66.6666666666%;
  height: 17%;
  left: 0;
  top: 78%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: left;
  align-items: center;
}

#bp-center-div > button {
  position: absolute;
  top: 95%;
  font-size: 1vw;
}

#bp-image-div > * {
  width: 18%;
  height: 48.5%;
}

#bp-image-div img {
  width: 100%;
}

#bp-card-desc-div > * {
  width: 12%;
  margin-right: 1.5%;
}

#bp-card-desc-div img {
  width: 100%;
}

#bp-text-desc-div {
  position: absolute;
  width: 33.3333333333%;
  height: 17%;
  left: 66.6666666666%;
  top: 78%;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: scroll;
}

.charactor-div {
  margin-bottom: 5%;
  display: flex;
  flex-direction: row;
  /* flex-wrap: wrap; */
}
.charactor-div > * {
  width: 30%;
  margin-right: 3%;
}

.charactor-div img {
  width: 100%;
}

.card-div {
  margin-bottom: 5%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
.card-div > * {
  width: 9%;
  margin-right: 1%;
}

.card-div img {
  width: 100%;
}

.selected > img {
  box-shadow: 0 0 0.2vw 0.2vw rgb(255, 174, 0);
  border-radius: 1.0vw;
}

.ban {
  background-color: #F99;
  border-radius: 1.0vw;
}

.ban img, .pick img {
  opacity: 0.3;
}

.pick {
  /* background-color: grey; */
  border-radius: 1.0vw;
}

.player-highlight {
  background-color: rgb(172, 247, 247);
}

button:disabled {
  color: rgba(16, 16, 16, 0.3) !important
}

.select-shining {
  animation: shining 3s infinite;
}

@keyframes shining {
  0% {
    box-shadow: 0
  }
  50% {
    box-shadow: 0 0 0.4vw 0.4vw rgb(255, 174, 0);
  }
  100% {
    box-shadow: 0;
  }
}

</style>
